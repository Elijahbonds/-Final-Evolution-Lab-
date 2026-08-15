import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Monitor, 
  Wifi, 
  Maximize2, 
  Cpu, 
  Shield, 
  ExternalLink, 
  RefreshCw, 
  Globe 
} from 'lucide-react';

interface PixelBridgeProps {
  initialUrl?: string;
}

const PixelBridge: React.FC<PixelBridgeProps> = ({ 
  initialUrl = 'https://finalevolution.abacusai.app' 
}) => {
  const [streamUrl] = useState<string>(initialUrl);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'PORTAL' | 'HUD'>('PORTAL');
  const [isIframeLoaded, setIsIframeLoaded] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleOpenExternal = () => {
    window.open(streamUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`w-full h-full glass-card relative overflow-hidden group flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : 'rounded-3xl'}`}>
      {/* Top Bridge Control Bar */}
      <div className="relative z-30 p-3 sm:p-4 bg-zinc-950/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00FF9D] animate-pulse shadow-[0_0_10px_#00FF9D]" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black uppercase text-[#00F2FF] bg-[#00F2FF]/10 px-2 py-0.5 rounded border border-[#00F2FF]/30">
              ABACUS.AI CLOUD
            </span>
            <span className="font-orbitron text-xs font-bold text-white tracking-wide truncate max-w-[200px] sm:max-w-none">
              SOVEREIGN CLOUD BRIDGE
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setActiveTab('PORTAL')}
              className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'PORTAL' 
                  ? 'bg-[#00F2FF] text-black shadow-[0_0_10px_rgba(0,242,255,0.4)]' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              LIVE PORTAL
            </button>
            <button
              onClick={() => setActiveTab('HUD')}
              className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'HUD' 
                  ? 'bg-[#00F2FF] text-black shadow-[0_0_10px_rgba(0,242,255,0.4)]' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              STREAM HUD
            </button>
          </div>

          <button
            onClick={() => setIsLiveConnected(!isLiveConnected)}
            title="Toggle Stream State"
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-[#00F2FF] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLiveConnected ? 'text-[#00FF9D]' : 'text-zinc-500'}`} />
          </button>

          <button
            onClick={handleOpenExternal}
            title="Open in new tab"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-[#00F2FF] hover:bg-[#00F2FF] hover:text-black font-mono text-[10px] font-bold transition-all shadow-[0_0_15px_rgba(0,242,255,0.2)] cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">LAUNCH NEW TAB</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Fullscreen toggle"
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 bg-black overflow-hidden min-h-[400px]">
        {activeTab === 'PORTAL' ? (
          <div className="w-full h-full relative">
            {isLiveConnected ? (
              <>
                <iframe
                  src={streamUrl}
                  title="Final Evolution Abacus Portal"
                  className="w-full h-full border-0 bg-black"
                  allow="accelerometer; autoplay; camera; microphone; clipboard-read; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  onLoad={() => setIsIframeLoaded(true)}
                />
                
                {!isIframeLoaded && (
                  <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-2 border-[#00F2FF] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
                      CONNECTING TO {streamUrl}...
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-zinc-950 p-6 text-center">
                <Globe className="w-12 h-12 text-[#00F2FF]/40" />
                <div>
                  <h4 className="font-orbitron font-bold text-white uppercase text-base">STREAM SUSPENDED</h4>
                  <p className="text-xs font-mono text-zinc-400 mt-1 max-w-sm">
                    Live connection to Abacus AI cloud is paused. Click reconnect below to resume the session.
                  </p>
                </div>
                <button
                  onClick={() => setIsLiveConnected(true)}
                  className="px-6 py-2.5 bg-[#00F2FF] text-black font-orbitron font-black text-xs rounded-xl shadow-[0_0_20px_rgba(0,242,255,0.4)] cursor-pointer"
                >
                  RECONNECT STREAM
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Stream HUD & Telemetry Mode */
          <div className="w-full h-full relative bg-zinc-950/90 flex flex-col justify-between p-6">
            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center gap-5">
              <motion.div 
                animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-20 h-20 rounded-2xl border border-[#00F2FF]/40 bg-[#00F2FF]/10 flex items-center justify-center shadow-[0_0_30px_rgba(0,242,255,0.2)]"
              >
                <Monitor className="w-9 h-9 text-[#00F2FF]" />
              </motion.div>
              <div>
                <h3 className="font-orbitron text-lg font-black tracking-tight text-white uppercase">
                  AFEL SOVEREIGN PIXEL BRIDGE
                </h3>
                <p className="text-xs font-mono text-[#00FF9D] mt-1 uppercase tracking-wider">
                  ENDPOINT: {streamUrl}
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setActiveTab('PORTAL')}
                  className="px-6 py-2.5 bg-[#00F2FF] text-black font-orbitron font-black text-xs rounded-xl shadow-[0_0_20px_rgba(0,242,255,0.4)] hover:scale-105 transition-all cursor-pointer"
                >
                  SWITCH TO EMBEDDED PORTAL
                </button>
                <button 
                  onClick={handleOpenExternal}
                  className="px-6 py-2.5 bg-white/10 text-white border border-white/20 font-orbitron font-black text-xs rounded-xl hover:bg-white/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  OPEN DIRECT URL
                </button>
              </div>
            </div>

            {/* Live Metrics Footprint */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-pulse" />
                  <span>LATENCY</span>
                </div>
                <div className="text-sm font-orbitron font-black text-white mt-0.5">14.2 ms</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono">
                  <Wifi className="w-3 h-3 text-[#00F2FF]" />
                  <span>BITRATE</span>
                </div>
                <div className="text-sm font-orbitron font-black text-[#00F2FF] mt-0.5">52.4 Mbps</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono">
                  <Cpu className="w-3 h-3 text-purple-400" />
                  <span>HOST CLUSTER</span>
                </div>
                <div className="text-sm font-orbitron font-black text-purple-300 mt-0.5">RTX_4090_08</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono">
                  <Shield className="w-3 h-3 text-[#00FF9D]" />
                  <span>SECURITY</span>
                </div>
                <div className="text-sm font-orbitron font-black text-[#00FF9D] mt-0.5">TLS_V1.3_E2EE</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PixelBridge;

