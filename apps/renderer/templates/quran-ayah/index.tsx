import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Audio,
  staticFile,
  Img,
  Sequence,
} from 'remotion';
import type { Theme, Format } from '../../types';
import { responsiveFontSize, responsivePadding, isPortrait } from '../../core/formats';
import { registry } from '../../core/registry';
import { meta } from './meta';
import { quranAyahSchema, defaultProps } from './schema';
import type { QuranAyahProps } from './schema';

// ── Star Particle ──────────────────────
const StarParticle: React.FC<{ index: number; color: string }> = ({ index, color }) => {
  const frame = useCurrentFrame();
  const seed = index * 197.3;
  const x = (seed * 3.1) % 100;
  const y = (seed * 7.7) % 100;
  const size = 1.5 + (seed % 2);
  const twinkle = Math.sin(frame * 0.04 + seed) * 0.5 + 0.5;
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      width: size, height: size, borderRadius: '50%',
      background: color, opacity: twinkle * 0.3,
      boxShadow: `0 0 ${size * 3}px ${color}40`,
    }} />
  );
};

// ── Corner Ornament ──────────────────────
const CornerOrnament: React.FC<{
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  color: string; opacity: number; size: number;
}> = ({ position, color, opacity, size }) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.02) * 0.1 + 0.9;
  const posStyle: React.CSSProperties = {
    position: 'absolute', width: size, height: size, opacity: opacity * pulse,
  };
  if (position.includes('top')) posStyle.top = 20;
  if (position.includes('bottom')) posStyle.bottom = 20;
  if (position.includes('left')) posStyle.left = 20;
  if (position.includes('right')) posStyle.right = 20;
  const rotate = position === 'top-left' ? '0deg' : position === 'top-right' ? '90deg' : position === 'bottom-left' ? '270deg' : '180deg';
  return (
    <div style={posStyle}>
      <svg viewBox="0 0 100 100" style={{ transform: `rotate(${rotate})`, width: '100%', height: '100%' }}>
        <path d="M0 0 L40 0 L40 4 L4 4 L4 40 L0 40 Z" fill={color} opacity={0.6} />
        <path d="M12 0 L16 0 L16 16 L0 16 L0 12 L12 12 Z" fill={color} opacity={0.3} />
        <path d="M0 24 L24 24 L24 28 L4 28 L4 40 L0 40 Z" fill={color} opacity={0.2} />
        <circle cx="8" cy="8" r="2" fill={color} opacity={0.5} />
        <circle cx="24" cy="8" r="1.5" fill={color} opacity={0.3} />
        <circle cx="8" cy="24" r="1.5" fill={color} opacity={0.3} />
      </svg>
    </div>
  );
};

// ── Islamic Divider ──────────────────────
const IslamicDivider: React.FC<{ color: string; progress: number; width?: number }> = ({ color, progress, width = 200 }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: progress }}>
    <div style={{ width: width * 0.4 * progress, height: 1, background: `linear-gradient(90deg, transparent, ${color})` }} />
    <div style={{ width: 6, height: 6, transform: 'rotate(45deg)', background: color, opacity: 0.7 }} />
    <div style={{ width: width * 0.4 * progress, height: 1, background: `linear-gradient(270deg, transparent, ${color})` }} />
  </div>
);

// ── Verse Number ──────────────────────
const VerseNumber: React.FC<{ number: string; color: string; size: number }> = ({ number, color, size }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', border: `1.5px solid ${color}50`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }}>
    <span style={{ fontSize: size * 0.4, fontFamily: 'Inter, sans-serif', color: `${color}90`, fontWeight: 600 }}>{number}</span>
  </div>
);

