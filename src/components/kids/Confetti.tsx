import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const CONFETTI_COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#FFAFCC', '#A2D2FF', '#CAFFBF', '#FFC8DD',
  '#FF595E', '#FFCA3A', '#8AC926', '#1982C4',
];

interface ConfettiProps {
  startFrame: number;
  durationFrames?: number;
  count?: number;
  colors?: string[];
}

export const Confetti: React.FC<ConfettiProps> = ({
  startFrame,
  durationFrames = 60,
  count = 40,
  colors = CONFETTI_COLORS,
}) => {
  const frame = useCurrentFrame();

  if (frame < startFrame || frame > startFrame + durationFrames) return null;

  const adj = frame - startFrame;
  const overallOpacity = interpolate(
    adj,
    [0, 5, durationFrames - 15, durationFrames],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp' }
  );

  const pieces = Array.from({ length: count }, (_, i) => {
    const x = seededRandom(i * 7) * 100;
    const startY = -10 - seededRandom(i * 3) * 20;
    const speed = 1.5 + seededRandom(i * 11) * 2.5;
    const drift = (seededRandom(i * 17) - 0.5) * 2;
    const rotation = seededRandom(i * 23) * 360;
    const rotSpeed = (seededRandom(i * 29) - 0.5) * 15;
    const color = colors[i % colors.length];
    const size = 8 + seededRandom(i * 31) * 12;
    const isCircle = seededRandom(i * 37) > 0.6;

    const y = startY + adj * speed;
    const currentX = x + Math.sin(adj * 0.1 + i) * drift * 3;
    const rot = rotation + adj * rotSpeed;

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${currentX}%`,
          top: `${y}%`,
          width: isCircle ? size : size * 0.6,
          height: size,
          backgroundColor: color,
          borderRadius: isCircle ? '50%' : 2,
          transform: `rotate(${rot}deg)`,
          opacity: overallOpacity,
        }}
      />
    );
  });

  return <AbsoluteFill style={{ overflow: 'hidden', zIndex: 5 }}>{pieces}</AbsoluteFill>;
};

/**
 * Star burst — stars scale up and out from center
 */
export const StarBurst: React.FC<{
  startFrame: number;
  durationFrames?: number;
  color?: string;
}> = ({ startFrame, durationFrames = 40, color = '#FFD93D' }) => {
  const frame = useCurrentFrame();

  if (frame < startFrame || frame > startFrame + durationFrames) return null;

  const adj = frame - startFrame;
  const opacity = interpolate(adj, [0, 5, durationFrames - 10, durationFrames], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
  });

  const stars = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const distance = interpolate(adj, [0, durationFrames * 0.6], [0, 300], {
      extrapolateRight: 'clamp',
    });
    const x = 50 + Math.cos(angle) * (distance / 10);
    const y = 50 + Math.sin(angle) * (distance / 10);
    const scale = interpolate(adj, [0, 10, durationFrames], [0, 1.2, 0.3], {
      extrapolateRight: 'clamp',
    });
    const rot = adj * 3 + i * 45;

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          transform: `translate(-50%, -50%) scale(${scale}) rotate(${rot}deg)`,
          fontSize: 32,
          opacity,
          color,
        }}
      >
        ★
      </div>
    );
  });

  return <AbsoluteFill style={{ overflow: 'hidden', zIndex: 5 }}>{stars}</AbsoluteFill>;
};
