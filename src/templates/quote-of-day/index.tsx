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
import { responsiveFontSize, responsivePadding } from '../../core/formats';
import { Background } from '../../components/Background';
import { Overlay } from '../../components/Overlay';
import { AnimatedText } from '../../components/AnimatedText';
import { FadeIn, SlideIn } from '../../components/transitions';
import { registry } from '../../core/registry';
import { meta } from './meta';
import { quoteOfDaySchema, defaultProps } from './schema';
import type { QuoteOfDayProps } from './schema';

const QuoteIcon: React.FC<{ color: string; delay: number }> = ({
  color,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.5 },
  });

  const opacity = interpolate(Math.max(0, frame - delay), [0, 15], [0, 0.3], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        fontSize: 200,
        fontFamily: 'Georgia, serif',
        color,
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      "
    </div>
  );
};

const QuoteOfDay: React.FC<
  QuoteOfDayProps & { theme: Theme; format: Format }
> = ({
  quote,
  author,
  authorTitle,
  backgroundImage,
  backgroundColors,
  quoteIcon,
  accentLine,
  theme,
  format,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pad = responsivePadding(80, format);

  return (
    <AbsoluteFill>
      {/* Background */}
      {backgroundImage ? (
        <>
          <Background type="image" imageUrl={backgroundImage} />
          <Overlay
            gradient={`linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%)`}
            opacity={1}
          />
        </>
      ) : (
        <Background
          type="gradient"
          colors={backgroundColors}
          gradientDirection="135deg"
        />
      )}

      {/* Content */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: pad,
        }}
      >
        {/* Quote Icon */}
        {quoteIcon && (
          <Sequence from={0} durationInFrames={150}>
            <div style={{ marginBottom: -40 }}>
              <QuoteIcon color={theme.colors.accent} delay={0} />
            </div>
          </Sequence>
        )}

        {/* Accent Line */}
        {accentLine && (
          <FadeIn delay={10}>
            <div
              style={{
                width: 60,
                height: 4,
                background: theme.colors.accent,
                borderRadius: 2,
                marginBottom: 40,
              }}
            />
          </FadeIn>
        )}

        {/* Quote Text */}
        <AnimatedText
          text={quote}
          delay={15}
          animation="fadeIn"
          theme={theme}
          style={{
            fontSize: responsiveFontSize(
              quote.length > 80 ? 40 : 52,
              format,
              'heading'
            ),
            fontWeight: 600,
            fontFamily: theme.fonts.heading,
            color: backgroundImage ? '#FFFFFF' : theme.colors.text,
            textAlign: 'center',
            lineHeight: 1.4,
            maxWidth: '90%',
            fontStyle: 'italic',
          }}
        />

        {/* Divider */}
        <SlideIn delay={50} direction="up" distance={20}>
          <div
            style={{
              width: 40,
              height: 3,
              background: theme.colors.accent,
              borderRadius: 2,
              marginTop: 40,
              marginBottom: 30,
            }}
          />
        </SlideIn>

        {/* Author */}
        <AnimatedText
          text={author}
          delay={55}
          animation="slideUp"
          theme={theme}
          style={{
            fontSize: responsiveFontSize(32, format, 'body'),
            fontWeight: 700,
            fontFamily: theme.fonts.body,
            color: backgroundImage
              ? '#FFFFFF'
              : theme.colors.text,
            textAlign: 'center',
          }}
        />

        {/* Author Title */}
        {authorTitle && (
          <AnimatedText
            text={authorTitle}
            delay={65}
            animation="fadeIn"
            theme={theme}
            style={{
              fontSize: responsiveFontSize(22, format, 'caption'),
              fontWeight: 400,
              fontFamily: theme.fonts.body,
              color: backgroundImage
                ? 'rgba(255,255,255,0.7)'
                : theme.colors.textSecondary,
              textAlign: 'center',
              marginTop: 8,
            }}
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

registry.register({
  meta,
  schema: quoteOfDaySchema,
  component: QuoteOfDay,
  defaultProps,
});

export default QuoteOfDay;
