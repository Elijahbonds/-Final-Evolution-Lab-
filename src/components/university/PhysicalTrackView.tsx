import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Layers, 
  Film, 
  Award, 
  CheckCircle2, 
  Lock, 
  ShieldCheck, 
  Clock,
  UserCheck
} from 'lucide-react';
import { NeuroMechanicMirror } from './NeuroMechanicMirror';
import { StressTestAnalysis } from './StressTestAnalysis';
import { PROGRESSION_SERIES, INITIAL_MOVEMENT_SIGNATURE } from '../../constants/university_curriculum';
import { MovementSignature, ProgressionLevel } from '../../types/university';

type PhysicalSubTab = 'diagnostic' | 'progression' | 'expression' | 'certification';

export const PhysicalTrackView: React.FC = () => {
  const [subTab, setSubTab] = useState<PhysicalSubTab>('diagnostic');
  const [signature, setSignature] = useState<MovementSignature>(INITIAL_MOVEMENT_SIGNATURE);
  const [progression, setProgression] = useState<ProgressionLevel[]>(PROGRESSION_SERIES);
  const [certifiedScreensCount, setCertifiedScreensCount] = useState(14);
  const [isSignOffSubmitted, setIsSignOffSubmitted] = useState(false);

  const handleScanUpdated = (newSig: MovementSignature) => {
    setSignature(newSig);
  };

  const handleToggleCompetency = (levelIndex: number, compId: string) => {
    setProgression(prev => {
      const next = [...prev];
      const comp = next[levelIndex].competencies.find(c => c.id === compId);
      if (comp && comp.verificationStatus !== 'locked') {
        comp.completed = !comp.completed;
        comp.verificationStatus = comp.completed ? 'verified' : 'in-progress';
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Top Header & Sub-Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#03131D] via-[#050B14] to-[#0D041B] border border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#00F2FF]/10 text-[#00F2FF] border border-[#00F2FF]/30">
              TRACK 01 // PHYSICAL SYSTEM
            </span>
            <span className="text-[10px] font-mono text-zinc-400">NASM / FMS1 CERTIFIED PROTOCOL</span>
          </div>
          <h2 className="font-orbitron text-2xl font-black tracking-tight text-white uppercase">
            PHYSICAL LITERACY & DIAGNOSTIC TRACK
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            *Where is this person's body right now, and what's the next safe, effective step?* Digitized screening, progression gates earned through verified competency, and high-velocity stress testing.
          </p>
        </div>

        {/* Sub-Nav Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'diagnostic', label: '1.1 DIAGNOSTIC MIRROR', icon: Activity },
            { id: 'progression', label: '1.2 LEVEL 1-3 PROGRESSION', icon: Layers },
            { id: 'expression', label: '1.3 STRESS TEST ANALYSIS', icon: Film },
            { id: 'certification', label: '1.4 FACILITATOR TIER', icon: UserCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as PhysicalSubTab)}
              className={`px-4 py-2.5 rounded-xl font-orbitron text-xs font-bold uppercase flex items-center gap-2 transition-all ${
                subTab === tab.id
                  ? 'bg-[#00F2FF] text-black shadow-[0_0_20px_rgba(0,242,255,0.3)]'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Sub-Tab Views */}
      <AnimatePresence mode="wait">
        {/* 1.1 Diagnostic Layer */}
        {subTab === 'diagnostic' && (
          <motion.div
            key="diagnostic"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Interactive MediaPipe / Synthetic Mirror */}
            <NeuroMechanicMirror 
              currentSignature={signature}
              onScanComplete={handleScanUpdated}
            />

            {/* Movement Signature Deep Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Asymmetry & Joint Restrictions */}
              <div className="glass-card p-6 border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-[10px] font-mono text-[#00F2FF] uppercase font-bold tracking-widest">
                    MOVEMENT SIGNATURE STATUS
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">WEEK {signature.intervalWeek} SCAN</span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-zinc-400">Asymmetry Index:</span>
                    <span className="font-orbitron font-bold text-white text-sm">{signature.asymmetryIndex}%</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-zinc-400">Reactive Stiffness:</span>
                    <span className="font-orbitron font-bold text-emerald-400 text-sm">{signature.reactiveStiffness} kN/m</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-zinc-400">PRQ Readiness Score:</span>
                    <span className="font-orbitron font-bold text-purple-400 text-sm">{signature.prqScore}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">OBSERVED COMPENSATIONS:</span>
                  <ul className="space-y-1.5 text-xs text-zinc-300">
                    {signature.compensationPatterns.map((pat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#00F2FF] mt-0.5">•</span>
                        <span>{pat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Kinetic Chain Energy Leakage Bars */}
              <div className="glass-card p-6 border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-[10px] font-mono text-purple-400 uppercase font-bold tracking-widest">
                    KINETIC CHAIN LEAKAGE
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">ENERGY RETURN RATIO</span>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Ankle Dorsiflexion Dissipation', value: signature.kineticChainLeakage.ankle, color: '#00F2FF' },
                    { label: 'Knee Valgus Abduction Yield', value: signature.kineticChainLeakage.knee, color: '#10B981' },
                    { label: 'Hip Extension Lag (Glute Med)', value: signature.kineticChainLeakage.hip, color: '#A855F7' },
                    { label: 'Lumbar Anti-Rotation Collapse', value: signature.kineticChainLeakage.lumbar, color: '#F59E0B' }
                  ].map((leak) => (
                    <div key={leak.label} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono uppercase">
                        <span className="text-zinc-400">{leak.label}</span>
                        <span style={{ color: leak.color }} className="font-bold">{leak.value}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${leak.value * 3}%` }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: leak.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4-Week Re-screen Cadence Card */}
              <div className="glass-card p-6 border-white/5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#00F2FF]" />
                    <span className="text-[10px] font-mono text-white uppercase font-bold tracking-widest">
                      DEFENSIBLE GRANT CADENCE
                    </span>
                  </div>
                  <h4 className="font-orbitron text-sm font-black text-white uppercase">
                    4-WEEK RE-SCREEN INTERVAL
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Re-screened at fixed 4-week intervals to prove measurable kinematic adaptation over time. This verified timeline provides the defensible outcome data required for institutional grants and recruiting portfolios.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-mono text-emerald-400 flex items-center justify-between">
                  <span>LAST SCAN: {signature.scanDate}</span>
                  <span className="font-bold">NEXT DUE: 28 DAYS</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 1.2 Progression Layer */}
        {subTab === 'progression' && (
          <motion.div
            key="progression"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="p-4 rounded-2xl bg-[#00F2FF]/5 border border-[#00F2FF]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#00F2FF]" />
                <span className="text-xs font-mono text-zinc-300">
                  <strong className="text-white font-orbitron">PROGRESSION GATE PRINCIPLE:</strong> Gates are earned through verified movement screen scores, never timed. Level 2 remains locked until Level 1 competencies are validated.
                </span>
              </div>
            </div>

            {/* Level 1, 2, 3 Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {progression.map((lvl, lIdx) => (
                <div 
                  key={lvl.level}
                  className={`glass-card p-6 border flex flex-col justify-between gap-6 transition-all ${
                    lvl.unlocked ? 'border-white/10' : 'border-white/5 opacity-60'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full ${
                        lvl.unlocked ? 'bg-[#00F2FF]/10 text-[#00F2FF] border border-[#00F2FF]/30' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        LEVEL 0{lvl.level}
                      </span>
                      {lvl.unlocked ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Lock className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>

                    <div>
                      <h3 className="font-orbitron text-base font-black text-white uppercase">
                        {lvl.title}
                      </h3>
                      <p className="text-[10px] font-mono text-purple-400 mt-1 uppercase">
                        {lvl.subtitle}
                      </p>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {lvl.description}
                    </p>

                    {/* Competency Gate Checklist */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                        EARNED COMPETENCIES:
                      </span>
                      <div className="space-y-2">
                        {lvl.competencies.map((comp) => (
                          <div
                            key={comp.id}
                            onClick={() => handleToggleCompetency(lIdx, comp.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                              comp.completed 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                                : comp.verificationStatus === 'in-progress'
                                  ? 'bg-amber-500/10 border-amber-500/30 text-zinc-300'
                                  : 'bg-white/5 border-white/5 text-zinc-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-orbitron text-[10px] font-bold uppercase">{comp.name}</span>
                              {comp.completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                            <div className="text-[9px] font-mono text-zinc-400 mt-1">
                              PREREQ: {comp.fmsPrerequisite}
                            </div>
                            <div className="text-[9px] text-zinc-400 mt-0.5">
                              {comp.criteria}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expression Modes Connected */}
                  <div className="pt-3 border-t border-white/5">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase block mb-1.5">
                      EXPRESSION TEST MODES:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {lvl.expressionModes.map((mode) => (
                        <span key={mode} className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/5">
                          {mode}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 1.3 Expression Layer */}
        {subTab === 'expression' && (
          <motion.div
            key="expression"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <StressTestAnalysis />
          </motion.div>
        )}

        {/* 1.4 Facilitator Certification Physical Tier */}
        {subTab === 'certification' && (
          <motion.div
            key="certification"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="glass-card p-8 border-white/5 max-w-4xl mx-auto space-y-6">
              <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#00F2FF]/10 border border-[#00F2FF]/30 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-[#00F2FF]" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-black text-white uppercase">
                    FACILITATOR CERTIFICATION — PHYSICAL TIER
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    FMS1 Administration Mastery • Safe Regression/Progression Sign-Off • Train-the-Trainer Track
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">VERIFIED SCREENS</span>
                  <span className="text-2xl font-orbitron font-black text-[#00F2FF]">{certifiedScreensCount}/15</span>
                  <span className="text-[9px] font-mono text-emerald-400 mt-1 block">93.3% Requirement Met</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">RNT BAND DRILL ACCURACY</span>
                  <span className="text-2xl font-orbitron font-black text-purple-400">100%</span>
                  <span className="text-[9px] font-mono text-zinc-400 mt-1 block">Senior Director Validated</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">REGRESSION PROTOCOL</span>
                  <span className="text-2xl font-orbitron font-black text-emerald-400">PASS</span>
                  <span className="text-[9px] font-mono text-zinc-400 mt-1 block">Safety Boundaries Verified</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-orbitron text-xs font-bold text-white uppercase tracking-widest">
                  PHYSICAL FACILITATOR CORE RESPONSIBILITIES:
                </h4>
                <div className="space-y-2 text-xs text-zinc-300">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span>1. Administer digitized Neuro-Mechanic Mirror screen to participants</span>
                    <span className="text-emerald-400 font-mono text-[10px]">VERIFIED</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span>2. Coach Level 1–3 movement progression series safely without clinical overreach</span>
                    <span className="text-emerald-400 font-mono text-[10px]">VERIFIED</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span>3. Accurately validate Level 1 progression gate competencies for peer athletes</span>
                    <span className="text-[#00F2FF] font-mono text-[10px]">1 SCREEN REMAINING</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setCertifiedScreensCount(15);
                  setIsSignOffSubmitted(true);
                }}
                disabled={isSignOffSubmitted}
                className="w-full py-4 bg-[#00F2FF] hover:bg-[#00F2FF]/80 text-black font-orbitron font-black text-sm rounded-full flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,242,255,0.3)] transition-all disabled:opacity-50"
              >
                {isSignOffSubmitted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-black" />
                    PHYSICAL TIER 1 SIGN-OFF VERIFIED ON-CHAIN
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4 text-black" />
                    VALIDATE 15TH SCREEN & SUBMIT PHYSICAL TIER SIGN-OFF
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
