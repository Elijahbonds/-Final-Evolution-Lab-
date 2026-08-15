import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  ShieldCheck, 
  Download, 
  Share2, 
  Activity, 
  Award, 
  Zap, 
  Printer, 
  Copy 
} from 'lucide-react';
import { INITIAL_SHARED_PROFILE } from '../../constants/university_curriculum';
import { SharedProfileData, CreatorCardRarity } from '../../types/university';
import { CreatorCardBadge } from './CreatorCardBadge';

export const SharedProfileView: React.FC = () => {
  const [profile] = useState<SharedProfileData>(INITIAL_SHARED_PROFILE);
  const [showExportModal, setShowExportModal] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const handleCopyHash = () => {
    navigator.clipboard?.writeText(profile.portfolioVerificationCode);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `FEL_LIVING_PORTFOLIO_${profile.athleteId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-3xl bg-gradient-to-r from-[#031521] via-[#080718] to-[#160624] border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00F2FF]/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#00F2FF] to-[#7000FF] p-1 shadow-[0_0_40px_rgba(0,242,255,0.3)]">
            <div className="w-full h-full bg-[#050505] rounded-[22px] flex items-center justify-center">
              <User className="w-12 h-12 text-[#00F2FF]" />
            </div>
          </div>

          <div className="space-y-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40 font-bold">
                {profile.careerTier}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED ATHLETE
              </span>
            </div>
            <h2 className="font-orbitron text-2xl md:text-3xl font-black tracking-tight text-white uppercase">
              {profile.fullName}
            </h2>
            <p className="text-xs font-mono text-zinc-400">
              ID: {profile.athleteId} • MEMBER SINCE: {profile.joinedDate}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 relative z-10">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-6 py-3.5 bg-white text-black font-orbitron font-black text-xs rounded-full uppercase tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 transition-all"
          >
            <Share2 className="w-4 h-4 text-black" />
            <span>EXPORT VERIFIABLE PORTFOLIO</span>
          </button>
        </div>
      </div>

      {/* Unified Key Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-6 border-white/5 space-y-1">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">
            PRQ READINESS QUOTIENT
          </span>
          <div className="text-3xl font-orbitron font-black text-[#00F2FF]">
            {profile.prqScore}
          </div>
          <span className="text-[9px] font-mono text-emerald-400">+0.04 vs Baseline</span>
        </div>

        <div className="glass-card p-6 border-white/5 space-y-1">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">
            ASYMMETRY INDEX
          </span>
          <div className="text-3xl font-orbitron font-black text-purple-400">
            {profile.movementSignature.asymmetryIndex}%
          </div>
          <span className="text-[9px] font-mono text-zinc-400">Target &lt; 10.0%</span>
        </div>

        <div className="glass-card p-6 border-white/5 space-y-1">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">
            CREATOR CARDS
          </span>
          <div className="text-3xl font-orbitron font-black text-white">
            {profile.earnedCreatorCards.length}
          </div>
          <span className="text-[9px] font-mono text-emerald-400">On-Chain Credentials</span>
        </div>

        <div className="glass-card p-6 border-white/5 space-y-1">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">
            FACILITATOR TIER
          </span>
          <div className="text-xl font-orbitron font-black text-emerald-400 mt-1">
            TIER 1 (DUAL)
          </div>
          <span className="text-[9px] font-mono text-zinc-400">Physical &amp; Educational</span>
        </div>
      </div>

      {/* 2-Column Deep Architecture Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Movement Signature & Progression History */}
        <div className="glass-card p-6 border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00F2FF]" />
              <h3 className="font-orbitron text-sm font-black text-white uppercase tracking-wider">
                LIVING MOVEMENT SIGNATURE
              </h3>
            </div>
            <span className="text-[9px] font-mono text-zinc-400">
              LAST SCREEN: {profile.movementSignature.scanDate}
            </span>
          </div>

          {/* FMS Battery Scores */}
          <div className="space-y-2">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              DIGITIZED FMS1 COMPONENT SCORES (0-3):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
              {[
                { name: 'Deep Squat', score: profile.movementSignature.deepSquatScore },
                { name: 'Hurdle Step', score: profile.movementSignature.hurdleStepScore },
                { name: 'In-Line Lunge', score: profile.movementSignature.inlineLungeScore },
                { name: 'Active SLR', score: profile.movementSignature.aslrScore },
                { name: 'Trunk Stability', score: profile.movementSignature.trunkStabilityScore },
                { name: 'Rotary Stability', score: profile.movementSignature.rotaryStabilityScore }
              ].map((fms) => (
                <div key={fms.name} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                  <span className="text-zinc-400 text-[10px]">{fms.name}</span>
                  <span className="font-orbitron font-bold text-white text-xs">{fms.score}/3</span>
                </div>
              ))}
            </div>
          </div>

          {/* Kinetic Leakage */}
          <div className="space-y-3 pt-2">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              MEASURED ENERGY DISSIPATION:
            </span>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-300">
                <span>Ankle Dissipation:</span>
                <span className="text-[#00F2FF] font-bold">{profile.movementSignature.kineticChainLeakage.ankle}%</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Knee Valgus:</span>
                <span className="text-emerald-400 font-bold">{profile.movementSignature.kineticChainLeakage.knee}%</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Glute Medius Lag:</span>
                <span className="text-purple-400 font-bold">{profile.movementSignature.kineticChainLeakage.hip}%</span>
              </div>
            </div>
          </div>

          {/* Diagnostic Note */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-zinc-400 leading-relaxed font-sans">
            <strong className="text-white font-mono block mb-1">FACILITATOR DIAGNOSTIC NOTE:</strong>
            {profile.movementSignature.diagnosticNotes}
          </div>
        </div>

        {/* Right: Creator Card Credential Vault & Game History */}
        <div className="space-y-6">
          {/* Creator Cards */}
          <div className="glass-card p-6 border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                <h3 className="font-orbitron text-sm font-black text-white uppercase tracking-wider">
                  EARNED CREATOR CARDS
                </h3>
              </div>
              <span className="text-[9px] font-mono text-[#00F2FF]">PORTABLE ACCREDITATION</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.earnedCreatorCards.map((card) => (
                <CreatorCardBadge
                  key={card.id}
                  cardName={card.cardName}
                  moduleNumber={card.moduleNumber}
                  rarity={card.rarity as CreatorCardRarity}
                  description="Validated through applied scenario testing and facilitator clinical sign-off."
                  issuedDate={card.issuedDate}
                  credentialHash={card.credentialHash}
                />
              ))}
            </div>
          </div>

          {/* Game Performance History */}
          <div className="glass-card p-6 border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="font-orbitron text-sm font-black text-white uppercase tracking-wider">
                  GAME PERFORMANCE HISTORY (ARENA)
                </h3>
              </div>
              <span className="text-[9px] font-mono text-zinc-400">UNREAL PIXEL STREAMING</span>
            </div>

            <div className="space-y-2">
              {profile.gamePerformanceHistory.map((game, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="font-orbitron text-xs font-bold text-white uppercase">{game.gameMode}</div>
                    <div className="text-[9px] font-mono text-zinc-500 mt-0.5">{game.metric} • {game.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-orbitron text-xs font-bold text-[#00F2FF]">{game.score}</div>
                    <div className="text-[8px] font-mono text-emerald-400">{game.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Verifiable Portfolio Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#080808] border border-white/10 rounded-3xl max-w-2xl w-full p-8 space-y-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-[#00F2FF] uppercase font-bold tracking-widest">
                    SOVEREIGN LIVING PORTFOLIO ARTIFACT
                  </span>
                  <h3 className="font-orbitron text-xl font-black text-white uppercase mt-1">
                    VERIFIED SCOUT & GRANT SUMMARY
                  </h3>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Printable Portfolio Summary Body */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 font-mono text-xs">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <div>
                    <span className="text-zinc-500 uppercase text-[10px] block">ATHLETE NAME</span>
                    <span className="text-white font-orbitron font-bold text-sm">{profile.fullName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 uppercase text-[10px] block">PORTFOLIO CHECKSUM</span>
                    <span className="text-emerald-400 text-[10px] font-bold">SHA256: VALID</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <span className="text-zinc-500 block">PRQ SCORE:</span>
                    <span className="text-[#00F2FF] font-bold">{profile.prqScore}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">ASYMMETRY:</span>
                    <span className="text-white font-bold">{profile.movementSignature.asymmetryIndex}%</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">STIFFNESS:</span>
                    <span className="text-emerald-400 font-bold">{profile.movementSignature.reactiveStiffness} kN/m</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">CREDENTIALS:</span>
                    <span className="text-purple-400 font-bold">{profile.earnedCreatorCards.length} Verified</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">CAREER STATUS:</span>
                    <span className="text-white font-bold">{profile.careerTier}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">GRANT ELIGIBLE:</span>
                    <span className="text-emerald-400 font-bold">YES</span>
                  </div>
                </div>

                {/* Cryptographic Hash Box */}
                <div className="p-3 rounded-xl bg-black/60 border border-white/5 flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400 truncate max-w-sm">{profile.portfolioVerificationCode}</span>
                  <button
                    onClick={handleCopyHash}
                    className="px-2.5 py-1 rounded bg-white/10 text-white hover:bg-white/20 flex items-center gap-1 shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedHash ? 'COPIED!' : 'COPY HASH'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleDownloadJSON}
                  className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-orbitron text-xs font-bold rounded-xl uppercase flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4 text-[#00F2FF]" />
                  <span>DOWNLOAD VERIFIED JSON</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="py-3 bg-[#00F2FF] hover:bg-[#00F2FF]/80 text-black font-orbitron text-xs font-black rounded-xl uppercase flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)]"
                >
                  <Printer className="w-4 h-4 text-black" />
                  <span>PRINT SCOUT / GRANT REPORT</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
