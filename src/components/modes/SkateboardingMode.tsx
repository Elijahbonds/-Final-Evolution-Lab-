import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, Flame, 
  Award, Play
} from 'lucide-react';
import { SoundJuice } from '../../lib/judgeScoring';

interface SkateboardingModeProps {
  onBack: () => void;
}

type SkateTrick = 'OLLIE' | 'KICKFLIP' | 'HEELFLIP' | 'TRE_FLIP' | 'GRIND_50_50' | 'MANUAL';

export const SkateboardingMode: React.FC<SkateboardingModeProps> = ({ onBack }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [sessionClock, setSessionClock] = useState<number>(45); // 45s run
  const [isActiveRun, setIsActiveRun] = useState<boolean>(false);
  const [isBailed, setIsBailed] = useState<boolean>(false);

  // Line & Combo State
  const [activeLineTricks, setActiveLineTricks] = useState<string[]>([]);
  const [currentLinePoints, setCurrentLinePoints] = useState<number>(0);
  const [bankedTotalScore, setBankedTotalScore] = useState<number>(0);
  const [lineMultiplier, setLineMultiplier] = useState<number>(1);

  // Manual Balance Meter
  const [isManualing, setIsManualing] = useState<boolean>(false);
  const [balanceOffset, setBalanceOffset] = useState<number>(0); // -50 to +50

  // Run Summary
  const [runSummary, setRunSummary] = useState<{
    grade: string;
    finalScore: number;
    trickCount: number;
    highestMultiplier: number;
    whyExplainer: string;
  } | null>(null);

  const balanceIntervalRef = useRef<number | null>(null);

  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);

  const bankCurrentLine = useCallback(() => {
    if (currentLinePoints === 0) return;
    const finalLineScore = currentLinePoints * lineMultiplier;
    setBankedTotalScore(s => s + finalLineScore);
    playSfx(() => SoundJuice.playVictory());
    setCurrentLinePoints(0);
    setActiveLineTricks([]);
    setLineMultiplier(1);
    setIsManualing(false);
  }, [currentLinePoints, lineMultiplier, playSfx]);

  const finishRun = useCallback(() => {
    setIsActiveRun(false);

    let grade = 'S-TIER STREET STYLER';
    let why = 'Flawless line management. Linked Tre Flip into 50-50 ledge grind with clean manual balance chain.';
    
    if (bankedTotalScore >= 12000) {
      grade = 'LEGENDARY 99.0 RUN';
      why = 'High-risk trick diversity across 6-trick multiplier combo. Zero bails.';
    } else if (bankedTotalScore < 4000) {
      grade = 'AMATEUR 7.0';
      why = 'Line dropped due to missed bank timing and manual wobble.';
    }

    setRunSummary({
      grade,
      finalScore: bankedTotalScore,
      trickCount: 14,
      highestMultiplier: lineMultiplier,
      whyExplainer: why
    });
  }, [bankedTotalScore, lineMultiplier]);

  const triggerBail = useCallback(() => {
    setIsBailed(true);
    setIsManualing(false);
    setCurrentLinePoints(0);
    setActiveLineTricks([]);
    setLineMultiplier(1);
    playSfx(() => SoundJuice.playHit());

    setTimeout(() => {
      setIsBailed(false);
    }, 1500);
  }, [playSfx]);

  // Run Timer
  useEffect(() => {
    if (isActiveRun && sessionClock > 0) {
      const timer = setInterval(() => {
        setSessionClock(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            bankCurrentLine();
            finishRun();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isActiveRun, sessionClock, bankCurrentLine, finishRun]);

  // Manual balance wobble loop
  useEffect(() => {
    if (isManualing && isActiveRun) {
      const interval = setInterval(() => {
        setBalanceOffset(prev => {
          const wobble = (Math.random() - 0.48) * 12;
          const next = prev + wobble;
          if (Math.abs(next) >= 48) {
            // Bailed out!
            triggerBail();
            return 0;
          }
          return next;
        });
        setCurrentLinePoints(p => p + 50);
      }, 100);
      balanceIntervalRef.current = interval as unknown as number;
      return () => clearInterval(interval);
    }
  }, [isManualing, isActiveRun, triggerBail]);

  const startRun = () => {
    setIsActiveRun(true);
    setIsBailed(false);
    setSessionClock(45);
    setBankedTotalScore(0);
    setCurrentLinePoints(0);
    setActiveLineTricks([]);
    setLineMultiplier(1);
    setRunSummary(null);
    playSfx(() => SoundJuice.playSkateGrind());
  };

  const executeTrick = (trick: SkateTrick) => {
    if (!isActiveRun || isBailed) return;

    if (trick === 'MANUAL') {
      setIsManualing(!isManualing);
      playSfx(() => SoundJuice.playZoneBeep());
      return;
    }

    if (isManualing) {
      setIsManualing(false);
    }

    let trickPts = 0;
    if (trick === 'OLLIE') {
      trickPts = 200;
      playSfx(() => SoundJuice.playTakeoff());
    } else if (trick === 'KICKFLIP') {
      trickPts = 450;
      playSfx(() => SoundJuice.playHit());
    } else if (trick === 'HEELFLIP') {
      trickPts = 480;
      playSfx(() => SoundJuice.playHit());
    } else if (trick === 'TRE_FLIP') {
      trickPts = 850;
      playSfx(() => SoundJuice.playVictory());
    } else if (trick === 'GRIND_50_50') {
      trickPts = 600;
      playSfx(() => SoundJuice.playSkateGrind());
    }

    setActiveLineTricks(t => [...t, trick]);
    setCurrentLinePoints(p => p + trickPts);
    setLineMultiplier(m => m + 1);
  };

  const adjustBalance = (dir: 'LEFT' | 'RIGHT') => {
    setBalanceOffset(prev => (dir === 'LEFT' ? prev - 8 : prev + 8));
  };

  return (
    <div className="unreal-canvas relative w-full h-[720px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
      {/* Top Street Skate HUD */}
      <div className="relative z-10 p-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-white hover:border-amber-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/40 font-bold uppercase">
                SKATEBOARDING // STREET LINES
              </span>
              <span className="text-xs font-mono text-zinc-400">• LOVE PARK PLAZA</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase tracking-tight mt-0.5">
              DOWNTOWN LEDGE & STAIRS
            </h1>
          </div>
        </div>

        {/* Timer & Banked Score */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">RUN TIME:</span>
            <span className="text-lg font-orbitron font-black text-white">{sessionClock}s</span>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">BANKED:</span>
            <span className="text-lg font-orbitron font-black text-amber-400">{bankedTotalScore}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
          </button>
        </div>
      </div>

      {/* Main Street Plaza Canvas Visual */}
      <div className="relative flex-1 mx-6 rounded-3xl bg-zinc-900/80 border border-amber-500/20 overflow-hidden flex flex-col justify-between p-6">
        {/* Plaza Visual */}
        <div className="relative w-full h-56 sm:h-64 rounded-2xl bg-gradient-to-b from-[#27272a] to-[#18181b] border border-white/10 overflow-hidden flex items-center justify-center">
          {/* Ledge and Stairs graphic elements */}
          <div className="absolute bottom-0 w-full h-12 bg-zinc-800 border-t-2 border-amber-500/40" />
          <div className="absolute bottom-12 right-24 w-48 h-8 bg-zinc-700 border-t-2 border-yellow-400" />

          {/* Skater Avatar & Bail State */}
          <div className="z-10 flex flex-col items-center gap-2">
            {isBailed ? (
              <div className="text-3xl text-red-500 font-orbitron font-black animate-ping">
                💥 BAILED OUT!
              </div>
            ) : (
              <div className="text-4xl animate-bounce">🛹</div>
            )}

            {/* Active Line Score Display */}
            {currentLinePoints > 0 && !isBailed && (
              <div className="px-4 py-1.5 rounded-full bg-black/70 border border-amber-400 flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <span className="text-xs font-mono text-zinc-300 font-bold">UNBANKED LINE:</span>
                <span className="text-sm font-orbitron font-black text-amber-400">
                  {currentLinePoints} × {lineMultiplier} = {currentLinePoints * lineMultiplier} PTS
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Manual Balance Meter */}
        {isManualing && (
          <div className="p-4 rounded-2xl bg-black/70 border border-amber-400/50 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-amber-400 font-bold">MANUAL BALANCE GAUGE (KEEP CENTERED)</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => adjustBalance('LEFT')} 
                  className="px-2 py-0.5 rounded bg-white/20 text-white font-mono text-[10px]"
                >
                  ← NOSE
                </button>
                <button 
                  onClick={() => adjustBalance('RIGHT')} 
                  className="px-2 py-0.5 rounded bg-white/20 text-white font-mono text-[10px]"
                >
                  TAIL →
                </button>
              </div>
            </div>
            <div className="h-4 rounded-full bg-white/10 relative overflow-hidden">
              <div 
                className="absolute top-0 bottom-0 w-4 bg-amber-400 rounded-full shadow-[0_0_12px_#F59E0B] transition-all"
                style={{ left: `calc(50% + ${balanceOffset}%)` }}
              />
              <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-white/40" />
            </div>
          </div>
        )}

        {/* Trick Combos Trail */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 overflow-x-auto max-w-full">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">LINE SEQUENCE:</span>
            {activeLineTricks.length === 0 ? (
              <span className="text-xs font-mono text-zinc-500">POP FIRST TRICK TO OPEN LINE...</span>
            ) : (
              activeLineTricks.map((t, idx) => (
                <span key={idx} className="text-[10px] font-mono px-2.5 py-1 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold whitespace-nowrap">
                  {t.replace('_', ' ')}
                </span>
              ))
            )}
          </div>

          {currentLinePoints > 0 && (
            <button
              onClick={bankCurrentLine}
              className="px-4 py-2 rounded-xl bg-amber-400 text-black font-orbitron font-black text-xs hover:scale-105 transition-transform flex items-center gap-1 shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
            >
              BANK LINE <Flame className="w-3.5 h-3.5 fill-black" />
            </button>
          )}
        </div>
      </div>

      {/* Run Summary Modal */}
      {runSummary && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-950 border border-amber-400/40 shadow-[0_0_80px_rgba(245,158,11,0.3)] space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto">
              <Award className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">
                STREET RUN REPORT
              </span>
              <h2 className="text-3xl font-orbitron font-black text-white mt-1">
                {runSummary.grade}
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-left">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">TOTAL SCORE:</span>
                <span className="font-bold text-amber-400">{runSummary.finalScore} PTS</span>
              </div>
              <p className="text-[11px] font-mono text-zinc-300 pt-2 border-t border-white/10 leading-relaxed">
                <span className="text-amber-400 font-bold">EXPLAINER:</span> {runSummary.whyExplainer}
              </p>
            </div>

            <button
              onClick={startRun}
              className="w-full py-4 bg-amber-400 text-black font-orbitron font-black text-sm rounded-2xl hover:bg-amber-300 transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              ONE MORE RUN
            </button>
          </div>
        </div>
      )}

      {/* Bottom Trick Buttons */}
      <div className="relative z-10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => executeTrick('OLLIE')}
            disabled={!isActiveRun || isBailed}
            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:border-amber-400 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            OLLIE
          </button>
          <button
            onClick={() => executeTrick('KICKFLIP')}
            disabled={!isActiveRun || isBailed}
            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:border-amber-400 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            KICKFLIP
          </button>
          <button
            onClick={() => executeTrick('HEELFLIP')}
            disabled={!isActiveRun || isBailed}
            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:border-amber-400 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            HEELFLIP
          </button>
          <button
            onClick={() => executeTrick('TRE_FLIP')}
            disabled={!isActiveRun || isBailed}
            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-amber-400 hover:border-amber-400 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            360 FLIP
          </button>
          <button
            onClick={() => executeTrick('GRIND_50_50')}
            disabled={!isActiveRun || isBailed}
            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:border-amber-400 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            50-50 GRIND
          </button>
          <button
            onClick={() => executeTrick('MANUAL')}
            disabled={!isActiveRun || isBailed}
            className={`px-4 py-3 rounded-2xl border text-xs font-mono font-bold transition-all cursor-pointer ${
              isManualing ? 'bg-amber-400 text-black border-amber-400' : 'bg-white/5 border-white/10 text-white hover:border-amber-400'
            }`}
          >
            {isManualing ? 'MANUALING...' : 'MANUAL'}
          </button>
        </div>

        {!isActiveRun && !runSummary && (
          <button
            onClick={startRun}
            className="px-8 py-4 rounded-2xl bg-amber-400 text-black font-orbitron font-black text-sm tracking-wider hover:bg-amber-300 transition-all shadow-[0_0_35px_rgba(245,158,11,0.4)] flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>DROP IN</span>
          </button>
        )}
      </div>
    </div>
  );
};
