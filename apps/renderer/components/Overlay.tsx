import React from 'react';
import { AbsoluteFill } from 'remotion';

interface OverlayProps {
  color?: string;
  opacity?: number;
  gradient?: string;
  style?: React.CSSProperties;
}

export const Overlay: React.FC<OverlayProps> = ({
  color = '#000000',
  opacity = 0.4,
  gradient,
  style,
}) => {
  const background = gradient ?? color;

  return (
    <AbsoluteFill
      style={{
        background,
        opacity,
        ...style,
      }}
    />
  );
};
