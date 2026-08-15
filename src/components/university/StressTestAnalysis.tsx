import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  ChevronRight, 
  ChevronLeft, 
  Flame, 
  Zap, 
  Film
} from 'lucide-react';
import { STRESS_TEST_CASES } from '../../constants/university_curriculum';
import { StressTestCase } from '../../types/university';

export const StressTestAnalysis: React.FC = () => {
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentCase: StressTestCase = STRESS_TEST_CASES[selectedCaseIndex] || STRESS_TEST_CASES[0];
  const activeFrame = currentCase.keyFrames[activeFrameIndex] || currentCase.keyFrames[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Header Case Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7000FF]/20 border border-[#7000FF]/40 flex items-center justify-center">
            <Film className="w-5 h-5 text-[#00F2FF]" />
          </div>
          <div>
            <h3 className="font-orbitron text-sm font-black tracking-tight text-white uppercase">
              STRESS TEST ANALYSIS BREAKDOWN SERIES
            </h3>
            <p className="text-[10px] font-mono text-zinc-400">
              Real High-Velocity Footage • Blueprint Biomechanical Framework • Kinematic Vector Mapping
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {STRESS_TEST_CASES.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedCaseIndex(idx);
                setActiveFrameIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all border ${
                selectedCaseIndex === idx
                  ? 'bg-[#7000FF]/20 border-[#7000FF] text-[#00F2FF]'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              TEST #{idx + 1}: {item.discipline.split('/')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Breakdown Player & Biomechanical Vector Overlay */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Video / Keyframe Canvas Viewport */}
        <div className="lg:col-span-2 relative aspect-[16/10] bg-[#020508] rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col justify-between p-6">
          {/* Animated Background Grid & Vector Simulation */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-950/80 to-transparent pointer-events-none" />

          {/* Biomechanical Silhouette Simulation */}
          <div className="relative z-10 flex-1 flex items-center justify-center">
            <div className="relative w-64 h-72 border border-[#00F2FF]/20 rounded-2xl flex items-center justify-center overflow-hidden bg-white/[0.01]">
              {/* Center Athlete Silhouette Ring */}
              <div className="absolute w-48 h-48 rounded-full border border-dashed border-[#00F2FF]/30 animate-spin-slow" />
              
              {/* Keyframe Vector Lines */}
              <div className="flex flex-col items-center gap-2 text-center p-4">
                <div className="w-12 h-12 rounded-full bg-[#00F2FF]/10 border border-[#00F2FF]/40 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-[#00F2FF]" />
                </div>
                <div className="font-orbitron text-xs font-black text-white uppercase mt-2">
                  {activeFrame.phase}
                </div>
                <div className="text-[10px] font-mono text-[#00F2FF]">
                  TIMECODE: {activeFrame.timecode}
                </div>
              </div>

              {/* GRF Impulse Vector Arrow (Graphic Overlay) */}
              <div 
                className="absolute bottom-6 right-8 flex flex-col items-center text-[9px] font-mono text-emerald-400 pointer-events-none"
              >
                <div className="w-1 h-16 bg-gradient-to-t from-emerald-400 to-transparent rounded-full" />
                <span className="font-bold">GRF: {currentCase.peakGRF}x BW</span>
              </div>
            </div>
          </div>

          {/* Player Transport Bar */}
          <div className="relative z-20 flex flex-col gap-3 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400">
                ATHLETE: <strong className="text-white">{currentCase.athlete}</strong>
              </span>
              <span className="text-[#00F2FF]">
                FRAME {activeFrameIndex + 1} OF {currentCase.keyFrames.length}
              </span>
            </div>

            {/* Frame Scrub Steps */}
            <div className="grid grid-cols-3 gap-2">
              {currentCase.keyFrames.map((kf, kIdx) => (
                <button
                  key={kf.frameNumber}
                  onClick={() => setActiveFrameIndex(kIdx)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    activeFrameIndex === kIdx
                      ? 'bg-[#00F2FF]/20 border-[#00F2FF] text-white'
                      : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-[8px] font-mono text-zinc-500">{kf.timecode}</div>
                  <div className="font-orbitron text-[9px] font-bold uppercase truncate">{kf.phase}</div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveFrameIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeFrameIndex === 0}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-4 py-2 rounded-xl bg-white text-black font-orbitron font-bold text-[10px] flex items-center gap-1.5 hover:scale-105 transition-all"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isPlaying ? 'PAUSE' : 'PLAY SEQUENCE'}
                </button>
                <button
                  onClick={() => setActiveFrameIndex(prev => Math.min(currentCase.keyFrames.length - 1, prev + 1))}
                  disabled={activeFrameIndex === currentCase.keyFrames.length - 1}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-400">
                <span>SSC EFFICIENCY: <strong className="text-[#00F2FF]">{currentCase.sscEfficiency}%</strong></span>
                <span>GCT: <strong className="text-purple-400">{currentCase.groundContactTime} ms</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Keyframe Biomechanical Breakdown & Blueprint Principles */}
        <div className="flex flex-col gap-4">
          <div className="glass-card p-6 border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-[10px] font-mono text-[#00F2FF] uppercase font-bold tracking-widest">
                KINEMATIC ANGLES
              </span>
              <span className="text-[9px] font-mono text-zinc-500">{activeFrame.timecode}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">KNEE ANGLE</span>
                <span className="text-xl font-orbitron font-black text-white">{activeFrame.jointAngles.knee}°</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">ANKLE DORSI</span>
                <span className="text-xl font-orbitron font-black text-[#00F2FF]">{activeFrame.jointAngles.ankle}°</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">HIP EXTENSION</span>
                <span className="text-xl font-orbitron font-black text-purple-400">{activeFrame.jointAngles.hip}°</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">TRUNK LEAN</span>
                <span className="text-xl font-orbitron font-black text-emerald-400">{activeFrame.jointAngles.trunk}°</span>
              </div>
            </div>

            {/* Blueprint Lesson Connection */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#00F2FF]" />
                THE NEURO-MECHANIC BLUEPRINT LINK:
              </span>
              <div className="p-3.5 rounded-xl bg-[#7000FF]/10 border border-[#7000FF]/20 text-xs text-zinc-200 leading-relaxed font-sans">
                {activeFrame.blueprintPrinciple}
              </div>
            </div>

            {activeFrame.biomechanicalFault && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
                <span className="font-bold">OBSERVED PATTERN: </span>
                {activeFrame.biomechanicalFault}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
