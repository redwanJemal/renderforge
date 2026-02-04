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
// BREAKING NEWS — Premium broadcast-style news alert
// Red banner + urgency animations + ticker + logo
// ══════════════════════════════════════════════════════════════

export interface BreakingNewsProps {
  // Content
  breakingLabel: string;      // "BREAKING NEWS" or "عاجل"
  headline: string;           // Main headline
  subheadline: string;        // Supporting text
  source: string;             // "Sky Sports" / "BBC" etc
  timestamp: string;          // "14:32 GMT"
  tickerText: string;         // Scrolling ticker at bottom
  category: string;           // "FOOTBALL" / "TRANSFER" etc
  bgImageUrl: string;         // Background image (blurred)

  // Logo
  logoUrl: string;
  logoSize: number;

  // Theme
  theme: {
    primaryColor: string;       // Main brand color (red)
    secondaryColor: string;     // Accent
    bannerGradient: [string, string];
    textColor: string;
    darkBg: string;
    urgencyPulse: boolean;      // Pulsing red glow
    particlesEnabled: boolean;
  };
}

export const defaultBreakingNewsProps: BreakingNewsProps = {
  breakingLabel: 'BREAKING NEWS',
  headline: 'MAJOR TRANSFER\nCONFIRMED',
  subheadline: 'Star striker signs record-breaking deal worth €150M with the defending champions',
  source: 'SPORTS NETWORK',
  timestamp: '14:32 GMT',
  tickerText: '⚡ BREAKING: Record transfer confirmed • Official announcement expected within hours • Medical completed this morning • Five-year contract signed • Club confirms record fee •',
  category: 'TRANSFER',
  bgImageUrl: '',

  logoUrl: 'https://placehold.co/200x200/dc2626/ffffff?text=SN',
  logoSize: 70,

  theme: {
    primaryColor: '#dc2626',
    secondaryColor: '#fbbf24',
    bannerGradient: ['#dc2626', '#991b1b'],
    textColor: '#ffffff',
    darkBg: '#0a0a0a',
    urgencyPulse: true,
    particlesEnabled: true,
  },
};

