import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  Activity, 
  BookOpen, 
  Briefcase, 
  User, 
  Brain, 
  ShieldCheck, 
  Globe, 
  ArrowRight
} from 'lucide-react';
import { TrackType } from '../../types/university';
import { PhysicalTrackView } from './PhysicalTrackView';
import { EducationalTrackView } from './EducationalTrackView';
import { CareerPipelineView } from './CareerPipelineView';
import { SharedProfileView } from './SharedProfileView';
import { UO_PEOPLE_COMPARISON } from '../../constants/university_curriculum';
import BrainBrawl from '../BrainBrawl';

export const UniversityHub: React.FC = () => {
  const [activeTrack, setActiveTrack] = useState<TrackType>('overview');

  return (
    <div className="min-h-screen bg-[#050505] p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Sovereign University Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-8 rounded-3xl bg-gradient-to-r from-[#031521] via-[#080B14] to-[#160624] border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#00F2FF]/10 to-[#7000FF]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#00F2FF]/10 text-[#00F2FF] border border-[#00F2FF]/30 text-[10px] font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              FINAL EVOLUTION UNIVERSITY // SOVEREIGN ENGINE
            </span>
            <span className="text-[10px] font-mono text-zinc-500">v2.0 SHIP SPECIFICATION</span>
          </div>

          <h1 className="font-orbitron text-2xl md:text-4xl font-black tracking-tight text-white uppercase">
            THE THREE-TRACK UNIVERSITY ARCHITECTURE
          </h1>

          <p className="text-xs md:text-sm text-zinc-400 max-w-3xl leading-relaxed">
            University of the People's model — <strong className="text-white">borderless, tuition-light, accredited-in-outcome</strong> — rebuilt for physical and cognitive development. Physical &amp; Educational tracks write to one Shared Profile; the Career Pipeline sits on top as the paid exit ramp.
          </p>
        </div>

        {/* Quick Diagnostic Pill */}
        <div className="glass p-5 rounded-2xl border border-white/10 flex flex-col gap-2 min-w-[220px] relative z-10">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-zinc-500 uppercase">SYNCHRONIZED RECORD</span>
            <span className="text-emerald-400 font-bold">PRQ 0.84</span>
          </div>
          <div className="text-sm font-orbitron font-bold text-white">
            TIER 2 PRACTITIONER
          </div>
          <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-400">
            <ShieldCheck className="w-3 h-3 text-[#00F2FF]" />
            <span>2 CREATOR CARDS EARNED</span>
          </div>
        </div>
      </div>

      {/* Main Track Navigation Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { id: 'overview', label: 'UNIVERSITY MODEL', icon: Globe, color: '#00F2FF' },
          { id: 'physical', label: '1. PHYSICAL TRACK', icon: Activity, color: '#00F2FF' },
          { id: 'educational', label: '2. EDUCATIONAL TRACK', icon: BookOpen, color: '#7000FF' },
          { id: 'career', label: '3. CAREER PIPELINE', icon: Briefcase, color: '#10B981' },
          { id: 'profile', label: 'SHARED PROFILE', icon: User, color: '#00F2FF' },
          { id: 'brain_brawl', label: 'BRAIN BRAWL', icon: Brain, color: '#A855F7' }
        ].map((tab) => {
          const isActive = activeTrack === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTrack(tab.id as TrackType)}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all relative overflow-hidden group ${
                isActive
                  ? 'bg-white/10 border-white/30 shadow-xl'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/20 text-zinc-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="track-pill-active"
                  className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"
                />
              )}
              <tab.icon className="w-5 h-5" style={{ color: tab.color }} />
              <div>
                <span className="font-orbitron text-[10px] md:text-xs font-black uppercase tracking-tight text-white block">
                  {tab.label}
                </span>
                <span className="text-[8px] font-mono text-zinc-500 uppercase mt-0.5 block">
                  {isActive ? 'ACTIVE VIEW' : 'EXPLORE →'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Track View */}
      <AnimatePresence mode="wait">
        {/* Overview & UoPeople Model */}
        {activeTrack === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* The 3-Track Triad Visual Architecture */}
            <div className="glass-card p-8 border-white/5 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-[#00F2FF] uppercase font-bold tracking-widest">
                    SYSTEM TOPOLOGY // SINGLE LOOP ARCHITECTURE
                  </span>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase mt-1">
                    HOW THE THREE TRACKS UNIFY
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">ONE DATA OBJECT PER ATHLETE</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Physical Card */}
                <div 
                  onClick={() => setActiveTrack('physical')}
                  className="p-6 rounded-2xl bg-gradient-to-b from-[#031520] to-[#040C12] border border-[#00F2FF]/20 hover:border-[#00F2FF]/50 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#00F2FF]/10 text-[#00F2FF] border border-[#00F2FF]/30 font-bold uppercase">
                      TRACK 01
                    </span>
                    <Activity className="w-4 h-4 text-[#00F2FF]" />
                  </div>
                  <h4 className="font-orbitron text-sm font-black text-white uppercase">PHYSICAL TRACK</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Where is this person's body right now? Digitized FMS1 mirror, earned Level 1-3 progression gates, and sport-specific stress test analysis.
                  </p>
                  <div className="text-[10px] font-mono text-[#00F2FF] pt-2 flex items-center gap-1">
                    <span>ENTER PHYSICAL TRACK</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>

                {/* Educational Card */}
                <div 
                  onClick={() => setActiveTrack('educational')}
                  className="p-6 rounded-2xl bg-gradient-to-b from-[#18042B] to-[#090212] border border-[#7000FF]/30 hover:border-[#7000FF]/60 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#7000FF]/20 text-[#00F2FF] border border-[#7000FF]/40 font-bold uppercase">
                      TRACK 02
                    </span>
                    <BookOpen className="w-4 h-4 text-purple-400" />
                  </div>
                  <h4 className="font-orbitron text-sm font-black text-white uppercase">EDUCATIONAL TRACK</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    What does this person understand? The 161K-word Neuro-Mechanic Blueprint delivered via AI Coach, applied scenarios, and Creator Cards.
                  </p>
                  <div className="text-[10px] font-mono text-purple-400 pt-2 flex items-center gap-1">
                    <span>ENTER EDUCATIONAL TRACK</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>

                {/* Career Card */}
                <div 
                  onClick={() => setActiveTrack('career')}
                  className="p-6 rounded-2xl bg-gradient-to-b from-[#031A12] to-[#030E0A] border border-emerald-500/20 hover:border-emerald-500/50 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                      TRACK 03
                    </span>
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="font-orbitron text-sm font-black text-white uppercase">CAREER PIPELINE</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Where does this lead concretely? The 6-tier ladder, paid in-home facilitator delivery, college scouting portfolios, and grant evidence.
                  </p>
                  <div className="text-[10px] font-mono text-emerald-400 pt-2 flex items-center gap-1">
                    <span>ENTER CAREER LADDER</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* University of the People Comparison Table */}
            <div className="glass-card p-8 border-white/5 space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#00F2FF]">
                  <Globe className="w-4 h-4" />
                  <span className="uppercase font-bold tracking-widest">INSTITUTIONAL FOUNDATION</span>
                </div>
                <h3 className="font-orbitron text-lg font-black text-white uppercase">
                  THE UNIVERSITY OF THE PEOPLE (UoPeople) FRAMING
                </h3>
                <p className="text-xs text-zinc-400 max-w-2xl">
                  FEL is not a video game with an education feature bolted on. It is UoPeople's tuition-light, outcome-accredited model rebuilt for human movement and cognitive resilience.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400 uppercase text-[10px]">
                      <th className="py-3 px-4 font-bold text-white">INSTITUTIONAL PILLAR</th>
                      <th className="py-3 px-4 text-zinc-400">UOPEOPLE MODEL</th>
                      <th className="py-3 px-4 text-[#00F2FF] font-bold">FEL SOVEREIGN UNIVERSITY</th>
                      <th className="py-3 px-4 text-emerald-400">MEASURABLE OUTCOME</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {UO_PEOPLE_COMPARISON.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-4 font-orbitron font-bold text-white uppercase text-[11px]">
                          {row.pillar}
                        </td>
                        <td className="py-4 px-4 text-zinc-400 font-sans text-xs">
                          {row.uoPeopleApproach}
                        </td>
                        <td className="py-4 px-4 text-zinc-200 font-sans text-xs font-semibold">
                          {row.felUniversityApproach}
                        </td>
                        <td className="py-4 px-4 text-zinc-300 font-sans text-xs">
                          {row.institutionalOutcome}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Track 1: Physical Track */}
        {activeTrack === 'physical' && (
          <motion.div
            key="physical"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <PhysicalTrackView />
          </motion.div>
        )}

        {/* Track 2: Educational Track */}
        {activeTrack === 'educational' && (
          <motion.div
            key="educational"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <EducationalTrackView />
          </motion.div>
        )}

        {/* Track 3: Career Pipeline */}
        {activeTrack === 'career' && (
          <motion.div
            key="career"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <CareerPipelineView onOpenPortfolio={() => setActiveTrack('profile')} />
          </motion.div>
        )}

        {/* Shared Profile & Living Portfolio */}
        {activeTrack === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <SharedProfileView />
          </motion.div>
        )}

        {/* Brain Brawl Cognitive Sync */}
        {activeTrack === 'brain_brawl' && (
          <motion.div
            key="brain_brawl"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <BrainBrawl />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
