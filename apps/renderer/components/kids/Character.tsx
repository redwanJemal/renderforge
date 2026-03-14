import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

type Gesture = 'idle' | 'wave' | 'celebrate';

interface CharacterProps {
  size?: number;
  gesture?: Gesture;
  flipX?: boolean;
  style?: React.CSSProperties;
}

/**
 * Animated owl mascot for kids templates.
 * Idle: sinusoidal float + periodic blink
 * Wave: one wing rotates via spring
 * Celebrate: both wings up + scale bump
 */
export const Character: React.FC<CharacterProps> = ({
  size = 160,
  gesture = 'idle',
  flipX = false,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Idle float
  const floatY = Math.sin(frame * 0.05) * 6;

  // Blink every ~90 frames for 3 frames
  const blinkCycle = frame % 90;
  const isBlinking = blinkCycle >= 0 && blinkCycle < 3;
  const eyeScaleY = isBlinking ? 0.1 : 1;

  // Wave gesture — right wing rotation
  const waveAngle = gesture === 'wave'
    ? spring({ frame, fps, config: { damping: 6, stiffness: 100, mass: 0.5 } }) * 35
    : 0;

  // Celebrate gesture — both wings up + body scale
  const celebrateProgress = gesture === 'celebrate'
    ? spring({ frame, fps, config: { damping: 8, stiffness: 120, mass: 0.4 } })
    : 0;
  const celebrateWingAngle = celebrateProgress * -40;
  const celebrateScale = 1 + celebrateProgress * 0.12;

  const leftWingAngle = gesture === 'celebrate' ? celebrateWingAngle : 0;
  const rightWingAngle = gesture === 'celebrate' ? -celebrateWingAngle : -waveAngle;

  return (
    <div
      style={{
        width: size,
        height: size,
        transform: `translateY(${floatY}px) scale(${celebrateScale}) scaleX(${flipX ? -1 : 1})`,
        ...style,
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* Body */}
        <ellipse cx="50" cy="58" rx="28" ry="30" fill="#8B6914" />
        <ellipse cx="50" cy="60" rx="22" ry="22" fill="#C4A24E" />

        {/* Belly */}
        <ellipse cx="50" cy="65" rx="15" ry="14" fill="#F5E6B8" />

        {/* Head */}
        <circle cx="50" cy="32" r="22" fill="#8B6914" />

        {/* Face disc */}
        <circle cx="50" cy="34" r="17" fill="#F5E6B8" />

        {/* Ear tufts */}
        <polygon points="32,18 36,8 40,20" fill="#8B6914" />
        <polygon points="68,18 64,8 60,20" fill="#8B6914" />

        {/* Eyes */}
        <g transform={`translate(42, 30) scale(1, ${eyeScaleY})`}>
          <circle cx="0" cy="0" r="5" fill="white" />
          <circle cx="1" cy="0" r="3" fill="#1a1a1a" />
          <circle cx="2" cy="-1" r="1" fill="white" />
        </g>
        <g transform={`translate(58, 30) scale(1, ${eyeScaleY})`}>
          <circle cx="0" cy="0" r="5" fill="white" />
          <circle cx="-1" cy="0" r="3" fill="#1a1a1a" />
          <circle cx="0" cy="-1" r="1" fill="white" />
        </g>

        {/* Beak */}
        <polygon points="47,37 53,37 50,42" fill="#FF8C00" />

        {/* Left wing */}
        <g transform={`rotate(${leftWingAngle}, 28, 52)`}>
          <ellipse cx="22" cy="55" rx="12" ry="18" fill="#6B4F10" />
          <ellipse cx="23" cy="55" rx="8" ry="14" fill="#8B6914" />
        </g>

        {/* Right wing */}
        <g transform={`rotate(${rightWingAngle}, 72, 52)`}>
          <ellipse cx="78" cy="55" rx="12" ry="18" fill="#6B4F10" />
          <ellipse cx="77" cy="55" rx="8" ry="14" fill="#8B6914" />
        </g>

        {/* Feet */}
        <ellipse cx="40" cy="88" rx="8" ry="4" fill="#FF8C00" />
        <ellipse cx="60" cy="88" rx="8" ry="4" fill="#FF8C00" />

        {/* Cheek blush */}
        <circle cx="36" cy="38" r="3" fill="#FFB6C1" opacity="0.5" />
        <circle cx="64" cy="38" r="3" fill="#FFB6C1" opacity="0.5" />
      </svg>
    </div>
  );
};
