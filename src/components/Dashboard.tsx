import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  Zap, 
  ChevronRight,
  Target,
  Clock,
  TrendingUp,
  AlertCircle,
  Layout,
  LucideIcon
} from 'lucide-react';
import PixelBridge from './PixelBridge';
import { supabase } from '../lib/supabase';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  unit: string;
  color: string;
  trend?: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, unit, color, trend }) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    className="glass-card p-6 flex flex-col gap-4 relative overflow-hidden group border-white/5"
  >
    <div 
      className="absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-20 transition-all group-hover:opacity-40"
      style={{ backgroundColor: color }}
    />
    <div className="flex items-center justify-between">
      <div className="p-2 bg-white/5 rounded-xl">
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-[10px] font-mono text-green-400">
          <TrendingUp className="w-3 h-3" />
          {trend}%
        </div>
      )}
    </div>
    <div>
      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <h2 className="text-3xl font-orbitron font-black tracking-tighter">{value}</h2>
        <span className="text-xs font-mono text-zinc-600 uppercase">{unit}</span>
      </div>
    </div>
  </motion.div>
);

interface LeakageBarProps {
  label: string;
  value: number;
  color: string;
}

const LeakageBar: React.FC<LeakageBarProps> = ({ label, value, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
      <span className="text-zinc-500">{label}</span>
      <span style={{ color }}>{value.toFixed(1)}%</span>
    </div>
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        className="h-full"
        style={{ backgroundColor: color }}
      />
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  // Mock Realtime Data from Supabase
  const [stats, setStats] = useState({
    prq: 0.82,
    vertical: 34.5,
    flightTime: 0.62,
    shards: 1250,
    gct: 162, // ms
    rank: 42,
    leakage: {
      ankle: 12,
      knee: 8,
      hip: 15
    }
  });

  // Sovereign Sync: Real-time Supabase Integration
  useEffect(() => {
    // 1. Initial Fetch
    const fetchInitialData = async () => {
      const { data: balanceData } = await supabase
        .from('user_balances')
        .select('*')
        .single();
      
      if (balanceData) {
        setStats(prev => ({
          ...prev,
          shards: balanceData.shards || prev.shards,
          prq: balanceData.prq || prev.prq,
          vertical: balanceData.vertical_inches || prev.vertical
        }));
      }
    };

    fetchInitialData();

    // 2. Real-time Subscription
    const balanceSubscription = supabase
      .channel('user_balances_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_balances' }, (payload) => {
        const newData = payload.new as { shards?: number; prq?: number; vertical_inches?: number };
        setStats(prev => ({
          ...prev,
          shards: newData.shards ?? prev.shards,
          prq: newData.prq ?? prev.prq,
          vertical: newData.vertical_inches ?? prev.vertical
        }));
      })
      .subscribe();

    // 3. Simulated Jitter (for clinical feel)
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        flightTime: +(prev.flightTime + (Math.random() * 0.01 - 0.005)).toFixed(2),
        gct: Math.floor(prev.gct + (Math.random() * 4 - 2)),
        leakage: {
          ankle: Math.max(0, prev.leakage.ankle + (Math.random() * 2 - 1)),
          knee: Math.max(0, prev.leakage.knee + (Math.random() * 2 - 1)),
          hip: Math.max(0, prev.leakage.hip + (Math.random() * 2 - 1))
        }
      }));
    }, 3000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(balanceSubscription);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] p-8 pb-32">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Header HUD */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00F2FF] to-[#7000FF] p-[1px]">
              <div className="w-full h-full rounded-2xl bg-[#050505] flex items-center justify-center overflow-hidden">
                <img src="https://picsum.photos/seed/athlete/200" alt="Profile" className="w-full h-full object-cover opacity-80" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-orbitron text-2xl font-black tracking-tighter text-white uppercase">ATHLETE_BNDS_001</h1>
                <div className="px-3 py-1 glass rounded-full flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00F2FF] animate-pulse" />
                  <span className="text-[9px] font-mono text-white uppercase tracking-widest">SOVEREIGN_LINK_ACTIVE</span>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">SESSION_TIME:</span>
                  <span className="text-[10px] font-mono text-white uppercase tracking-widest">04:22:15</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">NETWORK:</span>
                  <span className="text-[10px] font-mono text-green-400 uppercase tracking-widest">STABLE_16ms</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-3 glass rounded-2xl flex items-center gap-3 text-[11px] font-orbitron font-bold tracking-widest uppercase hover:bg-white/10 transition-all border-white/5">
              <Layout className="w-4 h-4 text-[#00F2FF]" />
              CUSTOMIZE_HUD
            </button>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Bonds Standard Stats */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              icon={Activity} 
              label="NEURAL_DRIVE (PRQ)" 
              value={stats.prq} 
              unit="INDEX" 
              color="#00F2FF" 
              trend={+2.4}
            />
            <StatCard 
              icon={Zap} 
              label="VERTICAL_ESTIMATE" 
              value={stats.vertical} 
              unit="INCHES" 
              color="#7000FF" 
              trend={+1.2}
            />
            <StatCard 
              icon={Clock} 
              label="FLIGHT_TIME" 
              value={stats.flightTime} 
              unit="SECONDS" 
              color="#00F2FF" 
            />
          </div>

          {/* Kinetic Leakage HUD */}
          <div className="glass-card p-6 flex flex-col gap-6 border-white/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <h3 className="font-orbitron text-[11px] font-bold tracking-widest uppercase text-white">KINETIC_LEAKAGE</h3>
            </div>
            <div className="space-y-6">
              <LeakageBar label="ANKLE_STIFFNESS" value={stats.leakage.ankle} color="#00F2FF" />
              <LeakageBar label="KNEE_ABSORPTION" value={stats.leakage.knee} color="#7000FF" />
              <LeakageBar label="HIP_STABILITY" value={stats.leakage.hip} color="#00F2FF" />
            </div>
            <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <p className="text-[9px] font-mono text-red-400 uppercase tracking-widest leading-relaxed">
                CRITICAL: HIP_LEAKAGE DETECTED DURING PENULTIMATE STRIDE. INITIATE HAPTIC_CORRECTION.
              </p>
            </div>
          </div>
        </div>

        {/* Pixel Streaming & Active Protocol */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pixel Bridge */}
          <div className="lg:col-span-2 aspect-video">
            <PixelBridge />
          </div>

          {/* Active Protocol */}
          <div className="glass-card p-8 flex flex-col gap-8 border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-[#00F2FF]/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-[#00F2FF]" />
                <h2 className="font-orbitron text-xl font-black tracking-tighter text-white uppercase">ACTIVE_PROTOCOL</h2>
              </div>
              <button className="text-[10px] font-mono text-[#00F2FF] uppercase tracking-widest flex items-center gap-1 hover:underline">
                VIEW_ALL <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all cursor-pointer">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center font-orbitron text-xl font-black text-zinc-500 group-hover:text-[#00F2FF] transition-colors">01</div>
                  <div>
                    <h3 className="font-orbitron text-sm font-bold tracking-tight text-white uppercase">ANKLE_PISTON_RECOIL</h3>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-widest">NEURO_MECHANIC_VVA_MODULE</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '65%' }}
                      className="h-full bg-[#00F2FF] shadow-[0_0_10px_rgba(0,242,255,0.5)]"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[#00F2FF] font-bold">65% COMPLETE</span>
                </div>
              </div>

              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-[#7000FF]" />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">CURRENT_METRIC_FOCUS</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <h4 className="font-orbitron text-lg font-black text-white uppercase">REACTIVE_STIFFNESS</h4>
                    <p className="text-[10px] font-mono text-zinc-600 mt-1 uppercase tracking-widest">TARGET: 2.4 kN/m</p>
                  </div>
                  <div className="text-2xl font-orbitron font-black text-[#7000FF]">2.1</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
