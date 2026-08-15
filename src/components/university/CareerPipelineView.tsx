import React, { useState } from 'react';
import { 
  TrendingUp, 
  Award, 
  Briefcase, 
  Building2, 
  CheckCircle2, 
  Lock, 
  DollarSign, 
  FileText, 
  Users, 
  GraduationCap, 
  ExternalLink
} from 'lucide-react';
import { CAREER_LADDER_TIERS } from '../../constants/university_curriculum';
import { CareerLadderStep } from '../../types/university';

export const CareerPipelineView: React.FC<{ onOpenPortfolio?: () => void }> = ({ onOpenPortfolio }) => {
  const [selectedTierIndex, setSelectedTierIndex] = useState(1); // Default to Tier 2 (Practitioner)
  const currentTier: CareerLadderStep = CAREER_LADDER_TIERS[selectedTierIndex] || CAREER_LADDER_TIERS[0];

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#031D14] via-[#051114] to-[#14041D] border border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              TRACK 03 // CAREER PIPELINE & LADDER
            </span>
            <span className="text-[10px] font-mono text-zinc-400">ECONOMIC SOVEREIGNTY & CREDENTIALING</span>
          </div>
          <h2 className="font-orbitron text-2xl font-black tracking-tight text-white uppercase">
            THE SOVEREIGN CAREER PIPELINE
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            *Where does this lead, concretely?* Turning youth athletic and cognitive development into a legitimate, verifiable career pipeline with paid in-home facilitation, athletic recruiting portfolios, and institutional grant evidence.
          </p>
        </div>

        <button
          onClick={onOpenPortfolio}
          className="px-5 py-3 rounded-2xl bg-white text-black font-orbitron font-black text-xs uppercase flex items-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:scale-105 transition-all"
        >
          <FileText className="w-4 h-4 text-black" />
          <span>VIEW LIVING PORTFOLIO</span>
        </button>
      </div>

      {/* 3.1 The 6-Tier Career Ladder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-orbitron text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            3.1 THE CAREER LADDER (PARTICIPANT → NODE OPERATOR)
          </h3>
          <span className="text-[10px] font-mono text-zinc-500">6 VERIFIED PROGRESSION TIERS</span>
        </div>

        {/* Step Nodes Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CAREER_LADDER_TIERS.map((tier, idx) => {
            const isSelected = selectedTierIndex === idx;
            const isUnlocked = tier.unlocked;

            return (
              <button
                key={tier.tier}
                onClick={() => setSelectedTierIndex(idx)}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all relative ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/50'
                    : isUnlocked
                      ? 'bg-white/5 border-white/10 hover:border-white/20'
                      : 'bg-white/[0.02] border-white/5 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">
                    TIER 0{tier.tier}
                  </span>
                  {isUnlocked ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : tier.status === 'eligible' ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </div>

                <div>
                  <h4 className="font-orbitron text-xs font-black text-white uppercase leading-tight line-clamp-2">
                    {tier.title.split(':')[1]?.trim() || tier.title}
                  </h4>
                  <p className="text-[9px] font-mono text-emerald-400 mt-1 truncate">
                    {tier.status.toUpperCase()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Tier Deep Dive Card */}
        <div className="glass-card p-8 border-white/5 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  {currentTier.title}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">ROLE: {currentTier.role}</span>
              </div>
              <h3 className="font-orbitron text-xl font-black text-white uppercase">
                {currentTier.title.split(':')[1]?.trim() || currentTier.title}
              </h3>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>COMPENSATION: {currentTier.compensationModel}</span>
              </div>
            </div>

            {/* Requirements Matrix */}
            <div className="space-y-3">
              <h4 className="font-orbitron text-xs font-bold text-white uppercase tracking-widest">
                TIER UNLOCK REQUIREMENTS:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase block">PHYSICAL PREREQUISITE</span>
                  <p className="text-zinc-200">{currentTier.requirements.physicalPrereq}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase block">EDUCATIONAL PREREQUISITE</span>
                  <p className="text-zinc-200">{currentTier.requirements.educationalPrereq}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase block">FACILITATION HOURS LOGGED</span>
                  <p className="text-emerald-400 font-orbitron font-bold">{currentTier.requirements.facilitationHours} HOURS</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase block">VALIDATED ASSESSMENTS</span>
                  <p className="text-[#00F2FF] font-orbitron font-bold">{currentTier.requirements.validationCount} SESSIONS</p>
                </div>
              </div>
            </div>

            {/* Deliverables */}
            <div className="space-y-2">
              <h4 className="font-orbitron text-xs font-bold text-zinc-400 uppercase tracking-widest">
                VERIFIED DELIVERABLES:
              </h4>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {currentTier.deliverables.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: Quick Action & Ladder Progress */}
          <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Briefcase className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-orbitron text-base font-black text-white uppercase">
                  TRAIN-THE-TRAINER ENGINE
                </h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Every participant who masters Level 3 physical progression and completes all 4 Blueprint modules is primed to become a paid certified facilitator.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-[10px] font-mono space-y-2">
              <div className="flex justify-between text-zinc-400">
                <span>LADDER COMPLETION:</span>
                <span className="text-emerald-400 font-bold">33% (Tier 2/6)</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="w-1/3 h-full bg-emerald-400 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3.3 Three Entry Points to Paid Work */}
      <div className="space-y-4">
        <h3 className="font-orbitron text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          3.3 THREE ENTRY POINTS TO PAID WORK
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Facilitator Track */}
          <div className="glass-card p-6 border-white/5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="font-orbitron text-sm font-black text-white uppercase">
              1. FACILITATOR TRACK
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The direct pipeline: Your certification funds itself once facilitators are paid ($45–$75/hr) to deliver the in-home program, movement screens, and RNT guided drills.
            </p>
            <div className="pt-2 text-[10px] font-mono text-emerald-400">
              AVERAGE RETURN: $600/WEEK PART-TIME
            </div>
          </div>

          {/* Content / Creator Track */}
          <div className="glass-card p-6 border-white/5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#7000FF]/20 border border-[#7000FF]/40 flex items-center justify-center">
              <Award className="w-5 h-5 text-[#00F2FF]" />
            </div>
            <h4 className="font-orbitron text-sm font-black text-white uppercase">
              2. CONTENT / CREATOR TRACK
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Top athletic performers become verified case studies, Stress Test Analysis subjects, and earn Shard royalties in the Creator Card economy.
            </p>
            <div className="pt-2 text-[10px] font-mono text-purple-400">
              ROYALTY SHARE: 15% SHARD VOLUME
            </div>
          </div>

          {/* Athletic / Scouting Track */}
          <div className="glass-card p-6 border-white/5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#00F2FF]/10 border border-[#00F2FF]/30 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-[#00F2FF]" />
            </div>
            <h4 className="font-orbitron text-sm font-black text-white uppercase">
              3. ATHLETIC / SCOUTING TRACK
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The Living Portfolio with verified Movement Signature deltas is a legitimate collegiate recruiting artifact, replacing unverified highlight clips.
            </p>
            <div className="pt-2 text-[10px] font-mono text-[#00F2FF]">
              NCAA / SCOUT VERIFIABLE FORMAT
            </div>
          </div>
        </div>
      </div>

      {/* 3.4 Institutional Leverage & Grant Evidence Base */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0D1824] to-[#040C14] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Building2 className="w-4 h-4" />
            <span className="uppercase font-bold tracking-wider">3.4 INSTITUTIONAL LEVERAGE & GRANTS</span>
          </div>
          <h4 className="font-orbitron text-lg font-black text-white uppercase">
            DEFENSIBLE OUTCOME DATA FOR PARTNERSHIPS
          </h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The Living Portfolio is the evidence base for community grants, school district partnerships, and foundation funding: you are not pitching "trust us, it works," but presenting measurable movement screen deltas and credentialed youth progression.
          </p>
        </div>

        <button
          onClick={onOpenPortfolio}
          className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-orbitron font-black text-xs rounded-full uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all shrink-0"
        >
          <span>EXPORT GRANT EVIDENCE PORTFOLIO</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
