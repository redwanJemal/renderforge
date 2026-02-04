import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from 'remotion';

// ══════════════════════════════════════════════════════════════
// TEXT ANIMATIONS (shared patterns from YLDIntro)
// ══════════════════════════════════════════════════════════════

export type TextAnimation =
  | 'fadeIn'
  | 'slideUp'
  | 'slideRight'
  | 'typewriter'
  | 'charReveal'
  | 'glitch'
  | 'none';

// ══════════════════════════════════════════════════════════════
// CONFIGURABLE PROPS
// ══════════════════════════════════════════════════════════════

export interface ShowcaseProps {
  // ── Layer 1: Hero Image / Device ──
  hero: {
    imageUrl: string;         // product/app screenshot URL or local file
    width: number;            // px
    height: number;           // px
    borderRadius: number;     // px
    shadowEnabled: boolean;
    rotateY: number;          // 3D perspective tilt degrees (0 = flat)
    floatAmplitude: number;   // float animation px (0 = disabled)
    glowColor: string;        // glow around the image
    marginBottom: number;
  };

  // ── Layer 2: Tagline (small text above headline) ──
  tagline: {
    text: string;
    size: number;
    animation: TextAnimation;
    enabled: boolean;
    marginBottom: number;
  };

  // ── Layer 3: Headline ──
  headline: {
    line1: string;
    line1Size: number;
    line1Animation: TextAnimation;
    line2: string;
    line2Size: number;
    line2Animation: TextAnimation;
    highlight: string;        // word(s) to accent
    marginBottom: number;
  };

  // ── Layer 4: Description ──
  description: {
    text: string;
    size: number;
    animation: TextAnimation;
    marginBottom: number;
  };

  // ── Layer 5: Feature Pills ──
  features: {
    items: string[];
    enabled: boolean;
    pillStyle: 'solid' | 'outline' | 'glass';
    marginBottom: number;
  };

  // ── Layer 6: CTA ──
  cta: {
    text: string;
    enabled: boolean;
    style: 'solid' | 'outline' | 'glow';
    bottomOffset: number;
  };

  // ── Theme / Branding ──
  theme: {
    accentColor: string;
    secondaryAccent: string;
    bgGradient: [string, string, string];
    particlesEnabled: boolean;
    meshGradientEnabled: boolean;  // animated mesh/blob gradient
    gridEnabled: boolean;
    vignetteEnabled: boolean;
  };

  // ── Timing (frames at 30fps) ──
  timing: {
    heroAppear: number;
    taglineAppear: number;
    headlineAppear: number;
    descriptionAppear: number;
    featuresAppear: number;
    ctaAppear: number;
  };
}

// ── Defaults ─────────────────────────────────────────────────
export const defaultShowcaseProps: ShowcaseProps = {
  hero: {
    imageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800',
    width: 600,
    height: 400,
    borderRadius: 24,
    shadowEnabled: true,
    rotateY: 8,
    floatAmplitude: 12,
    glowColor: '#8B5CF6',
    marginBottom: 50,
  },
  tagline: {
    text: 'INTRODUCING',
    size: 22,
    animation: 'fadeIn' as TextAnimation,
    enabled: true,
    marginBottom: 16,
  },
  headline: {
    line1: 'Design meets',
    line1Size: 52,
    line1Animation: 'charReveal' as TextAnimation,
    line2: 'intelligence',
    line2Size: 68,
    line2Animation: 'slideUp' as TextAnimation,
    highlight: 'intelligence',
    marginBottom: 24,
  },
  description: {
    text: 'Create stunning visuals in seconds.\nPowered by AI. Built for creators.',
    size: 26,
    animation: 'typewriter' as TextAnimation,
    marginBottom: 40,
  },
  features: {
    items: ['AI-Powered', 'Real-time', 'No-code', 'Export Anywhere'],
    enabled: true,
    pillStyle: 'glass' as const,
    marginBottom: 30,
  },
  cta: {
    text: 'TRY IT FREE →',
    enabled: true,
    style: 'glow' as const,
    bottomOffset: 140,
  },
  theme: {
    accentColor: '#8B5CF6',
    secondaryAccent: '#EC4899',
    bgGradient: ['#13041f', '#0a0118', '#050010'],
    particlesEnabled: true,
    meshGradientEnabled: true,
    gridEnabled: false,
    vignetteEnabled: true,
  },
  timing: {
    heroAppear: 10,
    taglineAppear: 60,
    headlineAppear: 70,
    descriptionAppear: 120,
    featuresAppear: 160,
    ctaAppear: 200,
  },
};

