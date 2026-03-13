#!/usr/bin/env npx tsx
/**
 * Motivational Content Generator
 *
 * Generates 100 motivational speech posts (10 per theme) with:
 * - scripts-motivational.json → TTS input for Colab (Qwen3 / Les Brown voice)
 * - content/audio/mot-XXX/splits.json → render props per post
 *
 * Usage:
 *   npx tsx content/generate-motivational.ts              # generate all 100
 *   npx tsx content/generate-motivational.ts --limit 5    # first 5 only
 *   npx tsx content/generate-motivational.ts --dry-run    # preview without writing
 */

import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────

interface Section {
  key: string;
  text: string;
  audioFile: string;
}

interface ScriptPost {
  postId: string;
  template: string;
  theme: string;
  title: string;
  sections: Section[];
  fullScript: string;
  audioDir: string;
}

interface SceneProps {
  text: string;
  highlight?: string;
  entrance: string;
  textSize: number;
  subtextSize?: number;
  subtext?: string;
  textAlign?: string;
}

interface SplitsJson {
  segments: { key: string; start: number; end: number }[];
  props: {
    scenes: SceneProps[];
    title: string;
    accentColor: string;
    bgGradient: [string, string, string];
  };
}

// ──────────────────────────────────────────────
// VISUAL VARIETY
// ──────────────────────────────────────────────

const ACCENT_COLORS = [
  { name: 'emerald', color: '#22c55e', bg: ['#0a2e1a', '#071a10', '#020a05'] as [string, string, string] },
  { name: 'gold', color: '#D4AF37', bg: ['#1a1500', '#0f0d00', '#050400'] as [string, string, string] },
  { name: 'crimson', color: '#ef4444', bg: ['#2a0a0a', '#180505', '#0a0202'] as [string, string, string] },
  { name: 'violet', color: '#a855f7', bg: ['#1a0a2e', '#0f0518', '#050208'] as [string, string, string] },
  { name: 'cyan', color: '#06b6d4', bg: ['#0a1e2e', '#051218', '#020608'] as [string, string, string] },
  { name: 'rose', color: '#f43f5e', bg: ['#2a0a14', '#18050a', '#0a0204'] as [string, string, string] },
  { name: 'amber', color: '#f59e0b', bg: ['#2a1a0a', '#180f05', '#0a0602'] as [string, string, string] },
  { name: 'teal', color: '#14b8a6', bg: ['#0a2e28', '#071a16', '#020a08'] as [string, string, string] },
];

const ENTRANCES = ['scaleIn', 'slideUp', 'fadeIn', 'slideLeft', 'slam'] as const;

// ──────────────────────────────────────────────
// CONTENT THEMES (10 posts each = 100 total)
// ──────────────────────────────────────────────

interface ThemeDef {
  id: string;
  name: string;
  posts: {
    title: string;
    intro: string;
    headline: string;
    subheader: string;
    badge: string;
    cta: string;
    introHighlight?: string;
    headlineHighlight?: string;
    subheaderHighlight?: string;
    badgeHighlight?: string;
  }[];
}

