import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Sparkles,
  Dribbble, Shield, CircleDot, Trophy, Music, Flame, Swords, Box,
  Waves, Flag, Film
} from 'lucide-react';
import { TennisMode } from './TennisMode';
import { FootballMode } from './FootballMode';
import { SoccerMode } from './SoccerMode';
import { BaseballMode } from './BaseballMode';
import { GymnasticsMode } from './GymnasticsMode';
import { DanceRhythmMode } from './DanceRhythmMode';
import { SnowboardMode } from './SnowboardMode';
import { KarateMode } from './KarateMode';
import { BabylonDunkMode } from './BabylonDunkMode';
import { BabylonKarate3DMode } from './BabylonKarate3DMode';
import { GolfPrecisionMode } from './GolfPrecisionMode';
import { BasketballStreetDuelMode } from './BasketballStreetDuelMode';
import { SurfingMode } from './SurfingMode';
import { SkateboardingMode } from './SkateboardingMode';
import { VolleyballMode } from './VolleyballMode';
import { CourtCarnivalMode } from './CourtCarnivalMode';
import { WhoSceneItMode } from './WhoSceneItMode';
import { MasteryLadderView } from './MasteryLadderView';
import BrainBrawl from '../BrainBrawl';

export type ActiveSportMode = 
  | 'select' 
  | 'mastery_ladder'
  | 'basketball_duel'
  | 'babylon_dunk'
  | 'babylon_karate'
  | 'golf_precision'
  | 'surfing'
  | 'skateboarding'
  | 'volleyball'
  | 'court_carnival'
  | 'who_scene_it'
  | 'tennis' 
  | 'football' 
  | 'soccer' 
  | 'baseball' 
  | 'gymnastics' 
  | 'dance' 
  | 'snowboard' 
  | 'karate'
  | 'brain_brawl';

interface ModeManagerProps {
  initialMode?: ActiveSportMode;
  /**
   * Lets the shell (App) know which mode is live so it can get its own
   * chrome (padding, max-width) out of the way for full-bleed 3D modes
   * without ModeManager needing to know anything about the shell.
   */
  onModeChange?: (mode: ActiveSportMode) => void;
}

