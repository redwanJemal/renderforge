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
// TYPES
// ══════════════════════════════════════════════════════════════

export type SlideTransition =
  | 'slideLeft'
  | 'slideUp'
  | 'fade'
  | 'zoom'
  | 'wipe';

export interface Slide {
  headline: string;
  subtext: string;
  imageUrl: string;            // URL or staticFile name
  imageIsLocal: boolean;       // true = use staticFile(), false = direct URL
  highlight: string;           // word(s) in headline to accent-color
  tag: string;                 // small label above headline (e.g. "01", "FEATURE")
}

export interface SliderProps {
  // ── Logo ──
  logo: {
    file: string;              // filename in public/ (or URL if logoIsUrl=true)
    logoIsUrl: boolean;
    size: number;
    position: 'top-left' | 'top-center' | 'top-right';
    glowEnabled: boolean;
  };

  // ── Slides ──
  slides: Slide[];
  framesPerSlide: number;      // how long each slide stays (default 90 = 3s)
  transition: SlideTransition;
  transitionFrames: number;    // overlap duration (default 20)

  // ── Intro ──
  intro: {
    enabled: boolean;
    title: string;
    subtitle: string;
    durationFrames: number;    // how long intro shows before slides
  };

  // ── Outro / CTA ──
  outro: {
    enabled: boolean;
    text: string;
    subtext: string;
    durationFrames: number;
  };

  // ── Progress Indicator ──
  progress: {
    enabled: boolean;
    style: 'dots' | 'bar' | 'numbers';
    position: 'bottom' | 'top';
  };

  // ── Theme ──
  theme: {
    accentColor: string;
    secondaryAccent: string;
    bgGradient: [string, string, string];
    particlesEnabled: boolean;
    scanLineEnabled: boolean;
    gridEnabled: boolean;
    vignetteEnabled: boolean;
    slideImageOverlay: number; // 0-1, darkness over slide images
  };
}

// ══════════════════════════════════════════════════════════════
// DEFAULTS
// ══════════════════════════════════════════════════════════════

export const defaultSliderProps: SliderProps = {
  logo: {
    file: 'yld-logo-white.png',
    logoIsUrl: false,
    size: 80,
    position: 'top-left',
    glowEnabled: true,
  },
  slides: [
    {
      headline: 'Build Something\nThat Matters',
      subtext: 'Transform your vision into reality with cutting-edge tools and unlimited creativity.',
      imageUrl: '',
      imageIsLocal: false,
      highlight: 'Matters',
      tag: '01',
    },
    {
      headline: 'Design Without\nLimits',
      subtext: 'Professional-grade templates that adapt to your brand and story.',
      imageUrl: '',
      imageIsLocal: false,
      highlight: 'Limits',
      tag: '02',
    },
    {
      headline: 'Launch Faster\nThan Ever',
      subtext: 'From concept to social media in minutes, not days.',
      imageUrl: '',
      imageIsLocal: false,
      highlight: 'Faster',
      tag: '03',
    },
    {
      headline: 'Scale Your\nContent Empire',
      subtext: 'One engine. Infinite videos. Every platform covered.',
      imageUrl: '',
      imageIsLocal: false,
      highlight: 'Empire',
      tag: '04',
    },
  ],
  framesPerSlide: 140,
  transition: 'slideLeft',
  transitionFrames: 25,
  intro: {
    enabled: true,
    title: 'RenderForge',
    subtitle: 'Video Engine',
    durationFrames: 70,
  },
  outro: {
    enabled: true,
    text: 'Start Creating Today',
    subtext: 'renderforge.dev',
    durationFrames: 80,
  },
  progress: {
    enabled: true,
    style: 'dots',
    position: 'bottom',
  },
  theme: {
    accentColor: '#22c55e',
    secondaryAccent: '#06b6d4',
    bgGradient: ['#0a2e1a', '#071a10', '#020a05'],
    particlesEnabled: true,
    scanLineEnabled: true,
    gridEnabled: true,
    vignetteEnabled: true,
    slideImageOverlay: 0.65,
  },
};

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function highlightWords(
  text: string,
  highlight: string,
  color: string,
): React.ReactNode {
  if (!highlight) return text;
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => {
        const idx = line.toLowerCase().indexOf(highlight.toLowerCase());
        if (idx === -1)
          return (
            <React.Fragment key={li}>
              {li > 0 && <br />}
              {line}
            </React.Fragment>
          );
        return (
          <React.Fragment key={li}>
            {li > 0 && <br />}
            {line.slice(0, idx)}
            <span style={{ color, textShadow: `0 0 40px ${color}55` }}>
              {line.slice(idx, idx + highlight.length)}
            </span>
            {line.slice(idx + highlight.length)}
          </React.Fragment>
        );
      })}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// BACKGROUND EFFECTS (shared with YLD-intro style)
