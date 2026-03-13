import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { Logo } from '../../components/Logo';

// ══════════════════════════════════════════════════════════════
// NEON GLOW — Neon sign that flickers to life
// Text appears like a neon tube being powered on with glow,
// buzzing, and atmospheric dark background
// ══════════════════════════════════════════════════════════════

export interface NeonLine {
  text: string;
  size: number;
  weight: number;
  neonColor: string;     // glow color
  textColor: string;     // text fill color (usually white or near-white)
  startFrame: number;
  duration: number;
  flickerPattern: number[]; // normalized frames where flicker happens (0-1 within entrance)
  glowRadius: number;     // px
  align: 'left' | 'center' | 'right';
  offsetY: number;
  strokeOnly: boolean;    // outline-only neon style
}

export interface NeonGlowProps {
  lines: NeonLine[];
  logoUrl: string;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoSize: number;
  theme: {
    bgColor: string;
    wallTexture: boolean;      // faux brick pattern
    ambientGlow: boolean;      // glow reflects on background
    smokeEnabled: boolean;
    borderGlow: boolean;
  };
}

export const defaultNeonGlowProps: NeonGlowProps = {
  lines: [
    {
      text: 'OPEN',
      size: 160,
      weight: 700,
      neonColor: '#ff2d55',
      textColor: '#ffffff',
      startFrame: 15,
      duration: 60,
      flickerPattern: [0.1, 0.25, 0.4, 0.6],
      glowRadius: 40,
      align: 'center',
      offsetY: -200,
      strokeOnly: false,
    },
    {
      text: 'YOUR',
      size: 90,
      weight: 400,
      neonColor: '#00d4ff',
      textColor: '#e0f7ff',
      startFrame: 70,
      duration: 50,
      flickerPattern: [0.2, 0.5],
      glowRadius: 25,
      align: 'center',
      offsetY: -60,
      strokeOnly: true,
    },
    {
      text: 'MIND',
      size: 180,
      weight: 900,
      neonColor: '#a855f7',
      textColor: '#ffffff',
      startFrame: 115,
      duration: 60,
      flickerPattern: [0.15, 0.35, 0.55, 0.7],
      glowRadius: 50,
      align: 'center',
      offsetY: 80,
      strokeOnly: false,
    },
    {
      text: '✦ explore now ✦',
      size: 44,
      weight: 500,
      neonColor: '#ffcc00',
      textColor: '#fff8dc',
      startFrame: 195,
      duration: 120,
      flickerPattern: [0.3],
      glowRadius: 20,
      align: 'center',
      offsetY: 260,
      strokeOnly: false,
    },
  ],
  logoUrl: 'https://placehold.co/200x200/a855f7/ffffff?text=★',
  logoPosition: 'top-left',
  logoSize: 70,
  theme: {
    bgColor: '#0d0d0d',
    wallTexture: true,
    ambientGlow: true,
    smokeEnabled: true,
    borderGlow: true,
  },
};

// ── Helpers ──────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Faux brick wall background
const BrickWall: React.FC = () => (
  <AbsoluteFill style={{
    backgroundImage: `
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 95px,
        rgba(255,255,255,0.03) 95px,
        rgba(255,255,255,0.03) 100px
      ),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 45px,
        rgba(255,255,255,0.03) 45px,
        rgba(255,255,255,0.03) 50px
      )
    `,
    opacity: 0.5,
  }} />
);

