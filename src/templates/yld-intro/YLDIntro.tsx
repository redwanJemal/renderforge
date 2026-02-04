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

// ── Branding Props ───────────────────────────────────────────
export interface YLDIntroProps {
  logoFile: string;         // filename in public/
  accentColor: string;      // e.g. "#22c55e"
  bgColorStart: string;     // radial gradient start
  bgColorMid: string;       // radial gradient mid
  bgColorEnd: string;       // radial gradient end
  titleLine1: string;
  titleLine2: string;
  highlightWord: string;    // word in titleLine2 to highlight
  subtitle: string;
  badgeText: string;
  ctaText: string;
}

export const defaultYLDProps: YLDIntroProps = {
  logoFile: 'yld-logo-white.png',
  accentColor: '#22c55e',
  bgColorStart: '#0a2e1a',
  bgColorMid: '#071a10',
  bgColorEnd: '#020a05',
  titleLine1: 'What would you build',
  titleLine2: 'with your last dollar?',
  highlightWord: 'last dollar',
  subtitle: 'Real engineers. Zero budget.\nBuilding from nothing to something.',
  badgeText: 'The Challenge Begins',
  ctaText: 'FOLLOW THE JOURNEY →',
};

// ── Particle System ──────────────────────────────────────────
const Particle: React.FC<{
  x: number; y: number; size: number; delay: number;
  speed: number; opacity: number; accentColor: string;
}> = ({ x, y, size, delay, speed, opacity, accentColor }) => {
  const frame = useCurrentFrame();
  const adj = Math.max(0, frame - delay);
  const yOff = adj * speed * -0.4;
  const drift = Math.sin(adj * 0.02 + x) * 15;
  const fadeIn = interpolate(adj, [0, 30], [0, opacity], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [220, 260], [1, 0], {
    extrapolateRight: 'clamp', extrapolateLeft: 'clamp',
  });
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      width: size, height: size, borderRadius: '50%',
      background: accentColor.replace(')', ', 0.6)').replace('rgb', 'rgba'),
      filter: `blur(${size > 4 ? 2 : 0}px)`,
      opacity: fadeIn * fadeOut,
      transform: `translateY(${yOff}px) translateX(${drift}px)`,
      boxShadow: `0 0 ${size * 2}px ${accentColor.replace(')', ', 0.3)').replace('rgb', 'rgba')}`,
    }} />
  );
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const Particles: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    x: seededRandom(i * 7) * 100,
    y: 30 + seededRandom(i * 13) * 70,
    size: 2 + seededRandom(i * 3) * 5,
    delay: seededRandom(i * 11) * 40,
    speed: 0.2 + seededRandom(i * 17) * 0.5,
    opacity: 0.2 + seededRandom(i * 23) * 0.5,
  }));
  return <>{particles.map((p, i) => <Particle key={i} {...p} accentColor={accentColor} />)}</>;
};

// ── Scan Line ────────────────────────────────────────────────
const ScanLine: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const yPos = interpolate(frame % 120, [0, 120], [-5, 105]);
  const opacity = interpolate(frame, [0, 20], [0, 0.12], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: `${yPos}%`, height: 2,
      background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
      opacity, filter: 'blur(1px)',
    }} />
  );
};

// ── Highlight text helper ────────────────────────────────────
function highlightText(text: string, highlight: string, color: string) {
  if (!highlight) return text;
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + highlight.length);
  const after = text.slice(idx + highlight.length);
  return (
    <>
      {before}
      <span style={{ color, textShadow: `0 0 30px ${color}66` }}>{match}</span>
      {after}
    </>
  );
}

