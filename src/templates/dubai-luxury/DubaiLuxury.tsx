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
// DUBAI LUXURY — Premium real estate / lifestyle / brand promo
// Gold accents, sleek animations, luxury feel
// Targeting UAE/Dubai audience — English + Arabic support
// ══════════════════════════════════════════════════════════════

export interface DubaiLuxuryProps {
  // Content
  tagline: string;         // "EXCLUSIVE LIVING" / "حياة حصرية"
  headline: string;        // "THE PINNACLE\nOF LUXURY"
  subheadline: string;     // Description text
  price: string;           // "AED 12,500,000" or ""
  location: string;        // "Palm Jumeirah, Dubai"
  features: string[];      // ["5 Bedrooms", "Private Pool", "Full Marina View"]
  ctaText: string;         // "BOOK VIEWING" / "احجز معاينة"
  bgImageUrl: string;      // Hero image (property / skyline)

  // Branding
  logoUrl: string;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoSize: number;

  // Direction
  rtl: boolean;            // For Arabic text

  // Theme
  theme: {
    goldPrimary: string;
    goldSecondary: string;
    bgColor: string;
    overlayOpacity: number;
    textColor: string;
    luxuryFont: boolean;    // Use serif-style for headlines
    particlesEnabled: boolean;
    borderStyle: 'gold-line' | 'ornate' | 'minimal';
  };
}

export const defaultDubaiLuxuryProps: DubaiLuxuryProps = {
  tagline: 'EXCLUSIVE LIVING',
  headline: 'THE PINNACLE\nOF LUXURY',
  subheadline: 'An extraordinary residence offering unparalleled views of the Dubai Marina skyline and Arabian Gulf',
  price: 'AED 12,500,000',
  location: 'Palm Jumeirah, Dubai',
  features: ['5 Bedrooms', 'Private Pool', 'Full Marina View', 'Smart Home'],
  ctaText: 'BOOK PRIVATE VIEWING →',
  bgImageUrl: '',

  logoUrl: 'https://placehold.co/200x200/c4a43e/000000?text=LUX',
  logoPosition: 'top-left',
  logoSize: 70,

  rtl: false,

  theme: {
    goldPrimary: '#c4a43e',
    goldSecondary: '#e8d48b',
    bgColor: '#0a0a0a',
    overlayOpacity: 0.7,
    textColor: '#ffffff',
    luxuryFont: true,
    particlesEnabled: true,
    borderStyle: 'gold-line',
  },
};

