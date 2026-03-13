import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

type WipeShape = 'circle' | 'star' | 'heart' | 'diamond';

interface ShapeWipeProps {
  children: React.ReactNode;
  shape?: WipeShape;
  startFrame: number;
  durationFrames?: number;
  color?: string;
}

function getClipPath(shape: WipeShape, progress: number): string {
  const r = progress * 150; // percentage radius

  switch (shape) {
    case 'circle':
      return `circle(${r}% at 50% 50%)`;
    case 'diamond': {
      const s = r * 0.75;
      return `polygon(50% ${50 - s}%, ${50 + s}% 50%, 50% ${50 + s}%, ${50 - s}% 50%)`;
    }
    case 'star': {
      const outerR = r * 0.8;
      const innerR = outerR * 0.4;
      const points: string[] = [];
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 72 - 90) * (Math.PI / 180);
        const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180);
        points.push(`${50 + outerR * Math.cos(outerAngle)}% ${50 + outerR * Math.sin(outerAngle)}%`);
        points.push(`${50 + innerR * Math.cos(innerAngle)}% ${50 + innerR * Math.sin(innerAngle)}%`);
      }
      return `polygon(${points.join(', ')})`;
    }
    case 'heart': {
      // Approximate heart as a large circle for simplicity at this scale
      return `circle(${r}% at 50% 50%)`;
    }
    default:
      return `circle(${r}% at 50% 50%)`;
  }
}

export const ShapeWipe: React.FC<ShapeWipeProps> = ({
  children,
  shape = 'circle',
  startFrame,
  durationFrames = 20,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adj = Math.max(0, frame - startFrame);

  if (frame < startFrame) return null;

  const progress = spring({
    frame: adj,
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.6 },
  });

  const clipPath = getClipPath(shape, progress);

  return (
    <AbsoluteFill>
      {/* Colored wipe layer */}
      {color && progress < 0.98 && (
        <AbsoluteFill
          style={{
            backgroundColor: color,
            clipPath,
            zIndex: 1,
          }}
        />
      )}
      {/* Content revealed behind wipe */}
      <AbsoluteFill style={{ clipPath }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Iris close/open transition — circle shrinks to black then opens to reveal next scene.
 * Use between sections for classic cartoon feel.
 */
export const IrisTransition: React.FC<{
  startFrame: number;
  durationFrames?: number;
  color?: string;
}> = ({ startFrame, durationFrames = 30, color = '#000000' }) => {
  const frame = useCurrentFrame();
  const midFrame = startFrame + durationFrames / 2;

  if (frame < startFrame || frame > startFrame + durationFrames) return null;

  const isClosing = frame < midFrame;
  const adj = isClosing ? frame - startFrame : frame - midFrame;
  const halfDuration = durationFrames / 2;
  const progress = interpolate(adj, [0, halfDuration], [0, 1], { extrapolateRight: 'clamp' });

  // Closing: circle shrinks from 150% to 0%. Opening: 0% to 150%
  const radius = isClosing
    ? interpolate(progress, [0, 1], [150, 0])
    : interpolate(progress, [0, 1], [0, 150]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        clipPath: `circle(${150 - radius}% at 50% 50%)`,
        zIndex: 10,
      }}
    />
  );
};
