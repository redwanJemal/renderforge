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
import { BounceIn, Confetti, StarBurst, IrisTransition, LetterIcon } from '../../components/kids';
import { KIDS_ICONS } from '../../components/kids/KidsIcons';

// ══════════════════════════════════════════════════════════════
// KIDS ALPHABET ADVENTURE
//
// Long-form template designed for 2-5 minute videos.
// Structure: Intro → Letter Sections → Celebration Outro
//
// Each letter section has its own timing for audio sync:
//   - Letter reveal (big bouncy entrance)
//   - Word display + icon animation
//   - Narration gap (controlled by audio-sync timing)
//   - Transition to next letter
//
// Audio sync: Each section's startFrame and durationFrames
// are overridden by the audio-sync pipeline based on TTS duration.
// ══════════════════════════════════════════════════════════════

const letterSectionSchema = z.object({
  letter: z.string(),
  word: z.string(),
  icon: z.string(),
  iconColor: z.string().optional(),
  bgColor: z.string().optional(),
  // Audio-sync timing — these get overridden by audio-sync.ts
  startFrame: z.number().optional(),
  durationFrames: z.number().optional(),
});

export type LetterSection = z.infer<typeof letterSectionSchema>;

const kidsAlphabetSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  letters: z.array(letterSectionSchema),
  // Intro timing
  introDurationFrames: z.number(),
  // Per-letter defaults (overridden per-section if audio synced)
  letterRevealFrames: z.number(),
  wordShowFrames: z.number(),
  narrationGapFrames: z.number(),
  transitionFrames: z.number(),
  // Outro
  outroDurationFrames: z.number(),
  outroText: z.string(),
  // Style
  letterBgColor: z.string(),
  transitionShape: z.enum(['circle', 'star', 'diamond']),
});

export type KidsAlphabetProps = z.infer<typeof kidsAlphabetSchema>;

// ── Defaults ────────────────────────────────────────────

const LETTER_COLORS = [
  '#FF6B6B', '#4D96FF', '#6BCB77', '#FFD93D', '#FFAFCC',
  '#A2D2FF', '#FF595E', '#8AC926', '#1982C4', '#6A4C93',
];

export const defaultProps: KidsAlphabetProps = {
  title: 'ABC Adventure!',
  subtitle: "Let's Learn the Alphabet!",
  letters: [
    { letter: 'A', word: 'Apple', icon: 'apple', iconColor: '#FF6B6B' },
    { letter: 'B', word: 'Bird', icon: 'bird', iconColor: '#6BCB77' },
    { letter: 'C', word: 'Cat', icon: 'cat', iconColor: '#FF6B6B' },
    { letter: 'D', word: 'Dog', icon: 'dog', iconColor: '#C4A35A' },
    { letter: 'E', word: 'Elephant', icon: 'elephant', iconColor: '#A2D2FF' },
    { letter: 'F', word: 'Fish', icon: 'fish', iconColor: '#4D96FF' },
  ],
  introDurationFrames: 120,    // 4s intro
  letterRevealFrames: 30,      // 1s for letter to animate in
  wordShowFrames: 60,          // 2s word + icon on screen
  narrationGapFrames: 45,      // 1.5s narration gap (audio-sync overrides this)
  transitionFrames: 20,        // 0.67s transition between letters
  outroDurationFrames: 120,    // 4s outro celebration
  outroText: 'Great Job!',
  letterBgColor: '#F0F4FF',
  transitionShape: 'star',
};

