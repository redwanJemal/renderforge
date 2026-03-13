import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  Sequence,
} from 'remotion';

// ══════════════════════════════════════════════════════════════
// POST-MATCH RESULTS — Full-time results + page-by-page stats
// Page 1: Score + team logos
// Page 2: Key stats comparison
// Page 3: Man of the Match
// Page 4: Next fixture
// ══════════════════════════════════════════════════════════════

export interface MatchStat {
  label: string;
  home: number | string;
  away: number | string;
  isPercentage?: boolean;
}

export interface PostMatchProps {
  // Teams
  homeTeam: string;
  homeLogo: string;
  homeColor: string;
  homeScore: number;
  awayTeam: string;
  awayLogo: string;
  awayColor: string;
  awayScore: number;

  // Scorers
  homeScorers: string[];   // ["Saka 23'", "Havertz 67'"]
  awayScorers: string[];

  // Match info
  competition: string;
  competitionLogo: string;
  venue: string;
  date: string;

  // Stats (page 2)
  stats: MatchStat[];

  // Man of the match (page 3)
  motmName: string;
  motmImage: string;
  motmTeam: string;
  motmRating: string;
  motmStats: string[];     // ["2 Goals", "89% Pass Acc", "3 Key Passes"]

  // Next fixture (page 4)
  nextOpponent: string;
  nextOpponentLogo: string;
  nextDate: string;
  nextCompetition: string;

  // Branding
  logoUrl: string;
  logoSize: number;

  // Theme
  theme: {
    bgColor: string;
    cardBg: string;
    accentColor: string;
    textColor: string;
    mutedColor: string;
    statBarColor: string;
  };
}

export const defaultPostMatchProps: PostMatchProps = {
  homeTeam: 'ARSENAL',
  homeLogo: 'https://placehold.co/300x300/EF0107/ffffff?text=ARS',
  homeColor: '#EF0107',
  homeScore: 3,
  awayTeam: 'MAN CITY',
  awayLogo: 'https://placehold.co/300x300/6CABDD/ffffff?text=MCI',
  awayColor: '#6CABDD',
  awayScore: 1,

  homeScorers: ["Saka 23'", "Havertz 45'+2", "Ødegaard 78'"],
  awayScorers: ["Haaland 55'"],

  competition: 'PREMIER LEAGUE',
  competitionLogo: 'https://placehold.co/150x150/3d195b/ffffff?text=PL',
  venue: 'Emirates Stadium',
  date: 'SAT 8 FEB 2025',

  stats: [
    { label: 'Possession', home: 58, away: 42, isPercentage: true },
    { label: 'Shots', home: 18, away: 9 },
    { label: 'Shots on Target', home: 8, away: 3 },
    { label: 'Passes', home: 542, away: 387 },
    { label: 'Pass Accuracy', home: 89, away: 82, isPercentage: true },
    { label: 'Corners', home: 7, away: 3 },
  ],

  motmName: 'BUKAYO SAKA',
  motmImage: 'https://placehold.co/400x500/EF0107/ffffff?text=SAKA',
  motmTeam: 'Arsenal',
  motmRating: '9.2',
  motmStats: ['1 Goal', '2 Assists', '4 Key Passes', '91% Pass Accuracy'],

  nextOpponent: 'ASTON VILLA',
  nextOpponentLogo: 'https://placehold.co/200x200/670E36/ffffff?text=AVL',
  nextDate: 'TUE 11 FEB • 20:00',
  nextCompetition: 'Premier League',

  logoUrl: 'https://placehold.co/200x200/3d195b/ffffff?text=SN',
  logoSize: 50,

  theme: {
    bgColor: '#0a0a14',
    cardBg: '#12121e',
    accentColor: '#c4a43e',
    textColor: '#ffffff',
    mutedColor: 'rgba(255,255,255,0.45)',
    statBarColor: '#1a1a2e',
  },
};

