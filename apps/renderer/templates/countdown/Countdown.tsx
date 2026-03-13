import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { loadEthiopicFont, loadEthiopicFontSync, ETHIOPIC_FONT_STACK } from '../../core/fonts';

// Pre-load Ethiopic font at module level
loadEthiopicFontSync();

// ══════════════════════════════════════════════════════════════
// TEXT ANIMATION TYPES
// ══════════════════════════════════════════════════════════════

export type TextAnimation =
  | 'fadeIn'
  | 'slideUp'
  | 'typewriter'
  | 'charReveal'
  | 'glitch'
  | 'none';

// ══════════════════════════════════════════════════════════════
// CONFIGURABLE PROPS
// ══════════════════════════════════════════════════════════════

export interface CountdownProps {
  // ── Layer 1: Event Title (top) ──
  title: {
    text: string;
    size: number;
    animation: TextAnimation;
    marginBottom: number;
  };

  // ── Layer 2: Countdown Display ──
  countdown: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    showDays: boolean;
    showSeconds: boolean;
    digitSize: number;
    labelSize: number;
    separatorStyle: 'colon' | 'dots' | 'none';
    cardStyle: 'flat' | 'glass' | 'neon' | 'flip';
    marginBottom: number;
  };

  // ── Layer 3: Event Name (big headline) ──
  eventName: {
    line1: string;
    line1Size: number;
    line1Animation: TextAnimation;
    line2: string;
    line2Size: number;
    line2Animation: TextAnimation;
    highlight: string;
    marginBottom: number;
  };

  // ── Layer 4: Details ──
  details: {
    date: string;
    location: string;
    enabled: boolean;
    size: number;
    marginBottom: number;
  };

  // ── Layer 5: CTA / Badge ──
  cta: {
    text: string;
    enabled: boolean;
    style: 'pill' | 'underline' | 'glow';
    bottomOffset: number;
  };

  // ── Theme / Branding ──
  theme: {
    accentColor: string;
    secondaryAccent: string;
    bgGradient: [string, string, string];
    energyRingsEnabled: boolean;  // pulsing concentric rings
    particlesEnabled: boolean;
    auroraEnabled: boolean;       // aurora borealis effect
    vignetteEnabled: boolean;
  };

  // ── Timing (frames at 30fps) ──
  timing: {
    titleAppear: number;
    countdownAppear: number;
    eventNameAppear: number;
    detailsAppear: number;
    ctaAppear: number;
  };
}

// ── Defaults ─────────────────────────────────────────────────
export const defaultCountdownProps: CountdownProps = {
  title: {
    text: 'MARK YOUR CALENDAR',
    size: 24,
    animation: 'fadeIn' as TextAnimation,
    marginBottom: 40,
  },
  countdown: {
    days: 12,
    hours: 8,
    minutes: 45,
    seconds: 30,
    showDays: true,
    showSeconds: true,
    digitSize: 72,
    labelSize: 16,
    separatorStyle: 'colon' as const,
    cardStyle: 'neon' as const,
    marginBottom: 50,
  },
  eventName: {
    line1: 'The biggest',
    line1Size: 42,
    line1Animation: 'charReveal' as TextAnimation,
    line2: 'tech summit',
    line2Size: 64,
    line2Animation: 'slideUp' as TextAnimation,
    highlight: 'tech summit',
    marginBottom: 30,
  },
  details: {
    date: 'March 15, 2025 · 10:00 AM',
    location: 'Dubai World Trade Centre',
    enabled: true,
    size: 22,
    marginBottom: 20,
  },
  cta: {
    text: 'REGISTER NOW →',
    enabled: true,
    style: 'glow' as const,
    bottomOffset: 140,
  },
  theme: {
    accentColor: '#F59E0B',
    secondaryAccent: '#EF4444',
    bgGradient: ['#1a0a00', '#0d0500', '#050200'],
    energyRingsEnabled: true,
    particlesEnabled: true,
    auroraEnabled: true,
    vignetteEnabled: true,
  },
  timing: {
    titleAppear: 15,
    countdownAppear: 50,
    eventNameAppear: 130,
    detailsAppear: 200,
    ctaAppear: 260,
  },
};