// ── Intro Scene ──────────────────────
const IntroScene: React.FC<{
  surahName: string; surahNameArabic: string; surahNumber: number;
  brandName: string; logoUrl?: string; accentColor: string; highlightColor: string;
  format: Format; introHoldFrames: number;
}> = ({ surahName, surahNameArabic, surahNumber, brandName, logoUrl, accentColor, highlightColor, format, introHoldFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = isPortrait(format);

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [introHoldFrames - 15, introHoldFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const visibility = Math.min(fadeIn, fadeOut);
  if (visibility <= 0) return null;

  const logoScale = spring({ frame, fps, config: { damping: 14, stiffness: 80, mass: 0.6 } });
  const glow = Math.sin(frame * 0.08) * 0.3 + 0.7;

  const titleScale = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 16, stiffness: 90, mass: 0.7 } });
  const dividerProgress = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      opacity: visibility, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', gap: portrait ? 20 : 14,
    }}>
      {/* Logo */}
      {logoUrl && (
        <div style={{ transform: `scale(${logoScale})`, marginBottom: 10 }}>
          <Img src={logoUrl.startsWith('http') ? logoUrl : staticFile(logoUrl)} style={{
            width: portrait ? 120 : 90, height: portrait ? 120 : 90, objectFit: 'contain',
            filter: `drop-shadow(0 0 ${30 * glow}px ${accentColor}60)`,
          }} />
        </div>
      )}

      {/* Brand name */}
      <div style={{
        opacity: interpolate(frame, [10, 25], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        fontSize: responsiveFontSize(13, format, 'caption'),
        fontFamily: 'Inter, sans-serif', color: `${accentColor}90`,
        letterSpacing: 3, textTransform: 'uppercase',
      }}>
        {brandName}
      </div>

      <IslamicDivider color={accentColor} progress={dividerProgress} width={portrait ? 200 : 260} />

      {/* Surah title */}
      <div style={{
        transform: `scale(${titleScale})`, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 10,
      }}>
        <span style={{
          fontSize: responsiveFontSize(portrait ? 48 : 40, format, 'heading'),
          fontFamily: '"Noto Sans Arabic", "Amiri", serif',
          color: highlightColor, fontWeight: 600,
          textShadow: `0 0 30px ${highlightColor}40`,
        }}>
          {surahNameArabic}
        </span>
        <span style={{
          fontSize: responsiveFontSize(20, format, 'body'),
          fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)',
          fontWeight: 400, letterSpacing: 1,
        }}>
          Surah {surahName} • {surahNumber}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── Outro Scene ──────────────────────
