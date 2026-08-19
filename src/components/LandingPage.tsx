import React, { useState, useEffect } from 'react';
import { 
  Activity, Play, Zap, Shield, Flame, 
  Dribbble, Swords, CircleDot, ArrowRight, 
  ChevronRight, Radio,
  Volume2, VolumeX, Compass, Layers, Cpu, HeartPulse
} from 'lucide-react';

interface LandingPageProps {
  onOpenLab: (targetView?: 'dashboard' | 'arena' | 'academy' | 'training' | 'lab') => void;
  onOpenDisclaimer?: () => void;
}

interface Athlete {
  name: string;
  discipline: string;
  prq: string;
  grade: 'ELITE' | 'PRIMED' | 'READY';
  tag: string;
}

interface VenuePreset {
  id: string;
  name: string;
  location: string;
  discipline: string;
  tint: string;
  accentColor: string;
  bgGradient: string;
  stats: { metric: string; val: string }[];
  tag: string;
  description: string;
}

const VENUES: VenuePreset[] = [
  {
    id: 'venice-court',
    name: 'VENICE HOOPERS PARADISE',
    location: 'Venice Beach Boardwalk, CA',
    discipline: 'Slam Dunk & 3v3 Streetball',
    tint: '#00F2FF',
    accentColor: '#00F2FF',
    bgGradient: 'from-[#00384D] via-[#051520] to-[#05060A]',
    tag: 'REGULATION 3.05M RIM',
    description: 'Iconic oceanfront asphalt featuring high-contrast blue court lines, heavy crowd energy, and 16.6ms penultimate stride tracking.',
    stats: [
      { metric: 'GCT Benchmark', val: '< 0.098s' },
      { metric: 'Elastic Recoil', val: '4.8x BW' },
      { metric: 'Hype Multiplier', val: '2.5x' }
    ]
  },
  {
    id: 'shimogamo-dojo',
    name: 'SHIMOGAMO CYBER DOJO',
    location: 'Kyoto Sacred Grove / Neo-Torii',
    discipline: 'Karate Duel & Soul-Calibur Stance',
    tint: '#FF9D5C',
    accentColor: '#FF6B00',
    bgGradient: 'from-[#421B0A] via-[#1E0E05] to-[#05060A]',
    tag: '360° POSTURE GRID',
    description: 'Traditional tatami ring fused with neon torii gates and 8-way directional ground force telemetry for precise martial art strikes.',
    stats: [
      { metric: 'Reaction Window', val: '120ms' },
      { metric: 'Strike Velocity', val: '14.2 m/s' },
      { metric: 'Chi Multiplier', val: '3.0x' }
    ]
  },
  {
    id: 'court-carnival',
    name: 'COURT CARNIVAL SUNSET',
    location: 'Venice Pier Boardwalk Carnival',
    discipline: 'High-Flying Dunk Contest',
    tint: '#FFD700',
    accentColor: '#FFD700',
    bgGradient: 'from-[#4D3A00] via-[#241A00] to-[#05060A]',
    tag: 'CONTEST JUDGE HUD',
    description: 'Sunset beach festival atmosphere with vibrant neon carnival booths, string lights, and adjudicated 3-judge slam scorecard systems.',
    stats: [
      { metric: 'Hang Time Target', val: '0.88s' },
      { metric: 'Takeoff Angle', val: '44.5°' },
      { metric: 'Max Shard Bounty', val: '+250' }
    ]
  },
  {
    id: 'venice-skatepark',
    name: 'VENICE BEACH SKATEPARK',
    location: 'Oceanfront Concrete Bowl & Street Rails',
    discipline: 'Skateboarding & Snowboard Slalom',
    tint: '#A855F7',
    accentColor: '#A855F7',
    bgGradient: 'from-[#2D0D4E] via-[#140624] to-[#05060A]',
    tag: '540° ROTATION MATRIX',
    description: 'Sun-drenched graffiti bowl and street stair set calibrated for ollie height, rail lock friction, and swept rotation impulses.',
    stats: [
      { metric: 'Air Clearance', val: '1.85m' },
      { metric: 'Carve G-Force', val: '2.1 G' },
      { metric: 'Spin Speed', val: '720°/s' }
    ]
  },
  {
    id: 'pacifica-gym',
    name: 'PACIFICA GYMNASTICS & MUSCLE BEACH',
    location: 'Coastal Powerhouse Arena',
    discipline: 'Floor Rhythm, Vault & Heavy Lifts',
    tint: '#00FF9D',
    accentColor: '#00FF9D',
    bgGradient: 'from-[#003822] via-[#02180E] to-[#05060A]',
    tag: 'FORCE-VELOCITY PLATFORM',
    description: 'High-density spring floor and outdoor weight pit tracking rate of force development (RFD) and kinetic extension chains.',
    stats: [
      { metric: 'Peak Power', val: '7,400 W' },
      { metric: 'Tendon Stiffness', val: 'K_420 N/mm' },
      { metric: 'Neural Drive', val: '99.4%' }
    ]
  },
  {
    id: 'catalina-links',
    name: 'CATALINA BALLPARK & COASTAL LINKS',
    location: 'Pacific Island Fairways & Diamond',
    discipline: 'Baseball Home-Run & Golf Precision',
    tint: '#38BDF8',
    accentColor: '#38BDF8',
    bgGradient: 'from-[#072F4A] via-[#031422] to-[#05060A]',
    tag: 'AERODYNAMIC SWEPT-HIT',
    description: 'Lush seaside turf and stadium diamond monitoring club/bat swing angular velocity, sweet-spot impact, and projectile launch trajectories.',
    stats: [
      { metric: 'Exit Velocity', val: '112 mph' },
      { metric: 'Launch Angle', val: '28.2°' },
      { metric: 'Target Pin Dispersion', val: '< 1.2m' }
    ]
  }
];