const THEMES: ThemeDef[] = [
  {
    id: 'mindset',
    name: 'Mindset',
    posts: [
      {
        title: 'Your Mind Is A Control Room',
        intro: 'Your mind is a control room. And right now, someone else is pressing the buttons.',
        headline: 'Every single day, thousands of thoughts pass through your head. Most of them are not even yours. They come from social media, from people who gave up on their dreams, from a world that profits when you stay small. The question is, who is running your mind?',
        subheader: 'Imagine inside your head there are two operators. One runs fear. The other runs faith. Whichever one you feed the most gets to sit in the big chair.',
        badge: 'You are not your thoughts. You are the one who chooses which thoughts to believe.',
        cta: 'If this hit different, save it. Share it with someone who needs to hear it. Follow for daily mindset shifts.',
        introHighlight: 'control room',
        headlineHighlight: 'who is running your mind',
        subheaderHighlight: 'faith',
        badgeHighlight: 'chooses',
      },
      {
        title: 'The 5AM Secret Nobody Tells You',
        intro: 'While the world sleeps, winners are already making moves.',
        headline: 'The first hour of your day determines the next twenty-three. Most people wake up in reaction mode. Checking phones, reading bad news, absorbing negativity before their feet hit the floor. Champions wake up in creation mode. They create their day before the world tries to create it for them.',
        subheader: 'It is not about waking up early. It is about waking up intentionally. Five AM with no plan is just insomnia. Five AM with purpose is a weapon.',
        badge: 'Own your morning. Own your life. The discipline starts before the sun rises.',
        cta: 'Double tap if you are ready to own your mornings. Follow for more mindset fuel.',
        introHighlight: 'winners',
        headlineHighlight: 'creation mode',
        subheaderHighlight: 'purpose is a weapon',
        badgeHighlight: 'Own your morning',
      },
      {
        title: 'Stop Thinking, Start Doing',
        intro: 'You have been planning for months. Maybe years. When does the doing start?',
        headline: 'Analysis paralysis has killed more dreams than failure ever will. The person who takes imperfect action will always outrun the person still perfecting their plan. Your brain is designed to keep you safe, not successful. It will always find a reason to wait.',
        subheader: 'The gap between where you are and where you want to be is not knowledge. It is action. You already know enough to start.',
        badge: 'Progress is not made in your head. It is made with your hands.',
        cta: 'Tag someone stuck in planning mode. Follow for daily motivation.',
        introHighlight: 'doing',
        headlineHighlight: 'imperfect action',
        subheaderHighlight: 'action',
        badgeHighlight: 'your hands',
      },
      {
        title: 'Your Environment Is Your Future',
        intro: 'Show me your circle and I will show you your future.',
        headline: 'You are the average of the five people you spend the most time with. If everyone around you is complaining, you will complain. If everyone around you is building, you will build. Your environment is not just where you live. It is who you listen to, what you consume, and what you tolerate.',
        subheader: 'You do not rise to the level of your goals. You fall to the level of your environment. Change the inputs, change the output.',
        badge: 'Protect your circle like you protect your bank account. Both determine your wealth.',
        cta: 'Share this with your circle. Follow for more truth bombs.',
        introHighlight: 'your future',
        headlineHighlight: 'the average',
        subheaderHighlight: 'Change the inputs',
        badgeHighlight: 'Protect your circle',
      },
      {
        title: 'Rewire Your Brain In 21 Days',
        intro: 'Your brain does not know the difference between real and imagined.',
        headline: 'Neuroscience proved that repeating a thought for twenty-one days creates a new neural pathway. That means every negative story you tell yourself is just a well-worn path in your brain. The good news is you can build new ones. Visualization is not woo woo. It is brain science.',
        subheader: 'Spend ten minutes every morning seeing yourself as the person you want to become. Feel it. Believe it. Your brain will start building the roadmap.',
        badge: 'Your thoughts are blueprints. Your brain is the construction crew. Give it better plans.',
        cta: 'Save this and start your twenty-one day challenge today. Follow for the science of success.',
        introHighlight: 'real and imagined',
        headlineHighlight: 'new neural pathway',
        subheaderHighlight: 'Visualization',
        badgeHighlight: 'blueprints',
      },
      {
        title: 'The Poverty Mindset Trap',
        intro: 'Poverty is not about your bank account. It is a mindset that keeps you broke.',
        headline: 'Rich people and poor people do not think differently because of money. They have different money because they think differently. A poverty mindset says I cannot afford it. A wealth mindset says how can I afford it. One closes doors. The other opens them.',
        subheader: 'When you believe money is scarce, you hoard it. When you believe money is abundant, you invest it. The belief comes first. The bank account follows.',
        badge: 'Change your money story. Change your money reality.',
        cta: 'If this shifted your perspective, share it. Follow for wealth mindset daily.',
        introHighlight: 'mindset',
        headlineHighlight: 'think differently',
        subheaderHighlight: 'abundant',
        badgeHighlight: 'money story',
      },
      {
        title: 'Delete These 3 Words',
        intro: 'Three words are destroying your potential. And you say them every single day.',
        headline: 'I cannot because. These three words have stopped more people than any obstacle ever could. Not because the obstacles were real, but because the belief made them real. Your words program your subconscious. Every time you say I cannot, your brain files it as truth and stops looking for solutions.',
        subheader: 'Replace I cannot because with how can I despite. Watch how fast your brain starts finding answers instead of excuses.',
        badge: 'Your vocabulary is your destiny. Speak like the person you are becoming.',
        cta: 'Comment the three words you are deleting today. Follow for mindset upgrades.',
        introHighlight: 'Three words',
        headlineHighlight: 'I cannot because',
        subheaderHighlight: 'how can I despite',
        badgeHighlight: 'vocabulary is your destiny',
      },
      {
        title: 'The Mirror Does Not Lie',
        intro: 'The person in the mirror is the only competition that matters.',
        headline: 'Stop comparing your chapter one to someone else is chapter twenty. The only person you need to be better than is who you were yesterday. When you compete with others, you become bitter. When you compete with yourself, you become better.',
        subheader: 'Every night before you sleep, ask yourself one question. Did I grow today? If the answer is yes, you are winning. If not, tomorrow is another chance.',
        badge: 'Be obsessed with your own growth. That is the only scoreboard that counts.',
        cta: 'Double tap if you are competing with yourself. Follow for daily growth.',
        introHighlight: 'only competition',
        headlineHighlight: 'who you were yesterday',
        subheaderHighlight: 'Did I grow today',
        badgeHighlight: 'obsessed with your own growth',
      },
      {
        title: 'Gratitude Is A Weapon',
        intro: 'Gratitude is not soft. It is the most powerful weapon in your mental arsenal.',
        headline: 'Studies show that practicing gratitude rewires your brain for abundance. When you focus on what you have, your brain starts noticing more opportunities. When you focus on what you lack, your brain filters out possibilities. It is not positive thinking. It is strategic thinking.',
        subheader: 'Write down three things you are grateful for every morning. Do it for thirty days. Your entire perspective on life will transform.',
        badge: 'Grateful people are not grateful because life is perfect. Life feels perfect because they are grateful.',
        cta: 'Drop three things you are grateful for in the comments. Follow for mindset mastery.',
        introHighlight: 'weapon',
        headlineHighlight: 'rewires your brain',
        subheaderHighlight: 'thirty days',
        badgeHighlight: 'Grateful people',
      },
      {
        title: 'Think Like A Chess Player',
        intro: 'Successful people do not react. They respond. There is a massive difference.',
        headline: 'Reacting is emotional. Responding is strategic. A chess player does not move the first piece they touch. They see five moves ahead. Most people play checkers with their life. One move at a time, no strategy, just survival. Start playing chess.',
        subheader: 'Before you make any decision, ask yourself three questions. What happens if I do this? What happens if I do not? What will I wish I had done in five years?',
        badge: 'Think long game. Play long game. Win long game.',
        cta: 'Save this for your next big decision. Follow for strategic thinking daily.',
        introHighlight: 'respond',
        headlineHighlight: 'five moves ahead',
        subheaderHighlight: 'three questions',
        badgeHighlight: 'long game',
      },
    ],
  },
  {
    id: 'discipline',
    name: 'Discipline',
    posts: [
      {
        title: 'Motivation Is A Lie',
        intro: 'Stop waiting for motivation. It is not coming to save you.',
        headline: 'Motivation is an emotion. And emotions are unreliable. You will never feel like waking up early. You will never feel like working out at five AM. You will never feel like putting in extra hours. The people who win do not have more motivation. They have more discipline.',
        subheader: 'Discipline is doing the thing when you do not feel like doing the thing. That is literally the entire secret. There is no hack. There is no shortcut.',
        badge: 'Discipline is choosing between what you want now and what you want most.',
        cta: 'If discipline is your superpower, drop a fire emoji. Follow for daily discipline.',
        introHighlight: 'not coming',
        headlineHighlight: 'more discipline',
        subheaderHighlight: 'entire secret',
        badgeHighlight: 'what you want most',
      },
      {
        title: 'The One Percent Rule',
        intro: 'One percent better every day. That is all it takes.',
        headline: 'If you improve one percent every day for a year, you will be thirty-seven times better. Not twice. Not ten times. Thirty-seven times. Most people overestimate what they can do in a day and underestimate what they can do in a year. Tiny gains compound into massive results.',
        subheader: 'You do not need a complete life overhaul. You need one better decision today. One more page read. One more rep. One more minute of focus. That is how empires are built.',
        badge: 'Small daily disciplines lead to large eventual achievements.',
        cta: 'What is your one percent today? Comment below. Follow for compound growth.',
        introHighlight: 'one percent',
        headlineHighlight: 'thirty-seven times',
        subheaderHighlight: 'one better decision',
        badgeHighlight: 'Small daily disciplines',
      },
      {
        title: 'Embrace The Boring',
        intro: 'The secret to extraordinary results is doing ordinary things extraordinarily well.',
        headline: 'Nobody posts about the boring stuff on social media. The early mornings nobody sees. The meal prep on Sunday. The tenth rep when your body is screaming. The hour of deep work with your phone in another room. That is where success lives. In the boring, repetitive, unsexy work.',
        subheader: 'Champions do not get bored with the basics. They master them. While everyone chases the next shiny strategy, the winners are perfecting the fundamentals.',
        badge: 'Fall in love with boredom. That is where the magic happens.',
        cta: 'Save this for when you want to quit the boring work. Follow for real talk.',
        introHighlight: 'extraordinarily well',
        headlineHighlight: 'boring, repetitive, unsexy work',
        subheaderHighlight: 'perfecting the fundamentals',
        badgeHighlight: 'Fall in love with boredom',
      },
      {
        title: 'Your Phone Is Stealing Your Future',
        intro: 'The average person spends four hours a day on their phone. That is sixty days a year.',
        headline: 'Sixty days. Two entire months every year, gone. Scrolling through other people is highlight reels while your own life sits on pause. Social media companies hire the smartest engineers in the world to keep you addicted. You are not weak. You are fighting a billion-dollar machine.',
        subheader: 'Set a screen time limit. Put your phone in another room when you work. Delete the apps that steal your time. This is not about willpower. It is about designing your environment for success.',
        badge: 'The phone is a tool. If it is using you more than you use it, that is a problem.',
        cta: 'Check your screen time right now. Share your number. Follow for digital discipline.',
        introHighlight: 'sixty days a year',
        headlineHighlight: 'billion-dollar machine',
        subheaderHighlight: 'designing your environment',
        badgeHighlight: 'tool',
      },
      {
        title: 'The Two Minute Rule',
        intro: 'If it takes less than two minutes, do it right now. No excuses.',
        headline: 'Procrastination feeds on momentum. The longer you wait, the harder it gets. But here is the hack. Almost every big task can be broken into a two-minute starting point. Want to work out? Just put on your shoes. Want to write? Just open the document. Want to read? Just open the book to page one.',
        subheader: 'The hardest part of any task is the first two minutes. Once you start, the momentum carries you. Your brain switches from resistance mode to flow mode.',
        badge: 'You do not need to feel ready. You just need to start. Starting is the strategy.',
        cta: 'What have you been putting off? Do the two-minute version right now. Follow for productivity hacks.',
        introHighlight: 'right now',
        headlineHighlight: 'two-minute starting point',
        subheaderHighlight: 'momentum carries you',
        badgeHighlight: 'Starting is the strategy',
      },
      {
        title: 'Pain Now Or Pain Later',
        intro: 'You are going to suffer either way. Choose the suffering that builds you.',
        headline: 'The pain of discipline weighs ounces. The pain of regret weighs tons. You can either choose the temporary discomfort of doing the hard thing now, or you can choose the permanent regret of never trying. Both hurt. Only one of them leads somewhere worth going.',
        subheader: 'Every time you skip the gym, eat the junk food, or hit snooze, you are choosing the pain of regret over the pain of discipline. You are borrowing from your future self.',
        badge: 'Suffer the pain of discipline or suffer the pain of regret. You pick.',
        cta: 'Which pain are you choosing today? Comment below. Follow for hard truths.',
        introHighlight: 'builds you',
        headlineHighlight: 'weighs tons',
        subheaderHighlight: 'borrowing from your future self',
        badgeHighlight: 'You pick',
      },
      {
        title: 'No Zero Days',
        intro: 'A zero day is a day where you did absolutely nothing toward your goals.',
        headline: 'The concept is simple. Never have a zero day. Even on your worst day, do something. Read one page. Do ten pushups. Write one paragraph. Send one email. It does not matter how small. What matters is that the chain never breaks. Consistency is not about intensity. It is about never stopping.',
        subheader: 'There will be days when life hits hard. When you are exhausted, heartbroken, defeated. Those are the days that matter most. Not for the output, but for the identity. On those days, you prove to yourself who you really are.',
        badge: 'Never zero. Even one percent is infinitely more than nothing.',
        cta: 'Promise yourself no more zero days. Follow for daily accountability.',
        introHighlight: 'zero day',
        headlineHighlight: 'chain never breaks',
        subheaderHighlight: 'prove to yourself',
        badgeHighlight: 'Never zero',
      },
      {
        title: 'Routine Is Freedom',
        intro: 'Most people think routines are restrictive. The opposite is true.',
        headline: 'Decision fatigue is real. Every choice you make drains your mental energy. Steve Jobs wore the same outfit every day. Obama only wore blue or gray suits. Not because they lacked options, but because they understood that discipline in small things creates freedom for big things.',
        subheader: 'Build a morning routine that runs on autopilot. When your basics are automated, your brain is free to focus on what actually matters. Creating, building, and growing.',
        badge: 'Routine is not a cage. It is the foundation that gives you wings.',
        cta: 'Drop your morning routine in the comments. Follow for productive living.',
        introHighlight: 'opposite is true',
        headlineHighlight: 'Decision fatigue',
        subheaderHighlight: 'runs on autopilot',
        badgeHighlight: 'gives you wings',
      },
      {
        title: 'Accountability Changes Everything',
        intro: 'You will never hold yourself accountable the way someone else can.',
        headline: 'A study showed that telling someone your goal increases your chance of success by sixty-five percent. Having a regular accountability partner raises it to ninety-five percent. You are not weak for needing accountability. You are smart for seeking it. Every champion has a coach.',
        subheader: 'Find someone who will not let you off the hook. Someone who asks the hard questions. Not what did you do today, but why did you not do what you said you would.',
        badge: 'Your circle should challenge you, not comfort you into complacency.',
        cta: 'Tag your accountability partner. Follow for daily discipline tips.',
        introHighlight: 'someone else can',
        headlineHighlight: 'ninety-five percent',
        subheaderHighlight: 'hard questions',
        badgeHighlight: 'challenge you',
      },
      {
        title: 'The 5 Second Rule',
        intro: 'In five seconds, your brain will talk you out of anything.',
        headline: 'Mel Robbins discovered that the moment you have an instinct to act on a goal, you have five seconds before your brain kills it. Five, four, three, two, one, move. That is the rule. Do not give your brain time to negotiate, rationalize, or make excuses. Count down and act.',
        subheader: 'This is not just theory. This is neuroscience. The countdown activates your prefrontal cortex, the part of your brain that handles decision-making and action. You are literally hacking your own brain.',
        badge: 'Five seconds is all that separates you from the life you want.',
        cta: 'Try it right now. Five, four, three, two, one, follow this page for more.',
        introHighlight: 'five seconds',
        headlineHighlight: 'Count down and act',
        subheaderHighlight: 'hacking your own brain',
        badgeHighlight: 'Five seconds',
      },
    ],
  },
  {
    id: 'confidence',
    name: 'Confidence',
    posts: [
      {
        title: 'Confidence Is Built, Not Born',
        intro: 'Nobody is born confident. Confidence is a skill you build through reps.',
        headline: 'Every confident person you admire was once terrified. They just did the thing anyway. Over and over and over. Confidence is not the absence of fear. It is the evidence that you have survived fear before. Every time you push through discomfort, you add another brick to your confidence wall.',
        subheader: 'Start small. Speak up in a meeting. Start a conversation with a stranger. Post that video. Each small act of courage compounds into unshakeable confidence.',
        badge: 'Confidence is not I will not fail. It is I can handle whatever happens.',
        cta: 'What is one brave thing you did this week? Share below. Follow for confidence building.',
        introHighlight: 'skill',
        headlineHighlight: 'evidence',
        subheaderHighlight: 'compounds',
        badgeHighlight: 'I can handle',
      },
      {
        title: 'Kill Your Inner Critic',
        intro: 'The loudest voice in the room is the one inside your head. And it is lying to you.',
        headline: 'Your inner critic is not protecting you. It is holding you hostage. It tells you that you are not ready, not smart enough, not good enough. But here is the truth. That voice is just fear wearing a disguise. It is the voice of every person who ever doubted you, playing on repeat.',
        subheader: 'Next time that voice speaks, talk back. Say thank you for trying to protect me, but I am doing this anyway. Acknowledge it. Then override it.',
        badge: 'You are not the voice in your head. You are the one who hears it and acts anyway.',
        cta: 'Save this for your next moment of doubt. Follow for inner strength daily.',
        introHighlight: 'lying to you',
        headlineHighlight: 'fear wearing a disguise',
        subheaderHighlight: 'override it',
        badgeHighlight: 'acts anyway',
      },
      {
        title: 'Body Language Is Everything',
        intro: 'People decide who you are in the first seven seconds. Make them count.',
        headline: 'Before you say a single word, your body has already spoken. Your posture, your eye contact, your handshake, the way you walk into a room. Studies show that standing in a power pose for two minutes increases testosterone by twenty percent and decreases cortisol by twenty-five percent.',
        subheader: 'Stand tall. Shoulders back. Chin up. Walk like you own the room. Not arrogance. Presence. There is a difference between confidence and cockiness. One inspires, the other repels.',
        badge: 'Your body teaches your brain how to feel. Stand like a champion, feel like a champion.',
        cta: 'Try the power pose for two minutes right now. Follow for confidence science.',
        introHighlight: 'seven seconds',
        headlineHighlight: 'power pose',
        subheaderHighlight: 'Presence',
        badgeHighlight: 'Stand like a champion',
      },
      {
        title: 'Imposter Syndrome Is Proof',
        intro: 'If you feel like an imposter, congratulations. You are in the arena.',
        headline: 'Seventy percent of people experience imposter syndrome. That includes CEOs, doctors, and world-class athletes. The only people who never feel like imposters are those who never try anything new. Imposter syndrome is not a sign of weakness. It is a sign that you are growing.',
        subheader: 'The cure is not more preparation. It is more exposure. You do not overcome imposter syndrome by studying. You overcome it by doing the thing until the thing becomes part of who you are.',
        badge: 'You do not need to feel qualified. You just need to keep showing up.',
        cta: 'Have you felt like an imposter? You are not alone. Follow for real confidence tips.',
        introHighlight: 'in the arena',
        headlineHighlight: 'Seventy percent',
        subheaderHighlight: 'more exposure',
        badgeHighlight: 'keep showing up',
      },
      {
        title: 'Speak It Into Existence',
        intro: 'The words you speak become the house you live in. Choose them carefully.',
        headline: 'Self-talk is not just motivational fluff. Your subconscious mind processes every word you say about yourself as a command. When you say I am terrible with money, your brain makes it true. When you say I am building wealth, your brain starts looking for ways to make that true.',
        subheader: 'Start every morning with three I am statements. I am capable. I am worthy. I am becoming the person I was meant to be. Say them until you believe them. Then watch your life change.',
        badge: 'Your tongue is the pen. Your life is the paper. Write a story worth living.',
        cta: 'Drop your I am statement in the comments. Follow for daily affirmations.',
        introHighlight: 'the house you live in',
        headlineHighlight: 'a command',
        subheaderHighlight: 'I am statements',
        badgeHighlight: 'story worth living',
      },
      {
        title: 'Stop Apologizing For Existing',
        intro: 'You take up space in this world. Stop apologizing for it.',
        headline: 'Over-apologizing is a confidence killer. Sorry for asking. Sorry to bother you. Sorry for having an opinion. Every unnecessary sorry chips away at your self-worth. It tells your brain and everyone around you that you do not deserve to be here.',
        subheader: 'Replace sorry with thank you. Instead of sorry for being late, say thank you for waiting. Instead of sorry for talking, say thank you for listening. The energy shift is massive.',
        badge: 'You have every right to take up space, have opinions, and be heard.',
        cta: 'Catch yourself apologizing today. Swap it. Follow for confidence hacks.',
        introHighlight: 'Stop apologizing',
        headlineHighlight: 'confidence killer',
        subheaderHighlight: 'thank you',
        badgeHighlight: 'every right',
      },
      {
        title: 'Rejection Is Redirection',
        intro: 'Every no you have ever received was the universe clearing the path for a better yes.',
        headline: 'The most successful people in history were rejected constantly. Oprah was fired from her first TV job. Steve Jobs was kicked out of his own company. J.K. Rowling was rejected by twelve publishers. Rejection did not stop them. It redirected them to something greater.',
        subheader: 'When someone tells you no, they are not closing a door. They are pointing you toward a door you had not seen yet. Rejection is data, not destiny.',
        badge: 'Be so confident in your vision that rejection fuels you instead of stopping you.',
        cta: 'Share your biggest rejection that became a blessing. Follow for resilience content.',
        introHighlight: 'better yes',
        headlineHighlight: 'redirected them',
        subheaderHighlight: 'data, not destiny',
        badgeHighlight: 'fuels you',
      },
      {
        title: 'Dress Like You Mean It',
        intro: 'How you dress is how you tell the world to treat you.',
        headline: 'Enclothed cognition is real science. Studies prove that what you wear affects how you think, feel, and perform. When you dress sharp, your brain releases chemicals that boost confidence. You stand taller. You speak clearer. You command more respect. Not because clothes make the man, but because clothes remind the man who he is.',
        subheader: 'You do not need expensive clothes. You need clean, fitted clothes that make you feel powerful. Iron your shirt. Polish your shoes. Look like you respect yourself.',
        badge: 'Dress for the life you want, not the life you have.',
        cta: 'What outfit makes you feel unstoppable? Comment below. Follow for level-up content.',
        introHighlight: 'the world to treat you',
        headlineHighlight: 'Enclothed cognition',
        subheaderHighlight: 'feel powerful',
        badgeHighlight: 'Dress for the life you want',
      },
      {
        title: 'The Power Of Eye Contact',
        intro: 'Eye contact is the fastest way to establish dominance, trust, and connection.',
        headline: 'Most people break eye contact within three seconds. That is a subconscious signal of submission. When you hold eye contact for five to seven seconds, something shifts. People perceive you as more confident, more trustworthy, and more intelligent. It is the simplest upgrade with the biggest return.',
        subheader: 'Practice with strangers. When you order coffee, hold eye contact and smile. When someone speaks to you, look them in the eye. It will feel uncomfortable at first. That discomfort is growth.',
        badge: 'The eyes are the windows to confidence. Let people see your fire.',
        cta: 'Practice this today and let me know how it goes. Follow for social confidence.',
        introHighlight: 'dominance, trust, and connection',
        headlineHighlight: 'five to seven seconds',
        subheaderHighlight: 'discomfort is growth',
        badgeHighlight: 'see your fire',
      },
      {
        title: 'You Are Enough Right Now',
        intro: 'Stop waiting to be enough. You already are.',
        headline: 'The world sells you the idea that you need more before you can be confident. More money, more followers, more success, more validation. But confidence is not a destination. It is a decision. You decide today that you are enough, not because you have everything, but because you are willing to work for it.',
        subheader: 'Comparison is the thief of confidence. The moment you stop measuring yourself against others, you unlock a level of peace that no achievement can match.',
        badge: 'You do not need permission to believe in yourself. Give it to yourself right now.',
        cta: 'Remind yourself. I am enough. Type it below. Follow for self-belief daily.',
        introHighlight: 'already are',
        headlineHighlight: 'a decision',
        subheaderHighlight: 'thief of confidence',
        badgeHighlight: 'Give it to yourself',
      },
    ],
  },
  {
    id: 'success',
    name: 'Success',
    posts: [
      {
        title: 'Success Leaves Clues',
        intro: 'Success is not a mystery. It is a system. And the blueprint is everywhere.',
        headline: 'Every successful person you admire followed a pattern. They studied the game. They found mentors. They failed forward. They stayed consistent when everyone else quit. Success is not about luck or talent. It is about systems, habits, and relentless execution over time.',
        subheader: 'Stop trying to reinvent the wheel. Find someone who has what you want. Study what they did. Model their behavior. Adapt it to your life. The fastest path to success is following someone who already walked it.',
        badge: 'Success is not about being the best. It is about being the most consistent.',
        cta: 'Who do you study for success? Tag them. Follow for success strategies.',
        introHighlight: 'system',
        headlineHighlight: 'relentless execution',
        subheaderHighlight: 'Model their behavior',
        badgeHighlight: 'most consistent',
      },
      {
        title: 'Overnight Success Takes Years',
        intro: 'Everyone wants the result. Nobody wants the process.',
        headline: 'It took Amazon nine years to become profitable. It took Colonel Sanders over a thousand rejections before KFC existed. It took Tyler Perry six years of homelessness before his first hit. What you see as overnight success is years of invisible work, tears, and sacrifice that nobody posted about.',
        subheader: 'The iceberg illusion is real. People see the tip and think that is all there is. Underneath is a mountain of failure, persistence, and unglamorous grinding.',
        badge: 'Trust the process. Water the seed even when you cannot see the roots growing.',
        cta: 'How long have you been grinding? Share your journey. Follow for patience fuel.',
        introHighlight: 'the process',
        headlineHighlight: 'invisible work',
        subheaderHighlight: 'iceberg illusion',
        badgeHighlight: 'Trust the process',
      },
      {
        title: 'Define Your Own Success',
        intro: 'The most dangerous thing you can do is chase someone else is definition of success.',
        headline: 'Society says success is a mansion, a sports car, and a million followers. But what if your version of success is time freedom? What if it is being present for your kids? What if it is building something meaningful that outlives you? Until you define success for yourself, you will always feel like you are losing.',
        subheader: 'Sit down and write your own definition. Not your parents version. Not Instagram is version. Yours. When you know what winning looks like for you, the game changes completely.',
        badge: 'Success without fulfillment is the ultimate failure.',
        cta: 'What does success mean to you? Real answers only. Follow for purposeful living.',
        introHighlight: 'definition of success',
        headlineHighlight: 'define success for yourself',
        subheaderHighlight: 'your own definition',
        badgeHighlight: 'ultimate failure',
      },
      {
        title: 'Execute Like Your Life Depends On It',
        intro: 'Ideas are worthless. Execution is everything.',
        headline: 'Everybody has a million-dollar idea. Most people have had dozens. The difference between a dreamer and a millionaire is not the quality of the idea. It is the quality of the execution. While dreamers polish their plans, executors are already on version three, learning from real feedback.',
        subheader: 'Speed of implementation is your biggest competitive advantage. The person who ships first learns first. And the person who learns first wins first.',
        badge: 'Done is better than perfect. Shipped is better than sitting in your notes app.',
        cta: 'What idea have you been sitting on? Ship it this week. Follow for execution mindset.',
        introHighlight: 'Execution',
        headlineHighlight: 'quality of the execution',
        subheaderHighlight: 'ships first learns first',
        badgeHighlight: 'Done is better than perfect',
      },
      {
        title: 'The Success Tax Nobody Talks About',
        intro: 'Success comes with a price. And most people are not willing to pay it.',
        headline: 'The success tax is real. It costs you friendships with people going nowhere. It costs you weekends and late nights. It costs you the comfort of staying the same. It costs you being misunderstood by people who have never tried. Every level of success requires a new version of you.',
        subheader: 'The question is not can you afford the success tax. The question is can you afford not to pay it. The price of staying where you are is always higher than the price of growth.',
        badge: 'If the dream is free, the hustle is sold separately. Pay the price.',
        cta: 'What has success cost you? Real stories below. Follow for unfiltered truth.',
        introHighlight: 'price',
        headlineHighlight: 'success tax',
        subheaderHighlight: 'can you afford not to',
        badgeHighlight: 'Pay the price',
      },
      {
        title: 'Results Require Sacrifice',
        intro: 'You cannot have a million-dollar dream with a minimum-wage work ethic.',
        headline: 'Look at your daily schedule. Where are the hours going? If you spend more time on entertainment than education, more time consuming than creating, more time complaining than building, your results will reflect exactly that. Your calendar does not lie. It shows your real priorities.',
        subheader: 'Something has to go. Maybe it is Netflix. Maybe it is toxic friendships. Maybe it is the three hours of scrolling. Whatever it is, until you sacrifice what is good for what is great, you will stay exactly where you are.',
        badge: 'Your results are a mirror of your sacrifices. Look in the mirror honestly.',
        cta: 'What are you willing to sacrifice this month? Comment your commitment. Follow for real success.',
        introHighlight: 'minimum-wage work ethic',
        headlineHighlight: 'calendar does not lie',
        subheaderHighlight: 'sacrifice what is good',
        badgeHighlight: 'mirror of your sacrifices',
      },
      {
        title: 'Build A Legacy, Not A Resume',
        intro: 'Nobody reads your resume at your funeral. They talk about your impact.',
        headline: 'A resume is a list of things you did for other people. A legacy is the mark you leave on the world. Too many people spend their entire lives building impressive resumes and empty legacies. They climb the corporate ladder only to realize it was leaning against the wrong wall.',
        subheader: 'Ask yourself this question every day. If I stopped working today, what would I be remembered for? If the answer scares you, it is time to redirect your energy toward something that matters.',
        badge: 'Build something that outlives you. That is the real measure of success.',
        cta: 'What legacy are you building? Share below. Follow for purpose-driven content.',
        introHighlight: 'impact',
        headlineHighlight: 'empty legacies',
        subheaderHighlight: 'what would I be remembered for',
        badgeHighlight: 'outlives you',
      },
      {
        title: 'Burn The Backup Plan',
        intro: 'Your backup plan is the reason your main plan is not working.',
        headline: 'When you have a safety net, you do not jump as hard. You do not commit fully. Part of your brain is always calculating the exit. The most successful people in history burned their boats. There was no plan B. There was only forward. That desperation, that total commitment, is what creates breakthroughs.',
        subheader: 'This does not mean be reckless. It means be fully committed. Half-hearted effort produces half-hearted results. You cannot be all in if you have one foot out the door.',
        badge: 'Bet on yourself so hard that failure is not an option, it is just fuel.',
        cta: 'Are you all in or half in? Be honest. Follow for commitment content.',
        introHighlight: 'main plan',
        headlineHighlight: 'burned their boats',
        subheaderHighlight: 'fully committed',
        badgeHighlight: 'Bet on yourself',
      },
      {
        title: 'Success Is Not Linear',
        intro: 'If your path to success looks like a straight line, you are probably not growing.',
        headline: 'Real success looks like a heart monitor. Ups and downs, peaks and valleys, moments where you flatline and wonder if it is over. The dips are not failures. They are part of the pattern. Every successful person will tell you the same thing. The breakthrough came right after they almost gave up.',
        subheader: 'When you are in a valley, remember this. You are not going backward. You are loading the slingshot. The further back you are pulled, the further forward you are about to launch.',
        badge: 'The setback is the setup for the comeback. Trust the zigzag.',
        cta: 'Share a time when a setback became your biggest breakthrough. Follow for resilience.',
        introHighlight: 'not growing',
        headlineHighlight: 'heart monitor',
        subheaderHighlight: 'loading the slingshot',
        badgeHighlight: 'Trust the zigzag',
      },
      {
        title: 'Surround Yourself With Winners',
        intro: 'If you are the smartest person in the room, you are in the wrong room.',
        headline: 'Proximity is power. When you surround yourself with people who are ahead of you, their standards become your baseline. Their conversations rewire your thinking. Their habits become your habits. You do not need to know everything. You need to know people who know things.',
        subheader: 'Pay for mentorship. Join masterminds. Attend events where you feel out of your league. That discomfort is the growth zone. Stay there long enough and you will realize you belong there.',
        badge: 'Your network is your net worth. Invest in it like your future depends on it, because it does.',
        cta: 'Tag someone who raises your standards. Follow for success networking.',
        introHighlight: 'wrong room',
        headlineHighlight: 'Proximity is power',
        subheaderHighlight: 'discomfort is the growth zone',
        badgeHighlight: 'net worth',
      },
    ],
  },
  {
    id: 'fear',
    name: 'Fear',
    posts: [
      {
        title: 'Fear Is A Compass',
        intro: 'Everything you want is on the other side of fear.',
        headline: 'Fear is not a stop sign. It is a compass pointing you toward growth. When your palms sweat, your heart races, and your mind screams run, that is your body telling you something important is about to happen. The cave you fear to enter holds the treasure you seek.',
        subheader: 'Start treating fear as information, not instruction. It is telling you where the opportunity is, not where the danger is. Ninety percent of what we fear never actually happens.',
        badge: 'Feel the fear and do it anyway. That is the entire philosophy.',
        cta: 'What fear are you facing this week? Share below. Follow for courage daily.',
        introHighlight: 'other side of fear',
        headlineHighlight: 'compass pointing you toward growth',
        subheaderHighlight: 'information, not instruction',
        badgeHighlight: 'do it anyway',
      },
      {
        title: 'Comfort Zone Is A Death Zone',
        intro: 'Nothing grows in the comfort zone. Absolutely nothing.',
        headline: 'Your comfort zone feels safe but it is slowly killing your potential. Every day you stay comfortable, your world gets a little smaller. Your ambitions shrink. Your tolerance for risk drops. And one day you wake up and realize you have been alive for years but you stopped living long ago.',
        subheader: 'Do one thing every day that scares you. Not reckless things. Growth things. Have the hard conversation. Apply for the job. Launch the business. Ask for the raise. Discomfort is the currency of growth.',
        badge: 'Life begins at the edge of your comfort zone. Step over that line today.',
        cta: 'What is one thing outside your comfort zone you will do today? Follow for daily courage.',
        introHighlight: 'Nothing grows',
        headlineHighlight: 'slowly killing your potential',
        subheaderHighlight: 'one thing every day',
        badgeHighlight: 'Step over that line',
      },
      {
        title: 'Failure Is The Tuition',
        intro: 'If you have never failed, you have never tried anything worth doing.',
        headline: 'Failure is not the opposite of success. It is the tuition you pay for success. Michael Jordan was cut from his high school basketball team. Walt Disney was fired for lacking imagination. Einstein failed his university entrance exam. The common thread is not talent. It is the willingness to fail forward.',
        subheader: 'Every failure teaches you something a book never could. It teaches you resilience, adaptability, and humility. The only real failure is the failure to try.',
        badge: 'Fail fast. Fail forward. Fail often. That is the winning formula.',
        cta: 'Share your biggest failure that taught you the most. Follow for fearless living.',
        introHighlight: 'never tried',
        headlineHighlight: 'tuition you pay',
        subheaderHighlight: 'fail forward',
        badgeHighlight: 'winning formula',
      },
      {
        title: 'What If It Works',
        intro: 'You always ask what if it fails. But what if it works?',
        headline: 'Your brain is wired to focus on worst-case scenarios. That is biology. But what if you trained it to focus on best-case scenarios instead? What if the business succeeds? What if the relationship works? What if you are actually capable of everything you dream about? The possibility of success should excite you more than the possibility of failure scares you.',
        subheader: 'Before you talk yourself out of something, spend equal time imagining it working out. Most people never give success the same mental airtime they give failure.',
        badge: 'Fear says what if you fall. Faith says what if you fly.',
        cta: 'What would you do if you knew you could not fail? Answer below. Follow for fearless thinking.',
        introHighlight: 'what if it works',
        headlineHighlight: 'best-case scenarios',
        subheaderHighlight: 'equal time imagining',
        badgeHighlight: 'what if you fly',
      },
      {
        title: 'Scared Money Dont Make Money',
        intro: 'Playing it safe is the riskiest thing you can do.',
        headline: 'The biggest risk is not taking any risk. In a world that changes fast, the only strategy guaranteed to fail is not taking risks. Every successful entrepreneur, investor, and leader took calculated risks that terrified them. They did not eliminate the fear. They calculated the odds and moved anyway.',
        subheader: 'Risk does not mean being reckless. It means being strategic about which fears to face. Calculate the downside. If you can survive it, the upside is worth the bet.',
        badge: 'Fortune favors the bold. Not the reckless, not the timid. The bold.',
        cta: 'What risk are you taking this year? Share your move. Follow for bold living.',
        introHighlight: 'riskiest thing',
        headlineHighlight: 'biggest risk is not taking any',
        subheaderHighlight: 'calculated risks',
        badgeHighlight: 'Fortune favors the bold',
      },
      {
        title: 'Fear Of Judgment Is A Prison',
        intro: 'The people judging you are not living the life you want. So why do you care?',
        headline: 'Fear of judgment keeps more people stuck than fear of failure. You do not start the business because of what people might say. You do not post the content because of what people might think. But here is the truth. People are too busy worrying about their own lives to spend time judging yours.',
        subheader: 'The opinions of people who are not where you want to be are irrelevant. Would you take financial advice from someone who is broke? Then stop taking life advice from people who are not living the life you want.',
        badge: 'What other people think of you is none of your business. Focus on the mission.',
        cta: 'Drop a fire emoji if you have stopped caring about haters. Follow for freedom.',
        introHighlight: 'why do you care',
        headlineHighlight: 'too busy worrying',
        subheaderHighlight: 'irrelevant',
        badgeHighlight: 'none of your business',
      },
      {
        title: 'Do It Afraid',
        intro: 'Courage is not the absence of fear. It is action in the presence of fear.',
        headline: 'Brave people are not fearless. They are terrified and they do it anyway. Every hero in every story was scared. The difference is they moved. They spoke. They acted. They jumped. You will never feel ready. The butterflies will never go away. Do it with the butterflies.',
        subheader: 'Waiting until you are not scared is like waiting until you are not hungry to eat. Fear is part of the human experience. It goes with you, not away from you.',
        badge: 'Do it scared. Do it shaking. Do it crying. Just do it. That is bravery.',
        cta: 'What are you doing afraid this week? Declare it. Follow for courage fuel.',
        introHighlight: 'action in the presence',
        headlineHighlight: 'terrified and they do it anyway',
        subheaderHighlight: 'Do it with the butterflies',
        badgeHighlight: 'That is bravery',
      },
      {
        title: 'The Fear Of Starting',
        intro: 'Starting is the hardest part. Everything else gets easier.',
        headline: 'The gap between wanting to do something and actually doing it is called the start gap. It is where most dreams go to die. Not because the task is impossible, but because the first step feels overwhelming. Your brain magnifies the difficulty of starting by ten times. Once you start, it adjusts.',
        subheader: 'Lower the bar for starting. Your first video does not need to go viral. Your first product does not need to be perfect. Your first step just needs to be taken. Start ugly. Start messy. Start now.',
        badge: 'The best time to start was yesterday. The second best time is right now.',
        cta: 'What are you starting today? Put it in writing below. Follow for action content.',
        introHighlight: 'hardest part',
        headlineHighlight: 'start gap',
        subheaderHighlight: 'Start ugly. Start messy. Start now.',
        badgeHighlight: 'right now',
      },
      {
        title: 'Regret Is Worse Than Rejection',
        intro: 'At the end of your life, you will not regret the things you did. You will regret the things you did not do.',
        headline: 'Studies on deathbed regrets reveal the same pattern. People do not regret failures. They regret missed opportunities. The relationship they did not pursue. The business they did not start. The words they never said. Rejection stings for a moment. Regret haunts for a lifetime.',
        subheader: 'Make a decision today to live a life with minimal regret. Say yes to more things. Take more chances. Tell people how you feel. The pain of action is temporary. The pain of inaction is permanent.',
        badge: 'Twenty years from now, what will you wish you had started today? Start it.',
        cta: 'What do you not want to regret? Share your truth. Follow for no-regrets living.',
        introHighlight: 'did not do',
        headlineHighlight: 'deathbed regrets',
        subheaderHighlight: 'minimal regret',
        badgeHighlight: 'Start it',
      },
      {
        title: 'Fear Fades When You Face It',
        intro: 'The monster under the bed is never as scary when you turn the lights on.',
        headline: 'Anxiety researchers discovered something powerful. The anticipation of fear is always worse than the actual event. Always. Your brain creates horror movies about the future that never play out. The speech you feared giving goes fine. The call you dreaded making leads to opportunity. The risk you avoided was never that risky.',
        subheader: 'Exposure therapy works because repeated exposure shrinks the fear response. The more you face something, the less power it has over you. Fear is like a muscle in reverse. The more you exercise it, the weaker it gets.',
        badge: 'Face it until it fears you. That is the only way through.',
        cta: 'Name one fear you conquered this year. Celebrate it below. Follow for fearless living.',
        introHighlight: 'turn the lights on',
        headlineHighlight: 'anticipation is always worse',
        subheaderHighlight: 'repeated exposure',
        badgeHighlight: 'Face it until it fears you',
      },
    ],
  },
  {
    id: 'hustle',
    name: 'Hustle',
    posts: [
      {
        title: 'Nobody Is Coming To Save You',
        intro: 'There is no cavalry coming. No lottery win. No miracle. Just you and your work ethic.',
        headline: 'The sooner you accept that nobody is coming to save you, the sooner you start saving yourself. No government program, no rich uncle, no viral moment is going to change your life. The only thing that changes your life is consistent, focused, relentless effort day after day after day.',
        subheader: 'This is not depressing. This is empowering. It means you are in control. Your destiny is not in someone else is hands. It is in yours. Every single day, you get to choose.',
        badge: 'Be your own hero. Be your own investor. Be your own rescue.',
        cta: 'If you believe in self-reliance, share this. Follow for hustle motivation.',
        introHighlight: 'your work ethic',
        headlineHighlight: 'saving yourself',
        subheaderHighlight: 'you are in control',
        badgeHighlight: 'Be your own hero',
      },
      {
        title: 'Work While They Sleep',
        intro: 'While they party, you plan. While they sleep, you grind. While they wish, you build.',
        headline: 'There are twenty-four hours in a day. Everybody gets the same amount. The difference is how you use them. Successful people did not find extra time. They made extra time. They woke up earlier. They stayed up later. They cut the fat and focused on what matters.',
        subheader: 'You do not need to work twenty hours a day. That is not the point. The point is that every hour counts. One focused hour of deep work is worth more than four hours of distracted half-effort.',
        badge: 'Outwork everyone in the room. Not with hours, but with intention.',
        cta: 'What time did you start today? Drop it below. Follow for work ethic daily.',
        introHighlight: 'you build',
        headlineHighlight: 'made extra time',
        subheaderHighlight: 'every hour counts',
        badgeHighlight: 'Outwork everyone',
      },
      {
        title: 'Start Before You Are Ready',
        intro: 'If you wait until you are ready, you will wait forever.',
        headline: 'Ready is a myth. It is a word your brain uses to keep you safe. Nobody who built something great was ready when they started. Jeff Bezos started Amazon in his garage. Sara Blakely started Spanx with five thousand dollars and no business experience. They started with what they had, not what they wished they had.',
        subheader: 'You have enough right now to begin. Not to finish. Just to begin. And beginning is the only thing standing between you and everything you want.',
        badge: 'Start messy. Start scared. Start underfunded. Just start.',
        cta: 'What are you starting with? Share your starting point. Follow for entrepreneurship.',
        introHighlight: 'wait forever',
        headlineHighlight: 'ready is a myth',
        subheaderHighlight: 'enough right now to begin',
        badgeHighlight: 'Just start',
      },
      {
        title: 'Multiple Streams Of Income',
        intro: 'If you have one source of income, you are one decision away from zero.',
        headline: 'The average millionaire has seven streams of income. Not one. Seven. A job is a single point of failure. If it disappears tomorrow, everything goes with it. Building multiple income streams is not greedy. It is survival. It is intelligence. It is how wealth is actually built.',
        subheader: 'Start with one side hustle. Just one. Master it. Automate it. Then build the next one. Do not try to juggle seven things at once. Stack them one at a time, like bricks.',
        badge: 'Diversify your income like you diversify your investments. Never put everything in one basket.',
        cta: 'How many income streams do you have? Be honest. Follow for wealth-building strategies.',
        introHighlight: 'one decision away from zero',
        headlineHighlight: 'seven streams',
        subheaderHighlight: 'Stack them one at a time',
        badgeHighlight: 'Never put everything in one basket',
      },
      {
        title: 'Your Side Hustle Is Your Lifeline',
        intro: 'Your nine to five makes you a living. Your side hustle makes you alive.',
        headline: 'A side hustle is not just extra money. It is freedom in training. Every dollar you earn outside your job is proof that you can create value on your own terms. It builds skills, confidence, and a safety net that your employer cannot take away. Seventy percent of millionaires started with a side hustle.',
        subheader: 'Start tonight. Not next week. Tonight. What can you sell? What can you teach? What problem can you solve? The internet has made it possible to start a business with nothing but a phone and an idea.',
        badge: 'Your side hustle today is your main hustle tomorrow. Plant the seed now.',
        cta: 'What is your side hustle? Drop it below and let us support each other. Follow for hustle culture.',
        introHighlight: 'makes you alive',
        headlineHighlight: 'freedom in training',
        subheaderHighlight: 'Start tonight',
        badgeHighlight: 'Plant the seed now',
      },
      {
        title: 'Grind In Silence',
        intro: 'Let your results make the noise. Stop announcing your plans.',
        headline: 'Every time you share your goals, your brain gets a premature sense of accomplishment. Psychology calls it social reality. Your mind feels like the goal is already achieved just because you talked about it. That is why people who announce everything accomplish nothing. The talkers talk. The doers do.',
        subheader: 'Work in silence. Let them wonder what you are up to. One day they will ask what happened and you will say I just stayed consistent while everyone was watching from the sidelines.',
        badge: 'Lions do not need to announce they are lions. Neither do you.',
        cta: 'If you move in silence, double tap. Follow for quiet power.',
        introHighlight: 'results make the noise',
        headlineHighlight: 'social reality',
        subheaderHighlight: 'Work in silence',
        badgeHighlight: 'Lions',
      },
      {
        title: 'Turn Problems Into Products',
        intro: 'Every problem you face is a business opportunity in disguise.',
        headline: 'The best businesses in the world were born from frustration. Uber exists because Travis Kalanick could not get a cab. Airbnb exists because two guys could not afford rent. Every time you are frustrated by something, write it down. That frustration is a market signal telling you what people will pay to solve.',
        subheader: 'Stop consuming problems and start solving them. The person who solves a problem for one million people becomes a millionaire. It is that simple. Find the pain point and build the painkiller.',
        badge: 'Entrepreneurs do not avoid problems. They monetize them.',
        cta: 'What problem do you wish someone would solve? Maybe you should build it. Follow for business ideas.',
        introHighlight: 'business opportunity',
        headlineHighlight: 'born from frustration',
        subheaderHighlight: 'build the painkiller',
        badgeHighlight: 'monetize them',
      },
      {
        title: 'Invest In Yourself First',
        intro: 'The best investment you will ever make is not stocks or crypto. It is you.',
        headline: 'Warren Buffett says the best investment is in your own abilities. Books, courses, mentors, experiences. These are not expenses. They are investments with infinite returns. A twenty-dollar book can contain an idea that makes you a million dollars. A five-thousand dollar course can save you five years of trial and error.',
        subheader: 'Set aside ten percent of your income for self-education. Not savings. Not bills. Self-improvement. The more valuable you become, the more valuable your time becomes. The more valuable your time, the more money follows.',
        badge: 'You are the asset. Invest accordingly.',
        cta: 'What was the best investment you made in yourself? Share below. Follow for growth mindset.',
        introHighlight: 'It is you',
        headlineHighlight: 'infinite returns',
        subheaderHighlight: 'ten percent',
        badgeHighlight: 'You are the asset',
      },
      {
        title: 'The Entrepreneur Mindset',
        intro: 'Employees trade time for money. Entrepreneurs build systems that trade value for money.',
        headline: 'An employee mindset says how can I get more hours. An entrepreneur mindset says how can I create more value. When you shift from selling your time to selling solutions, everything changes. Time is limited. Value is unlimited. One YouTube video can earn money while you sleep for the next ten years.',
        subheader: 'Start thinking in assets, not paychecks. What can you build once that pays you repeatedly? A course. An app. A brand. A system. That is how you escape the time-for-money trap.',
        badge: 'Build the machine that makes money while you sleep. That is real wealth.',
        cta: 'What asset are you building? Share your vision. Follow for entrepreneur content.',
        introHighlight: 'systems',
        headlineHighlight: 'selling solutions',
        subheaderHighlight: 'assets, not paychecks',
        badgeHighlight: 'real wealth',
      },
      {
        title: 'Broke Is Temporary, Poor Is Mindset',
        intro: 'Being broke is a situation. Being poor is a state of mind.',
        headline: 'There is a massive difference between broke and poor. Broke means your bank account is empty right now. Poor means your mind is empty of ideas. Broke people know they are passing through. Poor people believe they are stuck forever. One is a circumstance. The other is a belief system.',
        subheader: 'If you are broke right now, good. Use that hunger. Let that empty bank account fuel your fire. Some of the wealthiest people in the world started with nothing. Not because they had advantages, but because they had the right mindset.',
        badge: 'Your bank account does not define you. Your mindset does.',
        cta: 'If you turned broke into motivation, share your story. Follow for wealth mindset.',
        introHighlight: 'state of mind',
        headlineHighlight: 'empty of ideas',
        subheaderHighlight: 'Use that hunger',
        badgeHighlight: 'mindset does',
      },
    ],
  },
  {
    id: 'leadership',
    name: 'Leadership',
    posts: [
      {
        title: 'Leaders Eat Last',
        intro: 'Real leaders do not eat first. They make sure everyone else is fed.',
        headline: 'Leadership is not about power. It is about responsibility. The best leaders create environments where people feel safe to take risks, speak up, and grow. When you put your team first, they will run through walls for you. Not because they have to, but because they want to.',
        subheader: 'The test of leadership is not what happens when things are going well. It is what happens when everything falls apart. That is when real leaders show up.',
        badge: 'A title makes you a manager. Your behavior makes you a leader.',
        cta: 'Who is the best leader you have worked with? Tag them. Follow for leadership wisdom.',
        introHighlight: 'everyone else is fed',
        headlineHighlight: 'responsibility',
        subheaderHighlight: 'when everything falls apart',
        badgeHighlight: 'behavior',
      },
      {
        title: 'Vision Without Action Is Hallucination',
        intro: 'Having a vision is not enough. You need to build the bridge between vision and reality.',
        headline: 'Thomas Edison said vision without execution is hallucination. A leader without action is just a dreamer with a title. Your team does not need more motivational speeches. They need to see you in the trenches, building, solving, and executing alongside them.',
        subheader: 'Cast the vision. Then roll up your sleeves and show people the way. The best leaders do not point from the top. They lead from the front.',
        badge: 'Dream big. Plan bigger. Execute biggest.',
        cta: 'What is your vision? Share it below and start building. Follow for leadership.',
        introHighlight: 'build the bridge',
        headlineHighlight: 'hallucination',
        subheaderHighlight: 'lead from the front',
        badgeHighlight: 'Execute biggest',
      },
      {
        title: 'Influence Over Authority',
        intro: 'The greatest leaders never have to demand respect. They earn it.',
        headline: 'Authority is given by position. Influence is earned by character. You can force compliance but you cannot force commitment. People follow authoritative leaders because they must. People follow influential leaders because they believe. The difference shows up in the quality of the work and the loyalty of the team.',
        subheader: 'Build influence through consistency, empathy, and competence. Show up every day. Listen more than you speak. Deliver on your promises. That is how you earn the kind of respect that no title can buy.',
        badge: 'People do not follow titles. They follow trust.',
        cta: 'How do you earn trust with your team? Share your approach. Follow for influence.',
        introHighlight: 'earn it',
        headlineHighlight: 'Influence is earned',
        subheaderHighlight: 'consistency, empathy, and competence',
        badgeHighlight: 'follow trust',
      },
      {
        title: 'Build People, Not Just Profits',
        intro: 'If you build the people, the people will build the business.',
        headline: 'The most successful companies in the world invest more in their people than their products. Google, Apple, Netflix. They know that great people create great products, not the other way around. When you develop the humans on your team, you develop the business automatically.',
        subheader: 'Ask your team what they need to grow. Not just professionally, but personally. A leader who cares about the whole person earns a loyalty that money cannot buy.',
        badge: 'Build leaders, not followers. The ultimate sign of great leadership is creating more leaders.',
        cta: 'How do you invest in your people? Share below. Follow for leadership growth.',
        introHighlight: 'people will build the business',
        headlineHighlight: 'invest more in their people',
        subheaderHighlight: 'the whole person',
        badgeHighlight: 'creating more leaders',
      },
      {
        title: 'Serve To Lead',
        intro: 'The best leaders are servants first. Their power comes from service.',
        headline: 'Servant leadership is not weakness. It is the highest form of strength. When you serve your team, you remove obstacles. You create clarity. You empower people to do their best work. The leader who serves creates a culture where everyone wants to give their best because they feel valued.',
        subheader: 'Every day, ask yourself one question. How can I make my team is job easier today? That single question transforms you from a boss into a leader people love working for.',
        badge: 'The measure of a leader is not the number of people who serve them, but the number they serve.',
        cta: 'How do you serve your team? Share your leadership style. Follow for servant leadership.',
        introHighlight: 'servants first',
        headlineHighlight: 'highest form of strength',
        subheaderHighlight: 'make my team is job easier',
        badgeHighlight: 'number they serve',
      },
      {
        title: 'Communicate Or Crash',
        intro: 'Every problem in business can be traced back to a communication failure.',
        headline: 'Eighty-six percent of workplace failures are caused by poor communication. Not lack of talent. Not lack of resources. Communication. Leaders who communicate clearly, frequently, and honestly build teams that can survive anything. Silence from leadership breeds anxiety, rumors, and distrust.',
        subheader: 'Overcommunicate the why behind every decision. People do not resist change. They resist change they do not understand. When they know the reason, they join the mission.',
        badge: 'Clear communication is not a soft skill. It is the hardest and most important skill of leadership.',
        cta: 'What is your biggest communication lesson? Share below. Follow for leadership skills.',
        introHighlight: 'communication failure',
        headlineHighlight: 'Eighty-six percent',
        subheaderHighlight: 'Overcommunicate the why',
        badgeHighlight: 'most important skill',
      },
      {
        title: 'Own Your Mistakes',
        intro: 'A leader who cannot admit fault is a leader nobody trusts.',
        headline: 'Accountability starts at the top. When things go wrong, a real leader says my fault. Not my team messed up. Not the market changed. My fault. This is not weakness. It is the ultimate display of strength. A leader who owns their mistakes earns more respect than one who never makes any.',
        subheader: 'After you own the mistake, own the fix. Do not just apologize. Show the solution. Show the lesson learned. Show that failure made the team stronger.',
        badge: 'The fastest way to lose trust is to blame others. The fastest way to earn it is to own your failures.',
        cta: 'Have you ever seen a leader own a mistake? How did it change your respect? Follow for authentic leadership.',
        introHighlight: 'nobody trusts',
        headlineHighlight: 'my fault',
        subheaderHighlight: 'own the fix',
        badgeHighlight: 'own your failures',
      },
      {
        title: 'Empower, Do Not Micromanage',
        intro: 'Micromanagement is not leadership. It is insecurity disguised as diligence.',
        headline: 'When you micromanage, you send a clear message. I do not trust you. That message destroys morale, kills creativity, and drives talent away. The best leaders hire great people and then get out of their way. They provide direction, resources, and support. Then they trust the process.',
        subheader: 'Your job is not to control every detail. Your job is to set the vision, remove obstacles, and coach your team to greatness. If you have to oversee every detail, you hired the wrong people or you are the bottleneck.',
        badge: 'Empower people to make decisions. That is how you scale yourself and your impact.',
        cta: 'Are you a leader or a controller? Be honest. Follow for empowerment leadership.',
        introHighlight: 'insecurity',
        headlineHighlight: 'I do not trust you',
        subheaderHighlight: 'you are the bottleneck',
        badgeHighlight: 'scale yourself',
      },
      {
        title: 'Decisiveness Is A Superpower',
        intro: 'Indecision is the silent killer of leadership. Decide and move.',
        headline: 'Leaders are paid to make decisions. Not perfect decisions. Good enough decisions made quickly. An eighty percent decision made today is better than a hundred percent decision made next month. Speed matters. While you are deliberating, the opportunity is moving. Markets shift. Competition acts.',
        subheader: 'Train yourself to make decisions in minutes, not days. Gather the essential information. Trust your instinct. Commit. If it is wrong, pivot fast. The ability to decide and adapt is more valuable than the ability to analyze endlessly.',
        badge: 'A wrong decision can be corrected. Indecision cannot.',
        cta: 'How do you make fast decisions? Share your framework. Follow for decisive leadership.',
        introHighlight: 'silent killer',
        headlineHighlight: 'eighty percent decision',
        subheaderHighlight: 'decide and adapt',
        badgeHighlight: 'Indecision cannot',
      },
      {
        title: 'Leave The Ego At The Door',
        intro: 'The moment your ego walks in, your leadership walks out.',
        headline: 'Ego-driven leaders surround themselves with yes men. They take credit for wins and deflect blame for losses. They stop learning because they believe they already know everything. And slowly, surely, they destroy the very thing they built. The best leaders are humble enough to learn, listen, and adapt.',
        subheader: 'Check your ego daily. Are you making decisions for the mission or for your pride? Are you listening to feedback or dismissing it? The strongest leaders are the ones humble enough to say I do not know but I will figure it out.',
        badge: 'Humility is not thinking less of yourself. It is thinking of yourself less.',
        cta: 'How do you keep your ego in check? Share your method. Follow for humble leadership.',
        introHighlight: 'leadership walks out',
        headlineHighlight: 'stop learning',
        subheaderHighlight: 'Check your ego',
        badgeHighlight: 'thinking of yourself less',
      },
    ],
  },
  {
    id: 'resilience',
    name: 'Resilience',
    posts: [
      {
        title: 'You Have Survived 100 Percent',
        intro: 'Every single bad day you have ever had, you survived. Your track record is flawless.',
        headline: 'Think about every hardship you have faced. Every heartbreak, every failure, every moment you thought you would not make it. You are still here. One hundred percent survival rate. That is not luck. That is resilience. That is proof that you are tougher than you think.',
        subheader: 'When the next storm comes, and it will, remember this number. One hundred percent. You have never lost a round permanently. You have been knocked down but never knocked out.',
        badge: 'You have survived every worst day of your life. You will survive the next one too.',
        cta: 'Share what you survived this year. Your story might save someone. Follow for resilience.',
        introHighlight: 'track record is flawless',
        headlineHighlight: 'One hundred percent',
        subheaderHighlight: 'never knocked out',
        badgeHighlight: 'survive the next one too',
      },
      {
        title: 'Pressure Makes Diamonds',
        intro: 'A diamond is just a piece of coal that handled pressure exceptionally well.',
        headline: 'Pressure is not your enemy. It is your trainer. The situations that feel like they are crushing you are actually shaping you. Every rejection hardens your skin. Every failure sharpens your strategy. Every setback strengthens your resolve. You are not breaking. You are being forged.',
        subheader: 'The next time life puts you under pressure, do not crack. Compress. Get denser. Get stronger. Get more brilliant. That is what diamonds do.',
        badge: 'Pressure is a privilege. It means you are doing something worth being tested for.',
        cta: 'What pressure is shaping you right now? Share below. Follow for strength daily.',
        introHighlight: 'handled pressure',
        headlineHighlight: 'shaping you',
        subheaderHighlight: 'Get more brilliant',
        badgeHighlight: 'privilege',
      },
      {
        title: 'Rock Bottom Is A Foundation',
        intro: 'Rock bottom is not the end. It is the foundation you build your empire on.',
        headline: 'J.K. Rowling wrote Harry Potter while broke and depressed. Oprah was born into poverty and abuse. Jay-Z grew up in the projects. Rock bottom gave them something privilege never could. Hunger. Clarity. An unbreakable why. When you have nothing to lose, you have everything to gain.',
        subheader: 'If you are at your lowest right now, listen carefully. This is not your ending. This is your origin story. Every hero story starts with a struggle. Yours is starting right now.',
        badge: 'The foundation of your greatest success is being built in your hardest season.',
        cta: 'If you came from the bottom, share your story. Follow for comeback content.',
        introHighlight: 'foundation',
        headlineHighlight: 'Hunger. Clarity.',
        subheaderHighlight: 'origin story',
        badgeHighlight: 'hardest season',
      },
      {
        title: 'Bend, Do Not Break',
        intro: 'A tree that cannot bend will break in the storm. Be the bamboo.',
        headline: 'Rigidity kills. In business, in relationships, in life. The people who survive are not the strongest. They are the most adaptable. Plans will fail. Markets will crash. People will leave. Your ability to bend, pivot, and adapt determines whether you survive or shatter.',
        subheader: 'Stop trying to control everything. Control what you can. Adapt to what you cannot. When life pushes you in an unexpected direction, do not fight it. Flow with it and find the opportunity in the chaos.',
        badge: 'Flexibility is not weakness. It is the ultimate strength.',
        cta: 'How have you adapted to a tough situation? Share your pivot. Follow for adaptability.',
        introHighlight: 'Be the bamboo',
        headlineHighlight: 'most adaptable',
        subheaderHighlight: 'find the opportunity',
        badgeHighlight: 'ultimate strength',
      },
      {
        title: 'Fall Seven Times, Rise Eight',
        intro: 'It does not matter how many times you fall. It matters how many times you get back up.',
        headline: 'The Japanese proverb says fall seven times, stand up eight. That is the entire formula for success. Not perfection. Not avoiding failure. Just getting back up one more time than you fall. Every comeback starts with the decision to not stay down. That decision is always available to you.',
        subheader: 'Nobody remembers how many times you fell. They remember that you kept standing. Your resilience is the most inspiring thing about you. Not your wins. Your refusal to quit.',
        badge: 'You are not defined by your falls. You are defined by your rises.',
        cta: 'What is your comeback story? Drop it below. Follow for never-quit energy.',
        introHighlight: 'get back up',
        headlineHighlight: 'stand up eight',
        subheaderHighlight: 'refusal to quit',
        badgeHighlight: 'defined by your rises',
      },
      {
        title: 'Pain Is A Teacher',
        intro: 'Pain is not punishment. It is preparation.',
        headline: 'Behind every strong person is a story of pain that made them stronger. Pain teaches you what comfort never could. It teaches you who your real friends are. It shows you what you are really made of. It forces you to develop skills and strength you never knew you had.',
        subheader: 'Do not numb the pain. Feel it. Process it. Learn from it. Then use it. The people who transform pain into power become unstoppable. They have been through the fire and came out as steel.',
        badge: 'Your pain is not wasted. It is being converted into power. Trust the process.',
        cta: 'What pain taught you the most? Share below. Follow for transformation content.',
        introHighlight: 'preparation',
        headlineHighlight: 'what you are really made of',
        subheaderHighlight: 'transform pain into power',
        badgeHighlight: 'converted into power',
      },
      {
        title: 'The Comeback Is Always Stronger',
        intro: 'People love a good comeback story. It is time to write yours.',
        headline: 'History is full of comeback stories that make the original success look small. Michael Jordan was cut, then became the greatest of all time. Apple almost went bankrupt before creating the iPhone. The comeback is more powerful because it carries wisdom the first attempt never had.',
        subheader: 'If you are in your down period right now, take notes. Study what went wrong. Build new skills. Create new connections. When you come back, and you will, you will be equipped with something your competition does not have. Experience.',
        badge: 'Your next chapter will make people forget the last one. Keep writing.',
        cta: 'What comeback are you preparing? Share your vision. Follow for comeback energy.',
        introHighlight: 'write yours',
        headlineHighlight: 'more powerful',
        subheaderHighlight: 'Experience',
        badgeHighlight: 'Keep writing',
      },
      {
        title: 'Storms Do Not Last Forever',
        intro: 'No storm lasts forever. But the strength you build during the storm does.',
        headline: 'When you are in the middle of chaos, it feels like it will never end. But go back through your life. Every difficult period ended. Every crisis resolved. Every dark night gave way to morning. This too shall pass. But the lessons, the strength, the character you build right now, those stay with you forever.',
        subheader: 'Do not just survive the storm. Study it. Find patterns. Build shelter. Prepare for the next one. The goal is not to avoid storms. It is to become the person who is unshakable when they come.',
        badge: 'Tough times do not last. Tough people do.',
        cta: 'What storm are you weathering right now? You are not alone. Follow for daily strength.',
        introHighlight: 'strength you build',
        headlineHighlight: 'This too shall pass',
        subheaderHighlight: 'unshakable',
        badgeHighlight: 'Tough people do',
      },
      {
        title: 'Turn Scars Into Stars',
        intro: 'Your scars are not something to hide. They are proof that you are a warrior.',
        headline: 'In Japan, there is an art called Kintsugi. When pottery breaks, they repair it with gold. The cracks become the most beautiful part. That is what resilience looks like. Your breakdowns are not the end. They are the gold seams of your story. Every scar tells a story of survival.',
        subheader: 'Stop hiding your struggles. Share them. Someone needs to hear that it is possible to come through the other side. Your vulnerability is your greatest strength.',
        badge: 'Broken and rebuilt is stronger than never broken at all.',
        cta: 'Share your gold seam moment. Follow for beautiful resilience.',
        introHighlight: 'warrior',
        headlineHighlight: 'Kintsugi',
        subheaderHighlight: 'vulnerability',
        badgeHighlight: 'Broken and rebuilt',
      },
      {
        title: 'Keep Going, You Are Closer Than You Think',
        intro: 'Most people quit when they are three feet from gold. Do not be most people.',
        headline: 'There is a story about a gold miner who gave up after digging for weeks. He sold his equipment. The buyer hired an engineer, discovered the gold was just three feet away, and made millions. The lesson is brutal but true. You have no idea how close you are to your breakthrough.',
        subheader: 'When you feel like quitting, remember why you started. Then dig three more feet. The fact that it is hard means you are close. Easy things do not produce meaningful results.',
        badge: 'The last mile is always the hardest. That is how you know you are almost there.',
        cta: 'If you are still going, drop an emoji. You are closer than you think. Follow for perseverance.',
        introHighlight: 'three feet from gold',
        headlineHighlight: 'how close you are',
        subheaderHighlight: 'why you started',
        badgeHighlight: 'almost there',
      },
    ],
  },
  {
    id: 'purpose',
    name: 'Purpose',
    posts: [
      {
        title: 'Find Your Why Or Die Trying',
        intro: 'A person with a why can endure almost any how.',
        headline: 'Your why is the fuel that keeps you moving when motivation dies, when the money runs out, when people leave, and when the world says quit. Without a clear why, you will crumble at the first obstacle. With a clear why, you become almost impossible to stop.',
        subheader: 'Write down your why. Not what you want to achieve. Why you want to achieve it. Who are you doing this for? What happens if you do not? Keep that answer somewhere you can see it every single day.',
        badge: 'Purpose is not something you find. It is something you decide.',
        cta: 'What is your why? Share it. Speaking it makes it real. Follow for purposeful living.',
        introHighlight: 'endure almost any how',
        headlineHighlight: 'impossible to stop',
        subheaderHighlight: 'Write down your why',
        badgeHighlight: 'decide',
      },
      {
        title: 'Your Life Is Not A Rehearsal',
        intro: 'This is not practice. This is the show. You are live right now.',
        headline: 'Most people live as if they have unlimited time. Someday I will start the business. Someday I will travel. Someday I will tell them how I feel. But someday is not on the calendar. The average person lives about thirty thousand days. That number only goes down. Every day you waste is gone forever.',
        subheader: 'Live with urgency. Not anxiety, urgency. There is a difference. Anxiety paralyzes. Urgency mobilizes. Act like your time is limited because it is.',
        badge: 'One life. No rehearsals. No sequels. Make this one count.',
        cta: 'What would you do if you had one year left? Answer honestly. Follow for wake-up calls.',
        introHighlight: 'live right now',
        headlineHighlight: 'thirty thousand days',
        subheaderHighlight: 'urgency',
        badgeHighlight: 'Make this one count',
      },
      {
        title: 'Passion Without Purpose Is Chaos',
        intro: 'Passion alone is a wildfire. Purpose gives it direction.',
        headline: 'Passion is energy. Purpose is the channel that focuses that energy into results. Plenty of passionate people are broke and frustrated because their passion has no direction. Purpose takes raw enthusiasm and turns it into impact. You do not just need to love what you do. You need to know who you are doing it for.',
        subheader: 'Ask yourself three questions. What do I love doing? What am I good at? What does the world need? Where those three answers overlap is your purpose zone. That is where magic happens.',
        badge: 'Find where your passion meets the world is pain. That is your purpose.',
        cta: 'Have you found your purpose zone? Share what it looks like. Follow for meaning.',
        introHighlight: 'direction',
        headlineHighlight: 'channel that focuses',
        subheaderHighlight: 'purpose zone',
        badgeHighlight: 'passion meets the world is pain',
      },
      {
        title: 'Legacy Over Lifestyle',
        intro: 'Lifestyle is for you. Legacy is for everyone after you.',
        headline: 'You can spend your life accumulating things or creating things. One dies with you. The other lives on. Martin Luther King did not dream about a bigger house. Mother Teresa did not chase followers. They built legacies that changed the world. Your legacy is the answer to one question. What did you leave behind?',
        subheader: 'Start thinking in generations, not months. What will your grandchildren inherit from your decisions today? Not money. Values. Impact. A better world than the one you found.',
        badge: 'The best time to plant a tree was twenty years ago. The second best time is now.',
        cta: 'What legacy are you building? Real talk. Follow for legacy thinking.',
        introHighlight: 'everyone after you',
        headlineHighlight: 'What did you leave behind',
        subheaderHighlight: 'thinking in generations',
        badgeHighlight: 'plant a tree',
      },
      {
        title: 'You Were Built For This',
        intro: 'The fact that this dream lives in your heart means you have the capacity to achieve it.',
        headline: 'Your desires are not accidents. The dream that keeps you up at night, the vision that will not leave your mind, the pull toward something greater. That is not random. You were given that dream because you are capable of achieving it. The universe does not plant seeds in soil that cannot grow them.',
        subheader: 'Stop questioning whether you deserve it. Stop asking if you are worthy. You were built for this. Every experience in your life, good and bad, was training you for this exact moment.',
        badge: 'You are not an accident. You are an assignment. Act like it.',
        cta: 'What dream keeps you up at night? Speak it into existence below. Follow for purpose.',
        introHighlight: 'capacity to achieve it',
        headlineHighlight: 'capable of achieving it',
        subheaderHighlight: 'training you',
        badgeHighlight: 'an assignment',
      },
      {
        title: 'Meaning Over Money',
        intro: 'Chase meaning and money follows. Chase money and meaning escapes.',
        headline: 'The happiest billionaires are not the ones with the biggest yachts. They are the ones solving the biggest problems. When your work has meaning, you never work a day in your life. When your work is just for money, every day feels like prison. Purpose-driven people outperform profit-driven people every single time.',
        subheader: 'Find work that matters to you. Not work that pays well but leaves you empty. Money without meaning is a golden cage. You can buy everything but feel nothing.',
        badge: 'Rich is not a number. It is a feeling. And that feeling comes from purpose.',
        cta: 'Does your work give you meaning? Real answers only. Follow for purposeful wealth.',
        introHighlight: 'money follows',
        headlineHighlight: 'solving the biggest problems',
        subheaderHighlight: 'work that matters',
        badgeHighlight: 'feeling comes from purpose',
      },
      {
        title: 'Your Story Matters',
        intro: 'Your story is the most powerful tool you have. Stop keeping it to yourself.',
        headline: 'Every person on this planet has a unique story. And somewhere out there, someone is going through exactly what you went through. Your story could be the light that guides them out of darkness. Your failures, your lessons, your triumphs. They are not just your story. They are someone else is survival guide.',
        subheader: 'Do not wait until you are successful to share. Share from the middle. Share the messy parts. Authenticity resonates more than perfection ever will.',
        badge: 'Your mess is your message. Your test is your testimony.',
        cta: 'Share a piece of your story below. You never know who needs to hear it. Follow for real stories.',
        introHighlight: 'most powerful tool',
        headlineHighlight: 'survival guide',
        subheaderHighlight: 'Share from the middle',
        badgeHighlight: 'mess is your message',
      },
      {
        title: 'Impact Over Income',
        intro: 'When you focus on impact, income becomes a byproduct.',
        headline: 'The people who make the most money are the ones who help the most people. It is not complicated. Solve a problem for one person, earn a little. Solve it for a million people, become a millionaire. Impact is the engine. Income is the exhaust. Stop chasing the exhaust.',
        subheader: 'Ask yourself every day. How many lives did I touch today? How many problems did I solve? How much value did I create? When those numbers go up, your bank account follows automatically.',
        badge: 'Serve a million people. The money handles itself.',
        cta: 'Whose life did you impact today? Share below. Follow for impact-first living.',
        introHighlight: 'byproduct',
        headlineHighlight: 'help the most people',
        subheaderHighlight: 'How many lives',
        badgeHighlight: 'Serve a million people',
      },
      {
        title: 'The Dash Between The Dates',
        intro: 'On your tombstone, there will be two dates and a dash. That dash is your entire life.',
        headline: 'Born 1990. Died 2060. But between those two dates is a tiny dash that represents everything. Every conversation, every relationship, every project, every moment of courage or cowardice. When people visit your grave, they will not care about the dates. They will care about what you did with the dash.',
        subheader: 'Are you filling your dash with scrolling, complaining, and waiting? Or are you filling it with creating, serving, and living? The dash is short. Make every inch of it count.',
        badge: 'It is not about the dates on the stone. It is about the dash in between.',
        cta: 'What are you doing with your dash? Deep answers only. Follow for meaningful living.',
        introHighlight: 'your entire life',
        headlineHighlight: 'what you did with the dash',
        subheaderHighlight: 'Make every inch of it count',
        badgeHighlight: 'dash in between',
      },
      {
        title: 'Create, Do Not Just Consume',
        intro: 'The world is divided into creators and consumers. Which one are you?',
        headline: 'Consumers watch. Creators build. Consumers react. Creators initiate. Consumers spend their time making other people rich by consuming their content, buying their products, and following their dreams. Creators spend their time building their own dreams and inviting others along for the ride.',
        subheader: 'Today, decide to create something. Write a post. Record a video. Build a product. Start a project. Even if it is imperfect. The act of creation activates a part of your brain that consumption never will.',
        badge: 'You were born to create, not to spectate. Get in the game.',
        cta: 'What did you create today? Share below. Follow for the creator mindset.',
        introHighlight: 'Which one are you',
        headlineHighlight: 'making other people rich',
        subheaderHighlight: 'decide to create something',
        badgeHighlight: 'born to create',
      },
    ],
  },
  {
    id: 'money',
    name: 'Money',
    posts: [
      {
        title: 'Money Is A Tool, Not A Goal',
        intro: 'Stop chasing money. Start building systems that attract it.',
        headline: 'The biggest mistake people make is treating money as the destination. Money is a vehicle. It gets you from where you are to where you want to be. The question is not how do I make more money. The question is what value can I create that people will pay for. When you focus on value, money follows.',
        subheader: 'Every dollar you earn is a direct reflection of the value you provide. Want to make more? Become more valuable. Learn more skills. Solve bigger problems. Serve more people.',
        badge: 'Money flows to value. Become valuable and you will never be broke.',
        cta: 'What value do you bring to the market? Share below. Follow for wealth building.',
        introHighlight: 'systems',
        headlineHighlight: 'vehicle',
        subheaderHighlight: 'Become more valuable',
        badgeHighlight: 'Money flows to value',
      },
      {
        title: 'Pay Yourself First',
        intro: 'If you do not pay yourself first, everyone else will be paid with your money.',
        headline: 'The richest man in Babylon taught this principle thousands of years ago. Before you pay rent, before you buy food, before you pay any bill, set aside at least ten percent for yourself. Not to spend. To invest. This is the seed of every fortune ever built. Most people pay everyone else first and save whatever is left. The problem is nothing is ever left.',
        subheader: 'Automate it. Set up an automatic transfer the day you get paid. Make it invisible. If you never see the money, you will never miss it. In one year, you will be shocked at what accumulates.',
        badge: 'Save like a pessimist. Invest like an optimist. That is the formula.',
        cta: 'Do you pay yourself first? Start this month. Follow for financial freedom.',
        introHighlight: 'Pay yourself first',
        headlineHighlight: 'ten percent',
        subheaderHighlight: 'Automate it',
        badgeHighlight: 'Save like a pessimist',
      },
      {
        title: 'Debt Is Modern Slavery',
        intro: 'Debt does not buy you things. It makes you a servant to the lender.',
        headline: 'Consumer debt is designed to keep you working forever. That car payment. That credit card. That buy now pay later scheme. Every monthly payment is a chain that ties you to a job you might not love. The interest alone means you are paying two, three, sometimes four times the original price. That is not smart. That is a trap.',
        subheader: 'Attack your debt like your freedom depends on it, because it does. Use the avalanche method. Pay minimums on everything and throw every extra dollar at the highest interest debt. Repeat until free.',
        badge: 'Debt-free is the new rich. Cut the chains and build real wealth.',
        cta: 'What is your debt freedom plan? Share below. Follow for financial literacy.',
        introHighlight: 'servant to the lender',
        headlineHighlight: 'keep you working forever',
        subheaderHighlight: 'avalanche method',
        badgeHighlight: 'Debt-free is the new rich',
      },
      {
        title: 'The Wealth Gap Secret',
        intro: 'The wealth gap is not about income. It is about assets.',
        headline: 'Poor people buy liabilities they think are assets. Rich people buy assets that generate income. A car is a liability. A rental property is an asset. Designer clothes are liabilities. A business is an asset. The wealthy understand one simple rule. Buy things that make you money before you buy things that cost you money.',
        subheader: 'Look at your last ten purchases. How many of them are making you money right now? If the answer is zero, you are playing the wrong game. Every dollar should be a soldier that works for you.',
        badge: 'Assets feed you. Liabilities eat you. Know the difference.',
        cta: 'What was your last asset purchase? Share below. Follow for financial intelligence.',
        introHighlight: 'assets',
        headlineHighlight: 'buy assets that generate income',
        subheaderHighlight: 'every dollar should be a soldier',
        badgeHighlight: 'Know the difference',
      },
      {
        title: 'Compound Interest Is The 8th Wonder',
        intro: 'Albert Einstein called compound interest the eighth wonder of the world.',
        headline: 'If you invest just one hundred dollars a month starting at age twenty, by sixty-five you could have over one million dollars. That is the power of compound interest. Your money makes money, which makes more money. The catch is time. The earlier you start, the more time works for you. Every year you wait costs you exponentially.',
        subheader: 'Stop saying I will invest when I have more money. Start with whatever you have right now. Even fifty dollars a month. The amount matters less than the habit and the time.',
        badge: 'Time in the market beats timing the market. Start today.',
        cta: 'When did you start investing? Or what is stopping you? Follow for investing wisdom.',
        introHighlight: 'eighth wonder',
        headlineHighlight: 'one million dollars',
        subheaderHighlight: 'Start with whatever you have',
        badgeHighlight: 'Start today',
      },
      {
        title: 'Lifestyle Inflation Will Keep You Broke',
        intro: 'Making more money does not make you rich. Keeping more money does.',
        headline: 'Most people get a raise and immediately upgrade their lifestyle. Bigger apartment. Nicer car. More subscriptions. This is called lifestyle inflation and it is why people earning six figures still live paycheck to paycheck. The more you make, the more you spend, and you never actually get ahead.',
        subheader: 'When you get a raise, keep living like you did before. Bank the difference. Invest the difference. Let your income grow while your expenses stay flat. That gap between income and spending is where wealth is built.',
        badge: 'Rich is not how much you earn. It is how much you keep.',
        cta: 'Have you fallen into lifestyle inflation? Be honest. Follow for smart money moves.',
        introHighlight: 'Keeping more money',
        headlineHighlight: 'lifestyle inflation',
        subheaderHighlight: 'Bank the difference',
        badgeHighlight: 'how much you keep',
      },
      {
        title: 'Financial Literacy Is Freedom',
        intro: 'They did not teach you about money in school. That was on purpose.',
        headline: 'The system is designed to produce good employees, not financially free people. They teach you algebra but not how to file taxes. They teach you history but not how to build credit. They teach you to work for money but not how to make money work for you. Financial illiteracy is the most expensive problem you will ever have.',
        subheader: 'Take your financial education into your own hands. Read one book about money every month. Learn about taxes, investing, credit, and cash flow. The knowledge is free. The cost of ignorance is everything.',
        badge: 'Financial literacy is not optional. It is the difference between freedom and chains.',
        cta: 'What money book changed your life? Drop it below. Follow for financial education.',
        introHighlight: 'on purpose',
        headlineHighlight: 'make money work for you',
        subheaderHighlight: 'one book about money',
        badgeHighlight: 'freedom and chains',
      },
      {
        title: 'Emergency Fund First',
        intro: 'Without an emergency fund, you are always one bad month away from disaster.',
        headline: 'Before you invest, before you start a business, before you do anything, build a three to six month emergency fund. This is your financial foundation. It is what keeps you from spiraling into debt when the car breaks down, when you lose your job, or when life happens. And life always happens.',
        subheader: 'Start small. Save one month of expenses first. Then two. Then three. Keep it in a high-yield savings account where it is accessible but separate from your spending money. This is your peace of mind fund.',
        badge: 'An emergency fund is not a luxury. It is the foundation of financial sanity.',
        cta: 'How many months of expenses do you have saved? No shame, just awareness. Follow for money basics.',
        introHighlight: 'one bad month',
        headlineHighlight: 'three to six month',
        subheaderHighlight: 'Start small',
        badgeHighlight: 'financial sanity',
      },
      {
        title: 'Your Income Is Your Most Powerful Wealth Tool',
        intro: 'Your earning potential is the most important financial asset you have.',
        headline: 'Everyone talks about investing and cutting expenses. But the fastest way to build wealth is to dramatically increase your income. A penny saved is a penny earned, but a dollar earned has unlimited upside. Negotiate that raise. Get that certification. Start that side business. Every dollar of additional income accelerates your wealth building exponentially.',
        subheader: 'Focus eighty percent of your energy on earning more and twenty percent on spending less. You can only cut so many expenses, but there is no ceiling on what you can earn.',
        badge: 'Frugality has a floor. Income has no ceiling. Focus on the ceiling.',
        cta: 'What is your income growth plan this year? Share below. Follow for wealth acceleration.',
        introHighlight: 'most important financial asset',
        headlineHighlight: 'dramatically increase your income',
        subheaderHighlight: 'eighty percent',
        badgeHighlight: 'no ceiling',
      },
      {
        title: 'Generational Wealth Starts With You',
        intro: 'You might be the first in your family to build wealth. Let the chain start with you.',
        headline: 'Generational wealth is not about leaving a pile of money. It is about leaving financial knowledge, habits, and systems. Teach your children about investing at age ten. Show them how compound interest works. Let them see you budget, invest, and build. The greatest inheritance is not a check. It is a blueprint.',
        subheader: 'Even if nobody taught you about money, you can teach the next generation. Break the cycle of financial illiteracy. Be the first domino that changes your family tree forever.',
        badge: 'You are not just building wealth for yourself. You are building a legacy.',
        cta: 'Are you the first wealth builder in your family? Share your journey. Follow for generational thinking.',
        introHighlight: 'chain start with you',
        headlineHighlight: 'financial knowledge, habits, and systems',
        subheaderHighlight: 'Break the cycle',
        badgeHighlight: 'building a legacy',
      },
    ],
  },
];

