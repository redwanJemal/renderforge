import React from 'react';
import { useCurrentFrame, spring, useVideoConfig } from 'remotion';

type SlideDirection = 'left' | 'right' | 'up' | 'down';

interface SlideInProps {
  children: React.ReactNode;
  delay?: number;
  direction?: SlideDirection;
  distance?: number;
  style?: React.CSSProperties;
}

const getTranslate = (
  direction: SlideDirection,
  progress: number,
  distance: number
): string => {
  const offset = (1 - progress) * distance;

  switch (direction) {
    case 'left':
      return `translateX(${-offset}px)`;
    case 'right':
      return `translateX(${offset}px)`;
    case 'up':
      return `translateY(${-offset}px)`;
    case 'down':
      return `translateY(${offset}px)`;
    default:
      return 'none';
  }
};

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  delay = 0,
  direction = 'up',
  distance = 80,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: {
      damping: 20,
      stiffness: 120,
      mass: 0.8,
    },
  });

  const opacity = Math.min(1, progress * 1.5);

  return (
    <div
      style={{
        opacity,
        transform: getTranslate(direction, progress, distance),
        ...style,
      }}
    >
      {children}
    </div>
  );
};
