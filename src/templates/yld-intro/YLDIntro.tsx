import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from 'remotion';

// ══════════════════════════════════════════════════════════════
// CONFIGURABLE PROPS — Every layer is customizable
// ══════════════════════════════════════════════════════════════

export interface YLDIntroProps {
  // ── Layer 1: Logo ──
  logo: {
    file: string;           // filename in public/
    size: number;           // px (default 480)
    glowEnabled: boolean;
    finalScale: number;     // after shrink (0.6 = 60%)
    moveUpPx: number;       // how far it moves up
  };

  // ── Layer 2: Header (big title) ──
  header: {
    line1: string;          // smaller top line
    line1Size: number;      // font size
    line2: string;          // big bold line
    line2Size: number;
    highlight: string;      // word(s) to color with accent
  };

  // ── Layer 3: Subheader ──
  subheader: {
    text: string;           // supports \n for line breaks
    size: number;
  };

  // ── Layer 4: Badge ──
  badge: {
    text: string;
    enabled: boolean;
  };

  // ── Layer 5: CTA ──
  cta: {
    text: string;
    enabled: boolean;
  };

  // ── Theme / Branding ──
  theme: {
    accentColor: string;
    bgGradient: [string, string, string]; // start, mid, end
    particlesEnabled: boolean;
    scanLineEnabled: boolean;
    gridEnabled: boolean;
    vignetteEnabled: boolean;
  };

  // ── Timing (frames at 30fps) ──
  timing: {
    logoAppear: number;     // when logo fades in
    logoMoveUp: number;     // when logo starts moving up
    dividerAppear: number;
    headerAppear: number;
    subheaderAppear: number;
    badgeAppear: number;
    ctaAppear: number;
  };
}

// ── Defaults ─────────────────────────────────────────────────
export const defaultYLDProps: YLDIntroProps = {
  logo: {
    file: 'yld-logo-white.png',
    size: 480,
    glowEnabled: true,
    finalScale: 0.6,
    moveUpPx: 160,
  },
  header: {
    line1: 'What would you build',
    line1Size: 40,
    line2: 'with your last dollar?',
    line2Size: 56,
    highlight: 'last dollar',
  },
  subheader: {
    text: 'Real engineers. Zero budget.\nBuilding from nothing to something.',
    size: 30,
  },
  badge: {
    text: 'The Challenge Begins',
    enabled: true,
  },
  cta: {
    text: 'FOLLOW THE JOURNEY →',
    enabled: true,
  },
  theme: {
    accentColor: '#22c55e',
    bgGradient: ['#0a2e1a', '#071a10', '#020a05'],
    particlesEnabled: true,
    scanLineEnabled: true,
    gridEnabled: true,
    vignetteEnabled: true,
  },
  timing: {
    logoAppear: 15,
    logoMoveUp: 95,
    dividerAppear: 110,
    headerAppear: 115,
    subheaderAppear: 160,
    badgeAppear: 200,
    ctaAppear: 230,
  },
};

// ══════════════════════════════════════════════════════════════
// EFFECTS
// ══════════════════════════════════════════════════════════════

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const Particle: React.FC<{
  x: number; y: number; size: number; delay: number;
  speed: number; opacity: number; color: string;
}> = ({ x, y, size, delay, speed, opacity, color }) => {
  const frame = useCurrentFrame();
  const adj = Math.max(0, frame - delay);
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      width: size, height: size, borderRadius: '50%',
      background: color,
      filter: `blur(${size > 4 ? 2 : 0}px)`,
      opacity: interpolate(adj, [0, 30], [0, opacity], { extrapolateRight: 'clamp' })
        * interpolate(frame, [220, 260], [1, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }),
      transform: `translateY(${adj * speed * -0.4}px) translateX(${Math.sin(adj * 0.02 + x) * 15}px)`,
      boxShadow: `0 0 ${size * 2}px ${color}`,
    }} />
  );
};

