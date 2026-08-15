import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, 
  Award, Play, Zap, Trophy, Timer
} from 'lucide-react';
import { SoundJuice } from '../../lib/judgeScoring';

interface CourtCarnivalModeProps {
  onBack: () => void;
}

type MiniEvent = {
  id: string;
  name: string;
  sport: string;
  instruction: string;
  targetCount: number;
  durationSec: number;
  icon: string;
};

const MINI_EVENTS: MiniEvent[] = [
  { id: 'SNIPER_HOOP', name: 'RIM TARGET SNIPER', sport: 'BASKETBALL', instruction: 'Tap the moving glowing rims before they disappear!', targetCount: 8, durationSec: 10, icon: '🏀' },
  { id: 'SPEED_REFLEX_KEEPER', name: 'GOALIE FLASH REFLEX', sport: 'SOCCER', instruction: 'React to lightning penalty blasts in the corners!', targetCount: 6, durationSec: 10, icon: '⚽' },
  { id: 'CONE_SLALOM', name: 'DIZZY CONE SLALOM', sport: 'FOOTBALL', instruction: 'Alternate left and right rapid cuts through the pylons!', targetCount: 10, durationSec: 8, icon: '🏈' },
  { id: 'FIRE_DUNK', name: 'DUNK OVER FIRE', sport: 'DUNK CONTEST', instruction: 'Time the apex launch over the blazing flame pit!', targetCount: 3, durationSec: 10, icon: '🔥' }
];

