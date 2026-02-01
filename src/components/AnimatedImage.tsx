import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
} from 'remotion';

type ImageAnimation = 'fadeIn' | 'slideUp' | 'slideLeft' | 'scaleIn' | 'zoomSlow';
type ImageFit = 'cover' | 'contain';

interface AnimatedImageProps {
  src: string;
  delay?: number;
  animation?: ImageAnimation;
  fit?: ImageFit;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
}

export const AnimatedImage: React.FC<AnimatedImageProps> = ({
  src,
  delay = 0,
  animation = 'fadeIn',
  fit = 'cover',
  style,
  width = '100%',
  height = '100%',
  borderRadius = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);

  const springProgress = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
      mass: 0.8,
    },
  });

  const fadeOpacity = interpolate(adjustedFrame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  let transform = 'none';
  let opacity = frame < delay ? 0 : 1;

  switch (animation) {
    case 'fadeIn':
      opacity = fadeOpacity;
      break;
    case 'slideUp':
      opacity = fadeOpacity;
      transform = `translateY(${(1 - springProgress) * 50}px)`;
      break;
    case 'slideLeft':
      opacity = fadeOpacity;
      transform = `translateX(${(1 - springProgress) * -60}px)`;
      break;
    case 'scaleIn':
      opacity = fadeOpacity;
      transform = `scale(${springProgress})`;
      break;
    case 'zoomSlow':
      opacity = fadeOpacity;
      // Slow zoom from 1.0 to 1.1 over time
      const zoom = interpolate(frame, [delay, delay + 120], [1.0, 1.1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      transform = `scale(${zoom})`;
      break;
  }

  // Graceful fallback for broken images
  const [hasError, setHasError] = React.useState(false);

  if (!src || hasError) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius,
          background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
          transform,
          overflow: 'hidden',
          ...style,
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        overflow: 'hidden',
        opacity,
        transform,
        ...style,
      }}
    >
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: fit,
        }}
        onError={() => setHasError(true)}
      />
    </div>
  );
};
