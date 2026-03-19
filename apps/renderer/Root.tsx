import { Composition } from 'remotion';
import { registry } from './core/registry';
import { FORMATS } from './types';
import { themes } from './themes';
import { loadEthiopicFontSync } from './core/fonts';

// Load Ethiopic font globally for Amharic/Ge'ez script support
loadEthiopicFontSync();
import { YLDIntro, defaultYLDProps } from './templates/yld-intro/YLDIntro';
import { Slider, defaultSliderProps } from './templates/slider/Slider';
import { Cover, defaultCoverProps } from './templates/cover/Cover';
import { Showcase, defaultShowcaseProps } from './templates/showcase/Showcase';
import { Countdown, defaultCountdownProps } from './templates/countdown/Countdown';
import { KineticText, defaultKineticTextProps } from './templates/kinetic-text/KineticText';
import { SplitReveal, defaultSplitRevealProps } from './templates/split-reveal/SplitReveal';
import { Orbit, defaultOrbitProps } from './templates/orbit/Orbit';
import { GlitchText, defaultGlitchTextProps } from './templates/glitch-text/GlitchText';
import { NeonGlow, defaultNeonGlowProps } from './templates/neon-glow/NeonGlow';
import { ParallaxLayers, defaultParallaxLayersProps } from './templates/parallax-layers/ParallaxLayers';
import { BreakingNews, defaultBreakingNewsProps } from './templates/breaking-news/BreakingNews';
import { MatchFixture, defaultMatchFixtureProps } from './templates/match-fixture/MatchFixture';
import { PostMatch, defaultPostMatchProps } from './templates/post-match/PostMatch';
import { DubaiLuxury, defaultDubaiLuxuryProps } from './templates/dubai-luxury/DubaiLuxury';
import { RamadanGreeting, defaultRamadanGreetingProps } from './templates/ramadan-greeting/RamadanGreeting';
import { GoldReveal, defaultGoldRevealProps } from './templates/gold-reveal/GoldReveal';

// Import and register all templates (side-effect imports)
import './templates/product-launch';
import './templates/quote-of-day';
import './templates/stats-recap';
import './templates/testimonial';
import './templates/announcement';

// Kids templates (long-form, audio-sync ready)
import './templates/kids-alphabet-adventure';
import './templates/kids-counting-fun';
import './templates/kids-icon-quiz';
import './templates/kids-bedtime-story';

// Motivational narration (scene-based, audio-sync)
import './templates/motivational-narration';

// Language learning templates
import './templates/vocab-card';

// Islamic content templates
import './templates/quran-ayah';

