import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Audio,
  staticFile,
} from 'remotion';
import type { Theme, Format } from '../../types';
import { responsiveFontSize, responsivePadding, isPortrait } from '../../core/formats';
import { registry } from '../../core/registry';
import { meta } from './meta';
import { vocabCardSchema, defaultProps } from './schema';
import type { VocabCardProps } from './schema';

// ── Floating Particle ──────────────────────
const Particle: React.FC<{ index: number; color: string }> = ({ index, color }) => {
  const frame = useCurrentFrame();
  const seed = index * 173.7;
  const x = (seed * 3.7) % 100;
  const size = 2 + (seed % 3);
  const speed = 0.15 + (seed % 4) * 0.05;
  const y = ((frame * speed + seed * 2) % 130) - 15;
  const drift = Math.sin(frame * 0.015 + seed) * 10;
  const opacity = interpolate(y, [0, 15, 85, 120], [0, 0.4, 0.4, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x + drift * 0.2}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        opacity: opacity * 0.35,
      }}
    />
  );
};

// ── Glowing Orb (ambient background) ──────────────────────
const GlowOrb: React.FC<{
  x: string;
  y: string;
  size: number;
  color: string;
  delay: number;
}> = ({ x, y, size, color, delay }) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin((frame + delay) * 0.03) * 0.3 + 0.7;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
        opacity: pulse * 0.5,
        transform: `translate(-50%, -50%) scale(${0.9 + pulse * 0.2})`,
        filter: `blur(${size * 0.3}px)`,
      }}
    />
  );
};

// ── Level Badge ──────────────────────
const LevelBadge: React.FC<{
  level: string;
  accentColor: string;
  frame: number;
  fps: number;
  format: Format;
}> = ({ level, accentColor, frame, fps, format }) => {
  const scale = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 12, stiffness: 150, mass: 0.5 },
  });

  const levelColors: Record<string, string> = {
    A1: '#22C55E',
    A2: '#84CC16',
    B1: '#EAB308',
    B2: '#F97316',
    C1: '#EF4444',
    C2: '#DC2626',
  };

  const color = levelColors[level] ?? accentColor;
  const badgeSize = responsiveFontSize(14, format, 'caption');

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 16px',
        borderRadius: 20,
        background: `${color}18`,
        border: `1.5px solid ${color}50`,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}80`,
        }}
      />
      <span
        style={{
          fontSize: badgeSize,
          fontWeight: 700,
          color,
          letterSpacing: 1.5,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {level}
      </span>
    </div>
  );
};

// ── Pill Tag ──────────────────────
const PillTag: React.FC<{
  text: string;
  color: string;
  delay: number;
  format: Format;
}> = ({ text, color, delay, format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.5 },
  });

  const opacity = interpolate(Math.max(0, frame - delay), [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        padding: '5px 14px',
        borderRadius: 16,
        background: `${color}12`,
        border: `1px solid ${color}30`,
        fontSize: responsiveFontSize(13, format, 'caption'),
        fontWeight: 500,
        color: `${color}CC`,
        fontFamily: 'Inter, sans-serif',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

// ── Animated Divider ──────────────────────
const AnimatedDivider: React.FC<{
  delay: number;
  color: string;
  width?: number;
}> = ({ delay, color, width = 60 }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(Math.max(0, frame - delay), [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: width * progress,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        borderRadius: 1,
        margin: '16px 0',
      }}
    />
  );
};

// ── Example Sentence ──────────────────────
const ExampleSentence: React.FC<{
  sentence: string;
  highlight?: string;
  accentColor: string;
  delay: number;
  index: number;
  format: Format;
}> = ({ sentence, highlight, accentColor, delay, index, format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideProgress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 16, stiffness: 100, mass: 0.7 },
  });

  const opacity = interpolate(Math.max(0, frame - delay), [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const renderText = () => {
    if (!highlight) return sentence;
    const parts = sentence.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <span key={i} style={{ color: accentColor, fontWeight: 700 }}>
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${(1 - slideProgress) * 40}px)`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 16px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        borderLeft: `3px solid ${accentColor}60`,
      }}
    >
      <span
        style={{
          fontSize: responsiveFontSize(14, format, 'caption'),
          color: `${accentColor}80`,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </span>
      <span
        style={{
          fontSize: responsiveFontSize(17, format, 'body'),
          color: 'rgba(255,255,255,0.8)',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          lineHeight: 1.55,
          fontStyle: 'italic',
        }}
      >
        "{renderText()}"
      </span>
    </div>
  );
};