// ── Floating Shapes Background ──────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const FloatingShapes: React.FC<{ color1: string; color2: string }> = ({ color1, color2 }) => {
  const frame = useCurrentFrame();
  const shapes = Array.from({ length: 12 }, (_, i) => {
    const x = seededRandom(i * 7) * 100;
    const y = seededRandom(i * 13) * 100;
    const size = 20 + seededRandom(i * 3) * 40;
    const isCircle = i % 3 === 0;
    const isStar = i % 3 === 1;
    const drift = Math.sin(frame * 0.02 + i * 2) * 15;
    const rotate = frame * 0.5 + i * 30;
    const opacity = 0.08 + seededRandom(i * 17) * 0.08;

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y + drift * 0.1}%`,
          width: size,
          height: size,
          backgroundColor: i % 2 === 0 ? color1 : color2,
          borderRadius: isCircle ? '50%' : isStar ? '30%' : 8,
          transform: `rotate(${rotate}deg) translateY(${drift}px)`,
          opacity,
        }}
      />
    );
  });
  return <AbsoluteFill style={{ overflow: 'hidden' }}>{shapes}</AbsoluteFill>;
};

// ── Progress Dots ───────────────────────────────────────

const ProgressDots: React.FC<{
  total: number;
  current: number;
  activeColor: string;
  inactiveColor: string;
  format: Format;
}> = ({ total, current, activeColor, inactiveColor, format }) => {
  const portrait = isPortrait(format);
  const dotSize = portrait ? 14 : 10;
  const gap = portrait ? 8 : 6;

  // Show max 15 dots, otherwise it overflows
  const maxDots = 15;
  const showDots = total <= maxDots;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: portrait ? 100 : 40,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap,
        alignItems: 'center',
      }}
    >
      {showDots ? (
        Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            style={{
              width: i === current ? dotSize * 2 : dotSize,
              height: dotSize,
              borderRadius: dotSize,
              backgroundColor: i <= current ? activeColor : inactiveColor,
              transition: 'all 0.3s',
            }}
          />
        ))
      ) : (
        <div
          style={{
            fontSize: dotSize * 1.5,
            fontWeight: 700,
            color: activeColor,
            fontFamily: 'Fredoka, sans-serif',
          }}
        >
          {current + 1} / {total}
        </div>
      )}
    </div>
  );
};

// ── Single Letter Scene ─────────────────────────────────

const LetterScene: React.FC<{
  section: LetterSection;
  index: number;
  theme: Theme;
  format: Format;
  letterRevealFrames: number;
  wordShowFrames: number;
}> = ({ section, index, theme, format, letterRevealFrames, wordShowFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = isPortrait(format);

  const bgColor = section.bgColor || LETTER_COLORS[index % LETTER_COLORS.length];
  const IconComponent = KIDS_ICONS[section.icon];
  const iconSize = portrait ? 180 : 140;
  const letterSize = portrait ? 220 : 160;

  // Phase 1: Letter reveals (0 → letterRevealFrames)
  const letterScale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 150, mass: 0.5 },
  });

  // Phase 2: Word + icon appear (letterRevealFrames → letterRevealFrames + wordShowFrames)
  const wordDelay = letterRevealFrames;
  const wordAdj = Math.max(0, frame - wordDelay);
  const wordSpring = spring({
    frame: wordAdj,
    fps,
    config: { damping: 10, stiffness: 120, mass: 0.6 },
  });
  const wordOpacity = interpolate(wordAdj, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  // Icon bounce in (slightly after word)
  const iconDelay = wordDelay + 10;
  const iconAdj = Math.max(0, frame - iconDelay);
  const iconSpring = spring({
    frame: iconAdj,
    fps,
    config: { damping: 6, stiffness: 200, mass: 0.4 },
  });

  // Subtle wiggle on the icon after it lands
  const wiggle = frame > iconDelay + 15
    ? Math.sin((frame - iconDelay) * 0.15) * 3
    : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: portrait ? 30 : 20,
      }}
    >
      <FloatingShapes color1="rgba(255,255,255,0.15)" color2="rgba(255,255,255,0.1)" />

      {/* Big letter */}
      <div style={{ transform: `scale(${letterScale})`, zIndex: 2 }}>
        <LetterIcon
          letter={section.letter}
          size={letterSize}
          bgColor={section.iconColor || bgColor}
          color="white"
        />
      </div>

      {/* Word text */}
      <div
        style={{
          opacity: wordOpacity,
          transform: `translateY(${(1 - wordSpring) * 40}px)`,
          fontSize: responsiveFontSize(72, format, 'heading'),
          fontWeight: 800,
          fontFamily: theme.fonts.heading,
          color: 'white',
          textShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 2,
          letterSpacing: '0.05em',
        }}
      >
        {section.word}
      </div>

      {/* Icon */}
      {IconComponent && (
        <div
          style={{
            transform: `scale(${iconSpring}) rotate(${wiggle}deg)`,
            zIndex: 2,
          }}
        >
          <IconComponent size={iconSize} color={section.iconColor || 'white'} />
        </div>
      )}

      {/* "A is for Apple" text at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: portrait ? 160 : 80,
          opacity: wordOpacity,
          fontSize: responsiveFontSize(32, format, 'body'),
          fontWeight: 600,
          fontFamily: theme.fonts.body,
          color: 'rgba(255,255,255,0.85)',
          zIndex: 2,
          letterSpacing: '0.03em',
        }}
      >
        {section.letter} is for {section.word}!
      </div>
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

const KidsAlphabetAdventure: React.FC<
  KidsAlphabetProps & { theme: Theme; format: Format }
> = (rawProps) => {
  const {
    title, subtitle, letters,
    introDurationFrames, letterRevealFrames, wordShowFrames,
    narrationGapFrames, transitionFrames: tranFrames,
    outroDurationFrames, outroText, letterBgColor, transitionShape,
    theme, format,
  } = rawProps;

  loadGoogleFont('Fredoka', [400, 600, 700]);
  loadGoogleFont('Nunito', [400, 600, 700, 800]);
  loadGoogleFont('Bubblegum Sans', [400]);

  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const portrait = isPortrait(format);

  // Calculate per-section timing
  // If sections have custom startFrame/durationFrames (from audio-sync), use those.
  // Otherwise, calculate from defaults.
  const sectionTimings: Array<{ start: number; duration: number }> = [];
  let cursor = introDurationFrames;

  for (let i = 0; i < letters.length; i++) {
    const section = letters[i];
    const start = section.startFrame ?? cursor;
    const duration = section.durationFrames ?? (letterRevealFrames + wordShowFrames + narrationGapFrames);
    sectionTimings.push({ start, duration });
    cursor = start + duration + tranFrames;
  }

  const outroStart = cursor;

  // Find which letter section is active
  const activeSection = sectionTimings.findIndex(
    (t) => frame >= t.start && frame < t.start + t.duration
  );

  return (
    <AbsoluteFill style={{ backgroundColor: letterBgColor, overflow: 'hidden' }}>
      {/* ── Intro Scene ── */}
      <Sequence from={0} durationInFrames={introDurationFrames}>
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          <FloatingShapes color1="rgba(255,255,255,0.12)" color2="rgba(255,255,255,0.08)" />

          <BounceIn delay={15} style={{ zIndex: 2 }}>
            <div
              style={{
                fontSize: responsiveFontSize(portrait ? 80 : 72, format, 'heading'),
                fontWeight: 800,
                fontFamily: theme.fonts.heading,
                color: 'white',
                textAlign: 'center',
                textShadow: '0 6px 20px rgba(0,0,0,0.2)',
                lineHeight: 1.2,
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

          {/* Bouncing letter preview */}
          <div style={{ display: 'flex', gap: 12, marginTop: 30, zIndex: 2, flexWrap: 'wrap', justifyContent: 'center', padding: '0 40px' }}>
            {letters.slice(0, 8).map((l, i) => (
              <BounceIn key={l.letter} delay={55 + i * 6}>
                <LetterIcon
                  letter={l.letter}
                  size={portrait ? 70 : 55}
                  bgColor={LETTER_COLORS[i % LETTER_COLORS.length]}
                />
              </BounceIn>
            ))}
          </div>

          <StarBurst startFrame={50} durationFrames={40} color={theme.colors.accent} />
        </AbsoluteFill>
      </Sequence>

      {/* ── Letter Sections ── */}
      {letters.map((section, i) => {
        const { start, duration } = sectionTimings[i];
        return (
          <Sequence key={section.letter} from={start} durationInFrames={duration}>
            <LetterScene
              section={section}
              index={i}
              theme={theme}
              format={format}
              letterRevealFrames={letterRevealFrames}
              wordShowFrames={wordShowFrames}
            />
          </Sequence>
        );
      })}

      {/* ── Iris transitions between letters ── */}
      {letters.slice(0, -1).map((_, i) => {
        const { start, duration } = sectionTimings[i];
        const transitionStart = start + duration - 10;
        return (
          <IrisTransition
            key={`iris-${i}`}
            startFrame={transitionStart}
            durationFrames={20}
            color={LETTER_COLORS[(i + 1) % LETTER_COLORS.length]}
          />
        );
      })}

      {/* ── Progress dots ── */}
      {activeSection >= 0 && (
        <ProgressDots
          total={letters.length}
          current={activeSection}
          activeColor={theme.colors.accent}
          inactiveColor="rgba(255,255,255,0.3)"
          format={format}
        />
      )}

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
          <FloatingShapes color1="rgba(255,255,255,0.15)" color2="rgba(255,255,255,0.1)" />

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
            <div style={{ fontSize: 80 }}>🎉</div>
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
  id: 'kids-alphabet-adventure',
  name: 'Kids Alphabet Adventure',
  description: 'Long-form alphabet learning video with bouncy letter reveals, icon animations, and celebration transitions. Audio-sync ready.',
  category: 'kids',
  tags: ['kids', 'education', 'alphabet', 'letters', 'animation', 'long-form'],
  supportedFormats: ['story' as const, 'post' as const, 'landscape' as const],
  durationInFrames: 5400, // 3 min max — actual length controlled by audio-sync --frames
  fps: 30,
};

registry.register({
  meta,
  schema: kidsAlphabetSchema,
  component: KidsAlphabetAdventure,
  defaultProps,
});

export { KidsAlphabetAdventure };
export default KidsAlphabetAdventure;