// ── Helpers ──────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Urgency particles (red sparks)
const UrgencyParticles: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const particles = Array.from({ length: 15 }, (_, i) => ({
    x: seededRandom(i * 7) * 100,
    y: seededRandom(i * 13) * 100,
    size: 1 + seededRandom(i * 3) * 2,
    speed: 0.5 + seededRandom(i * 17) * 1.5,
    opacity: 0.1 + seededRandom(i * 23) * 0.15,
  }));

  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        const x = p.x + Math.sin(frame * 0.02 * p.speed + i) * 5;
        const y = ((p.y - frame * p.speed * 0.15) % 110 + 110) % 110 - 5;
        return (
          <div key={i} style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            background: i % 2 === 0 ? color : '#ffffff',
            opacity: p.opacity * (0.5 + Math.sin(frame * 0.08 + i * 2) * 0.5),
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

export const BreakingNews: React.FC<BreakingNewsProps> = (rawProps) => {
  const p: BreakingNewsProps = {
    ...defaultBreakingNewsProps,
    ...rawProps,
    theme: { ...defaultBreakingNewsProps.theme, ...rawProps?.theme },
  };

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const font = 'SF Pro Display, -apple-system, Helvetica Neue, sans-serif';

  // ── Animations ──

  // Red flash intro (frames 0-15)
  const flashOpacity = interpolate(frame, [0, 3, 8, 15], [0, 0.8, 0.3, 0], {
    extrapolateRight: 'clamp',
  });

  // Breaking banner slam in
  const bannerDelay = 8;
  const bannerSpring = spring({
    frame: Math.max(0, frame - bannerDelay),
    fps,
    config: { damping: 8, stiffness: 150, mass: 0.5 },
  });
  const bannerScale = interpolate(bannerSpring, [0, 1], [3, 1]);
  const bannerOpacity = interpolate(frame, [bannerDelay, bannerDelay + 5], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Category tag
  const catDelay = 25;
  const catSpring = spring({
    frame: Math.max(0, frame - catDelay),
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.5 },
  });

  // Headline entrance
  const headDelay = 35;
  const headSpring = spring({
    frame: Math.max(0, frame - headDelay),
    fps,
    config: { damping: 14, stiffness: 60, mass: 0.8 },
  });
  const headOpacity = interpolate(frame, [headDelay, headDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const headY = interpolate(headSpring, [0, 1], [80, 0]);

  // Subheadline
  const subDelay = 65;
  const subOpacity = interpolate(frame, [subDelay, subDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const subY = interpolate(frame, [subDelay, subDelay + 20], [30, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Divider line
  const divDelay = 55;
  const divWidth = interpolate(frame, [divDelay, divDelay + 20], [0, 100], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Source / timestamp
  const srcDelay = 90;
  const srcOpacity = interpolate(frame, [srcDelay, srcDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Ticker bar
  const tickerDelay = 100;
  const tickerOpacity = interpolate(frame, [tickerDelay, tickerDelay + 10], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const tickerX = interpolate(frame, [tickerDelay, durationInFrames], [1100, -2000], {
    extrapolateRight: 'clamp',
  });

  // Urgency pulse
  const pulseOpacity = p.theme.urgencyPulse
    ? 0.03 + Math.sin(frame * 0.15) * 0.03
    : 0;

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 25, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: p.theme.darkBg, opacity: fadeOut, overflow: 'hidden' }}>
      {/* Background image (blurred) */}
      {p.bgImageUrl && (
        <AbsoluteFill style={{ filter: 'blur(30px) brightness(0.3)', overflow: 'hidden' }}>
          <Img src={p.bgImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      )}

      {/* Urgency pulse overlay */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at center, ${p.theme.primaryColor}, transparent 70%)`,
        opacity: pulseOpacity,
      }} />

      {/* Red flash */}
      <AbsoluteFill style={{ background: p.theme.primaryColor, opacity: flashOpacity }} />

      {/* Particles */}
      {p.theme.particlesEnabled && <UrgencyParticles color={p.theme.primaryColor} />}

      {/* Top bar — logo + source */}
      <div style={{
        position: 'absolute', top: 60, left: 50, right: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        opacity: srcOpacity,
      }}>
        {p.logoUrl && (
          <Img src={p.logoUrl} style={{ width: p.logoSize, height: p.logoSize, objectFit: 'contain', borderRadius: 12 }}
            onError={() => {}} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontFamily: font, fontSize: 22, fontWeight: 600, color: p.theme.textColor, opacity: 0.7 }}>
            {p.source}
          </span>
          <span style={{ fontFamily: font, fontSize: 18, fontWeight: 400, color: p.theme.textColor, opacity: 0.4 }}>
            {p.timestamp}
          </span>
        </div>
      </div>

      {/* BREAKING NEWS banner */}
      <div style={{
        position: 'absolute',
        top: 500,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${p.theme.bannerGradient[0]}, ${p.theme.bannerGradient[1]})`,
          padding: '18px 60px',
          opacity: bannerOpacity,
          transform: `scale(${bannerScale})`,
          boxShadow: `0 0 60px ${p.theme.primaryColor}60`,
        }}>
          <span style={{
            fontFamily: font, fontSize: 52, fontWeight: 900,
            color: p.theme.textColor, letterSpacing: '0.2em',
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}>
            {p.breakingLabel}
          </span>
        </div>
      </div>

      {/* Category pill */}
      <div style={{
        position: 'absolute',
        top: 600,
        left: '50%',
        transform: `translateX(-50%) scale(${catSpring})`,
        background: p.theme.secondaryColor,
        padding: '6px 30px',
        borderRadius: 20,
      }}>
        <span style={{
          fontFamily: font, fontSize: 22, fontWeight: 700,
          color: p.theme.darkBg, letterSpacing: '0.15em',
        }}>
          {p.category}
        </span>
      </div>

      {/* Main headline */}
      <div style={{
        position: 'absolute',
        top: 680,
        left: 50,
        right: 50,
        opacity: headOpacity,
        transform: `translateY(${headY}px)`,
      }}>
        <div style={{
          fontFamily: font, fontSize: 96, fontWeight: 900,
          color: p.theme.textColor, lineHeight: 1.05,
          textAlign: 'center', whiteSpace: 'pre-line',
          textShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          {p.headline}
        </div>
      </div>

      {/* Divider */}
      <div style={{
        position: 'absolute',
        top: 960,
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${divWidth}%`,
        maxWidth: 600,
        height: 3,
        background: `linear-gradient(90deg, transparent, ${p.theme.primaryColor}, transparent)`,
      }} />

      {/* Subheadline */}
      <div style={{
        position: 'absolute',
        top: 990,
        left: 70,
        right: 70,
        opacity: subOpacity,
        transform: `translateY(${subY}px)`,
      }}>
        <div style={{
          fontFamily: font, fontSize: 38, fontWeight: 400,
          color: p.theme.textColor, opacity: 0.8,
          lineHeight: 1.4, textAlign: 'center',
        }}>
          {p.subheadline}
        </div>
      </div>

      {/* Bottom ticker bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        background: `linear-gradient(90deg, ${p.theme.bannerGradient[0]}, ${p.theme.bannerGradient[1]})`,
        opacity: tickerOpacity,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
        {/* Live dot */}
        <div style={{
          width: 50, height: '100%', background: p.theme.darkBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2,
        }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: '#ff0000',
            boxShadow: '0 0 10px #ff0000',
            opacity: 0.7 + Math.sin(frame * 0.2) * 0.3,
          }} />
        </div>
        <div style={{
          fontFamily: font, fontSize: 26, fontWeight: 600,
          color: p.theme.textColor, whiteSpace: 'nowrap',
          transform: `translateX(${tickerX}px)`,
          letterSpacing: '0.03em',
        }}>
          {p.tickerText}
        </div>
      </div>

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
        pointerEvents: 'none',
      }} />
    </AbsoluteFill>
  );
};