export const ModeManager: React.FC<ModeManagerProps> = ({ initialMode = 'babylon_dunk', onModeChange }) => {
  const [activeMode, setActiveMode] = useState<ActiveSportMode>(initialMode);

  useEffect(() => {
    onModeChange?.(activeMode);
  }, [activeMode, onModeChange]);

  return (
    <div className={activeMode === 'babylon_dunk' ? 'w-full h-full min-h-0' : 'w-full space-y-6'}>
      {/* Mode Sub-Router */}
      <AnimatePresence mode="wait">
        {activeMode === 'select' && (
          <motion.div
            key="selector"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header / Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-8 rounded-3xl bg-zinc-950/80 border border-white/10 gap-6 shadow-2xl">
              <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#00F2FF] px-2.5 py-0.5 rounded-full bg-[#00F2FF]/10 border border-[#00F2FF]/30 font-bold uppercase">
                  ATHLETE OS // VENICE NIGHT COURT
                </span>
              </div>
              <h2 className="font-orbitron text-2xl sm:text-3xl font-black uppercase text-white mt-1">
                CHOOSE YOUR ARENA DISCIPLINE
              </h2>
              <p className="text-xs font-mono text-zinc-400 mt-1 max-w-2xl">
                Every mode delivers complete sport fantasy with real skill expression, explainable outcomes, and measurable athlete progression.
              </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setActiveMode('mastery_ladder')}
                  className="px-5 py-3 rounded-2xl bg-[#00FF9D]/10 hover:bg-[#00FF9D]/20 text-[#00FF9D] border border-[#00FF9D]/40 font-mono text-xs font-bold transition-all flex items-center gap-2 min-h-[44px] cursor-pointer shadow-[0_0_20px_rgba(0,255,157,0.15)]"
                >
                  <Trophy className="w-4 h-4 text-[#00FF9D]" />
                  ATHLETE MASTERY LADDER
                </button>

              </div>
            </div>

            {/* Sport Modes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* 1. VENICE NIGHT DUNK CONTEST */}
              <div 
                onClick={() => setActiveMode('babylon_dunk')}
                className="group relative p-6 rounded-3xl bg-zinc-950/90 border border-[#00F2FF]/60 hover:border-[#00F2FF] transition-all cursor-pointer overflow-hidden shadow-[0_0_30px_rgba(0,242,255,0.15)] hover:shadow-[0_0_40px_rgba(0,242,255,0.35)] flex flex-col justify-between min-h-[230px]"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-[#00F2FF]/20 rounded-full blur-2xl group-hover:bg-[#00F2FF]/30 transition-all pointer-events-none" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#00F2FF]/20 border border-[#00F2FF]/40 flex items-center justify-center text-[#00F2FF] group-hover:scale-110 transition-transform">
                      <Box className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#00F2FF] text-black font-black uppercase tracking-wider shadow-[0_0_15px_rgba(0,242,255,0.5)]">
                      VENICE NIGHT
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-[#00F2FF] transition-colors flex items-center gap-2">
                    SLAM DUNK CONTEST
                  </h3>
                  <p className="text-xs font-mono text-zinc-300 mt-1.5 leading-relaxed">
                    Venice Beach night court. Run the floor, plant the gather, finish at the rim. Eastbay Master Standard is the CASE comparison, not the toy.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                  <span className="text-[10px] font-mono text-[#00F2FF] font-bold">REGULATION 3.05M • DUNK CAM</span>
                  <span className="text-xs font-mono font-bold text-black bg-[#00F2FF] px-3 py-1 rounded-xl flex items-center gap-1 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                    PLAY 3D <Play className="w-3.5 h-3.5 fill-black" />
                  </span>
                </div>
              </div>

              {/* 2. BASKETBALL H2H (Street Duel 1v1) */}
              <div 
                onClick={() => setActiveMode('basketball_duel')}
                className="group relative p-6 rounded-3xl bg-zinc-950/90 border border-orange-500/50 hover:border-orange-400 transition-all cursor-pointer overflow-hidden shadow-[0_0_20px_rgba(249,115,22,0.1)] hover:shadow-[0_0_30px_rgba(249,115,22,0.25)] flex flex-col justify-between min-h-[230px]"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-orange-500/15 rounded-full blur-2xl group-hover:bg-orange-500/25 transition-all pointer-events-none" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                      <Flame className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-orange-500 text-black font-black uppercase tracking-wider">
                      STREET DUEL
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-orange-400 transition-colors">
                    BASKETBALL H2H 1v1
                  </h3>
                  <p className="text-xs font-mono text-zinc-300 mt-1.5 leading-relaxed">
                    Isolation street dominance. Crossovers, step-backs, ankle breakers, and clutch buzzer-beater timing windows under pressure.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                  <span className="text-[10px] font-mono text-orange-400 font-bold">RUCKER PARK • ISOLATION</span>
                  <span className="text-xs font-mono font-bold text-black bg-orange-500 px-3 py-1 rounded-xl flex items-center gap-1 group-hover:scale-105 transition-transform">
                    PLAY 1v1 <Play className="w-3.5 h-3.5 fill-black" />
                  </span>
                </div>
              </div>

              {/* 3. GOLF PRECISION & COURSE INTELLIGENCE */}
              <div 
                onClick={() => setActiveMode('golf_precision')}
                className="group relative p-6 rounded-3xl bg-zinc-950/90 border border-emerald-500/50 hover:border-emerald-400 transition-all cursor-pointer overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] flex flex-col justify-between min-h-[230px]"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl group-hover:bg-emerald-500/25 transition-all pointer-events-none" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <Flag className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#00FF9D] text-black font-black uppercase tracking-wider">
                      COURSE INTEL
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-emerald-400 transition-colors">
                    GOLF PRECISION 18
                  </h3>
                  <p className="text-xs font-mono text-zinc-300 mt-1.5 leading-relaxed">
                    3-click tempo swing mechanics. Club selection (Driver to Wedge), wind drift vectors, and detailed SwingReport contact physics.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">PINE VALLEY • LINKS 18</span>
                  <span className="text-xs font-mono font-bold text-black bg-[#00FF9D] px-3 py-1 rounded-xl flex items-center gap-1 group-hover:scale-105 transition-transform">
                    PLAY GOLF <Play className="w-3.5 h-3.5 fill-black" />
                  </span>
                </div>
              </div>

              {/* 4. SURFING (Flow-State Wave Express) */}
              <div 
                onClick={() => setActiveMode('surfing')}
                className="group relative p-6 rounded-3xl bg-zinc-950/90 border border-cyan-500/50 hover:border-cyan-400 transition-all cursor-pointer overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:shadow-[0_0_30px_rgba(6,182,212,0.25)] flex flex-col justify-between min-h-[230px]"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/15 rounded-full blur-2xl group-hover:bg-cyan-500/25 transition-all pointer-events-none" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                      <Waves className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-cyan-400 text-black font-black uppercase tracking-wider">
                      FLOW-STATE
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-cyan-400 transition-colors">
                    SURFING WAVE EXPRESS
                  </h3>
                  <p className="text-xs font-mono text-zinc-300 mt-1.5 leading-relaxed">
                    Fluid water rhythm on Pipeline swells. Bottom turns, top snaps, barrel tube rides, and air reverses with 3x Flow multiplier.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">NORTH SHORE • REEF HEATS</span>
                  <span className="text-xs font-mono font-bold text-black bg-cyan-400 px-3 py-1 rounded-xl flex items-center gap-1 group-hover:scale-105 transition-transform">
                    SURF WAVE <Play className="w-3.5 h-3.5 fill-black" />
                  </span>
                </div>
              </div>

              {/* 5. SKATEBOARDING (Street Lines & Identity) */}
              <div 
                onClick={() => setActiveMode('skateboarding')}
                className="group relative p-6 rounded-3xl bg-zinc-950/90 border border-amber-500/50 hover:border-amber-400 transition-all cursor-pointer overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] flex flex-col justify-between min-h-[230px]"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl group-hover:bg-amber-500/25 transition-all pointer-events-none" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                      <Flame className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-400 text-black font-black uppercase tracking-wider">
                      STREET LINES
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-amber-400 transition-colors">
                    SKATEBOARDING PLAZA
                  </h3>
                  <p className="text-xs font-mono text-zinc-300 mt-1.5 leading-relaxed">
                    Urban trick lines and manual balance meters. Chain 360 Flips into 50-50 grinds with risk/reward bailout physics.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                  <span className="text-[10px] font-mono text-amber-400 font-bold">LOVE PARK • DOWNTOWN</span>
                  <span className="text-xs font-mono font-bold text-black bg-amber-400 px-3 py-1 rounded-xl flex items-center gap-1 group-hover:scale-105 transition-transform">
                    DROP IN <Play className="w-3.5 h-3.5 fill-black" />
                  </span>
                </div>
              </div>

              {/* 6. VOLLEYBALL (Rally Discipline) */}
              <div 
                onClick={() => setActiveMode('volleyball')}
                className="group relative p-6 rounded-3xl bg-zinc-950/90 border border-pink-500/50 hover:border-pink-400 transition-all cursor-pointer overflow-hidden shadow-[0_0_20px_rgba(236,72,153,0.1)] hover:shadow-[0_0_30px_rgba(236,72,153,0.25)] flex flex-col justify-between min-h-[230px]"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-pink-500/15 rounded-full blur-2xl group-hover:bg-pink-500/25 transition-all pointer-events-none" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                      <Shield className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-pink-500 text-black font-black uppercase tracking-wider">
                      RALLY DISCIPLINE
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-pink-400 transition-colors">
                    VOLLEYBALL FINALS
                  </h3>
                  <p className="text-xs font-mono text-zinc-300 mt-1.5 leading-relaxed">
                    Bump, set, spike 3-touch flow. Composure under scramble defense, setter isolation timing, and terminal bounce spikes.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                  <span className="text-[10px] font-mono text-pink-400 font-bold">TOKYO ARENA • MATCH POINT</span>
                  <span className="text-xs font-mono font-bold text-black bg-pink-500 px-3 py-1 rounded-xl flex items-center gap-1 group-hover:scale-105 transition-transform">
                    PLAY VOLLEY <Play className="w-3.5 h-3.5 fill-black" />
                  </span>
                </div>
              </div>

              {/* 7. COURT CARNIVAL (Party Sport Chaos) */}
              <div 
                onClick={() => setActiveMode('court_carnival')}
                className="group relative p-6 rounded-3xl bg-zinc-950/90 border border-yellow-500/50 hover:border-yellow-400 transition-all cursor-pointer overflow-hidden shadow-[0_0_20px_rgba(234,179,8,0.1)] hover:shadow-[0_0_30px_rgba(234,179,8,0.25)] flex flex-col justify-between min-h-[230px]"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-yellow-500/15 rounded-full blur-2xl group-hover:bg-yellow-500/25 transition-all pointer-events-none" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-yellow-400 text-black font-black uppercase tracking-wider">
                      PARTY CHAOS
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-yellow-400 transition-colors">
                    COURT CARNIVAL
                  </h3>
                  <p className="text-xs font-mono text-zinc-300 mt-1.5 leading-relaxed">
                    Rapid context switching across 6 high-tempo mini-challenges: rim target snipers, goalie reflex, and cone slaloms.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                  <span className="text-[10px] font-mono text-yellow-400 font-bold">MULTI-EVENT • TURBO SPEED</span>
                  <span className="text-xs font-mono font-bold text-black bg-yellow-400 px-3 py-1 rounded-xl flex items-center gap-1 group-hover:scale-105 transition-transform">
                    ENTER CARNIVAL <Play className="w-3.5 h-3.5 fill-black" />
                  </span>
                </div>
              </div>

              {/* 8. WHO SCENE IT (Cinematic Memory Showdown) */}
              <div 
                onClick={() => setActiveMode('who_scene_it')}
                className="group relative p-6 rounded-3xl bg-zinc-950/90 border border-purple-500/50 hover:border-purple-400 transition-all cursor-pointer overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] flex flex-col justify-between min-h-[230px]"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/15 rounded-full blur-2xl group-hover:bg-purple-500/25 transition-all pointer-events-none" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      <Film className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-purple-500 text-black font-black uppercase tracking-wider">
                      MEMORY SHOWDOWN
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-purple-400 transition-colors">
                    WHO SCENE IT
                  </h3>
                  <p className="text-xs font-mono text-zinc-300 mt-1.5 leading-relaxed">
                    Cinematic sports memory showdown. Fast buzzer recognition, confidence wager multipliers, and historic moment recall.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                  <span className="text-[10px] font-mono text-purple-400 font-bold">ARCHIVE THEATER • 3x WAGER</span>
                  <span className="text-xs font-mono font-bold text-black bg-purple-500 px-3 py-1 rounded-xl flex items-center gap-1 group-hover:scale-105 transition-transform">
                    PLAY SHOWDOWN <Play className="w-3.5 h-3.5 fill-black" />
                  </span>
                </div>
              </div>

              {/* 9. CYBER DOJO KARATE */}
              <div 
                onClick={() => setActiveMode('babylon_karate')}
                className="group relative p-6 rounded-3xl bg-zinc-950/90 border border-red-500/60 hover:border-red-500 transition-all cursor-pointer overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.15)] hover:shadow-[0_0_40px_rgba(239,68,68,0.35)] flex flex-col justify-between min-h-[230px]"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-red-500/20 rounded-full blur-2xl group-hover:bg-red-500/30 transition-all pointer-events-none" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                      <Swords className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-red-500 text-black font-black uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                      CYBER DOJO
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-red-400 transition-colors">
                    CYBER DOJO KARATE
                  </h3>
                  <p className="text-xs font-mono text-zinc-300 mt-1.5 leading-relaxed">
                    Full 3D Tatami ring with Torii gate. Directional strikes, parry shields, combo chains, and KO physics in real-time WebGL.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                  <span className="text-[10px] font-mono text-red-400 font-bold">3D TATAMI • REAL COMBAT</span>
                  <span className="text-xs font-mono font-bold text-black bg-red-500 px-3 py-1 rounded-xl flex items-center gap-1 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                    PLAY 3D <Play className="w-3.5 h-3.5 fill-black" />
                  </span>
                </div>
              </div>

              {/* 10. BASEBALL DERBY */}
              <div 
                onClick={() => setActiveMode('baseball')}
                className="group relative p-6 rounded-3xl bg-zinc-950/80 border border-amber-500/30 hover:border-amber-500 transition-all cursor-pointer overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.05)] hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40">
                      POWER DERBY
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-amber-400 transition-colors">
                    BASEBALL POWER DERBY
                  </h3>
                  <p className="text-xs font-mono text-zinc-400 mt-1.5 leading-relaxed">
                    The Show style Plate Coverage Indicator. Precision swing timing, pitch tracking, and 500+ FT moonshots!
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                  <span className="text-[10px] font-mono text-zinc-500">PCI SWEETSPOT</span>
                  <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    LAUNCH <Play className="w-3.5 h-3.5 fill-current" />
                  </span>
                </div>
              </div>

              {/* 11. FOOTBALL 7v7 */}
              <div 
                onClick={() => setActiveMode('football')}
                className="group relative p-6 rounded-3xl bg-zinc-950/80 border border-orange-500/30 hover:border-orange-500 transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                      <Shield className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40">
                      GRIDIRON
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-orange-400 transition-colors">
                    FOOTBALL 7v7
                  </h3>
                  <p className="text-xs font-mono text-zinc-400 mt-1.5 leading-relaxed">
                    Madden-lite arcade passing & rush engine. Pre-snap play calls, lead passing arcs, and ball carrier jukes.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                  <span className="text-[10px] font-mono text-zinc-500">FIELD VISION</span>
                  <span className="text-xs font-mono font-bold text-orange-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    LAUNCH <Play className="w-3.5 h-3.5 fill-current" />
                  </span>
                </div>
              </div>

              {/* 12. SOCCER STRIKER */}
              <div 
                onClick={() => setActiveMode('soccer')}
                className="group relative p-6 rounded-3xl bg-zinc-950/80 border border-emerald-500/30 hover:border-emerald-500 transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <Dribbble className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
                      PENALTY & STRIKER
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-emerald-400 transition-colors">
                    SOCCER STRIKER
                  </h3>
                  <p className="text-xs font-mono text-zinc-400 mt-1.5 leading-relaxed">
                    Mario Strikers arcade action. 360° dribbling, slide tackles, curve shots, and full-power Hyper Strikes!
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                  <span className="text-[10px] font-mono text-zinc-500">STRIKER INTENT</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    LAUNCH <Play className="w-3.5 h-3.5 fill-current" />
                  </span>
                </div>
              </div>

              {/* 13. TENNIS OPEN */}
              <div 
                onClick={() => setActiveMode('tennis')}
                className="group relative p-6 rounded-3xl bg-zinc-950/80 border border-[#00F2FF]/30 hover:border-[#00F2FF] transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#00F2FF]/10 border border-[#00F2FF]/30 flex items-center justify-center text-[#00F2FF] group-hover:scale-110 transition-transform">
                      <CircleDot className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#00F2FF]/20 text-[#00F2FF] font-bold border border-[#00F2FF]/40">
                      RALLY CONTROL
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-[#00F2FF] transition-colors">
                    TENNIS OPEN
                  </h3>
                  <p className="text-xs font-mono text-zinc-400 mt-1.5 leading-relaxed">
                    Mario Tennis Aces shot-shaping (Topspin, Slice, Lob, Drop, Zone Shot) with real-time scoring.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                  <span className="text-[10px] font-mono text-zinc-500">RALLY CAM</span>
                  <span className="text-xs font-mono font-bold text-[#00F2FF] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    LAUNCH <Play className="w-3.5 h-3.5 fill-current" />
                  </span>
                </div>
              </div>

              {/* 14. GYMNASTICS VAULT */}
              <div 
                onClick={() => setActiveMode('gymnastics')}
                className="group relative p-6 rounded-3xl bg-zinc-950/80 border border-cyan-500/30 hover:border-cyan-500 transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40">
                      JUDGED ARTISTRY
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-cyan-400 transition-colors">
                    GYMNASTICS VAULT
                  </h3>
                  <p className="text-xs font-mono text-zinc-400 mt-1.5 leading-relaxed">
                    Olympic Vault Finals. Runway sprint velocity, springboard hurdle timing, and stick-the-landing precision!
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                  <span className="text-[10px] font-mono text-zinc-500">EXECUTION GRADE</span>
                  <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    LAUNCH <Play className="w-3.5 h-3.5 fill-current" />
                  </span>
                </div>
              </div>

              {/* 15. CYBER DANCE REVOLUTION */}
              <div 
                onClick={() => setActiveMode('dance')}
                className="group relative p-6 rounded-3xl bg-zinc-950/80 border border-pink-500/30 hover:border-pink-500 transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                      <Music className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-400 font-bold border border-pink-500/40">
                      RHYTHM TEMPO
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-pink-400 transition-colors">
                    CYBER DANCE REVOLUTION
                  </h3>
                  <p className="text-xs font-mono text-zinc-400 mt-1.5 leading-relaxed">
                    Beat-matching rhythm engine with 4-lane highway cascades, Marvelous timing windows, and Fever combos!
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                  <span className="text-[10px] font-mono text-zinc-500">BPM TEMPO</span>
                  <span className="text-xs font-mono font-bold text-pink-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    LAUNCH <Play className="w-3.5 h-3.5 fill-current" />
                  </span>
                </div>
              </div>

              {/* 16. SNOWBOARD FREERIDE */}
              <div 
                onClick={() => setActiveMode('snowboard')}
                className="group relative p-6 rounded-3xl bg-zinc-950/80 border border-teal-500/30 hover:border-teal-500 transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                      <Flame className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-400 font-bold border border-teal-500/40">
                      EXTREME FLOW
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-teal-400 transition-colors">
                    SNOWBOARD FREERIDE
                  </h3>
                  <p className="text-xs font-mono text-zinc-400 mt-1.5 leading-relaxed">
                    SSX-style freeride & halfpipe exaggeration. Carve slopes, rail grinds, aerial spin combos, and 3x Tricky Overdrive!
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                  <span className="text-[10px] font-mono text-zinc-500">PEAK OVERDRIVE</span>
                  <span className="text-xs font-mono font-bold text-teal-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    LAUNCH <Play className="w-3.5 h-3.5 fill-current" />
                  </span>
                </div>
              </div>

              {/* 17. CYBER DOJO // KARATE */}
              <div 
                onClick={() => setActiveMode('karate')}
                className="group relative p-6 rounded-3xl bg-zinc-950/80 border border-red-500/30 hover:border-red-500 transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                      <Swords className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/40">
                      COMBAT POSTURE
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-red-400 transition-colors">
                    CYBER DOJO // KARATE
                  </h3>
                  <p className="text-xs font-mono text-zinc-400 mt-1.5 leading-relaxed">
                    Soul Calibur weight & posture benchmark. High/Mid/Low strike stances, frame-perfect parry deflects, and Kiai finishers!
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                  <span className="text-[10px] font-mono text-zinc-500">DISCIPLINE TIMING</span>
                  <span className="text-xs font-mono font-bold text-red-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    LAUNCH <Play className="w-3.5 h-3.5 fill-current" />
                  </span>
                </div>
              </div>

              {/* 18. BRAIN BRAWL */}
              <div 
                onClick={() => setActiveMode('brain_brawl')}
                className="group relative p-6 rounded-3xl bg-zinc-950/80 border border-purple-500/30 hover:border-purple-500 transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                      COGNITIVE SPEED
                    </span>
                  </div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase group-hover:text-purple-400 transition-colors">
                    BRAIN BRAWL
                  </h3>
                  <p className="text-xs font-mono text-zinc-400 mt-1.5 leading-relaxed">
                    Rapid cognitive recall & biomechanical trivia wheel with PRQ mental agility delta tracking.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                  <span className="text-[10px] font-mono text-zinc-500">MENTAL AGILITY</span>
                  <span className="text-xs font-mono font-bold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    LAUNCH <Play className="w-3.5 h-3.5 fill-current" />
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 1. Mastery Ladder & Signature Profile Viewport */}
        {activeMode === 'mastery_ladder' && (
          <motion.div
            key="mastery_ladder_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <MasteryLadderView 
              onSelectMode={(mode) => setActiveMode(mode)} 
              onBack={() => setActiveMode('select')} 
            />
          </motion.div>
        )}

        {/* 2. Basketball Street Duel Viewport */}
        {activeMode === 'basketball_duel' && (
          <motion.div
            key="basketball_duel_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <BasketballStreetDuelMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* 3. Golf Precision 18 Viewport */}
        {activeMode === 'golf_precision' && (
          <motion.div
            key="golf_precision_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <GolfPrecisionMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* 4. Surfing Viewport */}
        {activeMode === 'surfing' && (
          <motion.div
            key="surfing_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <SurfingMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* 5. Skateboarding Viewport */}
        {activeMode === 'skateboarding' && (
          <motion.div
            key="skateboarding_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <SkateboardingMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* 6. Volleyball Viewport */}
        {activeMode === 'volleyball' && (
          <motion.div
            key="volleyball_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <VolleyballMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* 7. Court Carnival Viewport */}
        {activeMode === 'court_carnival' && (
          <motion.div
            key="court_carnival_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <CourtCarnivalMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* 8. Who Scene It Viewport */}
        {activeMode === 'who_scene_it' && (
          <motion.div
            key="who_scene_it_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <WhoSceneItMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* Tennis Mode Viewport */}
        {activeMode === 'tennis' && (
          <motion.div
            key="tennis_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <TennisMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* Football Mode Viewport */}
        {activeMode === 'football' && (
          <motion.div
            key="football_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <FootballMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* Soccer Mode Viewport */}
        {activeMode === 'soccer' && (
          <motion.div
            key="soccer_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <SoccerMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* Baseball Mode Viewport */}
        {activeMode === 'baseball' && (
          <motion.div
            key="baseball_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <BaseballMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* Gymnastics Mode Viewport */}
        {activeMode === 'gymnastics' && (
          <motion.div
            key="gymnastics_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <GymnasticsMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* Dance Rhythm Mode Viewport */}
        {activeMode === 'dance' && (
          <motion.div
            key="dance_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <DanceRhythmMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* Snowboard Mode Viewport */}
        {activeMode === 'snowboard' && (
          <motion.div
            key="snowboard_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <SnowboardMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* Karate Combat Mode Viewport */}
        {activeMode === 'karate' && (
          <motion.div
            key="karate_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <KarateMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* Venice Night Dunk Contest Viewport */}
        {activeMode === 'babylon_dunk' && (
          <motion.div
            key="venice_dunk_mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <BabylonDunkMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* Cyber Dojo Karate Viewport */}
        {activeMode === 'babylon_karate' && (
          <motion.div
            key="babylon_karate_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <BabylonKarate3DMode onBack={() => setActiveMode('select')} />
          </motion.div>
        )}

        {/* Brain Brawl Viewport */}
        {activeMode === 'brain_brawl' && (
          <motion.div
            key="brain_brawl_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-4"
          >
            <button
              onClick={() => setActiveMode('select')}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-mono text-xs border border-white/10 min-h-[44px] flex items-center gap-2 cursor-pointer"
            >
              ← RETURN TO SPORT SELECTION
            </button>
            <BrainBrawl />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