// Smoke / fog drifting
const Smoke: React.FC = () => {
  const frame = useCurrentFrame();
  const clouds = Array.from({ length: 6 }, (_, i) => ({
    x: 15 + seededRandom(i * 7) * 70,
    y: 30 + seededRandom(i * 13) * 40,
    size: 200 + seededRandom(i * 3) * 300,
    drift: seededRandom(i * 17) * 0.3,
    opacity: 0.02 + seededRandom(i * 23) * 0.04,
  }));

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {clouds.map((c, i) => {
        const x = c.x + Math.sin(frame * 0.008 + i * 2) * 10;
        const y = c.y + Math.cos(frame * 0.005 + i) * 5;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: c.size,
            height: c.size * 0.5,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.8)',
            filter: `blur(${c.size * 0.4}px)`,
            opacity: c.opacity * (0.7 + Math.sin(frame * 0.02 + i) * 0.3),
            transform: 'translate(-50%, -50%)',
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// Neon word with power-on flicker effect
const NeonWord: React.FC<{
  line: NeonLine;
  ambientGlow: boolean;
}> = ({ line, ambientGlow }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adj = Math.max(0, frame - line.startFrame);
  const endFrame = line.startFrame + line.duration;

  if (frame < line.startFrame || frame > endFrame + 20) return null;

  const font = 'SF Pro Display, -apple-system, Helvetica Neue, sans-serif';

  // Power-on entrance: flicker pattern during first 20 frames
  const entranceDuration = 20;
  let flickerMult = 1;

  if (adj < entranceDuration) {
    const normalizedProgress = adj / entranceDuration;
    // Check if we're near a flicker point
    for (const fp of line.flickerPattern) {
      const dist = Math.abs(normalizedProgress - fp);
      if (dist < 0.08) {
        // Quick off-on-off
        const flickerPhase = (dist / 0.08);
        flickerMult = flickerPhase < 0.3 ? 0.1 : flickerPhase < 0.6 ? 0.8 : 0.2;
      }
    }
    // Overall fade in
    flickerMult *= interpolate(adj, [0, entranceDuration], [0.3, 1], { extrapolateRight: 'clamp' });
  }

  // Subtle ongoing buzz (tiny random fluctuation)
  const buzzSeed = frame * 7 + line.startFrame;
  const buzz = 0.95 + seededRandom(buzzSeed) * 0.05;
  flickerMult *= buzz;

  // Exit
  const exitAdj = Math.max(0, frame - endFrame);
  const exitOpacity = exitAdj > 0 ? interpolate(exitAdj, [0, 20], [1, 0], { extrapolateRight: 'clamp' }) : 1;

  const opacity = flickerMult * exitOpacity;

  const enter = spring({
    frame: adj,
    fps,
    config: { damping: 15, stiffness: 80, mass: 0.6 },
  });

  const tx = line.align === 'center' ? '-50%' : '0%';
  const scale = interpolate(enter, [0, 1], [0.95, 1]);

  const glowLayers = [
    `0 0 ${line.glowRadius * 0.3}px ${line.neonColor}`,
    `0 0 ${line.glowRadius * 0.6}px ${line.neonColor}80`,
    `0 0 ${line.glowRadius}px ${line.neonColor}40`,
    `0 0 ${line.glowRadius * 1.5}px ${line.neonColor}20`,
  ].join(', ');

  const baseStyle: React.CSSProperties = {
    fontSize: line.size,
    fontWeight: line.weight,
    fontFamily: font,
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    position: 'absolute',
    left: line.align === 'center' ? '50%' : line.align === 'left' ? '60px' : undefined,
    right: line.align === 'right' ? '60px' : undefined,
    top: '50%',
    transform: `translate(${tx}, calc(-50% + ${line.offsetY}px)) scale(${scale})`,
    opacity,
  };

  return (
    <>
      {/* Ambient glow on wall */}
      {ambientGlow && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: `calc(50% + ${line.offsetY}px)`,
          width: line.size * line.text.length * 0.4,
          height: line.size * 2,
          borderRadius: '50%',
          background: line.neonColor,
          filter: `blur(${line.glowRadius * 3}px)`,
          opacity: opacity * 0.08,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />
      )}

      {line.strokeOnly ? (
        // Outline-only neon
        <div style={{
          ...baseStyle,
          color: 'transparent',
          WebkitTextStroke: `2px ${line.textColor}`,
          textShadow: glowLayers,
        }}>
          {line.text}
        </div>
      ) : (
        // Filled neon
        <div style={{
          ...baseStyle,
          color: line.textColor,
          textShadow: glowLayers,
        }}>
          {line.text}
        </div>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

export const NeonGlow: React.FC<NeonGlowProps> = (rawProps) => {
  const p: NeonGlowProps = {
    lines: rawProps?.lines?.length ? rawProps.lines : defaultNeonGlowProps.lines,
    logoUrl: rawProps?.logoUrl ?? defaultNeonGlowProps.logoUrl,
    logoPosition: rawProps?.logoPosition ?? defaultNeonGlowProps.logoPosition,
    logoSize: rawProps?.logoSize ?? defaultNeonGlowProps.logoSize,
    theme: { ...defaultNeonGlowProps.theme, ...rawProps?.theme },
  };

  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{
      backgroundColor: p.theme.bgColor,
      opacity: fadeOut,
      overflow: 'hidden',
    }}>
      {/* Brick wall texture */}
      {p.theme.wallTexture && <BrickWall />}

      {/* Smoke */}
      {p.theme.smokeEnabled && <Smoke />}

      {/* Border glow (neon strip at edges) */}
      {p.theme.borderGlow && (
        <>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${p.lines[0]?.neonColor || '#ff2d55'}60, transparent)`,
            boxShadow: `0 0 20px ${p.lines[0]?.neonColor || '#ff2d55'}40`,
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${p.lines[p.lines.length - 1]?.neonColor || '#a855f7'}60, transparent)`,
            boxShadow: `0 0 20px ${p.lines[p.lines.length - 1]?.neonColor || '#a855f7'}40`,
          }} />
        </>
      )}

      {/* Neon lines */}
      {p.lines.map((line, i) => (
        <NeonWord
          key={i}
          line={line}
          ambientGlow={p.theme.ambientGlow}
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
