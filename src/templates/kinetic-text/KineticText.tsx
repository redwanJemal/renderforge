import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from 'remotion';
import { Logo } from '../../components/Logo';

// ══════════════════════════════════════════════════════════════
// KINETIC TYPOGRAPHY — Words as visual art
// Each word/phrase gets its own dramatic entrance & exit
// Lines appear one at a time — no overlap
// ══════════════════════════════════════════════════════════════

export type WordEntrance =
  | 'slam'
  | 'slide-left'
  | 'slide-right'
  | 'drop'
  | 'rise'
  | 'zoom'
  | 'spin'
  | 'fade'
  | 'split'
  | 'bounce'
  | 'typewriter';

export interface KineticLine {
  text: string;
  size: number;
  weight: number;
  entrance: WordEntrance;
  color: string;          // 'accent', 'secondary', 'white', 'muted', or hex
  uppercase: boolean;
  letterSpacing: number;
  italic: boolean;
  delay: number;          // frames gap before this line appears
  hold: number;           // frames to hold on screen
  align: 'left' | 'center' | 'right';
  offsetY: number;        // vertical offset from center (px)
}

export interface KineticTextProps {
  lines: KineticLine[];

  // Logo
  logoUrl: string;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  logoSize: number;

  // Theme
  theme: {
    accentColor: string;
    secondaryAccent: string;
    bgGradient: [string, string, string];
    particlesEnabled: boolean;
    flashEnabled: boolean;
    trailsEnabled: boolean;
    vignetteEnabled: boolean;
  };
}

// ── Defaults ─────────────────────────────────────────────────
export const defaultKineticTextProps: KineticTextProps = {
  lines: [
    {
      text: 'STOP',
      size: 160,
      weight: 900,
      entrance: 'slam' as WordEntrance,
      color: 'white',
      uppercase: true,
      letterSpacing: 0.15,
      italic: false,
      delay: 15,
      hold: 35,
      align: 'center' as const,
      offsetY: 0,
    },
    {
      text: 'scrolling.',
      size: 100,
      weight: 300,
      entrance: 'slide-right' as WordEntrance,
      color: 'muted',
      uppercase: false,
      letterSpacing: 0.05,
      italic: true,
      delay: 10,
      hold: 30,
      align: 'center' as const,
      offsetY: 0,
    },
    {
      text: 'THIS',
      size: 180,
      weight: 900,
      entrance: 'zoom' as WordEntrance,
      color: 'accent',
      uppercase: true,
      letterSpacing: 0.3,
      italic: false,
      delay: 12,
      hold: 30,
      align: 'center' as const,
      offsetY: 0,
    },
    {
      text: 'changes',
      size: 110,
      weight: 700,
      entrance: 'slide-left' as WordEntrance,
      color: 'white',
      uppercase: false,
      letterSpacing: 0.08,
      italic: false,
      delay: 8,
      hold: 25,
      align: 'center' as const,
      offsetY: -60,
    },
    {
      text: 'everything.',
      size: 90,
      weight: 400,
      entrance: 'rise' as WordEntrance,
      color: 'secondary',
      uppercase: false,
      letterSpacing: 0.05,
      italic: true,
      delay: 5,
      hold: 35,
      align: 'center' as const,
      offsetY: 60,
    },
    {
      text: '▶ WATCH NOW',
      size: 52,
      weight: 700,
      entrance: 'bounce' as WordEntrance,
      color: 'accent',
      uppercase: true,
      letterSpacing: 0.2,
      italic: false,
      delay: 20,
      hold: 80,
      align: 'center' as const,
      offsetY: 0,
    },
  ],

  logoUrl: 'https://placehold.co/200x200/FF3366/ffffff?text=LOGO',
  logoPosition: 'top-left',
  logoSize: 80,

  theme: {
    accentColor: '#FF3366',
    secondaryAccent: '#FF6B35',
    bgGradient: ['#0a0a0a', '#050505', '#000000'],
    particlesEnabled: true,
    flashEnabled: true,
    trailsEnabled: true,
    vignetteEnabled: true,
  },
};

