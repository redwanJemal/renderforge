#!/usr/bin/env npx tsx
/**
 * Content Plan Generator for "Your Last Dollar" channel
 * Generates 240 posts (4/day × 60 days) with varied templates & themes
 *
 * Content pillars:
 *   1. Hustle & Startup (build from nothing)
 *   2. Money & Finance (smart money moves)
 *   3. Tech & Tools (leverage technology)
 *   4. Mindset & Motivation (mental game)
 *   5. Side Hustles (income streams)
 *   6. Real Stories (failures, lessons, wins)
 */

import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────

interface Post {
  id: string;           // e.g. "day01-post1"
  day: number;
  postNum: number;      // 1-4
  date: string;         // ISO date
  pillar: string;
  template: 'slider' | 'yld-intro';
  caption: string;      // social media caption with hashtags
  props: Record<string, any>;
}

// ──────────────────────────────────────────────
// THEME PALETTES (rotate for visual variety)
// ──────────────────────────────────────────────

const themes = [
  { name: 'emerald', accent: '#22c55e', secondary: '#06b6d4', bg: ['#0a2e1a', '#071a10', '#020a05'] as [string, string, string] },
  { name: 'gold', accent: '#D4AF37', secondary: '#F59E0B', bg: ['#1a1500', '#0f0d00', '#050400'] as [string, string, string] },
  { name: 'crimson', accent: '#ef4444', secondary: '#f97316', bg: ['#2a0a0a', '#180505', '#0a0202'] as [string, string, string] },
  { name: 'violet', accent: '#8b5cf6', secondary: '#a855f7', bg: ['#1a0a2e', '#0d0518', '#05020a'] as [string, string, string] },
  { name: 'cyan', accent: '#06b6d4', secondary: '#22d3ee', bg: ['#0a1e2e', '#051218', '#020a0f'] as [string, string, string] },
  { name: 'rose', accent: '#f43f5e', secondary: '#fb7185', bg: ['#2a0a14', '#180510', '#0a0208'] as [string, string, string] },
  { name: 'amber', accent: '#f59e0b', secondary: '#fbbf24', bg: ['#1a1200', '#0f0b00', '#050400'] as [string, string, string] },
  { name: 'teal', accent: '#14b8a6', secondary: '#2dd4bf', bg: ['#0a2420', '#051815', '#020a08'] as [string, string, string] },
];

// ──────────────────────────────────────────────
// CONTENT LIBRARY
// ──────────────────────────────────────────────

// Each entry: [headline/line2, subtext, highlight, pillar]
// For YLD: headline becomes header.line2, subtext becomes subheader.text
// For Slider: distributed across slides

interface SliderContent {
  pillar: string;
  caption: string;
  intro: { title: string; subtitle: string };
  slides: Array<{
    headline: string;
    subtext: string;
    highlight: string;
    tag: string;
  }>;
  outro: { text: string; subtext: string };
}

interface YLDContent {
  pillar: string;
  caption: string;
  line1: string;
  line2: string;
  highlight: string;
  subtext: string;
  badge: string;
  cta: string;
}

// ── YLD Intro Content (motivational, punchy) ──

