import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Audio,
  staticFile,
} from 'remotion';
import type { Theme, Format } from '../../types';
import { z } from 'zod';
import { registry } from '../../core/registry';
import { loadGoogleFont } from '../../core/fonts';
import { responsiveFontSize, isPortrait } from '../../core/formats';
import {
  BounceIn,
  Confetti,
  StarBurst,
  IrisTransition,
  SlideTransition,
  NumberIcon,
  Character,
  DustPuff,
  KidsImage,
  hasKidsPng,
} from '../../components/kids';
import { KIDS_ICONS } from '../../components/kids/KidsIcons';

// ══════════════════════════════════════════════════════════════
// KIDS COUNTING FUN
//
// Long-form counting template for 2-5 minute videos.
// Structure: Intro → Number Sections → Celebration Outro
//
// Each number section:
//   1. Big number bounces in
//   2. Objects (icons) pop in one-by-one with stagger + DustPuff
//   3. Count text updates with scale-bounce emphasis
//   4. Label slam entrance
//   5. Character idle → celebrate when all objects shown
//   6. Iris/Slide transition to next number
//
// Audio: narration per scene, SFX pops/dings/whoosh, BGM layer
// ══════════════════════════════════════════════════════════════

const countingSectionSchema = z.object({
  number: z.number(),
  label: z.string(),
  icon: z.string(),
  iconColor: z.string().optional(),
  bgColor: z.string().optional(),
  startFrame: z.number().optional(),
  durationFrames: z.number().optional(),
});

export type CountingSection = z.infer<typeof countingSectionSchema>;

const kidsCountingSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  sections: z.array(countingSectionSchema),
  introDurationFrames: z.number(),
  numberRevealFrames: z.number(),
  objectStaggerFrames: z.number(),
  holdAfterCountFrames: z.number(),
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
  objectStaggerFrames: 18,
  holdAfterCountFrames: 45,
  transitionFrames: 20,
  outroDurationFrames: 120,
  outroText: 'Amazing!',
};

// ── Helpers ─────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function getObjectPositions(count: number, portrait: boolean): Array<{ x: number; y: number }> {
  if (count === 1) return [{ x: 50, y: portrait ? 60 : 55 }];
  if (count === 2) return [{ x: 35, y: portrait ? 60 : 55 }, { x: 65, y: portrait ? 60 : 55 }];
  if (count === 3) return [
    { x: 50, y: portrait ? 52 : 48 },
    { x: 30, y: portrait ? 68 : 62 },
    { x: 70, y: portrait ? 68 : 62 },
  ];

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

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// ── Rich Background ─────────────────────────────────────

