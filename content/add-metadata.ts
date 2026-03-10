#!/usr/bin/env npx tsx
/**
 * Adds title, description, and Dubai-targeted tags to content entries.
 * Run this to patch generate-plan.ts with metadata.
 */

import * as fs from 'fs';
import * as path from 'path';

// Dubai/UAE-targeted base tags that rotate based on pillar
const BASE_TAGS = ['yourlstdollar', 'dubai', 'uae', 'entrepreneur'];

const PILLAR_TAGS: Record<string, string[]> = {
  hustle: ['startup', 'hustle', 'business', 'dubailife', 'dubaientrepreneur', 'buildingempire', 'grindset', 'founderstory', 'startuplife', 'dubaibusiness'],
  money: ['money', 'financialfreedom', 'investing', 'wealthmindset', 'passiveincome', 'dubaifinance', 'moneytips', 'personalfinance', 'dubairealestate', 'wealthbuilding'],
  tech: ['tech', 'ai', 'aitools', 'automation', 'coding', 'dubaitech', 'futureofwork', 'digitalnomad', 'remotework', 'solopreneur'],
  mindset: ['mindset', 'motivation', 'discipline', 'success', 'growthmindset', 'selfimprovement', 'morningroutine', 'stoic', 'leveling', 'successhabits'],
  sidehustle: ['sidehustle', 'makemoneyonline', 'freelance', 'passiveincome', 'extraincome', 'onlinebusiness', 'digitalproducts', 'workfromhome', 'dubaihustle', 'incomestreams'],
  stories: ['successstory', 'inspiration', 'nevergiveup', 'resilience', 'billionaire', 'startupstory', 'failureislearning', 'entrepreneurlife', 'motivation', 'legacy'],
};