// ── Main Component ───────────────────────────────────────────
export const YLDIntro: React.FC<YLDIntroProps> = (props) => {
  const p = { ...defaultYLDProps, ...props };
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const accent = p.accentColor;

  // Background
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  // SCENE 1: Logo big & centered (frames 0–110)
  const logoDelay = 15;
  const logoScale = spring({
    frame: Math.max(0, frame - logoDelay), fps,
    config: { damping: 15, stiffness: 60, mass: 1.0 },
  });
  const logoOpacity = interpolate(frame, [logoDelay, logoDelay + 25], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const logoPulse = Math.sin(frame * 0.06) * 0.3 + 0.7;
  // Logo transitions to top — stays readable
  const logoMoveUp = interpolate(frame, [95, 130], [0, -160], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const logoShrink = interpolate(frame, [95, 130], [1, 0.6], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // SCENE 2: Title (frames 115–175)
  const titleDelay = 115;
  const titleProgress = spring({
    frame: Math.max(0, frame - titleDelay), fps,
    config: { damping: 16, stiffness: 80, mass: 0.7 },
  });
  const titleOpacity = interpolate(frame, [titleDelay, titleDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Divider
  const divDelay = 110;
  const divWidth = interpolate(frame, [divDelay, divDelay + 25], [0, 55], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const divOpacity = interpolate(frame, [divDelay, divDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // SCENE 3: Subtitle (frames 160–220)
  const subDelay = 160;
  const subOpacity = interpolate(frame, [subDelay, subDelay + 25], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const subSlide = interpolate(frame, [subDelay, subDelay + 25], [50, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // SCENE 4: Badge + CTA (frames 200–)
  const tagDelay = 200;
  const tagScale = spring({
    frame: Math.max(0, frame - tagDelay), fps,
    config: { damping: 12, stiffness: 120, mass: 0.5 },
  });
  const tagOpacity = interpolate(frame, [tagDelay, tagDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const ctaDelay = 230;
  const ctaOpacity = interpolate(frame, [ctaDelay, ctaDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const font = 'SF Pro Display, -apple-system, Helvetica, sans-serif';

  return (
    <AbsoluteFill style={{ opacity: fadeOut, overflow: 'hidden' }}>
      {/* Background */}
      <AbsoluteFill style={{
        opacity: bgOpacity,
        background: `radial-gradient(ellipse at 50% 35%, ${p.bgColorStart} 0%, ${p.bgColorMid} 40%, ${p.bgColorEnd} 100%)`,
      }} />

      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.035,
        backgroundImage: `linear-gradient(${accent}4D 1px, transparent 1px), linear-gradient(90deg, ${accent}4D 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      <Particles accentColor={accent} />
      <ScanLine accentColor={accent} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.75) 100%)',
      }} />

      {/* Content */}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 60px',
      }}>
        {/* Logo */}
        <div style={{
          opacity: logoOpacity,
          transform: `translateY(${logoMoveUp}px) scale(${logoScale * logoShrink})`,
          filter: `drop-shadow(0 0 ${40 * logoPulse}px ${accent}80) drop-shadow(0 0 ${80 * logoPulse}px ${accent}33)`,
          marginBottom: 15,
        }}>
          <Img
            src={staticFile(p.logoFile)}
            style={{ width: 480, height: 480, objectFit: 'contain' }}
          />
        </div>

        {/* Divider */}
        <div style={{
          width: `${divWidth}%`, height: 2, opacity: divOpacity,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          marginBottom: 30,
        }} />

        {/* Title */}
        <div style={{
          opacity: titleOpacity,
          transform: `translateY(${(1 - titleProgress) * 40}px)`,
          textAlign: 'center', marginBottom: 25,
        }}>
          <div style={{
            fontSize: 40, fontWeight: 300, fontFamily: font,
            color: 'rgba(255, 255, 255, 0.55)',
            letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 14,
          }}>
            {p.titleLine1}
          </div>
          <div style={{
            fontSize: 56, fontWeight: 800, fontFamily: font,
            color: '#ffffff', letterSpacing: '0.12em',
            textTransform: 'uppercase', lineHeight: 1.2,
          }}>
            {highlightText(p.titleLine2, p.highlightWord, accent)}
          </div>
        </div>

        {/* Subtitle */}
        <div style={{
          opacity: subOpacity,
          transform: `translateY(${subSlide}px)`,
          textAlign: 'center', marginBottom: 55,
        }}>
          <div style={{
            fontSize: 30, fontWeight: 400, fontFamily: font,
            color: 'rgba(255, 255, 255, 0.45)',
            lineHeight: 1.7, maxWidth: 800, whiteSpace: 'pre-wrap',
          }}>
            {p.subtitle}
          </div>
        </div>

        {/* Badge */}
        <div style={{
          opacity: tagOpacity, transform: `scale(${tagScale})`,
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
            {p.badgeText}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          position: 'absolute', bottom: 150,
          opacity: ctaOpacity, textAlign: 'center',
        }}>
          <div style={{
            fontSize: 24, fontWeight: 500, fontFamily: font,
            color: 'rgba(255, 255, 255, 0.35)', letterSpacing: '0.2em',
          }}>
            {p.ctaText}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