export const CourtCarnivalMode: React.FC<CourtCarnivalModeProps> = ({ onBack }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentEventIdx, setCurrentEventIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [eventTimeRemaining, setEventTimeRemaining] = useState<number>(10);
  const [completedHits, setCompletedHits] = useState<number>(0);
  const [carnivalTotalScore, setCarnivalTotalScore] = useState<number>(0);

  // Carnival Summary
  const [carnivalSummary, setCarnivalSummary] = useState<{
    grade: string;
    totalScore: number;
    completedEvents: number;
    whyExplainer: string;
  } | null>(null);

  const activeEvent = MINI_EVENTS[currentEventIdx];

  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);

  const resolveEventEnd = useCallback((isCleared: boolean = false) => {
    setIsPlaying(false);

    if (currentEventIdx + 1 < MINI_EVENTS.length) {
      // Advance to next mini event
      setTimeout(() => {
        setCurrentEventIdx(prev => prev + 1);
        setCompletedHits(0);
        setEventTimeRemaining(MINI_EVENTS[currentEventIdx + 1].durationSec);
      }, 1000);
    } else {
      // Carnival Complete!
      const total = carnivalTotalScore + (isCleared ? 500 : 0);
      setCarnivalSummary({
        grade: total >= 3500 ? 'CARNIVAL CHAMPION // S+' : 'PARTY ACE // GOLD',
        totalScore: total,
        completedEvents: MINI_EVENTS.length,
        whyExplainer: 'Rapid adaptation across multi-sport micro challenges maintained high combo tempo.'
      });
      playSfx(() => SoundJuice.playVictory());
    }
  }, [currentEventIdx, carnivalTotalScore, playSfx]);

  // Mini-Event Clock
  useEffect(() => {
    if (isPlaying && eventTimeRemaining > 0) {
      const timer = setInterval(() => {
        setEventTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            resolveEventEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isPlaying, eventTimeRemaining, resolveEventEnd]);

  const startCurrentEvent = () => {
    setIsPlaying(true);
    setEventTimeRemaining(activeEvent.durationSec);
    setCompletedHits(0);
    playSfx(() => SoundJuice.playZoneBeep());
  };

  const handleMiniEventAction = () => {
    if (!isPlaying) return;

    playSfx(() => SoundJuice.playHit());
    const nextHits = completedHits + 1;
    setCompletedHits(nextHits);
    setCarnivalTotalScore(s => s + 250);

    if (nextHits >= activeEvent.targetCount) {
      // Event cleared early!
      playSfx(() => SoundJuice.playVictory());
      setCarnivalTotalScore(s => s + 500); // speed bonus
      resolveEventEnd(true);
    }
  };

  const restartCarnival = () => {
    setCurrentEventIdx(0);
    setIsPlaying(false);
    setCompletedHits(0);
    setCarnivalTotalScore(0);
    setCarnivalSummary(null);
  };

  return (
    <div className="relative w-full h-[720px] rounded-3xl overflow-hidden bg-[#1E0E2B] border border-white/10 flex flex-col justify-between shadow-2xl">
      {/* Top Carnival HUD */}
      <div className="relative z-10 p-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-white hover:border-yellow-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/40 font-bold uppercase">
                COURT CARNIVAL // PARTY SPORT CHAOS
              </span>
              <span className="text-xs font-mono text-zinc-400">• EVENT {currentEventIdx + 1} OF {MINI_EVENTS.length}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase tracking-tight mt-0.5">
              {activeEvent.name}
            </h1>
          </div>
        </div>

        {/* Timer & Score */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-2">
            <Timer className="w-4 h-4 text-yellow-400" />
            <span className="text-lg font-orbitron font-black text-white">{eventTimeRemaining}s</span>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-lg font-orbitron font-black text-yellow-400">{carnivalTotalScore}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-yellow-400" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
          </button>
        </div>
      </div>

      {/* Main Carnival Mini Challenge Canvas */}
      <div className="relative flex-1 mx-6 rounded-3xl bg-zinc-950/80 border border-yellow-500/20 overflow-hidden flex flex-col justify-between p-6">
        <div className="relative w-full h-56 sm:h-64 rounded-2xl bg-gradient-to-b from-[#31114d] to-[#1b082c] border border-white/10 overflow-hidden flex flex-col items-center justify-center space-y-4">
          <div className="text-5xl animate-bounce">{activeEvent.icon}</div>
          
          <div className="text-center space-y-1 max-w-md">
            <div className="text-xs font-mono text-yellow-300 font-bold uppercase tracking-wider">
              {activeEvent.sport} CHALLENGE
            </div>
            <p className="text-sm font-orbitron text-white font-black">
              {activeEvent.instruction}
            </p>
          </div>

          {isPlaying && (
            <div className="px-6 py-2 rounded-full bg-black/70 border border-yellow-400 flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-300">PROGRESS:</span>
              <span className="text-base font-orbitron font-black text-yellow-400">
                {completedHits} / {activeEvent.targetCount} CLEARED
              </span>
            </div>
          )}
        </div>

        {/* Event Progress Bar */}
        <div className="space-y-1 pt-4">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-zinc-400">MINI-EVENT COMPLETION:</span>
            <span className="text-yellow-400 font-bold">{Math.round((completedHits / activeEvent.targetCount) * 100)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-pink-500 transition-all"
              style={{ width: `${Math.min(100, (completedHits / activeEvent.targetCount) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Carnival Summary Modal */}
      {carnivalSummary && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-950 border border-yellow-400/40 shadow-[0_0_80px_rgba(250,204,21,0.3)] space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 flex items-center justify-center mx-auto">
              <Award className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest font-bold">
                CARNIVAL SHOWDOWN REPORT
              </span>
              <h2 className="text-2xl sm:text-3xl font-orbitron font-black text-white mt-1">
                {carnivalSummary.grade}
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-left">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">TOTAL SCORE:</span>
                <span className="font-bold text-yellow-400">{carnivalSummary.totalScore} PTS</span>
              </div>
              <p className="text-[11px] font-mono text-zinc-300 pt-2 border-t border-white/10 leading-relaxed">
                <span className="text-yellow-400 font-bold">EXPLAINER:</span> {carnivalSummary.whyExplainer}
              </p>
            </div>

            <button
              onClick={restartCarnival}
              className="w-full py-4 bg-yellow-400 text-black font-orbitron font-black text-sm rounded-2xl hover:bg-yellow-300 transition-all shadow-[0_0_25px_rgba(250,204,21,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              PLAY CARNIVAL AGAIN
            </button>
          </div>
        </div>
      )}

      {/* Bottom Action Trigger Button */}
      <div className="relative z-10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs font-mono text-zinc-400">
          EVENT SPEED: <span className="text-yellow-400 font-bold">TURBO MULTIPLIER ACTIVE</span>
        </div>

        {!isPlaying ? (
          <button
            onClick={startCurrentEvent}
            className="px-8 py-4 rounded-2xl bg-yellow-400 text-black font-orbitron font-black text-sm tracking-wider hover:bg-yellow-300 transition-all shadow-[0_0_35px_rgba(250,204,21,0.4)] flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>START MINI-CHALLENGE</span>
          </button>
        ) : (
          <button
            onClick={handleMiniEventAction}
            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-pink-500 text-black font-orbitron font-black text-base tracking-wider hover:scale-105 transition-all shadow-[0_0_35px_rgba(250,204,21,0.5)] active:scale-95 flex items-center gap-2 cursor-pointer select-none"
          >
            <Zap className="w-5 h-5 fill-black" />
            <span>HIT ACTION TARGET!</span>
          </button>
        )}
      </div>
    </div>
  );
};
