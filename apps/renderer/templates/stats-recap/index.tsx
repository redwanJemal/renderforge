import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import type { Theme, Format } from '../../types';
import { responsiveFontSize, responsivePadding, isPortrait } from '../../core/formats';
import { Background } from '../../components/Background';
import { AnimatedText } from '../../components/AnimatedText';
import { FadeIn, SlideIn } from '../../components/transitions';
import { registry } from '../../core/registry';
import { meta } from './meta';
import { statsRecapSchema, defaultProps } from './schema';
import type { StatsRecapProps } from './schema';

interface AnimatedCounterProps {
  value: number;
  prefix: string;
  suffix: string;
  delay: number;
  theme: Theme;
  format: Format;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix,
  suffix,
  delay,
  theme,
  format,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);
  const countDuration = 45;

  // Determine if value is decimal
  const isDecimal = value % 1 !== 0;
  const decimalPlaces = isDecimal
    ? String(value).split('.')[1]?.length ?? 1
    : 0;

  const currentValue = interpolate(
    adjustedFrame,
    [0, countDuration],
    [0, value],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic
    }
  );

  const displayValue = isDecimal
    ? currentValue.toFixed(decimalPlaces)
    : Math.round(currentValue).toLocaleString();

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });

  const scaleProgress = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 15, stiffness: 120, mass: 0.5 },
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${0.8 + scaleProgress * 0.2})`,
      }}
    >
      <span
        style={{
          fontSize: responsiveFontSize(64, format, 'heading'),
          fontWeight: 800,
          fontFamily: theme.fonts.heading,
          color: theme.colors.accent,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {prefix}
        {displayValue}
        {suffix}
      </span>
    </div>
  );
};

const StatsRecap: React.FC<
  StatsRecapProps & { theme: Theme; format: Format }
> = ({ title, subtitle, stats, backgroundColors, theme, format }) => {
  const portrait = isPortrait(format);
  const pad = responsivePadding(60, format);

  // Grid layout based on format and stat count
  const columns = portrait ? 1 : stats.length <= 2 ? stats.length : 2;

  return (
    <AbsoluteFill>
      {/* Background */}
      <Background
        type="gradient"
        colors={backgroundColors}
        gradientDirection="135deg"
      />

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: pad,
          gap: portrait ? 20 : 40,
        }}
      >
        {/* Title */}
        <Sequence from={0} durationInFrames={180}>
          <div style={{ textAlign: 'center', marginBottom: portrait ? 20 : 30 }}>
            <AnimatedText
              text={title}
              delay={0}
              animation="slideUp"
              theme={theme}
              style={{
                fontSize: responsiveFontSize(52, format, 'heading'),
                fontWeight: 800,
                fontFamily: theme.fonts.heading,
                color: '#FFFFFF',
                textAlign: 'center',
              }}
            />
            <AnimatedText
              text={subtitle}
              delay={10}
              animation="fadeIn"
              theme={theme}
              style={{
                fontSize: responsiveFontSize(26, format, 'body'),
                color: 'rgba(255,255,255,0.6)',
                fontFamily: theme.fonts.body,
                textAlign: 'center',
                marginTop: 10,
              }}
            />
          </div>
        </Sequence>

        {/* Stats Grid */}
        <Sequence from={20} durationInFrames={160}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: portrait ? 30 : 50,
              width: '100%',
              maxWidth: portrait ? 600 : 1000,
            }}
          >
            {stats.map((stat, i) => (
              <SlideIn
                key={stat.label}
                delay={i * 12}
                direction="up"
                distance={40}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    padding: '30px 20px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: theme.borderRadius,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <AnimatedCounter
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    delay={i * 12 + 5}
                    theme={theme}
                    format={format}
                  />
                  <span
                    style={{
                      fontSize: responsiveFontSize(20, format, 'caption'),
                      color: 'rgba(255,255,255,0.7)',
                      fontFamily: theme.fonts.body,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {stat.label}
                  </span>
                </div>
              </SlideIn>
            ))}
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

registry.register({
  meta,
  schema: statsRecapSchema,
  component: StatsRecap,
  defaultProps,
});

export default StatsRecap;
