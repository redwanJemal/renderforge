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
// GOLD REVEAL — Premium UAE/luxury announcement
// Text revealed line by line with gold foil mask effect
// Perfect for: grand openings, VIP events, luxury brands
// ══════════════════════════════════════════════════════════════

export interface GoldRevealLine {
  text: string;
  size: number;
  weight: number;
  isGold: boolean;        // Gold color vs white
  isArabic: boolean;      // RTL
  letterSpacing: number;  // em
  delay: number;          // frames after previous
  hold: number;           // how long visible
  uppercase: boolean;
}

export interface GoldRevealProps {
  lines: GoldRevealLine[];
  logoUrl: string;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoSize: number;
  theme: {
    goldPrimary: string;
    goldSecondary: string;
    goldDark: string;
    bgColor: string;
    textColor: string;
    revealDirection: 'left' | 'right' | 'center';
    particlesEnabled: boolean;
    ornateEnabled: boolean;
  };
}

export const defaultGoldRevealProps: GoldRevealProps = {
  lines: [
    {
      text: 'بكل فخر نعلن',
      size: 50,
      weight: 400,
      isGold: true,
      isArabic: true,
      letterSpacing: 0.1,
      delay: 15,
      hold: 50,
      uppercase: false,
    },
    {
      text: 'GRAND',
      size: 140,
      weight: 900,
      isGold: true,
      isArabic: false,
      letterSpacing: 0.25,
      delay: 10,
      hold: 40,
      uppercase: true,
    },
    {
      text: 'OPENING',
      size: 120,
      weight: 300,
      isGold: false,
      isArabic: false,
      letterSpacing: 0.4,
      delay: 8,
      hold: 40,
      uppercase: true,
    },
    {
      text: 'DUBAI MALL',
      size: 60,
      weight: 700,
      isGold: true,
      isArabic: false,
      letterSpacing: 0.3,
      delay: 20,
      hold: 50,
      uppercase: true,
    },
    {
      text: 'FEBRUARY 15, 2025',
      size: 34,
      weight: 500,
      isGold: false,
      isArabic: false,
      letterSpacing: 0.2,
      delay: 15,
      hold: 80,
      uppercase: true,
    },
  ],
  logoUrl: 'https://placehold.co/200x200/c4a43e/000000?text=★',
  logoPosition: 'top-right',
  logoSize: 70,
  theme: {
    goldPrimary: '#c4a43e',
    goldSecondary: '#e8d48b',
    goldDark: '#8b7225',
    bgColor: '#060606',
    textColor: '#ffffff',
    revealDirection: 'center',
    particlesEnabled: true,
    ornateEnabled: true,
  },
};