const yldContent: YLDContent[] = [
  // HUSTLE & STARTUP
  { pillar: 'hustle', caption: 'Your last dollar could be the first dollar of your empire. 💰🔥 #yourlstdollar #startup #hustle #entrepreneur',
    line1: 'What would you build', line2: 'with your last dollar?', highlight: 'last dollar',
    subtext: 'Real engineers. Zero budget.\nBuilding from nothing to something.', badge: 'The Journey Begins', cta: 'FOLLOW THE JOURNEY →' },
  { pillar: 'hustle', caption: 'Everyone has excuses. Builders have results. 🏗️ #yourlstdollar #noexcuses #grind',
    line1: 'Stop making excuses', line2: 'Start making money', highlight: 'making money',
    subtext: 'The market doesn\'t care about\nyour comfort zone.', badge: 'Wake Up Call', cta: 'START TODAY →' },
  { pillar: 'hustle', caption: 'Your network is your net worth. Build it before you need it. 🤝 #networking #startup',
    line1: 'Your network is', line2: 'your net worth', highlight: 'net worth',
    subtext: 'One connection can change\nthe entire trajectory of your business.', badge: 'Build Connections', cta: 'CONNECT NOW →' },
  { pillar: 'hustle', caption: 'The grind doesn\'t stop because it\'s hard. That\'s when it starts. 💪 #grindset #hustle',
    line1: 'The grind doesn\'t stop', line2: 'when it gets hard', highlight: 'gets hard',
    subtext: 'That\'s actually when\nthe real work begins.', badge: 'Hard Truth', cta: 'KEEP PUSHING →' },
  { pillar: 'hustle', caption: 'Ship it broken. Fix it live. Perfect is the enemy of profit. 🚀 #shipfast #mvp',
    line1: 'Ship it now', line2: 'Perfect it later', highlight: 'Ship it now',
    subtext: 'Done is better than perfect.\nRevenue beats perfection.', badge: 'Ship Fast', cta: 'LAUNCH TODAY →' },
  { pillar: 'hustle', caption: 'Your first business will probably fail. Your fifth won\'t. Keep going. 🔄 #resilience',
    line1: 'Your first business', line2: 'will probably fail', highlight: 'probably fail',
    subtext: 'And that\'s completely okay.\nFailure is your tuition.', badge: 'Real Talk', cta: 'TRY AGAIN →' },
  { pillar: 'hustle', caption: 'Employees dream on weekends. Entrepreneurs dream every single day. 🌟 #entrepreneurlife',
    line1: 'Dream every day', line2: 'not just weekends', highlight: 'every day',
    subtext: 'When your work is your passion,\nMonday feels like Saturday.', badge: 'Mindset Shift', cta: 'START DREAMING →' },
  { pillar: 'hustle', caption: 'Nobody is coming to save you. That\'s your superpower. ⚡ #selfmade #motivation',
    line1: 'Nobody is coming', line2: 'to save you', highlight: 'save you',
    subtext: 'And once you realize that,\nyou become unstoppable.', badge: 'Self Made', cta: 'SAVE YOURSELF →' },
  { pillar: 'hustle', caption: 'Build the business that makes your younger self proud. 🏆 #legacy #entrepreneur',
    line1: 'Build something that', line2: 'makes you proud', highlight: 'proud',
    subtext: 'Not for the money. Not for the fame.\nFor the person you\'re becoming.', badge: 'Legacy', cta: 'BUILD IT →' },
  { pillar: 'hustle', caption: 'Rich people build assets. Poor people build liabilities. Choose wisely. 📊 #wealth',
    line1: 'Build assets', line2: 'not liabilities', highlight: 'assets',
    subtext: 'Every dollar should work for you,\nnot the other way around.', badge: 'Wealth Rule', cta: 'BUILD ASSETS →' },
  { pillar: 'hustle', caption: '99% won\'t start. Of those who do, 99% quit. Be the 1% of 1%. 🎯 #discipline',
    line1: 'Be the one percent', line2: 'who never quits', highlight: 'never quits',
    subtext: 'Most people quit right before\nthe breakthrough happens.', badge: '1% Club', cta: 'JOIN THE 1% →' },
  { pillar: 'hustle', caption: 'Your comfort zone is where dreams go to die. Get out. 🔥 #growthmindset',
    line1: 'Comfort zone is', line2: 'where dreams die', highlight: 'dreams die',
    subtext: 'Everything you want is on\nthe other side of fear.', badge: 'Truth Bomb', cta: 'BREAK FREE →' },

  // MONEY & FINANCE
  { pillar: 'money', caption: 'Broke is temporary. Poor is a mindset. Change your thinking, change your bank account. 💰 #moneymindset',
    line1: 'Broke is temporary', line2: 'poor is a mindset', highlight: 'mindset',
    subtext: 'Your bank account reflects\nyour beliefs about money.', badge: 'Money Truth', cta: 'CHANGE YOUR MIND →' },
  { pillar: 'money', caption: 'Multiple income streams isn\'t a luxury. It\'s survival. 💸 #passiveincome #wealth',
    line1: 'One income stream', line2: 'is a liability', highlight: 'liability',
    subtext: 'The wealthy don\'t depend\non a single paycheck.', badge: 'Income Rule', cta: 'DIVERSIFY NOW →' },
  { pillar: 'money', caption: 'Your salary is the bribe they give you to forget your dreams. 💼 #quityourjob',
    line1: 'Your salary is a bribe', line2: 'to forget your dreams', highlight: 'forget your dreams',
    subtext: 'Trading time for money\nis a losing game.', badge: 'Hard Pill', cta: 'WAKE UP →' },
  { pillar: 'money', caption: 'If you can\'t explain how you\'ll make money in one sentence, you don\'t have a business. 🎯 #business101',
    line1: 'One sentence', line2: 'to explain your revenue', highlight: 'One sentence',
    subtext: 'If your business model needs\na 50-page deck, it\'s broken.', badge: 'Clarity Test', cta: 'SIMPLIFY →' },
  { pillar: 'money', caption: 'Invest in yourself. The ROI is infinite. 📈 #selfinvestment #growth',
    line1: 'Invest in yourself', line2: 'the ROI is infinite', highlight: 'infinite',
    subtext: 'Skills, knowledge, health.\nThe only assets that always appreciate.', badge: 'Best Investment', cta: 'INVEST NOW →' },
  { pillar: 'money', caption: 'Debt is slavery with a credit score. Break the chains. ⛓️ #debtfree #financialfreedom',
    line1: 'Debt is slavery', line2: 'with a credit score', highlight: 'slavery',
    subtext: 'The borrower is always\nservant to the lender.', badge: 'Freedom', cta: 'BREAK FREE →' },
  { pillar: 'money', caption: 'You don\'t need more money. You need a better strategy. 🧠 #financialstrategy',
    line1: 'You don\'t need more money', line2: 'you need better strategy', highlight: 'better strategy',
    subtext: 'The problem is rarely income.\nIt\'s always allocation.', badge: 'Strategy', cta: 'THINK SMARTER →' },
  { pillar: 'money', caption: 'Compound interest is the 8th wonder of the world. Start early. 📊 #investing',
    line1: 'Start investing today', line2: 'not tomorrow', highlight: 'today',
    subtext: 'Time in the market beats\ntiming the market. Always.', badge: 'Invest Early', cta: 'START NOW →' },

  // TECH & TOOLS
  { pillar: 'tech', caption: 'AI won\'t replace you. But someone using AI will. 🤖 #ai #futureofwork',
    line1: 'AI won\'t replace you', line2: 'but someone using AI will', highlight: 'using AI',
    subtext: 'The tools are free.\nThe question is: are you using them?', badge: 'AI Era', cta: 'ADAPT NOW →' },
  { pillar: 'tech', caption: 'Automate the boring stuff. Focus on what makes money. ⚙️ #automation #productivity',
    line1: 'Automate everything', line2: 'that doesn\'t need you', highlight: 'Automate',
    subtext: 'Your time is your most\nexpensive resource.', badge: 'Work Smart', cta: 'AUTOMATE →' },
  { pillar: 'tech', caption: 'The best time to learn to code was 10 years ago. The second best time is now. 💻 #coding',
    line1: 'Learn to code', line2: 'or get left behind', highlight: 'Learn to code',
    subtext: 'Every industry is becoming\na tech industry.', badge: 'Code Life', cta: 'START CODING →' },
  { pillar: 'tech', caption: 'One developer with AI can outperform a team of 10. This is the new reality. 🚀 #solopreneur',
    line1: 'One person with AI', line2: 'beats a team of ten', highlight: 'One person',
    subtext: 'The solo entrepreneur era\nhas officially arrived.', badge: 'New Reality', cta: 'GO SOLO →' },

  // MINDSET
  { pillar: 'mindset', caption: 'Your morning routine determines your yearly income. Fix it. ☀️ #morningroutine #success',
    line1: 'Fix your morning', line2: 'fix your income', highlight: 'Fix your morning',
    subtext: 'How you start your day\ndetermines how you finish your year.', badge: 'Morning Wins', cta: 'START RIGHT →' },
  { pillar: 'mindset', caption: 'Fear and excitement feel the same. Choose excitement. ⚡ #fearless #mindset',
    line1: 'Fear and excitement', line2: 'feel the same', highlight: 'feel the same',
    subtext: 'The only difference\nis your interpretation.', badge: 'Reframe It', cta: 'CHOOSE EXCITEMENT →' },
  { pillar: 'mindset', caption: 'Discipline > Motivation. Motivation fades. Discipline shows up daily. 🔥 #discipline',
    line1: 'Discipline beats', line2: 'motivation every time', highlight: 'Discipline',
    subtext: 'Motivation is a feeling.\nDiscipline is a decision.', badge: 'Daily Choice', cta: 'BE DISCIPLINED →' },
  { pillar: 'mindset', caption: 'You are the average of the 5 people you spend the most time with. Choose wisely. 👥 #innerCircle',
    line1: 'Choose your circle', line2: 'it becomes your ceiling', highlight: 'your ceiling',
    subtext: 'If you\'re the smartest in the room,\nyou\'re in the wrong room.', badge: 'Level Up', cta: 'CHOOSE WISELY →' },
  { pillar: 'mindset', caption: 'Overthinking is the art of creating problems that don\'t exist. 🧠 #stopoverthinking',
    line1: 'Stop overthinking', line2: 'start executing', highlight: 'start executing',
    subtext: 'Analysis paralysis has killed\nmore dreams than failure ever will.', badge: 'Just Do It', cta: 'EXECUTE NOW →' },
  { pillar: 'mindset', caption: 'The person who reads one book a month is more dangerous than someone with an MBA. 📚 #readmore',
    line1: 'Read more books', line2: 'build more wealth', highlight: 'Read more',
    subtext: 'Knowledge compounds faster\nthan any investment.', badge: 'Read Daily', cta: 'START READING →' },
  { pillar: 'mindset', caption: 'Success is rented, not owned. The rent is due every single day. 🏆 #consistency',
    line1: 'Success is rented', line2: 'the rent is due daily', highlight: 'rented',
    subtext: 'You can\'t coast on yesterday\'s\nwork and expect tomorrow\'s results.', badge: 'Pay The Rent', cta: 'SHOW UP DAILY →' },

  // SIDE HUSTLES
  { pillar: 'sidehustle', caption: 'Your 9-5 pays bills. Your 5-9 builds empires. 🌙 #sidehustle #empire',
    line1: 'Your 5 to 9', line2: 'builds your empire', highlight: 'empire',
    subtext: 'The hours after work are\nthe hours that change your life.', badge: 'After Hours', cta: 'BUILD TONIGHT →' },
  { pillar: 'sidehustle', caption: 'You don\'t need a million dollar idea. You need a $1 idea done a million times. 🎯 #smallwins',
    line1: 'Small wins compound', line2: 'into empires', highlight: 'compound',
    subtext: 'A $10/day side hustle\nis $3,650/year. Start there.', badge: 'Start Small', cta: 'BEGIN NOW →' },
  { pillar: 'sidehustle', caption: 'Sell your skills before you sell a product. Skills = instant revenue. 💡 #freelance',
    line1: 'Sell your skills', line2: 'before your product', highlight: 'skills',
    subtext: 'Freelancing funds your startup.\nDon\'t skip this step.', badge: 'Smart Move', cta: 'START SELLING →' },

  // REAL STORIES / LESSONS
  { pillar: 'stories', caption: 'Apple started in a garage. Amazon started with books. You can start with your phone. 📱 #startsmall',
    line1: 'Apple started', line2: 'in a garage', highlight: 'garage',
    subtext: 'Every billion-dollar company\nstarted as a crazy idea.', badge: 'Humble Beginnings', cta: 'START SOMEWHERE →' },
  { pillar: 'stories', caption: 'Elon Musk slept in his office. Bezos packed boxes. Greatness demands sacrifice. 🔥 #sacrifice',
    line1: 'Greatness demands', line2: 'sacrifice', highlight: 'sacrifice',
    subtext: 'What you\'re not willing to give up\ndetermines what you\'ll never get.', badge: 'The Price', cta: 'PAY THE PRICE →' },
  { pillar: 'stories', caption: 'Walt Disney was fired for lacking imagination. Your critics mean nothing. 🎨 #believeinyourself',
    line1: 'Your critics don\'t', line2: 'define your destiny', highlight: 'destiny',
    subtext: 'Walt Disney was fired for\n"lacking imagination." Look at him now.', badge: 'Prove Them Wrong', cta: 'KEEP GOING →' },
  { pillar: 'stories', caption: 'Rejection is redirection. Every "no" brings you closer to the right "yes." ✅ #rejection',
    line1: 'Every no brings you', line2: 'closer to yes', highlight: 'closer to yes',
    subtext: 'J.K. Rowling was rejected 12 times.\nNow she\'s a billionaire.', badge: 'Keep Knocking', cta: 'NEVER STOP →' },
];

