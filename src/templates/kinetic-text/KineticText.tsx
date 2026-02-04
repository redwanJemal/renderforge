import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

// ══════════════════════════════════════════════════════════════
// KINETIC TYPOGRAPHY — Words as visual art
// Each word/phrase gets its own dramatic entrance
// ══════════════════════════════════════════════════════════════

export type WordEntrance =
  | 'slam'        // scales from huge to normal with bounce
  | 'slide-left'  // slides in from left
  | 'slide-right' // slides in from right
  | 'drop'        // drops from above
  | 'rise'        // rises from below
  | 'zoom'        // zooms from center
  | 'spin'        // rotates in
  | 'fade'        // simple fade
  | 'split'       // chars split outward then snap in
  | 'bounce';     // bouncy spring entrance

export interface KineticLine {
  text: string;
  size: number;         // font size
  weight: number;       // font weight (100-900)
  entrance: WordEntrance;
  color: string;        // 'accent', 'white', 'muted', or hex
  uppercase: boolean;
  letterSpacing: number; // em
  italic: boolean;
  delay: number;        // frames after previous line
  hold: number;         // frames to hold before next
  align: 'left' | 'center' | 'right';
  offsetY: number;      // vertical offset from center (px)
}

export interface KineticTextProps {
  lines: KineticLine[];

  // Theme
  theme: {
    accentColor: string;
    secondaryAccent: string;
    bgGradient: [string, string, string];
    particlesEnabled: boolean;
    flashEnabled: boolean;      // white flash on slam
    trailsEnabled: boolean;     // motion blur trails
    vignetteEnabled: boolean;
  };
}