// ══════════════════════════════════════════════════════════════
// EFFECTS
// ══════════════════════════════════════════════════════════════

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Constellation particles — connected by lines
const ConstellationParticles: React.FC<{ accent: string; secondary: string }> = ({
  accent,
  secondary,
}) => {
  const frame = useCurrentFrame();
  const particles = Array.from({ length: 30 }, (_, i) => ({
    x: seededRandom(i * 7) * 100,
    y: seededRandom(i * 13) * 100,
    size: 2 + seededRandom(i * 3) * 4,
    delay: seededRandom(i * 11) * 60,
    speed: 0.1 + seededRandom(i * 17) * 0.3,
    opacity: 0.15 + seededRandom(i * 23) * 0.4,
    color: seededRandom(i * 29) > 0.5 ? accent : secondary,
  }));

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {particles.map((p, i) => {
        const adj = Math.max(0, frame - p.delay);
        const x = p.x + Math.sin(adj * 0.015 + i) * 3;
        const y = p.y + Math.cos(adj * 0.012 + i * 0.7) * 3;
        const pulse = 0.5 + Math.sin(adj * 0.08 + i) * 0.5;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: p.size * (0.8 + pulse * 0.4),
              height: p.size * (0.8 + pulse * 0.4),
              borderRadius: '50%',
              background: p.color,
              opacity: interpolate(adj, [0, 30], [0, p.opacity * pulse], {
                extrapolateRight: 'clamp',
              }),
              boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
              filter: `blur(${p.size > 4 ? 1 : 0}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Animated mesh gradient blobs
const MeshGradient: React.FC<{ accent: string; secondary: string }> = ({
  accent,
  secondary,
}) => {
  const frame = useCurrentFrame();

  const blobs = [
    { cx: 30, cy: 40, r: 350, color: accent, speed: 0.008, offset: 0 },
    { cx: 70, cy: 60, r: 300, color: secondary, speed: 0.01, offset: 2 },
    { cx: 50, cy: 20, r: 250, color: accent, speed: 0.006, offset: 4 },
  ];

  return (
    <AbsoluteFill style={{ overflow: 'hidden', opacity: 0.15, filter: 'blur(80px)' }}>
      {blobs.map((b, i) => {
        const x = b.cx + Math.sin(frame * b.speed + b.offset) * 15;
        const y = b.cy + Math.cos(frame * b.speed * 0.7 + b.offset) * 10;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              width: b.r * 2,
              height: b.r * 2,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════
// TEXT COMPONENTS
// ══════════════════════════════════════════════════════════════

const TypewriterText: React.FC<{
  text: string; delay: number; style: React.CSSProperties;
  charsPerFrame?: number; accent?: string;
}> = ({ text, delay, style, charsPerFrame = 0.6, accent }) => {
  const frame = useCurrentFrame();
  const adj = Math.max(0, frame - delay);
  const charCount = Math.min(text.length, Math.floor(adj * charsPerFrame));
  const showCursor = adj > 0 && charCount < text.length;
  const cursorBlink = Math.floor(adj / 8) % 2 === 0;

  return (
    <div style={{ ...style, whiteSpace: 'pre-wrap' }}>
      {text.slice(0, charCount)}
      {showCursor && (
        <span style={{ opacity: cursorBlink ? 1 : 0, color: accent || style.color || '#fff', fontWeight: 100 }}>|</span>
      )}
    </div>
  );
};

const CharRevealText: React.FC<{
  text: string; delay: number; style: React.CSSProperties;
  staggerFrames?: number; highlight?: string; accent?: string;
}> = ({ text, delay, style, staggerFrames = 1.5, highlight, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hlStart = highlight ? text.toLowerCase().indexOf(highlight.toLowerCase()) : -1;
  const hlEnd = hlStart >= 0 ? hlStart + highlight!.length : -1;

  return (
    <div style={{ ...style, display: 'flex', flexWrap: 'wrap', justifyContent: style.textAlign === 'center' ? 'center' : 'flex-start' }}>
      {text.split('').map((char, i) => {
        const charDelay = delay + i * staggerFrames;
        const adj = Math.max(0, frame - charDelay);
        const progress = spring({ frame: adj, fps, config: { damping: 12, stiffness: 200, mass: 0.3 } });
        const opacity = interpolate(adj, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const isHl = accent && hlStart >= 0 && i >= hlStart && i < hlEnd;
        return (
          <span key={i} style={{
            display: 'inline-block', opacity,
            transform: `translateY(${(1 - progress) * 20}px) scale(${0.5 + progress * 0.5})`,
            color: isHl ? accent : style.color,
            textShadow: isHl ? `0 0 30px ${accent}66` : undefined,
            whiteSpace: char === ' ' ? 'pre' : undefined,
          }}>{char}</span>
        );
      })}
    </div>
  );
};

const GlitchText: React.FC<{
  text: string; delay: number; style: React.CSSProperties; accent?: string;
}> = ({ text, delay, style, accent }) => {
  const frame = useCurrentFrame();
  const adj = Math.max(0, frame - delay);
  const opacity = interpolate(adj, [0, 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const isGlitching = (adj > 3 && adj < 8) || (adj > 15 && adj < 18) || (adj > 28 && adj < 30);
  const gx = isGlitching ? (seededRandom(frame * 7) - 0.5) * 12 : 0;
  const gy = isGlitching ? (seededRandom(frame * 13) - 0.5) * 6 : 0;
  const gs = isGlitching ? (seededRandom(frame * 19) - 0.5) * 5 : 0;

  return (
    <div style={{ position: 'relative' }}>
      {isGlitching && <div style={{ ...style, position: 'absolute', opacity: 0.6, color: '#00ffff', transform: `translate(${gx * 1.5}px, ${gy}px)`, filter: 'blur(1px)' }}>{text}</div>}
      {isGlitching && <div style={{ ...style, position: 'absolute', opacity: 0.6, color: accent || '#ff0040', transform: `translate(${-gx}px, ${-gy}px)`, filter: 'blur(1px)' }}>{text}</div>}
      <div style={{ ...style, opacity, transform: `translate(${gx}px, ${gy}px) skewX(${gs}deg)` }}>{text}</div>
    </div>
  );
};

function highlightText(text: string, highlight: string, color: string): React.ReactNode {
  if (!highlight) return text;
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<span style={{ color, textShadow: `0 0 30px ${color}66` }}>{text.slice(idx, idx + highlight.length)}</span>{text.slice(idx + highlight.length)}</>;
}

const AnimText: React.FC<{
  text: string; animation: TextAnimation; delay: number;
  style: React.CSSProperties; highlight?: string; accent?: string;
}> = ({ text, animation, delay, style, highlight, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  switch (animation) {
    case 'typewriter': return <TypewriterText text={text} delay={delay} style={style} accent={accent} />;
    case 'charReveal': return <CharRevealText text={text} delay={delay} style={style} highlight={highlight} accent={accent} />;
    case 'glitch': return <GlitchText text={text} delay={delay} style={style} accent={accent} />;
    case 'slideUp': {
      const p = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 16, stiffness: 80, mass: 0.7 } });
      const o = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      return <div style={{ ...style, opacity: o, transform: `translateY(${(1 - p) * 40}px)` }}>{highlight && accent ? highlightText(text, highlight, accent) : text}</div>;
    }
    case 'slideRight': {
      const p = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 16, stiffness: 80, mass: 0.7 } });
      const o = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      return <div style={{ ...style, opacity: o, transform: `translateX(${(1 - p) * -60}px)` }}>{highlight && accent ? highlightText(text, highlight, accent) : text}</div>;
    }
    case 'fadeIn': {
      const o = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      return <div style={{ ...style, opacity: o }}>{highlight && accent ? highlightText(text, highlight, accent) : text}</div>;
    }
    default: return <div style={style}>{highlight && accent ? highlightText(text, highlight, accent) : text}</div>;
  }
};

// ══════════════════════════════════════════════════════════════
// FEATURE PILLS
// ══════════════════════════════════════════════════════════════

const FeaturePill: React.FC<{
  text: string; index: number; delay: number; accent: string;
  pillStyle: 'solid' | 'outline' | 'glass';
}> = ({ text, index, delay, accent, pillStyle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pillDelay = delay + index * 8;
  const adj = Math.max(0, frame - pillDelay);
  const scale = spring({ frame: adj, fps, config: { damping: 10, stiffness: 150, mass: 0.4 } });
  const opacity = interpolate(adj, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const pillStyles: Record<string, React.CSSProperties> = {
    solid: { background: accent, color: '#fff' },
    outline: { background: 'transparent', border: `1.5px solid ${accent}`, color: accent },
    glass: { background: `${accent}1A`, border: `1px solid ${accent}44`, color: accent, backdropFilter: 'blur(10px)' },
  };

  return (
    <div style={{
      opacity, transform: `scale(${scale})`,
      padding: '10px 24px', borderRadius: 100,
      fontSize: 18, fontWeight: 600, letterSpacing: '0.05em',
      fontFamily: 'SF Pro Display, -apple-system, Helvetica, sans-serif',
      ...pillStyles[pillStyle],
    }}>
      {text}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export const Showcase: React.FC<ShowcaseProps> = (rawProps) => {
  const p: ShowcaseProps = {
    hero: { ...defaultShowcaseProps.hero, ...rawProps?.hero },
    tagline: { ...defaultShowcaseProps.tagline, ...rawProps?.tagline },
    headline: { ...defaultShowcaseProps.headline, ...rawProps?.headline },
    description: { ...defaultShowcaseProps.description, ...rawProps?.description },
    features: { ...defaultShowcaseProps.features, ...rawProps?.features },
    cta: { ...defaultShowcaseProps.cta, ...rawProps?.cta },
    theme: { ...defaultShowcaseProps.theme, ...rawProps?.theme },
    timing: { ...defaultShowcaseProps.timing, ...rawProps?.timing },
  };

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = p.timing;
  const accent = p.theme.accentColor;
  const secondary = p.theme.secondaryAccent;
  const font = 'SF Pro Display, -apple-system, Helvetica, sans-serif';

  // ── Background fade in ──
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  // ── Hero image animations ──
  const heroAdj = Math.max(0, frame - t.heroAppear);
  const heroScale = spring({ frame: heroAdj, fps, config: { damping: 18, stiffness: 50, mass: 1.2 } });
  const heroOpacity = interpolate(frame, [t.heroAppear, t.heroAppear + 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const heroFloat = p.hero.floatAmplitude * Math.sin(frame * 0.04);
  const heroGlow = 0.5 + Math.sin(frame * 0.06) * 0.3;

  // ── CTA ──
  const ctaOpacity = interpolate(frame, [t.ctaAppear, t.ctaAppear + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ctaPulse = 1 + Math.sin(frame * 0.1) * 0.02;

  // ── Fade out ──
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: fadeOut, overflow: 'hidden' }}>
      {/* BG */}
      <AbsoluteFill style={{
        opacity: bgOpacity,
        background: `radial-gradient(ellipse at 50% 30%, ${p.theme.bgGradient[0]} 0%, ${p.theme.bgGradient[1]} 45%, ${p.theme.bgGradient[2]} 100%)`,
      }} />

      {/* Mesh gradient blobs */}
      {p.theme.meshGradientEnabled && <MeshGradient accent={accent} secondary={secondary} />}

      {/* Grid */}
      {p.theme.gridEnabled && (
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: `linear-gradient(${accent}4D 1px, transparent 1px), linear-gradient(90deg, ${accent}4D 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }} />
      )}

      {/* Constellation particles */}
      {p.theme.particlesEnabled && <ConstellationParticles accent={accent} secondary={secondary} />}

      {/* Vignette */}
      {p.theme.vignetteEnabled && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)',
        }} />
      )}

      {/* Content */}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 60px',
      }}>

        {/* HERO IMAGE */}
        <div style={{
          opacity: heroOpacity,
          transform: `translateY(${heroFloat}px) scale(${heroScale}) perspective(1000px) rotateY(${p.hero.rotateY}deg)`,
          marginBottom: p.hero.marginBottom,
        }}>
          <div style={{
            position: 'relative',
            borderRadius: p.hero.borderRadius,
            overflow: 'hidden',
            boxShadow: p.hero.shadowEnabled
              ? `0 20px 60px rgba(0,0,0,0.5), 0 0 ${40 * heroGlow}px ${p.hero.glowColor}40, 0 0 ${80 * heroGlow}px ${p.hero.glowColor}20`
              : 'none',
          }}>
            <Img
              src={p.hero.imageUrl}
              style={{
                width: p.hero.width,
                height: p.hero.height,
                objectFit: 'cover',
              }}
            />
            {/* Shine sweep */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,${0.08 + Math.max(0, Math.sin(frame * 0.03 - 1)) * 0.12}) 50%, transparent 60%)`,
            }} />
          </div>
        </div>

        {/* TAGLINE */}
        {p.tagline.enabled && (
          <div style={{ marginBottom: p.tagline.marginBottom }}>
            <AnimText
              text={p.tagline.text}
              animation={p.tagline.animation}
              delay={t.taglineAppear}
              accent={accent}
              style={{
                fontSize: p.tagline.size, fontWeight: 600, fontFamily: font,
                color: accent, letterSpacing: '0.35em', textTransform: 'uppercase',
                textAlign: 'center',
              }}
            />
          </div>
        )}

        {/* HEADLINE */}
        <div style={{ textAlign: 'center', marginBottom: p.headline.marginBottom }}>
          {p.headline.line1 && (
            <div style={{ marginBottom: 10 }}>
              <AnimText
                text={p.headline.line1}
                animation={p.headline.line1Animation}
                delay={t.headlineAppear}
                accent={accent}
                style={{
                  fontSize: p.headline.line1Size, fontWeight: 300, fontFamily: font,
                  color: 'rgba(255,255,255,0.7)', textAlign: 'center',
                }}
              />
            </div>
          )}
          <AnimText
            text={p.headline.line2}
            animation={p.headline.line2Animation}
            delay={t.headlineAppear + 15}
            highlight={p.headline.highlight}
            accent={accent}
            style={{
              fontSize: p.headline.line2Size, fontWeight: 800, fontFamily: font,
              color: '#ffffff', letterSpacing: '-0.01em', textAlign: 'center',
              lineHeight: 1.15,
            }}
          />
        </div>

        {/* DESCRIPTION */}
        <div style={{ textAlign: 'center', marginBottom: p.description.marginBottom, maxWidth: 800 }}>
          <AnimText
            text={p.description.text}
            animation={p.description.animation}
            delay={t.descriptionAppear}
            accent={accent}
            style={{
              fontSize: p.description.size, fontWeight: 400, fontFamily: font,
              color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, textAlign: 'center',
            }}
          />
        </div>

        {/* FEATURE PILLS */}
        {p.features.enabled && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 12,
            justifyContent: 'center', marginBottom: p.features.marginBottom,
          }}>
            {p.features.items.map((item, i) => (
              <FeaturePill
                key={item}
                text={item}
                index={i}
                delay={t.featuresAppear}
                accent={accent}
                pillStyle={p.features.pillStyle}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        {p.cta.enabled && (
          <div style={{
            position: 'absolute', bottom: p.cta.bottomOffset,
            opacity: ctaOpacity, transform: `scale(${ctaPulse})`,
          }}>
            <div style={{
              padding: '18px 48px', borderRadius: 100,
              fontSize: 22, fontWeight: 600, fontFamily: font,
              letterSpacing: '0.15em',
              ...(p.cta.style === 'solid' ? {
                background: accent, color: '#fff',
              } : p.cta.style === 'outline' ? {
                background: 'transparent', border: `2px solid ${accent}`, color: accent,
              } : {
                background: `${accent}22`, border: `1.5px solid ${accent}66`, color: accent,
                boxShadow: `0 0 30px ${accent}33, inset 0 0 30px ${accent}11`,
              }),
            }}>
              {p.cta.text}
            </div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