// ══════════════════════════════════════════════════════════════
// PAGE COMPONENTS
// ══════════════════════════════════════════════════════════════

const font = 'SF Pro Display, -apple-system, Helvetica Neue, sans-serif';

// Page transition wrapper
const PageTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
}> = ({ children, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const enterY = interpolate(
    spring({ frame, fps, config: { damping: 14, stiffness: 60, mass: 0.8 } }),
    [0, 1], [40, 0]
  );
  const exitOpacity = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{
      opacity: enterOpacity * exitOpacity,
      transform: `translateY(${enterY}px)`,
    }}>
      {children}
    </AbsoluteFill>
  );
};

// Page 1: Score
const ScorePage: React.FC<{
  p: PostMatchProps;
  pageDuration: number;
}> = ({ p, pageDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Score counter animation
  const scoreDelay = 25;
  const scoreFrame = Math.max(0, frame - scoreDelay);
  const homeScoreDisplay = Math.min(p.homeScore, Math.floor(interpolate(scoreFrame, [0, 20], [0, p.homeScore + 0.9], { extrapolateRight: 'clamp' })));
  const awayScoreDisplay = Math.min(p.awayScore, Math.floor(interpolate(scoreFrame, [0, 20], [0, p.awayScore + 0.9], { extrapolateRight: 'clamp' })));

  const scoreSpring = spring({
    frame: scoreFrame,
    fps,
    config: { damping: 8, stiffness: 150, mass: 0.5 },
  });

  const scorersDelay = 50;
  const scorersOpacity = interpolate(frame, [scorersDelay, scorersDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <PageTransition durationInFrames={pageDuration}>
      <AbsoluteFill style={{
        background: `linear-gradient(180deg, ${p.theme.bgColor}, ${p.theme.cardBg})`,
      }}>
        {/* FULL TIME label */}
        <div style={{
          position: 'absolute', top: 250, left: 0, right: 0,
          textAlign: 'center',
        }}>
          <span style={{
            fontFamily: font, fontSize: 32, fontWeight: 700,
            color: p.theme.accentColor, letterSpacing: '0.4em',
          }}>
            FULL TIME
          </span>
        </div>

        {/* Competition */}
        <div style={{
          position: 'absolute', top: 300, left: 0, right: 0,
          textAlign: 'center',
        }}>
          <span style={{
            fontFamily: font, fontSize: 24, fontWeight: 500,
            color: p.theme.mutedColor, letterSpacing: '0.2em',
          }}>
            {p.competition}
          </span>
        </div>

        {/* Logos + Score */}
        <div style={{
          position: 'absolute', top: 450, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 40,
        }}>
          {/* Home logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <Img src={p.homeLogo} style={{ width: 180, height: 180, objectFit: 'contain' }}
              onError={() => {}} />
            <span style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: p.theme.textColor }}>
              {p.homeTeam}
            </span>
          </div>

          {/* Score */}
          <div style={{
            transform: `scale(${scoreSpring})`,
            display: 'flex', alignItems: 'center', gap: 20,
            padding: '0 20px',
          }}>
            <span style={{
              fontFamily: font, fontSize: 120, fontWeight: 900,
              color: p.homeScore > p.awayScore ? p.theme.textColor : p.theme.mutedColor,
              textShadow: p.homeScore > p.awayScore ? `0 0 30px ${p.homeColor}60` : 'none',
            }}>
              {homeScoreDisplay}
            </span>
            <span style={{
              fontFamily: font, fontSize: 60, fontWeight: 300,
              color: p.theme.mutedColor,
            }}>
              –
            </span>
            <span style={{
              fontFamily: font, fontSize: 120, fontWeight: 900,
              color: p.awayScore > p.homeScore ? p.theme.textColor : p.theme.mutedColor,
              textShadow: p.awayScore > p.homeScore ? `0 0 30px ${p.awayColor}60` : 'none',
            }}>
              {awayScoreDisplay}
            </span>
          </div>

          {/* Away logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <Img src={p.awayLogo} style={{ width: 180, height: 180, objectFit: 'contain' }}
              onError={() => {}} />
            <span style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: p.theme.textColor }}>
              {p.awayTeam}
            </span>
          </div>
        </div>

        {/* Scorers */}
        <div style={{
          position: 'absolute', top: 850, left: 80, right: 80,
          display: 'flex', justifyContent: 'space-between',
          opacity: scorersOpacity,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {p.homeScorers.map((s, i) => (
              <span key={i} style={{ fontFamily: font, fontSize: 26, color: p.theme.textColor, opacity: 0.8 }}>
                ⚽ {s}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            {p.awayScorers.map((s, i) => (
              <span key={i} style={{ fontFamily: font, fontSize: 26, color: p.theme.textColor, opacity: 0.8 }}>
                {s} ⚽
              </span>
            ))}
          </div>
        </div>

        {/* Venue + Date */}
        <div style={{
          position: 'absolute', bottom: 200, left: 0, right: 0,
          textAlign: 'center', opacity: scorersOpacity * 0.5,
        }}>
          <div style={{ fontFamily: font, fontSize: 22, color: p.theme.mutedColor }}>
            {p.venue} • {p.date}
          </div>
        </div>
      </AbsoluteFill>
    </PageTransition>
  );
};

// Page 2: Stats
const StatsPage: React.FC<{
  p: PostMatchProps;
  pageDuration: number;
}> = ({ p, pageDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <PageTransition durationInFrames={pageDuration}>
      <AbsoluteFill style={{
        background: `linear-gradient(180deg, ${p.theme.bgColor}, ${p.theme.cardBg})`,
        padding: '0 60px',
      }}>
        {/* Header */}
        <div style={{
          position: 'absolute', top: 200, left: 0, right: 0,
          textAlign: 'center',
        }}>
          <span style={{
            fontFamily: font, fontSize: 36, fontWeight: 700,
            color: p.theme.accentColor, letterSpacing: '0.3em',
          }}>
            MATCH STATS
          </span>
        </div>

        {/* Team headers */}
        <div style={{
          position: 'absolute', top: 280, left: 60, right: 60,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <Img src={p.homeLogo} style={{ width: 50, height: 50, objectFit: 'contain' }}
              onError={() => {}} />
            <span style={{ fontFamily: font, fontSize: 24, fontWeight: 700, color: p.theme.textColor }}>
              {p.homeTeam}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <span style={{ fontFamily: font, fontSize: 24, fontWeight: 700, color: p.theme.textColor }}>
              {p.awayTeam}
            </span>
            <Img src={p.awayLogo} style={{ width: 50, height: 50, objectFit: 'contain' }}
              onError={() => {}} />
          </div>
        </div>

        {/* Stats bars */}
        {p.stats.map((stat, i) => {
          const statDelay = 15 + i * 10;
          const statProgress = interpolate(frame, [statDelay, statDelay + 20], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });

          const homeVal = typeof stat.home === 'number' ? stat.home : parseFloat(stat.home);
          const awayVal = typeof stat.away === 'number' ? stat.away : parseFloat(stat.away);
          const total = homeVal + awayVal || 1;
          const homePercent = (homeVal / total) * 100;
          const awayPercent = (awayVal / total) * 100;

          const y = 380 + i * 130;

          return (
            <div key={i} style={{
              position: 'absolute', top: y, left: 60, right: 60,
              opacity: statProgress,
            }}>
              {/* Label */}
              <div style={{
                textAlign: 'center', marginBottom: 10,
                fontFamily: font, fontSize: 22, fontWeight: 500,
                color: p.theme.mutedColor, letterSpacing: '0.1em',
              }}>
                {stat.label}
              </div>

              {/* Values */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', marginBottom: 8,
              }}>
                <span style={{
                  fontFamily: font, fontSize: 32, fontWeight: 800,
                  color: homeVal >= awayVal ? p.theme.textColor : p.theme.mutedColor,
                }}>
                  {stat.home}{stat.isPercentage ? '%' : ''}
                </span>
                <span style={{
                  fontFamily: font, fontSize: 32, fontWeight: 800,
                  color: awayVal >= homeVal ? p.theme.textColor : p.theme.mutedColor,
                }}>
                  {stat.away}{stat.isPercentage ? '%' : ''}
                </span>
              </div>

              {/* Bar */}
              <div style={{
                display: 'flex', gap: 4, height: 8, borderRadius: 4, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${homePercent * statProgress}%`,
                  background: homeVal >= awayVal ? p.homeColor : `${p.homeColor}60`,
                  borderRadius: '4px 0 0 4px',
                  transition: 'width 0.3s ease',
                }} />
                <div style={{
                  width: `${awayPercent * statProgress}%`,
                  background: awayVal >= homeVal ? p.awayColor : `${p.awayColor}60`,
                  borderRadius: '0 4px 4px 0',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </PageTransition>
  );
};

// Page 3: Man of the Match
const MOTMPage: React.FC<{
  p: PostMatchProps;
  pageDuration: number;
}> = ({ p, pageDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 12, stiffness: 80, mass: 0.7 },
  });

  const statsDelay = 30;
  const statsOpacity = interpolate(frame, [statsDelay, statsDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <PageTransition durationInFrames={pageDuration}>
      <AbsoluteFill style={{
        background: `linear-gradient(180deg, ${p.theme.bgColor}, ${p.theme.cardBg})`,
      }}>
        {/* Header */}
        <div style={{
          position: 'absolute', top: 180, left: 0, right: 0,
          textAlign: 'center',
        }}>
          <span style={{
            fontFamily: font, fontSize: 28, fontWeight: 600,
            color: p.theme.accentColor, letterSpacing: '0.4em',
          }}>
            ★ MAN OF THE MATCH ★
          </span>
        </div>

        {/* Player image */}
        <div style={{
          position: 'absolute',
          top: 300,
          left: '50%',
          transform: `translateX(-50%) scale(${imgSpring})`,
          width: 350, height: 420,
          borderRadius: 20,
          overflow: 'hidden',
          border: `3px solid ${p.theme.accentColor}40`,
          boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${p.theme.accentColor}20`,
        }}>
          <Img src={p.motmImage} style={{
            width: '100%', height: '100%', objectFit: 'cover',
          }} onError={() => {}} />
          {/* Gradient overlay on image */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
            background: `linear-gradient(transparent, ${p.theme.bgColor})`,
          }} />
        </div>

        {/* Player name */}
        <div style={{
          position: 'absolute', top: 760, left: 0, right: 0,
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: font, fontSize: 52, fontWeight: 900,
            color: p.theme.textColor, letterSpacing: '0.08em',
          }}>
            {p.motmName}
          </div>
          <div style={{
            fontFamily: font, fontSize: 24, fontWeight: 400,
            color: p.theme.mutedColor, marginTop: 8,
          }}>
            {p.motmTeam}
          </div>
        </div>

        {/* Rating badge */}
        <div style={{
          position: 'absolute', top: 260, right: 280,
          background: p.theme.accentColor,
          width: 80, height: 80, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 30px ${p.theme.accentColor}60`,
          transform: `scale(${imgSpring})`,
        }}>
          <span style={{
            fontFamily: font, fontSize: 34, fontWeight: 900,
            color: '#000',
          }}>
            {p.motmRating}
          </span>
        </div>

        {/* Stats grid */}
        <div style={{
          position: 'absolute', top: 880, left: 80, right: 80,
          display: 'flex', flexWrap: 'wrap', gap: 20,
          justifyContent: 'center',
          opacity: statsOpacity,
        }}>
          {p.motmStats.map((stat, i) => (
            <div key={i} style={{
              background: `${p.theme.cardBg}`,
              border: `1px solid ${p.theme.accentColor}30`,
              borderRadius: 12,
              padding: '14px 28px',
              backdropFilter: 'blur(10px)',
            }}>
              <span style={{
                fontFamily: font, fontSize: 24, fontWeight: 600,
                color: p.theme.textColor,
              }}>
                {stat}
              </span>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </PageTransition>
  );
};

// Page 4: Next fixture
const NextFixturePage: React.FC<{
  p: PostMatchProps;
  pageDuration: number;
}> = ({ p, pageDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 10, stiffness: 100, mass: 0.6 },
  });

  return (
    <PageTransition durationInFrames={pageDuration}>
      <AbsoluteFill style={{
        background: `linear-gradient(180deg, ${p.theme.bgColor}, ${p.theme.cardBg})`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 40,
      }}>
        {/* Label */}
        <span style={{
          fontFamily: font, fontSize: 28, fontWeight: 600,
          color: p.theme.accentColor, letterSpacing: '0.4em',
        }}>
          NEXT MATCH
        </span>

        {/* Teams */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 60,
          transform: `scale(${logoSpring})`,
        }}>
          {/* Home (current team — winner) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15 }}>
            <Img src={p.homeLogo} style={{ width: 160, height: 160, objectFit: 'contain' }}
              onError={() => {}} />
            <span style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: p.theme.textColor }}>
              {p.homeTeam}
            </span>
          </div>

          <span style={{
            fontFamily: font, fontSize: 60, fontWeight: 900,
            color: p.theme.accentColor,
          }}>
            VS
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15 }}>
            <Img src={p.nextOpponentLogo} style={{ width: 160, height: 160, objectFit: 'contain' }}
              onError={() => {}} />
            <span style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: p.theme.textColor }}>
              {p.nextOpponent}
            </span>
          </div>
        </div>

        {/* Date */}
        <div style={{
          background: `${p.theme.accentColor}15`,
          border: `1px solid ${p.theme.accentColor}30`,
          borderRadius: 16,
          padding: '16px 40px',
        }}>
          <span style={{
            fontFamily: font, fontSize: 30, fontWeight: 700,
            color: p.theme.textColor, letterSpacing: '0.1em',
          }}>
            {p.nextDate}
          </span>
        </div>

        <span style={{
          fontFamily: font, fontSize: 22, fontWeight: 400,
          color: p.theme.mutedColor, letterSpacing: '0.15em',
        }}>
          {p.nextCompetition}
        </span>
      </AbsoluteFill>
    </PageTransition>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT — Sequence of pages
// ══════════════════════════════════════════════════════════════

export const PostMatch: React.FC<PostMatchProps> = (rawProps) => {
  const p: PostMatchProps = {
    ...defaultPostMatchProps,
    ...rawProps,
    theme: { ...defaultPostMatchProps.theme, ...rawProps?.theme },
  };

  const pageDuration = 150; // 5 seconds per page at 30fps

  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={pageDuration}>
        <ScorePage p={p} pageDuration={pageDuration} />
      </Sequence>

      <Sequence from={pageDuration} durationInFrames={pageDuration}>
        <StatsPage p={p} pageDuration={pageDuration} />
      </Sequence>

      <Sequence from={pageDuration * 2} durationInFrames={pageDuration}>
        <MOTMPage p={p} pageDuration={pageDuration} />
      </Sequence>

      <Sequence from={pageDuration * 3} durationInFrames={pageDuration}>
        <NextFixturePage p={p} pageDuration={pageDuration} />
      </Sequence>

      {/* Channel logo watermark */}
      {p.logoUrl && (
        <div style={{
          position: 'absolute', bottom: 40, right: 40,
          opacity: 0.4, zIndex: 10,
        }}>
          <Img src={p.logoUrl} style={{ width: p.logoSize, height: p.logoSize, objectFit: 'contain' }}
            onError={() => {}} />
        </div>
      )}
    </AbsoluteFill>
  );
};
