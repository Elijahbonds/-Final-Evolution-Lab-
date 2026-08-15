import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, 
  Award, Play, Waves
} from 'lucide-react';
import { SoundJuice } from '../../lib/judgeScoring';

interface SurfingModeProps {
  onBack: () => void;
}

type Maneuver = 'BOTTOM_TURN' | 'TOP_SNAP' | 'CUTBACK' | 'BARREL_RIDE' | 'AIR_REVERSE';

export const SurfingMode: React.FC<SurfingModeProps> = ({ onBack }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [waveSeconds, setWaveSeconds] = useState<number>(30); // 30s wave ride
  const [isRiding, setIsRiding] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Flow State & Maneuver Chain
  const [flowMultiplier, setFlowMultiplier] = useState<number>(1.0);
  const [activeManeuvers, setActiveManeuvers] = useState<string[]>([]);
  const [totalRideScore, setTotalRideScore] = useState<number>(0);
  const [tubeTimeSeconds, setTubeTimeSeconds] = useState<number>(0);

  // Heat Summary Report
  const [heatReport, setHeatReport] = useState<{
    grade: string;
    finalScore: number;
    maneuversCount: number;
    peakMultiplier: number;
    whyExplainer: string;
  } | null>(null);

  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);

  const finishHeat = useCallback(() => {
    setIsRiding(false);
    setIsFinished(true);

    let grade = 'EXCELLENT 9.2 RIDE';
    let why = 'Flow state sustained with critical rail-to-rail transitions in the pocket.';
    
    if (totalRideScore >= 4500) {
      grade = 'PERFECT 10.0 WAVE';
      why = 'Deep spit tube barrel ride chained directly into aerial reverse above the lip.';
    } else if (totalRideScore < 1500) {
      grade = 'AVERAGE 4.5 WAVE';
      why = 'Maneuver combos disconnected outside of the power pocket.';
    }

    setHeatReport({
      grade,
      finalScore: totalRideScore,
      maneuversCount: activeManeuvers.length,
      peakMultiplier: flowMultiplier,
      whyExplainer: why
    });
  }, [totalRideScore, activeManeuvers.length, flowMultiplier]);

  // Wave Heat Timer
  useEffect(() => {
    if (isRiding && waveSeconds > 0) {
      const timer = setInterval(() => {
        setWaveSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            finishHeat();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isRiding, waveSeconds, finishHeat]);

  const startWave = () => {
    setIsRiding(true);
    setIsFinished(false);
    setWaveSeconds(30);
    setTotalRideScore(0);
    setActiveManeuvers([]);
    setFlowMultiplier(1.0);
    setTubeTimeSeconds(0);
    setHeatReport(null);
    playSfx(() => SoundJuice.playWaveCarve());
  };

  const executeManeuver = (maneuver: Maneuver) => {
    if (!isRiding || isFinished) return;

    let pts = 0;
    if (maneuver === 'BOTTOM_TURN') {
      pts = 200;
      playSfx(() => SoundJuice.playWaveCarve());
    } else if (maneuver === 'TOP_SNAP') {
      pts = 350;
      playSfx(() => SoundJuice.playHit());
    } else if (maneuver === 'CUTBACK') {
      pts = 300;
      playSfx(() => SoundJuice.playWaveCarve());
    } else if (maneuver === 'BARREL_RIDE') {
      pts = 600;
      setTubeTimeSeconds(t => t + 1);
      playSfx(() => SoundJuice.playZoneBeep());
    } else if (maneuver === 'AIR_REVERSE') {
      pts = 800;
      playSfx(() => SoundJuice.playVictory());
    }

    const calculatedPts = Math.round(pts * flowMultiplier);
    setTotalRideScore(s => s + calculatedPts);
    setActiveManeuvers(m => [...m, maneuver]);
    setFlowMultiplier(f => Math.min(3.0, +(f + 0.2).toFixed(1)));
  };

  return (
    <div className="unreal-canvas relative w-full h-[720px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
      {/* Top Surfing HUD */}
      <div className="relative z-10 p-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-white hover:border-cyan-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold uppercase">
                SURFING // FLOW-STATE WAVE
              </span>
              <span className="text-xs font-mono text-zinc-400">• PIPELINE REEF SWELL</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase tracking-tight mt-0.5">
              10-FOOT NORTH SHORE BARREL
            </h1>
          </div>
        </div>

        {/* Heat Clock & Ride Score */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">HEAT CLOCK:</span>
            <span className="text-lg font-orbitron font-black text-white">{waveSeconds}s</span>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">RIDE SCORE:</span>
            <span className="text-lg font-orbitron font-black text-cyan-400">{totalRideScore}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
          </button>
        </div>
      </div>

      {/* Main Swell & Barrel Graphic Canvas */}
      <div className="relative flex-1 mx-6 rounded-3xl bg-zinc-950/80 border border-cyan-500/20 overflow-hidden flex flex-col justify-between p-6">
        {/* Wave Animation Canvas */}
        <div className="relative w-full h-56 sm:h-64 rounded-2xl bg-gradient-to-b from-[#0e486d] to-[#041c2c] border border-white/10 overflow-hidden flex items-center justify-between px-12">
          {/* Swell Contour Lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:28px_28px] opacity-20 pointer-events-none" />

          {/* Surfer Avatar */}
          <div className="z-10 flex flex-col items-center gap-2">
            <div className="relative w-16 h-16 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(6,182,212,0.4)] animate-pulse">
              🏄
            </div>
            <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase">
              FLOW: {flowMultiplier}x MULTIPLIER
            </span>
          </div>

          {/* Barrel Tube */}
          <div className="z-10 flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full border-4 border-dashed border-cyan-400/60 flex items-center justify-center text-2xl shadow-[0_0_40px_rgba(6,182,212,0.3)] animate-spin">
              <Waves className="w-8 h-8 text-cyan-400" />
            </div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase">
              TUBE TIME: {tubeTimeSeconds}s
            </span>
          </div>
        </div>

        {/* Active Maneuver Combo Chain */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 max-w-full">
          <span className="text-[10px] font-mono text-zinc-400 uppercase">MANEUVER CHAIN:</span>
          {activeManeuvers.length === 0 ? (
            <span className="text-xs font-mono text-zinc-500">INITIATE BOTTOM TURN OR TOP SNAP...</span>
          ) : (
            activeManeuvers.map((m, idx) => (
              <span key={idx} className="text-[10px] font-mono px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold whitespace-nowrap">
                {m.replace('_', ' ')}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Heat Report Modal Overlay */}
      {heatReport && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-950 border border-cyan-500/40 shadow-[0_0_80px_rgba(6,182,212,0.3)] space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto">
              <Award className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                HEAT PERFORMANCE SCORECARD
              </span>
              <h2 className="text-3xl font-orbitron font-black text-white mt-1">
                {heatReport.grade}
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-left">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">FINAL WAVE SCORE:</span>
                <span className="font-bold text-cyan-400">{heatReport.finalScore} PTS</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">MANEUVERS LANDED:</span>
                <span className="font-bold text-white">{heatReport.maneuversCount}</span>
              </div>
              <p className="text-[11px] font-mono text-zinc-300 pt-2 border-t border-white/10 leading-relaxed">
                <span className="text-cyan-400 font-bold">JUDGES NOTE:</span> {heatReport.whyExplainer}
              </p>
            </div>

            <button
              onClick={startWave}
              className="w-full py-4 bg-cyan-400 text-black font-orbitron font-black text-sm rounded-2xl hover:bg-cyan-300 transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              PADDLE INTO NEXT WAVE
            </button>
          </div>
        </div>
      )}

      {/* Bottom Maneuver Action Bar */}
      <div className="relative z-10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => executeManeuver('BOTTOM_TURN')}
            disabled={!isRiding}
            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:border-cyan-400 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            BOTTOM TURN
          </button>
          <button
            onClick={() => executeManeuver('TOP_SNAP')}
            disabled={!isRiding}
            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:border-cyan-400 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            TOP SNAP
          </button>
          <button
            onClick={() => executeManeuver('CUTBACK')}
            disabled={!isRiding}
            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:border-cyan-400 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            ROUNDHOUSE CUTBACK
          </button>
          <button
            onClick={() => executeManeuver('BARREL_RIDE')}
            disabled={!isRiding}
            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-cyan-400 hover:border-cyan-400 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            PULL INTO TUBE
          </button>
          <button
            onClick={() => executeManeuver('AIR_REVERSE')}
            disabled={!isRiding}
            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-pink-400 hover:border-pink-400 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            AIR REVERSE 360
          </button>
        </div>

        {!isRiding && !heatReport && (
          <button
            onClick={startWave}
            className="px-8 py-4 rounded-2xl bg-cyan-400 text-black font-orbitron font-black text-sm tracking-wider hover:bg-cyan-300 transition-all shadow-[0_0_35px_rgba(6,182,212,0.4)] flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>PADDLE OUT</span>
          </button>
        )}
      </div>
    </div>
  );
};