// ── Main Component ──────────────────────

const VocabCard: React.FC<VocabCardProps & { theme: Theme; format: Format }> = (props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const {
    word,
    phonetic,
    partOfSpeech,
    definition,
    examples,
    synonyms,
    antonyms,
    level,
    dayNumber,
    brandName,
    accentColor,
    secondaryAccent,
    bgGradient,
    audioUrl,
    format,
  } = props;

  const pad = responsivePadding(50, format);
  const portrait = isPortrait(format);

  // ── Timeline (at 30fps, 450 frames = 15s) ──
  // 0-30:    Fade in + word entrance
  // 30-60:   Phonetic + part of speech
  // 60-90:   Definition
  // 90-200:  Examples (staggered)
  // 200-300: Synonyms / Antonyms
  // 300-420: Hold
  // 420-450: Fade out

  // Global fade
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const globalOpacity = Math.min(fadeIn, fadeOut);

  // Word entrance — scale + slam
  const wordScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 150, mass: 1 },
  });

  // Word glow pulse
  const glowPulse = Math.sin(frame * 0.06) * 0.4 + 0.6;

  // Phonetic entrance
  const phoneticOpacity = interpolate(frame, [25, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const phoneticSlide = spring({
    frame: Math.max(0, frame - 25),
    fps,
    config: { damping: 18, stiffness: 100, mass: 0.6 },
  });

  // Definition entrance
  const defOpacity = interpolate(frame, [55, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const defSlide = spring({
    frame: Math.max(0, frame - 55),
    fps,
    config: { damping: 16, stiffness: 100, mass: 0.7 },
  });

  // Synonyms/antonyms section entrance
  const tagsOpacity = interpolate(frame, [200, 215], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: globalOpacity, backgroundColor: '#000' }}>
      {/* Background gradient */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${bgGradient[1]} 0%, ${bgGradient[0]} 50%, ${bgGradient[2]} 100%)`,
        }}
      />

      {/* Ambient glow orbs */}
      <GlowOrb x="20%" y="25%" size={400} color={accentColor} delay={0} />
      <GlowOrb x="80%" y="70%" size={350} color={secondaryAccent} delay={40} />
      <GlowOrb x="50%" y="50%" size={250} color={accentColor} delay={80} />

      {/* Subtle grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${accentColor}06 1px, transparent 1px), linear-gradient(90deg, ${accentColor}06 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          opacity: 0.3,
        }}
      />

      {/* Particles */}
      <AbsoluteFill>
        {Array.from({ length: 20 }, (_, i) => (
          <Particle key={i} index={i} color={accentColor} />
        ))}
      </AbsoluteFill>

      {/* Audio (if provided) */}
      {audioUrl && <Audio src={audioUrl.startsWith('http') ? audioUrl : staticFile(audioUrl)} />}

      {/* ── Content Layout ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: portrait ? 'center' : 'center',
          padding: portrait ? `${pad * 1.8}px ${pad}px` : `${pad}px ${pad * 1.5}px`,
        }}
      >
        {/* Top bar: Brand + Level + Day */}
        <div
          style={{
            position: 'absolute',
            top: portrait ? 60 : 30,
            left: pad,
            right: pad,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: interpolate(frame, [0, 20], [0, 0.6], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: `linear-gradient(135deg, ${accentColor}, ${secondaryAccent})`,
              }}
            />
            <span
              style={{
                fontSize: responsiveFontSize(14, format, 'caption'),
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {brandName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {dayNumber && (
              <span
                style={{
                  fontSize: responsiveFontSize(13, format, 'caption'),
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.35)',
                  fontFamily: 'Inter, sans-serif',
                  opacity: interpolate(frame, [0, 20], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                }}
              >
                Day {dayNumber}
              </span>
            )}
            <LevelBadge level={level} accentColor={accentColor} frame={frame} fps={fps} format={format} />
          </div>
        </div>

        {/* ── WORD (Hero) ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: portrait ? 'center' : 'flex-start',
            marginBottom: portrait ? 8 : 4,
          }}
        >
          <div
            style={{
              transform: `scale(${interpolate(wordScale, [0, 1], [2.5, 1])})`,
              fontSize: responsiveFontSize(portrait ? 72 : 64, format, 'heading'),
              fontWeight: 900,
              fontFamily: 'Inter, sans-serif',
              color: '#FFFFFF',
              letterSpacing: -2,
              textAlign: portrait ? 'center' : 'left',
              textShadow: `0 0 ${60 * glowPulse}px ${accentColor}50, 0 0 ${120 * glowPulse}px ${accentColor}20`,
              lineHeight: 1.1,
            }}
          >
            {word}
          </div>

          {/* Accent underline under word */}
          <div
            style={{
              width: interpolate(frame, [8, 25], [0, portrait ? 100 : 80], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              height: 3,
              background: `linear-gradient(90deg, ${accentColor}, ${secondaryAccent})`,
              borderRadius: 2,
              marginTop: 8,
              alignSelf: portrait ? 'center' : 'flex-start',
            }}
          />
        </div>

        {/* ── Phonetic + Part of Speech ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: portrait ? 'center' : 'flex-start',
            gap: 16,
            marginTop: 12,
            opacity: phoneticOpacity,
            transform: `translateY(${(1 - phoneticSlide) * 20}px)`,
          }}
        >
          <span
            style={{
              fontSize: responsiveFontSize(22, format, 'body'),
              fontWeight: 400,
              color: `${accentColor}CC`,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: 1,
            }}
          >
            {phonetic}
          </span>
          <span
            style={{
              padding: '3px 12px',
              borderRadius: 8,
              background: `${secondaryAccent}15`,
              border: `1px solid ${secondaryAccent}30`,
              fontSize: responsiveFontSize(14, format, 'caption'),
              fontWeight: 600,
              color: `${secondaryAccent}BB`,
              fontFamily: 'Inter, sans-serif',
              textTransform: 'lowercase',
            }}
          >
            {partOfSpeech}
          </span>
        </div>

        {/* ── Definition ── */}
        <div
          style={{
            marginTop: 24,
            opacity: defOpacity,
            transform: `translateY(${(1 - defSlide) * 25}px)`,
          }}
        >
          <div
            style={{
              padding: portrait ? '18px 22px' : '14px 20px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span
              style={{
                fontSize: responsiveFontSize(11, format, 'caption'),
                fontWeight: 700,
                color: `${accentColor}80`,
                fontFamily: 'Inter, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              Definition
            </span>
            <div
              style={{
                fontSize: responsiveFontSize(22, format, 'body'),
                fontWeight: 500,
                color: 'rgba(255,255,255,0.9)',
                fontFamily: 'Inter, sans-serif',
                lineHeight: 1.5,
                marginTop: 8,
              }}
            >
              {definition}
            </div>
          </div>
        </div>

        <AnimatedDivider delay={85} color={accentColor} width={80} />

        {/* ── Examples ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {examples.slice(0, portrait ? 2 : 2).map((ex, i) => (
            <ExampleSentence
              key={i}
              sentence={ex.sentence}
              highlight={ex.highlight}
              accentColor={accentColor}
              delay={90 + i * 25}
              index={i}
              format={format}
            />
          ))}
        </div>

        <AnimatedDivider delay={195} color={secondaryAccent} width={60} />

        {/* ── Synonyms & Antonyms ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: portrait ? 'column' : 'row',
            gap: portrait ? 16 : 40,
            opacity: tagsOpacity,
          }}
        >
          {/* Synonyms */}
          {synonyms.length > 0 && (
            <div>
              <span
                style={{
                  fontSize: responsiveFontSize(11, format, 'caption'),
                  fontWeight: 700,
                  color: '#22C55E80',
                  fontFamily: 'Inter, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                }}
              >
                Synonyms
              </span>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {synonyms.slice(0, 4).map((syn, i) => (
                  <PillTag
                    key={syn}
                    text={syn}
                    color="#22C55E"
                    delay={210 + i * 8}
                    format={format}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Antonyms */}
          {antonyms.length > 0 && (
            <div>
              <span
                style={{
                  fontSize: responsiveFontSize(11, format, 'caption'),
                  fontWeight: 700,
                  color: '#EF444480',
                  fontFamily: 'Inter, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                }}
              >
                Antonyms
              </span>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {antonyms.slice(0, 4).map((ant, i) => (
                  <PillTag
                    key={ant}
                    text={ant}
                    color="#EF4444"
                    delay={240 + i * 8}
                    format={format}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: `${(frame / durationInFrames) * 100}%`,
          height: 3,
          background: `linear-gradient(90deg, ${accentColor}, ${secondaryAccent})`,
        }}
      />

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

registry.register({
  meta,
  schema: vocabCardSchema,
  component: VocabCard,
  defaultProps,
});

export { VocabCard, defaultProps as defaultVocabCardProps };
export default VocabCard;