// ══════════════════════════════════════════════════════════════

const FloatingParticle: React.FC<{
  x: number; y: number; size: number; delay: number;
  speed: number; opacity: number; color: string; totalFrames: number;
}> = ({ x, y, size, delay, speed, opacity, color, totalFrames }) => {
  const frame = useCurrentFrame();
  const adj = Math.max(0, frame - delay);
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        filter: `blur(${size > 4 ? 2 : 0}px)`,
        opacity:
          interpolate(adj, [0, 30], [0, opacity], {
            extrapolateRight: 'clamp',
          }) *
          interpolate(frame, [totalFrames - 30, totalFrames], [1, 0], {
            extrapolateRight: 'clamp',
            extrapolateLeft: 'clamp',
          }),
        transform: `translateY(${adj * speed * -0.3}px) translateX(${Math.sin(adj * 0.015 + x) * 12}px)`,
        boxShadow: `0 0 ${size * 2}px ${color}`,
      }}
    />
  );
};

const Particles: React.FC<{ accent: string; totalFrames: number }> = ({
  accent,
  totalFrames,
}) => {
  const color = `${accent}88`;
  const particles = Array.from({ length: 30 }, (_, i) => ({
    x: seededRandom(i * 7) * 100,
    y: seededRandom(i * 13) * 100,
    size: 2 + seededRandom(i * 3) * 4,
    delay: seededRandom(i * 11) * 50,
    speed: 0.15 + seededRandom(i * 17) * 0.4,
    opacity: 0.15 + seededRandom(i * 23) * 0.35,
  }));
  return (
    <>
      {particles.map((p, i) => (
        <FloatingParticle key={i} {...p} color={color} totalFrames={totalFrames} />
      ))}
    </>
  );
};

const ScanLine: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: `${interpolate(frame % 150, [0, 150], [-5, 105])}%`,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        opacity: 0.08,
        filter: 'blur(1px)',
      }}
    />
  );
};

// ══════════════════════════════════════════════════════════════
// SLIDE COMPONENT
// ══════════════════════════════════════════════════════════════