// ── Helpers ──────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Gold particles that rise
const GoldParticles: React.FC<{ gold: string; goldLight: string }> = ({ gold, goldLight }) => {
  const frame = useCurrentFrame();
  const particles = Array.from({ length: 30 }, (_, i) => ({
    x: seededRandom(i * 7) * 100,
    y: seededRandom(i * 13) * 100,
    size: 1 + seededRandom(i * 3) * 2.5,
    speed: 0.2 + seededRandom(i * 17) * 0.6,
    shimmerPhase: seededRandom(i * 23) * Math.PI * 2,
    opacity: 0.05 + seededRandom(i * 29) * 0.1,
  }));

  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        const x = p.x + Math.sin(frame * 0.01 + i * 0.7) * 3;
        const y = ((p.y - frame * p.speed * 0.08) % 110 + 110) % 110 - 5;
        const shimmer = Math.sin(frame * 0.07 + p.shimmerPhase) * 0.5 + 0.5;
        return (
          <div key={i} style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            background: i % 3 === 0 ? goldLight : gold,
            opacity: p.opacity * shimmer,
            boxShadow: `0 0 ${p.size * 2}px ${gold}30`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// Gold reveal word with mask animation
const GoldRevealWord: React.FC<{
  line: GoldRevealLine;
  startFrame: number;
  endFrame: number;
  isLast: boolean;
  theme: GoldRevealProps['theme'];
}> = ({ line, startFrame, endFrame, isLast, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adj = Math.max(0, frame - startFrame);

  if (frame < startFrame || (!isLast && frame > endFrame + 15)) return null;

  const font = line.isArabic
    ? 'SF Pro Display, -apple-system, sans-serif'
    : 'SF Pro Display, -apple-system, Helvetica Neue, sans-serif';

  // Reveal animation — gold bar slides across
  const revealDuration = 18;
  const revealProgress = interpolate(adj, [0, revealDuration], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Text opacity (follows behind the reveal bar)
  const textOpacity = interpolate(adj, [3, revealDuration + 5], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Exit
  const exitDuration = 12;
  const exitStart = endFrame - startFrame - exitDuration;
  let exitOpacity = 1;
  if (!isLast && adj > exitStart) {
    exitOpacity = interpolate(adj, [exitStart, exitStart + exitDuration], [1, 0], {
      extrapolateRight: 'clamp',
    });
  }

  // Gold bar position
  let barX = '0%';
  if (theme.revealDirection === 'left') {
    barX = `${interpolate(revealProgress, [0, 1], [-100, 100])}%`;
  } else if (theme.revealDirection === 'right') {
    barX = `${interpolate(revealProgress, [0, 1], [100, -100])}%`;
  } else {
    // Center: expand from center
    barX = '0%';
  }

  const goldGradient = `linear-gradient(135deg, ${theme.goldDark}, ${theme.goldPrimary}, ${theme.goldSecondary}, ${theme.goldPrimary}, ${theme.goldDark})`;

  const textColor = line.isGold ? theme.goldPrimary : theme.textColor;

  // Subtle glow for gold text
  const textShadow = line.isGold
    ? `0 0 30px ${theme.goldPrimary}30`
    : 'none';

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      opacity: exitOpacity,
      direction: line.isArabic ? 'rtl' : 'ltr',
      marginBottom: 8,
    }}>
      {/* Reveal bar */}
      {revealProgress > 0 && revealProgress < 1 && (
        <div style={{
          position: 'absolute',
          top: 0, bottom: 0,
          left: theme.revealDirection === 'center' ? '50%' : 0,
          width: theme.revealDirection === 'center'
            ? `${revealProgress * 100}%`
            : '8px',
          transform: theme.revealDirection === 'center'
            ? 'translateX(-50%)'
            : `translateX(${barX})`,
          background: goldGradient,
          zIndex: 2,
          boxShadow: `0 0 20px ${theme.goldPrimary}60`,
        }} />
      )}

      {/* Text */}
      <div style={{
        fontFamily: font,
        fontSize: line.size,
        fontWeight: line.weight,
        color: textColor,
        letterSpacing: `${line.letterSpacing}em`,
        textTransform: line.uppercase ? 'uppercase' : 'none',
        textAlign: 'center',
        lineHeight: 1.15,
        opacity: textOpacity,
        textShadow,
        whiteSpace: 'nowrap',
      }}>
        {line.text}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

export const GoldReveal: React.FC<GoldRevealProps> = (rawProps) => {
  const p: GoldRevealProps = {
    lines: rawProps?.lines?.length ? rawProps.lines : defaultGoldRevealProps.lines,
    logoUrl: rawProps?.logoUrl ?? defaultGoldRevealProps.logoUrl,
    logoPosition: rawProps?.logoPosition ?? defaultGoldRevealProps.logoPosition,
    logoSize: rawProps?.logoSize ?? defaultGoldRevealProps.logoSize,
    theme: { ...defaultGoldRevealProps.theme, ...rawProps?.theme },
  };

  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const gold = p.theme.goldPrimary;

  // Calculate start/end frames
  const startFrames: number[] = [];
  const endFrames: number[] = [];
  let currentFrame = 0;
  for (let i = 0; i < p.lines.length; i++) {
    currentFrame += p.lines[i].delay;
    startFrames.push(currentFrame);
    currentFrame += p.lines[i].hold;
    endFrames.push(currentFrame);
  }

  // Fade in/out
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - 25, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Ornate elements
  const ornateOpacity = interpolate(frame, [5, 25], [0, 0.4], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{
      backgroundColor: p.theme.bgColor,
      opacity: fadeIn * fadeOut,
      overflow: 'hidden',
    }}>
      {/* Subtle radial gradient */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 40%, ${gold}08, transparent 70%)`,
      }} />

      {/* Gold particles */}
      {p.theme.particlesEnabled && (
        <GoldParticles gold={gold} goldLight={p.theme.goldSecondary} />
      )}

      {/* Ornate borders */}
      {p.theme.ornateEnabled && (
        <>
          {/* Top ornate line */}
          <div style={{
            position: 'absolute', top: 80, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 20,
            opacity: ornateOpacity,
          }}>
            <div style={{ width: 80, height: 1, background: `linear-gradient(90deg, transparent, ${gold})` }} />
            <div style={{ width: 10, height: 10, background: gold, transform: 'rotate(45deg)' }} />
            <div style={{ width: 80, height: 1, background: `linear-gradient(90deg, ${gold}, transparent)` }} />
          </div>
          {/* Bottom ornate line */}
          <div style={{
            position: 'absolute', bottom: 80, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 20,
            opacity: ornateOpacity,
          }}>
            <div style={{ width: 80, height: 1, background: `linear-gradient(90deg, transparent, ${gold})` }} />
            <div style={{ width: 10, height: 10, background: gold, transform: 'rotate(45deg)' }} />
            <div style={{ width: 80, height: 1, background: `linear-gradient(90deg, ${gold}, transparent)` }} />
          </div>
        </>
      )}

      {/* Lines — centered content */}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 60px',
      }}>
        {p.lines.map((line, i) => (
          <GoldRevealWord
            key={i}
            line={line}
            startFrame={startFrames[i]}
            endFrame={endFrames[i]}
            isLast={i === p.lines.length - 1}
            theme={p.theme}
          />
        ))}
      </AbsoluteFill>

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

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
        pointerEvents: 'none',
      }} />
    </AbsoluteFill>
  );
};
