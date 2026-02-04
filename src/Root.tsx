import { Composition } from 'remotion';
import { registry } from './core/registry';
import { FORMATS } from './types';
import { themes } from './themes';
import { YLDIntro, defaultYLDProps } from './templates/yld-intro/YLDIntro';
import { Showcase, defaultShowcaseProps } from './templates/showcase/Showcase';
import { Countdown, defaultCountdownProps } from './templates/countdown/Countdown';

// Import and register all templates (side-effect imports)
import './templates/product-launch';
import './templates/quote-of-day';
import './templates/stats-recap';
import './templates/testimonial';
import './templates/announcement';

export const RemotionRoot: React.FC = () => {
  const allTemplates = registry.getAll();

  return (
    <>
      {/* Premium Template: Your Last Dollar Intro */}
      <Composition
        id="yld-intro"
        component={YLDIntro}
        width={1080}
        height={1920}
        durationInFrames={270}
        fps={30}
        defaultProps={defaultYLDProps}
      />

      {/* Premium Template: Showcase */}
      <Composition
        id="showcase"
        component={Showcase}
        width={1080}
        height={1920}
        durationInFrames={240}
        fps={30}
        defaultProps={defaultShowcaseProps}
      />

      {/* Premium Template: Countdown */}
      <Composition
        id="countdown"
        component={Countdown}
        width={1080}
        height={1920}
        durationInFrames={240}
        fps={30}
        defaultProps={defaultCountdownProps}
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
