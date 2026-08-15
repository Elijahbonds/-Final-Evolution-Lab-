import React from 'react';
import { ShieldAlert, CheckCircle2, X } from 'lucide-react';

interface MedicalDisclaimerViewProps {
  onAccept: () => void;
  onClose?: () => void;
}

const MedicalDisclaimerView: React.FC<MedicalDisclaimerViewProps> = ({ onAccept, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl animate-fade-in">
      <div className="max-w-2xl w-full bg-[#090B10] border border-[#00F2FF]/30 p-6 sm:p-10 rounded-3xl shadow-[0_0_100px_rgba(0,242,255,0.15)] relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-gradient-to-r from-transparent via-[#00F2FF] to-transparent opacity-70" />
        
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close disclaimer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#00F2FF] uppercase font-bold">
              PROTOCOL VERIFICATION & SAFETY CLEARANCE
            </span>
            <h2 className="text-2xl sm:text-3xl font-orbitron font-black tracking-tight text-white">
              CLINICAL DISCLAIMER
            </h2>
          </div>
        </div>
        
        <div className="space-y-4 text-zinc-300 text-sm sm:text-base leading-relaxed mb-8">
          <p className="text-zinc-400 text-xs sm:text-sm">
            Final Evolution Lab (FEL) operates as a high-precision biomechanical optimization and athletic training system, not a licensed medical device. 
            All metrics including PRQ readiness scores, tendon stiffness ratings, and neural drive snapshots are intended purely for athletic performance enhancement and education.
          </p>
          
          <div className="p-5 bg-black/50 border border-white/10 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <span className="font-mono text-[#00F2FF] font-bold text-xs mt-0.5">01</span>
              <p className="text-xs text-zinc-300">
                <strong className="text-white font-medium">Non-Medical Guidance:</strong> Data models do not replace medical evaluation, physical therapy diagnoses, or clinical prescriptions.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-mono text-[#00F2FF] font-bold text-xs mt-0.5">02</span>
              <p className="text-xs text-zinc-300">
                <strong className="text-white font-medium">Explosive Clearance:</strong> You acknowledge being in appropriate physical condition for high-intensity reactive ground-contact testing.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-mono text-[#00F2FF] font-bold text-xs mt-0.5">03</span>
              <p className="text-xs text-zinc-300">
                <strong className="text-white font-medium">Assumption of Risk:</strong> Always consult your physician before initiating novel reactive force or maximum-effort kinetic protocols.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={onAccept}
            className="flex-1 py-4 sm:py-5 bg-[#00F2FF] text-black font-orbitron font-black text-sm sm:text-base tracking-wider rounded-2xl hover:bg-[#00F2FF]/90 transition-all shadow-[0_0_35px_rgba(0,242,255,0.35)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 text-black" />
            CONFIRM CLEARANCE & ENTER
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              CANCEL
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicalDisclaimerView;
