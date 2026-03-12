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
import {
  BounceIn, Confetti, StarBurst, IrisTransition,
  IconCheckmark, IconCross, IconQuestionMark, IconTrophy,
} from '../../components/kids';
import { KIDS_ICONS } from '../../components/kids/KidsIcons';

// ══════════════════════════════════════════════════════════════
// KIDS ICON QUIZ
//
// Long-form quiz template for 2-5 minute videos.
// Structure: Intro → Quiz Rounds → Score / Celebration Outro
//
// Each quiz round:
//   1. Question text with "?" icon
//   2. 3 icon choices bounce in
//   3. Narration gap (audio-sync): "Which one is a _____?"
//   4. Correct answer highlights + checkmark + star burst
//   5. Wrong answers get X mark + fade
//   6. Transition to next round
//
// Audio sync: each round has startFrame/durationFrames + revealFrame
// ══════════════════════════════════════════════════════════════

const quizChoiceSchema = z.object({
  icon: z.string(),
  label: z.string(),
  color: z.string().optional(),
});

const quizRoundSchema = z.object({
  question: z.string(),        // "Which one is a Cat?"
  choices: z.array(quizChoiceSchema).min(2).max(4),
  correctIndex: z.number(),    // 0-based index of correct answer
  bgColor: z.string().optional(),
  // Audio-sync overrides
  startFrame: z.number().optional(),
  durationFrames: z.number().optional(),
  revealFrame: z.number().optional(),  // frame within section when answer reveals
});

export type QuizRound = z.infer<typeof quizRoundSchema>;

const kidsQuizSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  rounds: z.array(quizRoundSchema),
  // Timing defaults
  introDurationFrames: z.number(),
  questionShowFrames: z.number(),
  choicesStaggerFrames: z.number(),
  thinkingGapFrames: z.number(),     // gap before reveal (for TTS: "Is it the ___?")
  revealHoldFrames: z.number(),       // hold on correct answer
  transitionFrames: z.number(),
  outroDurationFrames: z.number(),
  outroText: z.string(),
});

export type KidsQuizProps = z.infer<typeof kidsQuizSchema>;

// ── Defaults ────────────────────────────────────────────

const ROUND_COLORS = [
  '#4D96FF', '#6BCB77', '#FFD93D', '#FF6B6B', '#FFAFCC',
  '#A2D2FF', '#8AC926', '#FF595E', '#1982C4', '#6A4C93',
];

export const defaultProps: KidsQuizProps = {
  title: 'Animal Quiz!',
  subtitle: 'Can You Guess the Animal?',
  rounds: [
    {
      question: 'Which one is a Cat?',
      choices: [
        { icon: 'dog', label: 'Dog', color: '#C4A35A' },
        { icon: 'cat', label: 'Cat', color: '#FF6B6B' },
        { icon: 'fish', label: 'Fish', color: '#4D96FF' },
      ],
      correctIndex: 1,
      bgColor: '#4D96FF',
    },
    {
      question: 'Which one is a Bird?',
      choices: [
        { icon: 'bird', label: 'Bird', color: '#6BCB77' },
        { icon: 'butterfly', label: 'Butterfly', color: '#FFAFCC' },
        { icon: 'lion', label: 'Lion', color: '#FFB347' },
      ],
      correctIndex: 0,
      bgColor: '#6BCB77',
    },
    {
      question: 'Which one is an Elephant?',
      choices: [
        { icon: 'cat', label: 'Cat', color: '#FF6B6B' },
        { icon: 'dog', label: 'Dog', color: '#C4A35A' },
        { icon: 'elephant', label: 'Elephant', color: '#A2D2FF' },
      ],
      correctIndex: 2,
      bgColor: '#FFD93D',
    },
    {
      question: 'Which one is a Star?',
      choices: [
        { icon: 'heart', label: 'Heart', color: '#FF6B6B' },
        { icon: 'star', label: 'Star', color: '#FFD93D' },
        { icon: 'diamond', label: 'Diamond', color: '#A2D2FF' },
      ],
      correctIndex: 1,
      bgColor: '#FF6B6B',
    },
    {
      question: 'Which one is a Lion?',
      choices: [
        { icon: 'elephant', label: 'Elephant', color: '#A2D2FF' },
        { icon: 'fish', label: 'Fish', color: '#4D96FF' },
        { icon: 'lion', label: 'Lion', color: '#FFB347' },
      ],
      correctIndex: 2,
      bgColor: '#FFAFCC',
    },
  ],
  introDurationFrames: 120,
  questionShowFrames: 25,
  choicesStaggerFrames: 15,
  thinkingGapFrames: 60,      // 2s thinking time
  revealHoldFrames: 60,       // 2s showing correct answer
  transitionFrames: 20,
  outroDurationFrames: 150,
  outroText: 'You Got Them All!',
};

