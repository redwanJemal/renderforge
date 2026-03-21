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
import type { Theme, Format } from '../../types';
import { responsiveFontSize, responsivePadding } from '../../core/formats';
import { registry } from '../../core/registry';
import { meta } from './meta';
import { motivationalNarrationSchema, defaultProps } from './schema';
import type { MotivationalNarrationProps, Scene } from './schema';

// ── Helpers ──────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

/** Resolve logo — use directly if URL, otherwise staticFile() for local files */
function resolveLogoSrc(logo: string): string {
  if (logo.startsWith('http://') || logo.startsWith('https://') || logo.startsWith('data:')) {
    return logo;
  }
  return staticFile(logo);
}

// ── Particles ──────────────────────────────

const Particle: React.FC<{
  index: number;
  color: string;
}> = ({ index, color }) => {
  const frame = useCurrentFrame();
  const seed = index * 137.5;
  const x = seededRandom(seed * 7) * 100;
  const y = 30 + seededRandom(seed * 13) * 70;
  const size = 2 + seededRandom(seed * 3) * 5;
  const delay = seededRandom(seed * 11) * 40;
  const speed = 0.2 + seededRandom(seed * 17) * 0.5;
  const baseOpacity = 0.2 + seededRandom(seed * 23) * 0.5;

  const adj = Math.max(0, frame - delay);
  const fadeIn = interpolate(adj, [0, 30], [0, baseOpacity], { extrapolateRight: 'clamp' });

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
        filter: size > 4 ? 'blur(2px)' : undefined,
        opacity: fadeIn,
        transform: `translateY(${adj * speed * -0.4}px) translateX(${Math.sin(adj * 0.02 + x) * 15}px)`,
        boxShadow: `0 0 ${size * 2}px ${color}`,
      }}
    />
  );
};

// ── Scan Line ──────────────────────────────

const ScanLine: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: `${interpolate(frame % 120, [0, 120], [-5, 105])}%`,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        opacity: 0.12,
        filter: 'blur(1px)',
      }}
    />
  );
};

// ── Text Animations ──────────────────────────