// ══════════════════════════════════════════════════════════════
// EFFECTS
// ══════════════════════════════════════════════════════════════

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const DustParticles: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: seededRandom(i * 7) * 100,
    y: seededRandom(i * 13) * 100,
    size: 1 + seededRandom(i * 3) * 3,
    drift: seededRandom(i * 17) * 0.2,
    opacity: 0.1 + seededRandom(i * 23) * 0.2,
  }));

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {particles.map((p, i) => {
        const x = p.x + Math.sin(frame * 0.01 + i) * 3;
        const y = p.y + frame * p.drift * -0.1;
        const adjustedY = ((y % 110) + 110) % 110 - 5;
        return (
          <div key={i} style={{
            position: 'absolute', left: `${x}%`, top: `${adjustedY}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            background: i % 3 === 0 ? accent : 'rgba(255,255,255,0.5)',
            opacity: p.opacity * (0.5 + Math.sin(frame * 0.05 + i * 2) * 0.5),
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// Accent line accent that pulses with the beat
const AccentBar: React.FC<{ accent: string; frame: number; isActive: boolean }> = ({ accent, frame, isActive }) => {
  const pulse = Math.sin(frame * 0.1) * 0.3 + 0.7;
  const width = isActive ? interpolate(pulse, [0.4, 1], [60, 200]) : 0;
  return (
    <div style={{
      position: 'absolute',
      bottom: 180,
      left: '50%',
      transform: 'translateX(-50%)',
      width,
      height: 4,
      background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
      opacity: isActive ? 0.6 : 0,
      transition: 'width 0.3s ease',
      borderRadius: 2,
    }} />
  );
};

// ══════════════════════════════════════════════════════════════
// WORD COMPONENT — with entrance AND exit animations
// ══════════════════════════════════════════════════════════════

const KineticWord: React.FC<{
  line: KineticLine;
  startFrame: number;
  endFrame: number;
  accentColor: string;
  secondaryAccent: string;
  flashEnabled: boolean;
  trailsEnabled: boolean;
  isLast: boolean;
}> = ({ line, startFrame, endFrame, accentColor, secondaryAccent, flashEnabled, trailsEnabled, isLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adj = Math.max(0, frame - startFrame);
  const exitFrames = 12; // exit animation duration
  const exitStart = endFrame - exitFrames;
  const exitAdj = Math.max(0, frame - exitStart);

  const font = 'SF Pro Display, -apple-system, Helvetica, sans-serif';

  // Resolve color
  const resolvedColor = line.color === 'accent' ? accentColor
    : line.color === 'secondary' ? secondaryAccent
    : line.color === 'muted' ? 'rgba(255,255,255,0.45)'
    : line.color === 'white' ? '#ffffff'
    : line.color;

  // Base style
  const baseStyle: React.CSSProperties = {
    fontSize: line.size,
    fontWeight: line.weight,
    fontFamily: font,
    color: resolvedColor,
    textTransform: line.uppercase ? 'uppercase' : 'none',
    letterSpacing: `${line.letterSpacing}em`,
    fontStyle: line.italic ? 'italic' : 'normal',
    textAlign: line.align,
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    position: 'absolute' as const,
    left: line.align === 'center' ? '50%' : line.align === 'left' ? '60px' : undefined,
    right: line.align === 'right' ? '60px' : undefined,
    top: '50%',
  };

  // If we haven't started yet or already exited, don't render
  if (frame < startFrame || (!isLast && frame > endFrame)) return null;

  // Entrance animation
  let opacity = 0;
  let transform = '';
  let filter = '';
  let textShadow = '';

  const tx = line.align === 'center' ? '-50%' : '0%';

  switch (line.entrance) {
    case 'slam': {
      const s = spring({ frame: adj, fps, config: { damping: 8, stiffness: 150, mass: 0.6 } });
      opacity = interpolate(adj, [0, 3], [0, 1], { extrapolateRight: 'clamp' });
      const scale = interpolate(s, [0, 1], [5, 1]);
      transform = `translate(${tx}, calc(-50% + ${line.offsetY}px)) scale(${scale})`;
      if (adj < 8 && adj > 0) {
        textShadow = `0 0 ${60 * (1 - adj / 8)}px ${resolvedColor}`;
      }
      break;
    }
    case 'slide-left': {
      const s = spring({ frame: adj, fps, config: { damping: 14, stiffness: 80, mass: 0.8 } });
      opacity = interpolate(adj, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
      const x = interpolate(s, [0, 1], [-800, 0]);
      transform = `translate(calc(${tx} + ${x}px), calc(-50% + ${line.offsetY}px))`;
      if (trailsEnabled && adj < 12) filter = `blur(${Math.max(0, (1 - adj / 12) * 4)}px)`;
      break;
    }
    case 'slide-right': {
      const s = spring({ frame: adj, fps, config: { damping: 14, stiffness: 80, mass: 0.8 } });
      opacity = interpolate(adj, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
      const x = interpolate(s, [0, 1], [800, 0]);
      transform = `translate(calc(${tx} + ${x}px), calc(-50% + ${line.offsetY}px))`;
      if (trailsEnabled && adj < 12) filter = `blur(${Math.max(0, (1 - adj / 12) * 4)}px)`;
      break;
    }
    case 'drop': {
      const s = spring({ frame: adj, fps, config: { damping: 10, stiffness: 120, mass: 0.7 } });
      opacity = interpolate(adj, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
      const y = interpolate(s, [0, 1], [-400, 0]);
      transform = `translate(${tx}, calc(-50% + ${line.offsetY + y}px))`;
      break;
    }
    case 'rise': {
      const s = spring({ frame: adj, fps, config: { damping: 14, stiffness: 80, mass: 0.9 } });
      opacity = interpolate(adj, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
      const y = interpolate(s, [0, 1], [300, 0]);
      transform = `translate(${tx}, calc(-50% + ${line.offsetY + y}px))`;
      break;
    }
    case 'zoom': {
      const s = spring({ frame: adj, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } });
      opacity = interpolate(adj, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
      const scale = interpolate(s, [0, 1], [0, 1]);
      transform = `translate(${tx}, calc(-50% + ${line.offsetY}px)) scale(${scale})`;
      break;
    }
    case 'spin': {
      const s = spring({ frame: adj, fps, config: { damping: 12, stiffness: 80, mass: 0.7 } });
      opacity = interpolate(adj, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
      const rot = interpolate(s, [0, 1], [-180, 0]);
      const scale = interpolate(s, [0, 1], [0.5, 1]);
      transform = `translate(${tx}, calc(-50% + ${line.offsetY}px)) rotate(${rot}deg) scale(${scale})`;
      break;
    }
    case 'bounce': {
      const s = spring({ frame: adj, fps, config: { damping: 6, stiffness: 200, mass: 0.4 } });
      opacity = interpolate(adj, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
      const y = interpolate(s, [0, 1], [100, 0]);
      transform = `translate(${tx}, calc(-50% + ${line.offsetY + y}px)) scale(${0.8 + s * 0.2})`;
      break;
    }
    case 'split': {
      opacity = interpolate(adj, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
      const s = spring({ frame: adj, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } });
      transform = `translate(${tx}, calc(-50% + ${line.offsetY}px)) scaleX(${0.5 + s * 0.5})`;
      break;
    }
    case 'typewriter': {
      opacity = interpolate(adj, [0, 3], [0, 1], { extrapolateRight: 'clamp' });
      transform = `translate(${tx}, calc(-50% + ${line.offsetY}px))`;
      break;
    }
    default: {
      opacity = interpolate(adj, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
      transform = `translate(${tx}, calc(-50% + ${line.offsetY}px))`;
    }
  }

  // Exit animation (fade + scale out or slide away) — only if not last line
  if (!isLast && frame >= exitStart) {
    const exitProgress = interpolate(exitAdj, [0, exitFrames], [0, 1], { extrapolateRight: 'clamp' });
    opacity *= (1 - exitProgress);
    // Add slight upward drift on exit
    const exitY = -50 * exitProgress;
    const scaleOut = 1 - exitProgress * 0.3;
    transform = transform.replace(
      /calc\(-50% \+ ([-\d.]+)px\)/,
      (_, y) => `calc(-50% + ${parseFloat(y) + exitY}px)`
    );
    // Combine scale
    if (transform.includes('scale(')) {
      transform = transform.replace(/scale\(([^)]+)\)/, (_, s) => `scale(${parseFloat(s) * scaleOut})`);
    }
    filter = `blur(${exitProgress * 3}px)`;
  }

  // Typewriter: reveal chars progressively
  let displayText = line.text;
  if (line.entrance === 'typewriter') {
    const charsPerFrame = line.text.length / Math.min(20, line.hold * 0.5);
    const visibleChars = Math.min(line.text.length, Math.floor(adj * charsPerFrame));
    displayText = line.text.slice(0, visibleChars);
    // Blinking cursor
    const showCursor = visibleChars < line.text.length || (Math.floor(frame / 8) % 2 === 0 && adj < line.hold - 10);
    if (showCursor) displayText += '|';
  }

  return (
    <>
      {/* Flash effect for slam */}
      {flashEnabled && line.entrance === 'slam' && adj > 0 && adj < 6 && (
        <AbsoluteFill style={{
          background: 'white',
          opacity: interpolate(adj, [0, 1, 6], [0, 0.15, 0], { extrapolateRight: 'clamp' }),
        }} />
      )}
      <div style={{
        ...baseStyle,
        opacity,
        transform,
        filter: filter || undefined,
        textShadow: textShadow || undefined,
      }}>
        {displayText}
      </div>
    </>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export const KineticText: React.FC<KineticTextProps> = (rawProps) => {
  const p: KineticTextProps = {
    lines: rawProps?.lines?.length ? rawProps.lines : defaultKineticTextProps.lines,
    logoUrl: rawProps?.logoUrl ?? defaultKineticTextProps.logoUrl,
    logoPosition: rawProps?.logoPosition ?? defaultKineticTextProps.logoPosition,
    logoSize: rawProps?.logoSize ?? defaultKineticTextProps.logoSize,
    theme: { ...defaultKineticTextProps.theme, ...rawProps?.theme },
  };

  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const accent = p.theme.accentColor;
  const secondary = p.theme.secondaryAccent;

  const bgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Calculate start and end frame for each line
  const startFrames: number[] = [];
  const endFrames: number[] = [];
  let currentFrame = 0;
  for (let i = 0; i < p.lines.length; i++) {
    currentFrame += p.lines[i].delay;
    startFrames.push(currentFrame);
    currentFrame += p.lines[i].hold;
    endFrames.push(currentFrame);
  }

  // Find which line is currently active for accent bar
  const activeLine = startFrames.findIndex((s, i) => frame >= s && frame < endFrames[i]);

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 25, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut, overflow: 'hidden' }}>
      {/* BG */}
      <AbsoluteFill style={{
        opacity: bgOpacity,
        background: `radial-gradient(ellipse at 50% 50%, ${p.theme.bgGradient[0]} 0%, ${p.theme.bgGradient[1]} 50%, ${p.theme.bgGradient[2]} 100%)`,
      }} />

      {/* Particles */}
      {p.theme.particlesEnabled && <DustParticles accent={accent} />}

      {/* Vignette */}
      {p.theme.vignetteEnabled && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.9) 100%)',
        }} />
      )}

      {/* Accent bar */}
      <AccentBar accent={accent} frame={frame} isActive={activeLine >= 0} />

      {/* Lines — each has entrance AND exit */}
      {p.lines.map((line, i) => (
        <KineticWord
          key={i}
          line={line}
          startFrame={startFrames[i]}
          endFrame={endFrames[i]}
          accentColor={accent}
          secondaryAccent={secondary}
          flashEnabled={p.theme.flashEnabled}
          trailsEnabled={p.theme.trailsEnabled}
          isLast={i === p.lines.length - 1}
        />
      ))}

      {/* Logo */}
      {p.logoUrl && (
        <Logo
          src={p.logoUrl}
          position={p.logoPosition}
          size={p.logoSize}
          delay={5}
          padding={50}
        />
      )}
    </AbsoluteFill>
  );
};
