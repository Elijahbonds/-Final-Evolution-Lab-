import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, Flame, Zap, Shield, Target, Play, 
  Sparkles, Award, TrendingUp, CheckCircle2, Share2, Compass,
  Layers, Swords, HeartHandshake, Cpu, Palette, Info
} from 'lucide-react';
import { ActiveSportMode } from './ModeManager';
import { 
  CANONICAL_ATHLETE_SKINS, 
  RIVAL_VANE_PROFILE, 
  COMPANION_SPECIES_EVOLUTION,
  TECHNICAL_RIG_SPECIFICATION
} from '../../constants/asset_brief_specs';

interface MasteryLadderViewProps {
  onSelectMode: (mode: ActiveSportMode) => void;
  onBack: () => void;
}

interface SportMasteryRecord {
  id: ActiveSportMode;
  name: string;
  category: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  level: number;
  maxLevel: number;
  prqBonus: number;
  highlightStat: string;
  signatureStyle: 'CLUTCH' | 'TECHNICAL' | 'AGGRESSIVE' | 'STRATEGIC';
  recentGrade: string;
  recentExplainer: string;
  icon: string;
}

export const MasteryLadderView: React.FC<MasteryLadderViewProps> = ({ onSelectMode, onBack }) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CLUTCH' | 'TECHNICAL' | 'AGGRESSIVE' | 'STRATEGIC'>('ALL');
  const [activeTab, setActiveTab] = useState<'LADDER' | 'RADAR' | 'HIGHLIGHTS' | 'SKINS_VANE' | 'COMPANIONS' | 'PIPELINE'>('LADDER');
  const [selectedSkinId, setSelectedSkinId] = useState<string>('venice_streetball');
  const [selectedCompanionId, setSelectedCompanionId] = useState<string>('cinderpup');
  const [copiedHighlightId, setCopiedHighlightId] = useState<string | null>(null);

  // Overall Athlete Profile
  const athleteStats = {
    overallPrq: 94.8,
    totalSessions: 142,
    clutchRating: 96,
    technicalRating: 92,
    aggressiveRating: 88,
    strategicRating: 94,
    currentRank: 'SOVEREIGN PRODIGY TIER IV',
    unlockedBadges: 28,
  };

  const masteryRecords: SportMasteryRecord[] = [
    {
      id: 'babylon_dunk',
      name: '3D Slam Dunk Contest',
      category: 'BASKETBALL VERTICAL',
      tier: 'DIAMOND',
      level: 10,
      maxLevel: 10,
      prqBonus: 12.5,
      highlightStat: '98 pts • 82ms GCT Apex',
      signatureStyle: 'CLUTCH',
      recentGrade: 'PERFECT 10.0',
      recentExplainer: 'Flawless 360 Windmill takeoff timing within 12ms of optimal launch window.',
      icon: '🏀'
    },
    {
      id: 'babylon_karate',
      name: '3D Cyber Dojo Karate',
      category: 'MARTIAL ARTS',
      tier: 'GOLD',
      level: 8,
      maxLevel: 10,
      prqBonus: 10.2,
      highlightStat: '14-Hit Combo • 0 Frame Lag Parry',
      signatureStyle: 'AGGRESSIVE',
      recentGrade: 'S-TIER PUNISH',
      recentExplainer: 'Sub-frame parry window triggered instant posture break & dragon kick KO.',
      icon: '🥋'
    },
    {
      id: 'baseball',
      name: 'Baseball Power Derby',
      category: 'PRECISION TIMING',
      tier: 'DIAMOND',
      level: 9,
      maxLevel: 10,
      prqBonus: 11.8,
      highlightStat: '528 FT Moonshot • 114 MPH EV',
      signatureStyle: 'TECHNICAL',
      recentGrade: 'BARREL ZONE',
      recentExplainer: 'Square PCI contact centered on 99mph high fastball with +24° launch angle.',
      icon: '⚾'
    },
    {
      id: 'tennis',
      name: 'Tennis Court Rally',
      category: 'RALLY CONTROL',
      tier: 'GOLD',
      level: 7,
      maxLevel: 10,
      prqBonus: 9.4,
      highlightStat: '24-Shot Rally • 98% Zone Accuracy',
      signatureStyle: 'STRATEGIC',
      recentGrade: 'TACTICAL ACE',
      recentExplainer: 'Constructed 5-shot depth crosscourt sequence to open down-the-line drop.',
      icon: '🎾'
    },
    {
      id: 'football',
      name: 'Football 7v7 Gridiron',
      category: 'FIELD VISION',
      tier: 'SILVER',
      level: 6,
      maxLevel: 10,
      prqBonus: 7.5,
      highlightStat: '75-YD Breakaway Touchdown',
      signatureStyle: 'CLUTCH',
      recentGrade: 'LANE BREAK',
      recentExplainer: 'Anticipated B-gap safety blitz and cut back against defender tackle angle.',
      icon: '🏈'
    },
    {
      id: 'soccer',
      name: 'Soccer Striker Hyper',
      category: 'STRIKER NERVES',
      tier: 'GOLD',
      level: 8,
      maxLevel: 10,
      prqBonus: 10.0,
      highlightStat: 'Upper 90 Top-Corner Bender',
      signatureStyle: 'TECHNICAL',
      recentGrade: 'DECEPTION +94%',
      recentExplainer: 'Froze keeper with outside curl release into top-right postage stamp.',
      icon: '⚽'
    },
    {
      id: 'snowboard',
      name: 'Snowboard Freeride',
      category: 'EXTREME FLOW',
      tier: 'SILVER',
      level: 5,
      maxLevel: 10,
      prqBonus: 6.8,
      highlightStat: '3x Tricky Overdrive • 1080 Spin',
      signatureStyle: 'AGGRESSIVE',
      recentGrade: 'CLEAN STOMP',
      recentExplainer: 'Maintained edge angle through compression zone for 4.2s airtime.',
      icon: '🏂'
    },
    {
      id: 'dance',
      name: 'Cyber Dance Revolution',
      category: 'RHYTHM TEMPO',
      tier: 'GOLD',
      level: 8,
      maxLevel: 10,
      prqBonus: 9.9,
      highlightStat: '100% Marvelous Beat Chain',
      signatureStyle: 'TECHNICAL',
      recentGrade: 'ALL-PERFECT',
      recentExplainer: 'Synchronized BPM delta kept input window under ±8.3ms deviation.',
      icon: '🎵'
    }
  ];

  const filteredRecords = selectedFilter === 'ALL' 
    ? masteryRecords 
    : masteryRecords.filter(r => r.signatureStyle === selectedFilter);

  const handleShareHighlight = (id: string, text: string) => {
    navigator.clipboard?.writeText(`Final Evolution Lab // Highlight Reel: ${text} | PRQ: ${athleteStats.overallPrq}`);
    setCopiedHighlightId(id);
    setTimeout(() => setCopiedHighlightId(null), 2000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-zinc-950/90 border border-white/10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F2FF]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-[#00F2FF] text-black font-black uppercase tracking-wider shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                ATHLETE MASTERY LADDER
              </span>
              <span className="text-xs font-mono text-zinc-400">• VISIBLE SKILL PROGRESSION</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-orbitron font-black text-white uppercase tracking-tight">
              ATHLETE DNA & SIGNATURE PROFILE
            </h1>
            <p className="text-xs font-mono text-zinc-300 max-w-2xl leading-relaxed">
              Every mode translates into measurable performance readiness. Practice compounds across disciplines into verifiable athletic mastery.
            </p>
          </div>

          <button
            onClick={onBack}
            className="self-start md:self-auto px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:border-[#00F2FF] text-xs font-mono font-bold transition-all cursor-pointer"
          >
            ← BACK TO ARENA
          </button>
        </div>

        {/* Global PRQ Metric Card Cluster */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <TrendingUp className="w-3.5 h-3.5 text-[#00FF9D]" />
              <span>COMPOSITE PRQ</span>
            </div>
            <div className="text-2xl sm:text-3xl font-orbitron font-black text-[#00FF9D]">
              {athleteStats.overallPrq}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">TOP 1.2% NATIONWIDE</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <Trophy className="w-3.5 h-3.5 text-[#FFD700]" />
              <span>CURRENT RANK</span>
            </div>
            <div className="text-base sm:text-lg font-orbitron font-black text-white truncate">
              {athleteStats.currentRank}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">28 BADGES UNLOCKED</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <Zap className="w-3.5 h-3.5 text-[#00F2FF]" />
              <span>DOMINANT STYLE</span>
            </div>
            <div className="text-base sm:text-lg font-orbitron font-black text-[#00F2FF]">
              CLUTCH + TECHNICAL
            </div>
            <div className="text-[10px] font-mono text-zinc-500">96/100 PRESSURE INDEX</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>LIFETIME SESSIONS</span>
            </div>
            <div className="text-2xl sm:text-3xl font-orbitron font-black text-purple-300">
              {athleteStats.totalSessions}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">100% HONEST FEEDBACK</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md flex-wrap">
          <button
            onClick={() => setActiveTab('LADDER')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'LADDER' 
                ? 'bg-[#00F2FF] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            MASTERY LADDER
          </button>
          <button
            onClick={() => setActiveTab('RADAR')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'RADAR' 
                ? 'bg-[#00F2FF] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            STYLE RADAR
          </button>
          <button
            onClick={() => setActiveTab('SKINS_VANE')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'SKINS_VANE' 
                ? 'bg-[#00F2FF] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            SKINS & RIVAL VANE
          </button>
          <button
            onClick={() => setActiveTab('COMPANIONS')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'COMPANIONS' 
                ? 'bg-[#00F2FF] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            EVOLUTION GARDEN
          </button>
          <button
            onClick={() => setActiveTab('PIPELINE')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'PIPELINE' 
                ? 'bg-[#00F2FF] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            TECH SPEC & RIG
          </button>
          <button
            onClick={() => setActiveTab('HIGHLIGHTS')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'HIGHLIGHTS' 
                ? 'bg-[#00F2FF] text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            HIGHLIGHT VAULT
          </button>
        </div>

        {activeTab === 'LADDER' && (
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-950/80 border border-white/10">
            {(['ALL', 'CLUTCH', 'TECHNICAL', 'AGGRESSIVE', 'STRATEGIC'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  selectedFilter === filter
                    ? 'bg-white/15 text-white border border-white/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Mastery Ladder Matrix */}
      {activeTab === 'LADDER' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRecords.map((record) => {
            const tierColors = {
              DIAMOND: 'border-[#00F2FF]/50 bg-[#00F2FF]/5 text-[#00F2FF]',
              GOLD: 'border-[#FFD700]/50 bg-[#FFD700]/5 text-[#FFD700]',
              SILVER: 'border-zinc-300/40 bg-zinc-400/5 text-zinc-300',
              BRONZE: 'border-amber-700/40 bg-amber-800/5 text-amber-500'
            }[record.tier];

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl p-2.5 rounded-2xl bg-white/5 border border-white/10">
                      {record.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-black uppercase ${tierColors}`}>
                          {record.tier} • LVL {record.level}/{record.maxLevel}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">{record.category}</span>
                      </div>
                      <h3 className="text-lg font-orbitron font-black text-white mt-1">
                        {record.name}
                      </h3>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 uppercase">
                    +{record.prqBonus} PRQ
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-zinc-400">SKILL CEILING PROGRESSION:</span>
                    <span className="text-white font-bold">{Math.round((record.level / record.maxLevel) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#00F2FF] to-[#7000FF] rounded-full"
                      style={{ width: `${(record.level / record.maxLevel) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Explainable Feedback Callout */}
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-400">SIGNATURE BENCHMARK:</span>
                    <span className="text-[#00FF9D] font-bold">{record.highlightStat}</span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-300 leading-snug">
                    <span className="text-white font-bold">{record.recentGrade}: </span>
                    {record.recentExplainer}
                  </p>
                </div>

                {/* Quick Launch "One More Run" */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] font-mono text-zinc-500">
                    STYLE: {record.signatureStyle}
                  </span>
                  <button
                    onClick={() => onSelectMode(record.id)}
                    className="px-4 py-2 rounded-xl bg-[#00F2FF] text-black font-orbitron font-black text-xs hover:scale-105 transition-transform flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,242,255,0.3)] cursor-pointer"
                  >
                    PLAY MODE <Play className="w-3 h-3 fill-black" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Style Radar & Portable Mastery */}
      {activeTab === 'RADAR' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-6">
            <div>
              <span className="text-[10px] font-mono text-[#00F2FF] uppercase font-bold">ATHLETIC ARCHETYPE</span>
              <h2 className="text-xl font-orbitron font-black text-white mt-1">
                4-PILLAR RADAR MATRIX
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-[#00F2FF]" /> CLUTCH (PRESSURE CONVERSION)
                  </span>
                  <span className="text-[#00F2FF] font-bold">{athleteStats.clutchRating} / 100</span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#00F2FF]" style={{ width: `${athleteStats.clutchRating}%` }} />
                </div>
                <p className="text-[10px] font-mono text-zinc-400">Dominates late-possession timing windows and buzzer beaters.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-[#00FF9D]" /> TECHNICAL (EXECUTION ACCURACY)
                  </span>
                  <span className="text-[#00FF9D] font-bold">{athleteStats.technicalRating} / 100</span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#00FF9D]" style={{ width: `${athleteStats.technicalRating}%` }} />
                </div>
                <p className="text-[10px] font-mono text-zinc-400">Sub-10ms release windows and precise shot placement angles.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-orange-400" /> AGGRESSIVE (EXPLOSIVE TEMPO)
                  </span>
                  <span className="text-orange-400 font-bold">{athleteStats.aggressiveRating} / 100</span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-orange-400" style={{ width: `${athleteStats.aggressiveRating}%` }} />
                </div>
                <p className="text-[10px] font-mono text-zinc-400">First-step burst acceleration and relentless fast-break pace.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-purple-400" /> STRATEGIC (COURT SPATIAL INTEL)
                  </span>
                  <span className="text-purple-400 font-bold">{athleteStats.strategicRating} / 100</span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-purple-400" style={{ width: `${athleteStats.strategicRating}%` }} />
                </div>
                <p className="text-[10px] font-mono text-zinc-400">Reads defensive shifts and exploits spacing weaknesses.</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-6">
            <div>
              <span className="text-[10px] font-mono text-[#00FF9D] uppercase font-bold">PORTABLE MASTERY</span>
              <h2 className="text-xl font-orbitron font-black text-white mt-1">
                CROSS-SPORT SKILL SYNERGY
              </h2>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">DUNK GCT → FOOTBALL CUT BURST</span>
                  <span className="text-[10px] font-mono text-[#00FF9D] font-bold">+18% SYNERGY</span>
                </div>
                <p className="text-xs font-mono text-zinc-400">
                  Explosive vertical recoil timing translates directly to lateral cut acceleration.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">KARATE PARRY → TENNIS RETURN DEPTH</span>
                  <span className="text-[10px] font-mono text-[#00F2FF] font-bold">+15% SYNERGY</span>
                </div>
                <p className="text-xs font-mono text-zinc-400">
                  Sub-frame reaction readiness stabilizes racquet face angle on 120mph serves.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">BASEBALL PCI → SOCCER HYPER STRIKE</span>
                  <span className="text-[10px] font-mono text-purple-400 font-bold">+12% SYNERGY</span>
                </div>
                <p className="text-xs font-mono text-zinc-400">
                  Target tracking and sweet-spot contact mastery powers pinpoint penalty placement.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Signature Highlight Vault */}
      {activeTab === 'HIGHLIGHTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {masteryRecords.map((record) => (
            <div 
              key={record.id}
              className="p-6 rounded-3xl bg-zinc-950/90 border border-white/10 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{record.icon}</span>
                  <span className="font-orbitron text-base font-black text-white">{record.name}</span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#00FF9D]/20 text-[#00FF9D] font-bold border border-[#00FF9D]/30">
                  VERIFIED RUN
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-black/60 border border-white/5 space-y-2">
                <div className="text-sm font-orbitron font-black text-[#00F2FF]">
                  {record.highlightStat}
                </div>
                <p className="text-xs font-mono text-zinc-300">
                  "{record.recentExplainer}"
                </p>
                <div className="flex items-center gap-2 pt-2 text-[10px] font-mono text-zinc-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF9D]" />
                  <span>HONEST SYSTEM AUDIT // PRQ +{record.prqBonus}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-mono text-zinc-400">
                  {copiedHighlightId === record.id ? 'COPIED TO CLIPBOARD!' : 'SHAREABLE MOMENT'}
                </span>
                <button
                  onClick={() => handleShareHighlight(record.id, record.highlightStat)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  SHARE HIGHLIGHT
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Tab 4: Canonical Skins & Rival Vane */}
      {activeTab === 'SKINS_VANE' && (
        <div className="space-y-6">
          {/* Canonical Athlete Rig & Tint Mask Architecture */}
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/90 border border-white/10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/30 font-bold uppercase">
                  CANONICAL RIG ARCHITECTURE
                </span>
                <h2 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase mt-2">
                  THE PLAYABLE ATHLETE // SINGLE RIG WITH RGB-MASK TINTS
                </h2>
                <p className="text-xs font-mono text-zinc-400 mt-1 max-w-2xl">
                  One unified 65-bone Mixamo humanoid rig with silhouette-safe accessories. Dynamic RGB-mask tint channels deliver distinct athletic disciplines without inflating memory budgets.
                </p>
              </div>
            </div>

            {/* Skin Variant Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {CANONICAL_ATHLETE_SKINS.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => setSelectedSkinId(skin.id)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedSkinId === skin.id
                      ? 'bg-[#00F2FF]/10 border-[#00F2FF] shadow-[0_0_20px_rgba(0,242,255,0.2)]'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: skin.primaryHex }} />
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: skin.accentHex }} />
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: skin.rimColorHex }} />
                    </div>
                    <h4 className="font-orbitron text-xs font-black text-white uppercase">{skin.name}</h4>
                    <span className="text-[10px] font-mono text-zinc-400">{skin.theme}</span>
                  </div>
                  <span className="text-[9px] font-mono text-[#00F2FF] font-bold mt-3 pt-2 border-t border-white/5">
                    {skin.accessory}
                  </span>
                </button>
              ))}
            </div>

            {/* Active Selected Skin Mask Breakdown */}
            {(() => {
              const activeSkin = CANONICAL_ATHLETE_SKINS.find(s => s.id === selectedSkinId) || CANONICAL_ATHLETE_SKINS[0];
              return (
                <div className="p-5 rounded-2xl bg-black/60 border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-red-400 font-bold">RED MASK CHANNEL (BASE KIT)</span>
                    <p className="text-xs font-mono text-white font-bold">{activeSkin.maskChannels.r}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-green-400 font-bold">GREEN MASK CHANNEL (ACCENTS)</span>
                    <p className="text-xs font-mono text-white font-bold">{activeSkin.maskChannels.g}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-blue-400 font-bold">BLUE MASK CHANNEL (TRACTION/GEAR)</span>
                    <p className="text-xs font-mono text-white font-bold">{activeSkin.maskChannels.b}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* The Rival — "Vane" Section */}
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/90 border border-amber-500/30 space-y-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold uppercase">
                  RECURRING STORY ANTAGONIST
                </span>
                <h2 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase mt-2 flex items-center gap-3">
                  RIVAL PROFILE // {RIVAL_VANE_PROFILE.name}
                  <span className="text-xs font-mono font-bold text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                    IMPERIAL GOLD AURA
                  </span>
                </h2>
                <p className="text-xs font-mono text-zinc-400 mt-1 max-w-3xl leading-relaxed">
                  {RIVAL_VANE_PROFILE.lore}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {RIVAL_VANE_PROFILE.variants.map((v, idx) => (
                <div key={v.id} className="p-4 rounded-2xl bg-white/[0.02] border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-amber-400 font-bold">PHASE 0{idx + 1}</span>
                    <Swords className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <h4 className="font-orbitron text-xs font-black text-white">{v.name}</h4>
                  <p className="text-[10px] font-mono text-zinc-400">
                    Pristine sponsor-white fabric with high-saturation gold ink line terminators.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Evolution Garden Companions */}
      {activeTab === 'COMPANIONS' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/90 border border-white/10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-[#00FF9D]/20 text-[#00FF9D] border border-[#00FF9D]/30 font-bold uppercase">
                EVOLUTION GARDEN // ATHLETE COMPANIONS
              </span>
              <h2 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase mt-2">
                3 SPECIES × 3 EVOLUTIONARY STAGES
              </h2>
              <p className="text-xs font-mono text-zinc-400 mt-1 max-w-2xl">
                Companions grow alongside your training sessions. Expressive anime eyes, cel-shaded ink outlines, and mount-capable Stage-3 progressions.
              </p>
            </div>
          </div>

          {/* Companion Species Switcher */}
          <div className="flex items-center gap-3 flex-wrap">
            {COMPANION_SPECIES_EVOLUTION.map((comp) => (
              <button
                key={comp.id}
                onClick={() => setSelectedCompanionId(comp.id)}
                className={`px-5 py-3 rounded-2xl font-orbitron text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  selectedCompanionId === comp.id
                    ? 'bg-[#00FF9D] text-black shadow-[0_0_20px_rgba(0,255,157,0.3)]'
                    : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                }`}
              >
                <span>{comp.name}</span>
                <span className="text-[10px] font-mono opacity-80">({comp.element})</span>
              </button>
            ))}
          </div>

          {/* Evolution Stage Flow */}
          {(() => {
            const comp = COMPANION_SPECIES_EVOLUTION.find(c => c.id === selectedCompanionId) || COMPANION_SPECIES_EVOLUTION[0];
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
                {comp.stages.map((stage) => (
                  <div 
                    key={stage.stage}
                    className="p-6 rounded-3xl bg-black/60 border border-white/10 space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-white font-bold">
                        STAGE 0{stage.stage}
                      </span>
                      <span className="text-[10px] font-mono text-[#00FF9D] font-bold">
                        {stage.stage === 3 ? 'MOUNT CAPABLE' : 'GROWTH FORM'}
                      </span>
                    </div>

                    <h3 className="font-orbitron text-lg font-black text-white uppercase">{stage.name}</h3>
                    <p className="text-xs font-mono text-zinc-300 leading-relaxed">{stage.role}</p>

                    <div className="pt-3 border-t border-white/10 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                      <Sparkles className="w-3.5 h-3.5 text-[#00FF9D]" />
                      <span>EXP-DRIVEN EVOLUTION UNLOCK</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab 6: Technical Art Pipeline & Hard Rules Checklist */}
      {activeTab === 'PIPELINE' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/90 border border-white/10 space-y-6">
          <div>
            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold uppercase">
              SHIPPING ART & ENGINE SPECIFICATION
            </span>
            <h2 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase mt-2">
              HARD TECHNICAL RULES & BABYLON.JS RIG CONSTRAINTS
            </h2>
            <p className="text-xs font-mono text-zinc-400 mt-1 max-w-2xl">
              Strict rules enforced across all 19 sports canvas environments to guarantee 60fps browser execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-orbitron font-black text-[#00F2FF]">
                <Cpu className="w-4 h-4" /> 65-BONE MIXAMO RIG
              </div>
              <p className="text-xs font-mono text-zinc-300">
                Prefixless bone naming (Hips, Spine, Head...). Never ships "mixamorig:" prefix to prevent animation freezes.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-orbitron font-black text-[#00FF9D]">
                <Shield className="w-4 h-4" /> &le; 25K TRI BUDGET
              </div>
              <p className="text-xs font-mono text-zinc-300">
                Single skeleton per GLB file. Triangulated mesh with KTX2/Basis Universal texture compression.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-orbitron font-black text-purple-400">
                <Layers className="w-4 h-4" /> ORM TEXTURE PACKING
              </div>
              <p className="text-xs font-mono text-zinc-300">
                Occlusion (R), Roughness (G), Metallic (B) single-channel packed into one texture map for low memory bandwidth.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-orbitron font-black text-amber-400">
                <Palette className="w-4 h-4" /> CEL SHADER PIPELINE
              </div>
              <p className="text-xs font-mono text-zinc-300">
                Sobel dark-blue ink edge detection, 3-band quantization stepping, hard shadow terminators, saturated rim light.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-orbitron font-black text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> 2048px+ BACKDROP PLATES
              </div>
              <p className="text-xs font-mono text-zinc-300">
                Center-safe composition 2D backdrop plates for Venice Blacktop, Dojo, Circuit Hub, and Surf point breaks.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-orbitron font-black text-pink-400">
                <Info className="w-4 h-4" /> CLEAN LICENSING
              </div>
              <p className="text-xs font-mono text-zinc-300">
                All shipping assets are 100% original, verified commercial-ready, with no CC-BY free-tier dependencies.
              </p>
            </div>
          </div>

          {/* Canonical Rig Technical Breakdown Banner */}
          <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-orbitron font-black text-[#00F2FF]">
                CANONICAL RIG MANIFEST ({TECHNICAL_RIG_SPECIFICATION.rigStandard})
              </span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#00FF9D]/20 text-[#00FF9D] font-bold">
                VALIDATED 65 BONES
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-mono text-zinc-300">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-zinc-500 block text-[9px]">ORIENTATION:</span>
                <span className="text-white font-bold">{TECHNICAL_RIG_SPECIFICATION.rootOrientation}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-zinc-500 block text-[9px]">PREFIX RULE:</span>
                <span className="text-amber-400 font-bold">{TECHNICAL_RIG_SPECIFICATION.boneListPrefix}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-zinc-500 block text-[9px]">TRI BUDGET:</span>
                <span className="text-[#00FF9D] font-bold">{TECHNICAL_RIG_SPECIFICATION.polyBudget}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-zinc-500 block text-[9px]">TEXTURE PACK:</span>
                <span className="text-purple-300 font-bold">{TECHNICAL_RIG_SPECIFICATION.textureCompression}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
