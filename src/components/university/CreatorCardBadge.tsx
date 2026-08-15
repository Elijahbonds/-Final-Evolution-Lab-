import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Brain, HeartPulse, Crown, ShieldCheck, Sparkles, Hash, Calendar, Award } from 'lucide-react';

interface CreatorCardProps {
  cardName: string;
  moduleNumber: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Sovereign Legendary';
  description: string;
  issuedDate?: string;
  credentialHash?: string;
  isUnlocked?: boolean;
  onSelect?: () => void;
}

const RARITY_STYLES = {
  Common: {
    border: 'border-zinc-700',
    glow: 'rgba(150, 150, 150, 0.2)',
    badgeBg: 'bg-zinc-800',
    badgeText: 'text-zinc-300',
    gradient: 'from-zinc-900 to-zinc-950',
    accentColor: '#9CA3AF'
  },
  Rare: {
    border: 'border-blue-500/40',
    glow: 'rgba(59, 130, 246, 0.25)',
    badgeBg: 'bg-blue-950/80',
    badgeText: 'text-blue-400',
    gradient: 'from-[#0B1528] via-[#080E1A] to-[#04070D]',
    accentColor: '#3B82F6'
  },
  Epic: {
    border: 'border-[#7000FF]/50',
    glow: 'rgba(112, 0, 255, 0.35)',
    badgeBg: 'bg-purple-950/80',
    badgeText: 'text-[#00F2FF]',
    gradient: 'from-[#190432] via-[#0E031E] to-[#05010C]',
    accentColor: '#00F2FF'
  },
  'Sovereign Legendary': {
    border: 'border-[#00F2FF]/60',
    glow: 'rgba(0, 242, 255, 0.4)',
    badgeBg: 'bg-cyan-950/80',
    badgeText: 'text-[#00F2FF]',
    gradient: 'from-[#04242B] via-[#08121E] to-[#02070D]',
    accentColor: '#00F2FF'
  }
};

const MODULE_ICONS = [Zap, Brain, HeartPulse, Crown];

export const CreatorCardBadge: React.FC<CreatorCardProps> = ({
  cardName,
  moduleNumber,
  rarity,
  description,
  issuedDate = '2026-08-14',
  credentialHash = '0x8f2a9c41b83d7e10',
  isUnlocked = true,
  onSelect
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.Epic;
  const IconComponent = MODULE_ICONS[(moduleNumber - 1) % MODULE_ICONS.length] || Award;

  return (
    <div 
      className="perspective-[1000px] cursor-pointer w-full"
      onClick={() => {
        setIsFlipped(!isFlipped);
        onSelect?.();
      }}
    >
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className={`relative w-full rounded-2xl p-5 border ${style.border} bg-gradient-to-b ${style.gradient} overflow-hidden shadow-2xl transition-all ${
          !isUnlocked ? 'opacity-50 grayscale' : ''
        }`}
        style={{
          boxShadow: isUnlocked ? `0 10px 30px ${style.glow}` : 'none'
        }}
      >
        {/* Holographic Top Sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none" />

        {/* Ambient Corner Accents */}
        <div className="absolute top-0 right-0 w-24 h-24 blur-2xl rounded-full opacity-30 pointer-events-none" style={{ backgroundColor: style.accentColor }} />

        {!isFlipped ? (
          /* Front of Card */
          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border ${style.border} ${style.badgeBg} ${style.badgeText} font-semibold`}>
                  {rarity}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 tracking-wider">
                  MOD.0{moduleNumber}
                </span>
              </div>
              <Sparkles className="w-4 h-4 text-[#00F2FF] opacity-80" />
            </div>

            <div className="flex items-center gap-3 my-1">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 shadow-inner">
                <IconComponent className="w-6 h-6" style={{ color: style.accentColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-orbitron text-sm font-black tracking-tight text-white uppercase truncate">
                  {cardName}
                </h4>
                <p className="text-[10px] font-mono text-zinc-400 mt-0.5 truncate">
                  {isUnlocked ? 'FEL Sovereign Verified' : 'Locked — Complete Exam'}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
              {description}
            </p>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-zinc-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>ON-CHAIN CREDENTIAL</span>
              </div>
              <span className="text-[#00F2FF] hover:underline">FLIP DETAILS →</span>
            </div>
          </div>
        ) : (
          /* Back of Card (Cryptographic Verification Details) */
          <div className="flex flex-col gap-3 relative z-10 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-[10px] font-mono text-[#00F2FF] uppercase font-bold tracking-widest">
                VERIFICATION DATA
              </span>
              <span className="text-[9px] font-mono text-zinc-500">CLICK TO FLIP</span>
            </div>

            <div className="space-y-2 text-[10px] font-mono">
              <div>
                <span className="text-zinc-500 flex items-center gap-1">
                  <Hash className="w-2.5 h-2.5" /> CREDENTIAL HASH:
                </span>
                <span className="text-zinc-200 font-mono text-[9px] break-all">
                  {credentialHash}
                </span>
              </div>

              <div>
                <span className="text-zinc-500 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" /> ISSUED DATE:
                </span>
                <span className="text-zinc-300">{issuedDate}</span>
              </div>

              <div>
                <span className="text-zinc-500">AUTHORITY:</span>
                <span className="text-emerald-400 block font-semibold">FEL University Protocol v2</span>
              </div>
            </div>

            <div className="pt-2 mt-1 border-t border-white/5 text-[9px] font-mono text-zinc-400">
              Transferable to Collegiate Scout Portfolio & Grant Evidence Ledger.
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
