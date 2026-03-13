import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface BounceInProps {
  children: React.ReactNode;
  delay?: number;
  scale?: [number, number];
  style?: React.CSSProperties;
}

export const BounceIn: React.FC<BounceInProps> = ({
  children,
  delay = 0,
  scale = [0, 1],
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adj = Math.max(0, frame - delay);

  const progress = spring({
    frame: adj,
    fps,
    config: { damping: 8, stiffness: 180, mass: 0.5 },
  });

  const scaleValue = interpolate(progress, [0, 1], scale);
  const opacity = interpolate(adj, [0, 6], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scaleValue})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
