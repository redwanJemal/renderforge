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
import { loadEthiopicFont, loadEthiopicFontSync, ETHIOPIC_FONT_STACK } from '../../core/fonts';

// Pre-load Ethiopic font
loadEthiopicFontSync();

// ══════════════════════════════════════════════════════════════
// RAMADAN / EID GREETING — Islamic celebration template
// Crescent moon, stars, lanterns, ornate patterns
// Bilingual (Arabic + English) support
// ══════════════════════════════════════════════════════════════

export interface RamadanGreetingProps {
  // Content
  mainGreeting: string;       // "رمضان كريم" or "Ramadan Kareem"
  subGreeting: string;        // English subtitle or Arabic detail
  message: string;            // Body message
  fromName: string;           // "From [Brand Name]"
  year: string;               // "1446 AH • 2025"

  // Branding
  logoUrl: string;
  logoSize: number;

  // Theme
  theme: {
    primaryColor: string;       // Gold
    secondaryColor: string;     // Deep green or purple
    bgGradient: [string, string, string];
    textColor: string;
    crescentColor: string;
    starsEnabled: boolean;
    lanternsEnabled: boolean;
    ornatePatternEnabled: boolean;
    glowEnabled: boolean;
  };
}

export const defaultRamadanGreetingProps: RamadanGreetingProps = {
  mainGreeting: 'رمضان كريم',
  subGreeting: 'Ramadan Kareem',
  message: 'May this holy month bring you peace, prosperity, and blessings',
  fromName: 'YOUR BRAND',
  year: '1446 AH • 2025',

  logoUrl: 'https://placehold.co/200x200/c4a43e/0d1f2d?text=★',
  logoSize: 70,

  theme: {
    primaryColor: '#c4a43e',
    secondaryColor: '#0d3b2e',
    bgGradient: ['#0d1f2d', '#0a1628', '#050d17'],
    textColor: '#ffffff',
    crescentColor: '#e8d48b',
    starsEnabled: true,
    lanternsEnabled: true,
    ornatePatternEnabled: true,
    glowEnabled: true,
  },
};

