import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, Flame, 
  Shield, Trophy, Play, Timer
} from 'lucide-react';
import { SoundJuice } from '../../lib/judgeScoring';

interface BasketballStreetDuelModeProps {
  onBack: () => void;
}

type DuelPhase = 'OFFENSE_DRIBBLE' | 'SHOT_TIMING' | 'DEFENSE_CONTEST' | 'POSSESSION_RESULT' | 'GAME_OVER';

export const BasketballStreetDuelMode: React.FC<BasketballStreetDuelModeProps> = ({ onBack }) => {
  const [phase, setPhase] = useState<DuelPhase>('OFFENSE_DRIBBLE');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Score & Game Clock
  const [playerScore, setPlayerScore] = useState<number>(18);
  const [aiScore, setAiScore] = useState<number>(19);
  const [targetScore] = useState<number>(21);
  const [possessionClock, setPossessionClock] = useState<number>(14);
  const [momentum, setMomentum] = useState<number>(50); // 0 (AI) to 100 (Player)

  // Move Combo System
  const [dribbleCombos, setDribbleCombos] = useState<string[]>([]);
  const [defenderBalance, setDefenderBalance] = useState<number>(100); // 0 = Ankle Breaker!
  const [shotQuality, setShotQuality] = useState<number>(50);

  // Shot Timing State
  const [shotMeter, setShotMeter] = useState<number>(0);
  const [releaseFeedback, setReleaseFeedback] = useState<{
    timingMs: number;
    grade: string;
    isMake: boolean;
    points: number;
    whyExplainer: string;
  } | null>(null);

  const shotIntervalRef = useRef<number | null>(null);

  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);

  const handleShotClockViolation = useCallback(() => {
    setReleaseFeedback({
      timingMs: 0,
      grade: 'SHOT CLOCK VIOLATION',
      isMake: false,
      points: 0,
      whyExplainer: 'Hesitation on the perimeter allowed the 14-second isolation window to expire.'
    });
    setPhase('POSSESSION_RESULT');
  }, []);

  // Possession Shot Clock Timer
  useEffect(() => {
    if (phase === 'OFFENSE_DRIBBLE' || phase === 'DEFENSE_CONTEST') {
      const timer = setInterval(() => {
        setPossessionClock(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            playSfx(() => SoundJuice.playBuzzer());
            handleShotClockViolation();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase, handleShotClockViolation, playSfx]);

  // Dribble Move Execution
  const executeDribbleMove = (move: 'CROSSOVER' | 'BEHIND_BACK' | 'STEPBACK' | 'HESITATION') => {
    playSfx(() => SoundJuice.playDribble());
    const newCombos = [...dribbleCombos, move].slice(-4);
    setDribbleCombos(newCombos);

    // Defender balance degradation
    const drain = move === 'STEPBACK' ? 35 : move === 'CROSSOVER' ? 25 : 20;
    const newBalance = Math.max(0, defenderBalance - drain);
    setDefenderBalance(newBalance);

    if (newBalance === 0) {
      playSfx(() => SoundJuice.playZoneBeep());
    }

    // Shot quality increases as defender balance drops
    const quality = Math.min(95, Math.round(100 - newBalance * 0.7));
    setShotQuality(quality);
  };

  const releaseJumpShot = (forceValue?: number) => {
    if (shotIntervalRef.current) clearInterval(shotIntervalRef.current);

    const timing = forceValue !== undefined ? forceValue : shotMeter;
    const sweetSpot = 80; // 80% is the apex green window
    const delta = Math.abs(timing - sweetSpot);
    const timingMs = Math.round(delta * 4.2);

    // Calculate make probability based on timing + defender contest (shotQuality)
    const baseProb = Math.max(0.1, 1 - delta / 40);
    const finalProb = (baseProb * 0.6) + ((shotQuality / 100) * 0.4);
    const isMake = Math.random() < finalProb;

    const isThree = dribbleCombos.includes('STEPBACK');
    const pts = isThree ? 3 : 2;

    let grade = 'SLIGHTLY EARLY';
    if (delta <= 4) grade = 'GREEN LIGHT // EXCELLENT RELEASE';
    else if (timing > sweetSpot) grade = 'SLIGHTLY LATE';
    else if (delta > 20) grade = 'CONTESTED BRICK';

    let why = `Open look (+${shotQuality}% space). `;
    if (defenderBalance === 0) why += 'Ankle breaker created 6.2ft of separation. ';
    if (isMake) why += `Clean swish release within ${timingMs}ms of shot apex.`;
    else why += `Rim deflection due to ${timingMs}ms timing mistiming.`;

    if (isMake) {
      playSfx(() => SoundJuice.playSwish());
      setPlayerScore(p => p + pts);
      setMomentum(m => Math.min(100, m + 20));
    } else {
      playSfx(() => SoundJuice.playHit());
      setMomentum(m => Math.max(0, m - 15));
    }

    setReleaseFeedback({
      timingMs,
      grade,
      isMake,
      points: isMake ? pts : 0,
      whyExplainer: why
    });
    setPhase('POSSESSION_RESULT');
  };

  // Trigger Jump Shot
  const startJumpShot = () => {
    setPhase('SHOT_TIMING');
    setShotMeter(0);

    let val = 0;
    const interval = window.setInterval(() => {
      val += 4;
      if (val >= 100) {
        val = 100;
        clearInterval(interval);
        releaseJumpShot(100);
      }
      setShotMeter(val);
    }, 16);
    shotIntervalRef.current = interval;
  };

  const simulateAiPossession = () => {
    setPhase('DEFENSE_CONTEST');
    setPossessionClock(14);
    setDribbleCombos([]);
    setDefenderBalance(100);
    setReleaseFeedback(null);

    setTimeout(() => {
      // AI shot attempt
      const aiMakes = Math.random() > 0.45;
      const pts = Math.random() > 0.6 ? 3 : 2;
      
      if (aiMakes) {
        playSfx(() => SoundJuice.playSwish());
        setAiScore(s => s + pts);
        setMomentum(m => Math.max(0, m - 20));
      } else {
        playSfx(() => SoundJuice.playHit());
        setMomentum(m => Math.min(100, m + 15));
      }

      setReleaseFeedback({
        timingMs: 12,
        grade: aiMakes ? 'RIVAL BUCKET' : 'CONTESTED STOP',
        isMake: aiMakes,
        points: aiMakes ? pts : 0,
        whyExplainer: aiMakes 
          ? 'Rival pulled up over late hand contest for a clutch jumper.' 
          : 'High-pressure perimeter lockdown forced a heavily contested miss off the back iron.'
      });
      setPhase('POSSESSION_RESULT');
    }, 2500);
  };

  const nextPossession = () => {
    if (playerScore >= targetScore || aiScore >= targetScore) {
      setPhase('GAME_OVER');
      if (playerScore >= targetScore) {
        playSfx(() => SoundJuice.playVictory());
      }
      return;
    }

    // Switch possession
    if (phase === 'POSSESSION_RESULT') {
      if (releaseFeedback?.points !== undefined && releaseFeedback.points > 0 && playerScore > aiScore) {
        // Player keeps or gives to AI
        simulateAiPossession();
      } else {
        // Player offense
        setPhase('OFFENSE_DRIBBLE');
        setPossessionClock(14);
        setDribbleCombos([]);
        setDefenderBalance(100);
        setShotQuality(50);
        setReleaseFeedback(null);
      }
    }
  };

  const restartGame = () => {
    setPlayerScore(18);
    setAiScore(19);
    setMomentum(50);
    setDribbleCombos([]);
    setDefenderBalance(100);
    setShotQuality(50);
    setReleaseFeedback(null);
    setPhase('OFFENSE_DRIBBLE');
    setPossessionClock(14);
  };

  return (
    <div className="unreal-canvas relative w-full h-[720px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
      {/* Top Street HUD */}
      <div className="relative z-10 p-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-white hover:border-orange-500 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold uppercase">
                BASKETBALL H2H // 1v1 STREET DUEL
              </span>
              <span className="text-xs font-mono text-zinc-400">• RUCKER PARK ASPHALT</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase tracking-tight mt-0.5">
              GAME TO 21 // CLUTCH TIME
            </h1>
          </div>
        </div>

        {/* Score & Shot Clock */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-black/70 border border-white/10">
            <div className="text-center">
              <div className="text-[9px] font-mono text-zinc-400">YOU</div>
              <div className="text-xl sm:text-2xl font-orbitron font-black text-orange-400">{playerScore}</div>
            </div>
            <span className="text-zinc-600 font-mono font-bold">vs</span>
            <div className="text-center">
              <div className="text-[9px] font-mono text-zinc-400">RIVAL</div>
              <div className="text-xl sm:text-2xl font-orbitron font-black text-cyan-400">{aiScore}</div>
            </div>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-black/70 border border-orange-500/40 flex items-center gap-2">
            <Timer className="w-4 h-4 text-orange-500 animate-pulse" />
            <span className="text-lg font-orbitron font-black text-orange-400">{possessionClock}s</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-orange-400" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
          </button>
        </div>
      </div>

      {/* Main Asphalt Court Visual Canvas */}
      <div className="relative flex-1 mx-6 rounded-3xl bg-zinc-950/80 border border-orange-500/20 overflow-hidden flex flex-col justify-between p-6">
        {/* Asphalt Background Graphic */}
        <div className="absolute inset-0 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        {/* Top Momentum Gauge */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-zinc-400">
              <span className="text-orange-400 font-bold">YOU (MOMENTUM {momentum}%)</span>
              <span className="text-cyan-400 font-bold">RIVAL ({100 - momentum}%)</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
                style={{ width: `${momentum}%` }}
              />
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${100 - momentum}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center Court Iso-Drama Stage */}
        <div className="relative z-10 flex items-center justify-around py-8">
          {/* Player Archetype */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-20 rounded-3xl bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(249,115,22,0.3)]">
              🏀
              {momentum >= 80 && (
                <Flame className="absolute -top-3 -right-3 w-6 h-6 text-amber-400 animate-bounce" />
              )}
            </div>
            <span className="text-xs font-mono font-bold text-orange-400">YOU (BALL IN HAND)</span>
          </div>

          {/* Defense Space & Ankle Breaker State */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">DEFENDER BALANCE</div>
            <div className="w-36 h-3 rounded-full bg-white/10 overflow-hidden border border-white/10">
              <div 
                className={`h-full transition-all duration-200 ${
                  defenderBalance === 0 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-emerald-400 to-yellow-400'
                }`}
                style={{ width: `${defenderBalance}%` }}
              />
            </div>
            <span className={`text-xs font-orbitron font-black ${
              defenderBalance === 0 ? 'text-red-400 animate-bounce' : 'text-zinc-300'
            }`}>
              {defenderBalance === 0 ? '💥 ANKLE BROKEN! 6.2 FT OPEN' : `${defenderBalance}% STABILITY`}
            </span>
          </div>

          {/* AI Rival */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              🛡️
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">RIVAL (LOCKDOWN)</span>
          </div>
        </div>

        {/* Combo Log Bar */}
        <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">COMBO SEQUENCE:</span>
            {dribbleCombos.length === 0 ? (
              <span className="text-xs font-mono text-zinc-500">NO DRIBBLE CHAIN EXECUTED</span>
            ) : (
              dribbleCombos.map((c, i) => (
                <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold">
                  {c}
                </span>
              ))
            )}
          </div>

          <div className="text-xs font-mono text-zinc-300">
            SHOT OPENNESS: <span className="font-bold text-orange-400">{shotQuality}%</span>
          </div>
        </div>
      </div>

      {/* Release Feedback Modal Overlay */}
      {releaseFeedback && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-950 border border-orange-500/40 shadow-[0_0_80px_rgba(249,115,22,0.3)] space-y-6 text-center">
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto ${
              releaseFeedback.isMake 
                ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' 
                : 'bg-red-500/20 border-red-500/40 text-red-400'
            }`}>
              {releaseFeedback.isMake ? <Trophy className="w-7 h-7" /> : <Shield className="w-7 h-7" />}
            </div>

            <div>
              <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-bold">
                POSSESSION OUTCOME
              </span>
              <h2 className="text-2xl sm:text-3xl font-orbitron font-black text-white mt-1">
                {releaseFeedback.grade}
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-left">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">RELEASE DELTA:</span>
                <span className="font-bold text-orange-400">+{releaseFeedback.timingMs}ms Apex</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">POINTS AWARDED:</span>
                <span className="font-bold text-white">+{releaseFeedback.points} PTS</span>
              </div>
              <p className="text-[11px] font-mono text-zinc-300 pt-2 border-t border-white/10 leading-relaxed">
                <span className="text-orange-400 font-bold">SYSTEM EXPLAINER:</span> {releaseFeedback.whyExplainer}
              </p>
            </div>

            <button
              onClick={nextPossession}
              className="w-full py-4 bg-orange-500 text-black font-orbitron font-black text-sm rounded-2xl hover:bg-orange-400 transition-all shadow-[0_0_25px_rgba(249,115,22,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              CONTINUE GAME
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {phase === 'GAME_OVER' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-black/90 backdrop-blur-lg">
          <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-950 border border-orange-500/60 shadow-[0_0_100px_rgba(249,115,22,0.4)] space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-bold">
                FINAL SCORECARD
              </span>
              <h2 className="text-3xl font-orbitron font-black text-white mt-1">
                {playerScore >= targetScore ? 'STREET DUEL CHAMPION' : 'DEFEATED BY RIVAL'}
              </h2>
              <p className="text-xs font-mono text-zinc-400 mt-2">
                FINAL: YOU {playerScore} - {aiScore} RIVAL
              </p>
            </div>

            <button
              onClick={restartGame}
              className="w-full py-4 bg-orange-500 text-black font-orbitron font-black text-sm rounded-2xl hover:bg-orange-400 transition-all shadow-[0_0_35px_rgba(249,115,22,0.5)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              PLAY REMATCH TO 21
            </button>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="relative z-10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {phase === 'OFFENSE_DRIBBLE' && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => executeDribbleMove('CROSSOVER')}
                className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:border-orange-500 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                CROSSOVER
              </button>
              <button
                onClick={() => executeDribbleMove('BEHIND_BACK')}
                className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:border-orange-500 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                BEHIND THE BACK
              </button>
              <button
                onClick={() => executeDribbleMove('STEPBACK')}
                className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-orange-400 hover:border-orange-500 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                STEP-BACK 3PT
              </button>
              <button
                onClick={() => executeDribbleMove('HESITATION')}
                className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:border-orange-500 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                HESITATION
              </button>
            </div>

            <button
              onClick={startJumpShot}
              className="px-8 py-4 rounded-2xl bg-orange-500 text-black font-orbitron font-black text-sm tracking-wider hover:bg-orange-400 transition-all shadow-[0_0_35px_rgba(249,115,22,0.4)] flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>RISE UP & SHOOT</span>
            </button>
          </>
        )}

        {phase === 'SHOT_TIMING' && (
          <div className="w-full flex items-center justify-between gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-orange-400 font-bold">RELEASE AT GREEN APEX (80%)</span>
                <span className="text-white font-bold">{shotMeter}%</span>
              </div>
              <div className="h-4 rounded-full bg-white/10 relative overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-[#00FF9D] transition-all"
                  style={{ width: `${shotMeter}%` }}
                />
                <div className="absolute top-0 bottom-0 left-[80%] w-1.5 bg-white shadow-[0_0_10px_white]" />
              </div>
            </div>

            <button
              onClick={() => releaseJumpShot()}
              className="px-8 py-4 rounded-2xl bg-[#00FF9D] text-black font-orbitron font-black text-sm tracking-wider hover:scale-105 transition-all shadow-[0_0_35px_rgba(0,255,157,0.5)] cursor-pointer"
            >
              RELEASE SHOT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