// ── Slider Content (educational, list-based) ──

const sliderContent: SliderContent[] = [
  // HUSTLE & STARTUP
  { pillar: 'hustle', caption: '5 businesses you can start with $0 today. No excuses. 🚀 #yourlstdollar #zerotoone #startup',
    intro: { title: 'Your Last Dollar', subtitle: 'Zero Budget Businesses' },
    slides: [
      { headline: 'Freelance\nYour Skills', subtext: 'Writing, design, coding, marketing — someone will pay for what you already know.', highlight: 'Skills', tag: '01' },
      { headline: 'Content\nCreation', subtext: 'TikTok, YouTube, Instagram — build an audience and monetize with zero investment.', highlight: 'Content', tag: '02' },
      { headline: 'Dropshipping\nWith Print-on-Demand', subtext: 'No inventory. No upfront cost. Sell custom products without touching a single item.', highlight: 'Dropshipping', tag: '03' },
      { headline: 'Digital\nProducts', subtext: 'eBooks, templates, courses — create once, sell forever. Pure profit after day one.', highlight: 'Digital', tag: '04' },
    ],
    outro: { text: 'Pick One & Start Today', subtext: '@yourlstdollar' },
  },
  { pillar: 'hustle', caption: 'The 4 stages every startup goes through. Which one are you in? 📊 #startuplife #entrepreneur',
    intro: { title: 'Your Last Dollar', subtitle: 'Startup Stages' },
    slides: [
      { headline: 'The Idea\nPhase', subtext: 'Everyone has ideas. Most people stop here. Don\'t be most people.', highlight: 'Idea', tag: 'STAGE 1' },
      { headline: 'The Grind\nPhase', subtext: 'No revenue, no sleep, no validation. This is where 90% quit.', highlight: 'Grind', tag: 'STAGE 2' },
      { headline: 'The Growth\nPhase', subtext: 'First customers, first revenue, first hope. It\'s working.', highlight: 'Growth', tag: 'STAGE 3' },
      { headline: 'The Scale\nPhase', subtext: 'Systems, team, automation. From surviving to thriving.', highlight: 'Scale', tag: 'STAGE 4' },
    ],
    outro: { text: 'Keep Climbing', subtext: '@yourlstdollar' },
  },
  { pillar: 'hustle', caption: '4 mistakes that kill startups before they launch 💀 Learn from others\' failures #startup #mistakes',
    intro: { title: 'Your Last Dollar', subtitle: 'Startup Killers' },
    slides: [
      { headline: 'Building Without\nValidation', subtext: 'You spent 6 months building something nobody wants. Talk to customers first.', highlight: 'Without', tag: 'MISTAKE 1' },
      { headline: 'Chasing\nPerfection', subtext: 'Your V1 should embarrass you. If it doesn\'t, you launched too late.', highlight: 'Perfection', tag: 'MISTAKE 2' },
      { headline: 'Ignoring\nCash Flow', subtext: 'Revenue is vanity. Profit is sanity. Cash flow is reality.', highlight: 'Cash Flow', tag: 'MISTAKE 3' },
      { headline: 'Scaling\nToo Early', subtext: 'Hiring before product-market fit is like pouring gas on a fire that isn\'t lit.', highlight: 'Too Early', tag: 'MISTAKE 4' },
    ],
    outro: { text: 'Avoid These. Win Faster.', subtext: '@yourlstdollar' },
  },
  { pillar: 'hustle', caption: 'How to validate your business idea in 48 hours ⏰ #validation #leanstartup #yourlstdollar',
    intro: { title: 'Your Last Dollar', subtitle: '48-Hour Validation' },
    slides: [
      { headline: 'Hour 1-6\nResearch', subtext: 'Google Trends, Reddit, Twitter. Find where people are complaining about the problem you solve.', highlight: 'Research', tag: 'STEP 1' },
      { headline: 'Hour 6-12\nLanding Page', subtext: 'Build a simple page with Carrd or Notion. Describe your solution. Add a signup form.', highlight: 'Landing Page', tag: 'STEP 2' },
      { headline: 'Hour 12-36\nDrive Traffic', subtext: 'Post in communities, run a $20 ad, DM 50 potential customers. Get real eyeballs.', highlight: 'Traffic', tag: 'STEP 3' },
      { headline: 'Hour 36-48\nAnalyze', subtext: '50+ signups = green light. 10-50 = pivot needed. Under 10 = next idea.', highlight: 'Analyze', tag: 'STEP 4' },
    ],
    outro: { text: 'Stop Planning. Start Testing.', subtext: '@yourlstdollar' },
  },
  { pillar: 'hustle', caption: 'The one-person business playbook 🎯 You don\'t need a team to make 6 figures #solopreneur',
    intro: { title: 'Your Last Dollar', subtitle: 'Solo Empire' },
    slides: [
      { headline: 'Pick One\nSkill', subtext: 'Writing, design, code, marketing. Master one thing and become the go-to person.', highlight: 'One', tag: 'RULE 1' },
      { headline: 'Build In\nPublic', subtext: 'Share your journey. Document everything. Your process is your marketing.', highlight: 'Public', tag: 'RULE 2' },
      { headline: 'Productize\nYourself', subtext: 'Turn your service into a product. Templates, courses, tools. Sell while you sleep.', highlight: 'Productize', tag: 'RULE 3' },
      { headline: 'Automate\nEverything', subtext: 'Email sequences, scheduling, invoicing. If a robot can do it, let the robot do it.', highlight: 'Automate', tag: 'RULE 4' },
    ],
    outro: { text: 'One Person. Unlimited Income.', subtext: '@yourlstdollar' },
  },
  { pillar: 'hustle', caption: '4 signs your business idea is actually worth pursuing ✅ #businessidea #validation',
    intro: { title: 'Your Last Dollar', subtitle: 'Idea Checklist' },
    slides: [
      { headline: 'People Already\nPay For It', subtext: 'If competitors exist, there\'s a market. Competition = validation.', highlight: 'Already', tag: 'SIGN 1' },
      { headline: 'You Can Explain\nIt In 10 Words', subtext: 'If your idea needs a 30-minute pitch, it\'s too complicated. Simplify.', highlight: '10 Words', tag: 'SIGN 2' },
      { headline: 'It Solves A\nBurning Problem', subtext: 'Painkillers sell. Vitamins don\'t. Solve urgent, painful problems.', highlight: 'Burning', tag: 'SIGN 3' },
      { headline: 'You\'d Use\nIt Yourself', subtext: 'Build for yourself first. You understand the problem deeply.', highlight: 'Yourself', tag: 'SIGN 4' },
    ],
    outro: { text: 'Got All 4? Build It.', subtext: '@yourlstdollar' },
  },

  // MONEY & FINANCE
  { pillar: 'money', caption: '4 money rules they don\'t teach in school 💰 Save this! #moneyrules #financialliteracy',
    intro: { title: 'Your Last Dollar', subtitle: 'Money Rules' },
    slides: [
      { headline: 'Pay Yourself\nFirst', subtext: 'Before rent, before food, before fun — save 20%. Non-negotiable.', highlight: 'First', tag: 'RULE 1' },
      { headline: 'Never Trade\nTime For Money', subtext: 'Build assets that earn while you sleep. Hourly rates have a ceiling.', highlight: 'Never', tag: 'RULE 2' },
      { headline: 'Live Below\nYour Means', subtext: 'Earn like a CEO, spend like a student. The gap is your wealth.', highlight: 'Below', tag: 'RULE 3' },
      { headline: 'Invest The\nDifference', subtext: 'Stocks, real estate, your own business. Make every dollar an employee.', highlight: 'Invest', tag: 'RULE 4' },
    ],
    outro: { text: 'Master Money. Master Life.', subtext: '@yourlstdollar' },
  },
  { pillar: 'money', caption: 'How to build 7 income streams from scratch 💸 The wealthy aren\'t lucky, they\'re strategic #incomestreams',
    intro: { title: 'Your Last Dollar', subtitle: 'Income Streams' },
    slides: [
      { headline: 'Active Income\nYour Day Job', subtext: 'This funds everything else. Don\'t quit it yet — optimize it.', highlight: 'Active', tag: 'STREAM 1' },
      { headline: 'Freelance\nSide Income', subtext: 'Use your skills after hours. Even $500/month changes everything.', highlight: 'Freelance', tag: 'STREAM 2' },
      { headline: 'Digital Products\nPassive Sales', subtext: 'Templates, eBooks, courses. Build once, sell infinitely.', highlight: 'Passive', tag: 'STREAM 3' },
      { headline: 'Investments\nCompound Growth', subtext: 'Index funds, dividend stocks, crypto. Let math make you rich.', highlight: 'Compound', tag: 'STREAM 4' },
    ],
    outro: { text: 'Stack Your Streams', subtext: '@yourlstdollar' },
  },
  { pillar: 'money', caption: 'The 50/30/20 budget rule that actually works 📊 #budgeting #personalfinance #moneytips',
    intro: { title: 'Your Last Dollar', subtitle: 'Budget Blueprint' },
    slides: [
      { headline: '50% Goes To\nNeeds', subtext: 'Rent, food, utilities, transport. The non-negotiables that keep you alive.', highlight: '50%', tag: 'NEEDS' },
      { headline: '30% Goes To\nWants', subtext: 'Entertainment, dining out, shopping. Enjoy life, but within limits.', highlight: '30%', tag: 'WANTS' },
      { headline: '20% Goes To\nSavings', subtext: 'Emergency fund first, then investments. This 20% builds your future.', highlight: '20%', tag: 'SAVINGS' },
      { headline: 'The Secret?\nAutomate It', subtext: 'Set up auto-transfers on payday. Remove willpower from the equation.', highlight: 'Automate', tag: 'PRO TIP' },
    ],
    outro: { text: 'Budget = Freedom', subtext: '@yourlstdollar' },
  },
  { pillar: 'money', caption: '4 ways the rich think differently about money 🧠 It\'s not what you earn, it\'s how you think #richmindset',
    intro: { title: 'Your Last Dollar', subtitle: 'Rich Mindset' },
    slides: [
      { headline: 'They Buy\nAssets', subtext: 'While the poor buy liabilities that look like assets. Know the difference.', highlight: 'Assets', tag: 'MINDSET 1' },
      { headline: 'They Use\nDebt Wisely', subtext: 'Good debt makes money. Bad debt takes money. Leverage is a tool, not a trap.', highlight: 'Wisely', tag: 'MINDSET 2' },
      { headline: 'They Think\nIn Decades', subtext: 'Poor think in days. Middle class in months. Rich think in 10-year blocks.', highlight: 'Decades', tag: 'MINDSET 3' },
      { headline: 'They Invest In\nKnowledge First', subtext: 'Before buying stocks, they buy books. Education has the highest ROI.', highlight: 'Knowledge', tag: 'MINDSET 4' },
    ],
    outro: { text: 'Think Rich. Become Rich.', subtext: '@yourlstdollar' },
  },

  // TECH & TOOLS
  { pillar: 'tech', caption: '4 free AI tools that replace expensive software 🤖 Save thousands per year #aitools #freetool',
    intro: { title: 'Your Last Dollar', subtitle: 'Free AI Tools' },
    slides: [
      { headline: 'ChatGPT\nReplaces Copywriters', subtext: 'Emails, ads, social posts — write anything in seconds. Free tier is enough.', highlight: 'ChatGPT', tag: 'TOOL 1' },
      { headline: 'Canva AI\nReplaces Designers', subtext: 'Logos, social graphics, presentations. Professional design without Photoshop skills.', highlight: 'Canva', tag: 'TOOL 2' },
      { headline: 'Notion AI\nReplaces PMs', subtext: 'Project management, docs, wikis — all in one. Your entire business brain.', highlight: 'Notion', tag: 'TOOL 3' },
      { headline: 'CapCut\nReplaces Editors', subtext: 'Professional video editing with AI captions, effects, transitions. 100% free.', highlight: 'CapCut', tag: 'TOOL 4' },
    ],
    outro: { text: 'Work Smarter. Spend Less.', subtext: '@yourlstdollar' },
  },
  { pillar: 'tech', caption: '4 AI side hustles you can start today with zero experience 💰🤖 #aisidehustle #makemoneyonline',
    intro: { title: 'Your Last Dollar', subtitle: 'AI Side Hustles' },
    slides: [
      { headline: 'AI Content\nWriting Agency', subtext: 'Use ChatGPT to write blogs, newsletters, social posts. Charge $500-2000/client.', highlight: 'Writing', tag: 'HUSTLE 1' },
      { headline: 'AI Thumbnail\nDesign Service', subtext: 'Midjourney + Canva = unlimited thumbnails. YouTubers pay $50-100 each.', highlight: 'Thumbnail', tag: 'HUSTLE 2' },
      { headline: 'AI Video\nCreation', subtext: 'Faceless YouTube channels, TikTok content, client videos. Tools do the heavy lifting.', highlight: 'Video', tag: 'HUSTLE 3' },
      { headline: 'AI Chatbot\nDevelopment', subtext: 'Build custom chatbots for businesses. No coding needed. Charge $1000+ per bot.', highlight: 'Chatbot', tag: 'HUSTLE 4' },
    ],
    outro: { text: 'AI Is Your Employee', subtext: '@yourlstdollar' },
  },
  { pillar: 'tech', caption: 'The tech stack that runs a million-dollar one-person business 💻 All under $100/month #techstack',
    intro: { title: 'Your Last Dollar', subtitle: 'Solo Tech Stack' },
    slides: [
      { headline: 'Notion\nFor Operations', subtext: 'CRM, project management, content calendar, SOPs. One tool to rule them all.', highlight: 'Notion', tag: 'OPS' },
      { headline: 'Stripe\nFor Payments', subtext: 'Accept payments globally. Subscriptions, one-time, invoices. Zero setup cost.', highlight: 'Stripe', tag: 'MONEY' },
      { headline: 'ConvertKit\nFor Email', subtext: 'Your email list is your real asset. Own your audience. Never depend on algorithms.', highlight: 'ConvertKit', tag: 'EMAIL' },
      { headline: 'Vercel\nFor Hosting', subtext: 'Ship websites in minutes. Free tier handles insane traffic. Zero DevOps needed.', highlight: 'Vercel', tag: 'WEB' },
    ],
    outro: { text: 'Simple Stack. Serious Money.', subtext: '@yourlstdollar' },
  },

  // MINDSET
  { pillar: 'mindset', caption: '4 habits of highly successful people 🏆 Copy these and watch your life change #successhabits #dailyroutine',
    intro: { title: 'Your Last Dollar', subtitle: 'Success Habits' },
    slides: [
      { headline: 'Wake Up\nBefore 6 AM', subtext: 'The world is quiet. Your mind is fresh. This is when empires are planned.', highlight: '6 AM', tag: 'HABIT 1' },
      { headline: 'Read 30 Min\nEvery Day', subtext: 'Books are compressed decades of experience. 30 min/day = 20+ books/year.', highlight: '30 Min', tag: 'HABIT 2' },
      { headline: 'Exercise\nDaily', subtext: 'Your body is your business vehicle. A broken vehicle can\'t carry you to success.', highlight: 'Exercise', tag: 'HABIT 3' },
      { headline: 'Review Your\nGoals Nightly', subtext: 'What worked? What didn\'t? Course correct daily. Winners audit themselves.', highlight: 'Goals', tag: 'HABIT 4' },
    ],
    outro: { text: 'Habits Build Fortunes', subtext: '@yourlstdollar' },
  },
  { pillar: 'mindset', caption: '4 toxic beliefs keeping you broke 🚫 Which ones do you still hold? #toxicbeliefs #mindsetshift',
    intro: { title: 'Your Last Dollar', subtitle: 'Toxic Beliefs' },
    slides: [
      { headline: 'Money Is\nThe Root Of Evil', subtext: 'Wrong. Poverty is. Money is a tool. Good people with money do great things.', highlight: 'Evil', tag: 'LIE 1' },
      { headline: 'Rich People\nAre Lucky', subtext: 'Luck = preparation meeting opportunity. They prepared. You can too.', highlight: 'Lucky', tag: 'LIE 2' },
      { headline: 'I\'m Not Smart\nEnough', subtext: 'Most billionaires aren\'t geniuses. They\'re persistent. IQ matters less than you think.', highlight: 'Smart', tag: 'LIE 3' },
      { headline: 'I Don\'t Have\nEnough Time', subtext: 'You have the same 24 hours as Elon Musk. It\'s not time. It\'s priorities.', highlight: 'Time', tag: 'LIE 4' },
    ],
    outro: { text: 'Delete These. Level Up.', subtext: '@yourlstdollar' },
  },
  { pillar: 'mindset', caption: 'The 4 types of time that determine your wealth ⏰ Most people waste 3 of them #timemanagement',
    intro: { title: 'Your Last Dollar', subtitle: 'Time = Money' },
    slides: [
      { headline: 'Creation\nTime', subtext: 'Building products, writing content, coding features. This is where value is born.', highlight: 'Creation', tag: 'TYPE 1' },
      { headline: 'Connection\nTime', subtext: 'Networking, partnerships, mentors. One relationship can 10x your business.', highlight: 'Connection', tag: 'TYPE 2' },
      { headline: 'Consumption\nTime', subtext: 'Learning, reading, courses. Investment in yourself. But don\'t get stuck here.', highlight: 'Consumption', tag: 'TYPE 3' },
      { headline: 'Wasted\nTime', subtext: 'Scrolling, Netflix, drama. Zero ROI. Reduce this ruthlessly.', highlight: 'Wasted', tag: 'TYPE 4' },
    ],
    outro: { text: 'Audit Your 24 Hours', subtext: '@yourlstdollar' },
  },

  // SIDE HUSTLES
  { pillar: 'sidehustle', caption: '4 side hustles that can make $1000/month with 2 hours/day ⏰💰 #sidehustle #extraincome',
    intro: { title: 'Your Last Dollar', subtitle: '$1K Side Hustles' },
    slides: [
      { headline: 'Social Media\nManagement', subtext: 'Local businesses need help posting. $300-500/client. 3 clients = $1000+.', highlight: 'Social Media', tag: '$1K HUSTLE' },
      { headline: 'Online\nTutoring', subtext: 'Math, English, coding — platforms like Preply pay $15-60/hour. 2 hours/day adds up.', highlight: 'Tutoring', tag: '$1K HUSTLE' },
      { headline: 'Copywriting\nFor Businesses', subtext: 'Emails, landing pages, ads. Learn in 2 weeks. Earn in week 3.', highlight: 'Copywriting', tag: '$1K HUSTLE' },
      { headline: 'Print On\nDemand', subtext: 'Design t-shirts, mugs, posters. Platforms handle printing and shipping. Pure profit.', highlight: 'Print', tag: '$1K HUSTLE' },
    ],
    outro: { text: 'Start This Week', subtext: '@yourlstdollar' },
  },
  { pillar: 'sidehustle', caption: 'How to make your first $100 online in the next 7 days 💵 Step by step #makemoneyonline #firstdollar',
    intro: { title: 'Your Last Dollar', subtitle: 'First $100 Online' },
    slides: [
      { headline: 'Day 1-2\nList Your Skills', subtext: 'Writing, design, data entry, translation — you know more than you think.', highlight: 'Skills', tag: 'STEP 1' },
      { headline: 'Day 2-3\nCreate Profiles', subtext: 'Fiverr, Upwork, PeoplePerHour. Set up profiles with clear offers.', highlight: 'Profiles', tag: 'STEP 2' },
      { headline: 'Day 3-5\nSend 50 Proposals', subtext: 'Apply to everything matching your skills. Volume beats perfection at the start.', highlight: '50', tag: 'STEP 3' },
      { headline: 'Day 5-7\nDeliver & Collect', subtext: 'Overdeliver on your first gig. Get a 5-star review. The snowball starts.', highlight: 'Deliver', tag: 'STEP 4' },
    ],
    outro: { text: '$100 Is Just The Start', subtext: '@yourlstdollar' },
  },

  // REAL STORIES
  { pillar: 'stories', caption: 'Businesses that started with literally $0 and became billion-dollar empires 🏆 #zerotoone #inspiration',
    intro: { title: 'Your Last Dollar', subtitle: '$0 To Billions' },
    slides: [
      { headline: 'WhatsApp\n$0 Marketing Budget', subtext: 'Built by 2 engineers. No ads. No marketing team. Just an insanely useful product.', highlight: 'WhatsApp', tag: '$19B EXIT' },
      { headline: 'Mailchimp\nBootstrapped 20 Years', subtext: 'Never took VC money. Grew to $12B on pure revenue. Patience pays.', highlight: 'Mailchimp', tag: '$12B EXIT' },
      { headline: 'Spanx\n$5,000 Savings', subtext: 'Sara Blakely started with savings and a fax machine. Now a billionaire.', highlight: 'Spanx', tag: '$1.2B' },
      { headline: 'Craigslist\nOne Person', subtext: 'Craig Newmark built it alone. Still runs with ~50 employees. Revenue: $1B+.', highlight: 'Craigslist', tag: '$1B+' },
    ],
    outro: { text: 'Your Turn. Start Now.', subtext: '@yourlstdollar' },
  },
  { pillar: 'stories', caption: 'Famous failures before success 🔄 Your setback is your setup #nevergiveup #resilience',
    intro: { title: 'Your Last Dollar', subtitle: 'Famous Failures' },
    slides: [
      { headline: 'Steve Jobs\nFired From Apple', subtext: 'Built Apple, got fired, came back, made it the most valuable company on Earth.', highlight: 'Jobs', tag: 'LESSON' },
      { headline: 'Oprah Winfrey\nFired From TV', subtext: 'Told she was "unfit for television." Built a $2.5B media empire.', highlight: 'Oprah', tag: 'LESSON' },
      { headline: 'Jack Ma\nRejected 30+ Times', subtext: 'Rejected by KFC, Harvard (10x), and 30 VCs. Built Alibaba anyway.', highlight: 'Jack Ma', tag: 'LESSON' },
      { headline: 'Colonel Sanders\nRejected 1,009 Times', subtext: 'Started KFC at age 65 after 1,009 rejections. It\'s never too late.', highlight: 'Sanders', tag: 'LESSON' },
    ],
    outro: { text: 'Failure Is Fuel', subtext: '@yourlstdollar' },
  },

  // MORE SLIDER CONTENT FOR VARIETY
  { pillar: 'hustle', caption: '4 things to do BEFORE quitting your job to start a business 📋 #quitjob #entrepreneur',
    intro: { title: 'Your Last Dollar', subtitle: 'Before You Quit' },
    slides: [
      { headline: '6 Months Of\nExpenses Saved', subtext: 'Runway matters. Desperation leads to bad decisions. Have a safety net.', highlight: '6 Months', tag: 'STEP 1' },
      { headline: 'Validate Your\nIdea First', subtext: 'Get paying customers BEFORE you quit. If it works part-time, it\'ll work full-time.', highlight: 'Validate', tag: 'STEP 2' },
      { headline: 'Build Your\nNetwork', subtext: 'Mentors, advisors, potential clients. Your network is your insurance policy.', highlight: 'Network', tag: 'STEP 3' },
      { headline: 'Have A\nPlan B', subtext: 'Not because you\'ll fail — but because knowing you can pivot gives you confidence.', highlight: 'Plan B', tag: 'STEP 4' },
    ],
    outro: { text: 'Quit Smart. Not Emotional.', subtext: '@yourlstdollar' },
  },
  { pillar: 'money', caption: 'The wealth ladder: 4 levels from broke to financially free 📈 Where are you? #wealthladder #financialfreedom',
    intro: { title: 'Your Last Dollar', subtitle: 'Wealth Ladder' },
    slides: [
      { headline: 'Level 1\nSurvival', subtext: 'Paycheck to paycheck. No savings. One emergency away from disaster.', highlight: 'Survival', tag: 'LEVEL 1' },
      { headline: 'Level 2\nStability', subtext: '3-6 months saved. Bills on autopay. You can breathe, but you\'re not free.', highlight: 'Stability', tag: 'LEVEL 2' },
      { headline: 'Level 3\nGrowth', subtext: 'Investing regularly. Side income flowing. Money starts working for you.', highlight: 'Growth', tag: 'LEVEL 3' },
      { headline: 'Level 4\nFreedom', subtext: 'Passive income > expenses. Work becomes optional. You choose what to do with your time.', highlight: 'Freedom', tag: 'LEVEL 4' },
    ],
    outro: { text: 'Climb The Ladder', subtext: '@yourlstdollar' },
  },
  { pillar: 'tech', caption: 'How to build a personal brand online in 2026 🎯 Step by step guide #personalbrand #contentcreator',
    intro: { title: 'Your Last Dollar', subtitle: 'Brand Building 101' },
    slides: [
      { headline: 'Pick Your\nNiche', subtext: 'Finance? Tech? Fitness? Go narrow. "Fitness for busy dads" beats "fitness tips."', highlight: 'Niche', tag: 'STEP 1' },
      { headline: 'Choose 2\nPlatforms', subtext: 'Don\'t be everywhere. Master TikTok + LinkedIn, or YouTube + Instagram.', highlight: '2', tag: 'STEP 2' },
      { headline: 'Post Daily\nFor 90 Days', subtext: 'Consistency beats quality early on. You improve by shipping, not by planning.', highlight: 'Daily', tag: 'STEP 3' },
      { headline: 'Engage\nRelentlessly', subtext: 'Reply to every comment. DM 10 creators daily. Community > content.', highlight: 'Engage', tag: 'STEP 4' },
    ],
    outro: { text: 'Your Brand = Your Future', subtext: '@yourlstdollar' },
  },
  { pillar: 'mindset', caption: 'The Stoic principles that billionaires live by 🏛️ Ancient wisdom, modern wealth #stoicism #mindset',
    intro: { title: 'Your Last Dollar', subtitle: 'Stoic Wealth' },
    slides: [
      { headline: 'Control What\nYou Can', subtext: 'Markets crash. Clients ghost. Focus only on your effort and response.', highlight: 'Control', tag: 'PRINCIPLE 1' },
      { headline: 'Embrace\nDiscomfort', subtext: 'Cold showers. Hard conversations. Difficult tasks first. Comfort is the enemy.', highlight: 'Discomfort', tag: 'PRINCIPLE 2' },
      { headline: 'Memento Mori\nRemember Death', subtext: 'Time is finite. This urgency drives action. Every day counts.', highlight: 'Memento', tag: 'PRINCIPLE 3' },
      { headline: 'Amor Fati\nLove Your Fate', subtext: 'Good or bad, everything is fuel. Obstacles become the way.', highlight: 'Amor Fati', tag: 'PRINCIPLE 4' },
    ],
    outro: { text: 'Think Like A Stoic', subtext: '@yourlstdollar' },
  },

  // Additional content to reach 240 posts
  { pillar: 'hustle', caption: 'The 4 types of businesses ranked by difficulty 📊 #businesstypes #entrepreneur',
    intro: { title: 'Your Last Dollar', subtitle: 'Business Types' },
    slides: [
      { headline: 'Service\nBusiness', subtext: 'Easiest to start. Trade skills for money. Consulting, freelancing, agencies.', highlight: 'Service', tag: 'EASIEST' },
      { headline: 'Digital\nProducts', subtext: 'Medium difficulty. Build once, sell forever. Courses, templates, SaaS.', highlight: 'Digital', tag: 'MEDIUM' },
      { headline: 'E-Commerce\nPhysical Products', subtext: 'Harder. Inventory, shipping, returns. But massive scale potential.', highlight: 'E-Commerce', tag: 'HARDER' },
      { headline: 'Deep Tech\nStartup', subtext: 'Hardest. Requires funding, team, time. But the biggest potential payoff.', highlight: 'Deep Tech', tag: 'HARDEST' },
    ],
    outro: { text: 'Start Where You Are', subtext: '@yourlstdollar' },
  },
  { pillar: 'money', caption: '4 things billionaires do with their mornings that you don\'t ☀️ #morningroutine #billionairehabits',
    intro: { title: 'Your Last Dollar', subtitle: 'Billionaire Mornings' },
    slides: [
      { headline: 'No Phone\nFirst Hour', subtext: 'Your morning sets the tone. Don\'t let other people\'s priorities hijack your day.', highlight: 'No Phone', tag: 'HABIT 1' },
      { headline: 'Move Your\nBody', subtext: 'Exercise isn\'t optional. It\'s fuel for decisions worth millions.', highlight: 'Move', tag: 'HABIT 2' },
      { headline: 'Review\nPriorities', subtext: 'Top 3 tasks. Nothing else matters until these are done.', highlight: 'Priorities', tag: 'HABIT 3' },
      { headline: 'Learn\nSomething New', subtext: '15 minutes of reading. Podcasts while commuting. Compound knowledge daily.', highlight: 'Learn', tag: 'HABIT 4' },
    ],
    outro: { text: 'Win The Morning', subtext: '@yourlstdollar' },
  },
  { pillar: 'sidehustle', caption: '4 digital products you can create THIS weekend and sell on Monday 🛒 #digitalproducts #passiveincome',
    intro: { title: 'Your Last Dollar', subtitle: 'Weekend Products' },
    slides: [
      { headline: 'Notion\nTemplates', subtext: 'Budget trackers, habit trackers, CRM templates. Sell for $5-29 on Gumroad.', highlight: 'Notion', tag: 'PRODUCT 1' },
      { headline: 'Social Media\nTemplate Pack', subtext: 'Canva templates for Instagram stories or posts. Bundle 50 for $19-49.', highlight: 'Social Media', tag: 'PRODUCT 2' },
      { headline: 'Mini Course\nor Guide', subtext: 'Record a 30-minute walkthrough of something you know. Sell for $29-97.', highlight: 'Course', tag: 'PRODUCT 3' },
      { headline: 'Prompt\nPacks', subtext: 'ChatGPT/Midjourney prompt libraries for specific niches. Sell for $9-29.', highlight: 'Prompt', tag: 'PRODUCT 4' },
    ],
    outro: { text: 'Build This Weekend', subtext: '@yourlstdollar' },
  },
  { pillar: 'stories', caption: 'How a 22-year-old turned $100 into a million-dollar brand 📱 The playbook is repeatable #successstory',
    intro: { title: 'Your Last Dollar', subtitle: '$100 → $1M' },
    slides: [
      { headline: 'Step 1\nLearned A Skill', subtext: 'Spent $100 on a copywriting course. Practiced daily for 30 days.', highlight: 'Skill', tag: 'THE START' },
      { headline: 'Step 2\nFirst Clients', subtext: 'Offered free work to 5 businesses. 3 became paying clients at $500/month.', highlight: 'Clients', tag: 'MONTH 2' },
      { headline: 'Step 3\nBuilt An Agency', subtext: 'Hired freelancers. Charged $2000/client. Kept the margin. 20 clients.', highlight: 'Agency', tag: 'MONTH 6' },
      { headline: 'Step 4\nProductized', subtext: 'Turned processes into a SaaS tool. Recurring revenue. $80K/month.', highlight: 'Productized', tag: 'YEAR 2' },
    ],
    outro: { text: 'Your $100 Story Starts Now', subtext: '@yourlstdollar' },
  },
  { pillar: 'tech', caption: 'The future of work in 2026: 4 trends you can\'t ignore 🌍 #futureofwork #ai #remotework',
    intro: { title: 'Your Last Dollar', subtitle: 'Future of Work' },
    slides: [
      { headline: 'AI Agents\nReplace Teams', subtext: 'One person with AI tools can do what 5-person teams did in 2023.', highlight: 'AI Agents', tag: 'TREND 1' },
      { headline: 'Remote First\nIs Default', subtext: 'Offices are optional. Talent is global. Location is irrelevant.', highlight: 'Remote', tag: 'TREND 2' },
      { headline: 'Skills Over\nDegrees', subtext: 'Nobody cares where you went to school. They care what you can build.', highlight: 'Skills', tag: 'TREND 3' },
      { headline: 'Creator Economy\nExplodes', subtext: '100M+ creators by 2027. Your personal brand IS your career insurance.', highlight: 'Creator', tag: 'TREND 4' },
    ],
    outro: { text: 'Adapt Or Get Left Behind', subtext: '@yourlstdollar' },
  },
  { pillar: 'mindset', caption: '4 questions to ask yourself every Sunday night 📝 Weekly reset for winners #weeklyreview #productivity',
    intro: { title: 'Your Last Dollar', subtitle: 'Sunday Reset' },
    slides: [
      { headline: 'What Worked\nThis Week?', subtext: 'Double down on wins. If something got results, do more of it.', highlight: 'Worked', tag: 'QUESTION 1' },
      { headline: 'What Did I\nWaste Time On?', subtext: 'Be brutally honest. Cut the activities with zero ROI.', highlight: 'Waste', tag: 'QUESTION 2' },
      { headline: 'What\'s My\n#1 Priority?', subtext: 'One thing. Not five. What single task would make everything else easier?', highlight: '#1', tag: 'QUESTION 3' },
      { headline: 'Am I On Track\nFor My Goals?', subtext: 'Monthly goals → weekly milestones → daily tasks. Stay aligned.', highlight: 'On Track', tag: 'QUESTION 4' },
    ],
    outro: { text: 'Review. Reset. Dominate.', subtext: '@yourlstdollar' },
  },
  { pillar: 'hustle', caption: 'How to price your services like a pro 💰 Stop undercharging! #pricing #freelance',
    intro: { title: 'Your Last Dollar', subtitle: 'Pricing Strategy' },
    slides: [
      { headline: 'Never Charge\nBy The Hour', subtext: 'Charge by value delivered. A logo worth $100K shouldn\'t cost $50/hour.', highlight: 'Never', tag: 'RULE 1' },
      { headline: 'Anchor High\nThen Offer Options', subtext: 'Premium ($5K), Standard ($2K), Basic ($800). Most pick the middle.', highlight: 'Anchor', tag: 'RULE 2' },
      { headline: 'Raise Prices\nEvery 3 Months', subtext: 'If nobody says "that\'s expensive," you\'re too cheap. Test the ceiling.', highlight: 'Raise', tag: 'RULE 3' },
      { headline: 'Package\nEverything', subtext: 'Don\'t sell tasks. Sell outcomes. "I\'ll grow your Instagram" > "I\'ll make posts."', highlight: 'Package', tag: 'RULE 4' },
    ],
    outro: { text: 'Charge What You\'re Worth', subtext: '@yourlstdollar' },
  },
  { pillar: 'money', caption: 'Emergency fund 101: Why you\'re one crisis away from broke 🚨 #emergencyfund #financialsafety',
    intro: { title: 'Your Last Dollar', subtitle: 'Emergency Fund' },
    slides: [
      { headline: 'Start With\n$1,000', subtext: 'Before anything else. This covers most small emergencies. Start this week.', highlight: '$1,000', tag: 'STEP 1' },
      { headline: 'Build To\n3 Months', subtext: 'Cover rent, food, bills for 3 months. This is your "I won\'t panic" fund.', highlight: '3 Months', tag: 'STEP 2' },
      { headline: 'Goal: 6 Months\nOf Expenses', subtext: 'This is freedom. You can take risks, quit toxic jobs, start businesses.', highlight: '6 Months', tag: 'STEP 3' },
      { headline: 'Keep It\nSeparate', subtext: 'Different bank account. Out of sight, out of mind. Never touch it for wants.', highlight: 'Separate', tag: 'PRO TIP' },
    ],
    outro: { text: 'Security = Freedom', subtext: '@yourlstdollar' },
  },
];

