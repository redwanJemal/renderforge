import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
} from 'remotion';

type LogoPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';

interface LogoProps {
  src: string;
  position?: LogoPosition;
  size?: number;
  delay?: number;
  padding?: number;
  style?: React.CSSProperties;
}

const getPositionStyles = (
  position: LogoPosition,
  padding: number
): React.CSSProperties => {
  const base: React.CSSProperties = { position: 'absolute' };

  switch (position) {
    case 'top-left':
      return { ...base, top: padding, left: padding };
    case 'top-right':
      return { ...base, top: padding, right: padding };
    case 'bottom-left':
      return { ...base, bottom: padding, left: padding };
    case 'bottom-right':
      return { ...base, bottom: padding, right: padding };
    case 'center':
      return {
        ...base,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    default:
      return { ...base, top: padding, left: padding };
  }
};

export const Logo: React.FC<LogoProps> = ({
  src,
  position = 'top-left',
  size = 80,
  delay = 0,
  padding = 40,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [hasError, setHasError] = React.useState(false);

  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: {
      damping: 15,
      stiffness: 100,
      mass: 0.5,
    },
  });

  const opacity = interpolate(Math.max(0, frame - delay), [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });

  if (!src || hasError) return null;

  const posStyles = getPositionStyles(position, padding);

  return (
    <div
      style={{
        ...posStyles,
        opacity,
        transform: `${posStyles.transform ?? ''} scale(${progress})`.trim(),
        zIndex: 10,
        ...style,
      }}
    >
      <Img
        src={src}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
        }}
        onError={() => setHasError(true)}
      />
    </div>
  );
};
