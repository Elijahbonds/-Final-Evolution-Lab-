import React from 'react';
import { motion } from 'motion/react';
import { 
  Gamepad2, 
  Beaker, 
  Dumbbell, 
  GraduationCap, 
  LayoutDashboard,
  Wallet,
  Settings,
  LogOut,
  Zap
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  shards: number;
  onOpenBank?: () => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, shards, onOpenBank, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'HUD', icon: LayoutDashboard },
    { id: 'arena', label: 'ARENA', icon: Gamepad2 },
    { id: 'lab', label: 'LAB', icon: Beaker },
    { id: 'training', label: 'TRAINING', icon: Dumbbell },
    { id: 'academy', label: 'ACADEMY', icon: GraduationCap },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#050505] border-r border-white/5 flex flex-col z-[2500]">
      {/* Logo Area */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#00F2FF] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.3)]">
          <Zap className="w-6 h-6 text-black fill-black" />
        </div>
        <div>
          <h1 className="font-orbitron text-sm font-black tracking-tighter leading-none">SOVEREIGN</h1>
          <p className="text-[10px] font-mono text-zinc-500 mt-1 tracking-widest uppercase">Portal v1.0.0</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group relative ${
              activeView === item.id 
              ? 'bg-white/5 text-white' 
              : 'text-zinc-500 hover:text-white hover:bg-white/5'
            }`}
          >
            {activeView === item.id && (
              <motion.div 
                layoutId="sidebar-active"
                className="absolute left-0 w-1 h-6 bg-[#00F2FF] rounded-r-full"
              />
            )}
            <item.icon className={`w-5 h-5 transition-colors ${activeView === item.id ? 'text-[#00F2FF]' : 'group-hover:text-[#00F2FF]'}`} />
            <span className="font-orbitron text-[11px] font-bold tracking-widest uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Wallet / Shards */}
      <div className="p-6">
        <div className="glass-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">VVA_VAULT</span>
            <Wallet className="w-3 h-3 text-[#00F2FF]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-orbitron font-black text-white">{shards}</span>
            <span className="text-[9px] font-mono text-zinc-600 uppercase">SHARDS</span>
          </div>
          <button 
            onClick={onOpenBank}
            className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-mono uppercase tracking-widest transition-all cursor-pointer hover:border-[#00F2FF]/30 active:scale-95"
          >
            + TOP_UP_ASSETS
          </button>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-white/5 space-y-4">
        <button 
          onClick={onOpenBank}
          className="w-full flex items-center gap-4 px-4 text-zinc-600 hover:text-white transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span className="text-[10px] font-mono uppercase tracking-widest">SYSTEM_CONFIG</span>
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-4 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[10px] font-mono uppercase tracking-widest">TERMINATE_SESSION</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