const DISCIPLINE_CARDS = [
  {
    id: 'dunk',
    title: 'BASKETBALL DUNK CONTEST',
    venue: 'Venice Beach Blacktop',
    tag: 'POWER & HANGTIME',
    icon: Dribbble,
    tint: '#00F2FF',
    metric: 'GCT < 0.10s',
    targetView: 'arena' as const
  },
  {
    id: 'karate',
    title: 'CYBER DOJO KARATE DUEL',
    venue: 'Shimogamo Dojo',
    tag: '8-WAY DIRECTIONAL',
    icon: Swords,
    tint: '#FF9D5C',
    metric: '16.6ms Stance',
    targetView: 'arena' as const
  },
  {
    id: 'tennis',
    title: 'TENNIS CENTRE OPEN',
    venue: 'Venice Tennis Court',
    tag: 'SWEPT-HIT VOLLEY',
    icon: Activity,
    tint: '#00FF9D',
    metric: 'Topspin / Lob',
    targetView: 'arena' as const
  },
  {
    id: 'football',
    title: 'GRIDIRON JUKE & HURDLE',
    venue: 'Gridiron Stadium',
    tag: 'PENULTIMATE CUT',
    icon: Shield,
    tint: '#A855F7',
    metric: 'Lateral Force',
    targetView: 'arena' as const
  },
  {
    id: 'soccer',
    title: 'COASTAL FC STRIKE & KEEP',
    venue: 'Coastal FC Stadium',
    tag: 'PENALTY VELOCITY',
    icon: CircleDot,
    tint: '#38BDF8',
    metric: 'Dive Geometry',
    targetView: 'arena' as const
  },
  {
    id: 'snowboard',
    title: 'MOUNTAIN SLOPE SLALOM',
    venue: 'Mountain Alpine Peak',
    tag: 'CARVE EDGE FLUIDITY',
    icon: Zap,
    tint: '#F472B6',
    metric: 'Kinetic Drift',
    targetView: 'arena' as const
  }
];

