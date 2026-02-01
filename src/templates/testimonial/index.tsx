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
import { AnimatedImage } from '../../components/AnimatedImage';
import { Logo } from '../../components/Logo';
import { FadeIn, SlideIn, ScaleIn } from '../../components/transitions';
import { registry } from '../../core/registry';
import { meta } from './meta';
import { testimonialSchema, defaultProps } from './schema';
import type { TestimonialProps } from './schema';

const StarRating: React.FC<{
  rating: number;
  delay: number;
  theme: Theme;
  size?: number;
}> = ({ rating, delay, theme, size = 36 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const starDelay = delay + i * 4;
        const progress = spring({
          frame: Math.max(0, frame - starDelay),
          fps,
          config: { damping: 8, stiffness: 200, mass: 0.4 },
        });

        const isFilled = i < Math.floor(rating);
        const isHalf = !isFilled && i < rating;

        return (
          <div
            key={i}
            style={{
              opacity: interpolate(
                Math.max(0, frame - starDelay),
                [0, 5],
                [0, 1],
                { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
              ),
              transform: `scale(${progress})`,
              fontSize: size,
              color: isFilled || isHalf ? '#FBBF24' : '#D1D5DB',
              lineHeight: 1,
            }}
          >
            ★
          </div>
        );
      })}
    </div>
  );
};

const Testimonial: React.FC<
  TestimonialProps & { theme: Theme; format: Format }
> = ({
  quote,
  authorName,
  authorRole,
  authorCompany,
  authorImage,
  companyLogo,
  rating,
  backgroundColors,
  theme,
  format,
}) => {
  const portrait = isPortrait(format);
  const pad = responsivePadding(80, format);

  return (
    <AbsoluteFill>
      {/* Background */}
      <Background
        type="gradient"
        colors={backgroundColors}
        gradientDirection="180deg"
      />

      {/* Company Logo */}
      {companyLogo && (
        <Logo
          src={companyLogo}
          position="top-right"
          size={60}
          delay={5}
          padding={pad}
        />
      )}

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: pad,
          gap: portrait ? 30 : 36,
        }}
      >
        {/* Opening quote mark */}
        <FadeIn delay={0}>
          <div
            style={{
              fontSize: 120,
              lineHeight: 0.8,
              color: theme.colors.primary,
              opacity: 0.2,
              fontFamily: 'Georgia, serif',
            }}
          >
            "
          </div>
        </FadeIn>

        {/* Star Rating */}
        <Sequence from={5} durationInFrames={145}>
          <StarRating rating={rating} delay={0} theme={theme} size={portrait ? 40 : 36} />
        </Sequence>

        {/* Quote */}
        <AnimatedText
          text={`"${quote}"`}
          delay={20}
          animation="fadeIn"
          theme={theme}
          style={{
            fontSize: responsiveFontSize(
              quote.length > 120 ? 30 : 36,
              format,
              'body'
            ),
            fontWeight: 500,
            fontFamily: theme.fonts.body,
            color: theme.colors.text,
            textAlign: 'center',
            lineHeight: 1.5,
            maxWidth: portrait ? '90%' : '80%',
            fontStyle: 'italic',
          }}
        />

        {/* Author Section */}
        <Sequence from={50} durationInFrames={100}>
          <SlideIn delay={0} direction="up" distance={30}>
            <div
              style={{
                display: 'flex',
                flexDirection: portrait ? 'column' : 'row',
                alignItems: 'center',
                gap: 20,
                marginTop: 10,
              }}
            >
              {/* Avatar */}
              <AnimatedImage
                src={authorImage}
                delay={5}
                animation="scaleIn"
                width={portrait ? 80 : 70}
                height={portrait ? 80 : 70}
                borderRadius={100}
                fit="cover"
              />

              {/* Name & Role */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: portrait ? 'center' : 'flex-start',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: responsiveFontSize(26, format, 'body'),
                    fontWeight: 700,
                    fontFamily: theme.fonts.heading,
                    color: theme.colors.text,
                  }}
                >
                  {authorName}
                </span>
                <span
                  style={{
                    fontSize: responsiveFontSize(18, format, 'caption'),
                    fontFamily: theme.fonts.body,
                    color: theme.colors.textSecondary,
                  }}
                >
                  {authorRole}, {authorCompany}
                </span>
              </div>
            </div>
          </SlideIn>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

registry.register({
  meta,
  schema: testimonialSchema,
  component: Testimonial,
  defaultProps,
});

export default Testimonial;
