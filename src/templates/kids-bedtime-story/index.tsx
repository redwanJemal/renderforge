import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import type { Theme, Format } from '../../types';
import { z } from 'zod';
import { registry } from '../../core/registry';
import { loadGoogleFont } from '../../core/fonts';
import { responsiveFontSize, isPortrait } from '../../core/formats';
import { BounceIn } from '../../components/kids';

// ══════════════════════════════════════════════════════════════
// KIDS BEDTIME STORY
//
// Long-form template for 5-10 minute bedtime stories.
// Structure: Title Card → Story Pages → Goodnight Outro
//
// Visual style: Starry night sky, soft gradients, gentle animations
// Page transitions: Soft fade with parallax slide
//
// Audio sync: Each page's startFrame and durationFrames
// are overridden by audio-sync.ts based on TTS narration length.
// ══════════════════════════════════════════════════════════════

const storyPageSchema = z.object({
  text: z.string(),
  illustration: z.string().optional(), // description (for future image support)
  bgGradient: z.string().optional(),   // override gradient for this page
  // Audio-sync timing
  startFrame: z.number().optional(),
  durationFrames: z.number().optional(),
});

export type StoryPage = z.infer<typeof storyPageSchema>;

const kidsBedtimeSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  pages: z.array(storyPageSchema),
  // Timing defaults
  introDurationFrames: z.number(),
  pageDurationFrames: z.number(),       // default per-page duration (audio-sync overrides)
  pageTransitionFrames: z.number(),
  outroDurationFrames: z.number(),
  outroText: z.string(),
  // Visual
  skyColor1: z.string(),
  skyColor2: z.string(),
  starCount: z.number(),
  moonColor: z.string(),
  textColor: z.string(),
  accentColor: z.string(),
});

export type KidsBedtimeProps = z.infer<typeof kidsBedtimeSchema>;

// ── Defaults ────────────────────────────────────────────

export const defaultProps: KidsBedtimeProps = {
  title: 'Twinkle Bear',
  subtitle: 'and the Moonlight Garden',
  pages: [
    {
      text: 'Once upon a time, in a cozy little forest, there lived a small bear named Twinkle. Twinkle had the softest brown fur and the brightest eyes that sparkled like stars.',
    },
    {
      text: 'Every night, when the moon rose high above the trees, Twinkle would look up at the sky and wonder, "Where do the stars go during the day?"',
    },
    {
      text: 'One magical evening, a tiny firefly named Flicker landed on Twinkle\'s nose. "Hello little bear!" said Flicker. "I know where the stars hide! Would you like to see?"',
    },
    {
      text: 'Twinkle followed Flicker through the whispering trees, past the gentle stream where the frogs sang their lullaby, deeper into the enchanted forest.',
    },
    {
      text: 'And there it was! A secret garden where flowers glowed with starlight. Each petal held a tiny piece of the sky. "This is the Moonlight Garden," whispered Flicker.',
    },
    {
      text: 'Twinkle danced among the glowing flowers, touching each one gently. As he did, the flowers floated up into the sky, becoming stars once more.',
    },
    {
      text: 'The stars twinkled and danced, painting the night sky with silver light. "Thank you, little bear," the stars seemed to whisper. "You helped us find our way home."',
    },
    {
      text: 'Twinkle yawned a big, sleepy yawn and curled up right there in the moonlight garden. The flowers sang a soft lullaby, and the stars watched over him.',
    },
    {
      text: 'And as Twinkle\'s eyes slowly closed, he smiled, knowing that every night, the stars would come out to play. And so will you, in your dreams. Goodnight, little one. Sweet dreams.',
    },
  ],
  introDurationFrames: 180,       // 6s title card
  pageDurationFrames: 300,         // 10s per page default (audio-sync overrides)
  pageTransitionFrames: 30,        // 1s soft transition
  outroDurationFrames: 180,        // 6s goodnight
  outroText: 'The End.\nSweet Dreams.',
  skyColor1: '#0B1026',
  skyColor2: '#1B2A4A',
  starCount: 60,
  moonColor: '#FFF8DC',
  textColor: '#F0E6D3',
  accentColor: '#FFAFCC',
};