// ──────────────────────────────────────────────
// GENERATE PLAN
// ──────────────────────────────────────────────

function generatePlan(startDate: string): Post[] {
  const posts: Post[] = [];
  const start = new Date(startDate);

  let yldIdx = 0;
  let sliderIdx = 0;

  for (let day = 0; day < 60; day++) {
    const date = new Date(start);
    date.setDate(start.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];
    const dayNum = day + 1;
    const themeIdx = day % themes.length;
    const theme = themes[themeIdx];
    const altTheme = themes[(themeIdx + 3) % themes.length];

    // Post pattern per day: YLD, Slider, YLD, Slider
    for (let postNum = 1; postNum <= 4; postNum++) {
      const isYLD = postNum % 2 === 1; // posts 1,3 = YLD; 2,4 = Slider
      const id = `day${String(dayNum).padStart(2, '0')}-post${postNum}`;

      if (isYLD) {
        const content = yldContent[yldIdx % yldContent.length];
        const t = postNum === 1 ? theme : altTheme;
        yldIdx++;

        posts.push({
          id,
          day: dayNum,
          postNum,
          date: dateStr,
          pillar: content.pillar,
          template: 'yld-intro',
          caption: content.caption,
          props: {
            logo: {
              file: 'yld-logo-white.png',
              size: 480,
              glowEnabled: true,
              finalScale: 0.6,
              moveUpPx: 160,
              marginBottom: 15,
            },
            header: {
              line1: content.line1,
              line1Size: 40,
              line1Animation: ['charReveal', 'wordReveal', 'fadeIn', 'glitch'][yldIdx % 4],
              line2: content.line2,
              line2Size: 56,
              line2Animation: 'slideUp',
              highlight: content.highlight,
              marginBottom: 25,
            },
            subheader: {
              text: content.subtext,
              size: 30,
              animation: 'typewriter',
              marginBottom: 45,
            },
            badge: {
              text: content.badge,
              enabled: true,
              marginBottom: 0,
            },
            cta: {
              text: content.cta,
              enabled: true,
              bottomOffset: 150,
            },
            divider: { enabled: true, marginBottom: 30 },
            theme: {
              accentColor: t.accent,
              bgGradient: t.bg,
              particlesEnabled: true,
              scanLineEnabled: true,
              gridEnabled: dayNum % 3 !== 0,
              vignetteEnabled: true,
            },
            timing: {
              logoAppear: 20,
              logoMoveUp: 130,
              dividerAppear: 155,
              headerAppear: 165,
              subheaderAppear: 230,
              badgeAppear: 290,
              ctaAppear: 330,
            },
          },
        });
      } else {
        const content = sliderContent[sliderIdx % sliderContent.length];
        const t = postNum === 2 ? theme : altTheme;
        sliderIdx++;

        posts.push({
          id,
          day: dayNum,
          postNum,
          date: dateStr,
          pillar: content.pillar,
          template: 'slider',
          caption: content.caption,
          props: {
            logo: {
              file: 'yld-logo-white.png',
              logoIsUrl: false,
              size: 80,
              position: 'top-left',
              glowEnabled: true,
            },
            slides: content.slides.map((s) => ({
              ...s,
              imageUrl: '',
              imageIsLocal: false,
            })),
            framesPerSlide: 140,
            transition: ['slideLeft', 'slideUp', 'fade', 'zoom'][sliderIdx % 4],
            transitionFrames: 25,
            intro: {
              enabled: true,
              title: content.intro.title,
              subtitle: content.intro.subtitle,
              durationFrames: 70,
            },
            outro: {
              enabled: true,
              text: content.outro.text,
              subtext: content.outro.subtext,
              durationFrames: 80,
            },
            progress: {
              enabled: true,
              style: ['dots', 'bar', 'numbers'][sliderIdx % 3],
              position: 'bottom',
            },
            theme: {
              accentColor: t.accent,
              secondaryAccent: t.secondary,
              bgGradient: t.bg,
              particlesEnabled: true,
              scanLineEnabled: true,
              gridEnabled: dayNum % 2 === 0,
              vignetteEnabled: true,
              slideImageOverlay: 0.65,
            },
          },
        });
      }
    }
  }

  return posts;
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

const startDate = '2026-03-11'; // Tomorrow
const plan = generatePlan(startDate);

// Write the full plan
fs.writeFileSync(
  path.join(__dirname, 'content-plan.json'),
  JSON.stringify(plan, null, 2),
);

// Write summary
const summary = {
  totalPosts: plan.length,
  totalDays: 60,
  postsPerDay: 4,
  startDate,
  endDate: plan[plan.length - 1].date,
  templateBreakdown: {
    'yld-intro': plan.filter((p) => p.template === 'yld-intro').length,
    slider: plan.filter((p) => p.template === 'slider').length,
  },
  pillarBreakdown: plan.reduce(
    (acc, p) => {
      acc[p.pillar] = (acc[p.pillar] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  ),
  formatsPerPost: ['story (1080x1920)', 'landscape (1920x1080)', 'square (1080x1080)'],
  estimatedTotalVideos: plan.length * 3, // 3 formats per post
};

fs.writeFileSync(
  path.join(__dirname, 'content-summary.json'),
  JSON.stringify(summary, null, 2),
);

console.log('✅ Content plan generated!');
console.log(`   Posts: ${summary.totalPosts}`);
console.log(`   Date range: ${summary.startDate} → ${summary.endDate}`);
console.log(`   YLD Intro: ${summary.templateBreakdown['yld-intro']}`);
console.log(`   Slider: ${summary.templateBreakdown.slider}`);
console.log(`   Total videos (3 formats each): ${summary.estimatedTotalVideos}`);
console.log('\nPillar breakdown:');
Object.entries(summary.pillarBreakdown).forEach(([k, v]) =>
  console.log(`   ${k}: ${v} posts`),
);
