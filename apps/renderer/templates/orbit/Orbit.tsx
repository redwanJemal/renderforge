import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

// ══════════════════════════════════════════════════════════════
// ORBIT — Circular layout with orbiting items
// Central element + items orbiting around it
// ══════════════════════════════════════════════════════════════

export type TextAnimation = 'fadeIn' | 'slideUp' | 'charReveal' | 'none';

export interface OrbitItem {
  icon: string;         // emoji or single char
  label: string;
  sublabel: string;     // optional second line
}

export interface OrbitProps {
  // ── Center Element ──
  center: {
    text: string;
    size: number;
    subtext: string;
    subtextSize: number;
    glowEnabled: boolean;
    pulseEnabled: boolean;
  };

  // ── Orbiting Items ──
  items: OrbitItem[];
  orbit: {
    radius: number;           // px from center
    itemSize: number;         // px card size
    rotationSpeed: number;    // degrees per frame
    startAngle: number;       // initial offset degrees
    showConnectors: boolean;  // lines from center to items
    staggerReveal: boolean;   // items appear one by one
  };

  // ── Headline (top) ──
  headline: {
    text: string;
    size: number;
    animation: TextAnimation;
    enabled: boolean;
  };

  // ── Subtext (bottom) ──
  subtext: {
    text: string;
    size: number;
    enabled: boolean;
    bottomOffset: number;
  };

  // ── Theme ──
  theme: {
    accentColor: string;
    secondaryAccent: string;
    bgGradient: [string, string, string];
    ringsEnabled: boolean;       // decorative orbit rings
    particlesEnabled: boolean;
    vignetteEnabled: boolean;
  };

  // ── Timing ──
  timing: {
    centerAppear: number;
    orbitStart: number;
    headlineAppear: number;
    subtextAppear: number;
  };
}

// ── Defaults ─────────────────────────────────────────────────
export const defaultOrbitProps: OrbitProps = {
  center: {
    text: 'AI',
    size: 80,
    subtext: 'CORE',
    subtextSize: 24,
    glowEnabled: true,
    pulseEnabled: true,
  },
  items: [
    { icon: '⚡', label: 'Speed', sublabel: '10x faster' },
    { icon: '🛡️', label: 'Security', sublabel: 'Enterprise' },
    { icon: '🔗', label: 'Connect', sublabel: '200+ APIs' },
    { icon: '📊', label: 'Analytics', sublabel: 'Real-time' },
    { icon: '🌍', label: 'Global', sublabel: '99.9% uptime' },
    { icon: '🎯', label: 'Precision', sublabel: 'ML-powered' },
  ],
  orbit: {
    radius: 340,
    itemSize: 130,
    rotationSpeed: 0.12,
    startAngle: 0,
    showConnectors: true,
    staggerReveal: true,
  },
  headline: {
    text: 'Everything connects.',
    size: 48,
    animation: 'fadeIn' as TextAnimation,
    enabled: true,
  },
  subtext: {
    text: 'One platform. Infinite possibilities.',
    size: 24,
    enabled: true,
    bottomOffset: 130,
  },
  theme: {
    accentColor: '#6366F1',
    secondaryAccent: '#A855F7',
    bgGradient: ['#0c0a1a', '#060510', '#020208'],
    ringsEnabled: true,
    particlesEnabled: true,
    vignetteEnabled: true,
  },
  timing: {
    centerAppear: 15,
    orbitStart: 50,
    headlineAppear: 180,
    subtextAppear: 220,
  },
};

// ══════════════════════════════════════════════════════════════
// EFFECTS
// ══════════════════════════════════════════════════════════════

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const StarField: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const stars = Array.from({ length: 35 }, (_, i) => ({
    x: seededRandom(i * 7) * 100,
    y: seededRandom(i * 13) * 100,
    size: 1 + seededRandom(i * 3) * 2.5,
    twinkle: seededRandom(i * 23) * 6,
  }));

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: i % 4 === 0 ? accent : '#ffffff',
          opacity: 0.15 + Math.sin(frame * 0.06 + s.twinkle) * 0.15,
        }} />
      ))}
    </AbsoluteFill>
  );
};