// ── Seeded Random ──────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// ── Starry Night Background ────────────────────────────

const StarryNight: React.FC<{
  skyColor1: string;
  skyColor2: string;
  starCount: number;
  moonColor: string;
  portrait: boolean;
}> = ({ skyColor1, skyColor2, starCount, moonColor, portrait }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stars = Array.from({ length: starCount }, (_, i) => {
    const x = seededRandom(i * 7 + 1) * 100;
    const y = seededRandom(i * 13 + 3) * 70; // keep in upper portion
    const size = seededRandom(i * 19 + 5) * 3 + 1;
    const twinkleSpeed = seededRandom(i * 23 + 7) * 0.03 + 0.01;
    const twinkleOffset = seededRandom(i * 31 + 11) * Math.PI * 2;
    const opacity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(frame * twinkleSpeed + twinkleOffset));

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          opacity,
          boxShadow: size > 2.5 ? `0 0 ${size * 2}px rgba(255, 255, 255, 0.5)` : undefined,
        }}
      />
    );
  });

  // Moon with gentle float
  const moonY = interpolate(Math.sin(frame * 0.008), [-1, 1], [-5, 5]);
  const moonSize = portrait ? 120 : 100;
  const moonRight = portrait ? '12%' : '15%';
  const moonTop = portrait ? '8%' : '6%';

  // Gentle shooting star every ~10 seconds
  const shootingStarCycle = 300; // 10s at 30fps
  const shootingFrame = frame % shootingStarCycle;
  const showShootingStar = shootingFrame < 30; // visible for 1s
  const shootingProgress = shootingFrame / 30;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${skyColor1} 0%, ${skyColor2} 60%, #2D1B4E 100%)`,
      }}
    >
      {stars}

      {/* Moon */}
      <div
        style={{
          position: 'absolute',
          right: moonRight,
          top: moonTop,
          transform: `translateY(${moonY}px)`,
          width: moonSize,
          height: moonSize,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${moonColor}, #F5E6B8)`,
          boxShadow: `0 0 40px rgba(255, 248, 220, 0.3), 0 0 80px rgba(255, 248, 220, 0.1)`,
        }}
      >
        {/* Moon craters */}
        <div style={{ position: 'absolute', top: '25%', left: '55%', width: '18%', height: '18%', borderRadius: '50%', background: 'rgba(0,0,0,0.05)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '30%', width: '12%', height: '12%', borderRadius: '50%', background: 'rgba(0,0,0,0.04)' }} />
        <div style={{ position: 'absolute', top: '65%', left: '60%', width: '10%', height: '10%', borderRadius: '50%', background: 'rgba(0,0,0,0.03)' }} />
      </div>

      {/* Shooting star */}
      {showShootingStar && (
        <div
          style={{
            position: 'absolute',
            left: `${20 + shootingProgress * 30}%`,
            top: `${10 + shootingProgress * 15}%`,
            width: 3,
            height: 3,
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            opacity: interpolate(shootingProgress, [0, 0.3, 1], [0, 1, 0]),
            boxShadow: '0 0 8px #FFF, -20px 5px 15px rgba(255,255,255,0.3), -40px 10px 10px rgba(255,255,255,0.1)',
          }}
        />
      )}

      {/* Bottom ground/hills silhouette */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '15%',
          background: `linear-gradient(180deg, transparent 0%, rgba(11,16,38,0.8) 100%)`,
        }}
      />
      <svg
        viewBox="0 0 1080 100"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: '12%' }}
        preserveAspectRatio="none"
      >
        <path
          d="M0,100 L0,60 Q120,20 270,50 Q400,75 540,35 Q680,0 810,45 Q950,80 1080,40 L1080,100 Z"
          fill="#0A0E1A"
        />
        {/* Trees silhouette */}
        <path
          d="M50,60 L65,25 L80,60 M150,55 L160,30 L170,55 M300,50 L315,15 L330,50 M450,55 L460,28 L470,55 M600,48 L615,10 L630,48 M750,55 L762,25 L775,55 M900,52 L912,20 L925,52 M1020,58 L1030,30 L1040,58"
          fill="#0D1220"
          stroke="none"
        />
      </svg>
    </AbsoluteFill>
  );
};