// YLD content: generate title/description from line1+line2+subtext
const yldMetadata: Array<{ title: string; description: string; extraTags: string[] }> = [
  // HUSTLE (12 entries)
  { title: 'What Would You Build With Your Last Dollar? 💰', description: 'If you only had one dollar left, what business would you start? Real engineers building real products with zero budget. The journey from nothing to something starts with a single decision. 🚀 Follow @yourlstdollar for daily entrepreneur motivation from Dubai.', extraTags: ['zerotoone', 'bootstrapped', 'lastdollar'] },
  { title: 'Stop Making Excuses, Start Making Money 🔥', description: 'The market doesn\'t care about your comfort zone. While you\'re making excuses, someone in Dubai is building the business you dreamed of. Results > excuses. Every single time.', extraTags: ['noexcuses', 'makemoney', 'results'] },
  { title: 'Your Network = Your Net Worth 🤝', description: 'In Dubai, one connection can change your entire trajectory. Stop scrolling and start connecting. Your next million-dollar opportunity is one handshake away.', extraTags: ['networking', 'connections', 'dubainetworking'] },
  { title: 'The Grind Gets Real When It Gets Hard 💪', description: 'Everyone hustles when it\'s easy. The real entrepreneurs in Dubai keep pushing when everything falls apart. That\'s when the magic happens.', extraTags: ['grindset', 'neverstop', 'hardwork'] },
  { title: 'Ship It Now. Perfect It Later 🚀', description: 'Done is better than perfect. The best startups in Dubai shipped broken V1s and fixed them live. Stop polishing, start launching.', extraTags: ['shipfast', 'mvp', 'leanstartup'] },
  { title: 'Your First Business Will Probably Fail ❌', description: 'And that\'s okay. Failure is your tuition in the Dubai business world. The first try teaches you everything the second try needs.', extraTags: ['failforward', 'resilience', 'startup'] },
  { title: 'Dream Every Day, Not Just Weekends 🌟', description: 'When your work is your passion, Monday feels like Saturday. Dubai entrepreneurs don\'t wait for the weekend — they build every single day.', extraTags: ['passion', 'dailygrind', 'entrepreneurlife'] },
  { title: 'Nobody Is Coming To Save You ⚡', description: 'Once you realize nobody is coming to save you, you become unstoppable. Self-made is the only way. Dubai rewards those who take action.', extraTags: ['selfmade', 'takeaction', 'unstoppable'] },
  { title: 'Build Something That Makes You Proud 🏆', description: 'Not for the money. Not for the fame. For the person you\'re becoming. Build a legacy from Dubai that your future self will thank you for.', extraTags: ['legacy', 'buildingempire', 'pride'] },
  { title: 'Build Assets, Not Liabilities 📊', description: 'Rich people build assets. Poor people build liabilities. Every dirham should work for you, not the other way around. Think like Dubai\'s top investors.', extraTags: ['assets', 'wealth', 'investing'] },
  { title: 'Be The 1% Who Never Quits 🎯', description: '99% won\'t start. Of those who do, 99% quit. Be the 1% of 1%. Most people quit right before the breakthrough. Don\'t be most people.', extraTags: ['1percent', 'persistence', 'winners'] },
  { title: 'Your Comfort Zone Is Where Dreams Die 💀', description: 'Everything you want is on the other side of fear. Dubai wasn\'t built by people who played it safe. Get uncomfortable. Get rich.', extraTags: ['comfortzone', 'fearless', 'growth'] },

  // MONEY (8 entries)
  { title: 'Broke Is Temporary. Poor Is A Mindset 🧠', description: 'Your bank account reflects your beliefs about money. Change your thinking, change your bank balance. The Dubai millionaire mindset starts here.', extraTags: ['moneymindset', 'broketomillionaire', 'beliefs'] },
  { title: 'One Income Stream Is A Liability 💸', description: 'The wealthy in Dubai don\'t depend on a single paycheck. Multiple income streams isn\'t luxury — it\'s survival in 2026.', extraTags: ['multipleincomes', 'diversify', 'streams'] },
  { title: 'Your Salary Is A Bribe To Forget Your Dreams 💼', description: 'Trading time for money is a losing game. While you collect a paycheck, Dubai entrepreneurs build machines that print money while they sleep.', extraTags: ['quityourjob', 'passiveincome', 'freedom'] },
  { title: 'Can You Explain Your Revenue In One Sentence? 🎯', description: 'If your business model needs a 50-page deck, it\'s broken. The best businesses in Dubai have crystal clear revenue models. Simplify or die.', extraTags: ['businessmodel', 'clarity', 'revenue'] },
  { title: 'Invest In Yourself — The ROI Is Infinite 📈', description: 'Skills, knowledge, health. The only assets that always appreciate. Dubai\'s top performers invest in themselves before anything else.', extraTags: ['selfinvestment', 'roi', 'selfimprovement'] },
  { title: 'Debt Is Slavery With A Credit Score ⛓️', description: 'The borrower is always servant to the lender. Break the chains. Financial freedom in Dubai starts with being debt-free.', extraTags: ['debtfree', 'financialfreedom', 'chains'] },
  { title: 'You Don\'t Need More Money — You Need Better Strategy 🧠', description: 'The problem is rarely income. It\'s always allocation. Smart money in Dubai isn\'t about earning more — it\'s about deploying better.', extraTags: ['strategy', 'smartmoney', 'allocation'] },
  { title: 'Start Investing Today, Not Tomorrow 📊', description: 'Time in the market beats timing the market. Always. Compound interest is the 8th wonder of the world. Dubai investors know this.', extraTags: ['investnow', 'compoundinterest', 'stocks'] },

  // TECH (4 entries)
  { title: 'AI Won\'t Replace You — But Someone Using AI Will 🤖', description: 'The tools are free. The question is: are you using them? Dubai\'s smartest entrepreneurs are leveraging AI right now. Don\'t get left behind.', extraTags: ['airevolution', 'futureproof', 'adapt'] },
  { title: 'Automate Everything That Doesn\'t Need You ⚙️', description: 'Your time is your most expensive resource. Dubai entrepreneurs automate the boring stuff and focus on what actually makes money.', extraTags: ['automation', 'productivity', 'systems'] },
  { title: 'Learn To Code Or Get Left Behind 💻', description: 'Every industry is becoming a tech industry. The developers in Dubai are building the future while everyone else watches.', extraTags: ['learntocode', 'developer', 'techskills'] },
  { title: 'One Person With AI Beats A Team Of Ten 🚀', description: 'The solo entrepreneur era has officially arrived. One person with the right AI tools can outperform entire departments. Welcome to 2026.', extraTags: ['solopreneur', 'aitools', 'onemanshow'] },

  // MINDSET (8 entries)
  { title: 'Fix Your Morning, Fix Your Income ☀️', description: 'How you start your day determines how you finish your year. Dubai\'s highest earners have morning routines that set them up to win.', extraTags: ['morningroutine', '5amclub', 'dailyhabits'] },
  { title: 'Fear And Excitement Feel Exactly The Same ⚡', description: 'The only difference is your interpretation. Next time you feel scared, reframe it. That butterfly feeling? It\'s excitement. Chase it.', extraTags: ['fearless', 'reframe', 'excitement'] },
  { title: 'Discipline Beats Motivation Every Single Time 🔥', description: 'Motivation is a feeling. Discipline is a decision. Dubai\'s most successful people don\'t wait to feel like it — they just show up.', extraTags: ['discipline', 'consistency', 'dailychoice'] },
  { title: 'Your Circle Is Your Ceiling 👥', description: 'If you\'re the smartest person in the room, you\'re in the wrong room. Dubai is full of rooms that will level you up. Find them.', extraTags: ['innercircle', 'levelup', 'surroundings'] },
  { title: 'Stop Overthinking. Start Executing 🧠', description: 'Analysis paralysis has killed more dreams than failure ever will. The best entrepreneurs in Dubai decide fast and correct later.', extraTags: ['execution', 'action', 'stopoverthinking'] },
  { title: 'Read More Books, Build More Wealth 📚', description: 'Knowledge compounds faster than any investment. One book per month makes you more dangerous than an MBA. Start reading today.', extraTags: ['readmore', 'bookclub', 'knowledge'] },
  { title: 'Success Is Rented — The Rent Is Due Daily 🏆', description: 'You can\'t coast on yesterday\'s work and expect tomorrow\'s results. In Dubai\'s competitive market, you show up daily or you fall behind.', extraTags: ['consistency', 'showup', 'dailyrent'] },

  // SIDE HUSTLES (3 entries)
  { title: 'Your 5-to-9 Builds Your Empire 🌙', description: 'Your 9-to-5 pays bills. Your 5-to-9 builds empires. The hours after work are the hours that change your life. Dubai side hustlers know this.', extraTags: ['afterhours', 'buildingempire', 'nighthustle'] },
  { title: 'Small Wins Compound Into Empires 🎯', description: 'You don\'t need a million dollar idea. You need a $1 idea done a million times. A $10/day side hustle is $3,650/year. Start there.', extraTags: ['smallwins', 'compound', 'startsmall'] },
  { title: 'Sell Your Skills Before Your Product 💡', description: 'Freelancing funds your startup. Don\'t skip this step. Dubai is full of businesses willing to pay for skills you already have.', extraTags: ['freelance', 'skills', 'servicesfirst'] },

  // STORIES (4 entries)
  { title: 'Apple Started In A Garage 📱', description: 'Apple started in a garage. Amazon started with books. You can start with your phone. Every billion-dollar company started as a crazy idea. Start yours from Dubai.', extraTags: ['startsmall', 'garagecompany', 'beginnings'] },
  { title: 'Greatness Demands Sacrifice 🔥', description: 'Elon Musk slept in his office. Bezos packed boxes. What you\'re not willing to give up determines what you\'ll never get. Pay the price.', extraTags: ['sacrifice', 'grind', 'paythe price'] },
  { title: 'Your Critics Don\'t Define Your Destiny 🎨', description: 'Walt Disney was fired for "lacking imagination." Your critics mean nothing. Prove them wrong from Dubai. Build what they said was impossible.', extraTags: ['provethemwrong', 'critics', 'believe'] },
  { title: 'Every "No" Brings You Closer To "Yes" ✅', description: 'J.K. Rowling was rejected 12 times. Now she\'s a billionaire. Rejection is redirection. Keep knocking. Dubai rewards persistence.', extraTags: ['rejection', 'persistence', 'keepgoing'] },
];

