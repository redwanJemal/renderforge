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
import { CTA } from '../../components/CTA';
import { Overlay } from '../../components/Overlay';
import { Logo } from '../../components/Logo';
import { SlideIn } from '../../components/transitions';
import { registry } from '../../core/registry';
import { meta } from './meta';
import { productLaunchSchema, defaultProps } from './schema';
import type { ProductLaunchProps } from './schema';

const ProductLaunch: React.FC<
  ProductLaunchProps & { theme: Theme; format: Format }
> = ({
  productName,
  tagline,
  productImage,
  price,
  originalPrice,
  discount,
  features,
  ctaText,
  logoUrl,
  brandName,
  theme,
  format,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const portrait = isPortrait(format);
  const pad = responsivePadding(60, format);

  // Scene timing
  const introEnd = 40;
  const revealStart = 30;
  const featuresStart = 80;
  const ctaStart = 130;

  return (
    <AbsoluteFill>
      {/* Background */}
      <Background
        type="gradient"
        colors={[theme.colors.background, theme.colors.surface]}
        gradientDirection="180deg"
      />

      {/* Scene 1: Brand Intro */}
      <Sequence from={0} durationInFrames={introEnd + 20}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: pad,
          }}
        >
          {logoUrl && <Logo src={logoUrl} position="center" size={120} delay={0} />}
          {!logoUrl && (
            <AnimatedText
              text={brandName}
              delay={0}
              animation="scaleIn"
              theme={theme}
              style={{
                fontSize: responsiveFontSize(72, format, 'heading'),
                fontWeight: 800,
                fontFamily: theme.fonts.heading,
                color: theme.colors.primary,
                letterSpacing: '-0.02em',
              }}
            />
          )}
          <AnimatedText
            text={tagline}
            delay={12}
            animation="fadeIn"
            theme={theme}
            style={{
              fontSize: responsiveFontSize(36, format, 'body'),
              color: theme.colors.textSecondary,
              marginTop: 16,
            }}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Product Reveal */}
      <Sequence from={revealStart} durationInFrames={80}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: portrait ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: pad,
            gap: portrait ? 30 : 60,
          }}
        >
          {/* Product Image */}
          <div
            style={{
              flex: portrait ? undefined : 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: portrait ? '80%' : '50%',
            }}
          >
            <AnimatedImage
              src={productImage}
              delay={10}
              animation="scaleIn"
              width={portrait ? 500 : 450}
              height={portrait ? 500 : 450}
              borderRadius={theme.borderRadius * 2}
              fit="contain"
            />
          </div>

          {/* Product Info */}
          <div
            style={{
              flex: portrait ? undefined : 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: portrait ? 'center' : 'flex-start',
              gap: 16,
            }}
          >
            <AnimatedText
              text={productName}
              delay={15}
              animation="slideUp"
              theme={theme}
              style={{
                fontSize: responsiveFontSize(48, format, 'heading'),
                fontWeight: 800,
                fontFamily: theme.fonts.heading,
                color: theme.colors.text,
                textAlign: portrait ? 'center' : 'left',
                lineHeight: 1.1,
              }}
            />

            {/* Price Row */}
            <SlideIn delay={25} direction="up">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <span
                  style={{
                    fontSize: responsiveFontSize(52, format, 'heading'),
                    fontWeight: 800,
                    color: theme.colors.primary,
                    fontFamily: theme.fonts.heading,
                  }}
                >
                  {price}
                </span>
                {originalPrice && (
                  <span
                    style={{
                      fontSize: responsiveFontSize(32, format, 'body'),
                      color: theme.colors.textSecondary,
                      textDecoration: 'line-through',
                      fontFamily: theme.fonts.body,
                    }}
                  >
                    {originalPrice}
                  </span>
                )}
              </div>
            </SlideIn>

            {/* Discount Badge */}
            {discount && (
              <SlideIn delay={30} direction="right">
                <div
                  style={{
                    background: theme.colors.accent,
                    color: '#FFFFFF',
                    padding: '8px 24px',
                    borderRadius: theme.borderRadius,
                    fontSize: responsiveFontSize(24, format, 'caption'),
                    fontWeight: 700,
                    fontFamily: theme.fonts.heading,
                    display: 'inline-block',
                  }}
                >
                  {discount}
                </div>
              </SlideIn>
            )}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Features */}
      <Sequence from={featuresStart} durationInFrames={60}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: pad,
            gap: portrait ? 30 : 24,
          }}
        >
          {features.map((feature, i) => (
            <SlideIn key={feature} delay={i * 10} direction="right" distance={60}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  background: theme.colors.surface,
                  padding: '18px 36px',
                  borderRadius: theme.borderRadius,
                  boxShadow: theme.shadow,
                  minWidth: 350,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: theme.colors.primary,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: responsiveFontSize(28, format, 'body'),
                    fontFamily: theme.fonts.body,
                    color: theme.colors.text,
                    fontWeight: 600,
                  }}
                >
                  {feature}
                </span>
              </div>
            </SlideIn>
          ))}
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: CTA */}
      <Sequence from={ctaStart} durationInFrames={durationInFrames - ctaStart}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 30,
            padding: pad,
          }}
        >
          <AnimatedText
            text={productName}
            delay={0}
            animation="slideUp"
            theme={theme}
            style={{
              fontSize: responsiveFontSize(56, format, 'heading'),
              fontWeight: 800,
              fontFamily: theme.fonts.heading,
              color: theme.colors.text,
              textAlign: 'center',
            }}
          />
          <CTA
            text={ctaText}
            delay={10}
            theme={theme}
            fontSize={responsiveFontSize(36, format, 'body')}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

// Register with the global registry
registry.register({
  meta,
  schema: productLaunchSchema,
  component: ProductLaunch,
  defaultProps,
});

export default ProductLaunch;
