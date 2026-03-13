import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import type { Theme } from '../types';

type TextAnimation =
  | 'fadeIn'
  | 'slideUp'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleIn'
  | 'typewriter';

interface AnimatedTextProps {
  text: string;
  delay?: number;
  animation?: TextAnimation;
  style?: React.CSSProperties;
  theme?: Theme;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  delay = 0,
  animation = 'fadeIn',
  style,
  theme,
  as: Tag = 'div',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);

  const springProgress = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping: 18,
      stiffness: 120,
      mass: 0.7,
    },
  });

  const fadeOpacity = interpolate(adjustedFrame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Typewriter: reveal characters one by one
  const typewriterLength =
    animation === 'typewriter'
      ? Math.min(
          text.length,
          Math.floor(interpolate(adjustedFrame, [0, text.length * 1.5], [0, text.length], {
            extrapolateRight: 'clamp',
          }))
        )
      : text.length;

  const displayText =
    animation === 'typewriter' ? text.slice(0, typewriterLength) : text;

  let transform = 'none';
  let opacity = frame < delay ? 0 : 1;

  switch (animation) {
    case 'fadeIn':
      opacity = fadeOpacity;
      break;
    case 'slideUp':
      opacity = fadeOpacity;
      transform = `translateY(${(1 - springProgress) * 60}px)`;
      break;
    case 'slideLeft':
      opacity = fadeOpacity;
      transform = `translateX(${(1 - springProgress) * -80}px)`;
      break;
    case 'slideRight':
      opacity = fadeOpacity;
      transform = `translateX(${(1 - springProgress) * 80}px)`;
      break;
    case 'scaleIn':
      opacity = fadeOpacity;
      transform = `scale(${0.5 + springProgress * 0.5})`;
      break;
    case 'typewriter':
      opacity = adjustedFrame > 0 ? 1 : 0;
      break;
  }

  return (
    <Tag
      style={{
        opacity,
        transform,
        fontFamily: theme?.fonts.body ?? 'inherit',
        color: theme?.colors.text ?? 'inherit',
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        ...style,
      }}
    >
      {displayText}
      {animation === 'typewriter' && typewriterLength < text.length && (
        <span
          style={{
            opacity: Math.round(adjustedFrame / 8) % 2 === 0 ? 1 : 0,
            fontWeight: 100,
          }}
        >
          |
        </span>
      )}
    </Tag>
  );
};
