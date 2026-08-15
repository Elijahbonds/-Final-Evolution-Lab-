import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LandingPage from './components/LandingPage';
import MedicalDisclaimerView from './components/MedicalDisclaimerView';
import SovereignBank from './components/SovereignBank';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SmartInstallBanner from './components/SmartInstallBanner';
import { UniversityHub } from './components/university/UniversityHub';
import { PhysicalTrackView } from './components/university/PhysicalTrackView';
import { ModeManager } from './components/modes/ModeManager';

type View = 'landing' | 'dashboard' | 'arena' | 'lab' | 'training' | 'academy' | 'community' | 'mixtapes' | 'support';

const App: React.FC = () => {
  const [view, setView] = useState<View>('landing');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [shards, setShards] = useState(1250);

  const [pendingView, setPendingView] = useState<View>('dashboard');

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('felHasAcceptedMedicalDisclaimer', 'true');
    setShowDisclaimer(false);
    setView(pendingView);
  };

  const handleOpenLab = (targetView: View = 'dashboard') => {
    if (localStorage.getItem('felHasAcceptedMedicalDisclaimer')) {
      setView(targetView);
    } else {
      setPendingView(targetView);
      setShowDisclaimer(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#00F2FF]/30 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <LandingPage 
              onOpenLab={handleOpenLab} 
              onOpenDisclaimer={() => setShowDisclaimer(true)}
            />
          </motion.div>
        ) : (
          <div className="flex min-h-screen">
            <Sidebar 
              activeView={view} 
              onViewChange={(v) => setView(v as View)} 
              shards={shards}
              onOpenBank={() => setShowBank(true)}
              onLogout={() => setView('landing')}
            />
            
            <main className="flex-1 ml-64 min-h-screen relative">
              <AnimatePresence mode="wait">
                {view === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Dashboard />
                  </motion.div>
                )}

                {view === 'academy' && (
                  <motion.div
                    key="academy"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <UniversityHub />
                  </motion.div>
                )}

                {view === 'training' && (
                  <motion.div
                    key="training"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="p-8 max-w-7xl mx-auto"
                  >
                    <PhysicalTrackView />
                  </motion.div>
                )}

                {view === 'lab' && (
                  <motion.div
                    key="lab"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="p-8 max-w-7xl mx-auto"
                  >
                    <PhysicalTrackView />
                  </motion.div>
                )}

                {view === 'arena' && (
                  <motion.div
                    key="arena"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto"
                  >
                    <ModeManager />
                  </motion.div>
                )}

                {/* Placeholder for other views */}
                {['community', 'mixtapes', 'support'].includes(view) && (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center h-screen"
                  >
                    <div className="text-center space-y-4">
                      <h2 className="font-orbitron text-4xl font-black tracking-tighter text-white uppercase">{view}_MODULE</h2>
                      <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest">Awaiting Sovereign Sync Initialization...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </div>
        )}
      </AnimatePresence>

      {/* Global Overlays */}
      <AnimatePresence>
        {showDisclaimer && (
          <MedicalDisclaimerView 
            onAccept={handleAcceptDisclaimer} 
            onClose={() => setShowDisclaimer(false)}
          />
        )}
        {showBank && (
          <SovereignBank 
            onClose={() => setShowBank(false)} 
            onSuccess={(amount) => setShards(prev => prev + amount)}
          />
        )}
      </AnimatePresence>

      {/* PWA Install Banner */}
      <SmartInstallBanner />

      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#7000FF]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00F2FF]/10 blur-[120px] rounded-full" />
      </div>
    </div>
  );
};

export default App;
