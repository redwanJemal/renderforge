import React from 'react';
import { AbsoluteFill, Img } from 'remotion';

type BackgroundType = 'solid' | 'gradient' | 'image';

interface BackgroundProps {
  type?: BackgroundType;
  colors?: string[];
  imageUrl?: string;
  opacity?: number;
  gradientDirection?: string;
  style?: React.CSSProperties;
}

export const Background: React.FC<BackgroundProps> = ({
  type = 'solid',
  colors = ['#FFFFFF'],
  imageUrl,
  opacity = 1,
  gradientDirection = '135deg',
  style,
}) => {
  const [imgError, setImgError] = React.useState(false);

  const getBackground = (): string => {
    switch (type) {
      case 'solid':
        return colors[0] ?? '#FFFFFF';
      case 'gradient':
        if (colors.length < 2) {
          return colors[0] ?? '#FFFFFF';
        }
        return `linear-gradient(${gradientDirection}, ${colors.join(', ')})`;
      case 'image':
        return 'transparent';
      default:
        return '#FFFFFF';
    }
  };

  return (
    <AbsoluteFill
      style={{
        opacity,
        ...style,
      }}
    >
      {type === 'image' && imageUrl && !imgError ? (
        <Img
          src={imageUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: type === 'image' && (!imageUrl || imgError)
              ? `linear-gradient(135deg, ${colors[0] ?? '#667eea'}, ${colors[1] ?? '#764ba2'})`
              : getBackground(),
          }}
        />
      )}
    </AbsoluteFill>
  );
};
