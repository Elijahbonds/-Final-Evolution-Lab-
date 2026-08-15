import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share, PlusSquare, X } from 'lucide-react';

const SmartInstallBanner: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !((window as { MSStream?: unknown }).MSStream);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isIOS && isSafari && !isStandalone) {
      const hasDismissed = localStorage.getItem('pwa_banner_dismissed');
      if (!hasDismissed) {
        setTimeout(() => setShow(true), 0);
      }
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 z-[3000] glass-card p-6 flex flex-col gap-4 shadow-[0_0_50px_rgba(0,242,255,0.1)]"
        >
          <button 
            onClick={dismiss}
            className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00F2FF] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.4)]">
              <PlusSquare className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="font-orbitron text-sm font-bold tracking-tight">INSTALL SOVEREIGN LAB</h3>
              <p className="text-xs text-zinc-400 mt-1">Bypass the App Store. Add to Home Screen.</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-white/10 rounded flex items-center justify-center">1</span>
              Tap <Share className="w-3 h-3 text-[#00F2FF]" /> Share
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-white/10 rounded flex items-center justify-center">2</span>
              Add to Home Screen
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SmartInstallBanner;
