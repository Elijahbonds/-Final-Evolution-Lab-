import React, { useState, useCallback, useRef } from 'react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, 
  Award, Play
} from 'lucide-react';
import { SoundJuice } from '../../lib/judgeScoring';

interface VolleyballModeProps {
  onBack: () => void;
}

type TouchPhase = 'SERVE' | 'BUMP_RECEIVE' | 'SET' | 'SPIKE_ATTACK' | 'DEFENSE_DIG';

export const VolleyballMode: React.FC<VolleyballModeProps> = ({ onBack }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [phase, setPhase] = useState<TouchPhase>('SERVE');
  const [playerScore, setPlayerScore] = useState<number>(23);
  const [rivalScore, setRivalScore] = useState<number>(23);
  const [rallyCount, setRallyCount] = useState<number>(0);

  // Timing Window State
  const [touchMeter, setTouchMeter] = useState<number>(0);
  const [isTimingTouch, setIsTimingTouch] = useState<boolean>(false);
  const [activeTouchGrade, setActiveTouchGrade] = useState<string | null>(null);

  // Point Result Report
  const [pointReport, setPointReport] = useState<{
    grade: string;
    isPointWon: boolean;
    rallyLength: number;
    whyExplainer: string;
  } | null>(null);

  const meterIntervalRef = useRef<number | null>(null);

  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);

  const resolveTouch = (forceVal?: number) => {
    if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
    setIsTimingTouch(false);

    const timing = forceVal !== undefined ? forceVal : touchMeter;
    const sweetSpot = 75; // 75% is the perfect contact sweetspot
    const delta = Math.abs(timing - sweetSpot);

    let grade = 'GOOD TOUCH';
    if (delta <= 6) {
      grade = 'PERFECT // BUTTER SET';
      playSfx(() => SoundJuice.playZoneBeep());
    } else if (delta > 20) {
      grade = 'SHANKED TOUCH';
      playSfx(() => SoundJuice.playHit());
    }

    setActiveTouchGrade(grade);

    if (phase === 'SERVE') {
      setPhase('BUMP_RECEIVE');
    } else if (phase === 'BUMP_RECEIVE') {
      setPhase('SET');
    } else if (phase === 'SET') {
      setPhase('SPIKE_ATTACK');
    } else if (phase === 'SPIKE_ATTACK') {
      playSfx(() => SoundJuice.playVolleySpike());
      setRallyCount(r => r + 1);

      const isWinner = delta <= 12;
      setTimeout(() => {
        if (isWinner) {
          playSfx(() => SoundJuice.playVictory());
          setPlayerScore(p => p + 1);
          setPointReport({
            grade: 'TERMINAL BOUNCE SPIKE',
            isPointWon: true,
            rallyLength: rallyCount + 1,
            whyExplainer: 'Pinpoint setter timing created a 1-on-1 blocker isolation off the right antenna.'
          });
        } else {
          setRivalScore(r => r + 1);
          setPointReport({
            grade: 'DEFENSIVE DIG BLOCKED',
            isPointWon: false,
            rallyLength: rallyCount + 1,
            whyExplainer: 'Late approach angle allowed the double block to close the seam.'
          });
        }
      }, 600);
    }
  };

  const startTiming = (targetPhase: TouchPhase) => {
    setPhase(targetPhase);
    setIsTimingTouch(true);
    setTouchMeter(0);

    let val = 0;
    const interval = window.setInterval(() => {
      val += 5;
      if (val >= 100) {
        val = 100;
        clearInterval(interval);
        resolveTouch(100);
      }
      setTouchMeter(val);
    }, 16);
    meterIntervalRef.current = interval;
  };

  const nextServe = () => {
    setPointReport(null);
    setActiveTouchGrade(null);
    setPhase('SERVE');
  };

  return (
    <div className="relative w-full h-[720px] rounded-3xl overflow-hidden bg-[#160d2b] border border-white/10 flex flex-col justify-between shadow-2xl">
      {/* Top Volleyball HUD */}
      <div className="relative z-10 p-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-white hover:border-pink-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/40 font-bold uppercase">
                VOLLEYBALL // RALLY DISCIPLINE
              </span>
              <span className="text-xs font-mono text-zinc-400">• MATCH POINT DUAL</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase tracking-tight mt-0.5">
              TOKYO CHAMPIONSHIP FINALS
            </h1>
          </div>
        </div>

        {/* Match Scores */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-black/70 border border-white/10">
            <div className="text-center">
              <div className="text-[9px] font-mono text-zinc-400">YOU</div>
              <div className="text-xl sm:text-2xl font-orbitron font-black text-pink-400">{playerScore}</div>
            </div>
            <span className="text-zinc-600 font-mono font-bold">vs</span>
            <div className="text-center">
              <div className="text-[9px] font-mono text-zinc-400">RIVAL</div>
              <div className="text-xl sm:text-2xl font-orbitron font-black text-cyan-400">{rivalScore}</div>
            </div>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-pink-400" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
          </button>
        </div>
      </div>

      {/* Main Volleyball Court Visual */}
      <div className="relative flex-1 mx-6 rounded-3xl bg-zinc-900/80 border border-pink-500/20 overflow-hidden flex flex-col justify-between p-6">
        <div className="relative w-full h-56 sm:h-64 rounded-2xl bg-gradient-to-b from-[#25103a] to-[#12081c] border border-white/10 overflow-hidden flex items-center justify-between px-12">
          {/* Net in the center */}
          <div className="absolute top-0 bottom-0 left-1/2 w-2 bg-white/40 shadow-[0_0_15px_white] -translate-x-1/2" />

          {/* Player side */}
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="w-16 h-16 rounded-full border-2 border-pink-400 bg-pink-500/20 flex items-center justify-center text-2xl">
              🏐
            </div>
            <span className="text-[10px] font-mono font-bold text-pink-300 uppercase">
              TOUCH: {phase.replace('_', ' ')}
            </span>
          </div>

          {/* Opponent side */}
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="w-16 h-16 rounded-full border-2 border-cyan-400 bg-cyan-500/20 flex items-center justify-center text-2xl">
              🛡️
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase">
              DOUBLE BLOCK UP
            </span>
          </div>
        </div>

        {/* Touch Feedback Banner */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-xs font-mono text-zinc-300">
            CURRENT TOUCH: <span className="font-bold text-pink-400">{phase}</span>
          </div>
          {activeTouchGrade && (
            <div className="text-xs font-orbitron font-black text-[#00FF9D]">
              {activeTouchGrade}
            </div>
          )}
        </div>
      </div>

      {/* Point Report Modal */}
      {pointReport && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-950 border border-pink-500/40 shadow-[0_0_80px_rgba(244,63,94,0.3)] space-y-6 text-center">
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto ${
              pointReport.isPointWon 
                ? 'bg-[#00FF9D]/20 border-[#00FF9D]/40 text-[#00FF9D]' 
                : 'bg-red-500/20 border-red-500/40 text-red-400'
            }`}>
              <Award className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-pink-400 uppercase tracking-widest font-bold">
                RALLY OUTCOME REPORT
              </span>
              <h2 className="text-2xl sm:text-3xl font-orbitron font-black text-white mt-1">
                {pointReport.grade}
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-left">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">RALLY TOUCHES:</span>
                <span className="font-bold text-pink-300">{pointReport.rallyLength} HITS</span>
              </div>
              <p className="text-[11px] font-mono text-zinc-300 pt-2 border-t border-white/10 leading-relaxed">
                <span className="text-pink-400 font-bold">EXPLAINER:</span> {pointReport.whyExplainer}
              </p>
            </div>

            <button
              onClick={nextServe}
              className="w-full py-4 bg-pink-500 text-black font-orbitron font-black text-sm rounded-2xl hover:bg-pink-400 transition-all shadow-[0_0_25px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              NEXT SERVE
            </button>
          </div>
        </div>
      )}

      {/* Bottom Timing Touch Control */}
      <div className="relative z-10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {isTimingTouch && (
          <div className="w-64 space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-pink-400 font-bold">TOUCH CONTACT APEX</span>
              <span className="text-white">{touchMeter}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 relative overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 via-pink-500 to-[#00FF9D] transition-all"
                style={{ width: `${touchMeter}%` }}
              />
              <div className="absolute top-0 bottom-0 left-[75%] w-1.5 bg-white shadow-[0_0_8px_white]" />
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (!isTimingTouch) startTiming(phase);
            else resolveTouch();
          }}
          disabled={!!pointReport}
          className="px-8 py-4 rounded-2xl bg-pink-500 text-black font-orbitron font-black text-sm tracking-wider hover:bg-pink-400 transition-all shadow-[0_0_35px_rgba(244,63,94,0.4)] active:scale-95 flex items-center gap-2 cursor-pointer select-none"
        >
          <Play className="w-4 h-4 fill-black" />
          <span>{isTimingTouch ? `SNAP ${phase} TIMING` : `TRIGGER ${phase}`}</span>
        </button>
      </div>
    </div>
  );
};
