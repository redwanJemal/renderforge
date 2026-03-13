import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from 'remotion';

// ══════════════════════════════════════════════════════════════
// MATCH FIXTURE — Pre-match announcement
// Team logos face off with VS, competition badge, date/time
// Premium broadcast-quality layout
// ══════════════════════════════════════════════════════════════

export interface MatchFixtureProps {
  // Teams
  homeTeam: string;
  homeLogo: string;
  homeColor: string;        // Team primary color
  awayTeam: string;
  awayLogo: string;
  awayColor: string;

  // Match info
  competition: string;       // "Premier League"
  competitionLogo: string;
  matchday: string;          // "Matchday 24"
  venue: string;             // "Emirates Stadium"
  date: string;              // "SAT 8 FEB"
  time: string;              // "17:30 GMT"

  // Branding
  logoUrl: string;
  logoSize: number;

  // Theme
  theme: {
    bgGradient: [string, string];
    accentColor: string;
    vsColor: string;
    textColor: string;
    dividerStyle: 'line' | 'glow' | 'fire';
    animationStyle: 'slide' | 'zoom' | 'slam';
  };
}

export const defaultMatchFixtureProps: MatchFixtureProps = {
  homeTeam: 'ARSENAL',
  homeLogo: 'https://placehold.co/300x300/EF0107/ffffff?text=ARS',
  homeColor: '#EF0107',
  awayTeam: 'MAN CITY',
  awayLogo: 'https://placehold.co/300x300/6CABDD/ffffff?text=MCI',
  awayColor: '#6CABDD',

  competition: 'PREMIER LEAGUE',
  competitionLogo: 'https://placehold.co/150x150/3d195b/ffffff?text=PL',
  matchday: 'MATCHDAY 24',
  venue: 'Emirates Stadium, London',
  date: 'SAT 8 FEB',
  time: '17:30 GMT',

  logoUrl: 'https://placehold.co/200x200/3d195b/ffffff?text=SN',
  logoSize: 60,

  theme: {
    bgGradient: ['#0a0a14', '#0f0f1e'],
    accentColor: '#c4a43e',
    vsColor: '#ffffff',
    textColor: '#ffffff',
    dividerStyle: 'glow',
    animationStyle: 'slide',
  },
};

// ── Helpers ──────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