// ══════════════════════════════════════════════════════════════
// EFFECTS
// ══════════════════════════════════════════════════════════════

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Energy rings — concentric pulsing circles
const EnergyRings: React.FC<{ accent: string; secondary: string }> = ({ accent, secondary }) => {
  const frame = useCurrentFrame();
  const rings = [
    { r: 280, width: 1.5, speed: 0.03, color: accent, opacity: 0.2 },
    { r: 350, width: 1, speed: 0.025, color: secondary, opacity: 0.12 },
    { r: 420, width: 0.8, speed: 0.02, color: accent, opacity: 0.08 },
    { r: 500, width: 0.5, speed: 0.015, color: secondary, opacity: 0.05 },
  ];

  return (
    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {rings.map((ring, i) => {
        const pulse = 1 + Math.sin(frame * ring.speed + i * 1.5) * 0.08;
        const rotation = frame * (ring.speed * 10) * (i % 2 === 0 ? 1 : -1);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: ring.r * 2 * pulse,
              height: ring.r * 2 * pulse,
              borderRadius: '50%',
              border: `${ring.width}px solid ${ring.color}`,
              opacity: ring.opacity + Math.sin(frame * ring.speed * 2) * 0.05,
              transform: `rotate(${rotation}deg)`,
              // Dashed ring for alternating
              borderStyle: i % 2 === 0 ? 'solid' : 'dashed',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Aurora effect — wavy gradient bands
const Aurora: React.FC<{ accent: string; secondary: string }> = ({ accent, secondary }) => {
  const frame = useCurrentFrame();

  const bands = [
    { y: 25, h: 200, color: accent, speed: 0.012, offset: 0 },
    { y: 35, h: 150, color: secondary, speed: 0.015, offset: 2 },
    { y: 45, h: 180, color: accent, speed: 0.01, offset: 4 },
  ];

  return (
    <AbsoluteFill style={{ overflow: 'hidden', opacity: 0.12, filter: 'blur(60px)' }}>
      {bands.map((b, i) => {
        const waveX = Math.sin(frame * b.speed + b.offset) * 20;
        const waveY = Math.cos(frame * b.speed * 0.7 + b.offset) * 10;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${-10 + waveX}%`,
              top: `${b.y + waveY}%`,
              width: '120%',
              height: b.h,
              background: `linear-gradient(90deg, transparent, ${b.color}, ${b.color}88, transparent)`,
              transform: `skewY(${Math.sin(frame * b.speed * 0.5 + i) * 3}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Rising embers / sparks
const Sparks: React.FC<{ accent: string; secondary: string }> = ({ accent, secondary }) => {
  const frame = useCurrentFrame();
  const sparks = Array.from({ length: 25 }, (_, i) => ({
    x: seededRandom(i * 7) * 100,
    startY: 90 + seededRandom(i * 13) * 20,
    size: 1.5 + seededRandom(i * 3) * 3,
    speed: 0.3 + seededRandom(i * 17) * 0.5,
    delay: seededRandom(i * 11) * 80,
    drift: (seededRandom(i * 23) - 0.5) * 0.3,
    color: seededRandom(i * 29) > 0.5 ? accent : secondary,
  }));

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {sparks.map((s, i) => {
        const adj = Math.max(0, frame - s.delay);
        const cycle = adj % 120; // loop every 4 seconds
        const y = s.startY - cycle * s.speed;
        const x = s.x + Math.sin(cycle * 0.05 + i) * 5 + cycle * s.drift;
        const opacity = y < 10 ? y / 10 : y > 80 ? 0 : 0.6;
        const flicker = 0.5 + Math.sin(adj * 0.3 + i * 7) * 0.5;

        return (
          <div key={i} style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`,
            width: s.size, height: s.size, borderRadius: '50%',
            background: s.color, opacity: opacity * flicker,
            boxShadow: `0 0 ${s.size * 4}px ${s.color}`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════
// TEXT COMPONENTS
// ══════════════════════════════════════════════════════════════

const TypewriterText: React.FC<{
  text: string; delay: number; style: React.CSSProperties; accent?: string;
}> = ({ text, delay, style, accent }) => {
  const frame = useCurrentFrame();
  const adj = Math.max(0, frame - delay);
  const charCount = Math.min(text.length, Math.floor(adj * 0.4));
  const showCursor = adj > 0 && charCount < text.length;
  const cursorBlink = Math.floor(adj / 8) % 2 === 0;
  return (
    <div style={{ ...style, whiteSpace: 'pre-wrap' }}>
      {text.slice(0, charCount)}
      {showCursor && <span style={{ opacity: cursorBlink ? 1 : 0, color: accent || '#fff', fontWeight: 100 }}>|</span>}
    </div>
  );
};

const CharRevealText: React.FC<{
  text: string; delay: number; style: React.CSSProperties;
  highlight?: string; accent?: string;
}> = ({ text, delay, style, highlight, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hlStart = highlight ? text.toLowerCase().indexOf(highlight.toLowerCase()) : -1;
  const hlEnd = hlStart >= 0 ? hlStart + highlight!.length : -1;

  return (
    <div style={{ ...style, display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
      {text.split('').map((char, i) => {
        const cd = delay + i * 2.2;
        const adj = Math.max(0, frame - cd);
        const p = spring({ frame: adj, fps, config: { damping: 12, stiffness: 200, mass: 0.3 } });
        const o = interpolate(adj, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const isHl = accent && hlStart >= 0 && i >= hlStart && i < hlEnd;
        return (
          <span key={i} style={{
            display: 'inline-block', opacity: o,
            transform: `translateY(${(1 - p) * 20}px) scale(${0.5 + p * 0.5})`,
            color: isHl ? accent : style.color,
            textShadow: isHl ? `0 0 30px ${accent}66, 0 0 60px ${accent}33` : undefined,
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
  const o = interpolate(adj, [0, 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const g = (adj > 3 && adj < 8) || (adj > 15 && adj < 18);
  const gx = g ? (seededRandom(frame * 7) - 0.5) * 12 : 0;
  const gy = g ? (seededRandom(frame * 13) - 0.5) * 6 : 0;
  return (
    <div style={{ position: 'relative' }}>
      {g && <div style={{ ...style, position: 'absolute', opacity: 0.6, color: '#00ffff', transform: `translate(${gx * 1.5}px, ${gy}px)`, filter: 'blur(1px)' }}>{text}</div>}
      {g && <div style={{ ...style, position: 'absolute', opacity: 0.6, color: accent || '#ff0040', transform: `translate(${-gx}px, ${-gy}px)`, filter: 'blur(1px)' }}>{text}</div>}
      <div style={{ ...style, opacity: o, transform: `translate(${gx}px, ${gy}px)` }}>{text}</div>
    </div>
  );
};

function highlightText(text: string, highlight: string, color: string): React.ReactNode {
  if (!highlight) return text;
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<span style={{ color, textShadow: `0 0 30px ${color}66, 0 0 60px ${color}33` }}>{text.slice(idx, idx + highlight.length)}</span>{text.slice(idx + highlight.length)}</>;
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
    case 'fadeIn': {
      const o = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      return <div style={{ ...style, opacity: o }}>{highlight && accent ? highlightText(text, highlight, accent) : text}</div>;
    }
    default: return <div style={style}>{text}</div>;
  }
};

// ══════════════════════════════════════════════════════════════
// COUNTDOWN DIGIT CARD
// ══════════════════════════════════════════════════════════════

const DigitCard: React.FC<{
  value: number; label: string; delay: number; index: number;
  digitSize: number; labelSize: number;
  cardStyle: 'flat' | 'glass' | 'neon' | 'flip';
  accent: string; secondary: string;
}> = ({ value, label, delay, index, digitSize, labelSize, cardStyle, accent, secondary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardDelay = delay + index * 6;
  const adj = Math.max(0, frame - cardDelay);
  const scale = spring({ frame: adj, fps, config: { damping: 12, stiffness: 100, mass: 0.6 } });
  const opacity = interpolate(adj, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const font = ETHIOPIC_FONT_STACK;
  const displayValue = String(value).padStart(2, '0');

  // Animated tick — value changes over time for visual interest
  const tickAdj = Math.max(0, adj - 30);
  const tickProgress = Math.min(1, tickAdj / 60);
  const displayNum = Math.round(value + (1 - tickProgress) * 5);
  const finalDisplay = String(Math.max(0, displayNum)).padStart(2, '0');

  // Pulse on the accent glow
  const glowPulse = 0.5 + Math.sin(frame * 0.08 + index * 1.2) * 0.3;

  const cardStyles: Record<string, React.CSSProperties> = {
    flat: {
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
    },
    glass: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
    },
    neon: {
      background: `${accent}08`,
      border: `1.5px solid ${accent}44`,
      boxShadow: `0 0 ${20 * glowPulse}px ${accent}22, inset 0 0 ${15 * glowPulse}px ${accent}0A`,
    },
    flip: {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    },
  };

  return (
    <div style={{
      opacity, transform: `scale(${scale})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        padding: '20px 28px', borderRadius: 16,
        position: 'relative', overflow: 'hidden',
        ...cardStyles[cardStyle],
      }}>
        {/* Flip line for flip style */}
        {cardStyle === 'flip' && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '50%',
            height: 1, background: 'rgba(0,0,0,0.3)',
          }} />
        )}
        <span style={{
          fontSize: digitSize, fontWeight: 800, fontFamily: font,
          color: '#ffffff',
          fontVariantNumeric: 'tabular-nums',
          textShadow: cardStyle === 'neon'
            ? `0 0 20px ${accent}88, 0 0 40px ${accent}44`
            : undefined,
        }}>
          {finalDisplay}
        </span>
      </div>
      <span style={{
        fontSize: labelSize, fontWeight: 500, fontFamily: font,
        color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
    </div>
  );
};

const Separator: React.FC<{
  style: 'colon' | 'dots' | 'none'; delay: number; accent: string;
}> = ({ style: sepStyle, delay, accent }) => {
  const frame = useCurrentFrame();
  const adj = Math.max(0, frame - delay);
  const opacity = interpolate(adj, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const blink = Math.floor(frame / 15) % 2 === 0;

  if (sepStyle === 'none') return null;

  return (
    <div style={{
      opacity: opacity * (blink ? 1 : 0.3),
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: sepStyle === 'dots' ? 12 : 8, padding: '0 8px',
      marginBottom: 26, // align with digit cards
    }}>
      {sepStyle === 'colon' ? (
        <span style={{ fontSize: 56, fontWeight: 700, color: accent, lineHeight: 1 }}>:</span>
      ) : (
        <>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
        </>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export const Countdown: React.FC<CountdownProps> = (rawProps) => {
  // Load Ethiopic font with delayRender for proper font loading
  loadEthiopicFont();

  const p: CountdownProps = {
    title: { ...defaultCountdownProps.title, ...rawProps?.title },
    countdown: { ...defaultCountdownProps.countdown, ...rawProps?.countdown },
    eventName: { ...defaultCountdownProps.eventName, ...rawProps?.eventName },
    details: { ...defaultCountdownProps.details, ...rawProps?.details },
    cta: { ...defaultCountdownProps.cta, ...rawProps?.cta },
    theme: { ...defaultCountdownProps.theme, ...rawProps?.theme },
    timing: { ...defaultCountdownProps.timing, ...rawProps?.timing },
  };

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = p.timing;
  const accent = p.theme.accentColor;
  const secondary = p.theme.secondaryAccent;
  const font = ETHIOPIC_FONT_STACK;

  const bgOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  // CTA
  const ctaOpacity = interpolate(frame, [t.ctaAppear, t.ctaAppear + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ctaPulse = 1 + Math.sin(frame * 0.1) * 0.015;

  // Details
  const detailsOpacity = interpolate(frame, [t.detailsAppear, t.detailsAppear + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Build countdown units
  const units: { value: number; label: string }[] = [];
  if (p.countdown.showDays) units.push({ value: p.countdown.days, label: 'Days' });
  units.push({ value: p.countdown.hours, label: 'Hours' });
  units.push({ value: p.countdown.minutes, label: 'Minutes' });
  if (p.countdown.showSeconds) units.push({ value: p.countdown.seconds, label: 'Seconds' });

  return (
    <AbsoluteFill style={{ opacity: fadeOut, overflow: 'hidden' }}>
      {/* BG */}
      <AbsoluteFill style={{
        opacity: bgOpacity,
        background: `radial-gradient(ellipse at 50% 60%, ${p.theme.bgGradient[0]} 0%, ${p.theme.bgGradient[1]} 45%, ${p.theme.bgGradient[2]} 100%)`,
      }} />

      {/* Aurora */}
      {p.theme.auroraEnabled && <Aurora accent={accent} secondary={secondary} />}

      {/* Energy rings */}
      {p.theme.energyRingsEnabled && <EnergyRings accent={accent} secondary={secondary} />}

      {/* Sparks */}
      {p.theme.particlesEnabled && <Sparks accent={accent} secondary={secondary} />}

      {/* Vignette */}
      {p.theme.vignetteEnabled && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.85) 100%)',
        }} />
      )}

      {/* Content */}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 40px',
      }}>

        {/* TITLE */}
        <div style={{ marginBottom: p.title.marginBottom }}>
          <AnimText
            text={p.title.text}
            animation={p.title.animation}
            delay={t.titleAppear}
            accent={accent}
            style={{
              fontSize: p.title.size, fontWeight: 600, fontFamily: font,
              color: accent, letterSpacing: '0.4em', textTransform: 'uppercase',
              textAlign: 'center',
            }}
          />
        </div>

        {/* COUNTDOWN */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          marginBottom: p.countdown.marginBottom,
        }}>
          {units.map((unit, i) => (
            <React.Fragment key={unit.label}>
              <DigitCard
                value={unit.value}
                label={unit.label}
                delay={t.countdownAppear}
                index={i}
                digitSize={p.countdown.digitSize}
                labelSize={p.countdown.labelSize}
                cardStyle={p.countdown.cardStyle}
                accent={accent}
                secondary={secondary}
              />
              {i < units.length - 1 && (
                <Separator
                  style={p.countdown.separatorStyle}
                  delay={t.countdownAppear + 10}
                  accent={accent}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* EVENT NAME */}
        <div style={{ textAlign: 'center', marginBottom: p.eventName.marginBottom }}>
          {p.eventName.line1 && (
            <div style={{ marginBottom: 12 }}>
              <AnimText
                text={p.eventName.line1}
                animation={p.eventName.line1Animation}
                delay={t.eventNameAppear}
                accent={accent}
                style={{
                  fontSize: p.eventName.line1Size, fontWeight: 300, fontFamily: font,
                  color: 'rgba(255,255,255,0.6)', textAlign: 'center',
                }}
              />
            </div>
          )}
          <AnimText
            text={p.eventName.line2}
            animation={p.eventName.line2Animation}
            delay={t.eventNameAppear + 15}
            highlight={p.eventName.highlight}
            accent={accent}
            style={{
              fontSize: p.eventName.line2Size, fontWeight: 800, fontFamily: font,
              color: '#ffffff', textAlign: 'center', lineHeight: 1.15,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}
          />
        </div>

        {/* DETAILS */}
        {p.details.enabled && (
          <div style={{
            opacity: detailsOpacity, textAlign: 'center',
            marginBottom: p.details.marginBottom,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <span style={{
              fontSize: p.details.size, fontWeight: 500, fontFamily: font,
              color: 'rgba(255,255,255,0.6)',
            }}>
              📅  {p.details.date}
            </span>
            <span style={{
              fontSize: p.details.size - 2, fontWeight: 400, fontFamily: font,
              color: 'rgba(255,255,255,0.4)',
            }}>
              📍  {p.details.location}
            </span>
          </div>
        )}

        {/* CTA */}
        {p.cta.enabled && (
          <div style={{
            position: 'absolute', bottom: p.cta.bottomOffset,
            opacity: ctaOpacity, transform: `scale(${ctaPulse})`,
          }}>
            {p.cta.style === 'underline' ? (
              <div style={{
                fontSize: 22, fontWeight: 500, fontFamily: font,
                color: accent, letterSpacing: '0.2em',
                borderBottom: `2px solid ${accent}`,
                paddingBottom: 4,
              }}>
                {p.cta.text}
              </div>
            ) : p.cta.style === 'pill' ? (
              <div style={{
                padding: '16px 48px', borderRadius: 100,
                background: accent, color: '#000',
                fontSize: 20, fontWeight: 700, fontFamily: font,
                letterSpacing: '0.12em',
              }}>
                {p.cta.text}
              </div>
            ) : (
              <div style={{
                padding: '16px 48px', borderRadius: 100,
                background: `${accent}18`, border: `1.5px solid ${accent}55`,
                color: accent,
                fontSize: 20, fontWeight: 600, fontFamily: font,
                letterSpacing: '0.15em',
                boxShadow: `0 0 30px ${accent}22, 0 0 60px ${accent}11`,
              }}>
                {p.cta.text}
              </div>
            )}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
