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
// PARALLAX LAYERS — Cinematic depth with layered text
// Text layers move at different speeds creating 3D depth
// Combined with gradient color shifts and blur depth of field
// ══════════════════════════════════════════════════════════════

export interface ParallaxText {
  text: string;
  size: number;
  weight: number;
  color: string;
  depth: number;          // 0 = foreground, 1 = background
  startFrame: number;
  duration: number;
  x: number;             // % from left
  y: number;             // % from top
  rotation: number;       // degrees
  uppercase: boolean;
}

export interface ParallaxLayersProps {
  texts: ParallaxText[];
  headline: string;
  headlineSize: number;
  subline: string;
  sublineSize: number;
  ctaText: string;
  logoUrl: string;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoSize: number;
  theme: {
    gradientColors: [string, string, string];
    gradientAngle: number;        // degrees
    gradientShift: boolean;       // animate gradient
    foregroundColor: string;
    midgroundColor: string;
    backgroundColor: string;
    depthBlur: boolean;
    floatingShapes: boolean;
  };
}

export const defaultParallaxLayersProps: ParallaxLayersProps = {
  texts: [
    { text: 'INNOVATE', size: 200, weight: 900, color: 'rgba(255,255,255,0.04)', depth: 1, startFrame: 0, duration: 400, x: 20, y: 25, rotation: -5, uppercase: true },
    { text: 'CREATE', size: 180, weight: 900, color: 'rgba(255,255,255,0.06)', depth: 0.8, startFrame: 0, duration: 400, x: 60, y: 70, rotation: 3, uppercase: true },
    { text: 'DESIGN', size: 160, weight: 900, color: 'rgba(255,255,255,0.05)', depth: 0.9, startFrame: 0, duration: 400, x: 10, y: 80, rotation: -8, uppercase: true },
    { text: '✦', size: 120, weight: 400, color: 'rgba(255,255,255,0.08)', depth: 0.6, startFrame: 0, duration: 400, x: 85, y: 20, rotation: 0, uppercase: false },
    { text: '◆', size: 80, weight: 400, color: 'rgba(255,255,255,0.06)', depth: 0.7, startFrame: 0, duration: 400, x: 75, y: 55, rotation: 45, uppercase: false },
  ],
  headline: 'THE FUTURE\nIS NOW',
  headlineSize: 100,
  subline: 'Premium design meets innovation',
  sublineSize: 36,
  ctaText: 'LEARN MORE →',
  logoUrl: 'https://placehold.co/200x200/6366f1/ffffff?text=▲',
  logoPosition: 'top-left',
  logoSize: 80,
  theme: {
    gradientColors: ['#1a0533', '#0f172a', '#0c0a1a'],
    gradientAngle: 135,
    gradientShift: true,
    foregroundColor: '#ffffff',
    midgroundColor: '#a78bfa',
    backgroundColor: '#4338ca',
    depthBlur: true,
    floatingShapes: true,
  },
};