const OutroScene: React.FC<{
  brandName: string; socialHandle: string; ctaText: string;
  logoUrl?: string; accentColor: string; highlightColor: string;
  format: Format; outroStartFrame: number; outroHoldFrames: number;
}> = ({ brandName, socialHandle, ctaText, logoUrl, accentColor, highlightColor, format, outroStartFrame, outroHoldFrames }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const portrait = isPortrait(format);
  const localFrame = frame - outroStartFrame;

  const fadeIn = interpolate(localFrame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const visibility = Math.min(fadeIn, fadeOut);
  if (visibility <= 0 || localFrame < 0) return null;

  const logoScale = spring({ frame: Math.max(0, localFrame), fps, config: { damping: 14, stiffness: 80, mass: 0.6 } });
  const glow = Math.sin(localFrame * 0.08) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{
      opacity: visibility, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', gap: portrait ? 18 : 12,
    }}>
      {logoUrl && (
        <div style={{ transform: `scale(${logoScale})`, marginBottom: 8 }}>
          <Img src={logoUrl.startsWith('http') ? logoUrl : staticFile(logoUrl)} style={{
            width: portrait ? 100 : 80, height: portrait ? 100 : 80, objectFit: 'contain',
            filter: `drop-shadow(0 0 ${25 * glow}px ${accentColor}60)`,
          }} />
        </div>
      )}

      <IslamicDivider color={accentColor} progress={interpolate(localFrame, [10, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} width={portrait ? 160 : 220} />

      {/* CTA */}
      <div style={{
        opacity: interpolate(localFrame, [15, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        fontSize: responsiveFontSize(18, format, 'body'),
        fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.7)',
        fontWeight: 400, textAlign: 'center',
      }}>
        {ctaText}
      </div>

      {/* Social handle */}
      <div style={{
        opacity: interpolate(localFrame, [20, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        padding: '8px 24px', borderRadius: 20,
        background: `${accentColor}15`, border: `1px solid ${accentColor}30`,
      }}>
        <span style={{
          fontSize: responsiveFontSize(16, format, 'body'),
          fontFamily: 'Inter, sans-serif', color: highlightColor,
          fontWeight: 600, letterSpacing: 1,
        }}>
          {socialHandle}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── Ayah Scene (1 verse per page) ──────────────────────
const AyahScene: React.FC<{
  scene: QuranAyahProps['scenes'][number];
  sceneIndex: number; totalScenes: number;
  surahNameArabic: string; surahName: string; surahNumber: number;
  accentColor: string; highlightColor: string; format: Format;
  globalTimeMs: number; transitionMs: number;
  audioOffsetMs: number;
}> = ({
  scene, sceneIndex, totalScenes, surahNameArabic, surahName, surahNumber,
  accentColor, highlightColor, format, globalTimeMs, transitionMs, audioOffsetMs,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = isPortrait(format);

  // Scene timing relative to audio offset
  const sceneStartMs = scene.startMs + audioOffsetMs;
  const sceneEndMs = scene.endMs + audioOffsetMs;
  const sceneStartFrame = Math.round((sceneStartMs / 1000) * fps);
  const sceneEndFrame = Math.round((sceneEndMs / 1000) * fps);
  const transitionFrames = Math.max(1, Math.round((transitionMs / 1000) * fps));

  const enterStart = Math.max(0, sceneStartFrame - transitionFrames);
  const enterEnd = Math.max(enterStart + 1, sceneStartFrame);
  const exitEnd = sceneEndFrame;
  const exitStart = Math.max(enterEnd + 1, sceneEndFrame - transitionFrames);

  const enterProgress = sceneIndex === 0 && enterStart <= 1
    ? interpolate(frame, [enterStart, enterStart + transitionFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : interpolate(frame, [enterStart, enterEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Last scene also fades out so it doesn't overlap with the outro
  const exitProgress = interpolate(frame, [exitStart, exitEnd], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const visibility = Math.min(enterProgress, exitProgress);
  if (visibility <= 0) return null;

  const actualTimeMs = (frame / fps) * 1000;
  const isActive = actualTimeMs >= sceneStartMs && actualTimeMs < sceneEndMs;

  const scaleVal = spring({ frame: Math.max(0, frame - enterStart), fps, config: { damping: 18, stiffness: 80, mass: 0.7 } });
  const scale = interpolate(scaleVal, [0, 1], [0.96, 1]);

  // Word highlight
  let activeWordIndex = -1;
  if (isActive && scene.wordSegments.length > 0) {
    // Word segments are in absolute audio time, adjust for offset
    const audioTimeMs = actualTimeMs - audioOffsetMs;
    for (let i = 0; i < scene.wordSegments.length; i++) {
      const [, segStart, segEnd] = scene.wordSegments[i];
      if (audioTimeMs >= segStart && audioTimeMs < segEnd) { activeWordIndex = i + 1; break; }
    }
  }
  const lastSeg = scene.wordSegments[scene.wordSegments.length - 1];
  const audioTimeMs = (frame / fps) * 1000 - audioOffsetMs;
  const verseComplete = lastSeg ? audioTimeMs >= lastSeg[2] : false;

  const arabicWords = scene.arabicText.trim().split(/\s+/);
  const verseNum = scene.verseKey.split(':')[1];

  // Translation reveal
  const firstSeg = scene.wordSegments[0];
  const translationRevealMs = firstSeg ? (firstSeg[1] + audioOffsetMs + 800) : sceneStartMs + 1000;
  const translationRevealFrame = Math.round((translationRevealMs / 1000) * fps);
  const translationOpacity = interpolate(frame, [translationRevealFrame, translationRevealFrame + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      opacity: visibility, transform: `scale(${scale})`,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      gap: portrait ? 28 : 20, padding: portrait ? '160px 40px 120px' : '70px 100px',
    }}>
      {/* Surah + Verse info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: responsiveFontSize(20, format, 'body'), fontFamily: '"Noto Sans Arabic", "Amiri", serif', color: `${accentColor}CC` }}>
          {surahNameArabic}
        </span>
        <div style={{ width: 1, height: 18, background: `${accentColor}30` }} />
        <span style={{ fontSize: responsiveFontSize(13, format, 'caption'), fontFamily: 'Inter, sans-serif', color: `${accentColor}80`, letterSpacing: 1 }}>
          {surahName} {surahNumber}:{verseNum}
        </span>
      </div>

      <IslamicDivider color={accentColor} progress={enterProgress} width={portrait ? 180 : 240} />

      {/* Arabic text with word reveal + highlighting */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
        gap: portrait ? 16 : 12, direction: 'rtl', lineHeight: 2.4, maxWidth: '95%',
      }}>
        {arabicWords.map((word, i) => {
          const wordIndex = i + 1;
          const isHighlighted = isActive && wordIndex === activeWordIndex;
          const wasHighlighted = isActive && (activeWordIndex > wordIndex || verseComplete);
          const seg = scene.wordSegments.find((s) => s[0] === wordIndex);
          const wordRevealFrame = seg ? Math.round(((seg[1] + audioOffsetMs) / 1000) * fps) : enterStart;
          const wordOpacity = interpolate(frame, [wordRevealFrame - 3, wordRevealFrame + 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

          return (
            <span key={i} style={{
              fontSize: responsiveFontSize(portrait ? 48 : 40, format, 'heading'),
              fontFamily: '"Noto Sans Arabic", "Amiri", "Traditional Arabic", serif',
              color: isHighlighted ? highlightColor : wasHighlighted ? '#FFFFFFDD' : '#FFFFFF90',
              fontWeight: 400, display: 'inline-block', opacity: wordOpacity,
              textShadow: isHighlighted ? `0 0 30px ${highlightColor}60, 0 0 60px ${highlightColor}25` : 'none',
              transform: isHighlighted ? 'scale(1.08)' : 'scale(1)',
            }}>
              {word}
            </span>
          );
        })}
        <VerseNumber number={verseNum} color={accentColor} size={portrait ? 34 : 30} />
      </div>

      {/* Translation */}
      {scene.translation && (
        <div style={{
          opacity: translationOpacity, maxWidth: '90%',
          fontSize: responsiveFontSize(portrait ? 19 : 17, format, 'body'),
          fontFamily: 'Inter, "Noto Sans Ethiopic", sans-serif',
          color: 'rgba(255,255,255,0.65)', fontWeight: 400, fontStyle: 'italic',
          textAlign: 'center', lineHeight: 1.7,
        }}>
          {scene.translation.replace(/<[^>]*>/g, '')}
        </div>
      )}

      {/* Scene dots */}
      {totalScenes > 1 && (
        <div style={{ position: 'absolute', bottom: portrait ? 80 : 40, display: 'flex', alignItems: 'center', gap: 5 }}>
          {Array.from({ length: totalScenes }, (_, i) => (
            <div key={i} style={{
              width: i === sceneIndex ? 22 : 5, height: 5, borderRadius: 3,
              background: i === sceneIndex ? accentColor : `${accentColor}35`,
            }} />
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ── Main ──────────────────────
const QuranAyah: React.FC<QuranAyahProps & { theme: Theme; format: Format }> = (props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const {
    scenes, reciterName, audioUrl, accentColor, secondaryAccent,
    bgGradient, highlightColor, ornamentOpacity, transitionMs,
    surahName, surahNameArabic, surahNumber,
    introHoldFrames, outroHoldFrames, logoUrl, brandName, socialHandle, ctaText,
    format,
  } = props;

  const portrait = isPortrait(format);

  // Audio starts after intro
  const audioOffsetMs = (introHoldFrames / fps) * 1000;

  // Outro starts after last scene ends + small gap
  const lastScene = scenes[scenes.length - 1];
  const lastSceneEndMs = lastScene ? lastScene.endMs + audioOffsetMs : audioOffsetMs;
  const outroStartFrame = Math.round((lastSceneEndMs / 1000) * fps) + 10;

  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const globalOpacity = Math.min(fadeIn, fadeOut);
  const glowPulse = Math.sin(frame * 0.02) * 0.15 + 0.85;

  return (
    <AbsoluteFill style={{ opacity: globalOpacity, backgroundColor: '#000' }}>
      {/* Background */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${bgGradient[1]} 0%, ${bgGradient[0]} 55%, ${bgGradient[2]} 100%)` }} />

      {/* Glow */}
      <div style={{
        position: 'absolute', left: '50%', top: '30%', width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${accentColor}10 0%, transparent 70%)`,
        transform: `translate(-50%, -50%) scale(${glowPulse})`, filter: 'blur(60px)',
      }} />

      {/* Stars */}
      <AbsoluteFill>
        {Array.from({ length: 25 }, (_, i) => <StarParticle key={i} index={i} color={accentColor} />)}
      </AbsoluteFill>

      {/* Corner ornaments */}
      <CornerOrnament position="top-left" color={accentColor} opacity={ornamentOpacity} size={portrait ? 80 : 60} />
      <CornerOrnament position="top-right" color={accentColor} opacity={ornamentOpacity} size={portrait ? 80 : 60} />
      <CornerOrnament position="bottom-left" color={accentColor} opacity={ornamentOpacity} size={portrait ? 80 : 60} />
      <CornerOrnament position="bottom-right" color={accentColor} opacity={ornamentOpacity} size={portrait ? 80 : 60} />

      {/* Audio — delayed by intro using Sequence */}
      {audioUrl && introHoldFrames > 0 && (
        <Sequence from={introHoldFrames}>
          <Audio src={audioUrl.startsWith('http') ? audioUrl : staticFile(audioUrl)} />
        </Sequence>
      )}
      {audioUrl && introHoldFrames === 0 && (
        <Audio src={audioUrl.startsWith('http') ? audioUrl : staticFile(audioUrl)} />
      )}

      {/* INTRO */}
      <IntroScene
        surahName={surahName} surahNameArabic={surahNameArabic} surahNumber={surahNumber}
        brandName={brandName} logoUrl={logoUrl} accentColor={accentColor} highlightColor={highlightColor}
        format={format} introHoldFrames={introHoldFrames}
      />

      {/* AYAH SCENES */}
      {scenes.map((scene, i) => (
        <AyahScene
          key={scene.verseKey} scene={scene}
          sceneIndex={i} totalScenes={scenes.length}
          surahNameArabic={surahNameArabic} surahName={surahName} surahNumber={surahNumber}
          accentColor={accentColor} highlightColor={highlightColor}
          format={format} globalTimeMs={(frame / fps) * 1000}
          transitionMs={transitionMs} audioOffsetMs={audioOffsetMs}
        />
      ))}

      {/* OUTRO */}
      <OutroScene
        brandName={brandName} socialHandle={socialHandle} ctaText={ctaText}
        logoUrl={logoUrl} accentColor={accentColor} highlightColor={highlightColor}
        format={format} outroStartFrame={outroStartFrame} outroHoldFrames={outroHoldFrames}
      />

      {/* Reciter (during ayah scenes only) */}
      {frame > introHoldFrames && frame < outroStartFrame && (
        <div style={{
          position: 'absolute', bottom: portrait ? 45 : 20,
          left: 0, right: 0, display: 'flex', justifyContent: 'center',
          opacity: 0.35,
        }}>
          <span style={{
            fontSize: responsiveFontSize(11, format, 'caption'),
            fontFamily: 'Inter, sans-serif', color: `${accentColor}90`,
            letterSpacing: 1.5, textTransform: 'uppercase',
          }}>
            {reciterName}
          </span>
        </div>
      )}

      {/* Vignette + Progress */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        width: `${(frame / durationInFrames) * 100}%`, height: 2,
        background: `linear-gradient(90deg, ${secondaryAccent}, ${accentColor})`,
      }} />
    </AbsoluteFill>
  );
};

registry.register({ meta, schema: quranAyahSchema, component: QuranAyah, defaultProps });
export { QuranAyah, defaultProps as defaultQuranAyahProps };
export default QuranAyah;