const SlideContent: React.FC<{
  slide: Slide;
  slideIndex: number;
  localFrame: number; // frame relative to this slide's start
  transitionFrames: number;
  framesPerSlide: number;
  accent: string;
  secondaryAccent: string;
  overlayOpacity: number;
  isLast: boolean;
  transition: SlideTransition;
}> = ({
  slide,
  slideIndex,
  localFrame,
  transitionFrames,
  framesPerSlide,
  accent,
  secondaryAccent,
  overlayOpacity,
  isLast,
  transition,
}) => {
  const { fps } = useVideoConfig();
  const font = 'SF Pro Display, -apple-system, Helvetica, sans-serif';

  // Enter animation (0 → transitionFrames)
  const enterProgress = interpolate(
    localFrame,
    [0, transitionFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Exit animation
  const exitStart = framesPerSlide - transitionFrames;
  const exitProgress = isLast
    ? 1
    : interpolate(localFrame, [exitStart, framesPerSlide], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });

  // Combined visibility
  const visibility = Math.min(enterProgress, exitProgress);

  // Slide-specific transforms
  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  let opacity = visibility;

  switch (transition) {
    case 'slideLeft':
      translateX = (1 - enterProgress) * 100;
      if (!isLast && localFrame > exitStart)
        translateX = -(1 - exitProgress) * 100;
      opacity = 1;
      break;
    case 'slideUp':
      translateY = (1 - enterProgress) * 80;
      if (!isLast && localFrame > exitStart)
        translateY = -(1 - exitProgress) * 80;
      opacity = 1;
      break;
    case 'zoom':
      scale = 0.7 + enterProgress * 0.3;
      if (!isLast && localFrame > exitStart) scale = 1 + (1 - exitProgress) * 0.3;
      break;
    case 'wipe':
      opacity = 1;
      break;
    case 'fade':
    default:
      break;
  }

  // Content staggered animations
  const contentDelay = transitionFrames * 0.6;
  const contentFrame = Math.max(0, localFrame - contentDelay);

  const tagProgress = spring({
    frame: contentFrame,
    fps,
    config: { damping: 14, stiffness: 150, mass: 0.4 },
  });

  const headlineProgress = spring({
    frame: Math.max(0, contentFrame - 5),
    fps,
    config: { damping: 16, stiffness: 80, mass: 0.6 },
  });

  const subtextOpacity = interpolate(contentFrame, [15, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Decorative line animation
  const lineWidth = interpolate(contentFrame, [8, 30], [0, 60], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Wipe uses clip-path instead of transform
  const clipPath =
    transition === 'wipe'
      ? `inset(0 ${(1 - enterProgress) * 100}% 0 0)`
      : undefined;

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateX(${translateX}%) translateY(${translateY}%) scale(${scale})`,
        clipPath,
      }}
    >
      {/* Slide background image */}
      {slide.imageUrl && (
        <AbsoluteFill>
          <Img
            src={
              slide.imageIsLocal
                ? staticFile(slide.imageUrl)
                : slide.imageUrl
            }
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${1 + localFrame * 0.0003})`, // Ken Burns
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, rgba(0,0,0,${overlayOpacity * 0.4}) 0%, rgba(0,0,0,${overlayOpacity}) 60%, rgba(0,0,0,${overlayOpacity * 1.1}) 100%)`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Content */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '80px 70px',
          textAlign: 'center',
        }}
      >
        {/* Tag / Number */}
        {slide.tag && (
          <div
            style={{
              opacity: tagProgress,
              transform: `translateY(${(1 - tagProgress) * -15}px)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 30,
                height: 2,
                background: accent,
                boxShadow: `0 0 10px ${accent}`,
              }}
            />
            <span
              style={{
                fontSize: 20,
                fontWeight: 600,
                fontFamily: font,
                color: accent,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
              }}
            >
              {slide.tag}
            </span>
            <div
              style={{
                width: 30,
                height: 2,
                background: accent,
                boxShadow: `0 0 10px ${accent}`,
              }}
            />
          </div>
        )}

        {/* Headline */}
        <div
          style={{
            opacity: headlineProgress,
            transform: `translateY(${(1 - headlineProgress) * 30}px)`,
            fontSize: 62,
            fontWeight: 800,
            fontFamily: font,
            color: '#ffffff',
            lineHeight: 1.15,
            letterSpacing: '0.02em',
            marginBottom: 28,
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
          }}
        >
          {highlightWords(slide.headline, slide.highlight, accent)}
        </div>

        {/* Decorative line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${accent}, ${secondaryAccent})`,
            boxShadow: `0 0 15px ${accent}66`,
            marginBottom: 24,
          }}
        />

        {/* Subtext */}
        <div
          style={{
            opacity: subtextOpacity,
            fontSize: 26,
            fontWeight: 400,
            fontFamily: font,
            color: 'rgba(255, 255, 255, 0.55)',
            lineHeight: 1.6,
            maxWidth: 750,
            textAlign: 'center',
          }}
        >
          {slide.subtext}
        </div>
      </AbsoluteFill>

      {/* Slide number indicator (large, faded) */}
      <div
        style={{
          position: 'absolute',
          right: 50,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 250,
          fontWeight: 900,
          fontFamily: font,
          color: `${accent}08`,
          lineHeight: 1,
          pointerEvents: 'none',
        }}
      >
        {String(slideIndex + 1).padStart(2, '0')}
      </div>
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════
// PROGRESS INDICATOR
// ══════════════════════════════════════════════════════════════

