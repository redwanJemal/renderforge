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
import { Overlay } from '../../components/Overlay';
import { AnimatedText } from '../../components/AnimatedText';
import { CTA } from '../../components/CTA';
import { Logo } from '../../components/Logo';
import { FadeIn, SlideIn, ScaleIn } from '../../components/transitions';
import { registry } from '../../core/registry';
import { meta } from './meta';
import { announcementSchema, defaultProps } from './schema';
import type { AnnouncementProps } from './schema';

const Badge: React.FC<{
  text: string;
  delay: number;
  theme: Theme;
  format: Format;
}> = ({ text, delay, theme, format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 10, stiffness: 180, mass: 0.4 },
  });

  const opacity = interpolate(Math.max(0, frame - delay), [0, 8], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${progress})`,
        background: theme.colors.accent,
        color: '#FFFFFF',
        fontSize: responsiveFontSize(18, format, 'caption'),
        fontWeight: 800,
        fontFamily: theme.fonts.heading,
        padding: '8px 24px',
        borderRadius: 100,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        display: 'inline-block',
      }}
    >
      {text}
    </div>
  );
};

const Announcement: React.FC<
  AnnouncementProps & { theme: Theme; format: Format }
> = ({
  headline,
  subtitle,
  date,
  details,
  ctaText,
  backgroundColors,
  backgroundImage,
  logoUrl,
  badge,
  theme,
  format,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const portrait = isPortrait(format);
  const pad = responsivePadding(80, format);

  // Animated background glow
  const glowOpacity = interpolate(
    Math.sin(frame * 0.05),
    [-1, 1],
    [0.3, 0.6]
  );

  return (
    <AbsoluteFill>
      {/* Background */}
      {backgroundImage ? (
        <>
          <Background type="image" imageUrl={backgroundImage} />
          <Overlay
            gradient="linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.8) 100%)"
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

      {/* Animated glow orb (decorative) */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,255,255,${glowOpacity * 0.15}) 0%, transparent 70%)`,
            filter: 'blur(40px)',
          }}
        />
      </AbsoluteFill>

      {/* Logo */}
      {logoUrl && (
        <Logo src={logoUrl} position="top-left" size={60} delay={0} padding={pad} />
      )}

      {/* Content */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: pad,
          gap: portrait ? 24 : 20,
        }}
      >
        {/* Badge */}
        {badge && (
          <Sequence from={0} durationInFrames={150}>
            <Badge text={badge} delay={0} theme={theme} format={format} />
          </Sequence>
        )}

        {/* Headline */}
        <AnimatedText
          text={headline}
          delay={10}
          animation="scaleIn"
          theme={theme}
          style={{
            fontSize: responsiveFontSize(
              headline.length > 30 ? 52 : 68,
              format,
              'heading'
            ),
            fontWeight: 900,
            fontFamily: theme.fonts.heading,
            color: '#FFFFFF',
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: '90%',
            letterSpacing: '-0.02em',
          }}
        />

        {/* Subtitle */}
        <AnimatedText
          text={subtitle}
          delay={25}
          animation="slideUp"
          theme={theme}
          style={{
            fontSize: responsiveFontSize(28, format, 'body'),
            fontWeight: 400,
            fontFamily: theme.fonts.body,
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'center',
            maxWidth: '80%',
            lineHeight: 1.4,
          }}
        />

        {/* Date */}
        <SlideIn delay={40} direction="up" distance={20}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 10,
            }}
          >
            <div
              style={{
                width: 30,
                height: 2,
                background: 'rgba(255,255,255,0.4)',
              }}
            />
            <span
              style={{
                fontSize: responsiveFontSize(22, format, 'body'),
                fontFamily: theme.fonts.body,
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              {date}
            </span>
            <div
              style={{
                width: 30,
                height: 2,
                background: 'rgba(255,255,255,0.4)',
              }}
            />
          </div>
        </SlideIn>

        {/* Details */}
        {details && (
          <FadeIn delay={50}>
            <span
              style={{
                fontSize: responsiveFontSize(20, format, 'caption'),
                fontFamily: theme.fonts.body,
                color: 'rgba(255,255,255,0.6)',
                textAlign: 'center',
              }}
            >
              {details}
            </span>
          </FadeIn>
        )}

        {/* CTA */}
        <Sequence from={60} durationInFrames={durationInFrames - 60}>
          <div style={{ marginTop: portrait ? 20 : 10 }}>
            <CTA
              text={ctaText}
              delay={0}
              theme={theme}
              fontSize={responsiveFontSize(28, format, 'body')}
              style={{
                background: '#FFFFFF',
                color: backgroundColors[0] ?? theme.colors.primary,
              }}
            />
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

registry.register({
  meta,
  schema: announcementSchema,
  component: Announcement,
  defaultProps,
});

export default Announcement;