// ── Defaults ─────────────────────────────────────────────────
export const defaultKineticTextProps: KineticTextProps = {
  lines: [
    {
      text: 'STOP',
      size: 140,
      weight: 900,
      entrance: 'slam' as WordEntrance,
      color: 'white',
      uppercase: true,
      letterSpacing: 0.15,
      italic: false,
      delay: 20,
      hold: 25,
      align: 'center' as const,
      offsetY: -80,
    },
    {
      text: 'scrolling.',
      size: 90,
      weight: 300,
      entrance: 'slide-right' as WordEntrance,
      color: 'muted',
      uppercase: false,
      letterSpacing: 0.05,
      italic: true,
      delay: 8,
      hold: 30,
      align: 'center' as const,
      offsetY: 30,
    },
    {
      text: 'THIS',
      size: 120,
      weight: 900,
      entrance: 'zoom' as WordEntrance,
      color: 'accent',
      uppercase: true,
      letterSpacing: 0.3,
      italic: false,
      delay: 15,
      hold: 20,
      align: 'center' as const,
      offsetY: -60,
    },
    {
      text: 'changes everything.',
      size: 64,
      weight: 400,
      entrance: 'rise' as WordEntrance,
      color: 'white',
      uppercase: false,
      letterSpacing: 0.08,
      italic: false,
      delay: 10,
      hold: 35,
      align: 'center' as const,
      offsetY: 50,
    },
    {
      text: 'WATCH NOW',
      size: 48,
      weight: 700,
      entrance: 'bounce' as WordEntrance,
      color: 'accent',
      uppercase: true,
      letterSpacing: 0.25,
      italic: false,
      delay: 25,
      hold: 60,
      align: 'center' as const,
      offsetY: 160,
    },
  ],
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

// ══════════════════════════════════════════════════════════════
// WORD COMPONENT
// ══════════════════════════════════════════════════════════════

const KineticWord: React.FC<{
  line: KineticLine;
  startFrame: number;
  accentColor: string;
  secondaryAccent: string;
  flashEnabled: boolean;
  trailsEnabled: boolean;
}> = ({ line, startFrame, accentColor, secondaryAccent, flashEnabled, trailsEnabled }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adj = Math.max(0, frame - startFrame);

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
    transform: 'translate(-50%, -50%)', // will be overridden
  };

  // Animation based on entrance type
  let opacity = 0;
  let transform = '';
  let filter = '';
  let textShadow = '';

  const entranceSpeed = 15; // frames for entrance

  switch (line.entrance) {
    case 'slam': {
      const s = spring({ frame: adj, fps, config: { damping: 8, stiffness: 150, mass: 0.6 } });
      opacity = interpolate(adj, [0, 3], [0, 1], { extrapolateRight: 'clamp' });
      const scale = interpolate(s, [0, 1], [5, 1]);
      const tx = line.align === 'center' ? '-50%' : '0%';
      transform = `translate(${tx}, calc(-50% + ${line.offsetY}px)) scale(${scale})`;
      // Impact glow
      if (adj < 8 && adj > 0) {
        textShadow = `0 0 ${60 * (1 - adj / 8)}px ${resolvedColor}`;
      }
      break;
    }
    case 'slide-left': {
      const s = spring({ frame: adj, fps, config: { damping: 14, stiffness: 80, mass: 0.8 } });
      opacity = interpolate(adj, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
      const x = interpolate(s, [0, 1], [-800, 0]);
      const tx = line.align === 'center' ? `calc(-50% + ${x}px)` : `${x}px`;
      transform = `translate(${tx}, calc(-50% + ${line.offsetY}px))`;
      if (trailsEnabled && adj < 12) {
        filter = `blur(${Math.max(0, (1 - adj / 12) * 4)}px)`;
      }
      break;
    }
    case 'slide-right': {
      const s = spring({ frame: adj, fps, config: { damping: 14, stiffness: 80, mass: 0.8 } });
      opacity = interpolate(adj, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
      const x = interpolate(s, [0, 1], [800, 0]);
      const tx = line.align === 'center' ? `calc(-50% + ${x}px)` : `${x}px`;
      transform = `translate(${tx}, calc(-50% + ${line.offsetY}px))`;
      if (trailsEnabled && adj < 12) {
        filter = `blur(${Math.max(0, (1 - adj / 12) * 4)}px)`;
      }
      break;
    }
    case 'drop': {
      const s = spring({ frame: adj, fps, config: { damping: 10, stiffness: 120, mass: 0.7 } });
      opacity = interpolate(adj, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
      const y = interpolate(s, [0, 1], [-400, 0]);
      const tx = line.align === 'center' ? '-50%' : '0%';
      transform = `translate(${tx}, calc(-50% + ${line.offsetY + y}px))`;
      break;
    }
    case 'rise': {
      const s = spring({ frame: adj, fps, config: { damping: 14, stiffness: 80, mass: 0.9 } });
      opacity = interpolate(adj, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
      const y = interpolate(s, [0, 1], [300, 0]);
      const tx = line.align === 'center' ? '-50%' : '0%';
      transform = `translate(${tx}, calc(-50% + ${line.offsetY + y}px))`;
      break;
    }
    case 'zoom': {
      const s = spring({ frame: adj, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } });
      opacity = interpolate(adj, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
      const scale = interpolate(s, [0, 1], [0, 1]);
      const tx = line.align === 'center' ? '-50%' : '0%';
      transform = `translate(${tx}, calc(-50% + ${line.offsetY}px)) scale(${scale})`;
      break;
    }
    case 'spin': {
      const s = spring({ frame: adj, fps, config: { damping: 12, stiffness: 80, mass: 0.7 } });
      opacity = interpolate(adj, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
      const rot = interpolate(s, [0, 1], [-180, 0]);
      const scale = interpolate(s, [0, 1], [0.5, 1]);
      const tx = line.align === 'center' ? '-50%' : '0%';
      transform = `translate(${tx}, calc(-50% + ${line.offsetY}px)) rotate(${rot}deg) scale(${scale})`;
      break;
    }
    case 'bounce': {
      const s = spring({ frame: adj, fps, config: { damping: 6, stiffness: 200, mass: 0.4 } });
      opacity = interpolate(adj, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
      const y = interpolate(s, [0, 1], [100, 0]);
      const tx = line.align === 'center' ? '-50%' : '0%';
      transform = `translate(${tx}, calc(-50% + ${line.offsetY + y}px)) scale(${0.8 + s * 0.2})`;
      break;
    }
    case 'split': {
      opacity = interpolate(adj, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
      const s = spring({ frame: adj, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } });
      const tx = line.align === 'center' ? '-50%' : '0%';
      transform = `translate(${tx}, calc(-50% + ${line.offsetY}px)) scaleX(${0.5 + s * 0.5})`;
      break;
    }
    default: {
      opacity = interpolate(adj, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
      const tx = line.align === 'center' ? '-50%' : '0%';
      transform = `translate(${tx}, calc(-50% + ${line.offsetY}px))`;
    }
  }

  if (adj <= 0) return null;

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
        {line.text}
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
    theme: { ...defaultKineticTextProps.theme, ...rawProps?.theme },
  };

  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const accent = p.theme.accentColor;
  const secondary = p.theme.secondaryAccent;

  const bgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Calculate start frame for each line
  const startFrames: number[] = [];
  let currentFrame = 0;
  for (let i = 0; i < p.lines.length; i++) {
    currentFrame += p.lines[i].delay;
    startFrames.push(currentFrame);
    currentFrame += p.lines[i].hold;
  }

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

      {/* Lines */}
      {p.lines.map((line, i) => (
        <KineticWord
          key={i}
          line={line}
          startFrame={startFrames[i]}
          accentColor={accent}
          secondaryAccent={secondary}
          flashEnabled={p.theme.flashEnabled}
          trailsEnabled={p.theme.trailsEnabled}
        />
      ))}
    </AbsoluteFill>
  );
};
