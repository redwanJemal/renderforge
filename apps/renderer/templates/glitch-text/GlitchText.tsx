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
// GLITCH TEXT — Cyberpunk distortion effect
// Text appears with RGB split, scan lines, and digital noise
// ══════════════════════════════════════════════════════════════

export interface GlitchLine {
  text: string;
  size: number;
  weight: number;
  color: string;
  uppercase: boolean;
  startFrame: number;
  duration: number;      // how long on screen
  glitchIntensity: number; // 0-1
  align: 'left' | 'center' | 'right';
  offsetY: number;
}

export interface GlitchTextProps {
  lines: GlitchLine[];
  logoUrl: string;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoSize: number;
  theme: {
    primaryColor: string;
    cyanSplit: string;
    magentaSplit: string;
    bgColor: string;
    scanLinesEnabled: boolean;
    noiseEnabled: boolean;
    flickerEnabled: boolean;
  };
}

export const defaultGlitchTextProps: GlitchTextProps = {
  lines: [
    {
      text: 'BREAKING',
      size: 130,
      weight: 900,
      color: '#ffffff',
      uppercase: true,
      startFrame: 10,
      duration: 50,
      glitchIntensity: 0.8,
      align: 'center',
      offsetY: -120,
    },
    {
      text: 'THE',
      size: 80,
      weight: 300,
      color: '#00ffff',
      uppercase: true,
      startFrame: 55,
      duration: 35,
      glitchIntensity: 0.4,
      align: 'center',
      offsetY: 0,
    },
    {
      text: 'SYSTEM',
      size: 150,
      weight: 900,
      color: '#ff00ff',
      uppercase: true,
      startFrame: 85,
      duration: 55,
      glitchIntensity: 1.0,
      align: 'center',
      offsetY: 0,
    },
    {
      text: '// ERROR 404',
      size: 42,
      weight: 400,
      color: '#00ff41',
      uppercase: false,
      startFrame: 145,
      duration: 40,
      glitchIntensity: 0.3,
      align: 'center',
      offsetY: 80,
    },
    {
      text: 'REALITY.EXE',
      size: 70,
      weight: 700,
      color: '#ffffff',
      uppercase: true,
      startFrame: 190,
      duration: 45,
      glitchIntensity: 0.6,
      align: 'center',
      offsetY: -40,
    },
    {
      text: 'has crashed.',
      size: 55,
      weight: 300,
      color: '#ff3366',
      uppercase: false,
      startFrame: 220,
      duration: 50,
      glitchIntensity: 0.5,
      align: 'center',
      offsetY: 50,
    },
    {
      text: '▸ REBOOT NOW',
      size: 48,
      weight: 700,
      color: '#00ffff',
      uppercase: true,
      startFrame: 290,
      duration: 90,
      glitchIntensity: 0.2,
      align: 'center',
      offsetY: 0,
    },
  ],
  logoUrl: 'https://placehold.co/200x200/00ffff/000000?text=⚡',
  logoPosition: 'top-right',
  logoSize: 70,
  theme: {
    primaryColor: '#ffffff',
    cyanSplit: '#00ffff',
    magentaSplit: '#ff00ff',
    bgColor: '#0a0a0a',
    scanLinesEnabled: true,
    noiseEnabled: true,
    flickerEnabled: true,
  },
};

// ── Helpers ──────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Scan lines overlay
const ScanLines: React.FC = () => (
  <AbsoluteFill style={{
    background: `repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.15) 2px,
      rgba(0,0,0,0.15) 4px
    )`,
    pointerEvents: 'none',
    zIndex: 20,
  }} />
);

// Noise overlay
const Noise: React.FC = () => {
  const frame = useCurrentFrame();
  // Shift noise pattern each frame
  const offset = (frame * 7) % 100;
  return (
    <AbsoluteFill style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='${frame}' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
      backgroundPosition: `${offset}px ${offset}px`,
      pointerEvents: 'none',
      zIndex: 21,
      mixBlendMode: 'overlay',
    }} />
  );
};