// Slider content: generate title/description from intro + slides
const sliderMetadata: Array<{ title: string; description: string; extraTags: string[] }> = [
  // HUSTLE (8 entries)
  { title: '5 Businesses You Can Start With $0 Today', description: 'No capital? No problem. Here are 5 proven businesses you can launch from Dubai with zero investment. Freelancing, content creation, dropshipping, digital products — pick one and start today. Follow @yourlstdollar for more zero-budget business ideas.', extraTags: ['zerocapital', 'startabusiness', 'freebusiness'] },
  { title: 'The 4 Stages Every Startup Goes Through', description: 'Idea → Grind → Growth → Scale. Which stage are you in? 90% quit at Stage 2. The entrepreneurs who survive the grind phase build empires from Dubai.', extraTags: ['startupstages', 'growth', 'scaling'] },
  { title: '4 Mistakes That Kill Startups Before Launch', description: 'Building without validation, chasing perfection, ignoring cash flow, scaling too early. These kill more Dubai startups than competition ever will. Avoid them.', extraTags: ['startupfail', 'mistakes', 'founders'] },
  { title: 'Validate Your Business Idea In 48 Hours', description: 'Stop planning for months. Research, build a landing page, drive traffic, analyze results — all in 48 hours. The lean startup playbook for Dubai entrepreneurs.', extraTags: ['validation', 'leanstartup', '48hours'] },
  { title: 'The One-Person Business Playbook', description: 'Pick one skill, build in public, productize yourself, automate everything. You don\'t need a team to make 6 figures from Dubai. One person. Unlimited income.', extraTags: ['solopreneur', 'oneperson', 'sixfigures'] },
  { title: '4 Signs Your Business Idea Is Worth Pursuing', description: 'People already pay for it, you can explain it in 10 words, it solves a burning problem, you\'d use it yourself. Got all 4? Build it in Dubai.', extraTags: ['ideavalidation', 'businessidea', 'checklist'] },
  { title: '4 Things To Do BEFORE Quitting Your Job', description: 'Save 6 months expenses, validate your idea, build your network, have a Plan B. Smart Dubai entrepreneurs don\'t quit emotional — they quit strategic.', extraTags: ['quitjob', 'preparation', 'smartquit'] },
  { title: '4 Types of Businesses Ranked By Difficulty', description: 'Service (easiest) → Digital Products → E-Commerce → Deep Tech (hardest). Start where you are with what you have. Dubai rewards action over ambition.', extraTags: ['businesstypes', 'difficulty', 'startups'] },

  // MONEY (6 entries)
  { title: '4 Money Rules They Don\'t Teach In School', description: 'Pay yourself first, never trade time for money, live below your means, invest the difference. The financial education Dubai\'s school system forgot.', extraTags: ['moneyrules', 'financialliteracy', 'schooldidntteach'] },
  { title: 'How To Build 7 Income Streams From Scratch', description: 'Active income, freelance, digital products, investments. The wealthy aren\'t lucky — they\'re strategic. Stack your streams from Dubai.', extraTags: ['incomestreams', '7streams', 'wealthbuilding'] },
  { title: 'The 50/30/20 Budget Rule That Actually Works', description: '50% needs, 30% wants, 20% savings. The secret? Automate it. Remove willpower from the equation. Budget = freedom for Dubai residents.', extraTags: ['budgeting', '503020', 'budgetrule'] },
  { title: '4 Ways The Rich Think Differently About Money', description: 'They buy assets, use debt wisely, think in decades, and invest in knowledge first. The Dubai millionaire mindset decoded.', extraTags: ['richmindset', 'thinkrich', 'wealthymindset'] },
  { title: 'The Wealth Ladder: 4 Levels From Broke To Free', description: 'Survival → Stability → Growth → Freedom. Where are you on the ladder? Most Dubai residents are stuck at Level 2. Here\'s how to climb.', extraTags: ['wealthladder', 'financialfreedom', 'levels'] },
  { title: 'Emergency Fund 101: Why You\'re One Crisis Away', description: 'Start with $1,000, build to 3 months, goal is 6 months. Keep it separate. Living in Dubai without an emergency fund is playing with fire.', extraTags: ['emergencyfund', 'savings', 'financialsafety'] },

  // TECH (4 entries)
  { title: '4 Free AI Tools That Replace Expensive Software', description: 'ChatGPT for copy, Canva AI for design, Notion AI for PM, CapCut for video. Save thousands per year. Dubai businesses are switching — are you?', extraTags: ['aitools', 'freetools', 'savemoney'] },
  { title: '4 AI Side Hustles You Can Start Today', description: 'AI content writing, thumbnail design, video creation, chatbot development. No experience needed. Dubai\'s AI economy is booming.', extraTags: ['aisidehustle', 'aiincome', 'makemoneyai'] },
  { title: 'The Tech Stack That Runs A Million-Dollar Solo Biz', description: 'Notion for ops, Stripe for payments, ConvertKit for email, Vercel for web. All under $100/month. Simple stack, serious money from Dubai.', extraTags: ['techstack', 'solostartup', 'tools'] },
  { title: 'How To Build A Personal Brand Online In 2026', description: 'Pick your niche, choose 2 platforms, post daily for 90 days, engage relentlessly. Your personal brand is your career insurance. Build it from Dubai.', extraTags: ['personalbrand', 'contentcreator', 'brandbuilding'] },

  // MINDSET (4 entries)
  { title: '4 Habits Of Highly Successful People', description: 'Wake up before 6AM, read 30 min daily, exercise daily, review goals nightly. Copy these habits and watch your life in Dubai transform.', extraTags: ['successhabits', 'dailyroutine', 'highperformance'] },
  { title: '4 Toxic Beliefs Keeping You Broke', description: 'Money is evil, rich people are lucky, I\'m not smart enough, I don\'t have time. Delete these beliefs. Dubai rewards those who believe they deserve more.', extraTags: ['toxicbeliefs', 'limitingbeliefs', 'mindsetshift'] },
  { title: 'The 4 Types of Time That Determine Your Wealth', description: 'Creation, connection, consumption, wasted. Most people waste 3 of them. Audit your 24 hours. Dubai\'s top earners create and connect.', extraTags: ['timemanagement', 'productivity', '24hours'] },
  { title: 'Stoic Principles That Billionaires Live By', description: 'Control what you can, embrace discomfort, memento mori, amor fati. Ancient wisdom meets modern wealth in Dubai.', extraTags: ['stoicism', 'ancientwisdom', 'principles'] },

  // SIDE HUSTLES (2 entries)
  { title: '4 Side Hustles That Can Make $1000/Month', description: 'Social media management, online tutoring, copywriting, print on demand. 2 hours/day from Dubai. Start this week, earn by next month.', extraTags: ['1kmonth', 'sideincome', '2hoursaday'] },
  { title: 'Make Your First $100 Online In 7 Days', description: 'List your skills, create profiles, send 50 proposals, deliver and collect. Step by step from zero to first dollar online. Dubai freelancers start here.', extraTags: ['first100', '7days', 'firstdollar'] },

  // STORIES (4 entries)
  { title: '$0 To Billions: Companies That Started With Nothing', description: 'WhatsApp ($0 marketing → $19B), Mailchimp (bootstrapped → $12B), Spanx ($5K → $1.2B), Craigslist (1 person → $1B+). Your turn. Start from Dubai.', extraTags: ['zerototobillions', 'bootstrapped', 'successstory'] },
  { title: 'Famous Failures Before Success', description: 'Steve Jobs fired from Apple. Oprah fired from TV. Jack Ma rejected 30+ times. Colonel Sanders rejected 1,009 times. Your setback is your setup.', extraTags: ['famousfailures', 'comeback', 'nevergiveup'] },
  { title: '$100 To $1M: The Playbook', description: 'Learn a skill ($100), get first clients, build an agency, productize into SaaS. A repeatable playbook for Dubai entrepreneurs.', extraTags: ['100to1m', 'playbook', 'growth'] },
  { title: 'The Future of Work in 2026: 4 Trends', description: 'AI agents replace teams, remote-first is default, skills over degrees, creator economy explodes. Adapt or get left behind in Dubai.', extraTags: ['futureofwork', '2026trends', 'adapt'] },

  // Additional (4 entries)
  { title: 'How To Price Your Services Like A Pro', description: 'Never charge hourly, anchor high with options, raise prices quarterly, package everything. Stop undercharging in Dubai\'s premium market.', extraTags: ['pricing', 'freelancepricing', 'chargemore'] },
  { title: 'Billionaire Morning Routine Breakdown', description: 'No phone first hour, move your body, review priorities, learn something new. Win the morning, win the day. Dubai\'s top performers swear by this.', extraTags: ['morningroutine', 'billionairehabits', 'winthemorning'] },
  { title: '4 Digital Products To Create This Weekend', description: 'Notion templates, social media packs, mini courses, prompt packs. Build Saturday, sell Monday. Pure profit from Dubai.', extraTags: ['digitalproducts', 'weekendproject', 'passiveincome'] },
  { title: '4 Questions For Your Sunday Night Reset', description: 'What worked? What wasted time? What\'s my #1 priority? Am I on track? Weekly review ritual for Dubai\'s most productive people.', extraTags: ['sundayreset', 'weeklyreview', 'productivity'] },
];

// ── Output verification
console.log(`YLD metadata entries: ${yldMetadata.length}`);
console.log(`Slider metadata entries: ${sliderMetadata.length}`);

// Write as JSON for the generator to import
fs.writeFileSync(
  path.join(__dirname, 'metadata-yld.json'),
  JSON.stringify(yldMetadata, null, 2),
);
fs.writeFileSync(
  path.join(__dirname, 'metadata-slider.json'),
  JSON.stringify(sliderMetadata, null, 2),
);

console.log('✅ Metadata files written: metadata-yld.json, metadata-slider.json');