// ── Helpers ─────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// ── Sparkle Background ──────────────────────────────────

const SparkleBackground: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {Array.from({ length: 20 }, (_, i) => {
        const x = seededRandom(i * 7) * 100;
        const y = seededRandom(i * 13) * 100;
        const size = 4 + seededRandom(i * 3) * 8;
        const twinkle = Math.sin(frame * 0.08 + i * 3) * 0.5 + 0.5;
        const scale = 0.5 + twinkle * 0.5;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: twinkle * 0.3,
              transform: `scale(${scale})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ── Choice Card ─────────────────────────────────────────

const ChoiceCard: React.FC<{
  choice: z.infer<typeof quizChoiceSchema>;
  index: number;
  isCorrect: boolean;
  isRevealed: boolean;
  delay: number;
  theme: Theme;
  format: Format;
}> = ({ choice, index, isCorrect, isRevealed, delay, theme, format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = isPortrait(format);

  const adj = Math.max(0, frame - delay);
  const entranceScale = spring({
    frame: adj,
    fps,
    config: { damping: 8, stiffness: 150, mass: 0.5 },
  });
  const opacity = interpolate(adj, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  // Wiggle while waiting for reveal (thinking phase)
  const wiggle = !isRevealed && adj > 15
    ? Math.sin(frame * 0.12 + index * 2) * 2
    : 0;

  // Reveal animation
  let revealScale = 1;
  let revealOpacity = 1;
  let borderColor = 'rgba(255,255,255,0.3)';
  let bgOverlay = 'transparent';

  if (isRevealed) {
    if (isCorrect) {
      const pulse = Math.sin(frame * 0.2) * 0.05;
      revealScale = 1.1 + pulse;
      borderColor = '#6BCB77';
      bgOverlay = 'rgba(107, 203, 119, 0.15)';
    } else {
      revealScale = 0.9;
      revealOpacity = 0.4;
      borderColor = 'rgba(255,107,107,0.5)';
    }
  }

  const IconComponent = KIDS_ICONS[choice.icon];
  const iconSize = portrait ? 100 : 80;

  return (
    <div
      style={{
        opacity: opacity * revealOpacity,
        transform: `scale(${entranceScale * revealScale}) rotate(${wiggle}deg)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: portrait ? 24 : 18,
        background: `linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))`,
        borderRadius: 24,
        border: `4px solid ${borderColor}`,
        backdropFilter: 'blur(8px)',
        position: 'relative',
        backgroundColor: bgOverlay,
        minWidth: portrait ? 200 : 160,
      }}
    >
      {IconComponent && (
        <IconComponent size={iconSize} color={choice.color || 'white'} />
      )}
      <div
        style={{
          fontSize: responsiveFontSize(28, format, 'body'),
          fontWeight: 700,
          fontFamily: theme.fonts.body,
          color: 'white',
          textShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}
      >
        {choice.label}
      </div>

      {/* Checkmark / Cross overlay after reveal */}
      {isRevealed && (
        <div style={{ position: 'absolute', top: -12, right: -12 }}>
          {isCorrect ? (
            <IconCheckmark size={40} color="#6BCB77" />
          ) : (
            <IconCross size={40} color="#FF6B6B" />
          )}
        </div>
      )}
    </div>
  );
};

// ── Single Quiz Round Scene ─────────────────────────────