const CharRevealText: React.FC<{
  text: string;
  delay: number;
  style: React.CSSProperties;
  highlight?: string;
  accent?: string;
}> = ({ text, delay, style, highlight, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const highlightLower = highlight?.toLowerCase() ?? '';
  const textLower = text.toLowerCase();
  const hlStart = highlightLower ? textLower.indexOf(highlightLower) : -1;
  const hlEnd = hlStart >= 0 ? hlStart + highlightLower.length : -1;

  return (
    <div style={{ ...style, display: 'flex', flexWrap: 'wrap', justifyContent: style.textAlign === 'left' ? 'flex-start' : 'center' }}>
      {text.split('').map((char, i) => {
        const charDelay = delay + i * 1.8;
        const adj = Math.max(0, frame - charDelay);
        const progress = spring({
          frame: adj,
          fps,
          config: { damping: 12, stiffness: 200, mass: 0.3 },
        });
        const opacity = interpolate(adj, [0, 6], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const isHighlight = accent && hlStart >= 0 && i >= hlStart && i < hlEnd;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity,
              transform: `translateY(${(1 - progress) * 20}px) scale(${0.5 + progress * 0.5})`,
              color: isHighlight ? accent : style.color,
              textShadow: isHighlight ? `0 0 30px ${accent}66` : undefined,
              whiteSpace: char === ' ' ? 'pre' : undefined,
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};

const WordRevealText: React.FC<{
  text: string;
  delay: number;
  style: React.CSSProperties;
  highlight?: string;
  accent?: string;
}> = ({ text, delay, style, highlight, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');

  return (
    <div style={{ ...style, display: 'flex', flexWrap: 'wrap', justifyContent: style.textAlign === 'left' ? 'flex-start' : 'center', gap: '0 0.3em' }}>
      {words.map((word, i) => {
        const wordDelay = delay + i * 4;
        const adj = Math.max(0, frame - wordDelay);
        const progress = spring({
          frame: adj,
          fps,
          config: { damping: 14, stiffness: 120, mass: 0.5 },
        });
        const opacity = interpolate(adj, [0, 8], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const isHighlight = accent && highlight && highlight.toLowerCase().includes(word.toLowerCase());

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity,
              transform: `translateY(${(1 - progress) * 30}px)`,
              color: isHighlight ? accent : style.color,
              textShadow: isHighlight ? `0 0 30px ${accent}66` : undefined,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// ── Accent Bar ──────────────────────────────

const AccentBar: React.FC<{
  progress: number;
  color: string;
  format: Format;
}> = ({ progress, color, format }) => {
  const barHeight = format === 'landscape' ? 3 : 4;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: `${progress * 100}%`,
        height: barHeight,
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
        boxShadow: `0 0 10px ${color}66`,
        transition: 'width 0.1s linear',
      }}
    />
  );
};

// ── Scene Renderer ──────────────────────────

const SceneView: React.FC<{
  scene: Scene;
  localFrame: number;
  transitionFrames: number;
  isLast: boolean;
  isFirst: boolean;
  theme: Theme;
  format: Format;
  accentColor: string;
  sceneIndex: number;
  totalScenes: number;
}> = ({ scene, localFrame, transitionFrames, isLast, isFirst, theme, format, accentColor, sceneIndex, totalScenes }) => {
  const { fps } = useVideoConfig();

  // Fade transitions
  const enterDuration = transitionFrames + 5;
  const exitDuration = transitionFrames + 5;

  const enterProgress = interpolate(localFrame, [0, enterDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exitStart = scene.durationFrames - exitDuration;
  const exitProgress = interpolate(localFrame, [exitStart, scene.durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const visibility = Math.min(enterProgress, exitProgress);

  // Entrance transforms
  let translateX = 0;
  let translateY = 0;
  let scale = 1;

  const springVal = spring({
    frame: localFrame,
    fps,
    config: { damping: 16, stiffness: 100, mass: 0.8 },
  });

  switch (scene.entrance) {
    case 'slideUp':
      translateY = interpolate(springVal, [0, 1], [80, 0]);
      break;
    case 'slideLeft':
      translateX = interpolate(springVal, [0, 1], [120, 0]);
      break;
    case 'scaleIn':
      scale = interpolate(springVal, [0, 1], [0.6, 1]);
      break;
    case 'slam': {
      const slamScale = spring({
        frame: localFrame,
        fps,
        config: { damping: 10, stiffness: 200, mass: 1.2 },
      });
      scale = interpolate(slamScale, [0, 1], [3, 1]);
      break;
    }
    case 'fadeIn':
    default:
      break;
  }

  const padding = responsivePadding(60, format);
  const textSize = responsiveFontSize(scene.textSize, format, 'heading');
  const subtextSize = responsiveFontSize(scene.subtextSize || 28, format, 'body');

  // Animated divider under text
  const dividerWidth = interpolate(enterProgress, [0, 1], [0, 55]);
  const dividerOpacity = interpolate(localFrame, [enterDuration, enterDuration + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Scene counter
  const counterOpacity = interpolate(localFrame, [enterDuration, enterDuration + 10], [0, 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) * exitProgress;

  const useCharReveal = scene.entrance === 'fadeIn' || scene.entrance === 'scaleIn';

  return (
    <AbsoluteFill style={{ opacity: visibility }}>
      {/* Scene-specific radial light */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${50 + sceneIndex * 8}% ${40 + sceneIndex * 5}%, ${accentColor}08 0%, transparent 60%)`,
        }}
      />

      {/* Content */}
      <AbsoluteFill
        style={{
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: scene.textAlign === 'left' ? 'flex-start' : 'center',
          padding: padding * 1.5,
        }}
      >
        {/* Scene counter */}
        {totalScenes > 1 && (
          <div
            style={{
              position: 'absolute',
              top: format === 'landscape' ? 40 : 80,
              right: format === 'landscape' ? 40 : 60,
              fontSize: 16,
              fontWeight: 600,
              fontFamily: theme.fonts.body,
              color: accentColor,
              opacity: counterOpacity,
              letterSpacing: 2,
            }}
          >
            {sceneIndex + 1} / {totalScenes}
          </div>
        )}

        {/* Main text — use charReveal or wordReveal for richer animation */}
        {useCharReveal ? (
          <CharRevealText
            text={scene.text}
            delay={5}
            highlight={scene.highlight}
            accent={accentColor}
            style={{
              fontSize: textSize,
              fontWeight: 800,
              fontFamily: theme.fonts.heading,
              color: '#ffffff',
              textAlign: scene.textAlign,
              lineHeight: 1.3,
              maxWidth: '90%',
            }}
          />
        ) : (
          <WordRevealText
            text={scene.text}
            delay={3}
            highlight={scene.highlight}
            accent={accentColor}
            style={{
              fontSize: textSize,
              fontWeight: 800,
              fontFamily: theme.fonts.heading,
              color: '#ffffff',
              textAlign: scene.textAlign,
              lineHeight: 1.3,
              maxWidth: '90%',
            }}
          />
        )}

        {/* Subtext */}
        {scene.subtext && (
          <div
            style={{
              fontSize: subtextSize,
              fontWeight: 400,
              fontFamily: theme.fonts.body,
              color: 'rgba(255,255,255,0.5)',
              textAlign: scene.textAlign,
              lineHeight: 1.7,
              marginTop: 20,
              opacity: interpolate(localFrame, [enterDuration + 5, enterDuration + 20], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }) * exitProgress,
              whiteSpace: 'pre-line',
              maxWidth: '85%',
              letterSpacing: '0.02em',
            }}
          >
            {scene.subtext}
          </div>
        )}

        {/* Accent divider line — like yld-intro */}
        <div
          style={{
            width: `${dividerWidth}%`,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            marginTop: 28,
            opacity: dividerOpacity * exitProgress,
            alignSelf: scene.textAlign === 'left' ? 'flex-start' : 'center',
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Intro/Outro Logo Section ──────────────────

const LogoSection: React.FC<{
  logo?: string;
  title?: string;
  logoSize: number;
  accentColor: string;
  opacity: number;
  scale: number;
  glowIntensity: number;
  dividerProgress: number;
  theme: Theme;
  format: Format;
}> = ({ logo, title, logoSize, accentColor, opacity, scale, glowIntensity, dividerProgress, theme, format }) => {
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {logo && (
        <Img
          src={resolveLogoSrc(logo)}
          style={{
            width: logoSize * 2,
            height: logoSize * 2,
            objectFit: 'contain',
            marginBottom: 20,
            filter: `drop-shadow(0 0 ${40 * glowIntensity}px ${accentColor}80) drop-shadow(0 0 ${80 * glowIntensity}px ${accentColor}33)`,
          }}
        />
      )}
      {title && (
        <div
          style={{
            fontSize: responsiveFontSize(28, format, 'caption'),
            fontWeight: 300,
            fontFamily: theme.fonts.heading,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            marginTop: 8,
          }}
        >
          {title}
        </div>
      )}
      {/* Accent divider */}
      <div
        style={{
          width: dividerProgress,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          marginTop: 16,
          opacity: opacity > 0.5 ? 1 : opacity * 2,
        }}
      />
    </AbsoluteFill>
  );
};

// ── Main Component ──────────────────────────

const MotivationalNarration: React.FC<
  MotivationalNarrationProps & { theme: Theme; format: Format }
> = (props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = props;

  // Active scene detection
  let activeSceneIndex = -1;
  for (let i = 0; i < p.scenes.length; i++) {
    const s = p.scenes[i];
    if (frame >= s.startFrame && frame < s.startFrame + s.durationFrames) {
      activeSceneIndex = i;
      break;
    }
  }

  // Global fade in/out
  const globalFadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const globalFadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const globalOpacity = Math.min(globalFadeIn, globalFadeOut);

  // ── INTRO ──
  const introEnd = p.introHoldFrames;
  const introLogoScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 60, mass: 1.0 },
  });
  const introOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const introFadeOut = interpolate(frame, [introEnd - 15, introEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const introGlow = Math.sin(frame * 0.06) * 0.3 + 0.7;
  const introDivider = interpolate(frame, [15, 40], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── OUTRO ──
  const lastScene = p.scenes[p.scenes.length - 1];
  const scenesEnd = lastScene ? lastScene.startFrame + lastScene.durationFrames : introEnd;
  const outroStart = scenesEnd + 8;
  const outroLogoScale = spring({
    frame: Math.max(0, frame - outroStart),
    fps,
    config: { damping: 15, stiffness: 60, mass: 1.0 },
  });
  const outroOpacity = interpolate(frame, [outroStart, outroStart + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outroFadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outroDivider = interpolate(frame - outroStart, [5, 25], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Progress bar
  const totalEnd = lastScene ? lastScene.startFrame + lastScene.durationFrames : durationInFrames;
  const overallProgress = interpolate(frame, [0, totalEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Vignette pulse on scene transitions
  const vignettePulse = activeSceneIndex >= 0
    ? interpolate(
        frame - p.scenes[activeSceneIndex].startFrame,
        [0, 10, 30],
        [0.15, 0.05, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      )
    : 0;

  return (
    <AbsoluteFill style={{ opacity: globalOpacity, backgroundColor: '#000' }}>
      {/* Background gradient */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 35%, ${p.bgGradient[1]} 0%, ${p.bgGradient[0]} 40%, ${p.bgGradient[2]} 100%)`,
        }}
      />

      {/* Grid overlay */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${p.accentColor}4D 1px, transparent 1px), linear-gradient(90deg, ${p.accentColor}4D 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          opacity: 0.035,
        }}
      />

      {/* Particles */}
      {p.particlesEnabled && (
        <AbsoluteFill>
          {Array.from({ length: 40 }, (_, i) => (
            <Particle key={i} index={i} color={`${p.accentColor}99`} />
          ))}
        </AbsoluteFill>
      )}

      {/* Scan line */}
      <ScanLine accent={p.accentColor} />

      {/* ── INTRO: Logo + channel name ── */}
      {(p.logo || p.title) && frame < introEnd + 5 && (
        <LogoSection
          logo={p.logo}
          title={p.title}
          logoSize={p.logoSize}
          accentColor={p.accentColor}
          opacity={introOpacity * introFadeOut}
          scale={introLogoScale}
          glowIntensity={introGlow}
          dividerProgress={introDivider}
          theme={props.theme}
          format={props.format}
        />
      )}

      {/* Scenes */}
      {p.scenes.map((scene, i) => {
        const localFrame = frame - scene.startFrame;
        if (localFrame < -5 || localFrame > scene.durationFrames + 5) return null;
        const clampedLocal = Math.max(0, localFrame);
        return (
          <SceneView
            key={i}
            scene={scene}
            localFrame={clampedLocal}
            transitionFrames={p.transitionFrames}
            isLast={i === p.scenes.length - 1}
            isFirst={i === 0}
            theme={props.theme}
            format={props.format}
            accentColor={p.accentColor}
            sceneIndex={i}
            totalScenes={p.scenes.length}
          />
        );
      })}

      {/* ── OUTRO: Logo + channel name ── */}
      {(p.logo || p.title) && frame > outroStart - 5 && (
        <LogoSection
          logo={p.logo}
          title={p.title}
          logoSize={p.logoSize}
          accentColor={p.accentColor}
          opacity={outroOpacity * outroFadeOut}
          scale={outroLogoScale}
          glowIntensity={0.7}
          dividerProgress={outroDivider}
          theme={props.theme}
          format={props.format}
        />
      )}

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${0.65 + vignettePulse}) 100%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Progress bar */}
      <AccentBar progress={overallProgress} color={p.accentColor} format={props.format} />
    </AbsoluteFill>
  );
};

registry.register({
  meta,
  schema: motivationalNarrationSchema,
  component: MotivationalNarration,
  defaultProps,
});

export default MotivationalNarration;
