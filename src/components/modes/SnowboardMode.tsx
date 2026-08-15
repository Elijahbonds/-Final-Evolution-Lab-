import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, Flame, 
  Play, Pause
} from 'lucide-react';
import { 
  SnowboardScoreState, 
  createInitialSnowboardScore, 
  SoundJuice 
} from '../../lib/judgeScoring';

interface SnowboardModeProps {
  onBack: () => void;
}

interface TerrainElement {
  id: number;
  type: 'JUMP' | 'RAIL' | 'GATE' | 'GAP';
  x: number; // Distance down slope in meters
  y: number; // Lateral offset
  width: number;
  height: number;
}

export function SnowboardMode({ onBack }: SnowboardModeProps) {
  const [gameState, setGameState] = useState<'READY' | 'RIDING' | 'PAUSED' | 'RESULTS'>('READY');
  const [scoreState, setScoreState] = useState<SnowboardScoreState>(() => createInitialSnowboardScore());
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Physics and rider state
  const riderPosRef = useRef<{ x: number; y: number; z: number; vx: number; vy: number; vz: number }>({
    x: 0, // 0 to 800m down slope
    y: 0, // lateral offset -15m to +15m
    z: 0, // air elevation (0 is on snow)
    vx: 18, // forward velocity m/s
    vy: 0,  // lateral velocity
    vz: 0,  // vertical air velocity
  });

  const riderRotationRef = useRef<{ pitch: number; roll: number; yaw: number }>({ pitch: 0, roll: 0, yaw: 0 });
  const isGroundedRef = useRef<boolean>(true);
  const isGrindingRef = useRef<boolean>(false);
  const airStartTimeRef = useRef<number>(0);
  const currentAirRotationsRef = useRef<number>(0);
  const currentAirComboRef = useRef<string[]>([]);
  const boostHeldRef = useRef<boolean>(false);

  // Input states
  const keysRef = useRef<Record<string, boolean>>({});

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Floating trick popups
  const [activeTrickBanner, setActiveTrickBanner] = useState<{
    name: string;
    points: number;
    multiplier: number;
    tricky: boolean;
    key: number;
  } | null>(null);

  // Sound helper
  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);

  // Generate Slope Terrain
  const terrainRef = useRef<TerrainElement[]>([
    { id: 1, type: 'JUMP', x: 60, y: 0, width: 8, height: 3.5 },
    { id: 2, type: 'RAIL', x: 120, y: -4, width: 22, height: 1.2 },
    { id: 3, type: 'GATE', x: 170, y: 3, width: 6, height: 4 },
    { id: 4, type: 'JUMP', x: 230, y: -2, width: 10, height: 5.0 },
    { id: 5, type: 'RAIL', x: 300, y: 4, width: 28, height: 1.5 },
    { id: 6, type: 'JUMP', x: 380, y: 0, width: 12, height: 6.5 },
    { id: 7, type: 'GATE', x: 450, y: -3, width: 6, height: 4 },
    { id: 8, type: 'RAIL', x: 520, y: 0, width: 35, height: 1.8 },
    { id: 9, type: 'JUMP', x: 620, y: 0, width: 14, height: 8.0 },
    { id: 10, type: 'GATE', x: 720, y: 0, width: 10, height: 5 },
  ]);

  // Start run
  const startRun = useCallback(() => {
    riderPosRef.current = { x: 0, y: 0, z: 0, vx: 18, vy: 0, vz: 0 };
    riderRotationRef.current = { pitch: 0, roll: 0, yaw: 0 };
    isGroundedRef.current = true;
    isGrindingRef.current = false;
    currentAirRotationsRef.current = 0;
    currentAirComboRef.current = [];
    setScoreState(createInitialSnowboardScore('PEAK OVERDRIVE'));
    setGameState('RIDING');
    playSfx(() => SoundJuice.playSnowCarve());
  }, [playSfx]);

  // Keyboard input bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === 'Shift') boostHeldRef.current = true;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        // Jump off snow
        if (isGroundedRef.current && gameState === 'RIDING') {
          isGroundedRef.current = false;
          isGrindingRef.current = false;
          riderPosRef.current.vz = 9.5;
          airStartTimeRef.current = performance.now();
          currentAirRotationsRef.current = 0;
          currentAirComboRef.current = [];
          playSfx(() => SoundJuice.playAirTrick());
        }
      }

      if (e.key === 'Escape') {
        if (gameState === 'RIDING') setGameState('PAUSED');
        else if (gameState === 'PAUSED') setGameState('RIDING');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
      if (e.key === 'Shift') boostHeldRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, playSfx]);

  // Main 60 FPS Snowboard Physics & Rendering Engine
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      if (gameState === 'RIDING') {
        const rider = riderPosRef.current;
        const keys = keysRef.current;

        // Boost Acceleration
        const isBoosting = boostHeldRef.current && scoreState.boostMeter > 0;
        const targetForwardSpeed = isBoosting ? 36 : 22;
        rider.vx += (targetForwardSpeed - rider.vx) * dt * 2.5;

        if (isBoosting) {
          setScoreState(prev => ({
            ...prev,
            boostMeter: Math.max(0, prev.boostMeter - dt * 25),
          }));
        } else {
          // Slow passive boost refill on clean riding
          setScoreState(prev => ({
            ...prev,
            boostMeter: Math.min(100, prev.boostMeter + dt * 4),
          }));
        }

        // Lateral Carving Steering
        if (keys['a'] || keys['arrowleft']) {
          rider.vy = Math.max(-12, rider.vy - dt * 35);
          riderRotationRef.current.roll = Math.max(-0.45, riderRotationRef.current.roll - dt * 3.0);
          if (isGroundedRef.current) playSfx(() => SoundJuice.playSnowCarve());
        } else if (keys['d'] || keys['arrowright']) {
          rider.vy = Math.min(12, rider.vy + dt * 35);
          riderRotationRef.current.roll = Math.min(0.45, riderRotationRef.current.roll + dt * 3.0);
          if (isGroundedRef.current) playSfx(() => SoundJuice.playSnowCarve());
        } else {
          rider.vy *= 0.88;
          riderRotationRef.current.roll *= 0.85;
        }

        // Air Rotation Tricks
        if (!isGroundedRef.current) {
          let trickInput = false;

          // Backflip / Frontflip
          if (keys['w'] || keys['arrowup']) {
            riderRotationRef.current.pitch += dt * 7.5;
            trickInput = true;
          } else if (keys['s'] || keys['arrowdown']) {
            riderRotationRef.current.pitch -= dt * 7.5;
            trickInput = true;
          }

          // Spin Rotations (180, 360, 720, 1080)
          if (keys['a'] || keys['arrowleft']) {
            riderRotationRef.current.yaw += dt * 8.0;
            currentAirRotationsRef.current += dt * 8.0 * (180 / Math.PI);
            trickInput = true;
          } else if (keys['d'] || keys['arrowright']) {
            riderRotationRef.current.yaw -= dt * 8.0;
            currentAirRotationsRef.current += dt * 8.0 * (180 / Math.PI);
            trickInput = true;
          }

          if (trickInput && Math.random() < 0.08) {
            playSfx(() => SoundJuice.playAirTrick());
          }

          // Vertical Gravity
          rider.vz -= 18.0 * dt;
          rider.z += rider.vz * dt;

          // Ground landing collision
          if (rider.z <= 0) {
            rider.z = 0;
            rider.vz = 0;
            isGroundedRef.current = true;

            // Evaluate Landing Alignment
            const normalizedYaw = Math.abs(riderRotationRef.current.yaw % (Math.PI * 2));
            const yawOffset = Math.min(normalizedYaw, Math.PI * 2 - normalizedYaw);
            const pitchOffset = Math.abs(riderRotationRef.current.pitch % (Math.PI * 2));

            let quality: 'STUCK' | 'CLEAN' | 'SKETCHY' | 'BAIL' = 'CLEAN';
            let comboScore = 0;

            if (yawOffset < 0.35 && pitchOffset < 0.4) {
              quality = 'STUCK';
              comboScore = Math.round(500 + currentAirRotationsRef.current * 4.5);
            } else if (yawOffset < 0.85 && pitchOffset < 0.9) {
              quality = 'CLEAN';
              comboScore = Math.round(300 + currentAirRotationsRef.current * 2.5);
            } else if (yawOffset < 1.4) {
              quality = 'SKETCHY';
              comboScore = Math.round(100 + currentAirRotationsRef.current);
            } else {
              quality = 'BAIL';
              comboScore = 0;
              rider.vx = 8; // penalty slow
            }

            playSfx(() => SoundJuice.playSnowLanding(quality));

            // Reset rotation back to slope plane
            riderRotationRef.current.pitch = 0;
            riderRotationRef.current.yaw = 0;

            if (comboScore > 0) {
              const trickName = currentAirRotationsRef.current > 720 ? 'RODEO 1080 ULTRA' :
                                currentAirRotationsRef.current > 360 ? 'MISTY FLIP 540' :
                                currentAirRotationsRef.current > 180 ? 'METHOD 360 AIR' : 'INDY NOSEGRAB';

              setActiveTrickBanner({
                name: `${trickName} [${quality}]`,
                points: comboScore,
                multiplier: scoreState.multiplier,
                tricky: scoreState.isTrickyMode,
                key: Date.now(),
              });

              setScoreState(prev => {
                const nextScore = prev.totalScore + Math.round(comboScore * prev.multiplier);
                const nextBoost = Math.min(100, prev.boostMeter + (quality === 'STUCK' ? 35 : 20));
                const isTricky = nextBoost >= 100 || prev.isTrickyMode;
                return {
                  ...prev,
                  totalScore: nextScore,
                  boostMeter: nextBoost,
                  isTrickyMode: isTricky,
                  multiplier: isTricky ? 3.0 : Math.min(2.5, prev.multiplier + 0.2),
                  totalRotationsDeg: prev.totalRotationsDeg + Math.round(currentAirRotationsRef.current),
                  landingHistory: [...prev.landingHistory, quality],
                };
              });
            }
          }
        }

        // Apply velocities
        rider.x += rider.vx * dt;
        rider.y = Math.max(-14, Math.min(14, rider.y + rider.vy * dt));

        // Terrain Intersections (Jumps, Rails, Gates)
        terrainRef.current.forEach(el => {
          const dist = rider.x - el.x;
          if (Math.abs(dist) < 2.5 && Math.abs(rider.y - el.y) < el.width / 2) {
            if (el.type === 'JUMP' && isGroundedRef.current) {
              // Launch Ramp Kick
              isGroundedRef.current = false;
              rider.vz = 8.5 + el.height * 1.5;
              playSfx(() => SoundJuice.playAirTrick());
            } else if (el.type === 'RAIL' && rider.z < 1.0) {
              // Rail Grind
              isGrindingRef.current = true;
              rider.z = el.height;
              rider.vz = 0;
              playSfx(() => SoundJuice.playRailGrind());
              setScoreState(prev => ({
                ...prev,
                totalScore: prev.totalScore + 15,
                grindDistanceM: prev.grindDistanceM + rider.vx * dt,
              }));
            }
          }
        });

        // Check if crossed slope finish line (800 meters)
        if (rider.x >= 780) {
          setGameState('RESULTS');
        }

        // Update live speed and distance
        setScoreState(prev => ({ ...prev, speedKph: Math.round(rider.vx * 3.6) }));
        setDistanceMeters(Math.round(rider.x));
      }

      // Draw 3D Alpine Extreme Canvas Stage (Phase 8 Visual Direction)
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          // Clear Stage with Deep Void Matrix
          ctx.fillStyle = '#02040a';
          ctx.fillRect(0, 0, w, h);

          // Alpine Mountain Range Silhouette (Deep Navy/Cyan Glow)
          ctx.save();
          const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
          skyGrad.addColorStop(0, '#040b1a');
          skyGrad.addColorStop(1, '#091c36');
          ctx.fillStyle = skyGrad;
          ctx.fillRect(0, 0, w, h * 0.5);

          // Neon Floodlight Stadium Beams
          ctx.strokeStyle = 'rgba(0, 242, 255, 0.15)';
          ctx.lineWidth = 40;
          ctx.beginPath();
          ctx.moveTo(w * 0.2, 0);
          ctx.lineTo(w * 0.4, h * 0.6);
          ctx.moveTo(w * 0.8, 0);
          ctx.lineTo(w * 0.6, h * 0.6);
          ctx.stroke();

          // Snow Slope Perspective Grid
          const slopeTopY = h * 0.38;
          const slopeBottomY = h;
          const slopeTopWidth = w * 0.28;
          const slopeBottomWidth = w * 0.88;

          const snowGrad = ctx.createLinearGradient(0, slopeTopY, 0, slopeBottomY);
          snowGrad.addColorStop(0, '#e2e8f0');
          snowGrad.addColorStop(1, '#f8fafc');
          ctx.fillStyle = snowGrad;

          ctx.beginPath();
          ctx.moveTo((w - slopeTopWidth) / 2, slopeTopY);
          ctx.lineTo((w + slopeTopWidth) / 2, slopeTopY);
          ctx.lineTo((w + slopeBottomWidth) / 2, slopeBottomY);
          ctx.lineTo((w - slopeBottomWidth) / 2, slopeBottomY);
          ctx.closePath();
          ctx.fill();

          // Slope Boundary Neon Lasers (Phase 8 Signature Cyan)
          ctx.strokeStyle = scoreState.isTrickyMode ? '#ff0055' : '#00f2ff';
          ctx.lineWidth = 4;
          ctx.shadowColor = scoreState.isTrickyMode ? '#ff0055' : '#00f2ff';
          ctx.shadowBlur = 15;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Draw Terrain Obstacles along Slope Depth
          const riderX = riderPosRef.current.x;
          terrainRef.current.forEach(el => {
            const relDist = el.x - riderX;
            if (relDist > -20 && relDist < 250) {
              const depthT = Math.max(0, Math.min(1, 1 - relDist / 250));
              const elY = slopeTopY + (slopeBottomY - slopeTopY) * depthT;
              const currentWidth = slopeTopWidth + (slopeBottomWidth - slopeTopWidth) * depthT;
              const elX = (w - currentWidth) / 2 + currentWidth * ((el.y + 15) / 30);
              const scale = 0.3 + 1.2 * depthT;

              ctx.save();
              ctx.translate(elX, elY);

              if (el.type === 'JUMP') {
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(-20 * scale, -12 * scale, 40 * scale, 12 * scale);
                ctx.strokeStyle = '#ffffff';
                ctx.strokeRect(-20 * scale, -12 * scale, 40 * scale, 12 * scale);
              } else if (el.type === 'RAIL') {
                ctx.fillStyle = '#00f2ff';
                ctx.fillRect(-25 * scale, -8 * scale, 50 * scale, 6 * scale);
              } else if (el.type === 'GATE') {
                ctx.strokeStyle = '#ec4899';
                ctx.lineWidth = 3 * scale;
                ctx.strokeRect(-18 * scale, -30 * scale, 36 * scale, 30 * scale);
              }

              ctx.restore();
            }
          });

          // Draw Snowboarder Rider (Hero Avatar)
          const riderScreenY = h * 0.72 - riderPosRef.current.z * 18;
          const riderScreenX = w / 2 + (riderPosRef.current.y / 15) * (w * 0.28);

          ctx.save();
          ctx.translate(riderScreenX, riderScreenY);
          ctx.rotate(riderRotationRef.current.roll + riderRotationRef.current.yaw * 0.3);

          // Snow spray particle trail
          if (isGroundedRef.current) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            for (let i = 0; i < 6; i++) {
              const px = (Math.random() - 0.5) * 35;
              const py = 12 + Math.random() * 15;
              ctx.beginPath();
              ctx.arc(px, py, 2.5 + Math.random() * 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Snowboard deck
          ctx.fillStyle = scoreState.isTrickyMode ? '#ff0055' : '#00f2ff';
          ctx.shadowColor = scoreState.isTrickyMode ? '#ff0055' : '#00f2ff';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.roundRect(-30, 8, 60, 7, 3);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Rider Body Silhouette
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          // Legs
          ctx.beginPath();
          ctx.moveTo(-12, 8);
          ctx.lineTo(-6, -14);
          ctx.lineTo(6, -14);
          ctx.lineTo(12, 8);
          ctx.stroke();

          // Torso & Cyber Jacket
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(-10, -32, 20, 18);
          ctx.strokeRect(-10, -32, 20, 18);

          // Helmet / Goggles
          ctx.beginPath();
          ctx.arc(0, -40, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-5, -42, 10, 4);

          ctx.restore();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, scoreState.boostMeter, scoreState.multiplier, scoreState.isTrickyMode, playSfx]);

  return (
    <div className="relative w-full max-w-7xl mx-auto flex flex-col items-center bg-[#02040a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="w-full px-6 py-4 flex items-center justify-between border-b border-white/10 bg-zinc-950/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                PHASE 9 — EXTREME ACTION
              </span>
              <span className="text-xs font-mono text-zinc-400">SSX FREERIDE BENCHMARK</span>
            </div>
            <h1 className="font-orbitron text-lg font-black text-white tracking-wide flex items-center gap-2">
              <Flame className="w-5 h-5 text-cyan-400 animate-pulse" />
              PEAK OVERDRIVE // SNOWBOARD
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-white/5 border-white/10 text-zinc-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {gameState === 'RIDING' && (
            <button
              onClick={() => setGameState('PAUSED')}
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs font-bold hover:bg-white/20 flex items-center gap-1.5"
            >
              <Pause className="w-4 h-4" /> PAUSE
            </button>
          )}

          {gameState === 'PAUSED' && (
            <button
              onClick={() => setGameState('RIDING')}
              className="px-4 py-2 rounded-xl bg-cyan-400 text-black font-mono text-xs font-black hover:bg-cyan-300 flex items-center gap-1.5"
            >
              <Play className="w-4 h-4" /> RESUME
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative w-full min-h-[620px] flex flex-col items-center justify-between p-6 overflow-hidden">
        {gameState === 'READY' && (
          <div className="w-full max-w-2xl flex flex-col items-center my-auto z-10 text-center">
            <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
              EXTREME SLOPE FREERIDE
            </span>
            <h2 className="font-orbitron text-4xl font-black text-white mt-1">
              PEAK OVERDRIVE
            </h2>
            <p className="text-sm font-mono text-zinc-400 mt-2 max-w-lg leading-relaxed">
              Carve the neon-lit alpine slope, hit big air kickers, link aerial flips & spins, grind cyber rails, and trigger 3x Tricky Boost Overdrive!
            </p>

            <div className="grid grid-cols-3 gap-4 w-full my-8 text-left">
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">STEERING</span>
                <p className="font-mono text-xs font-bold text-white mt-1">A / D or Arrow Keys</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">AIR TRICKS</span>
                <p className="font-mono text-xs font-bold text-white mt-1">W / S Flips + Spins</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">BOOST</span>
                <p className="font-mono text-xs font-bold text-cyan-400 mt-1">Shift / Boost Bar</p>
              </div>
            </div>

            <button
              onClick={startRun}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-600 text-black font-orbitron font-black text-base tracking-wider hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(0,242,255,0.4)] flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" /> LAUNCH DOWNHILL
            </button>
          </div>
        )}

        {(gameState === 'RIDING' || gameState === 'PAUSED') && (
          <div className="relative w-full flex flex-col items-center">
            {/* Live Telemetry Scoreboard */}
            <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 z-10">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/10 flex flex-col">
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">TOTAL SCORE</span>
                <span className="font-orbitron text-xl font-black text-white">
                  {scoreState.totalScore.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/10 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">SPEED</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">{scoreState.speedKph} KM/H</span>
                </div>
                <span className="font-orbitron text-xl font-black text-white">
                  {distanceMeters} <span className="text-xs font-mono font-normal text-zinc-500">/ 800M</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/10 flex flex-col">
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">MULTIPLIER</span>
                <span className={`font-orbitron text-xl font-black ${scoreState.isTrickyMode ? 'text-pink-400 animate-pulse' : 'text-amber-400'}`}>
                  {scoreState.multiplier}x {scoreState.isTrickyMode && '[TRICKY!]'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/10 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">BOOST TANK</span>
                  <span className="text-[10px] font-mono font-bold text-cyan-400">{Math.round(scoreState.boostMeter)}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-zinc-900 overflow-hidden border border-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-100 ${
                      scoreState.isTrickyMode ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 animate-pulse' :
                      'bg-gradient-to-r from-cyan-500 to-teal-400'
                    }`}
                    style={{ width: `${scoreState.boostMeter}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Alpine Stage Canvas */}
            <div className="relative w-full max-w-4xl h-[420px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center bg-[#02040a]">
              <canvas
                ref={canvasRef}
                width={850}
                height={420}
                className="w-full h-full object-contain"
              />

              {/* Floating Trick Banner */}
              <AnimatePresence>
                {activeTrickBanner && (
                  <motion.div
                    key={activeTrickBanner.key}
                    initial={{ opacity: 0, scale: 0.5, y: 30 }}
                    animate={{ opacity: 1, scale: 1.15, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -30 }}
                    transition={{ duration: 0.3 }}
                    className="absolute top-1/4 flex flex-col items-center pointer-events-none z-30"
                  >
                    <span className="font-orbitron text-2xl font-black text-amber-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]">
                      {activeTrickBanner.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-300 mt-1 px-3 py-1 rounded-full bg-black/70 border border-cyan-400/40">
                      +{activeTrickBanner.points} PTS ({activeTrickBanner.multiplier}x)
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Virtual Controls for Mobile & Desktop */}
            <div className="grid grid-cols-4 gap-3 w-full max-w-4xl mt-4 z-10">
              <button
                onPointerDown={() => { keysRef.current['arrowleft'] = true; }}
                onPointerUp={() => { keysRef.current['arrowleft'] = false; }}
                className="py-3 rounded-2xl bg-zinc-950/80 border border-white/10 text-white font-mono font-bold hover:border-cyan-400"
              >
                ← CARVE LEFT
              </button>
              <button
                onPointerDown={() => {
                  if (isGroundedRef.current) {
                    isGroundedRef.current = false;
                    riderPosRef.current.vz = 9.5;
                    playSfx(() => SoundJuice.playAirTrick());
                  }
                }}
                className="py-3 rounded-2xl bg-cyan-500 text-black font-mono font-black shadow-[0_0_20px_rgba(0,242,255,0.4)]"
              >
                AIR JUMP [SPACE]
              </button>
              <button
                onPointerDown={() => { boostHeldRef.current = true; }}
                onPointerUp={() => { boostHeldRef.current = false; }}
                className="py-3 rounded-2xl bg-pink-500/20 border border-pink-500/40 text-pink-400 font-mono font-bold"
              >
                BOOST [SHIFT]
              </button>
              <button
                onPointerDown={() => { keysRef.current['arrowright'] = true; }}
                onPointerUp={() => { keysRef.current['arrowright'] = false; }}
                className="py-3 rounded-2xl bg-zinc-950/80 border border-white/10 text-white font-mono font-bold hover:border-cyan-400"
              >
                CARVE RIGHT →
              </button>
            </div>
          </div>
        )}

        {gameState === 'RESULTS' && (
          <div className="w-full max-w-2xl flex flex-col items-center my-auto p-8 rounded-3xl bg-zinc-950/90 border border-cyan-500/40 shadow-[0_0_40px_rgba(0,242,255,0.2)] z-10 text-center">
            <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
              SLOPE RUN FINISHED
            </span>
            <h2 className="font-orbitron text-3xl font-black text-white mt-1">
              PEAK CONQUERED
            </h2>

            <div className="my-6 p-6 rounded-2xl bg-black/40 border border-white/10 w-full flex items-center justify-around">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">FINAL SCORE</span>
                <p className="font-orbitron text-3xl font-black text-white">{scoreState.totalScore.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">ROTATIONS</span>
                <p className="font-orbitron text-3xl font-black text-cyan-400">{scoreState.totalRotationsDeg}°</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">GRINDS</span>
                <p className="font-orbitron text-3xl font-black text-amber-400">{Math.round(scoreState.grindDistanceM)}M</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={startRun}
                className="px-6 py-3 rounded-xl bg-cyan-400 text-black font-mono text-xs font-black hover:bg-cyan-300 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> RETRY RUN
              </button>
              <button
                onClick={() => setGameState('READY')}
                className="px-6 py-3 rounded-xl bg-white/10 text-white font-mono text-xs font-bold hover:bg-white/20 transition-colors"
              >
                CHANGE SLOPE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
