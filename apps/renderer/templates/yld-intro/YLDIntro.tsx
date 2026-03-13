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
// TEXT ANIMATION TYPES
// ══════════════════════════════════════════════════════════════

export type TextAnimation =
  | 'fadeIn'       // simple fade
  | 'slideUp'     // slide from below + fade
  | 'typewriter'  // character by character
  | 'charReveal'  // each char fades in with stagger
  | 'wordReveal'  // each word fades in with stagger
  | 'glitch'      // glitch/flicker effect
  | 'none';       // instant, no animation

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
    marginBottom: number;   // gap below logo (px)
  };

  // ── Layer 2: Header (big title) ──
  header: {
    line1: string;          // smaller top line
    line1Size: number;      // font size
    line1Animation: TextAnimation;
    line2: string;          // big bold line
    line2Size: number;
    line2Animation: TextAnimation;
    highlight: string;      // word(s) to color with accent
    marginBottom: number;   // gap below header (px)
  };

  // ── Layer 3: Subheader ──
  subheader: {
    text: string;           // supports \n for line breaks
    size: number;
    animation: TextAnimation;
    marginBottom: number;   // gap below subheader (px)
  };

  // ── Layer 4: Badge ──
  badge: {
    text: string;
    enabled: boolean;
    marginBottom: number;   // gap below badge (px)
  };

  // ── Layer 5: CTA ──
  cta: {
    text: string;
    enabled: boolean;
    bottomOffset: number;   // distance from bottom (px)
  };

  // ── Divider ──
  divider: {
    enabled: boolean;
    marginBottom: number;   // gap below divider (px)
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
    marginBottom: 15,
  },
  header: {
    line1: 'What would you build',
    line1Size: 40,
    line1Animation: 'charReveal' as TextAnimation,
    line2: 'with your last dollar?',
    line2Size: 56,
    line2Animation: 'slideUp' as TextAnimation,
    highlight: 'last dollar',
    marginBottom: 25,
  },
  subheader: {
    text: 'Real engineers. Zero budget.\nBuilding from nothing to something.',
    size: 30,
    animation: 'typewriter' as TextAnimation,
    marginBottom: 45,
  },
  badge: {
    text: 'The Challenge Begins',
    enabled: true,
    marginBottom: 0,
  },
  cta: {
    text: 'FOLLOW THE JOURNEY →',
    enabled: true,
    bottomOffset: 150,
  },
  divider: {
    enabled: true,
    marginBottom: 30,
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
    logoAppear: 20,
    logoMoveUp: 130,
    dividerAppear: 155,
    headerAppear: 165,
    subheaderAppear: 230,
    badgeAppear: 290,
    ctaAppear: 330,
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
// ANIMATED TEXT COMPONENTS
// ══════════════════════════════════════════════════════════════

// Typewriter — characters appear one by one with a cursor
const TypewriterText: React.FC<{
  text: string; delay: number; style: React.CSSProperties;
  charsPerFrame?: number; accent?: string;
}> = ({ text, delay, style, charsPerFrame = 0.4, accent }) => {
  const frame = useCurrentFrame();
  const adj = Math.max(0, frame - delay);
  const charCount = Math.min(text.length, Math.floor(adj * charsPerFrame));
  const showCursor = adj > 0 && charCount < text.length;
  const cursorBlink = Math.floor(adj / 8) % 2 === 0;

  return (
    <div style={{ ...style, whiteSpace: 'pre-wrap' }}>
      {text.slice(0, charCount)}
      {showCursor && (
        <span style={{
          opacity: cursorBlink ? 1 : 0,
          color: accent || style.color || '#fff',
          fontWeight: 100,
        }}>|</span>
      )}
    </div>
  );
};

// CharReveal — each character fades/scales in with stagger
const CharRevealText: React.FC<{
  text: string; delay: number; style: React.CSSProperties;
  staggerFrames?: number; highlight?: string; accent?: string;
}> = ({ text, delay, style, staggerFrames = 2.2, highlight, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const highlightStart = highlight ? text.toLowerCase().indexOf(highlight.toLowerCase()) : -1;
  const highlightEnd = highlightStart >= 0 ? highlightStart + highlight!.length : -1;

  return (
    <div style={{ ...style, display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
      {text.split('').map((char, i) => {
        const charDelay = delay + i * staggerFrames;
        const adj = Math.max(0, frame - charDelay);
        const progress = spring({
          frame: adj, fps,
          config: { damping: 12, stiffness: 200, mass: 0.3 },
        });
        const opacity = interpolate(adj, [0, 6], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const isHighlight = accent && highlightStart >= 0 && i >= highlightStart && i < highlightEnd;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity,
              transform: `translateY(${(1 - progress) * 20}px) scale(${0.5 + progress * 0.5})`,
              color: isHighlight ? accent : style.color,
              textShadow: isHighlight ? `0 0 30px ${accent}66` : undefined,
              whiteSpace: char === ' ' ? 'pre' : undefined,
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};

// WordReveal — each word fades/slides in with stagger
const WordRevealText: React.FC<{
  text: string; delay: number; style: React.CSSProperties;
  staggerFrames?: number; highlight?: string; accent?: string;
}> = ({ text, delay, style, staggerFrames = 4, highlight, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');

  return (
    <div style={{ ...style, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.3em' }}>
      {words.map((word, i) => {
        const wordDelay = delay + i * staggerFrames;
        const adj = Math.max(0, frame - wordDelay);
        const progress = spring({
          frame: adj, fps,
          config: { damping: 14, stiffness: 120, mass: 0.5 },
        });
        const opacity = interpolate(adj, [0, 8], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const isHighlight = accent && highlight && highlight.toLowerCase().includes(word.toLowerCase());

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity,
              transform: `translateY(${(1 - progress) * 30}px)`,
              color: isHighlight ? accent : style.color,
              textShadow: isHighlight ? `0 0 30px ${accent}66` : undefined,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// Glitch — text flickers with random offsets
const GlitchText: React.FC<{
  text: string; delay: number; style: React.CSSProperties; accent?: string;
}> = ({ text, delay, style, accent }) => {
  const frame = useCurrentFrame();
  const adj = Math.max(0, frame - delay);
  const opacity = interpolate(adj, [0, 5], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Glitch bursts at specific frames
  const isGlitching = (adj > 3 && adj < 8) || (adj > 15 && adj < 18) || (adj > 28 && adj < 30);
  const glitchX = isGlitching ? (seededRandom(frame * 7) - 0.5) * 12 : 0;
  const glitchY = isGlitching ? (seededRandom(frame * 13) - 0.5) * 6 : 0;
  const glitchSkew = isGlitching ? (seededRandom(frame * 19) - 0.5) * 5 : 0;

  return (
    <div style={{ position: 'relative' }}>
      {/* Cyan ghost */}
      {isGlitching && (
        <div style={{
          ...style, position: 'absolute', opacity: 0.6,
          color: '#00ffff', transform: `translate(${glitchX * 1.5}px, ${glitchY}px)`,
          filter: 'blur(1px)',
        }}>
          {text}
        </div>
      )}
      {/* Red ghost */}
      {isGlitching && (
        <div style={{
          ...style, position: 'absolute', opacity: 0.6,
          color: accent || '#ff0040', transform: `translate(${-glitchX}px, ${-glitchY}px)`,
          filter: 'blur(1px)',
        }}>
          {text}
        </div>
      )}
      {/* Main text */}
      <div style={{
        ...style, opacity,
        transform: `translate(${glitchX}px, ${glitchY}px) skewX(${glitchSkew}deg)`,
      }}>
        {text}
      </div>
    </div>
  );
};

// ── Render animated text based on type ──
const AnimText: React.FC<{
  text: string; animation: TextAnimation; delay: number;
  style: React.CSSProperties; highlight?: string; accent?: string;
}> = ({ text, animation, delay, style, highlight, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  switch (animation) {
    case 'typewriter':
      return <TypewriterText text={text} delay={delay} style={style} accent={accent} />;
    case 'charReveal':
      return <CharRevealText text={text} delay={delay} style={style} highlight={highlight} accent={accent} />;
    case 'wordReveal':
      return <WordRevealText text={text} delay={delay} style={style} highlight={highlight} accent={accent} />;
    case 'glitch':
      return <GlitchText text={text} delay={delay} style={style} accent={accent} />;
    case 'slideUp': {
      const progress = spring({
        frame: Math.max(0, frame - delay), fps,
        config: { damping: 16, stiffness: 80, mass: 0.7 },
      });
      const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });
      return (
        <div style={{
          ...style, opacity,
          transform: `translateY(${(1 - progress) * 40}px)`,
        }}>
          {highlight && accent ? highlightText(text, highlight, accent) : text}
        </div>
      );
    }
    case 'fadeIn': {
      const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });
      return (
        <div style={{ ...style, opacity }}>
          {highlight && accent ? highlightText(text, highlight, accent) : text}
        </div>
      );
    }
    case 'none':
    default:
      return (
        <div style={style}>
          {highlight && accent ? highlightText(text, highlight, accent) : text}
        </div>
      );
  }
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
    divider: { ...defaultYLDProps.divider, ...rawProps?.divider },
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
          marginBottom: p.logo.marginBottom,
        }}>
          <Img
            src={staticFile(p.logo.file)}
            style={{ width: p.logo.size, height: p.logo.size, objectFit: 'contain' }}
          />
        </div>

        {/* Divider */}
        {p.divider.enabled && (
          <div style={{
            width: `${divWidth}%`, height: 2, opacity: divOpacity,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            marginBottom: p.divider.marginBottom,
          }} />
        )}

        {/* LAYER 2: Header */}
        <div style={{ textAlign: 'center', marginBottom: p.header.marginBottom }}>
          {p.header.line1 && (
            <div style={{ marginBottom: 14 }}>
              <AnimText
                text={p.header.line1}
                animation={p.header.line1Animation}
                delay={t.headerAppear}
                accent={accent}
                style={{
                  fontSize: p.header.line1Size, fontWeight: 300, fontFamily: font,
                  color: 'rgba(255, 255, 255, 0.55)',
                  letterSpacing: '0.35em', textTransform: 'uppercase',
                }}
              />
            </div>
          )}
          <AnimText
            text={p.header.line2}
            animation={p.header.line2Animation}
            delay={t.headerAppear + 15}
            highlight={p.header.highlight}
            accent={accent}
            style={{
              fontSize: p.header.line2Size, fontWeight: 800, fontFamily: font,
              color: '#ffffff', letterSpacing: '0.12em',
              textTransform: 'uppercase', lineHeight: 1.2,
            }}
          />
        </div>

        {/* LAYER 3: Subheader */}
        <div style={{ textAlign: 'center', marginBottom: p.subheader.marginBottom }}>
          <AnimText
            text={p.subheader.text}
            animation={p.subheader.animation}
            delay={t.subheaderAppear}
            accent={accent}
            style={{
              fontSize: p.subheader.size, fontWeight: 400, fontFamily: font,
              color: 'rgba(255, 255, 255, 0.45)',
              lineHeight: 1.7, maxWidth: 800,
            }}
          />
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
            position: 'absolute', bottom: p.cta.bottomOffset,
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