const LandingPage: React.FC<LandingPageProps> = ({ onOpenLab, onOpenDisclaimer }) => {
  const [selectedVenue, setSelectedVenue] = useState<VenuePreset>(VENUES[0]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  
  // Interactive GCT Tap Tester
  const [tapState, setTapState] = useState<{
    lastTap: number;
    gct: number | null;
    rating: string | null;
    color: string;
    tapCount: number;
  }>({
    lastTap: 0,
    gct: null,
    rating: null,
    color: '#00F2FF',
    tapCount: 0
  });

  const [topAthletes, setTopAthletes] = useState<Athlete[]>([
    { name: 'ELIJAH BONDS', discipline: 'Dunk Contest & Vert', prq: '98.4', grade: 'ELITE', tag: 'SOVEREIGN #01' },
    { name: 'MARCUS VANE', discipline: 'Karate Duel & Combat', prq: '96.2', grade: 'ELITE', tag: 'DOJO MASTER' },
    { name: 'SARAH CHEN', discipline: 'Pacifica Gymnastics', prq: '95.8', grade: 'ELITE', tag: 'VAULT SPECIALIST' },
    { name: 'DAVID ROSS', discipline: 'Gridiron Hurdle', prq: '94.1', grade: 'PRIMED', tag: 'LATERAL SPEED' },
    { name: 'ELENA GOMEZ', discipline: 'Tennis Centre Court', prq: '93.5', grade: 'PRIMED', tag: 'SWEPT VOLLEY' },
    { name: 'CHRIS PARK', discipline: 'Venice Bowl Skate', prq: '92.9', grade: 'PRIMED', tag: '540 ROTATION' },
    { name: 'TYLER REED', discipline: 'Catalina Ballpark', prq: '91.4', grade: 'READY', tag: 'HOME RUN DERBY' },
    { name: 'AMARA OKORO', discipline: 'Alpine Snowboard', prq: '90.2', grade: 'READY', tag: 'CARVE APEX' }
  ]);

  // Audio synthesize sound effect
  const playSynthChime = (freq = 440, type: OscillatorType = 'sine', duration = 0.12) => {
    if (!soundEnabled) return;
    try {
      let ctx = audioCtx;
      if (!ctx) {
        ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        setAudioCtx(ctx);
      }
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio fallback silent
    }
  };

  // Handle GCT Tap Test
  const handleContactTap = () => {
    const now = performance.now();
    playSynthChime(660, 'triangle', 0.08);
    
    if (tapState.lastTap === 0) {
      setTapState({
        lastTap: now,
        gct: null,
        rating: 'TAP AGAIN IN RHYTHM',
        color: '#00F2FF',
        tapCount: 1
      });
      return;
    }

    const deltaMs = Math.round(now - tapState.lastTap);
    let rating = 'RECOVERING (SLOW)';
    let color = '#FFD700';

    if (deltaMs < 120) {
      rating = 'ELITE CLINICAL (< 0.12s)';
      color = '#00F2FF';
    } else if (deltaMs < 190) {
      rating = 'PRIMED EXPLOSIVE';
      color = '#00FF9D';
    } else if (deltaMs < 300) {
      rating = 'READY STANDARD';
      color = '#A855F7';
    }

    setTapState({
      lastTap: now,
      gct: deltaMs,
      rating,
      color,
      tapCount: tapState.tapCount + 1
    });
  };

  // Pulse leaderboard scores randomly to simulate live telemetry stream
  useEffect(() => {
    const timer = setInterval(() => {
      setTopAthletes(prev => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * next.length);
        const score = parseFloat(next[idx].prq);
        const nudge = (Math.random() - 0.5) * 0.2;
        next[idx] = {
          ...next[idx],
          prq: Math.max(85, Math.min(99.9, score + nudge)).toFixed(1)
        };
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#050508] text-white selection:bg-[#00F2FF]/30 relative overflow-hidden flex flex-col font-sans">
      
      {/* ── 1. Sovereign Top Telemetry HUD & Status Bar ── */}
      <header className="sticky top-0 z-40 bg-[#07090E]/90 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00F2FF] to-[#7000FF] p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.4)]">
              <div className="w-full h-full bg-[#07090E] rounded-[10px] flex items-center justify-center">
                <Flame className="w-4 h-4 text-[#00F2FF]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-black text-sm tracking-wider text-white">FINAL EVOLUTION</span>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00F2FF]/10 text-[#00F2FF] border border-[#00F2FF]/30">
                  VENICE NIGHT COURT
                </span>
              </div>
              <p className="text-[10px] font-mono text-zinc-400 hidden sm:block">
                AI COACH & CLINICAL PERFORMANCE LAB • 16.6ms SYNC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playSynthChime(520, 'sine', 0.1);
              }}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                soundEnabled 
                  ? 'border-[#00F2FF]/40 text-[#00F2FF] bg-[#00F2FF]/10 shadow-[0_0_15px_rgba(0,242,255,0.25)]' 
                  : 'border-white/10 text-zinc-400 hover:text-white bg-white/5'
              }`}
              title="Toggle Audio Feedback"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{soundEnabled ? 'AUDIO: SYNTH ON' : 'AUDIO: MUTED'}</span>
            </button>

            {/* Direct Launch Fast Button */}
            <button
              onClick={() => {
                playSynthChime(750, 'sine', 0.15);
                onOpenLab('arena');
              }}
              className="px-4 sm:px-5 py-2 rounded-xl bg-[#00F2FF] text-black font-orbitron font-black text-xs sm:text-sm uppercase tracking-wider hover:bg-[#00F2FF]/90 transition-all shadow-[0_0_25px_rgba(0,242,255,0.4)] active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>START ARENA</span>
            </button>
          </div>
        </div>

        {/* Real-time Ticker */}
        <div className="w-full bg-black/60 border-t border-white/5 py-1.5 px-4 overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-marquee">
            {topAthletes.concat(topAthletes).map((ath, idx) => (
              <span key={idx} className="mx-6 text-[10px] font-mono tracking-widest text-zinc-400 inline-flex items-center gap-2">
                <span className="text-[#00F2FF] font-bold">#{idx % topAthletes.length + 1}</span>
                <span className="text-white font-medium">{ath.name}</span>
                <span className="text-zinc-500">// {ath.discipline}</span>
                <span className="text-[#00FF9D] font-bold">PRQ {ath.prq} [{ath.grade}]</span>
                <span className="text-zinc-600">•</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ── 2. Cinematic Hero Stage & Dynamic Venue Showcase ── */}
      <section className="relative w-full min-h-[750px] lg:min-h-[850px] flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        
        {/* Dynamic Background Atmosphere Based on Selected Venue */}
        <div className="absolute inset-0 pointer-events-none -z-10 transition-all duration-700">
          <div 
            className={`absolute inset-0 bg-gradient-to-b ${selectedVenue.bgGradient} opacity-90 transition-all duration-700`} 
          />
          {/* Subtle Grid Lines */}
          <div 
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `linear-gradient(to right, ${selectedVenue.tint}22 1px, transparent 1px), linear-gradient(to bottom, ${selectedVenue.tint}22 1px, transparent 1px)`,
              backgroundSize: '48px 48px'
            }}
          />
          {/* Kinetic Ambient Radial Glow */}
          <div 
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] opacity-25 transition-all duration-700"
            style={{ background: selectedVenue.tint }}
          />
        </div>

        {/* Hero Top Title & Value Proposition */}
        <div className="space-y-6 max-w-4xl mx-auto text-center mt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <Radio className="w-3.5 h-3.5 text-[#00F2FF] animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-300 uppercase font-semibold">
              CLINICAL BIOMECHANICS & MULTI-SPORT AVATAR ENGINE
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-orbitron font-black tracking-tight leading-[1.05] text-white">
            THE SOVEREIGN <br />
            <span 
              className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FF] via-[#7000FF] to-[#FF9D5C] drop-shadow-[0_0_35px_rgba(0,242,255,0.3)]"
            >
              PERFORMANCE LAB.
            </span>
          </h1>

          <p className="text-zinc-300 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
            Venice Beach night-court dunk loop built on real-time biomechanics. <strong className="text-[#00F2FF] font-medium">164 ms GCT</strong>,
            <strong className="text-white"> 4.8x BW elastic recoil</strong>, and the definitive Bonds Standard for reactive ground contact time.
          </p>

          {/* Quick Action Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
            <button
              onClick={() => {
                playSynthChime(600, 'sine', 0.15);
                onOpenLab('arena');
              }}
              className="px-8 py-4 rounded-2xl bg-[#00F2FF] text-black font-orbitron font-black text-sm tracking-wider hover:bg-[#00F2FF]/90 transition-all shadow-[0_0_35px_rgba(0,242,255,0.4)] active:scale-95 flex items-center gap-3 cursor-pointer"
            >
              <Swords className="w-4 h-4 text-black" />
              <span>ENTER VENICE COURT</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* ── 3. Interactive Venue Stage & Live Telemetry Glass Card ── */}
        <div className="mt-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Venue Preset Carousel & Visual Preview */}
          <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-black/60 border border-white/10 backdrop-blur-2xl relative overflow-hidden flex flex-col justify-between shadow-2xl">
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full animate-ping"
                  style={{ background: selectedVenue.tint }}
                />
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold" style={{ color: selectedVenue.tint }}>
                  ACTIVE VENUE CALIBRATION
                </span>
              </div>
              <span className="text-xs font-mono text-zinc-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {selectedVenue.tag}
              </span>
            </div>

            {/* Center Stage Presentation */}
            <div className="space-y-4 my-2">
              <h2 className="text-2xl sm:text-4xl font-orbitron font-black tracking-tight text-white">
                {selectedVenue.name}
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <Compass className="w-3.5 h-3.5 text-zinc-500" />
                <span>{selectedVenue.location}</span>
                <span>•</span>
                <span className="text-white font-medium">{selectedVenue.discipline}</span>
              </div>
              <p className="text-sm text-zinc-300 max-w-xl leading-relaxed">
                {selectedVenue.description}
              </p>
            </div>

            {/* Metrics Triad */}
            <div className="grid grid-cols-3 gap-3 my-6">
              {selectedVenue.stats.map((s, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase">{s.metric}</div>
                  <div className="text-base sm:text-xl font-orbitron font-black text-white mt-1" style={{ color: selectedVenue.tint }}>
                    {s.val}
                  </div>
                </div>
              ))}
            </div>

            {/* Venue Selector Navigation Tabs */}
            <div className="pt-4 border-t border-white/10">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3 flex items-center justify-between">
                <span>EXPLORE PERFORMANCE VENUES</span>
                <span className="text-[#00F2FF]">SELECT PRESET</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {VENUES.map((v) => {
                  const isActive = v.id === selectedVenue.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        playSynthChime(480 + VENUES.indexOf(v) * 50, 'sine', 0.08);
                        setSelectedVenue(v);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'border-[#00F2FF] bg-[#00F2FF]/10 text-white shadow-[0_0_15px_rgba(0,242,255,0.3)]'
                          : 'border-white/5 bg-white/[0.02] text-zinc-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <div className="text-[9px] font-mono font-bold truncate uppercase" style={{ color: isActive ? '#00F2FF' : undefined }}>
                        {v.name.split(' ')[0]} {v.name.split(' ')[1] || ''}
                      </div>
                      <div className="text-[8px] font-mono text-zinc-500 truncate mt-0.5">
                        {v.discipline.split('&')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Live GCT Contact Rhythm Scanner & Diagnostics */}
          <div className="lg:col-span-4 p-6 sm:p-8 rounded-3xl bg-black/60 border border-white/10 backdrop-blur-2xl flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-[#00F2FF]" />
                  <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-white">
                    GCT RHYTHM SCANNER
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#00FF9D] px-2 py-0.5 rounded bg-[#00FF9D]/10 border border-[#00FF9D]/30 font-bold">
                  LIVE INTERACTION
                </span>
              </div>

              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Test your reactive ground contact rhythm. Tap the pad twice in quick succession to evaluate your neuromuscular stiffness rating against the Bonds clinical standard.
              </p>

              {/* Interactive Pad */}
              <button
                onClick={handleContactTap}
                className="w-full py-8 rounded-2xl border-2 border-dashed transition-all active:scale-95 flex flex-col items-center justify-center gap-2 relative overflow-hidden group cursor-pointer"
                style={{
                  borderColor: tapState.color,
                  backgroundColor: `${tapState.color}15`,
                  boxShadow: `0 0 30px ${tapState.color}25`
                }}
              >
                <div className="p-3 rounded-full bg-white/10 group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6" style={{ color: tapState.color }} />
                </div>
                <span className="font-orbitron font-black text-sm tracking-wider text-white">
                  TAP CONTACT ZONE
                </span>
                <span className="text-[10px] font-mono text-zinc-300">
                  {tapState.gct ? `${tapState.gct} ms INTERVAL` : 'CLICK TO INITIATE PULSE'}
                </span>
              </button>

              {/* Diagnostic Output */}
              <div className="mt-6 p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">STATUS:</span>
                  <span className="font-bold" style={{ color: tapState.color }}>
                    {tapState.rating || 'AWAITING TAP SEQUENCE'}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">BENCHMARK:</span>
                  <span className="text-white">&lt; 0.10s (ELITE FLYING)</span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">TAPS LOGGED:</span>
                  <span className="text-zinc-300">{tapState.tapCount}</span>
                </div>
              </div>
            </div>

            {/* Quick Safety Disclaimer Access */}
            <div className="pt-4 border-t border-white/10 mt-6">
              <button
                onClick={onOpenDisclaimer}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-mono text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-[#00F2FF]" />
                <span>CLINICAL SAFETY CLEARANCE & PROTOCOLS</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. 10-Phase Multi-Sport System Quick Launch Grid ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full z-10 border-t border-white/5">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#00F2FF] uppercase font-bold mb-2">
              <Layers className="w-3.5 h-3.5 text-[#00F2FF]" />
              <span>10-DISCIPLINE ARENA ENGINE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-orbitron font-black tracking-tight text-white">
              SELECT MOVEMENT ARCHETYPE
            </h2>
          </div>
          <button
            onClick={() => onOpenLab('arena')}
            className="text-xs font-mono text-[#00F2FF] hover:underline flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <span>VIEW ALL 10 ARENA MODES</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {DISCIPLINE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => {
                  playSynthChime(620, 'sine', 0.12);
                  onOpenLab(card.targetView);
                }}
                className="p-6 rounded-3xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-[#00F2FF]/40 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div 
                      className="p-3 rounded-2xl transition-transform group-hover:scale-110"
                      style={{ background: `${card.tint}15`, color: card.tint }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span 
                      className="text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full border"
                      style={{ color: card.tint, borderColor: `${card.tint}40`, background: `${card.tint}10` }}
                    >
                      {card.tag}
                    </span>
                  </div>

                  <h3 className="font-orbitron font-black text-lg text-white group-hover:text-[#00F2FF] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs font-mono text-zinc-400 mt-1">
                    {card.venue}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">{card.metric}</span>
                  <span className="text-[#00F2FF] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    LAUNCH ARENA <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 5. The Bonds Standard Clinical Biomechanics Matrix ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full z-10 border-t border-white/5">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#00F2FF]/10 via-black/80 to-[#7000FF]/10 border border-[#00F2FF]/30 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F2FF]/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] text-[10px] font-mono font-bold uppercase">
              <Cpu className="w-3.5 h-3.5" />
              <span>THE BONDS STANDARD FORENSICS</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-orbitron font-black tracking-tight text-white">
              NO GUESSWORK. <br />
              <span className="text-[#00F2FF]">PURE EXPLOSIVE PHYSICS.</span>
            </h2>

            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
              Elite vertical displacement and lateral agility demand ground contact times under 0.10 seconds. 
              Final Evolution Lab monitors force application curves, penultimate stride deceleration, and energy leakage with millisecond precision.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10">
                <div className="text-[10px] font-mono text-[#00F2FF] font-bold uppercase">16.6ms LATENCY</div>
                <div className="text-lg font-orbitron font-black text-white mt-1">CLINICAL SYNC</div>
                <div className="text-xs text-zinc-400 mt-1">Zero-lag frame timing guarantees exact biomechanical measurement.</div>
              </div>
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10">
                <div className="text-[10px] font-mono text-[#FF9D5C] font-bold uppercase">PENULTIMATE STRIDE</div>
                <div className="text-lg font-orbitron font-black text-white mt-1">LONG-SHORT</div>
                <div className="text-xs text-zinc-400 mt-1">Haptic feedback corrects approach angles and takeoff momentum.</div>
              </div>
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10">
                <div className="text-[10px] font-mono text-[#00FF9D] font-bold uppercase">SOVEREIGN VAULT</div>
                <div className="text-lg font-orbitron font-black text-white mt-1">PROOF LEDGER</div>
                <div className="text-xs text-zinc-400 mt-1">Earn un-cheatable PRQ shards and exportable athlete cards.</div>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap gap-4">
              <button
                onClick={() => onOpenLab('arena')}
                className="px-8 py-4 rounded-2xl bg-[#00F2FF] text-black font-orbitron font-black text-sm tracking-wider hover:bg-[#00F2FF]/90 transition-all shadow-[0_0_30px_rgba(0,242,255,0.4)] active:scale-95 cursor-pointer"
              >
                ENTER VENICE COURT
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Footer System Diagnostics ── */}
      <footer className="mt-auto border-t border-white/10 bg-[#07090E] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-white font-bold font-orbitron">
              <Flame className="w-4 h-4 text-[#00F2FF]" /> FINAL EVOLUTION LAB
            </span>
            <span className="text-zinc-600">|</span>
            <span>SOVEREIGN PERFORMANCE PROTOCOL</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[11px]">
            <button 
              onClick={onOpenDisclaimer} 
              className="text-zinc-400 hover:text-[#00F2FF] transition-colors cursor-pointer"
            >
              MEDICAL DISCLAIMER
            </button>
            <button 
              onClick={() => onOpenLab('academy')} 
              className="text-zinc-400 hover:text-[#00F2FF] transition-colors cursor-pointer"
            >
              UNIVERSITY HUBS
            </button>
            <span className="text-zinc-600">© 2026 FINAL EVOLUTION GROUP</span>
          </div>
        </div>
      </footer>

      {/* Marquee Animation CSS */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 35s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
