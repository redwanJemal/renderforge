import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  Img,
  staticFile,
  interpolate,
} from 'remotion';

// ══════════════════════════════════════════════════════════════
// COVER IMAGE TEMPLATE
// Renders a single-frame "video" (1 frame) to export as image
// Supports multiple social media sizes
// ══════════════════════════════════════════════════════════════

export interface CoverProps {
  logo: {
    file: string;
    size: number;
    glowEnabled: boolean;
  };
  brandName: string;
  tagline: string;
  handle: string;
  theme: {
    accentColor: string;
    secondaryAccent: string;
    bgGradient: [string, string, string];
    gridEnabled: boolean;
    vignetteEnabled: boolean;
  };
}

export const defaultCoverProps: CoverProps = {
  logo: {
    file: 'yld-logo-white.png',
    size: 320,
    glowEnabled: true,
  },
  brandName: 'YOUR LAST DOLLAR',
  tagline: 'Build Something From Nothing',
  handle: '@yourlstdollar',
  theme: {
    accentColor: '#22c55e',
    secondaryAccent: '#06b6d4',
    bgGradient: ['#0a2e1a', '#071a10', '#020a05'],
    gridEnabled: true,
    vignetteEnabled: true,
  },
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export const Cover: React.FC<CoverProps> = (rawProps) => {
  const p: CoverProps = {
    logo: { ...defaultCoverProps.logo, ...rawProps?.logo },
    brandName: rawProps?.brandName ?? defaultCoverProps.brandName,
    tagline: rawProps?.tagline ?? defaultCoverProps.tagline,
    handle: rawProps?.handle ?? defaultCoverProps.handle,
    theme: { ...defaultCoverProps.theme, ...rawProps?.theme },
  };

  const frame = useCurrentFrame();
  const accent = p.theme.accentColor;
  const font = 'SF Pro Display, -apple-system, Helvetica, sans-serif';

  // Static particles for cover
  const particles = Array.from({ length: 50 }, (_, i) => ({
    x: seededRandom(i * 7) * 100,
    y: seededRandom(i * 13) * 100,
    size: 2 + seededRandom(i * 3) * 5,
    opacity: 0.1 + seededRandom(i * 23) * 0.3,
  }));

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* Background */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${p.theme.bgGradient[0]} 0%, ${p.theme.bgGradient[1]} 45%, ${p.theme.bgGradient[2]} 100%)`,
        }}
      />

      {/* Grid */}
      {p.theme.gridEnabled && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage: `linear-gradient(${accent}4D 1px, transparent 1px), linear-gradient(90deg, ${accent}4D 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      )}

      {/* Particles (static) */}
      {particles.map((pp, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${pp.x}%`,
            top: `${pp.y}%`,
            width: pp.size,
            height: pp.size,
            borderRadius: '50%',
            background: `${accent}88`,
            opacity: pp.opacity,
            boxShadow: `0 0 ${pp.size * 2}px ${accent}66`,
            filter: pp.size > 4 ? 'blur(2px)' : 'none',
          }}
        />
      ))}

      {/* Large accent glow blob */}
      <div
        style={{
          position: 'absolute',
          width: '60%',
          height: '60%',
          left: '20%',
          top: '15%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}12 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }}
      />

      {/* Vignette */}
      {p.theme.vignetteEnabled && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.75) 100%)',
          }}
        />
      )}

      {/* Content */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div
          style={{
            marginBottom: 40,
            filter: p.logo.glowEnabled
              ? `drop-shadow(0 0 30px ${accent}80) drop-shadow(0 0 60px ${accent}33)`
              : 'none',
          }}
        >
          <Img
            src={staticFile(p.logo.file)}
            style={{
              width: p.logo.size,
              height: p.logo.size,
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Divider */}
        <div
          style={{
            width: '40%',
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            marginBottom: 35,
          }}
        />

        {/* Brand name */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            fontFamily: font,
            color: '#ffffff',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 18,
            textShadow: `0 0 40px ${accent}33`,
          }}
        >
          {p.brandName}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 30,
            fontWeight: 400,
            fontFamily: font,
            color: 'rgba(255, 255, 255, 0.5)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 40,
          }}
        >
          {p.tagline}
        </div>

        {/* Handle badge */}
        <div
          style={{
            display: 'inline-block',
            border: `1.5px solid ${accent}55`,
            borderRadius: 100,
            padding: '14px 50px',
            fontSize: 24,
            fontWeight: 600,
            fontFamily: font,
            color: accent,
            letterSpacing: '0.25em',
            background: `${accent}0A`,
            boxShadow: `0 0 30px ${accent}15`,
          }}
        >
          {p.handle}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
