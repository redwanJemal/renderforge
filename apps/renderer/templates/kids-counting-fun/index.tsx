import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import type { Theme, Format } from '../../types';
import { z } from 'zod';
import { registry } from '../../core/registry';
import { loadGoogleFont } from '../../core/fonts';
import { responsiveFontSize, isPortrait } from '../../core/formats';
import { BounceIn, Confetti, StarBurst, IrisTransition, NumberIcon } from '../../components/kids';
import { KIDS_ICONS } from '../../components/kids/KidsIcons';

// ══════════════════════════════════════════════════════════════
// KIDS COUNTING FUN
//
// Long-form counting template for 2-5 minute videos.
// Structure: Intro → Number Sections → Celebration Outro
//
// Each number section:
//   1. Big number bounces in
//   2. Objects (icons) pop in one-by-one with stagger
//   3. Count text updates: "1... 2... 3..."
//   4. Narration gap for TTS
//   5. Iris transition to next number
//
// Audio sync: per-section startFrame/durationFrames overridden
// by audio-sync pipeline based on TTS duration.
// ══════════════════════════════════════════════════════════════

const countingSectionSchema = z.object({
  number: z.number(),
  label: z.string(),          // "Three Stars!" / "Five Apples!"
  icon: z.string(),           // icon key from KIDS_ICONS
  iconColor: z.string().optional(),
  bgColor: z.string().optional(),
  // Audio-sync timing overrides
  startFrame: z.number().optional(),
  durationFrames: z.number().optional(),
});

export type CountingSection = z.infer<typeof countingSectionSchema>;

const kidsCountingSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  sections: z.array(countingSectionSchema),
  // Timing defaults
  introDurationFrames: z.number(),
  numberRevealFrames: z.number(),
  objectStaggerFrames: z.number(),   // frames between each object popping in
  holdAfterCountFrames: z.number(),  // narration gap after all objects shown
  transitionFrames: z.number(),
  outroDurationFrames: z.number(),
  outroText: z.string(),
});

export type KidsCountingProps = z.infer<typeof kidsCountingSchema>;

// ── Defaults ────────────────────────────────────────────

const SECTION_COLORS = [
  '#4D96FF', '#FF6B6B', '#6BCB77', '#FFD93D', '#FFAFCC',
  '#A2D2FF', '#8AC926', '#FF595E', '#1982C4', '#6A4C93',
];

export const defaultProps: KidsCountingProps = {
  title: "Let's Count!",
  subtitle: 'Count Along With Me!',
  sections: [
    { number: 1, label: 'One Star!', icon: 'star', iconColor: '#FFD93D', bgColor: '#4D96FF' },
    { number: 2, label: 'Two Hearts!', icon: 'heart', iconColor: '#FF6B6B', bgColor: '#6BCB77' },
    { number: 3, label: 'Three Apples!', icon: 'apple', iconColor: '#FF6B6B', bgColor: '#FFD93D' },
    { number: 4, label: 'Four Fish!', icon: 'fish', iconColor: '#4D96FF', bgColor: '#FFAFCC' },
    { number: 5, label: 'Five Cats!', icon: 'cat', iconColor: '#FF6B6B', bgColor: '#A2D2FF' },
  ],
  introDurationFrames: 120,
  numberRevealFrames: 25,
  objectStaggerFrames: 18,     // each object pops in 0.6s after the previous
  holdAfterCountFrames: 45,    // 1.5s hold for narration
  transitionFrames: 20,
  outroDurationFrames: 120,
  outroText: 'Amazing!',
};

