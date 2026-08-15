import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, Flag, 
  Wind, Award, Play
} from 'lucide-react';
import { SoundJuice } from '../../lib/judgeScoring';

interface GolfPrecisionModeProps {
  onBack: () => void;
}

type ClubType = 'DRIVER' | '3_WOOD' | '5_IRON' | '7_IRON' | 'PITCHING_WEDGE' | 'PUTTER';

const CLUBS: { type: ClubType; name: string; maxDistYards: number; loftAngle: number }[] = [
  { type: 'DRIVER', name: '1W TOUR TITANIUM', maxDistYards: 310, loftAngle: 9.5 },
  { type: '3_WOOD', name: '3W FAIRWAY METAL', maxDistYards: 260, loftAngle: 15.0 },
  { type: '5_IRON', name: '5I CAVITY BACK', maxDistYards: 210, loftAngle: 26.0 },
  { type: '7_IRON', name: '7I PRECISION BLADE', maxDistYards: 175, loftAngle: 34.0 },
  { type: 'PITCHING_WEDGE', name: 'PW 48° ATTACK', maxDistYards: 135, loftAngle: 48.0 },
  { type: 'PUTTER', name: 'MALLET TOUR PUTTER', maxDistYards: 45, loftAngle: 3.5 }
];

export const GolfPrecisionMode: React.FC<GolfPrecisionModeProps> = ({ onBack }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedClub, setSelectedClub] = useState<ClubType>('DRIVER');
  const [holeNumber] = useState<number>(7);
  const [holePar] = useState<number>(4);
  const [distanceToPin, setDistanceToPin] = useState<number>(420); // yards
  const [windSpeed, setWindSpeed] = useState<number>(12); // mph
  const [windDirection, setWindDirection] = useState<'LEFT_TO_RIGHT' | 'HEADWIND' | 'TAILWIND' | 'RIGHT_TO_LEFT'>('LEFT_TO_RIGHT');
  const [shotCount, setShotCount] = useState<number>(1);

  // 3-Click Swing Meter State
  // Phase: 0 = Idle, 1 = Charging Power (going up), 2 = Accuracy Timing (coming back down), 3 = Resolving
  const [swingPhase, setSwingPhase] = useState<0 | 1 | 2 | 3>(0);
  const [meterPower, setMeterPower] = useState<number>(0);
  const [swingMeterPos, setSwingMeterPos] = useState<number>(0); // 0 to 100

  // Shot Result Report
  const [shotReport, setShotReport] = useState<{
    shotNumber: number;
    club: string;
    carryYards: number;
    offlineYards: number;
    spinRpm: number;
    ballSpeedMph: number;
    remainingYards: number;
    qualityGrade: string;
    whyExplainer: string;
  } | null>(null);

  const meterIntervalRef = useRef<number | null>(null);

  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);

  // Handle Swing Meter Loops
  useEffect(() => {
    if (swingPhase === 1) {
      // Power Charge
      meterIntervalRef.current = window.setInterval(() => {
        setSwingMeterPos(prev => {
          if (prev >= 100) return 100;
          return prev + 3;
        });
      }, 16);
    } else if (swingPhase === 2) {
      // Accuracy Descent
      meterIntervalRef.current = window.setInterval(() => {
        setSwingMeterPos(prev => {
          if (prev <= 0) return 0;
          return prev - 4;
        });
      }, 16);
    }

    return () => {
      if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
    };
  }, [swingPhase]);

  const handleSwingClick = () => {
    if (swingPhase === 0) {
      // Start swing - Begin power charge
      setSwingPhase(1);
      setSwingMeterPos(0);
      playSfx(() => SoundJuice.playTakeoff());
    } else if (swingPhase === 1) {
      // Lock Power (First Click)
      setMeterPower(swingMeterPos);
      setSwingPhase(2);
      playSfx(() => SoundJuice.playZoneBeep());
    } else if (swingPhase === 2) {
      // Lock Accuracy (Second Click)
      if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
      setSwingPhase(3);
      resolveGolfShot(meterPower, swingMeterPos);
    }
  };

  const resolveGolfShot = (powerVal: number, accVal: number) => {
    const clubData = CLUBS.find(c => c.type === selectedClub) || CLUBS[0];
    
    // Physics calculation
    const powerPct = powerVal / 100; // 0 to 1
    const idealAccuracy = 15; // 15% marker is the dead-center sweet spot
    const accDelta = accVal - idealAccuracy; // negative = push/slice, positive = hook/pull
    
    const baseCarry = clubData.maxDistYards * powerPct;
    let windEffect = 0;
    if (windDirection === 'HEADWIND') windEffect = -windSpeed * 1.5;
    else if (windDirection === 'TAILWIND') windEffect = windSpeed * 1.2;

    const finalCarry = Math.max(10, Math.round(baseCarry + windEffect));
    const offlineYards = Math.round(accDelta * 1.4 + (windDirection === 'LEFT_TO_RIGHT' ? windSpeed * 0.8 : -windSpeed * 0.8));
    const ballSpeedMph = Math.round(powerPct * (clubData.type === 'DRIVER' ? 172 : 130));
    const spinRpm = Math.round(2200 + (clubData.loftAngle * 110));

    const newDist = Math.max(0, distanceToPin - finalCarry);
    setDistanceToPin(newDist);

    let quality = 'CENTER FAIRWAY PINSEEKER';
    if (Math.abs(offlineYards) > 25) quality = 'ROUGH PUSH-FADE';
    if (newDist === 0) quality = 'ACE // IN THE HOLE!';

    let why = `Locked ${powerVal}% clubhead energy with ${ballSpeedMph} MPH ball velocity. `;
    if (Math.abs(accDelta) <= 3) {
      why += 'Square impact through dynamic loft with pure trajectory.';
    } else {
      why += `Impact face angle was open by ${Math.abs(accDelta * 0.3).toFixed(1)}°, causing ${Math.abs(offlineYards)} yards of drift in the ${windSpeed} MPH crosswind.`;
    }

    playSfx(() => SoundJuice.playGolfSwing());

    setShotReport({
      shotNumber: shotCount,
      club: clubData.name,
      carryYards: finalCarry,
      offlineYards,
      spinRpm,
      ballSpeedMph,
      remainingYards: newDist,
      qualityGrade: quality,
      whyExplainer: why
    });
  };

  const nextShot = () => {
    setShotReport(null);
    setSwingPhase(0);
    setSwingMeterPos(0);
    setShotCount(s => s + 1);

    // Auto-select smart club
    if (distanceToPin <= 30) setSelectedClub('PUTTER');
    else if (distanceToPin <= 130) setSelectedClub('PITCHING_WEDGE');
    else if (distanceToPin <= 170) setSelectedClub('7_IRON');
    else if (distanceToPin <= 210) setSelectedClub('5_IRON');
    else if (distanceToPin <= 260) setSelectedClub('3_WOOD');
    else setSelectedClub('DRIVER');
  };

  const restartHole = () => {
    setDistanceToPin(420);
    setShotCount(1);
    setShotReport(null);
    setSwingPhase(0);
    setSwingMeterPos(0);
    setSelectedClub('DRIVER');
    setWindSpeed(14);
    setWindDirection('RIGHT_TO_LEFT');
  };

  return (
    <div className="unreal-canvas relative w-full h-[720px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
      {/* Top Links HUD */}
      <div className="relative z-10 p-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-white hover:border-[#00FF9D] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#00FF9D]/20 text-[#00FF9D] border border-[#00FF9D]/40 font-bold uppercase">
                GOLF PRECISION // COURSE INTELLIGENCE
              </span>
              <span className="text-xs font-mono text-zinc-400">• PINE VALLEY LINKS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase tracking-tight mt-0.5">
              HOLE {holeNumber} • PAR {holePar} • {distanceToPin} YDS TO PIN
            </h1>
          </div>
        </div>

        {/* Environmental Telemetry */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-2.5 rounded-2xl bg-black/70 border border-white/10 flex items-center gap-3">
            <Wind className="w-4 h-4 text-[#00FF9D]" />
            <div>
              <div className="text-[9px] font-mono text-zinc-400">WIND INTEL</div>
              <div className="text-xs font-mono font-bold text-white">
                {windSpeed} MPH {windDirection.replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-black/70 border border-white/10 flex items-center gap-3">
            <Flag className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[9px] font-mono text-zinc-400">SHOT #</div>
              <div className="text-xs font-mono font-bold text-amber-400">
                STROKE {shotCount} (PAR {holePar})
              </div>
            </div>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00FF9D]" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
          </button>
        </div>
      </div>

      {/* Main Course Aerial & Fairway Canvas */}
      <div className="relative flex-1 mx-6 rounded-3xl bg-zinc-950/80 border border-[#00FF9D]/20 overflow-hidden flex flex-col justify-between p-6">
        {/* Fairway 2.5D Rendering Canvas */}
        <div className="relative w-full h-56 sm:h-64 rounded-2xl bg-gradient-to-b from-[#113824] via-[#0b2417] to-[#040e09] border border-white/10 overflow-hidden flex items-center justify-between px-12">
          {/* Fairway Contours */}
          <div className="absolute inset-0 bg-[radial-gradient(#00FF9D_1px,transparent_1px)] [background-size:32px_32px] opacity-15 pointer-events-none" />

          {/* Tee Box */}
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#00FF9D]/20 border border-[#00FF9D] flex items-center justify-center text-xl">
              ⛳
            </div>
            <span className="text-[10px] font-mono text-[#00FF9D] font-bold">TEE / LIE</span>
          </div>

          {/* Trajectory Vector Arc */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 z-10">
            <div className="text-xs font-mono text-zinc-400 mb-1">CARRY TARGET TRAJECTORY</div>
            <div className="w-full h-0.5 border-t-2 border-dashed border-[#00FF9D]/50 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-black/80 border border-[#00FF9D]/40 text-[10px] font-mono text-[#00FF9D] font-bold">
                {CLUBS.find(c => c.type === selectedClub)?.maxDistYards} YARDS EST.
              </div>
            </div>
          </div>

          {/* Green & Flag */}
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="w-14 h-14 rounded-full bg-emerald-500/30 border-2 border-amber-400 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(251,191,36,0.3)] animate-pulse">
              🚩
            </div>
            <span className="text-[10px] font-mono text-amber-400 font-bold">PIN {distanceToPin} YDS</span>
          </div>
        </div>

        {/* Club Selector Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 max-w-full">
          <span className="text-[10px] font-mono text-zinc-400 uppercase mr-2">CLUB:</span>
          {CLUBS.map((club) => (
            <button
              key={club.type}
              onClick={() => setSelectedClub(club.type)}
              disabled={swingPhase !== 0}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedClub === club.type
                  ? 'bg-[#00FF9D] text-black shadow-[0_0_15px_rgba(0,255,157,0.4)]'
                  : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              {club.name} ({club.maxDistYards}y)
            </button>
          ))}
        </div>
      </div>

      {/* Shot Report Modal Overlay */}
      {shotReport && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-950 border border-[#00FF9D]/40 shadow-[0_0_80px_rgba(0,255,157,0.3)] space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#00FF9D]/20 border border-[#00FF9D]/40 text-[#00FF9D] flex items-center justify-center mx-auto">
              <Award className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-[#00FF9D] uppercase tracking-widest font-bold">
                SHOT TELEMETRY REPORT
              </span>
              <h2 className="text-2xl sm:text-3xl font-orbitron font-black text-white mt-1">
                {shotReport.qualityGrade}
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-left">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">TOTAL CARRY:</span>
                <span className="font-bold text-[#00FF9D]">{shotReport.carryYards} YARDS</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">BALL SPEED:</span>
                <span className="font-bold text-white">{shotReport.ballSpeedMph} MPH</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">BACKSPIN:</span>
                <span className="font-bold text-white">{shotReport.spinRpm} RPM</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">DISTANCE TO PIN:</span>
                <span className="font-bold text-amber-400">{shotReport.remainingYards} YARDS</span>
              </div>
              <p className="text-[11px] font-mono text-zinc-300 pt-2 border-t border-white/10 leading-relaxed">
                <span className="text-[#00FF9D] font-bold">PHYSICS:</span> {shotReport.whyExplainer}
              </p>
            </div>

            <div className="flex gap-3">
              {shotReport.remainingYards === 0 ? (
                <button
                  onClick={restartHole}
                  className="flex-1 py-4 bg-[#00FF9D] text-black font-orbitron font-black text-sm rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_25px_rgba(0,255,157,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  NEXT HOLE
                </button>
              ) : (
                <button
                  onClick={nextShot}
                  className="flex-1 py-4 bg-[#00FF9D] text-black font-orbitron font-black text-sm rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_25px_rgba(0,255,157,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  STROKE #{shotCount + 1}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom 3-Click Swing Meter */}
      <div className="relative z-10 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Visual Swing Gauge */}
        <div className="flex-1 w-full space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#00FF9D] font-bold">
              {swingPhase === 0 && 'CLICK 1: START SWING'}
              {swingPhase === 1 && 'CLICK 2: LOCK POWER AT TOP'}
              {swingPhase === 2 && 'CLICK 3: SNAP ACCURACY AT SWEET SPOT (15%)'}
              {swingPhase === 3 && 'RESOLVING BALL FLIGHT...'}
            </span>
            <span className="text-white font-bold">{Math.round(swingMeterPos)}%</span>
          </div>

          <div className="h-5 rounded-full bg-white/10 relative overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-[#00FF9D] transition-all"
              style={{ width: `${swingMeterPos}%` }}
            />
            {/* 15% Sweet Spot Indicator */}
            <div className="absolute top-0 bottom-0 left-[15%] w-2 bg-white shadow-[0_0_10px_white]" />
          </div>
        </div>

        <button
          onClick={handleSwingClick}
          disabled={swingPhase === 3 || !!shotReport}
          className="px-8 py-4 rounded-2xl bg-[#00FF9D] text-black font-orbitron font-black text-sm tracking-wider hover:scale-105 transition-all shadow-[0_0_35px_rgba(0,255,157,0.4)] flex items-center gap-2 cursor-pointer select-none"
        >
          <Play className="w-4 h-4 fill-black" />
          <span>
            {swingPhase === 0 && 'ADDRESS BALL'}
            {swingPhase === 1 && 'LOCK POWER'}
            {swingPhase === 2 && 'SNAP IMPACT'}
            {swingPhase === 3 && 'SHOT COMPLETE'}
          </span>
        </button>
      </div>
    </div>
  );
};