// ──────────────────────────────────────────────
// GENERATION
// ──────────────────────────────────────────────

function formatTextForScene(text: string): string {
  // Break long text into 2-3 lines for visual readability on screen
  const words = text.split(/\s+/);
  if (words.length <= 6) return text;
  const mid = Math.ceil(words.length / 2);
  return words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
}

function generatePost(themeIdx: number, postIdx: number, theme: ThemeDef): { script: ScriptPost; splits: SplitsJson } {
  const globalIdx = themeIdx * 10 + postIdx;
  const postNum = String(globalIdx + 1).padStart(3, '0');
  const postId = `mot-${postNum}`;
  const post = theme.posts[postIdx];

  const accentIdx = globalIdx % ACCENT_COLORS.length;
  const accent = ACCENT_COLORS[accentIdx];

  const sections: Section[] = [
    { key: 'intro', text: post.intro, audioFile: `${postId}/intro.wav` },
    { key: 'headline', text: post.headline, audioFile: `${postId}/headline.wav` },
    { key: 'subheader', text: post.subheader, audioFile: `${postId}/subheader.wav` },
    { key: 'badge', text: post.badge, audioFile: `${postId}/badge.wav` },
    { key: 'cta', text: post.cta, audioFile: `${postId}/cta.wav` },
  ];

  const fullScript = sections.map((s) => s.text).join(' ');

  const script: ScriptPost = {
    postId,
    template: 'motivational-narration',
    theme: theme.id,
    title: post.title,
    sections,
    fullScript,
    audioDir: `audio/${postId}`,
  };

  // Build scenes for motivational-narration template
  const scenes: SceneProps[] = [
    {
      text: formatTextForScene(post.intro),
      highlight: post.introHighlight,
      entrance: ENTRANCES[0],
      textSize: 56,
    },
    {
      text: formatTextForScene(post.headline),
      highlight: post.headlineHighlight,
      entrance: ENTRANCES[1 % ENTRANCES.length],
      textSize: 44,
      subtextSize: 24,
    },
    {
      text: formatTextForScene(post.subheader),
      highlight: post.subheaderHighlight,
      entrance: ENTRANCES[2 % ENTRANCES.length],
      textSize: 48,
    },
    {
      text: formatTextForScene(post.badge),
      highlight: post.badgeHighlight,
      entrance: ENTRANCES[3 % ENTRANCES.length],
      textSize: 52,
    },
    {
      text: formatTextForScene(post.cta),
      entrance: ENTRANCES[4 % ENTRANCES.length],
      textSize: 40,
      subtextSize: 26,
    },
  ];

  // Rotate entrance animations per post for variety
  const entranceOffset = globalIdx % ENTRANCES.length;
  for (let i = 0; i < scenes.length; i++) {
    scenes[i].entrance = ENTRANCES[(i + entranceOffset) % ENTRANCES.length];
  }

  const splits: SplitsJson = {
    segments: sections.map((s) => ({ key: s.key, start: 0, end: 0 })),
    props: {
      scenes,
      title: 'YOUR LAST DOLLAR',
      accentColor: accent.color,
      bgGradient: accent.bg,
    },
  };

  return { script, splits };
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[i + 1], 10);
    if (args[i] === '--dry-run') dryRun = true;
  }

  const AUDIO_DIR = path.join(__dirname, 'audio');
  const SCRIPTS_FILE = path.join(__dirname, 'scripts-motivational.json');

  console.log('═══════════════════════════════════════════════');
  console.log('  MOTIVATIONAL CONTENT GENERATOR');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Themes:     ${THEMES.length}`);
  console.log(`  Posts/theme: 10`);
  console.log(`  Total:      ${THEMES.length * 10}`);
  console.log(`  Limit:      ${limit === Infinity ? 'none' : limit}`);
  console.log(`  Mode:       ${dryRun ? 'dry-run (preview only)' : 'generate'}`);
  console.log('═══════════════════════════════════════════════\n');

  const allScripts: ScriptPost[] = [];
  let count = 0;

  for (let t = 0; t < THEMES.length; t++) {
    const theme = THEMES[t];
    console.log(`  [${theme.name}] (${theme.id})`);

    for (let p = 0; p < theme.posts.length; p++) {
      if (count >= limit) break;

      const { script, splits } = generatePost(t, p, theme);
      allScripts.push(script);

      const wordCount = script.fullScript.split(/\s+/).length;
      const estDuration = Math.round(wordCount / 2.5); // ~2.5 words/sec speaking pace
      console.log(`    ${script.postId}: "${script.title}" (${wordCount} words, ~${estDuration}s)`);

      if (dryRun) {
        count++;
        continue;
      }

      // Write splits.json for this post
      const postAudioDir = path.join(AUDIO_DIR, script.postId);
      fs.mkdirSync(postAudioDir, { recursive: true });
      fs.writeFileSync(
        path.join(postAudioDir, 'splits.json'),
        JSON.stringify(splits, null, 2),
      );

      count++;
    }

    if (count >= limit) break;
  }

  if (!dryRun) {
    // Write scripts file for Colab TTS
    fs.writeFileSync(SCRIPTS_FILE, JSON.stringify(allScripts, null, 2));
    console.log(`\n  Scripts:     ${SCRIPTS_FILE}`);
    console.log(`  Audio dirs:  ${AUDIO_DIR}/mot-XXX/splits.json`);
  }

  const totalWords = allScripts.reduce((sum, s) => sum + s.fullScript.split(/\s+/).length, 0);
  const estTotalMin = Math.round(totalWords / 2.5 / 60);

  console.log('\n═══════════════════════════════════════════════');
  console.log('  GENERATION COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Posts generated:  ${count}`);
  console.log(`  Total words:      ${totalWords.toLocaleString()}`);
  console.log(`  Est. audio:       ~${estTotalMin} minutes`);
  if (!dryRun) {
    console.log('\n  Next steps:');
    console.log('  1. Upload scripts-motivational.json to Google Colab');
    console.log('  2. Generate TTS audio (Qwen3, Les Brown voice)');
    console.log('  3. Upload full.wav files to MinIO: motivational/mot-XXX/full.wav');
    console.log('  4. Run: npx tsx content/batch-render-motivational.ts --resume');
  }
  console.log('═══════════════════════════════════════════════');
}

main();
