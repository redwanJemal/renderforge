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
  isFirst: boolean;
  theme: Theme;
  format: Format;
  accentColor: string;
  sceneIndex: number;
  totalScenes: number;
}> = ({ scene, localFrame, transitionFrames, isLast, isFirst, theme, format, accentColor, sceneIndex, totalScenes }) => {
  const { fps } = useVideoConfig();

  // Distinct page transition: fade through black
  const enterDuration = transitionFrames + 5;
  const exitDuration = transitionFrames + 5;

  // Enter: fade in from black (0 → enterDuration)
  const enterProgress = interpolate(
    localFrame,
    [0, enterDuration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Exit: fade out to black (durationFrames - exitDuration → durationFrames)
  const exitStart = scene.durationFrames - exitDuration;
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
  const subtextDelay = Math.min(20, enterDuration + 5);
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

  // Scene counter for page feel
  const counterOpacity = interpolate(localFrame, [enterDuration, enterDuration + 10], [0, 0.4], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }) * exitProgress;

  return (
    <AbsoluteFill style={{ opacity: visibility }}>
      {/* Scene-specific background overlay for page distinction */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${50 + sceneIndex * 5}% ${40 + sceneIndex * 3}%, rgba(255,255,255,0.02) 0%, transparent 70%)`,
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
  const globalFadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const globalFadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const globalOpacity = Math.min(globalFadeIn, globalFadeOut);

  // ── INTRO (2s): logo + channel name, scale in, hold, fade out ──
  const introEnd = p.introHoldFrames;
  const introLogoScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.6 },
  });
  const introLogoOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const introFadeOut = interpolate(
    frame,
    [introEnd - 12, introEnd],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const introGlow = Math.sin(frame * 0.08) * 0.3 + 0.7;

  // ── OUTRO (2s): logo + channel name fade back in after last scene ──
  const lastScene = p.scenes[p.scenes.length - 1];
  const outroHoldFrames = p.outroHoldFrames ?? 60;
  const scenesEnd = lastScene ? lastScene.startFrame + lastScene.durationFrames : introEnd;
  const outroStart = scenesEnd + 8; // small gap after last scene
  const outroLogoScale = spring({
    frame: Math.max(0, frame - outroStart),
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.6 },
  });
  const outroOpacity = interpolate(
    frame,
    [outroStart, outroStart + 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const outroFadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Overall progress for accent bar
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

      {/* ── INTRO: Logo + channel name (2s) ── */}
      {(p.logo || p.title) && frame < introEnd + 5 && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: introLogoOpacity * introFadeOut,
            transform: `scale(${introLogoScale})`,
          }}
        >
          {p.logo && (
            <Img
              src={staticFile(p.logo)}
              style={{
                width: p.logoSize * 1.8,
                height: p.logoSize * 1.8,
                objectFit: 'contain',
                marginBottom: 20,
                filter: `drop-shadow(0 0 ${40 * introGlow}px ${p.accentColor}80) drop-shadow(0 0 ${80 * introGlow}px ${p.accentColor}33)`,
              }}
            />
          )}
          {p.title && (
            <div
              style={{
                fontSize: responsiveFontSize(28, props.format, 'caption'),
                fontWeight: 600,
                fontFamily: props.theme.fonts.heading,
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: 4,
                textTransform: 'uppercase',
                marginTop: 8,
              }}
            >
              {p.title}
            </div>
          )}
          {/* Accent divider under logo */}
          <div
            style={{
              width: interpolate(frame, [10, 30], [0, 100], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              height: 2,
              background: `linear-gradient(90deg, transparent, ${p.accentColor}, transparent)`,
              marginTop: 16,
              opacity: introLogoOpacity,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Scenes — each scene fades through black for distinct page feel */}
      {p.scenes.map((scene, i) => {
        const localFrame = frame - scene.startFrame;
        // Only render if within range (with buffer for transitions)
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

      {/* ── OUTRO: Logo + channel name (2s) ── */}
      {(p.logo || p.title) && frame > outroStart - 5 && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: outroOpacity * outroFadeOut,
            transform: `scale(${outroLogoScale})`,
          }}
        >
          {p.logo && (
            <Img
              src={staticFile(p.logo)}
              style={{
                width: p.logoSize * 1.8,
                height: p.logoSize * 1.8,
                objectFit: 'contain',
                marginBottom: 20,
                filter: `drop-shadow(0 0 30px ${p.accentColor}80)`,
              }}
            />
          )}
          {p.title && (
            <div
              style={{
                fontSize: responsiveFontSize(28, props.format, 'caption'),
                fontWeight: 600,
                fontFamily: props.theme.fonts.heading,
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: 4,
                textTransform: 'uppercase',
                marginTop: 8,
              }}
            >
              {p.title}
            </div>
          )}
          {/* Accent divider */}
          <div
            style={{
              width: interpolate(frame - outroStart, [5, 20], [0, 100], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              height: 2,
              background: `linear-gradient(90deg, transparent, ${p.accentColor}, transparent)`,
              marginTop: 16,
            }}
          />
        </AbsoluteFill>
      )}

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