const ProgressIndicator: React.FC<{
  currentSlide: number;
  totalSlides: number;
  slideProgress: number;
  style: 'dots' | 'bar' | 'numbers';
  position: 'bottom' | 'top';
  accent: string;
}> = ({ currentSlide, totalSlides, slideProgress, style, position, accent }) => {
  const font = 'SF Pro Display, -apple-system, Helvetica, sans-serif';
  const posStyle =
    position === 'bottom' ? { bottom: 80 } : { top: 80 };

  if (style === 'bar') {
    const totalProgress =
      (currentSlide + slideProgress) / totalSlides;
    return (
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          ...posStyle,
          height: 4,
          borderRadius: 2,
          background: 'rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            width: `${totalProgress * 100}%`,
            height: '100%',
            borderRadius: 2,
            background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
            boxShadow: `0 0 15px ${accent}55`,
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    );
  }

  if (style === 'numbers') {
    return (
      <div
        style={{
          position: 'absolute',
          right: 70,
          ...posStyle,
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          fontFamily: font,
        }}
      >
        <span
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: accent,
          }}
        >
          {String(currentSlide + 1).padStart(2, '0')}
        </span>
        <span
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          / {String(totalSlides).padStart(2, '0')}
        </span>
      </div>
    );
  }

  // dots (default)
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        ...posStyle,
        display: 'flex',
        gap: 12,
      }}
    >
      {Array.from({ length: totalSlides }, (_, i) => {
        const isActive = i === currentSlide;
        const isPast = i < currentSlide;
        return (
          <div
            key={i}
            style={{
              width: isActive ? 36 : 10,
              height: 10,
              borderRadius: 5,
              background: isActive
                ? accent
                : isPast
                  ? `${accent}66`
                  : 'rgba(255,255,255,0.15)',
              boxShadow: isActive ? `0 0 12px ${accent}88` : 'none',
              transition: 'all 0.2s ease',
            }}
          />
        );
      })}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export const Slider: React.FC<SliderProps> = (rawProps) => {
  const p: SliderProps = {
    logo: { ...defaultSliderProps.logo, ...rawProps?.logo },
    slides: rawProps?.slides?.length ? rawProps.slides : defaultSliderProps.slides,
    framesPerSlide: rawProps?.framesPerSlide ?? defaultSliderProps.framesPerSlide,
    transition: rawProps?.transition ?? defaultSliderProps.transition,
    transitionFrames: rawProps?.transitionFrames ?? defaultSliderProps.transitionFrames,
    intro: { ...defaultSliderProps.intro, ...rawProps?.intro },
    outro: { ...defaultSliderProps.outro, ...rawProps?.outro },
    progress: { ...defaultSliderProps.progress, ...rawProps?.progress },
    theme: { ...defaultSliderProps.theme, ...rawProps?.theme },
  };

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const accent = p.theme.accentColor;
  const font = 'SF Pro Display, -apple-system, Helvetica, sans-serif';

  const introEnd = p.intro.enabled ? p.intro.durationFrames : 0;
  const outroStart = p.outro.enabled
    ? durationInFrames - p.outro.durationFrames
    : durationInFrames;

  // ── Determine current slide ──
  const slidesFrame = Math.max(0, frame - introEnd);
  const currentSlideIndex = Math.min(
    Math.floor(slidesFrame / p.framesPerSlide),
    p.slides.length - 1,
  );
  const slideLocalFrame = slidesFrame - currentSlideIndex * p.framesPerSlide;
  const slideProgress = slideLocalFrame / p.framesPerSlide;

  // ── Global fade in/out ──
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // ── Intro animations ──
  const introOpacity = p.intro.enabled
    ? interpolate(frame, [introEnd - 15, introEnd], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  const introTitleScale = p.intro.enabled
    ? spring({
        frame: Math.max(0, frame - 10),
        fps,
        config: { damping: 14, stiffness: 80, mass: 0.8 },
      })
    : 0;

  // ── Outro animations ──
  const isOutro = p.outro.enabled && frame >= outroStart;
  const outroLocalFrame = Math.max(0, frame - outroStart);
  const outroOpacity = interpolate(outroLocalFrame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const outroScale = spring({
    frame: outroLocalFrame,
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.8 },
  });

  // ── Logo position ──
  const logoPos =
    p.logo.position === 'top-left'
      ? { top: 55, left: 60 }
      : p.logo.position === 'top-right'
        ? { top: 55, right: 60 }
        : { top: 55, left: '50%', transform: 'translateX(-50%)' };

  const logoOpacity = interpolate(frame, [5, 25], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const logoPulse = p.logo.glowEnabled
    ? Math.sin(frame * 0.05) * 0.3 + 0.7
    : 0;

  // Are we in the slides section?
  const inSlides = frame >= introEnd && !isOutro;

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, overflow: 'hidden' }}>
      {/* ── Background ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 35%, ${p.theme.bgGradient[0]} 0%, ${p.theme.bgGradient[1]} 40%, ${p.theme.bgGradient[2]} 100%)`,
        }}
      />

      {/* Grid */}
      {p.theme.gridEnabled && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.03,
            backgroundImage: `linear-gradient(${accent}4D 1px, transparent 1px), linear-gradient(90deg, ${accent}4D 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      )}

      {/* Particles */}
      {p.theme.particlesEnabled && (
        <Particles accent={accent} totalFrames={durationInFrames} />
      )}

      {/* Scan line */}
      {p.theme.scanLineEnabled && <ScanLine accent={accent} />}

      {/* Vignette */}
      {p.theme.vignetteEnabled && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ══ INTRO ══ */}
      {p.intro.enabled && frame < introEnd + 15 && (
        <AbsoluteFill
          style={{
            opacity: introOpacity,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Logo big in intro */}
          <div
            style={{
              transform: `scale(${introTitleScale})`,
              marginBottom: 30,
              filter: p.logo.glowEnabled
                ? `drop-shadow(0 0 30px ${accent}80) drop-shadow(0 0 60px ${accent}33)`
                : 'none',
            }}
          >
            <Img
              src={
                p.logo.logoIsUrl ? p.logo.file : staticFile(p.logo.file)
              }
              style={{
                width: 280,
                height: 280,
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Divider */}
          <div
            style={{
              width: interpolate(frame, [25, 50], [0, 200], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              height: 2,
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              marginBottom: 30,
            }}
          />

          {/* Intro title */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              fontFamily: font,
              color: '#ffffff',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              textAlign: 'center',
              opacity: introTitleScale,
            }}
          >
            {p.intro.title}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 400,
              fontFamily: font,
              color: `${accent}cc`,
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              marginTop: 12,
              opacity: interpolate(frame, [30, 50], [0, 1], {
                extrapolateRight: 'clamp',
              }),
            }}
          >
            {p.intro.subtitle}
          </div>
        </AbsoluteFill>
      )}

      {/* ══ SLIDES ══ */}
      {inSlides &&
        p.slides.map((slide, i) => {
          const slideStart = introEnd + i * p.framesPerSlide;
          const slideEnd = slideStart + p.framesPerSlide + p.transitionFrames;

          if (frame < slideStart - p.transitionFrames || frame > slideEnd)
            return null;

          return (
            <SlideContent
              key={i}
              slide={slide}
              slideIndex={i}
              localFrame={frame - slideStart}
              transitionFrames={p.transitionFrames}
              framesPerSlide={p.framesPerSlide}
              accent={accent}
              secondaryAccent={p.theme.secondaryAccent}
              overlayOpacity={p.theme.slideImageOverlay}
              isLast={i === p.slides.length - 1}
              transition={p.transition}
            />
          );
        })}

      {/* ══ OUTRO ══ */}
      {isOutro && (
        <AbsoluteFill
          style={{
            opacity: outroOpacity,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              transform: `scale(${outroScale})`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 58,
                fontWeight: 800,
                fontFamily: font,
                color: '#ffffff',
                letterSpacing: '0.08em',
                lineHeight: 1.2,
                marginBottom: 24,
              }}
            >
              {p.outro.text}
            </div>
            <div
              style={{
                width: 80,
                height: 3,
                background: `linear-gradient(90deg, ${accent}, ${p.theme.secondaryAccent})`,
                margin: '0 auto 24px',
                boxShadow: `0 0 20px ${accent}66`,
              }}
            />
            <div
              style={{
                fontSize: 28,
                fontWeight: 500,
                fontFamily: font,
                color: accent,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
              }}
            >
              {p.outro.subtext}
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Logo only shown in outro (intro already has its own big logo) */}

      {/* ══ PROGRESS ══ */}
      {p.progress.enabled && inSlides && (
        <ProgressIndicator
          currentSlide={currentSlideIndex}
          totalSlides={p.slides.length}
          slideProgress={slideProgress}
          style={p.progress.style}
          position={p.progress.position}
          accent={accent}
        />
      )}
    </AbsoluteFill>
  );
};
