import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';
import type { Theme } from '../types';

interface CTAProps {
  text: string;
  delay?: number;
  theme?: Theme;
  style?: React.CSSProperties;
  fontSize?: number;
  paddingX?: number;
  paddingY?: number;
}

export const CTA: React.FC<CTAProps> = ({
  text,
  delay = 0,
  theme,
  style,
  fontSize = 32,
  paddingX = 60,
  paddingY = 20,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);

  const scaleSpring = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping: 10,
      stiffness: 150,
      mass: 0.6,
    },
  });

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subtle pulse after entrance
  const pulsePhase = Math.max(0, adjustedFrame - 20);
  const pulse =
    pulsePhase > 0
      ? 1 + Math.sin(pulsePhase * 0.15) * 0.02
      : 1;

  const bgColor = theme?.colors.accent ?? '#F59E0B';
  const textColor =
    theme?.id === 'dark' ? '#0F0F1A' : '#FFFFFF';

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scaleSpring * pulse})`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: bgColor,
          color: textColor,
          fontSize,
          fontWeight: 700,
          fontFamily: theme?.fonts.heading ?? 'inherit',
          paddingLeft: paddingX,
          paddingRight: paddingX,
          paddingTop: paddingY,
          paddingBottom: paddingY,
          borderRadius: theme?.borderRadius ?? 12,
          boxShadow: theme?.shadow ?? '0 4px 24px rgba(0,0,0,0.15)',
          letterSpacing: '0.02em',
          textTransform: 'uppercase' as const,
          whiteSpace: 'nowrap' as const,
          ...style,
        }}
      >
        {text}
      </div>
    </div>
  );
};