const Particles: React.FC<{ accent: string }> = ({ accent }) => {
  const color = `${accent}99`;
  const particles = Array.from({ length: 40 }, (_, i) => ({
    x: seededRandom(i * 7) * 100,
    y: 30 + seededRandom(i * 13) * 70,
    size: 2 + seededRandom(i * 3) * 5,
    delay: seededRandom(i * 11) * 40,
    speed: 0.2 + seededRandom(i * 17) * 0.5,
    opacity: 0.2 + seededRandom(i * 23) * 0.5,
  }));
  return <>{particles.map((p, i) => <Particle key={i} {...p} color={color} />)}</>;
};

const ScanLine: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0,
      top: `${interpolate(frame % 120, [0, 120], [-5, 105])}%`,
      height: 2,
      background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
      opacity: interpolate(frame, [0, 20], [0, 0.12], { extrapolateRight: 'clamp' }),
      filter: 'blur(1px)',
    }} />
  );
};

// ══════════════════════════════════════════════════════════════
// HIGHLIGHT HELPER
// ══════════════════════════════════════════════════════════════

function highlightText(text: string, highlight: string, color: string): React.ReactNode {
  if (!highlight) return text;
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color, textShadow: `0 0 30px ${color}66` }}>
        {text.slice(idx, idx + highlight.length)}
      </span>
      {text.slice(idx + highlight.length)}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export const YLDIntro: React.FC<YLDIntroProps> = (rawProps) => {
  // Deep merge with defaults
  const p: YLDIntroProps = {
    logo: { ...defaultYLDProps.logo, ...rawProps?.logo },
    header: { ...defaultYLDProps.header, ...rawProps?.header },
    subheader: { ...defaultYLDProps.subheader, ...rawProps?.subheader },
    badge: { ...defaultYLDProps.badge, ...rawProps?.badge },
    cta: { ...defaultYLDProps.cta, ...rawProps?.cta },
    theme: { ...defaultYLDProps.theme, ...rawProps?.theme },
    timing: { ...defaultYLDProps.timing, ...rawProps?.timing },
  };

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = p.timing;
  const accent = p.theme.accentColor;
  const font = 'SF Pro Display, -apple-system, Helvetica, sans-serif';

  // ── Animations ──
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  // Logo
  const logoScale = spring({
    frame: Math.max(0, frame - t.logoAppear), fps,
    config: { damping: 15, stiffness: 60, mass: 1.0 },
  });
  const logoOpacity = interpolate(frame, [t.logoAppear, t.logoAppear + 25], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const logoPulse = p.logo.glowEnabled ? Math.sin(frame * 0.06) * 0.3 + 0.7 : 0.7;
  const logoMoveUp = interpolate(frame, [t.logoMoveUp, t.logoMoveUp + 35], [0, -p.logo.moveUpPx], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const logoShrink = interpolate(frame, [t.logoMoveUp, t.logoMoveUp + 35], [1, p.logo.finalScale], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Divider
  const divWidth = interpolate(frame, [t.dividerAppear, t.dividerAppear + 25], [0, 55], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const divOpacity = interpolate(frame, [t.dividerAppear, t.dividerAppear + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Header
  const headerProgress = spring({
    frame: Math.max(0, frame - t.headerAppear), fps,
    config: { damping: 16, stiffness: 80, mass: 0.7 },
  });
  const headerOpacity = interpolate(frame, [t.headerAppear, t.headerAppear + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Subheader
  const subOpacity = interpolate(frame, [t.subheaderAppear, t.subheaderAppear + 25], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const subSlide = interpolate(frame, [t.subheaderAppear, t.subheaderAppear + 25], [50, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Badge
  const badgeScale = spring({
    frame: Math.max(0, frame - t.badgeAppear), fps,
    config: { damping: 12, stiffness: 120, mass: 0.5 },
  });
  const badgeOpacity = interpolate(frame, [t.badgeAppear, t.badgeAppear + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // CTA
  const ctaOpacity = interpolate(frame, [t.ctaAppear, t.ctaAppear + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut, overflow: 'hidden' }}>
      {/* ── BG Layer ── */}
      <AbsoluteFill style={{
        opacity: bgOpacity,
        background: `radial-gradient(ellipse at 50% 35%, ${p.theme.bgGradient[0]} 0%, ${p.theme.bgGradient[1]} 40%, ${p.theme.bgGradient[2]} 100%)`,
      }} />

      {/* ── Grid Layer ── */}
      {p.theme.gridEnabled && (
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.035,
          backgroundImage: `linear-gradient(${accent}4D 1px, transparent 1px), linear-gradient(90deg, ${accent}4D 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
      )}

      {/* ── Particles Layer ── */}
      {p.theme.particlesEnabled && <Particles accent={accent} />}

      {/* ── Scan Line Layer ── */}
      {p.theme.scanLineEnabled && <ScanLine accent={accent} />}

      {/* ── Vignette Layer ── */}
      {p.theme.vignetteEnabled && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.75) 100%)',
        }} />
      )}

      {/* ── Content Layers ── */}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 60px',
      }}>

        {/* LAYER 1: Logo */}
        <div style={{
          opacity: logoOpacity,
          transform: `translateY(${logoMoveUp}px) scale(${logoScale * logoShrink})`,
          filter: p.logo.glowEnabled
            ? `drop-shadow(0 0 ${40 * logoPulse}px ${accent}80) drop-shadow(0 0 ${80 * logoPulse}px ${accent}33)`
            : 'none',
          marginBottom: 15,
        }}>
          <Img
            src={staticFile(p.logo.file)}
            style={{ width: p.logo.size, height: p.logo.size, objectFit: 'contain' }}
          />
        </div>

        {/* Divider */}
        <div style={{
          width: `${divWidth}%`, height: 2, opacity: divOpacity,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          marginBottom: 30,
        }} />

        {/* LAYER 2: Header */}
        <div style={{
          opacity: headerOpacity,
          transform: `translateY(${(1 - headerProgress) * 40}px)`,
          textAlign: 'center', marginBottom: 25,
        }}>
          {p.header.line1 && (
            <div style={{
              fontSize: p.header.line1Size, fontWeight: 300, fontFamily: font,
              color: 'rgba(255, 255, 255, 0.55)',
              letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 14,
            }}>
              {p.header.line1}
            </div>
          )}
          <div style={{
            fontSize: p.header.line2Size, fontWeight: 800, fontFamily: font,
            color: '#ffffff', letterSpacing: '0.12em',
            textTransform: 'uppercase', lineHeight: 1.2,
          }}>
            {highlightText(p.header.line2, p.header.highlight, accent)}
          </div>
        </div>

        {/* LAYER 3: Subheader */}
        <div style={{
          opacity: subOpacity,
          transform: `translateY(${subSlide}px)`,
          textAlign: 'center', marginBottom: 45,
        }}>
          <div style={{
            fontSize: p.subheader.size, fontWeight: 400, fontFamily: font,
            color: 'rgba(255, 255, 255, 0.45)',
            lineHeight: 1.7, maxWidth: 800, whiteSpace: 'pre-wrap',
          }}>
            {p.subheader.text}
          </div>
        </div>

        {/* LAYER 4: Badge */}
        {p.badge.enabled && (
          <div style={{
            opacity: badgeOpacity, transform: `scale(${badgeScale})`,
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-block',
              border: `1.5px solid ${accent}66`,
              borderRadius: 100, padding: '16px 55px',
              fontSize: 22, fontWeight: 600, fontFamily: font,
              color: accent, letterSpacing: '0.3em', textTransform: 'uppercase',
              background: `${accent}0F`,
              boxShadow: `0 0 40px ${accent}1A`,
            }}>
              {p.badge.text}
            </div>
          </div>
        )}

        {/* LAYER 5: CTA */}
        {p.cta.enabled && (
          <div style={{
            position: 'absolute', bottom: 150,
            opacity: ctaOpacity, textAlign: 'center',
          }}>
            <div style={{
              fontSize: 24, fontWeight: 500, fontFamily: font,
              color: 'rgba(255, 255, 255, 0.35)', letterSpacing: '0.2em',
            }}>
              {p.cta.text}
            </div>
          </div>
        )}

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