export const RemotionRoot: React.FC = () => {
  const allTemplates = registry.getAll();

  return (
    <>
      {/* Cover Images — profile pics & banners */}
      <Composition
        id="cover-profile"
        component={Cover}
        width={1080}
        height={1080}
        durationInFrames={1}
        fps={30}
        defaultProps={defaultCoverProps}
      />
      <Composition
        id="cover-youtube-banner"
        component={Cover}
        width={2560}
        height={1440}
        durationInFrames={1}
        fps={30}
        defaultProps={defaultCoverProps}
      />
      <Composition
        id="cover-twitter-banner"
        component={Cover}
        width={1500}
        height={500}
        durationInFrames={1}
        fps={30}
        defaultProps={defaultCoverProps}
      />
      <Composition
        id="cover-facebook-banner"
        component={Cover}
        width={820}
        height={312}
        durationInFrames={1}
        fps={30}
        defaultProps={defaultCoverProps}
      />
      <Composition
        id="cover-linkedin-banner"
        component={Cover}
        width={1584}
        height={396}
        durationInFrames={1}
        fps={30}
        defaultProps={defaultCoverProps}
      />
      <Composition
        id="cover-tiktok-profile"
        component={Cover}
        width={200}
        height={200}
        durationInFrames={1}
        fps={30}
        defaultProps={{...defaultCoverProps, logo: {...defaultCoverProps.logo, size: 120}, brandName: '', tagline: '', handle: ''}}
      />

      {/* Premium Template: Slider */}
      {/* Slider durations set to 1200 (40s max) — actual length via --frames flag */}
      <Composition
        id="slider"
        component={Slider}
        width={1080}
        height={1920}
        durationInFrames={1200}
        fps={30}
        defaultProps={defaultSliderProps}
      />
      <Composition
        id="slider-landscape"
        component={Slider}
        width={1920}
        height={1080}
        durationInFrames={1200}
        fps={30}
        defaultProps={defaultSliderProps}
      />
      <Composition
        id="slider-square"
        component={Slider}
        width={1080}
        height={1080}
        durationInFrames={1200}
        fps={30}
        defaultProps={defaultSliderProps}
      />

      {/* Premium Template: Your Last Dollar Intro */}
      {/* Duration set high — actual length controlled via --frames flag */}
      <Composition
        id="yld-intro"
        component={YLDIntro}
        width={1080}
        height={1920}
        durationInFrames={3600}
        fps={30}
        defaultProps={defaultYLDProps}
      />

      {/* Premium Template: Showcase */}
      <Composition
        id="showcase"
        component={Showcase}
        width={1080}
        height={1920}
        durationInFrames={420}
        fps={30}
        defaultProps={defaultShowcaseProps}
      />

      {/* Premium Template: Countdown */}
      <Composition
        id="countdown"
        component={Countdown}
        width={1080}
        height={1920}
        durationInFrames={390}
        fps={30}
        defaultProps={defaultCountdownProps}
      />

      {/* Premium Template: Kinetic Typography */}
      <Composition
        id="kinetic-text"
        component={KineticText}
        width={1080}
        height={1920}
        durationInFrames={390}
        fps={30}
        defaultProps={defaultKineticTextProps}
      />

      {/* Premium Template: Split Reveal */}
      <Composition
        id="split-reveal"
        component={SplitReveal}
        width={1080}
        height={1920}
        durationInFrames={360}
        fps={30}
        defaultProps={defaultSplitRevealProps}
      />

      {/* Premium Template: Orbit */}
      <Composition
        id="orbit"
        component={Orbit}
        width={1080}
        height={1920}
        durationInFrames={390}
        fps={30}
        defaultProps={defaultOrbitProps}
      />

      {/* Premium Template: Glitch Text */}
      <Composition
        id="glitch-text"
        component={GlitchText}
        width={1080}
        height={1920}
        durationInFrames={420}
        fps={30}
        defaultProps={defaultGlitchTextProps}
      />

      {/* Premium Template: Neon Glow */}
      <Composition
        id="neon-glow"
        component={NeonGlow}
        width={1080}
        height={1920}
        durationInFrames={360}
        fps={30}
        defaultProps={defaultNeonGlowProps}
      />

      {/* Premium Template: Parallax Layers */}
      <Composition
        id="parallax-layers"
        component={ParallaxLayers}
        width={1080}
        height={1920}
        durationInFrames={360}
        fps={30}
        defaultProps={defaultParallaxLayersProps}
      />

      {/* Premium Template: Breaking News */}
      <Composition
        id="breaking-news"
        component={BreakingNews}
        width={1080}
        height={1920}
        durationInFrames={360}
        fps={30}
        defaultProps={defaultBreakingNewsProps}
      />

      {/* Premium Template: Match Fixture */}
      <Composition
        id="match-fixture"
        component={MatchFixture}
        width={1080}
        height={1920}
        durationInFrames={300}
        fps={30}
        defaultProps={defaultMatchFixtureProps}
      />

      {/* Premium Template: Post-Match Results */}
      <Composition
        id="post-match"
        component={PostMatch}
        width={1080}
        height={1920}
        durationInFrames={600}
        fps={30}
        defaultProps={defaultPostMatchProps}
      />

      {/* Premium Template: Dubai Luxury */}
      <Composition
        id="dubai-luxury"
        component={DubaiLuxury}
        width={1080}
        height={1920}
        durationInFrames={390}
        fps={30}
        defaultProps={defaultDubaiLuxuryProps}
      />

      {/* Premium Template: Ramadan Greeting */}
      <Composition
        id="ramadan-greeting"
        component={RamadanGreeting}
        width={1080}
        height={1920}
        durationInFrames={360}
        fps={30}
        defaultProps={defaultRamadanGreetingProps}
      />

      {/* Premium Template: Gold Reveal */}
      <Composition
        id="gold-reveal"
        component={GoldReveal}
        width={1080}
        height={1920}
        durationInFrames={390}
        fps={30}
        defaultProps={defaultGoldRevealProps}
      />

      {allTemplates.flatMap((template) =>
        template.meta.supportedFormats.map((format) => {
          const formatConfig = FORMATS[format];
          return (
            <Composition
              key={`${template.meta.id}-${format}`}
              id={`${template.meta.id}-${format}`}
              component={template.component}
              width={formatConfig.width}
              height={formatConfig.height}
              durationInFrames={template.meta.durationInFrames}
              fps={template.meta.fps}
              defaultProps={{
                ...template.defaultProps,
                theme: themes.default,
                format,
              }}
            />
          );
        })
      )}
    </>
  );
};
