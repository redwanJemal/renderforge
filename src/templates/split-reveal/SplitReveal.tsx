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
// SPLIT REVEAL — Dramatic wipe/split transition
// Before → After, or dual-panel comparison
// ══════════════════════════════════════════════════════════════

export type TextAnimation = 'fadeIn' | 'slideUp' | 'typewriter' | 'charReveal' | 'none';
export type SplitDirection = 'horizontal' | 'vertical' | 'diagonal';

export interface SplitRevealProps {
  // ── Panel A (left/top — "before") ──
  panelA: {
    imageUrl: string;
    label: string;
    labelSize: number;
    labelColor: string;     // hex or 'auto'
    overlayColor: string;   // tint overlay
    overlayOpacity: number;
  };

  // ── Panel B (right/bottom — "after") ──
  panelB: {
    imageUrl: string;
    label: string;
    labelSize: number;
    labelColor: string;
    overlayColor: string;
    overlayOpacity: number;
  };

  // ── Split Line ──
  split: {
    direction: SplitDirection;
    lineWidth: number;
    lineColor: string;       // 'accent' or hex
    glowEnabled: boolean;
    arrowsEnabled: boolean;
  };

  // ── Header (above the split) ──
  header: {
    text: string;
    size: number;
    animation: TextAnimation;
    enabled: boolean;
    marginBottom: number;
  };

  // ── Footer / CTA ──
  footer: {
    text: string;
    size: number;
    enabled: boolean;
    bottomOffset: number;
  };

  // ── Theme ──
  theme: {
    accentColor: string;
    bgColor: string;
    particlesEnabled: boolean;
    vignetteEnabled: boolean;
  };

  // ── Timing ──
  timing: {
    panelAAppear: number;
    splitStart: number;      // when the split line begins moving
    panelBReveal: number;    // when panel B is fully revealed
    headerAppear: number;
    footerAppear: number;
  };
}

// ── Defaults ─────────────────────────────────────────────────
export const defaultSplitRevealProps: SplitRevealProps = {
  panelA: {
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080',
    label: 'BEFORE',
    labelSize: 28,
    labelColor: '#ffffff',
    overlayColor: '#000000',
    overlayOpacity: 0.3,
  },
  panelB: {
    imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1080',
    label: 'AFTER',
    labelSize: 28,
    labelColor: '#ffffff',
    overlayColor: '#000000',
    overlayOpacity: 0.15,
  },
  split: {
    direction: 'horizontal' as SplitDirection,
    lineWidth: 4,
    lineColor: 'accent',
    glowEnabled: true,
    arrowsEnabled: true,
  },
  header: {
    text: 'THE TRANSFORMATION',
    size: 42,
    animation: 'fadeIn' as TextAnimation,
    enabled: true,
    marginBottom: 30,
  },
  footer: {
    text: 'SEE THE DIFFERENCE →',
    size: 24,
    enabled: true,
    bottomOffset: 120,
  },
  theme: {
    accentColor: '#FF3366',
    bgColor: '#0a0a0a',
    particlesEnabled: false,
    vignetteEnabled: true,
  },
  timing: {
    panelAAppear: 15,
    splitStart: 60,
    panelBReveal: 140,
    headerAppear: 160,
    footerAppear: 200,
  },
};