// ── Helpers ─────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Grid layout for objects — positions N items in a visually pleasing way
function getObjectPositions(count: number, portrait: boolean): Array<{ x: number; y: number }> {
  if (count === 1) return [{ x: 50, y: portrait ? 60 : 55 }];
  if (count === 2) return [{ x: 35, y: portrait ? 60 : 55 }, { x: 65, y: portrait ? 60 : 55 }];
  if (count === 3) return [
    { x: 50, y: portrait ? 52 : 48 },
    { x: 30, y: portrait ? 68 : 62 },
    { x: 70, y: portrait ? 68 : 62 },
  ];

  // For 4+, arrange in rows
  const cols = count <= 4 ? 2 : count <= 6 ? 3 : 4;
  const rows = Math.ceil(count / cols);
  const startY = portrait ? 48 : 42;
  const spacingY = portrait ? 18 : 16;
  const spacingX = portrait ? 28 : 22;

  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const rowCount = Math.min(cols, count - row * cols);
    const rowStartX = 50 - ((rowCount - 1) * spacingX) / 2;
    return {
      x: rowStartX + col * spacingX,
      y: startY + row * spacingY,
    };
  });
}

// ── Bubbles Background ──────────────────────────────────

const Bubbles: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {Array.from({ length: 15 }, (_, i) => {
        const x = seededRandom(i * 7) * 100;
        const baseY = 110 + seededRandom(i * 3) * 20;
        const speed = 0.3 + seededRandom(i * 11) * 0.4;
        const size = 15 + seededRandom(i * 13) * 35;
        const y = baseY - frame * speed;
        const adjustedY = ((y % 130) + 130) % 130 - 15;
        const wobble = Math.sin(frame * 0.03 + i * 2) * 8;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x + wobble * 0.3}%`,
              top: `${adjustedY}%`,
              width: size,
              height: size,
              borderRadius: '50%',
              border: `2px solid ${color}`,
              opacity: 0.12,
              transform: `translateX(${wobble}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ── Count Display ───────────────────────────────────────

const CountDisplay: React.FC<{
  currentCount: number;
  total: number;
  format: Format;
  theme: Theme;
}> = ({ currentCount, total, format, theme }) => {
  const portrait = isPortrait(format);
  return (
    <div
      style={{
        position: 'absolute',
        top: portrait ? 140 : 30,
        right: portrait ? 60 : 50,
        fontSize: responsiveFontSize(42, format, 'heading'),
        fontWeight: 800,
        fontFamily: theme.fonts.heading,
        color: 'rgba(255,255,255,0.9)',
        textShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {currentCount} / {total}
    </div>
  );
};

// ── Single Number Scene ─────────────────────────────────

const NumberScene: React.FC<{
  section: CountingSection;
  index: number;
  theme: Theme;
  format: Format;
  numberRevealFrames: number;
  objectStaggerFrames: number;
}> = ({ section, index, theme, format, numberRevealFrames, objectStaggerFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = isPortrait(format);

  const bgColor = section.bgColor || SECTION_COLORS[index % SECTION_COLORS.length];
  const IconComponent = KIDS_ICONS[section.icon];
  const iconSize = portrait ? 100 : 80;
  const positions = getObjectPositions(section.number, portrait);

  // Phase 1: Number bounces in
  const numberScale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 150, mass: 0.5 },
  });

  // Phase 2: Objects pop in one by one
  const objectsStartFrame = numberRevealFrames;

  // Count how many objects are visible
  const visibleObjects = Math.min(
    section.number,
    Math.max(0, Math.floor((frame - objectsStartFrame) / objectStaggerFrames) + 1)
  );

  // Label appears after all objects
  const labelDelay = objectsStartFrame + section.number * objectStaggerFrames + 10;
  const labelAdj = Math.max(0, frame - labelDelay);
  const labelSpring = spring({
    frame: labelAdj,
    fps,
    config: { damping: 10, stiffness: 120, mass: 0.6 },
  });
  const labelOpacity = interpolate(labelAdj, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      <Bubbles color="rgba(255,255,255,0.5)" />

      {/* Big number at top */}
      <div
        style={{
          position: 'absolute',
          top: portrait ? '12%' : '8%',
          left: '50%',
          transform: `translateX(-50%) scale(${numberScale})`,
          zIndex: 2,
        }}
      >
        <NumberIcon
          number={section.number}
          size={portrait ? 160 : 120}
          bgColor="rgba(255,255,255,0.25)"
          color="white"
        />
      </div>

      {/* Objects popping in */}
      {positions.map((pos, i) => {
        if (i >= visibleObjects) return null;

        const objDelay = objectsStartFrame + i * objectStaggerFrames;
        const objAdj = Math.max(0, frame - objDelay);
        const objScale = spring({
          frame: objAdj,
          fps,
          config: { damping: 6, stiffness: 200, mass: 0.4 },
        });

        // Subtle float after landing
        const floatY = objAdj > 15 ? Math.sin((frame - objDelay) * 0.08 + i) * 4 : 0;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(-50%, -50%) scale(${objScale}) translateY(${floatY}px)`,
              zIndex: 2,
            }}
          >
            {IconComponent ? (
              <IconComponent size={iconSize} color={section.iconColor || 'white'} />
            ) : (
              <div style={{ fontSize: iconSize * 0.8, lineHeight: 1 }}>⭐</div>
            )}
          </div>
        );
      })}

      {/* Pop count text as each object appears */}
      {visibleObjects > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: portrait ? '22%' : '18%',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 12,
            zIndex: 2,
          }}
        >
          {Array.from({ length: visibleObjects }, (_, i) => {
            const popDelay = objectsStartFrame + i * objectStaggerFrames;
            const popAdj = Math.max(0, frame - popDelay);
            const popScale = spring({
              frame: popAdj,
              fps,
              config: { damping: 8, stiffness: 180, mass: 0.4 },
            });
            return (
              <div
                key={i}
                style={{
                  fontSize: responsiveFontSize(48, format, 'heading'),
                  fontWeight: 800,
                  fontFamily: theme.fonts.heading,
                  color: 'white',
                  textShadow: '0 3px 10px rgba(0,0,0,0.15)',
                  transform: `scale(${popScale})`,
                }}
              >
                {i + 1}{i < visibleObjects - 1 ? ',' : '!'}
              </div>
            );
          })}
        </div>
      )}

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          bottom: portrait ? '12%' : '8%',
          left: '50%',
          transform: `translateX(-50%) scale(${0.8 + labelSpring * 0.2})`,
          opacity: labelOpacity,
          fontSize: responsiveFontSize(48, format, 'heading'),
          fontWeight: 700,
          fontFamily: theme.fonts.heading,
          color: 'white',
          textShadow: '0 3px 10px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap',
          zIndex: 2,
        }}
      >
        {section.label}
      </div>

      {/* Mini celebration when all objects shown */}
      {visibleObjects === section.number && (
        <StarBurst
          startFrame={objectsStartFrame + section.number * objectStaggerFrames}
          durationFrames={30}
          color={theme.colors.accent}
        />
      )}
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

const KidsCountingFun: React.FC<
  KidsCountingProps & { theme: Theme; format: Format }
> = (rawProps) => {
  const {
    title, subtitle, sections,
    introDurationFrames, numberRevealFrames, objectStaggerFrames,
    holdAfterCountFrames, transitionFrames: tranFrames,
    outroDurationFrames, outroText,
    theme, format,
  } = rawProps;

  loadGoogleFont('Fredoka', [400, 600, 700]);
  loadGoogleFont('Nunito', [400, 600, 700, 800]);

  const frame = useCurrentFrame();
  const portrait = isPortrait(format);

  // Calculate per-section timing
  const sectionTimings: Array<{ start: number; duration: number }> = [];
  let cursor = introDurationFrames;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const start = section.startFrame ?? cursor;
    // Default duration: reveal + (count * stagger) + narration hold
    const duration = section.durationFrames ??
      (numberRevealFrames + section.number * objectStaggerFrames + holdAfterCountFrames + 30);
    sectionTimings.push({ start, duration });
    cursor = start + duration + tranFrames;
  }

  const outroStart = cursor;

  return (
    <AbsoluteFill style={{ backgroundColor: '#F0F4FF', overflow: 'hidden' }}>
      {/* ── Intro ── */}
      <Sequence from={0} durationInFrames={introDurationFrames}>
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${theme.colors.secondary} 0%, ${theme.colors.primary} 100%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          <Bubbles color="rgba(255,255,255,0.4)" />

          <BounceIn delay={15} style={{ zIndex: 2 }}>
            <div
              style={{
                fontSize: responsiveFontSize(80, format, 'heading'),
                fontWeight: 800,
                fontFamily: theme.fonts.heading,
                color: 'white',
                textAlign: 'center',
                textShadow: '0 6px 20px rgba(0,0,0,0.2)',
              }}
            >
              {title}
            </div>
          </BounceIn>

          <BounceIn delay={35} style={{ zIndex: 2 }}>
            <div
              style={{
                fontSize: responsiveFontSize(36, format, 'body'),
                fontWeight: 600,
                fontFamily: theme.fonts.body,
                color: 'rgba(255,255,255,0.9)',
                textAlign: 'center',
              }}
            >
              {subtitle}
            </div>
          </BounceIn>

          {/* Number preview */}
          <div style={{ display: 'flex', gap: 15, marginTop: 30, zIndex: 2 }}>
            {sections.slice(0, 5).map((s, i) => (
              <BounceIn key={s.number} delay={55 + i * 8}>
                <NumberIcon
                  number={s.number}
                  size={portrait ? 70 : 55}
                  bgColor={SECTION_COLORS[i % SECTION_COLORS.length]}
                />
              </BounceIn>
            ))}
          </div>

          <StarBurst startFrame={50} durationFrames={40} color={theme.colors.accent} />
        </AbsoluteFill>
      </Sequence>

      {/* ── Number Sections ── */}
      {sections.map((section, i) => {
        const { start, duration } = sectionTimings[i];
        return (
          <Sequence key={section.number} from={start} durationInFrames={duration}>
            <NumberScene
              section={section}
              index={i}
              theme={theme}
              format={format}
              numberRevealFrames={numberRevealFrames}
              objectStaggerFrames={objectStaggerFrames}
            />
          </Sequence>
        );
      })}

      {/* ── Iris transitions ── */}
      {sections.slice(0, -1).map((_, i) => {
        const { start, duration } = sectionTimings[i];
        return (
          <IrisTransition
            key={`iris-${i}`}
            startFrame={start + duration - 10}
            durationFrames={20}
            color={sections[i + 1].bgColor || SECTION_COLORS[(i + 1) % SECTION_COLORS.length]}
          />
        );
      })}

      {/* ── Celebration Outro ── */}
      <Sequence from={outroStart} durationInFrames={outroDurationFrames}>
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${theme.colors.accent} 0%, ${theme.colors.primary} 50%, ${theme.colors.secondary} 100%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 30,
          }}
        >
          <Bubbles color="rgba(255,255,255,0.4)" />

          <BounceIn delay={10} style={{ zIndex: 2 }}>
            <div
              style={{
                fontSize: responsiveFontSize(100, format, 'heading'),
                fontWeight: 800,
                fontFamily: theme.fonts.heading,
                color: 'white',
                textShadow: '0 6px 24px rgba(0,0,0,0.2)',
                textAlign: 'center',
              }}
            >
              {outroText}
            </div>
          </BounceIn>

          <BounceIn delay={30} style={{ zIndex: 2 }}>
            <div
              style={{
                fontSize: responsiveFontSize(36, format, 'body'),
                fontWeight: 600,
                fontFamily: theme.fonts.body,
                color: 'rgba(255,255,255,0.9)',
                textAlign: 'center',
              }}
            >
              You counted to {sections[sections.length - 1]?.number || 0}!
            </div>
          </BounceIn>

          <Confetti startFrame={15} durationFrames={90} count={50} />
          <StarBurst startFrame={25} durationFrames={50} color="white" />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

// ── Register ────────────────────────────────────────────

const meta = {
  id: 'kids-counting-fun',
  name: 'Kids Counting Fun',
  description: 'Long-form counting video with objects popping in one-by-one, staggered animations, and celebration transitions. Audio-sync ready.',
  category: 'kids',
  tags: ['kids', 'education', 'counting', 'numbers', 'math', 'animation', 'long-form'],
  supportedFormats: ['story' as const, 'post' as const, 'landscape' as const],
  durationInFrames: 5400,
  fps: 30,
};

registry.register({
  meta,
  schema: kidsCountingSchema,
  component: KidsCountingFun,
  defaultProps,
});

export { KidsCountingFun };
export default KidsCountingFun;
