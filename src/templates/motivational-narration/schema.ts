import { z } from 'zod';

const sceneSchema = z.object({
  text: z.string(),
  subtext: z.string().optional(),
  highlight: z.string().optional(), // word(s) to accent-color
  entrance: z.enum(['fadeIn', 'slideUp', 'slideLeft', 'scaleIn', 'slam']).default('fadeIn'),
  textSize: z.number().default(52),
  subtextSize: z.number().default(28),
  textAlign: z.enum(['left', 'center']).default('center'),
  startFrame: z.number().default(0),
  durationFrames: z.number().default(120),
});

export type Scene = z.infer<typeof sceneSchema>;

export const motivationalNarrationSchema = z.object({
  scenes: z.array(sceneSchema),
  title: z.string().optional(),           // optional brand/channel name shown small
  logo: z.string().optional(),             // logo filename in public/
  logoSize: z.number().default(120),
  accentColor: z.string().default('#f59e0b'),
  bgGradient: z.array(z.string()).default(['#0f0f0f', '#1a1a2e', '#0f0f0f']),
  particlesEnabled: z.boolean().default(true),
  transitionFrames: z.number().default(15), // enter/exit duration per scene
  introHoldFrames: z.number().default(45),  // frames before first scene (logo reveal)
});

export type MotivationalNarrationProps = z.infer<typeof motivationalNarrationSchema>;

export const defaultProps: MotivationalNarrationProps = {
  scenes: [
    {
      text: 'Your mind is a control room',
      subtext: 'with two operators inside',
      highlight: 'control room',
      entrance: 'scaleIn',
      textSize: 52,
      subtextSize: 28,
      textAlign: 'center',
      startFrame: 45,
      durationFrames: 120,
    },
    {
      text: 'Every single day, thousands of thoughts pass through',
      highlight: 'thousands',
      entrance: 'slideUp',
      textSize: 48,
      subtextSize: 28,
      textAlign: 'center',
      startFrame: 165,
      durationFrames: 300,
    },
    {
      text: 'Imagine that inside your head\nthere is a command center',
      highlight: 'command center',
      entrance: 'fadeIn',
      textSize: 46,
      subtextSize: 28,
      textAlign: 'center',
      startFrame: 465,
      durationFrames: 180,
    },
    {
      text: 'One operator runs confidence',
      subtext: 'The other runs doubt',
      highlight: 'confidence',
      entrance: 'slideLeft',
      textSize: 50,
      subtextSize: 32,
      textAlign: 'center',
      startFrame: 645,
      durationFrames: 150,
    },
    {
      text: 'Which one will you let win?',
      highlight: 'win',
      entrance: 'slam',
      textSize: 56,
      subtextSize: 28,
      textAlign: 'center',
      startFrame: 795,
      durationFrames: 150,
    },
  ],
  accentColor: '#f59e0b',
  bgGradient: ['#0f0f0f', '#1a1a2e', '#0f0f0f'],
  particlesEnabled: true,
  transitionFrames: 15,
  introHoldFrames: 45,
  logoSize: 120,
};