// ── Page Turn Transition ───────────────────────────────

const PageTransition: React.FC<{
  progress: number; // 0 = fully showing current page, 1 = fully showing next
  children: React.ReactNode;
}> = ({ progress, children }) => {
  const opacity = interpolate(progress, [0, 0.3, 0.7, 1], [1, 0, 0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateX = interpolate(progress, [0, 0.3, 0.7, 1], [0, -30, 30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(progress, [0, 0.5, 1], [1, 0.97, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        opacity,
        transform: `translateX(${translateX}px) scale(${scale})`,
      }}
    >
      {children}
    </div>
  );
};

// ── Story Page Component ───────────────────────────────

const StoryPageView: React.FC<{
  page: StoryPage;
  pageNumber: number;
  totalPages: number;
  portrait: boolean;
  textColor: string;
  accentColor: string;
  fps: number;
}> = ({ page, pageNumber, totalPages, portrait, textColor, accentColor, fps }) => {
  const frame = useCurrentFrame();

  // Text fade-in with gentle spring
  const textOpacity = interpolate(frame, [10, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textY = interpolate(frame, [10, 45], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fontSize = portrait ? 42 : 36;
  const lineHeight = portrait ? 1.7 : 1.6;
  const padding = portrait ? '0 60px' : '0 120px';

  // Floating particles (fireflies) around the text
  const particles = Array.from({ length: 6 }, (_, i) => {
    const x = seededRandom(pageNumber * 100 + i * 7) * 80 + 10;
    const baseY = seededRandom(pageNumber * 100 + i * 13) * 60 + 20;
    const floatY = Math.sin(frame * 0.02 + i * 1.5) * 15;
    const floatX = Math.cos(frame * 0.015 + i * 2) * 10;
    const particleOpacity = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(frame * 0.04 + i * 0.8));

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${baseY}%`,
          transform: `translate(${floatX}px, ${floatY}px)`,
          width: 4,
          height: 4,
          borderRadius: '50%',
          backgroundColor: accentColor,
          opacity: particleOpacity * textOpacity,
          boxShadow: `0 0 8px ${accentColor}`,
        }}
      />
    );
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {particles}

      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          padding,
          maxWidth: portrait ? '100%' : '80%',
          textAlign: 'center',
        }}
      >
        {/* Open quote */}
        <div
          style={{
            fontSize: fontSize * 1.5,
            color: accentColor,
            opacity: 0.3,
            fontFamily: 'Georgia, serif',
            marginBottom: -20,
          }}
        >
          &ldquo;
        </div>

        <p
          style={{
            fontSize,
            lineHeight,
            color: textColor,
            fontFamily: 'Quicksand, Nunito, -apple-system, sans-serif',
            fontWeight: 500,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            margin: 0,
          }}
        >
          {page.text}
        </p>
      </div>

      {/* Page indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: portrait ? '6%' : '5%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 8,
          opacity: textOpacity * 0.5,
        }}
      >
        {Array.from({ length: totalPages }, (_, i) => (
          <div
            key={i}
            style={{
              width: i === pageNumber ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === pageNumber ? accentColor : `${textColor}40`,
              transition: 'width 0.3s',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── Title Card ─────────────────────────────────────────

const TitleCard: React.FC<{
  title: string;
  subtitle: string;
  portrait: boolean;
  textColor: string;
  accentColor: string;
  fps: number;
}> = ({ title, subtitle, portrait, textColor, accentColor, fps }) => {
  const frame = useCurrentFrame();

  const titleScale = spring({ frame, fps, config: { damping: 12, stiffness: 100, mass: 0.8 }, delay: 15 });
  const titleOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subtitleOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subtitleY = interpolate(frame, [40, 65], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Decorative line
  const lineWidth = interpolate(frame, [60, 90], [0, portrait ? 300 : 400], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const titleSize = portrait ? 72 : 64;
  const subtitleSize = portrait ? 44 : 38;

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Book icon */}
      <BounceIn delay={0} scale={[0, 0.9]}>
        <svg width={portrait ? 80 : 70} height={portrait ? 80 : 70} viewBox="0 0 64 64" fill="none">
          <path d="M8 8C8 8 16 12 32 12C48 12 56 8 56 8V52C56 52 48 48 32 48C16 48 8 52 8 52V8Z" fill={`${accentColor}30`} stroke={accentColor} strokeWidth="2" />
          <line x1="32" y1="12" x2="32" y2="48" stroke={`${accentColor}60`} strokeWidth="1.5" />
        </svg>
      </BounceIn>

      <div
        style={{
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: titleSize,
            fontFamily: 'Bubblegum Sans, Fredoka, -apple-system, sans-serif',
            color: textColor,
            fontWeight: 400,
            margin: 0,
            textShadow: '0 3px 12px rgba(0,0,0,0.3)',
          }}
        >
          {title}
        </h1>
      </div>

      <div
        style={{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: subtitleSize,
            fontFamily: 'Quicksand, Nunito, -apple-system, sans-serif',
            color: accentColor,
            fontWeight: 500,
            margin: 0,
            textShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {subtitle}
        </h2>
      </div>

      {/* Decorative line */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
          marginTop: 12,
        }}
      />

      {/* "A Bedtime Story" label */}
      <div
        style={{
          opacity: interpolate(frame, [80, 100], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          fontSize: portrait ? 24 : 20,
          fontFamily: 'Quicksand, Nunito, -apple-system, sans-serif',
          color: textColor,
          letterSpacing: 4,
          textTransform: 'uppercase',
          marginTop: 8,
        }}
      >
        A Bedtime Story
      </div>
    </AbsoluteFill>
  );
};

// ── Goodnight Outro ────────────────────────────────────

const GoodnightOutro: React.FC<{
  text: string;
  portrait: boolean;
  textColor: string;
  accentColor: string;
  moonColor: string;
  fps: number;
}> = ({ text, portrait, textColor, accentColor, moonColor, fps }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [20, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const moonScale = spring({ frame, fps, config: { damping: 15, stiffness: 80, mass: 1 }, delay: 10 });

  const lines = text.split('\n');
  const fontSize = portrait ? 56 : 48;

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 30,
      }}
    >
      {/* Sleeping moon */}
      <div
        style={{
          transform: `scale(${moonScale})`,
          opacity: fadeIn,
        }}
      >
        <svg width={portrait ? 120 : 100} height={portrait ? 120 : 100} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="40" fill={moonColor} />
          <circle cx="50" cy="50" r="40" fill="url(#moonGrad)" />
          {/* Sleeping eyes */}
          <path d="M33 48 Q38 44 43 48" stroke="#B8A88A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M57 48 Q62 44 67 48" stroke="#B8A88A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Gentle smile */}
          <path d="M42 58 Q50 64 58 58" stroke="#B8A88A" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Z's */}
          <text x="70" y="30" fill={accentColor} fontSize="14" fontFamily="sans-serif" opacity={0.5 + 0.5 * Math.sin(frame * 0.05)}>z</text>
          <text x="78" y="22" fill={accentColor} fontSize="11" fontFamily="sans-serif" opacity={0.5 + 0.5 * Math.sin(frame * 0.05 + 1)}>z</text>
          <text x="84" y="16" fill={accentColor} fontSize="9" fontFamily="sans-serif" opacity={0.5 + 0.5 * Math.sin(frame * 0.05 + 2)}>z</text>
          <defs>
            <radialGradient id="moonGrad" cx="35%" cy="35%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.05)" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Text */}
      <div
        style={{
          opacity: fadeIn,
          textAlign: 'center',
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: i === 0 ? fontSize : fontSize * 0.7,
              fontFamily: 'Bubblegum Sans, Fredoka, -apple-system, sans-serif',
              color: i === 0 ? textColor : accentColor,
              fontWeight: 400,
              textShadow: '0 3px 12px rgba(0,0,0,0.3)',
              marginTop: i > 0 ? 12 : 0,
              opacity: interpolate(frame, [30 + i * 20, 50 + i * 20], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Sparkle dots fading in */}
      {Array.from({ length: 5 }, (_, i) => {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const radius = portrait ? 200 : 170;
        const x = 50 + Math.cos(angle + frame * 0.003) * radius;
        const y = 50 + Math.sin(angle + frame * 0.003) * radius;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `calc(${x}% - 3px)`,
              top: `calc(${y}% - 3px)`,
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: accentColor,
              opacity: fadeIn * (0.3 + 0.3 * Math.sin(frame * 0.04 + i)),
              boxShadow: `0 0 10px ${accentColor}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ── Main Component ─────────────────────────────────────

const KidsBedtimeStory: React.FC<KidsBedtimeProps & { theme?: Theme; format?: Format }> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const format = props.format || 'story';
  const portrait = isPortrait(format);

  // Load fonts
  loadGoogleFont('Bubblegum Sans');
  loadGoogleFont('Quicksand');

  // Calculate page timings
  const introDuration = props.introDurationFrames;
  const pageDuration = props.pageDurationFrames;
  const transitionDuration = props.pageTransitionFrames;
  const outroDuration = props.outroDurationFrames;

  // Build sequence timing — audio-sync overrides startFrame/durationFrames per page
  const pageTimings: Array<{ start: number; duration: number }> = [];
  let cursor = introDuration;

  for (let i = 0; i < props.pages.length; i++) {
    const page = props.pages[i];
    const start = page.startFrame ?? cursor;
    const duration = page.durationFrames ?? pageDuration;
    pageTimings.push({ start, duration });
    cursor = start + duration + transitionDuration;
  }

  const outroStart = cursor;
  const totalDuration = outroStart + outroDuration;

  return (
    <AbsoluteFill style={{ backgroundColor: props.skyColor1 }}>
      {/* Persistent starry background */}
      <StarryNight
        skyColor1={props.skyColor1}
        skyColor2={props.skyColor2}
        starCount={props.starCount}
        moonColor={props.moonColor}
        portrait={portrait}
      />

      {/* Title Card */}
      <Sequence from={0} durationInFrames={introDuration}>
        <TitleCard
          title={props.title}
          subtitle={props.subtitle}
          portrait={portrait}
          textColor={props.textColor}
          accentColor={props.accentColor}
          fps={fps}
        />
      </Sequence>

      {/* Story Pages */}
      {props.pages.map((page, i) => {
        const { start, duration } = pageTimings[i];
        return (
          <Sequence key={i} from={start} durationInFrames={duration}>
            <StoryPageView
              page={page}
              pageNumber={i}
              totalPages={props.pages.length}
              portrait={portrait}
              textColor={props.textColor}
              accentColor={props.accentColor}
              fps={fps}
            />
          </Sequence>
        );
      })}

      {/* Goodnight Outro */}
      <Sequence from={outroStart} durationInFrames={outroDuration}>
        <GoodnightOutro
          text={props.outroText}
          portrait={portrait}
          textColor={props.textColor}
          accentColor={props.accentColor}
          moonColor={props.moonColor}
          fps={fps}
        />
      </Sequence>

      {/* Global fade in at start */}
      <AbsoluteFill
        style={{
          backgroundColor: '#000000',
          opacity: interpolate(frame, [0, 30], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

// ── Register ───────────────────────────────────────────

registry.register({
  meta: {
    id: 'kids-bedtime-story',
    name: 'Kids Bedtime Story',
    description: 'Long-form bedtime story with starry night background, gentle animations, and page-by-page narration.',
    category: 'kids',
    tags: ['kids', 'bedtime', 'story', 'long-form', 'audio-sync', 'narration'],
    supportedFormats: ['story', 'post', 'landscape'],
    durationInFrames: 9000, // 5 min max — actual duration controlled by audio-sync or --frames
    fps: 30,
  },
  schema: kidsBedtimeSchema,
  component: KidsBedtimeStory,
  defaultProps,
});

export { KidsBedtimeStory };
export default KidsBedtimeStory;