// ── Helpers ──────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Stars that twinkle
const Stars: React.FC<{ gold: string }> = ({ gold }) => {
  const frame = useCurrentFrame();
  const stars = Array.from({ length: 40 }, (_, i) => ({
    x: seededRandom(i * 7) * 100,
    y: seededRandom(i * 13) * 60,  // upper 60% of screen
    size: 1 + seededRandom(i * 3) * 3,
    twinkleSpeed: 0.03 + seededRandom(i * 17) * 0.08,
    twinkleOffset: seededRandom(i * 23) * Math.PI * 2,
    brightness: 0.3 + seededRandom(i * 29) * 0.7,
  }));

  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.map((s, i) => {
        const twinkle = Math.sin(frame * s.twinkleSpeed + s.twinkleOffset) * 0.5 + 0.5;
        return (
          <div key={i} style={{
            position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size, borderRadius: '50%',
            background: i % 5 === 0 ? gold : '#ffffff',
            opacity: s.brightness * twinkle,
            boxShadow: `0 0 ${s.size * 3}px ${i % 5 === 0 ? gold : '#ffffff'}40`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// CSS Crescent moon
const CrescentMoon: React.FC<{
  color: string;
  glowEnabled: boolean;
  frame: number;
  fps: number;
}> = ({ color, glowEnabled, frame, fps }) => {
  const moonDelay = 15;
  const moonSpring = spring({
    frame: Math.max(0, frame - moonDelay),
    fps,
    config: { damping: 14, stiffness: 60, mass: 0.8 },
  });

  const gentleFloat = Math.sin(frame * 0.02) * 5;
  const glow = glowEnabled ? Math.sin(frame * 0.04) * 0.3 + 0.7 : 1;

  return (
    <div style={{
      position: 'absolute',
      top: 200,
      left: '50%',
      transform: `translateX(-50%) translateY(${gentleFloat}px) scale(${moonSpring})`,
    }}>
      {/* Moon glow */}
      {glowEnabled && (
        <div style={{
          position: 'absolute',
          width: 250, height: 250,
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: color,
          filter: 'blur(60px)',
          opacity: 0.15 * glow,
        }} />
      )}
      {/* Crescent shape using box-shadow trick */}
      <div style={{
        width: 140, height: 140,
        borderRadius: '50%',
        boxShadow: `20px -15px 0 0 ${color}`,
        transform: 'rotate(-30deg)',
        filter: glowEnabled ? `drop-shadow(0 0 20px ${color}60)` : undefined,
      }} />
    </div>
  );
};

// Hanging lantern
const Lantern: React.FC<{
  x: number;
  delay: number;
  gold: string;
  size: number;
}> = ({ x, delay, gold, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 8, stiffness: 60, mass: 0.5 },
  });

  // Gentle swing
  const swing = Math.sin(frame * 0.03 + delay * 0.5) * 3;
  const glowPulse = 0.6 + Math.sin(frame * 0.06 + delay) * 0.4;

  return (
    <div style={{
      position: 'absolute',
      left: `${x}%`,
      top: 0,
      transform: `translateX(-50%) rotate(${swing}deg)`,
      opacity: enterSpring,
      transformOrigin: 'top center',
    }}>
      {/* String */}
      <div style={{
        width: 1, height: 60 + size * 0.5,
        background: `${gold}40`,
        margin: '0 auto',
      }} />
      {/* Lantern body */}
      <div style={{
        width: size, height: size * 1.5,
        background: `linear-gradient(180deg, ${gold}30, ${gold}15)`,
        border: `1px solid ${gold}50`,
        borderRadius: `${size * 0.3}px ${size * 0.3}px ${size * 0.15}px ${size * 0.15}px`,
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Inner glow */}
        <div style={{
          position: 'absolute', inset: '20%',
          borderRadius: '50%',
          background: gold,
          filter: `blur(${size * 0.3}px)`,
          opacity: 0.3 * glowPulse,
        }} />
        {/* Decorative lines */}
        <div style={{
          position: 'absolute', top: '30%', left: '10%', right: '10%',
          height: 1, background: `${gold}30`,
        }} />
        <div style={{
          position: 'absolute', top: '60%', left: '10%', right: '10%',
          height: 1, background: `${gold}30`,
        }} />
      </div>
      {/* Bottom cap */}
      <div style={{
        width: size * 0.4, height: size * 0.3,
        background: `${gold}40`,
        borderRadius: '0 0 50% 50%',
        margin: '0 auto',
      }} />
    </div>
  );
};

// Ornate pattern border
const OrnatePattern: React.FC<{ gold: string; opacity: number }> = ({ gold, opacity }) => (
  <>
    {/* Top ornate bar */}
    <div style={{
      position: 'absolute', top: 100, left: 60, right: 60,
      height: 2,
      background: `repeating-linear-gradient(90deg, ${gold}40 0px, ${gold}40 8px, transparent 8px, transparent 16px)`,
      opacity,
    }} />
    {/* Bottom ornate bar */}
    <div style={{
      position: 'absolute', bottom: 100, left: 60, right: 60,
      height: 2,
      background: `repeating-linear-gradient(90deg, ${gold}40 0px, ${gold}40 8px, transparent 8px, transparent 16px)`,
      opacity,
    }} />
    {/* Diamond ornament center-top */}
    <div style={{
      position: 'absolute', top: 92, left: '50%',
      width: 16, height: 16,
      background: `${gold}60`,
      transform: 'translateX(-50%) rotate(45deg)',
      opacity,
    }} />
    <div style={{
      position: 'absolute', bottom: 92, left: '50%',
      width: 16, height: 16,
      background: `${gold}60`,
      transform: 'translateX(-50%) rotate(45deg)',
      opacity,
    }} />
  </>
);

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

export const RamadanGreeting: React.FC<RamadanGreetingProps> = (rawProps) => {
  loadEthiopicFont();
  
  const p: RamadanGreetingProps = {
    ...defaultRamadanGreetingProps,
    ...rawProps,
    theme: { ...defaultRamadanGreetingProps.theme, ...rawProps?.theme },
  };

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const gold = p.theme.primaryColor;
  const font = ETHIOPIC_FONT_STACK;

  // ── Animations ──

  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Ornate pattern
  const ornateOpacity = interpolate(frame, [5, 25], [0, 0.5], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Main greeting (Arabic)
  const greetDelay = 40;
  const greetSpring = spring({
    frame: Math.max(0, frame - greetDelay),
    fps,
    config: { damping: 12, stiffness: 50, mass: 0.8 },
  });
  const greetOpacity = interpolate(frame, [greetDelay, greetDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Sub greeting (English)
  const subDelay = 65;
  const subOpacity = interpolate(frame, [subDelay, subDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Gold line
  const lineDelay = 55;
  const lineWidth = interpolate(frame, [lineDelay, lineDelay + 20], [0, 100], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Message
  const msgDelay = 90;
  const msgOpacity = interpolate(frame, [msgDelay, msgDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Brand + year
  const brandDelay = 120;
  const brandOpacity = interpolate(frame, [brandDelay, brandDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, ${p.theme.bgGradient[0]}, ${p.theme.bgGradient[1]}, ${p.theme.bgGradient[2]})`,
      opacity: fadeIn * fadeOut,
      overflow: 'hidden',
    }}>
      {/* Stars */}
      {p.theme.starsEnabled && <Stars gold={gold} />}

      {/* Lanterns */}
      {p.theme.lanternsEnabled && (
        <>
          <Lantern x={12} delay={10} gold={gold} size={40} />
          <Lantern x={30} delay={18} gold={gold} size={32} />
          <Lantern x={70} delay={14} gold={gold} size={35} />
          <Lantern x={88} delay={22} gold={gold} size={38} />
        </>
      )}

      {/* Ornate pattern */}
      {p.theme.ornatePatternEnabled && <OrnatePattern gold={gold} opacity={ornateOpacity} />}

      {/* Crescent moon */}
      <CrescentMoon
        color={p.theme.crescentColor}
        glowEnabled={p.theme.glowEnabled}
        frame={frame}
        fps={fps}
      />

      {/* Main content */}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 70px',
        paddingTop: 200,
      }}>
        {/* Main greeting (Arabic) */}
        <div style={{
          opacity: greetOpacity,
          transform: `scale(${interpolate(greetSpring, [0, 1], [0.8, 1])})`,
        }}>
          <div style={{
            fontFamily: font, fontSize: 100, fontWeight: 700,
            color: gold,
            textAlign: 'center',
            textShadow: `0 0 40px ${gold}40`,
            direction: 'rtl',
          }}>
            {p.mainGreeting}
          </div>
        </div>

        {/* Gold divider */}
        <div style={{
          width: `${lineWidth}%`, maxWidth: 200,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${gold}, transparent)`,
          margin: '20px 0',
        }} />

        {/* Sub greeting (English) */}
        <div style={{ opacity: subOpacity }}>
          <div style={{
            fontFamily: font, fontSize: 40, fontWeight: 400,
            color: p.theme.textColor, opacity: 0.8,
            textAlign: 'center', letterSpacing: '0.2em',
          }}>
            {p.subGreeting}
          </div>
        </div>

        {/* Message */}
        <div style={{
          opacity: msgOpacity, marginTop: 50, maxWidth: 750,
        }}>
          <div style={{
            fontFamily: font, fontSize: 32, fontWeight: 300,
            color: p.theme.textColor, opacity: 0.65,
            textAlign: 'center', lineHeight: 1.6,
          }}>
            {p.message}
          </div>
        </div>

        {/* Brand name + year */}
        <div style={{
          opacity: brandOpacity, marginTop: 60,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <span style={{
            fontFamily: font, fontSize: 28, fontWeight: 700,
            color: gold, letterSpacing: '0.3em',
          }}>
            {p.fromName}
          </span>
          <span style={{
            fontFamily: font, fontSize: 20, fontWeight: 400,
            color: p.theme.textColor, opacity: 0.4,
            letterSpacing: '0.15em',
          }}>
            {p.year}
          </span>
        </div>
      </AbsoluteFill>

      {/* Logo */}
      {p.logoUrl && (
        <Logo
          src={p.logoUrl}
          position="bottom-right"
          size={p.logoSize}
          delay={10}
          padding={50}
        />
      )}
    </AbsoluteFill>
  );
};