const OrbitRings: React.FC<{ radius: number; accent: string; secondary: string }> = ({
  radius, accent, secondary,
}) => {
  const frame = useCurrentFrame();
  const rings = [
    { r: radius - 40, w: 0.5, color: accent, opacity: 0.06, dash: false },
    { r: radius, w: 1, color: accent, opacity: 0.12, dash: false },
    { r: radius + 40, w: 0.5, color: secondary, opacity: 0.05, dash: true },
    { r: radius + 100, w: 0.3, color: accent, opacity: 0.03, dash: true },
  ];

  return (
    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {rings.map((ring, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: ring.r * 2,
          height: ring.r * 2,
          borderRadius: '50%',
          border: `${ring.w}px ${ring.dash ? 'dashed' : 'solid'} ${ring.color}`,
          opacity: ring.opacity + Math.sin(frame * 0.03 + i * 2) * 0.02,
          transform: `rotate(${frame * 0.05 * (i % 2 === 0 ? 1 : -1)}deg)`,
        }} />
      ))}
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════
// TEXT COMPONENT
// ══════════════════════════════════════════════════════════════

const AnimText: React.FC<{
  text: string; animation: TextAnimation; delay: number;
  style: React.CSSProperties;
}> = ({ text, animation, delay, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  switch (animation) {
    case 'slideUp': {
      const p = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 16, stiffness: 80, mass: 0.7 } });
      const o = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      return <div style={{ ...style, opacity: o, transform: `translateY(${(1 - p) * 40}px)` }}>{text}</div>;
    }
    case 'charReveal': {
      return (
        <div style={{ ...style, display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          {text.split('').map((char, i) => {
            const cd = delay + i * 2.2;
            const adj = Math.max(0, frame - cd);
            const p = spring({ frame: adj, fps, config: { damping: 12, stiffness: 200, mass: 0.3 } });
            const o = interpolate(adj, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <span key={i} style={{
                display: 'inline-block', opacity: o,
                transform: `translateY(${(1 - p) * 20}px)`,
                whiteSpace: char === ' ' ? 'pre' : undefined,
              }}>{char}</span>
            );
          })}
        </div>
      );
    }
    case 'fadeIn':
    default: {
      const o = interpolate(frame, [delay, delay + 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      return <div style={{ ...style, opacity: o }}>{text}</div>;
    }
  }
};

// ══════════════════════════════════════════════════════════════
// ORBIT ITEM CARD
// ══════════════════════════════════════════════════════════════

const OrbitItemCard: React.FC<{
  item: OrbitItem;
  angle: number;       // current angle in degrees
  radius: number;
  size: number;
  index: number;
  delay: number;
  accent: string;
}> = ({ item, angle, radius, size, index, delay, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adj = Math.max(0, frame - delay);

  const scale = spring({ frame: adj, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } });
  const opacity = interpolate(adj, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;

  const font = 'SF Pro Display, -apple-system, Helvetica, sans-serif';

  return (
    <div style={{
      position: 'absolute',
      left: '50%', top: '50%',
      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`,
      opacity,
      width: size, height: size,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: 20,
      backdropFilter: 'blur(10px)',
      gap: 6,
    }}>
      <span style={{ fontSize: 32, lineHeight: 1 }}>{item.icon}</span>
      <span style={{
        fontSize: 16, fontWeight: 700, fontFamily: font,
        color: '#ffffff', letterSpacing: '0.05em',
      }}>{item.label}</span>
      <span style={{
        fontSize: 12, fontWeight: 400, fontFamily: font,
        color: 'rgba(255,255,255,0.4)',
      }}>{item.sublabel}</span>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export const Orbit: React.FC<OrbitProps> = (rawProps) => {
  const p: OrbitProps = {
    center: { ...defaultOrbitProps.center, ...rawProps?.center },
    items: rawProps?.items?.length ? rawProps.items : defaultOrbitProps.items,
    orbit: { ...defaultOrbitProps.orbit, ...rawProps?.orbit },
    headline: { ...defaultOrbitProps.headline, ...rawProps?.headline },
    subtext: { ...defaultOrbitProps.subtext, ...rawProps?.subtext },
    theme: { ...defaultOrbitProps.theme, ...rawProps?.theme },
    timing: { ...defaultOrbitProps.timing, ...rawProps?.timing },
  };

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = p.timing;
  const accent = p.theme.accentColor;
  const secondary = p.theme.secondaryAccent;
  const font = 'SF Pro Display, -apple-system, Helvetica, sans-serif';

  const bgOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });

  // Center element
  const centerAdj = Math.max(0, frame - t.centerAppear);
  const centerScale = spring({ frame: centerAdj, fps, config: { damping: 15, stiffness: 60, mass: 1 } });
  const centerOpacity = interpolate(frame, [t.centerAppear, t.centerAppear + 25], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const centerPulse = p.center.pulseEnabled ? 1 + Math.sin(frame * 0.06) * 0.03 : 1;
  const centerGlow = p.center.glowEnabled ? 0.4 + Math.sin(frame * 0.05) * 0.2 : 0;

  // Orbit rotation
  const orbitAdj = Math.max(0, frame - t.orbitStart);
  const currentRotation = p.orbit.startAngle + orbitAdj * p.orbit.rotationSpeed;

  // Subtext
  const subtextOpacity = interpolate(frame, [t.subtextAppear, t.subtextAppear + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 25, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const angleStep = 360 / p.items.length;

  return (
    <AbsoluteFill style={{ opacity: fadeOut, overflow: 'hidden' }}>
      {/* BG */}
      <AbsoluteFill style={{
        opacity: bgOpacity,
        background: `radial-gradient(ellipse at 50% 45%, ${p.theme.bgGradient[0]} 0%, ${p.theme.bgGradient[1]} 45%, ${p.theme.bgGradient[2]} 100%)`,
      }} />

      {/* Stars */}
      {p.theme.particlesEnabled && <StarField accent={accent} />}

      {/* Orbit rings */}
      {p.theme.ringsEnabled && <OrbitRings radius={p.orbit.radius} accent={accent} secondary={secondary} />}

      {/* Connectors */}
      {p.orbit.showConnectors && p.items.map((_, i) => {
        const itemDelay = t.orbitStart + (p.orbit.staggerReveal ? i * 12 : 0);
        const adj = Math.max(0, frame - itemDelay);
        const opacity = interpolate(adj, [0, 20], [0, 0.06], { extrapolateRight: 'clamp' });
        const angle = currentRotation + i * angleStep;
        const rad = (angle * Math.PI) / 180;
        const endX = Math.cos(rad) * p.orbit.radius;
        const endY = Math.sin(rad) * p.orbit.radius;
        const length = Math.sqrt(endX * endX + endY * endY);
        const rotation = Math.atan2(endY, endX) * (180 / Math.PI);

        return (
          <div key={`c-${i}`} style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: length, height: 1,
            background: `linear-gradient(90deg, ${accent}33, ${accent}11)`,
            opacity,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: '0 50%',
          }} />
        );
      })}

      {/* Orbit items */}
      {p.items.map((item, i) => {
        const itemDelay = t.orbitStart + (p.orbit.staggerReveal ? i * 12 : 0);
        const angle = currentRotation + i * angleStep;
        return (
          <OrbitItemCard
            key={i}
            item={item}
            angle={angle}
            radius={p.orbit.radius}
            size={p.orbit.itemSize}
            index={i}
            delay={itemDelay}
            accent={accent}
          />
        );
      })}

      {/* Center element */}
      <AbsoluteFill style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          opacity: centerOpacity,
          transform: `scale(${centerScale * centerPulse})`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          width: 160, height: 160,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
          border: `2px solid ${accent}33`,
          boxShadow: p.center.glowEnabled
            ? `0 0 ${40 * centerGlow}px ${accent}44, 0 0 ${80 * centerGlow}px ${accent}22, inset 0 0 ${30 * centerGlow}px ${accent}11`
            : 'none',
        }}>
          <span style={{
            fontSize: p.center.size,
            fontWeight: 900,
            fontFamily: font,
            color: accent,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            textShadow: `0 0 20px ${accent}66`,
          }}>{p.center.text}</span>
          <span style={{
            fontSize: p.center.subtextSize,
            fontWeight: 600,
            fontFamily: font,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.3em',
            marginTop: 4,
          }}>{p.center.subtext}</span>
        </div>
      </AbsoluteFill>

      {/* Vignette */}
      {p.theme.vignetteEnabled && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Headline */}
      {p.headline.enabled && (
        <div style={{
          position: 'absolute', top: 80, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', zIndex: 10,
        }}>
          <AnimText
            text={p.headline.text}
            animation={p.headline.animation}
            delay={t.headlineAppear}
            style={{
              fontSize: p.headline.size,
              fontWeight: 700,
              fontFamily: font,
              color: '#ffffff',
              textAlign: 'center',
              letterSpacing: '0.02em',
            }}
          />
        </div>
      )}

      {/* Subtext */}
      {p.subtext.enabled && (
        <div style={{
          position: 'absolute', bottom: p.subtext.bottomOffset,
          left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          opacity: subtextOpacity, zIndex: 10,
        }}>
          <span style={{
            fontSize: p.subtext.size,
            fontWeight: 400,
            fontFamily: font,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.1em',
          }}>{p.subtext.text}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