const RichBackground: React.FC<{ bgColor: string }> = ({ bgColor }) => {
  const frame = useCurrentFrame();
  const lighter = lightenColor(bgColor, 40);
  const darker = darkenColor(bgColor, 50);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* Radial gradient */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 45%, ${lighter} 0%, ${bgColor} 50%, ${darker} 100%)`,
        }}
      />

      {/* Subtle dot pattern */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          opacity: 0.06,
        }}
      />

      {/* Floating geometric shapes */}
      {Array.from({ length: 9 }, (_, i) => {
        const x = seededRandom(i * 7 + 1) * 100;
        const baseY = seededRandom(i * 13 + 3) * 100;
        const size = 40 + seededRandom(i * 17) * 40;
        const speed = 0.15 + seededRandom(i * 11) * 0.1;
        const wobbleX = Math.sin(frame * 0.02 + i * 1.5) * 15;
        const wobbleY = Math.cos(frame * 0.015 + i * 2) * 10;
        const y = baseY + frame * speed * (i % 2 === 0 ? -1 : 1);
        const adjustedY = ((y % 120) + 120) % 120 - 10;
        const rotation = frame * 0.3 + i * 40;
        const shapes = ['circle', 'polygon(50% 0%, 100% 100%, 0% 100%)', 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'];
        const shapeIdx = i % 3;
        const isCircle = shapeIdx === 0;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x + wobbleX * 0.3}%`,
              top: `${adjustedY + wobbleY * 0.3}%`,
              width: size,
              height: size,
              borderRadius: isCircle ? '50%' : 0,
              clipPath: isCircle ? undefined : shapes[shapeIdx],
              backgroundColor: 'rgba(255,255,255,0.12)',
              opacity: 0.08 + (i % 3) * 0.02,
              transform: `rotate(${rotation}deg)`,
            }}
          />
        );
      })}

      {/* Inner vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.15) 100%)',
        }}
      />
    </AbsoluteFill>
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
  const hasPng = hasKidsPng(section.icon);
  const IconComponent = !hasPng ? KIDS_ICONS[section.icon] : undefined;
  const iconSize = portrait ? 120 : 100;
  const positions = getObjectPositions(section.number, portrait);

  // Phase 1: Number bounces in
  const numberScale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 150, mass: 0.5 },
  });

  // Pulsing glow ring behind number
  const glowPulse = 0.6 + Math.sin(frame * 0.08) * 0.2;

  // Phase 2: Objects pop in one by one
  const objectsStartFrame = numberRevealFrames;

  const visibleObjects = Math.min(
    section.number,
    Math.max(0, Math.floor((frame - objectsStartFrame) / objectStaggerFrames) + 1)
  );

  const allObjectsShown = visibleObjects === section.number;

  // Label appears after all objects — slam entrance
  const labelDelay = objectsStartFrame + section.number * objectStaggerFrames + 10;
  const labelAdj = Math.max(0, frame - labelDelay);
  const labelScale = spring({
    frame: labelAdj,
    fps,
    config: { damping: 7, stiffness: 200, mass: 0.6 },
  });
  const labelRotation = labelAdj < 15
    ? interpolate(labelAdj, [0, 5, 10, 15], [8, -5, 3, 0], { extrapolateRight: 'clamp' })
    : 0;
  const labelOpacity = interpolate(labelAdj, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
  // Slam: start at 1.8x scale, spring down to 1.0x
  const labelSlamScale = labelAdj === 0 ? 0 : interpolate(labelScale, [0, 1], [1.8, 1.0]);

  // Character gesture: idle until all shown, then celebrate
  const characterGesture = allObjectsShown && frame > objectsStartFrame + section.number * objectStaggerFrames + 5
    ? 'celebrate' as const
    : 'idle' as const;

  return (
    <AbsoluteFill>
      <RichBackground bgColor={bgColor} />

      {/* Big number at top with glow ring */}
      <div
        style={{
          position: 'absolute',
          top: portrait ? '12%' : '8%',
          left: '50%',
          transform: `translateX(-50%) scale(${numberScale})`,
          zIndex: 2,
        }}
      >
        {/* Glow ring */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: portrait ? 200 : 160,
            height: portrait ? 200 : 160,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,255,255,${glowPulse * 0.3}) 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
            zIndex: -1,
          }}
        />
        <NumberIcon
          number={section.number}
          size={portrait ? 160 : 120}
          bgColor="rgba(255,255,255,0.25)"
          color="white"
        />
      </div>

      {/* Objects popping in with drop-shadow + DustPuff */}
      {positions.map((pos, i) => {
        if (i >= visibleObjects) return null;

        const objDelay = objectsStartFrame + i * objectStaggerFrames;
        const objAdj = Math.max(0, frame - objDelay);
        const objScale = spring({
          frame: objAdj,
          fps,
          config: { damping: 6, stiffness: 200, mass: 0.4 },
        });

        const floatY = objAdj > 15 ? Math.sin((frame - objDelay) * 0.08 + i) * 4 : 0;

        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: `translate(-50%, -50%) scale(${objScale}) translateY(${floatY}px)`,
                zIndex: 2,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
              }}
            >
              {hasPng ? (
                <KidsImage icon={section.icon} size={iconSize} />
              ) : IconComponent ? (
                <IconComponent size={iconSize} color={section.iconColor || 'white'} />
              ) : (
                <div style={{ fontSize: iconSize * 0.8, lineHeight: 1 }}>⭐</div>
              )}
            </div>
            {/* DustPuff on landing */}
            <DustPuff
              startFrame={objDelay}
              x={pos.x}
              y={pos.y}
              color="rgba(255,255,255,0.6)"
              durationFrames={15}
            />
            {/* Pop SFX per object */}
            <Sequence from={objDelay} durationInFrames={10}>
              <Audio
                src={staticFile('sfx/pop.mp3')}
                startFrom={0}
                volume={0.4}
              />
            </Sequence>
          </React.Fragment>
        );
      })}

      {/* Pop count text with scale-bounce per new digit */}
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
            // Scale bounce: 1.3x → 1.0x via spring
            const rawSpring = spring({
              frame: popAdj,
              fps,
              config: { damping: 8, stiffness: 180, mass: 0.4 },
            });
            const popScale = interpolate(rawSpring, [0, 1], [1.3, 1.0]);
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

      {/* Label — slam entrance */}
      <div
        style={{
          position: 'absolute',
          bottom: portrait ? '12%' : '8%',
          left: '50%',
          transform: `translateX(-50%) scale(${labelSlamScale}) rotate(${labelRotation}deg)`,
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
      {allObjectsShown && (
        <StarBurst
          startFrame={objectsStartFrame + section.number * objectStaggerFrames}
          durationFrames={30}
          color={theme.colors.accent}
        />
      )}

      {/* Character in bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: portrait ? '3%' : '2%',
          right: portrait ? '5%' : '3%',
          zIndex: 4,
        }}
      >
        <Character
          size={portrait ? 130 : 100}
          gesture={characterGesture}
        />
      </div>

      {/* Ding SFX when all objects shown */}
      {allObjectsShown && (
        <Sequence from={objectsStartFrame + section.number * objectStaggerFrames}>
          <Audio src={staticFile('sfx/ding.mp3')} startFrom={0} volume={0.5} />
        </Sequence>
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

  loadGoogleFont('Baloo 2', [400, 600, 700, 800]);
  loadGoogleFont('Quicksand', [400, 600, 700]);

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = isPortrait(format);

  // Calculate per-section timing
  const sectionTimings: Array<{ start: number; duration: number }> = [];
  let cursor = introDurationFrames;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const start = section.startFrame ?? cursor;
    const duration = section.durationFrames ??
      (numberRevealFrames + section.number * objectStaggerFrames + holdAfterCountFrames + 30);
    sectionTimings.push({ start, duration });
    cursor = start + duration + tranFrames;
  }

  const outroStart = cursor;
  const maxNumber = sections[sections.length - 1]?.number || 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#F0F4FF', overflow: 'hidden' }}>
      {/* ── Intro ── */}
      <Sequence from={0} durationInFrames={introDurationFrames}>
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <RichBackground bgColor={theme.colors.primary} />

          <AbsoluteFill
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
            }}
          >
            {/* Radial burst behind title */}
            {Array.from({ length: 5 }, (_, i) => {
              const burstDelay = 10 + i * 4;
              const burstAdj = Math.max(0, frame - burstDelay);
              const burstScale = spring({
                frame: burstAdj,
                fps,
                config: { damping: 12, stiffness: 60, mass: 0.8 },
              });
              const burstOpacity = interpolate(burstAdj, [0, 5, 40, 60], [0, 0.3, 0.15, 0], {
                extrapolateRight: 'clamp',
              });
              const ringSize = 100 + i * 80;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: ringSize,
                    height: ringSize,
                    borderRadius: '50%',
                    border: '3px solid rgba(255,255,255,0.4)',
                    transform: `translate(-50%, -50%) scale(${burstScale})`,
                    opacity: burstOpacity,
                    zIndex: 1,
                  }}
                />
              );
            })}

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

            {/* Number preview with staggered wobble */}
            <div style={{ display: 'flex', gap: 15, marginTop: 30, zIndex: 2 }}>
              {sections.slice(0, 5).map((s, i) => {
                const wobbleDelay = 55 + i * 8;
                const wobbleAdj = Math.max(0, frame - wobbleDelay);
                const wobbleAngle = wobbleAdj > 0 && wobbleAdj < 30
                  ? Math.sin(wobbleAdj * 0.5) * interpolate(wobbleAdj, [0, 30], [8, 0], { extrapolateRight: 'clamp' })
                  : 0;
                return (
                  <BounceIn key={s.number} delay={wobbleDelay}>
                    <div style={{ transform: `rotate(${wobbleAngle}deg)` }}>
                      <NumberIcon
                        number={s.number}
                        size={portrait ? 70 : 55}
                        bgColor={SECTION_COLORS[i % SECTION_COLORS.length]}
                      />
                    </div>
                  </BounceIn>
                );
              })}
            </div>

            {/* Character with wave gesture */}
            <div style={{ position: 'absolute', bottom: portrait ? '8%' : '5%', right: portrait ? '10%' : '5%', zIndex: 3 }}>
              <Character size={portrait ? 150 : 110} gesture="wave" />
            </div>

            <StarBurst startFrame={50} durationFrames={40} color={theme.colors.accent} />
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>

      {/* ── Number Sections ── */}
      {sections.map((section, i) => {
        const { start, duration } = sectionTimings[i];
        return (
          <React.Fragment key={section.number}>
            <Sequence from={start} durationInFrames={duration}>
              <NumberScene
                section={section}
                index={i}
                theme={theme}
                format={format}
                numberRevealFrames={numberRevealFrames}
                objectStaggerFrames={objectStaggerFrames}
              />
            </Sequence>
          </React.Fragment>
        );
      })}

      {/* ── Transitions — alternate Iris and Slide ── */}
      {sections.slice(0, -1).map((_, i) => {
        const { start, duration } = sectionTimings[i];
        const transitionStart = start + duration - 10;
        const nextColor = sections[i + 1].bgColor || SECTION_COLORS[(i + 1) % SECTION_COLORS.length];

        // Even indices: Iris, Odd indices: Slide
        if (i % 2 === 0) {
          return (
            <IrisTransition
              key={`trans-${i}`}
              startFrame={transitionStart}
              durationFrames={20}
              color={nextColor}
            />
          );
        }
        return (
          <SlideTransition
            key={`trans-${i}`}
            startFrame={transitionStart}
            durationFrames={20}
            color={nextColor}
          />
        );
      })}

      {/* ── Whoosh SFX at each transition ── */}
      {sections.slice(0, -1).map((_, i) => {
        const { start, duration } = sectionTimings[i];
        const transitionStart = start + duration - 10;
        return (
          <Sequence key={`whoosh-${i}`} from={transitionStart}>
            <Audio src={staticFile('sfx/whoosh.mp3')} startFrom={0} volume={0.3} />
          </Sequence>
        );
      })}

      {/* ── Celebration Outro ── */}
      <Sequence from={outroStart} durationInFrames={outroDurationFrames}>
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <RichBackground bgColor={theme.colors.accent} />

          <AbsoluteFill
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 30,
            }}
          >
            {/* Ring pulse behind "Amazing!" */}
            {Array.from({ length: 3 }, (_, i) => {
              const ringDelay = 8 + i * 6;
              const outroLocalFrame = Math.max(0, frame - outroStart);
              const ringAdj = Math.max(0, outroLocalFrame - ringDelay);
              const ringScale = spring({
                frame: ringAdj,
                fps,
                config: { damping: 10, stiffness: 40, mass: 1 },
              });
              const ringOpacity = interpolate(ringAdj, [0, 5, 30, 50], [0, 0.4, 0.15, 0], {
                extrapolateRight: 'clamp',
              });
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 200 + i * 100,
                    height: 200 + i * 100,
                    borderRadius: '50%',
                    border: '4px solid rgba(255,255,255,0.5)',
                    transform: `translate(-50%, -50%) scale(${ringScale})`,
                    opacity: ringOpacity,
                  }}
                />
              );
            })}

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

            {/* Typewriter-style "You counted to N!" */}
            <BounceIn delay={30} style={{ zIndex: 2 }}>
              {(() => {
                const outroLocalFrame = Math.max(0, frame - outroStart);
                const typeDelay = 30;
                const typeAdj = Math.max(0, outroLocalFrame - typeDelay);
                const fullText = `You counted to ${maxNumber}!`;
                const charsVisible = Math.min(
                  fullText.length,
                  Math.floor(typeAdj / 2) // 2 frames per character
                );
                return (
                  <div
                    style={{
                      fontSize: responsiveFontSize(36, format, 'body'),
                      fontWeight: 600,
                      fontFamily: theme.fonts.body,
                      color: 'rgba(255,255,255,0.9)',
                      textAlign: 'center',
                    }}
                  >
                    {fullText.slice(0, charsVisible)}
                    {charsVisible < fullText.length && (
                      <span style={{ opacity: outroLocalFrame % 10 < 5 ? 1 : 0 }}>|</span>
                    )}
                  </div>
                );
              })()}
            </BounceIn>

            {/* Character celebrate */}
            <div style={{ position: 'absolute', bottom: portrait ? '8%' : '5%', right: portrait ? '10%' : '5%', zIndex: 3 }}>
              <Character size={portrait ? 150 : 110} gesture="celebrate" />
            </div>

            <Confetti startFrame={15} durationFrames={90} count={80} />
            <StarBurst startFrame={25} durationFrames={50} color="white" />
          </AbsoluteFill>
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