const QuizRoundScene: React.FC<{
  round: QuizRound;
  roundIndex: number;
  totalRounds: number;
  theme: Theme;
  format: Format;
  questionShowFrames: number;
  choicesStaggerFrames: number;
  defaultRevealFrame: number;
}> = ({ round, roundIndex, totalRounds, theme, format, questionShowFrames, choicesStaggerFrames, defaultRevealFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = isPortrait(format);

  const bgColor = round.bgColor || ROUND_COLORS[roundIndex % ROUND_COLORS.length];
  const revealAt = round.revealFrame ?? defaultRevealFrame;
  const isRevealed = frame >= revealAt;

  const choicesStartFrame = questionShowFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      <SparkleBackground color="rgba(255,255,255,0.6)" />

      {/* Round indicator */}
      <div
        style={{
          position: 'absolute',
          top: portrait ? 80 : 30,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: responsiveFontSize(24, format, 'caption'),
          fontWeight: 700,
          fontFamily: theme.fonts.body,
          color: 'rgba(255,255,255,0.7)',
          zIndex: 2,
        }}
      >
        Round {roundIndex + 1} of {totalRounds}
      </div>

      {/* Question */}
      <div
        style={{
          position: 'absolute',
          top: portrait ? '15%' : '12%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 15,
          zIndex: 2,
          width: '85%',
        }}
      >
        <BounceIn delay={5}>
          <IconQuestionMark size={portrait ? 80 : 60} color={bgColor} />
        </BounceIn>

        <BounceIn delay={12}>
          <div
            style={{
              fontSize: responsiveFontSize(48, format, 'heading'),
              fontWeight: 800,
              fontFamily: theme.fonts.heading,
              color: 'white',
              textShadow: '0 4px 12px rgba(0,0,0,0.2)',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            {round.question}
          </div>
        </BounceIn>
      </div>

      {/* Choices */}
      <div
        style={{
          position: 'absolute',
          top: portrait ? '45%' : '40%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: portrait ? 'column' : 'row',
          gap: portrait ? 20 : 30,
          alignItems: 'center',
          zIndex: 2,
        }}
      >
        {round.choices.map((choice, i) => (
          <ChoiceCard
            key={`${choice.icon}-${i}`}
            choice={choice}
            index={i}
            isCorrect={i === round.correctIndex}
            isRevealed={isRevealed}
            delay={choicesStartFrame + i * choicesStaggerFrames}
            theme={theme}
            format={format}
          />
        ))}
      </div>

      {/* "Correct!" text after reveal */}
      {isRevealed && (
        <div
          style={{
            position: 'absolute',
            bottom: portrait ? '15%' : '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
          }}
        >
          <BounceIn delay={0}>
            <div
              style={{
                fontSize: responsiveFontSize(56, format, 'heading'),
                fontWeight: 800,
                fontFamily: theme.fonts.heading,
                color: '#6BCB77',
                textShadow: '0 4px 12px rgba(0,0,0,0.2), 0 0 30px rgba(107,203,119,0.3)',
                textAlign: 'center',
              }}
            >
              Correct! It's the {round.choices[round.correctIndex].label}!
            </div>
          </BounceIn>
        </div>
      )}

      {/* Star burst on reveal */}
      {isRevealed && (
        <StarBurst startFrame={revealAt} durationFrames={30} color="#FFD93D" />
      )}
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

const KidsIconQuiz: React.FC<
  KidsQuizProps & { theme: Theme; format: Format }
> = (rawProps) => {
  const {
    title, subtitle, rounds,
    introDurationFrames, questionShowFrames, choicesStaggerFrames,
    thinkingGapFrames, revealHoldFrames, transitionFrames: tranFrames,
    outroDurationFrames, outroText,
    theme, format,
  } = rawProps;

  loadGoogleFont('Fredoka', [400, 600, 700]);
  loadGoogleFont('Nunito', [400, 600, 700, 800]);

  const frame = useCurrentFrame();
  const portrait = isPortrait(format);

  // Calculate per-round timing
  const roundTimings: Array<{ start: number; duration: number; revealFrame: number }> = [];
  let cursor = introDurationFrames;

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const start = round.startFrame ?? cursor;
    // Default reveal: after question + choices + thinking gap
    const defaultReveal = questionShowFrames + round.choices.length * choicesStaggerFrames + thinkingGapFrames;
    const revealFrame = round.revealFrame ?? defaultReveal;
    const duration = round.durationFrames ?? (revealFrame + revealHoldFrames);
    roundTimings.push({ start, duration, revealFrame });
    cursor = start + duration + tranFrames;
  }

  const outroStart = cursor;

  return (
    <AbsoluteFill style={{ backgroundColor: '#F0F4FF', overflow: 'hidden' }}>
      {/* ── Intro ── */}
      <Sequence from={0} durationInFrames={introDurationFrames}>
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.accent} 100%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 25,
          }}
        >
          <SparkleBackground color="rgba(255,255,255,0.5)" />

          <BounceIn delay={10} style={{ zIndex: 2 }}>
            <IconQuestionMark size={portrait ? 120 : 90} color="white" />
          </BounceIn>

          <BounceIn delay={25} style={{ zIndex: 2 }}>
            <div
              style={{
                fontSize: responsiveFontSize(80, format, 'heading'),
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

          <BounceIn delay={40} style={{ zIndex: 2 }}>
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

          <BounceIn delay={60} style={{ zIndex: 2 }}>
            <div
              style={{
                fontSize: responsiveFontSize(28, format, 'body'),
                fontWeight: 600,
                fontFamily: theme.fonts.body,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              {rounds.length} Rounds — Let's Go!
            </div>
          </BounceIn>

          <StarBurst startFrame={55} durationFrames={40} color="white" />
        </AbsoluteFill>
      </Sequence>

      {/* ── Quiz Rounds ── */}
      {rounds.map((round, i) => {
        const { start, duration, revealFrame } = roundTimings[i];
        return (
          <Sequence key={`round-${i}`} from={start} durationInFrames={duration}>
            <QuizRoundScene
              round={round}
              roundIndex={i}
              totalRounds={rounds.length}
              theme={theme}
              format={format}
              questionShowFrames={questionShowFrames}
              choicesStaggerFrames={choicesStaggerFrames}
              defaultRevealFrame={revealFrame}
            />
          </Sequence>
        );
      })}

      {/* ── Iris transitions ── */}
      {rounds.slice(0, -1).map((_, i) => {
        const { start, duration } = roundTimings[i];
        return (
          <IrisTransition
            key={`iris-${i}`}
            startFrame={start + duration - 10}
            durationFrames={20}
            color={rounds[i + 1].bgColor || ROUND_COLORS[(i + 1) % ROUND_COLORS.length]}
          />
        );
      })}

      {/* ── Celebration Outro ── */}
      <Sequence from={outroStart} durationInFrames={outroDurationFrames}>
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, #FFD93D 0%, #FF6B6B 50%, #4D96FF 100%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 30,
          }}
        >
          <SparkleBackground color="rgba(255,255,255,0.5)" />

          <BounceIn delay={10} style={{ zIndex: 2 }}>
            <IconTrophy size={portrait ? 140 : 110} color="#FFD93D" />
          </BounceIn>

          <BounceIn delay={25} style={{ zIndex: 2 }}>
            <div
              style={{
                fontSize: responsiveFontSize(80, format, 'heading'),
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

          <BounceIn delay={40} style={{ zIndex: 2 }}>
            <div
              style={{
                fontSize: responsiveFontSize(36, format, 'body'),
                fontWeight: 600,
                fontFamily: theme.fonts.body,
                color: 'rgba(255,255,255,0.9)',
                textAlign: 'center',
              }}
            >
              {rounds.length} out of {rounds.length} — Perfect Score!
            </div>
          </BounceIn>

          <Confetti startFrame={20} durationFrames={110} count={60} />
          <StarBurst startFrame={30} durationFrames={60} color="white" />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

// ── Register ────────────────────────────────────────────

const meta = {
  id: 'kids-icon-quiz',
  name: 'Kids Icon Quiz',
  description: 'Long-form interactive quiz with icon choices, reveal animations, and celebration. Works for animals, shapes, colors, and more. Audio-sync ready.',
  category: 'kids',
  tags: ['kids', 'education', 'quiz', 'interactive', 'animals', 'shapes', 'animation', 'long-form'],
  supportedFormats: ['story' as const, 'post' as const, 'landscape' as const],
  durationInFrames: 5400,
  fps: 30,
};

registry.register({
  meta,
  schema: kidsQuizSchema,
  component: KidsIconQuiz,
  defaultProps,
});

export { KidsIconQuiz };
export default KidsIconQuiz;