// Glitch word with RGB split
const GlitchWord: React.FC<{
  line: GlitchLine;
  theme: GlitchTextProps['theme'];
}> = ({ line, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adj = Math.max(0, frame - line.startFrame);
  const endFrame = line.startFrame + line.duration;

  if (frame < line.startFrame || frame > endFrame + 15) return null;

  const font = 'SF Pro Display, -apple-system, monospace';

  // Entrance spring
  const enter = spring({
    frame: adj,
    fps,
    config: { damping: 12, stiffness: 120, mass: 0.5 },
  });

  // Exit fade
  const exitAdj = Math.max(0, frame - endFrame);
  const exitOpacity = exitAdj > 0 ? interpolate(exitAdj, [0, 15], [1, 0], { extrapolateRight: 'clamp' }) : 1;

  // Entrance opacity
  const enterOpacity = interpolate(adj, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
  const opacity = enterOpacity * exitOpacity;

  // Glitch: random offset bursts
  const intensity = line.glitchIntensity;
  const glitchSeed = Math.floor(frame / 2) * 137 + line.startFrame;
  const isGlitching = seededRandom(glitchSeed) > (1 - intensity * 0.3);
  const glitchX = isGlitching ? (seededRandom(glitchSeed + 1) - 0.5) * 40 * intensity : 0;
  const glitchY = isGlitching ? (seededRandom(glitchSeed + 2) - 0.5) * 10 * intensity : 0;

  // RGB split offset
  const splitAmount = isGlitching ? intensity * 6 : intensity * 2;
  const baseSplitX = Math.sin(frame * 0.15) * splitAmount;

  // Clip glitch (random horizontal clip during glitch)
  const clipTop = isGlitching ? seededRandom(glitchSeed + 3) * 30 : 0;
  const clipBottom = isGlitching ? 100 - seededRandom(glitchSeed + 4) * 30 : 100;

  const tx = line.align === 'center' ? '-50%' : '0%';

  const baseStyle: React.CSSProperties = {
    fontSize: line.size,
    fontWeight: line.weight,
    fontFamily: font,
    textTransform: line.uppercase ? 'uppercase' : 'none',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    position: 'absolute',
    left: line.align === 'center' ? '50%' : line.align === 'left' ? '60px' : undefined,
    right: line.align === 'right' ? '60px' : undefined,
    top: '50%',
  };

  // Flicker
  const flickerOpacity = theme.flickerEnabled && isGlitching
    ? 0.85 + seededRandom(glitchSeed + 5) * 0.15
    : 1;

  const scale = interpolate(enter, [0, 1], [0.9, 1]);

  return (
    <>
      {/* Cyan layer (offset left) */}
      <div style={{
        ...baseStyle,
        color: theme.cyanSplit,
        opacity: opacity * 0.5 * flickerOpacity,
        transform: `translate(calc(${tx} + ${glitchX - baseSplitX}px), calc(-50% + ${line.offsetY + glitchY}px)) scale(${scale})`,
        mixBlendMode: 'screen',
        clipPath: isGlitching ? `inset(${clipTop}% 0 ${100 - clipBottom}% 0)` : undefined,
      }}>
        {line.text}
      </div>

      {/* Magenta layer (offset right) */}
      <div style={{
        ...baseStyle,
        color: theme.magentaSplit,
        opacity: opacity * 0.5 * flickerOpacity,
        transform: `translate(calc(${tx} + ${glitchX + baseSplitX}px), calc(-50% + ${line.offsetY + glitchY}px)) scale(${scale})`,
        mixBlendMode: 'screen',
      }}>
        {line.text}
      </div>

      {/* Main text layer */}
      <div style={{
        ...baseStyle,
        color: line.color,
        opacity: opacity * flickerOpacity,
        transform: `translate(calc(${tx} + ${glitchX}px), calc(-50% + ${line.offsetY + glitchY}px)) scale(${scale})`,
        textShadow: `0 0 20px ${line.color}40`,
      }}>
        {line.text}
      </div>

      {/* Glitch slice — random horizontal band shift */}
      {isGlitching && (
        <div style={{
          ...baseStyle,
          color: line.color,
          opacity: opacity * 0.6,
          transform: `translate(calc(${tx} + ${glitchX + (seededRandom(glitchSeed + 6) - 0.5) * 60}px), calc(-50% + ${line.offsetY}px)) scale(${scale})`,
          clipPath: `inset(${40 + seededRandom(glitchSeed + 7) * 20}% 0 ${20 + seededRandom(glitchSeed + 8) * 20}% 0)`,
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

export const GlitchText: React.FC<GlitchTextProps> = (rawProps) => {
  const p: GlitchTextProps = {
    lines: rawProps?.lines?.length ? rawProps.lines : defaultGlitchTextProps.lines,
    logoUrl: rawProps?.logoUrl ?? defaultGlitchTextProps.logoUrl,
    logoPosition: rawProps?.logoPosition ?? defaultGlitchTextProps.logoPosition,
    logoSize: rawProps?.logoSize ?? defaultGlitchTextProps.logoSize,
    theme: { ...defaultGlitchTextProps.theme, ...rawProps?.theme },
  };

  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Screen flicker
  const flickerSeed = Math.floor(frame / 3) * 31;
  const screenFlicker = p.theme.flickerEnabled && seededRandom(flickerSeed) > 0.92
    ? 0.92
    : 1;

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Horizontal glitch bars in background
  const bgGlitchBars = Array.from({ length: 3 }, (_, i) => {
    const seed = Math.floor(frame / 4) * 17 + i * 53;
    const active = seededRandom(seed) > 0.85;
    if (!active) return null;
    const top = seededRandom(seed + 1) * 100;
    const height = 2 + seededRandom(seed + 2) * 8;
    const shift = (seededRandom(seed + 3) - 0.5) * 40;
    return (
      <div key={i} style={{
        position: 'absolute',
        top: `${top}%`,
        left: shift,
        right: -shift,
        height,
        background: `linear-gradient(90deg, ${p.theme.cyanSplit}15, ${p.theme.magentaSplit}20, transparent)`,
        zIndex: 5,
      }} />
    );
  });

  return (
    <AbsoluteFill style={{
      backgroundColor: p.theme.bgColor,
      opacity: fadeOut * screenFlicker,
      overflow: 'hidden',
    }}>
      {/* Grid overlay */}
      <AbsoluteFill style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Background glitch bars */}
      {bgGlitchBars}

      {/* Scan lines */}
      {p.theme.scanLinesEnabled && <ScanLines />}

      {/* Noise */}
      {p.theme.noiseEnabled && <Noise />}

      {/* Glitch lines */}
      {p.lines.map((line, i) => (
        <GlitchWord key={i} line={line} theme={p.theme} />
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

      {/* Bottom accent line */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${p.theme.cyanSplit}, ${p.theme.magentaSplit})`,
        opacity: 0.6,
      }} />
    </AbsoluteFill>
  );
};