// ══════════════════════════════════════════════════════════════
// TEXT COMPONENT
// ══════════════════════════════════════════════════════════════

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

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
      const font = style.fontFamily || 'SF Pro Display, -apple-system, Helvetica, sans-serif';
      return (
        <div style={{ ...style, display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          {text.split('').map((char, i) => {
            const cd = delay + i * 2;
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
    case 'typewriter': {
      const adj = Math.max(0, frame - delay);
      const count = Math.min(text.length, Math.floor(adj * 0.4));
      const cursor = adj > 0 && count < text.length && Math.floor(adj / 8) % 2 === 0;
      return (
        <div style={style}>
          {text.slice(0, count)}{cursor && <span style={{ fontWeight: 100 }}>|</span>}
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
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export const SplitReveal: React.FC<SplitRevealProps> = (rawProps) => {
  const p: SplitRevealProps = {
    panelA: { ...defaultSplitRevealProps.panelA, ...rawProps?.panelA },
    panelB: { ...defaultSplitRevealProps.panelB, ...rawProps?.panelB },
    split: { ...defaultSplitRevealProps.split, ...rawProps?.split },
    header: { ...defaultSplitRevealProps.header, ...rawProps?.header },
    footer: { ...defaultSplitRevealProps.footer, ...rawProps?.footer },
    theme: { ...defaultSplitRevealProps.theme, ...rawProps?.theme },
    timing: { ...defaultSplitRevealProps.timing, ...rawProps?.timing },
  };

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = p.timing;
  const accent = p.split.lineColor === 'accent' ? p.theme.accentColor : p.split.lineColor;
  const font = 'SF Pro Display, -apple-system, Helvetica, sans-serif';

  // Panel A fade in
  const panelAOpacity = interpolate(frame, [t.panelAAppear, t.panelAAppear + 25], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Split progress: 0 = all panel A, 1 = 50/50
  const splitProgress = interpolate(frame, [t.splitStart, t.panelBReveal], [0, 0.5], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic
  });

  // Split line position (percentage)
  const splitPos = (1 - splitProgress) * 100;

  // Label animations
  const labelAOpacity = interpolate(frame, [t.panelAAppear + 15, t.panelAAppear + 35], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const labelBOpacity = interpolate(frame, [t.panelBReveal - 20, t.panelBReveal], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Footer
  const footerOpacity = interpolate(frame, [t.footerAppear, t.footerAppear + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Line glow pulse
  const glowPulse = p.split.glowEnabled ? 0.5 + Math.sin(frame * 0.08) * 0.3 : 0;

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 25, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const isHorizontal = p.split.direction === 'horizontal';

  return (
    <AbsoluteFill style={{ opacity: fadeOut, overflow: 'hidden', background: p.theme.bgColor }}>

      {/* Panel A — Full background */}
      <AbsoluteFill style={{ opacity: panelAOpacity }}>
        <Img src={p.panelA.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <AbsoluteFill style={{ background: p.panelA.overlayColor, opacity: p.panelA.overlayOpacity }} />
        {/* Label A */}
        <div style={{
          position: 'absolute',
          left: isHorizontal ? '12%' : '50%',
          top: isHorizontal ? '50%' : '25%',
          transform: 'translate(-50%, -50%)',
          opacity: labelAOpacity,
          fontSize: p.panelA.labelSize,
          fontWeight: 700,
          fontFamily: font,
          color: p.panelA.labelColor,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          textShadow: '0 2px 20px rgba(0,0,0,0.5)',
        }}>
          {p.panelA.label}
        </div>
      </AbsoluteFill>

      {/* Panel B — Revealed by clip */}
      <AbsoluteFill style={{
        clipPath: isHorizontal
          ? `inset(0 0 0 ${splitPos}%)`
          : `inset(${splitPos}% 0 0 0)`,
      }}>
        <Img src={p.panelB.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <AbsoluteFill style={{ background: p.panelB.overlayColor, opacity: p.panelB.overlayOpacity }} />
        {/* Label B */}
        <div style={{
          position: 'absolute',
          left: isHorizontal ? '88%' : '50%',
          top: isHorizontal ? '50%' : '75%',
          transform: 'translate(-50%, -50%)',
          opacity: labelBOpacity,
          fontSize: p.panelB.labelSize,
          fontWeight: 700,
          fontFamily: font,
          color: p.panelB.labelColor,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          textShadow: '0 2px 20px rgba(0,0,0,0.5)',
        }}>
          {p.panelB.label}
        </div>
      </AbsoluteFill>

      {/* Split Line */}
      {splitProgress > 0.01 && (
        <div style={{
          position: 'absolute',
          ...(isHorizontal ? {
            left: `${splitPos}%`,
            top: 0,
            width: p.split.lineWidth,
            height: '100%',
            transform: 'translateX(-50%)',
          } : {
            top: `${splitPos}%`,
            left: 0,
            height: p.split.lineWidth,
            width: '100%',
            transform: 'translateY(-50%)',
          }),
          background: accent,
          boxShadow: p.split.glowEnabled
            ? `0 0 ${20 * glowPulse}px ${accent}, 0 0 ${40 * glowPulse}px ${accent}66`
            : 'none',
          zIndex: 10,
        }}>
          {/* Arrows */}
          {p.split.arrowsEnabled && (
            <>
              <div style={{
                position: 'absolute',
                ...(isHorizontal ? {
                  left: -16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                } : {
                  top: -16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                }),
                fontSize: 20,
                color: accent,
                fontWeight: 700,
                textShadow: `0 0 10px ${accent}`,
              }}>
                {isHorizontal ? '◄' : '▲'}
              </div>
              <div style={{
                position: 'absolute',
                ...(isHorizontal ? {
                  right: -16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                } : {
                  bottom: -16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                }),
                fontSize: 20,
                color: accent,
                fontWeight: 700,
                textShadow: `0 0 10px ${accent}`,
              }}>
                {isHorizontal ? '►' : '▼'}
              </div>
            </>
          )}
        </div>
      )}

      {/* Vignette */}
      {p.theme.vignetteEnabled && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
          zIndex: 15,
          pointerEvents: 'none',
        }} />
      )}

      {/* Header */}
      {p.header.enabled && (
        <div style={{
          position: 'absolute', top: 80, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          zIndex: 20,
        }}>
          <AnimText
            text={p.header.text}
            animation={p.header.animation}
            delay={t.headerAppear}
            style={{
              fontSize: p.header.size,
              fontWeight: 800,
              fontFamily: font,
              color: '#ffffff',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textAlign: 'center',
              textShadow: '0 2px 30px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      )}

      {/* Footer */}
      {p.footer.enabled && (
        <div style={{
          position: 'absolute', bottom: p.footer.bottomOffset,
          left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          opacity: footerOpacity,
          zIndex: 20,
        }}>
          <div style={{
            padding: '14px 40px', borderRadius: 100,
            background: `${accent}22`, border: `1.5px solid ${accent}55`,
            color: accent,
            fontSize: p.footer.size,
            fontWeight: 600,
            fontFamily: font,
            letterSpacing: '0.15em',
            boxShadow: `0 0 25px ${accent}22`,
          }}>
            {p.footer.text}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
