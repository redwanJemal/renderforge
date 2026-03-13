import React from 'react';

/**
 * Inline SVG icons for kids content — no external dependencies.
 * Each icon is a simple, bold, kid-friendly design.
 * All icons accept size and color props.
 */

interface IconProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

// ═══════════════════════════════════════════
// ANIMALS
// ═══════════════════════════════════════════

export const IconCat: React.FC<IconProps> = ({ size = 80, color = '#FF6B6B', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <circle cx="50" cy="55" r="30" fill={color} />
    <polygon points="28,30 22,5 42,25" fill={color} />
    <polygon points="72,30 78,5 58,25" fill={color} />
    <circle cx="40" cy="48" r="5" fill="white" />
    <circle cx="60" cy="48" r="5" fill="white" />
    <circle cx="41" cy="49" r="3" fill="#2D3142" />
    <circle cx="61" cy="49" r="3" fill="#2D3142" />
    <ellipse cx="50" cy="60" rx="4" ry="3" fill="#FFB6C1" />
    <path d="M46 65 Q50 70 54 65" stroke="#2D3142" strokeWidth="2" fill="none" />
    <line x1="25" y1="55" x2="38" y2="58" stroke="#2D3142" strokeWidth="1.5" />
    <line x1="25" y1="60" x2="38" y2="60" stroke="#2D3142" strokeWidth="1.5" />
    <line x1="62" y1="58" x2="75" y2="55" stroke="#2D3142" strokeWidth="1.5" />
    <line x1="62" y1="60" x2="75" y2="60" stroke="#2D3142" strokeWidth="1.5" />
  </svg>
);

export const IconDog: React.FC<IconProps> = ({ size = 80, color = '#C4A35A', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <circle cx="50" cy="52" r="30" fill={color} />
    <ellipse cx="30" cy="30" rx="14" ry="20" fill={color} transform="rotate(-15 30 30)" />
    <ellipse cx="70" cy="30" rx="14" ry="20" fill={color} transform="rotate(15 70 30)" />
    <circle cx="40" cy="46" r="5" fill="white" />
    <circle cx="60" cy="46" r="5" fill="white" />
    <circle cx="41" cy="47" r="3" fill="#2D3142" />
    <circle cx="61" cy="47" r="3" fill="#2D3142" />
    <ellipse cx="50" cy="58" rx="8" ry="6" fill="#3D2B1F" />
    <ellipse cx="50" cy="56" rx="4" ry="3" fill="#2D3142" />
    <path d="M44 64 Q50 70 56 64" stroke="#2D3142" strokeWidth="2" fill="none" />
    <circle cx="50" cy="68" r="3" fill="#FF6B6B" />
  </svg>
);

export const IconFish: React.FC<IconProps> = ({ size = 80, color = '#4D96FF', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <ellipse cx="48" cy="50" rx="28" ry="20" fill={color} />
    <polygon points="76,50 95,35 95,65" fill={color} />
    <circle cx="38" cy="46" r="5" fill="white" />
    <circle cx="39" cy="46" r="3" fill="#2D3142" />
    <path d="M30 55 Q35 60 42 55" stroke="#2D3142" strokeWidth="2" fill="none" />
    <ellipse cx="55" cy="42" rx="6" ry="3" fill="rgba(255,255,255,0.3)" />
  </svg>
);

export const IconBird: React.FC<IconProps> = ({ size = 80, color = '#6BCB77', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <ellipse cx="50" cy="55" rx="25" ry="22" fill={color} />
    <circle cx="50" cy="35" r="18" fill={color} />
    <circle cx="44" cy="32" r="4" fill="white" />
    <circle cx="56" cy="32" r="4" fill="white" />
    <circle cx="45" cy="33" r="2.5" fill="#2D3142" />
    <circle cx="57" cy="33" r="2.5" fill="#2D3142" />
    <polygon points="50,38 44,43 56,43" fill="#FFB347" />
    <ellipse cx="28" cy="50" rx="12" ry="6" fill={color} transform="rotate(-20 28 50)" />
    <ellipse cx="72" cy="50" rx="12" ry="6" fill={color} transform="rotate(20 72 50)" />
    <polygon points="45,77 50,85 55,77" fill="#FFB347" />
    <polygon points="52,77 57,85 62,77" fill="#FFB347" />
  </svg>
);

export const IconButterfly: React.FC<IconProps> = ({ size = 80, color = '#FFAFCC', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <ellipse cx="35" cy="38" rx="18" ry="22" fill={color} />
    <ellipse cx="65" cy="38" rx="18" ry="22" fill={color} />
    <ellipse cx="35" cy="62" rx="14" ry="18" fill="#A2D2FF" />
    <ellipse cx="65" cy="62" rx="14" ry="18" fill="#A2D2FF" />
    <ellipse cx="35" cy="35" rx="6" ry="8" fill="rgba(255,255,255,0.4)" />
    <ellipse cx="65" cy="35" rx="6" ry="8" fill="rgba(255,255,255,0.4)" />
    <rect x="48" y="25" width="4" height="50" rx="2" fill="#3D405B" />
    <circle cx="50" cy="25" r="4" fill="#3D405B" />
    <line x1="48" y1="25" x2="42" y2="12" stroke="#3D405B" strokeWidth="2" />
    <line x1="52" y1="25" x2="58" y2="12" stroke="#3D405B" strokeWidth="2" />
    <circle cx="42" cy="12" r="3" fill={color} />
    <circle cx="58" cy="12" r="3" fill={color} />
  </svg>
);

export const IconLion: React.FC<IconProps> = ({ size = 80, color = '#FFB347', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    {/* Mane */}
    <circle cx="50" cy="50" r="38" fill="#C4873A" />
    {/* Face */}
    <circle cx="50" cy="52" r="26" fill={color} />
    <circle cx="40" cy="46" r="4" fill="white" />
    <circle cx="60" cy="46" r="4" fill="white" />
    <circle cx="41" cy="47" r="2.5" fill="#2D3142" />
    <circle cx="61" cy="47" r="2.5" fill="#2D3142" />
    <ellipse cx="50" cy="56" rx="5" ry="3.5" fill="#3D2B1F" />
    <path d="M44 62 Q50 68 56 62" stroke="#2D3142" strokeWidth="2" fill="none" />
  </svg>
);

export const IconElephant: React.FC<IconProps> = ({ size = 80, color = '#A2D2FF', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <circle cx="50" cy="48" r="28" fill={color} />
    <ellipse cx="25" cy="40" rx="14" ry="18" fill={color} />
    <ellipse cx="75" cy="40" rx="14" ry="18" fill={color} />
    <ellipse cx="25" cy="42" rx="8" ry="12" fill="rgba(255,255,255,0.2)" />
    <ellipse cx="75" cy="42" rx="8" ry="12" fill="rgba(255,255,255,0.2)" />
    <circle cx="40" cy="42" r="4" fill="white" />
    <circle cx="60" cy="42" r="4" fill="white" />
    <circle cx="41" cy="43" r="2.5" fill="#2D3142" />
    <circle cx="61" cy="43" r="2.5" fill="#2D3142" />
    {/* Trunk */}
    <path d="M50 55 Q50 72 42 80 Q40 82 42 84" stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" />
  </svg>
);

// ═══════════════════════════════════════════
// FRUITS & FOOD
// ═══════════════════════════════════════════

export const IconApple: React.FC<IconProps> = ({ size = 80, color = '#FF6B6B', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <path d="M50 20 Q48 10 42 8" stroke="#6BCB77" strokeWidth="3" fill="none" strokeLinecap="round" />
    <ellipse cx="42" cy="8" rx="8" ry="5" fill="#6BCB77" transform="rotate(-30 42 8)" />
    <ellipse cx="50" cy="58" rx="28" ry="32" fill={color} />
    <ellipse cx="50" cy="30" rx="8" ry="5" fill={color} />
    <ellipse cx="38" cy="50" rx="8" ry="10" fill="rgba(255,255,255,0.15)" />
  </svg>
);

export const IconBanana: React.FC<IconProps> = ({ size = 80, color = '#FFD93D', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <path d="M30 75 Q20 55 30 35 Q40 15 60 15 Q55 20 50 35 Q42 55 45 75 Z" fill={color} />
    <path d="M30 75 Q35 78 45 75" stroke="#C4A030" strokeWidth="2" fill="none" />
    <path d="M55 20 Q48 22 45 32" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
  </svg>
);

export const IconStar: React.FC<IconProps> = ({ size = 80, color = '#FFD93D', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <polygon
      points="50,8 61,38 93,38 67,58 77,90 50,70 23,90 33,58 7,38 39,38"
      fill={color}
      stroke="rgba(0,0,0,0.1)"
      strokeWidth="1"
    />
    <polygon
      points="50,18 57,38 75,38 61,50 66,68 50,58 34,68 39,50 25,38 43,38"
      fill="rgba(255,255,255,0.2)"
    />
  </svg>
);

// ═══════════════════════════════════════════
// SHAPES
// ═══════════════════════════════════════════

export const IconCircle: React.FC<IconProps> = ({ size = 80, color = '#FF6B6B', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <circle cx="50" cy="50" r="38" fill={color} />
    <circle cx="40" cy="42" r="12" fill="rgba(255,255,255,0.2)" />
  </svg>
);

export const IconTriangle: React.FC<IconProps> = ({ size = 80, color = '#6BCB77', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <polygon points="50,10 90,85 10,85" fill={color} />
    <polygon points="50,25 42,55 58,55" fill="rgba(255,255,255,0.15)" />
  </svg>
);

export const IconSquare: React.FC<IconProps> = ({ size = 80, color = '#4D96FF', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <rect x="12" y="12" width="76" height="76" rx="8" fill={color} />
    <rect x="20" y="20" width="25" height="25" rx="4" fill="rgba(255,255,255,0.15)" />
  </svg>
);

export const IconHeart: React.FC<IconProps> = ({ size = 80, color = '#FF6B6B', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <path d="M50 85 Q20 60 15 40 Q10 20 30 15 Q45 10 50 30 Q55 10 70 15 Q90 20 85 40 Q80 60 50 85Z" fill={color} />
    <ellipse cx="35" cy="35" rx="8" ry="10" fill="rgba(255,255,255,0.2)" transform="rotate(-20 35 35)" />
  </svg>
);

export const IconDiamond: React.FC<IconProps> = ({ size = 80, color = '#A2D2FF', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <polygon points="50,8 90,50 50,92 10,50" fill={color} />
    <polygon points="50,20 35,50 50,30" fill="rgba(255,255,255,0.2)" />
  </svg>
);

// ═══════════════════════════════════════════
// NUMBERS (as styled icons)
// ═══════════════════════════════════════════

export const NumberIcon: React.FC<IconProps & { number: number; bgColor?: string }> = ({
  size = 100,
  color = '#FFFFFF',
  bgColor = '#4D96FF',
  number,
  style,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <circle cx="50" cy="50" r="44" fill={bgColor} />
    <circle cx="50" cy="50" r="38" fill="rgba(255,255,255,0.1)" />
    <text
      x="50"
      y="50"
      textAnchor="middle"
      dominantBaseline="central"
      fill={color}
      fontSize="52"
      fontWeight="800"
      fontFamily="Fredoka, Nunito, sans-serif"
    >
      {number}
    </text>
  </svg>
);

// ═══════════════════════════════════════════
// LETTER (as styled icon)
// ═══════════════════════════════════════════

export const LetterIcon: React.FC<IconProps & { letter: string; bgColor?: string }> = ({
  size = 120,
  color = '#FFFFFF',
  bgColor = '#FF6B6B',
  letter,
  style,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <rect x="6" y="6" width="88" height="88" rx="20" fill={bgColor} />
    <rect x="10" y="10" width="80" height="80" rx="16" fill="rgba(255,255,255,0.1)" />
    <text
      x="50"
      y="50"
      textAnchor="middle"
      dominantBaseline="central"
      fill={color}
      fontSize="60"
      fontWeight="800"
      fontFamily="Fredoka, Nunito, sans-serif"
    >
      {letter}
    </text>
  </svg>
);

// ═══════════════════════════════════════════
// MISC
// ═══════════════════════════════════════════

export const IconCheckmark: React.FC<IconProps> = ({ size = 60, color = '#6BCB77', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <circle cx="50" cy="50" r="42" fill={color} />
    <path d="M30 52 L44 66 L72 36" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconCross: React.FC<IconProps> = ({ size = 60, color = '#FF6B6B', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <circle cx="50" cy="50" r="42" fill={color} />
    <path d="M35 35 L65 65 M65 35 L35 65" stroke="white" strokeWidth="8" strokeLinecap="round" />
  </svg>
);

export const IconQuestionMark: React.FC<IconProps> = ({ size = 80, color = '#FFD93D', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <circle cx="50" cy="50" r="42" fill={color} />
    <text
      x="50"
      y="48"
      textAnchor="middle"
      dominantBaseline="central"
      fill="white"
      fontSize="52"
      fontWeight="800"
      fontFamily="Fredoka, sans-serif"
    >
      ?
    </text>
  </svg>
);

export const IconTrophy: React.FC<IconProps> = ({ size = 80, color = '#FFD93D', style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <path d="M30 20 H70 L65 55 Q50 70 35 55 Z" fill={color} />
    <rect x="42" y="60" width="16" height="15" fill={color} />
    <rect x="32" y="75" width="36" height="8" rx="4" fill={color} />
    <path d="M30 20 Q10 20 12 40 Q14 52 30 48" fill={color} />
    <path d="M70 20 Q90 20 88 40 Q86 52 70 48" fill={color} />
    <path d="M40 30 L44 40 L36 40 Z" fill="rgba(255,255,255,0.3)" />
    <ellipse cx="50" cy="38" rx="8" ry="10" fill="rgba(255,255,255,0.15)" />
  </svg>
);

// ═══════════════════════════════════════════
// ICON REGISTRY — map string keys to components
// ═══════════════════════════════════════════

export const KIDS_ICONS: Record<string, React.FC<IconProps>> = {
  cat: IconCat,
  dog: IconDog,
  fish: IconFish,
  bird: IconBird,
  butterfly: IconButterfly,
  lion: IconLion,
  elephant: IconElephant,
  apple: IconApple,
  banana: IconBanana,
  star: IconStar,
  circle: IconCircle,
  triangle: IconTriangle,
  square: IconSquare,
  heart: IconHeart,
  diamond: IconDiamond,
  checkmark: IconCheckmark,
  cross: IconCross,
  question: IconQuestionMark,
  trophy: IconTrophy,
};

export function getKidsIcon(name: string): React.FC<IconProps> | undefined {
  return KIDS_ICONS[name];
}