// ── Helpers ──────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Gold dust particles
const GoldDust: React.FC<{ gold: string }> = ({ gold }) => {
  const frame = useCurrentFrame();
  const particles = Array.from({ length: 25 }, (_, i) => ({
    x: seededRandom(i * 7) * 100,
    y: seededRandom(i * 13) * 100,
    size: 1 + seededRandom(i * 3) * 3,
    speed: 0.3 + seededRandom(i * 17) * 0.8,
    opacity: 0.05 + seededRandom(i * 23) * 0.15,
    shimmer: seededRandom(i * 29) * Math.PI * 2,
  }));

  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        const x = p.x + Math.sin(frame * 0.008 * p.speed + i) * 5;
        const y = ((p.y - frame * p.speed * 0.05) % 110 + 110) % 110 - 5;
        const shimmerOpacity = p.opacity * (0.3 + Math.sin(frame * 0.06 + p.shimmer) * 0.7);
        return (
          <div key={i} style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            background: `radial-gradient(circle, ${gold}, transparent)`,
            opacity: shimmerOpacity,
            boxShadow: `0 0 ${p.size * 2}px ${gold}40`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// Ornate gold corner (CSS-only)
const GoldCorner: React.FC<{
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  gold: string;
  opacity: number;
}> = ({ position, gold, opacity }) => {
  const size = 80;
  const pos: React.CSSProperties = {
    position: 'absolute',
    width: size, height: size,
    ...(position === 'top-left' && { top: 40, left: 40 }),
    ...(position === 'top-right' && { top: 40, right: 40 }),
    ...(position === 'bottom-left' && { bottom: 40, left: 40 }),
    ...(position === 'bottom-right' && { bottom: 40, right: 40 }),
  };

  const borderStyle: React.CSSProperties = {
    ...(position.includes('top') && { borderTop: `2px solid ${gold}` }),
    ...(position.includes('bottom') && { borderBottom: `2px solid ${gold}` }),
    ...(position.includes('left') && { borderLeft: `2px solid ${gold}` }),
    ...(position.includes('right') && { borderRight: `2px solid ${gold}` }),
  };

  return <div style={{ ...pos, ...borderStyle, opacity }} />;
};

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

export const DubaiLuxury: React.FC<DubaiLuxuryProps> = (rawProps) => {
  const p: DubaiLuxuryProps = {
    ...defaultDubaiLuxuryProps,
    ...rawProps,
    theme: { ...defaultDubaiLuxuryProps.theme, ...rawProps?.theme },
  };

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const headlineFont = p.theme.luxuryFont
    ? 'Georgia, Times New Roman, serif'
    : 'SF Pro Display, -apple-system, Helvetica, sans-serif';
  const bodyFont = 'SF Pro Display, -apple-system, Helvetica, sans-serif';
  const dir = p.rtl ? 'rtl' : 'ltr';
  const gold = p.theme.goldPrimary;
  const goldLight = p.theme.goldSecondary;

  // ── Animations ──

  // Background image slow zoom (Ken Burns)
  const bgScale = interpolate(frame, [0, durationInFrames], [1.1, 1.25], {
    extrapolateRight: 'clamp',
  });

  // Fade in
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Gold corners
  const cornerDelay = 10;
  const cornerOpacity = interpolate(frame, [cornerDelay, cornerDelay + 20], [0, 0.6], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Tagline
  const tagDelay = 20;
  const tagSpring = spring({
    frame: Math.max(0, frame - tagDelay),
    fps,
    config: { damping: 16, stiffness: 60, mass: 0.7 },
  });
  const tagOpacity = interpolate(frame, [tagDelay, tagDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Gold divider line
  const divDelay = 30;
  const divWidth = interpolate(frame, [divDelay, divDelay + 25], [0, 100], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Headline
  const headDelay = 40;
  const headSpring = spring({
    frame: Math.max(0, frame - headDelay),
    fps,
    config: { damping: 14, stiffness: 50, mass: 0.9 },
  });
  const headOpacity = interpolate(frame, [headDelay, headDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const headY = interpolate(headSpring, [0, 1], [60, 0]);

  // Subheadline
  const subDelay = 70;
  const subOpacity = interpolate(frame, [subDelay, subDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Features
  const featDelay = 100;

  // Price
  const priceDelay = 140;
  const priceSpring = spring({
    frame: Math.max(0, frame - priceDelay),
    fps,
    config: { damping: 10, stiffness: 120, mass: 0.5 },
  });

  // Location
  const locDelay = 155;
  const locOpacity = interpolate(frame, [locDelay, locDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // CTA
  const ctaDelay = 175;
  const ctaSpring = spring({
    frame: Math.max(0, frame - ctaDelay),
    fps,
    config: { damping: 8, stiffness: 100, mass: 0.5 },
  });
  const ctaOpacity = interpolate(frame, [ctaDelay, ctaDelay + 10], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Gold shimmer on headline
  const shimmerX = interpolate(frame, [headDelay + 20, headDelay + 60], [-100, 200], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 25, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{
      backgroundColor: p.theme.bgColor,
      opacity: fadeOut,
      overflow: 'hidden',
      direction: dir,
    }}>
      {/* Background image with Ken Burns */}
      {p.bgImageUrl && (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <Img src={p.bgImageUrl} style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: `scale(${bgScale})`,
            opacity: fadeIn,
          }} onError={() => {}} />
          <AbsoluteFill style={{
            background: `linear-gradient(180deg, ${p.theme.bgColor}${Math.round(p.theme.overlayOpacity * 255).toString(16).padStart(2, '0')}, ${p.theme.bgColor}ee)`,
          }} />
        </AbsoluteFill>
      )}

      {/* Without bg image — subtle gradient */}
      {!p.bgImageUrl && (
        <AbsoluteFill style={{
          background: `linear-gradient(180deg, #0f0f0f 0%, ${p.theme.bgColor} 30%, #080808 100%)`,
          opacity: fadeIn,
        }} />
      )}

      {/* Gold dust particles */}
      {p.theme.particlesEnabled && <GoldDust gold={gold} />}

      {/* Gold corners */}
      {p.theme.borderStyle === 'ornate' && (
        <>
          <GoldCorner position="top-left" gold={gold} opacity={cornerOpacity} />
          <GoldCorner position="top-right" gold={gold} opacity={cornerOpacity} />
          <GoldCorner position="bottom-left" gold={gold} opacity={cornerOpacity} />
          <GoldCorner position="bottom-right" gold={gold} opacity={cornerOpacity} />
        </>
      )}

      {/* Gold border lines */}
      {p.theme.borderStyle === 'gold-line' && (
        <div style={{
          position: 'absolute', inset: 30,
          border: `1px solid ${gold}20`,
          opacity: cornerOpacity,
          pointerEvents: 'none',
        }} />
      )}

      {/* Content */}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 70px',
        gap: 0,
      }}>
        {/* Tagline */}
        <div style={{
          opacity: tagOpacity,
          transform: `translateY(${interpolate(tagSpring, [0, 1], [20, 0])}px)`,
          marginBottom: 15,
        }}>
          <span style={{
            fontFamily: bodyFont, fontSize: 26, fontWeight: 600,
            color: gold, letterSpacing: '0.4em',
          }}>
            {p.tagline}
          </span>
        </div>

        {/* Gold divider */}
        <div style={{
          width: `${divWidth}%`, maxWidth: 120,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${gold}, transparent)`,
          marginBottom: 30,
        }} />

        {/* Headline with gold shimmer */}
        <div style={{
          opacity: headOpacity,
          transform: `translateY(${headY}px)`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            fontFamily: headlineFont, fontSize: 80, fontWeight: 700,
            color: p.theme.textColor, textAlign: 'center',
            lineHeight: 1.1, whiteSpace: 'pre-line',
            letterSpacing: '0.05em',
          }}>
            {p.headline}
          </div>
          {/* Shimmer overlay */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: `linear-gradient(105deg, transparent 30%, ${goldLight}30 50%, transparent 70%)`,
            transform: `translateX(${shimmerX}%)`,
            pointerEvents: 'none',
          }} />
        </div>

        {/* Subheadline */}
        <div style={{
          opacity: subOpacity, marginTop: 30,
          maxWidth: 800,
        }}>
          <div style={{
            fontFamily: bodyFont, fontSize: 30, fontWeight: 300,
            color: p.theme.textColor, opacity: 0.7,
            textAlign: 'center', lineHeight: 1.5,
          }}>
            {p.subheadline}
          </div>
        </div>

        {/* Features */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 16,
          justifyContent: 'center', marginTop: 40,
        }}>
          {p.features.map((feat, i) => {
            const fDelay = featDelay + i * 8;
            const fOpacity = interpolate(frame, [fDelay, fDelay + 12], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            const fScale = spring({
              frame: Math.max(0, frame - fDelay),
              fps,
              config: { damping: 12, stiffness: 100, mass: 0.4 },
            });
            return (
              <div key={i} style={{
                opacity: fOpacity,
                transform: `scale(${fScale})`,
                border: `1px solid ${gold}40`,
                padding: '10px 24px',
                borderRadius: 6,
                background: `${gold}08`,
              }}>
                <span style={{
                  fontFamily: bodyFont, fontSize: 22, fontWeight: 500,
                  color: goldLight, letterSpacing: '0.05em',
                }}>
                  {feat}
                </span>
              </div>
            );
          })}
        </div>

        {/* Price */}
        {p.price && (
          <div style={{
            marginTop: 45,
            transform: `scale(${priceSpring})`,
            opacity: priceSpring,
          }}>
            <span style={{
              fontFamily: headlineFont, fontSize: 52, fontWeight: 700,
              color: gold,
              textShadow: `0 0 30px ${gold}30`,
            }}>
              {p.price}
            </span>
          </div>
        )}

        {/* Location */}
        <div style={{ opacity: locOpacity, marginTop: 12 }}>
          <span style={{
            fontFamily: bodyFont, fontSize: 24, fontWeight: 400,
            color: p.theme.textColor, opacity: 0.5,
            letterSpacing: '0.08em',
          }}>
            📍 {p.location}
          </span>
        </div>

        {/* CTA button */}
        <div style={{
          marginTop: 50,
          opacity: ctaOpacity,
          transform: `scale(${interpolate(ctaSpring, [0, 1], [0.8, 1])})`,
        }}>
          <div style={{
            border: `2px solid ${gold}`,
            padding: '18px 50px',
            borderRadius: 0,
            background: `linear-gradient(135deg, ${gold}15, ${gold}05)`,
          }}>
            <span style={{
              fontFamily: bodyFont, fontSize: 26, fontWeight: 700,
              color: gold, letterSpacing: '0.2em',
            }}>
              {p.ctaText}
            </span>
          </div>
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

      {/* Bottom gold accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${gold}, transparent)`,
        opacity: 0.4,
      }} />
    </AbsoluteFill>
  );
};
