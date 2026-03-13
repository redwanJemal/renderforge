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

// ── Particles Background ──────────────────────

const Particle: React.FC<{
  index: number;
  color: string;
}> = ({ index, color }) => {
  const frame = useCurrentFrame();
  const seed = index * 137.5;
  const x = ((seed * 7.3) % 100);
  const size = 2 + (seed % 4);
  const speed = 0.3 + (seed % 5) * 0.1;
  const y = ((frame * speed + seed * 3) % 120) - 10;
  const drift = Math.sin(frame * 0.02 + seed) * 15;
  const opacity = interpolate(y, [0, 20, 80, 110], [0, 0.6, 0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x + drift * 0.3}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        opacity: opacity * 0.5,
      }}
    />
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
  theme: Theme;
  format: Format;
  accentColor: string;
}> = ({ scene, localFrame, transitionFrames, isLast, theme, format, accentColor }) => {
  const { fps } = useVideoConfig();

  // Enter animation (0 → transitionFrames)
  const enterProgress = interpolate(
    localFrame,
    [0, transitionFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Exit animation (durationFrames - transitionFrames → durationFrames)
  const exitStart = scene.durationFrames - transitionFrames;
  const exitProgress = isLast
    ? 1
    : interpolate(
        localFrame,
        [exitStart, scene.durationFrames],
        [1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );

  const visibility = Math.min(enterProgress, exitProgress);

  // Entrance-specific transforms
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

  // Subtext staggered entrance
  const subtextDelay = Math.min(20, transitionFrames);
  const subtextOpacity = interpolate(
    localFrame,
    [subtextDelay, subtextDelay + 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const padding = responsivePadding(format);
  const textSize = responsiveFontSize(scene.textSize, format, 'heading');
  const subtextSize = responsiveFontSize(scene.subtextSize || 28, format, 'body');

  // Render text with highlighted words
  const renderHighlightedText = (text: string, highlight?: string) => {
    if (!highlight) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <span key={i} style={{ color: accentColor }}>{part}</span>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  return (
    <AbsoluteFill
      style={{
        opacity: visibility,
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: scene.textAlign === 'left' ? 'flex-start' : 'center',
        padding: padding * 1.5,
      }}
    >
      {/* Main text */}
      <div
        style={{
          fontSize: textSize,
          fontWeight: 800,
          fontFamily: theme.fonts.heading,
          color: '#ffffff',
          textAlign: scene.textAlign,
          lineHeight: 1.3,
          whiteSpace: 'pre-line',
          textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          maxWidth: '90%',
        }}
      >
        {renderHighlightedText(scene.text, scene.highlight)}
      </div>

      {/* Subtext */}
      {scene.subtext && (
        <div
          style={{
            fontSize: subtextSize,
            fontWeight: 400,
            fontFamily: theme.fonts.body,
            color: 'rgba(255,255,255,0.75)',
            textAlign: scene.textAlign,
            lineHeight: 1.5,
            marginTop: 20,
            opacity: subtextOpacity,
            whiteSpace: 'pre-line',
            maxWidth: '85%',
          }}
        >
          {scene.subtext}
        </div>
      )}

      {/* Accent underline */}
      <div
        style={{
          width: interpolate(enterProgress, [0, 1], [0, 120]),
          height: 3,
          background: accentColor,
          marginTop: 24,
          borderRadius: 2,
          alignSelf: scene.textAlign === 'left' ? 'flex-start' : 'center',
          opacity: visibility,
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

  // Find which scene is active based on startFrame/durationFrames
  let activeSceneIndex = -1;
  for (let i = 0; i < p.scenes.length; i++) {
    const s = p.scenes[i];
    if (frame >= s.startFrame && frame < s.startFrame + s.durationFrames) {
      activeSceneIndex = i;
      break;
    }
  }

  // Global fade in/out
  const globalFadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const globalFadeOut = interpolate(
    frame,
    [durationInFrames - 25, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const globalOpacity = Math.min(globalFadeIn, globalFadeOut);

  // Intro logo animation
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.6 },
  });
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Fade logo out when first scene starts
  const firstSceneStart = p.scenes.length > 0 ? p.scenes[0].startFrame : p.introHoldFrames;
  const logoFadeOut = interpolate(
    frame,
    [firstSceneStart - 10, firstSceneStart + 5],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Overall progress for accent bar
  const lastScene = p.scenes[p.scenes.length - 1];
  const totalEnd = lastScene ? lastScene.startFrame + lastScene.durationFrames : durationInFrames;
  const overallProgress = interpolate(frame, [0, totalEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Vignette pulse synced to scene transitions
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
          background: `radial-gradient(ellipse at 50% 40%, ${p.bgGradient[1]} 0%, ${p.bgGradient[0]} 50%, ${p.bgGradient[2]} 100%)`,
        }}
      />

      {/* Subtle grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${p.accentColor}08 1px, transparent 1px), linear-gradient(90deg, ${p.accentColor}08 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          opacity: 0.4,
        }}
      />

      {/* Particles */}
      {p.particlesEnabled && (
        <AbsoluteFill>
          {Array.from({ length: 25 }, (_, i) => (
            <Particle key={i} index={i} color={p.accentColor} />
          ))}
        </AbsoluteFill>
      )}

      {/* Scan line */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(transparent 0%, transparent ${((frame * 0.5) % 100)}%, ${p.accentColor}06 ${((frame * 0.5) % 100)}%, transparent ${((frame * 0.5) % 100) + 2}%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Intro: Logo + title */}
      {(p.logo || p.title) && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: logoOpacity * logoFadeOut,
            transform: `scale(${logoScale})`,
          }}
        >
          {p.logo && (
            <Img
              src={staticFile(p.logo)}
              style={{
                width: p.logoSize,
                height: p.logoSize,
                objectFit: 'contain',
                marginBottom: 16,
              }}
            />
          )}
          {p.title && (
            <div
              style={{
                fontSize: responsiveFontSize(24, props.format, 'caption'),
                fontWeight: 600,
                fontFamily: props.theme.fonts.heading,
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: 3,
                textTransform: 'uppercase',
              }}
            >
              {p.title}
            </div>
          )}
        </AbsoluteFill>
      )}

      {/* Scenes */}
      {p.scenes.map((scene, i) => {
        const localFrame = frame - scene.startFrame;
        // Only render if within range (with some buffer for transitions)
        if (localFrame < -5 || localFrame > scene.durationFrames + 5) return null;
        const clampedLocal = Math.max(0, localFrame);
        return (
          <SceneView
            key={i}
            scene={scene}
            localFrame={clampedLocal}
            transitionFrames={p.transitionFrames}
            isLast={i === p.scenes.length - 1}
            theme={props.theme}
            format={props.format}
            accentColor={p.accentColor}
          />
        );
      })}

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${0.6 + vignettePulse}) 100%)`,
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
