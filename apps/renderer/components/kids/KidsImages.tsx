import React from 'react';
import { Img, staticFile } from 'remotion';

/**
 * PNG image registry for kids templates.
 * Uses Noto Emoji 512x512 PNGs (Apache 2.0 license).
 * Maps icon keys to filenames in public/kids-assets/.
 *
 * Falls back to SVG icons from KidsIcons.tsx when no PNG is available.
 */

const KIDS_PNG_MAP: Record<string, string> = {
  // Animals
  lion: 'lion.png',
  cat: 'cat.png',
  dog: 'dog.png',
  fish: 'fish.png',
  butterfly: 'butterfly.png',
  bird: 'bird.png',
  elephant: 'elephant.png',
  bear: 'bear.png',
  rabbit: 'rabbit.png',
  frog: 'frog.png',
  turtle: 'turtle.png',
  unicorn: 'unicorn.png',
  monkey: 'monkey.png',
  penguin: 'penguin.png',
  whale: 'whale.png',
  octopus: 'octopus.png',
  snail: 'snail.png',
  cow: 'cow.png',
  pig: 'pig.png',

  // Fruits
  apple: 'apple.png',
  banana: 'banana.png',
  grape: 'grape.png',
  watermelon: 'watermelon.png',
  strawberry: 'strawberry.png',
  cherry: 'cherry.png',

  // Shapes & Objects
  star: 'star.png',
  heart: 'heart.png',
  diamond: 'diamond.png',
  trophy: 'trophy.png',
  crown: 'crown.png',
  balloon: 'balloon.png',
  bell: 'bell.png',

  // Nature & Weather
  sun: 'sun.png',
  moon: 'moon.png',
  rainbow: 'rainbow.png',
  flower: 'flower.png',
  tree: 'tree.png',

  // Vehicles & Misc
  rocket: 'rocket.png',
  car: 'car.png',
};

/** All available PNG icon keys */
export const KIDS_PNG_KEYS = Object.keys(KIDS_PNG_MAP);

/** Check if a PNG version exists for this icon key */
export function hasKidsPng(key: string): boolean {
  return key in KIDS_PNG_MAP;
}

interface KidsImageProps {
  icon: string;
  size?: number;
  style?: React.CSSProperties;
}

/**
 * Renders a PNG image from the kids-assets library.
 * Uses Remotion's <Img> for frame-accurate rendering during video export.
 */
export const KidsImage: React.FC<KidsImageProps> = ({ icon, size = 100, style }) => {
  const filename = KIDS_PNG_MAP[icon];
  if (!filename) return null;

  return (
    <Img
      src={staticFile(`kids-assets/${filename}`)}
      width={size}
      height={size}
      style={{
        objectFit: 'contain',
        ...style,
      }}
    />
  );
};