export const MatchFixture: React.FC<MatchFixtureProps> = (rawProps) => {
  const p: MatchFixtureProps = {
    ...defaultMatchFixtureProps,
    ...rawProps,
    theme: { ...defaultMatchFixtureProps.theme, ...rawProps?.theme },
  };

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const font = 'SF Pro Display, -apple-system, Helvetica Neue, sans-serif';

  // ── Animations ──

  // BG reveal
  const bgOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Team color washes (left = home, right = away)
  const washDelay = 5;
  const washProgress = interpolate(frame, [washDelay, washDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Competition badge
  const compDelay = 10;
  const compSpring = spring({
    frame: Math.max(0, frame - compDelay),
    fps,
    config: { damping: 10, stiffness: 120, mass: 0.5 },
  });

  // Home logo — slide from left
  const homeDelay = 20;
  const homeSpring = spring({
    frame: Math.max(0, frame - homeDelay),
    fps,
    config: { damping: 12, stiffness: 80, mass: 0.7 },
  });
  const homeX = interpolate(homeSpring, [0, 1], [-500, 0]);
  const homeOpacity = interpolate(frame, [homeDelay, homeDelay + 10], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Away logo — slide from right
  const awayDelay = 25;
  const awaySpring = spring({
    frame: Math.max(0, frame - awayDelay),
    fps,
    config: { damping: 12, stiffness: 80, mass: 0.7 },
  });
  const awayX = interpolate(awaySpring, [0, 1], [500, 0]);
  const awayOpacity = interpolate(frame, [awayDelay, awayDelay + 10], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // VS text slam
  const vsDelay = 40;
  const vsSpring = spring({
    frame: Math.max(0, frame - vsDelay),
    fps,
    config: { damping: 6, stiffness: 200, mass: 0.4 },
  });
  const vsScale = interpolate(vsSpring, [0, 1], [5, 1]);
  const vsOpacity = interpolate(frame, [vsDelay, vsDelay + 5], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Team names
  const nameDelay = 50;
  const nameOpacity = interpolate(frame, [nameDelay, nameDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const nameY = interpolate(frame, [nameDelay, nameDelay + 15], [20, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Match info
  const infoDelay = 70;
  const infoOpacity = interpolate(frame, [infoDelay, infoDelay + 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const infoY = interpolate(frame, [infoDelay, infoDelay + 20], [30, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Matchday + competition
  const compTextDelay = 85;
  const compTextOpacity = interpolate(frame, [compTextDelay, compTextDelay + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Accent line reveal
  const lineDelay = 60;
  const lineWidth = interpolate(frame, [lineDelay, lineDelay + 25], [0, 100], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Subtle glow pulse
  const glow = Math.sin(frame * 0.08) * 0.5 + 0.5;

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 25, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, ${p.theme.bgGradient[0]}, ${p.theme.bgGradient[1]})`,
      opacity: fadeOut * bgOpacity,
      overflow: 'hidden',
    }}>
      {/* Team color washes — diagonal splits */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
        background: `linear-gradient(135deg, ${p.homeColor}20, transparent 60%)`,
        opacity: washProgress,
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '50%', height: '100%',
        background: `linear-gradient(225deg, ${p.awayColor}20, transparent 60%)`,
        opacity: washProgress,
      }} />

      {/* Diagonal divider line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        width: 2,
        height: '100%',
        background: `linear-gradient(180deg, transparent, ${p.theme.accentColor}40, transparent)`,
        opacity: washProgress,
      }} />

      {/* Competition logo (top center) */}
      {p.competitionLogo && (
        <div style={{
          position: 'absolute',
          top: 100,
          left: '50%',
          transform: `translateX(-50%) scale(${compSpring})`,
          opacity: compSpring,
        }}>
          <Img src={p.competitionLogo} style={{ width: 100, height: 100, objectFit: 'contain' }}
            onError={() => {}} />
        </div>
      )}

      {/* Competition name */}
      <div style={{
        position: 'absolute', top: 220, left: 0, right: 0,
        textAlign: 'center', opacity: compTextOpacity,
      }}>
        <span style={{
          fontFamily: font, fontSize: 28, fontWeight: 700,
          color: p.theme.accentColor, letterSpacing: '0.3em',
        }}>
          {p.competition}
        </span>
      </div>

      {/* Matchday */}
      <div style={{
        position: 'absolute', top: 260, left: 0, right: 0,
        textAlign: 'center', opacity: compTextOpacity * 0.6,
      }}>
        <span style={{
          fontFamily: font, fontSize: 22, fontWeight: 500,
          color: p.theme.textColor, letterSpacing: '0.2em',
        }}>
          {p.matchday}
        </span>
      </div>

      {/* Home team logo */}
      <div style={{
        position: 'absolute',
        top: 550,
        left: '50%',
        transform: `translate(calc(-50% - 200px + ${homeX}px), -50%)`,
        opacity: homeOpacity,
      }}>
        <div style={{
          width: 260, height: 260,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          filter: `drop-shadow(0 0 ${20 + glow * 15}px ${p.homeColor}50)`,
        }}>
          <Img src={p.homeLogo} style={{ width: 220, height: 220, objectFit: 'contain' }}
            onError={() => {}} />
        </div>
      </div>

      {/* Away team logo */}
      <div style={{
        position: 'absolute',
        top: 550,
        left: '50%',
        transform: `translate(calc(-50% + 200px + ${awayX}px), -50%)`,
        opacity: awayOpacity,
      }}>
        <div style={{
          width: 260, height: 260,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          filter: `drop-shadow(0 0 ${20 + glow * 15}px ${p.awayColor}50)`,
        }}>
          <Img src={p.awayLogo} style={{ width: 220, height: 220, objectFit: 'contain' }}
            onError={() => {}} />
        </div>
      </div>

      {/* VS */}
      <div style={{
        position: 'absolute',
        top: 550,
        left: '50%',
        transform: `translate(-50%, -50%) scale(${vsScale})`,
        opacity: vsOpacity,
      }}>
        <span style={{
          fontFamily: font, fontSize: 80, fontWeight: 900,
          color: p.theme.vsColor,
          textShadow: `0 0 30px ${p.theme.accentColor}80`,
          letterSpacing: '0.1em',
        }}>
          VS
        </span>
      </div>

      {/* Team names */}
      <div style={{
        position: 'absolute', top: 720, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 120,
        opacity: nameOpacity,
        transform: `translateY(${nameY}px)`,
      }}>
        <span style={{
          fontFamily: font, fontSize: 42, fontWeight: 800,
          color: p.theme.textColor, letterSpacing: '0.1em',
          textShadow: `0 0 20px ${p.homeColor}60`,
        }}>
          {p.homeTeam}
        </span>
        <span style={{
          fontFamily: font, fontSize: 42, fontWeight: 800,
          color: p.theme.textColor, letterSpacing: '0.1em',
          textShadow: `0 0 20px ${p.awayColor}60`,
        }}>
          {p.awayTeam}
        </span>
      </div>

      {/* Accent divider */}
      <div style={{
        position: 'absolute', top: 800, left: '50%',
        transform: 'translateX(-50%)',
        width: `${lineWidth}%`, maxWidth: 500,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${p.theme.accentColor}, transparent)`,
        boxShadow: p.theme.dividerStyle === 'glow' ? `0 0 15px ${p.theme.accentColor}60` : 'none',
      }} />

      {/* Match info block */}
      <div style={{
        position: 'absolute', top: 840, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 16,
        opacity: infoOpacity,
        transform: `translateY(${infoY}px)`,
      }}>
        {/* Date & Time */}
        <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
          <span style={{
            fontFamily: font, fontSize: 44, fontWeight: 800,
            color: p.theme.accentColor, letterSpacing: '0.1em',
          }}>
            {p.date}
          </span>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: p.theme.accentColor,
          }} />
          <span style={{
            fontFamily: font, fontSize: 44, fontWeight: 800,
            color: p.theme.textColor, letterSpacing: '0.05em',
          }}>
            {p.time}
          </span>
        </div>

        {/* Venue */}
        <span style={{
          fontFamily: font, fontSize: 26, fontWeight: 400,
          color: p.theme.textColor, opacity: 0.5,
          letterSpacing: '0.05em',
        }}>
          {p.venue}
        </span>
      </div>

      {/* Channel logo */}
      {p.logoUrl && (
        <div style={{
          position: 'absolute', bottom: 50, left: '50%',
          transform: 'translateX(-50%)',
          opacity: infoOpacity * 0.7,
        }}>
          <Img src={p.logoUrl} style={{ width: p.logoSize, height: p.logoSize, objectFit: 'contain' }}
            onError={() => {}} />
        </div>
      )}

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)',
        pointerEvents: 'none',
      }} />
    </AbsoluteFill>
  );
};
