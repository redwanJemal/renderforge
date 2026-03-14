import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

interface DustPuffProps {
  startFrame: number;
  x: number;       // percentage position
  y: number;       // percentage position
  color?: string;
  durationFrames?: number;
}

/**
 * Landing particle burst — 8 tiny circles expanding outward from center.
 * Radial spread 20-40px over durationFrames, fade from 0.5 to 0 opacity.
 */
export const DustPuff: React.FC<DustPuffProps> = ({
  startFrame,
  x,
  y,
  color = 'rgba(255,255,255,0.8)',
  durationFrames = 15,
}) => {
  const frame = useCurrentFrame();
  const adj = frame - startFrame;

  if (adj < 0 || adj > durationFrames) return null;

  const PARTICLE_COUNT = 8;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none', zIndex: 3 }}>
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const spread = interpolate(adj, [0, durationFrames], [0, 20 + (i % 3) * 10], {
          extrapolateRight: 'clamp',
        });
        const opacity = interpolate(adj, [0, durationFrames * 0.3, durationFrames], [0.5, 0.4, 0], {
          extrapolateRight: 'clamp',
        });
        const particleSize = interpolate(adj, [0, durationFrames], [6, 3], {
          extrapolateRight: 'clamp',
        });

        const px = Math.cos(angle) * spread;
        const py = Math.sin(angle) * spread;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: particleSize,
              height: particleSize,
              borderRadius: '50%',
              backgroundColor: color,
              opacity,
              transform: `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