// ── Helpers ──────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Floating geometric shapes
const FloatingShapes: React.FC<{
  midColor: string;
  bgColor: string;
}> = ({ midColor, bgColor }) => {
  const frame = useCurrentFrame();
  const shapes = Array.from({ length: 8 }, (_, i) => ({
    x: seededRandom(i * 7) * 100,
    y: seededRandom(i * 13) * 100,
    size: 20 + seededRandom(i * 3) * 60,
    type: i % 3, // 0 = circle, 1 = square, 2 = triangle
    speed: 0.5 + seededRandom(i * 17) * 1.5,
    depth: 0.3 + seededRandom(i * 23) * 0.7,
    opacity: 0.03 + seededRandom(i * 29) * 0.06,
  }));

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {shapes.map((s, i) => {
        const moveX = Math.sin(frame * 0.01 * s.speed + i) * 30 * s.depth;
        const moveY = Math.cos(frame * 0.008 * s.speed + i * 2) * 20 * s.depth;
        const rot = frame * 0.2 * s.speed;
        const blur = s.depth * 8;
        const color = s.depth > 0.5 ? bgColor : midColor;
        const borderRadius = s.type === 0 ? '50%' : s.type === 1 ? '4px' : '0';
        const clipPath = s.type === 2 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined;

        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${s.x + moveX * 0.1}%`,
            top: `${s.y + moveY * 0.1}%`,
            width: s.size,
            height: s.size,
            borderRadius,
            clipPath,
            border: `1px solid ${color}`,
            opacity: s.opacity,
            transform: `rotate(${rot}deg)`,
            filter: `blur(${blur}px)`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// Background text layer with parallax
const ParallaxWord: React.FC<{
  item: ParallaxText;
  scrollOffset: number; // camera scroll position
}> = ({ item, scrollOffset }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < item.startFrame || frame > item.startFrame + item.duration) return null;

  const adj = Math.max(0, frame - item.startFrame);
  const enter = spring({
    frame: adj,
    fps,
    config: { damping: 20, stiffness: 40, mass: 1 },
  });

  // Parallax: deeper items move slower
  const parallaxY = scrollOffset * (1 - item.depth) * 0.5;
  const parallaxX = scrollOffset * (1 - item.depth) * 0.2;
  const depthBlur = item.depth * 3;

  const opacity = interpolate(enter, [0, 1], [0, 1]);

  return (
    <div style={{
      position: 'absolute',
      left: `${item.x + parallaxX * 0.01}%`,
      top: `${item.y + parallaxY * 0.01}%`,
      fontSize: item.size,
      fontWeight: item.weight,
      fontFamily: 'SF Pro Display, -apple-system, Helvetica, sans-serif',
      color: item.color,
      textTransform: item.uppercase ? 'uppercase' : 'none',
      transform: `rotate(${item.rotation}deg) translateY(${-parallaxY}px)`,
      opacity,
      filter: `blur(${depthBlur}px)`,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      userSelect: 'none',
    }}>
      {item.text}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

export const ParallaxLayers: React.FC<ParallaxLayersProps> = (rawProps) => {
  const p: ParallaxLayersProps = {
    texts: rawProps?.texts?.length ? rawProps.texts : defaultParallaxLayersProps.texts,
    headline: rawProps?.headline ?? defaultParallaxLayersProps.headline,
    headlineSize: rawProps?.headlineSize ?? defaultParallaxLayersProps.headlineSize,
    subline: rawProps?.subline ?? defaultParallaxLayersProps.subline,
    sublineSize: rawProps?.sublineSize ?? defaultParallaxLayersProps.sublineSize,
    ctaText: rawProps?.ctaText ?? defaultParallaxLayersProps.ctaText,
    logoUrl: rawProps?.logoUrl ?? defaultParallaxLayersProps.logoUrl,
    logoPosition: rawProps?.logoPosition ?? defaultParallaxLayersProps.logoPosition,
    logoSize: rawProps?.logoSize ?? defaultParallaxLayersProps.logoSize,
    theme: { ...defaultParallaxLayersProps.theme, ...rawProps?.theme },
  };

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Smooth camera scroll
  const scrollOffset = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateRight: 'clamp' });

  // Gradient animation
  const gradientAngle = p.theme.gradientShift
    ? p.theme.gradientAngle + frame * 0.1
    : p.theme.gradientAngle;

  // Headline entrance
  const headlineDelay = 30;
  const headlineSpring = spring({
    frame: Math.max(0, frame - headlineDelay),
    fps,
    config: { damping: 14, stiffness: 60, mass: 0.8 },
  });
  const headlineOpacity = interpolate(frame, [headlineDelay, headlineDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const headlineY = interpolate(headlineSpring, [0, 1], [60, 0]);

  // Subline entrance
  const subDelay = 70;
  const subSpring = spring({
    frame: Math.max(0, frame - subDelay),
    fps,
    config: { damping: 16, stiffness: 50, mass: 0.8 },
  });
  const subOpacity = interpolate(frame, [subDelay, subDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // CTA entrance
  const ctaDelay = 120;
  const ctaSpring = spring({
    frame: Math.max(0, frame - ctaDelay),
    fps,
    config: { damping: 10, stiffness: 100, mass: 0.5 },
  });
  const ctaOpacity = interpolate(frame, [ctaDelay, ctaDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Decorative line
  const lineWidth = interpolate(headlineSpring, [0, 1], [0, 200]);

  return (
    <AbsoluteFill style={{
      opacity: fadeOut,
      overflow: 'hidden',
      background: `linear-gradient(${gradientAngle}deg, ${p.theme.gradientColors.join(', ')})`,
    }}>
      {/* Floating shapes */}
      {p.theme.floatingShapes && (
        <FloatingShapes midColor={p.theme.midgroundColor} bgColor={p.theme.backgroundColor} />
      )}

      {/* Background parallax texts */}
      {p.texts.map((t, i) => (
        <ParallaxWord key={i} item={t} scrollOffset={scrollOffset} />
      ))}

      {/* Main content — foreground layer */}
      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 80px',
      }}>
        {/* Headline */}
        <div style={{
          fontSize: p.headlineSize,
          fontWeight: 900,
          fontFamily: 'SF Pro Display, -apple-system, Helvetica, sans-serif',
          color: p.theme.foregroundColor,
          textAlign: 'center',
          lineHeight: 1.05,
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
          whiteSpace: 'pre-line',
        }}>
          {p.headline}
        </div>

        {/* Accent line */}
        <div style={{
          width: lineWidth,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${p.theme.midgroundColor}, transparent)`,
          borderRadius: 2,
          marginTop: 30,
          marginBottom: 30,
          opacity: headlineOpacity,
        }} />

        {/* Subline */}
        <div style={{
          fontSize: p.sublineSize,
          fontWeight: 400,
          fontFamily: 'SF Pro Display, -apple-system, Helvetica, sans-serif',
          color: p.theme.midgroundColor,
          textAlign: 'center',
          opacity: subOpacity,
          transform: `translateY(${interpolate(subSpring, [0, 1], [30, 0])}px)`,
          letterSpacing: '0.05em',
        }}>
          {p.subline}
        </div>

        {/* CTA */}
        <div style={{
          marginTop: 60,
          fontSize: 32,
          fontWeight: 700,
          fontFamily: 'SF Pro Display, -apple-system, Helvetica, sans-serif',
          color: p.theme.foregroundColor,
          opacity: ctaOpacity,
          transform: `scale(${interpolate(ctaSpring, [0, 1], [0.8, 1])})`,
          padding: '18px 50px',
          border: `2px solid ${p.theme.midgroundColor}60`,
          borderRadius: 50,
          letterSpacing: '0.15em',
          background: `${p.theme.midgroundColor}10`,
        }}>
          {p.ctaText}
        </div>
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
    </AbsoluteFill>
  );
};
