import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, Shield, 
  Play, Swords
} from 'lucide-react';
import { 
  KarateScoreState, 
  createInitialKarateScore, 
  SoundJuice 
} from '../../lib/judgeScoring';

interface KarateModeProps {
  onBack: () => void;
}

export function KarateMode({ onBack }: KarateModeProps) {
  const [gameState, setGameState] = useState<'SELECT' | 'FIGHTING' | 'KO' | 'MATCH_OVER'>('SELECT');
  const [combatState, setCombatState] = useState<KarateScoreState>(() => createInitialKarateScore());
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Fighter Animation & Pose states
  const [playerPose, setPlayerPose] = useState<'IDLE' | 'HIGH_STRIKE' | 'MID_STRIKE' | 'LOW_SWEEP' | 'BLOCK' | 'PARRY' | 'HIT' | 'KO'>('IDLE');
  const [opponentPose, setOpponentPose] = useState<'IDLE' | 'HIGH_STRIKE' | 'MID_STRIKE' | 'LOW_SWEEP' | 'BLOCK' | 'PARRY' | 'HIT' | 'KO'>('IDLE');

  // Combat positions
  const playerXRef = useRef<number>(280);
  const opponentXRef = useRef<number>(560);
  const isParryingRef = useRef<boolean>(false);
  const isBlockingRef = useRef<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Floating Impact Spark FX
  const [impactFx, setImpactFx] = useState<{
    x: number;
    y: number;
    text: string;
    color: string;
    key: number;
  } | null>(null);

  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);

  // Start new match
  const startMatch = useCallback(() => {
    setCombatState(createInitialKarateScore());
    setPlayerPose('IDLE');
    setOpponentPose('IDLE');
    playerXRef.current = 280;
    opponentXRef.current = 560;
    setGameState('FIGHTING');
    playSfx(() => SoundJuice.playParryClash());
  }, [playSfx]);

  // Player Attack Trigger
  const executePlayerMove = useCallback((move: 'HIGH' | 'MID' | 'LOW' | 'BLOCK' | 'PARRY') => {
    if (gameState !== 'FIGHTING' || playerPose === 'HIT') return;

    if (move === 'BLOCK') {
      setPlayerPose('BLOCK');
      isBlockingRef.current = true;
      setTimeout(() => {
        setPlayerPose('IDLE');
        isBlockingRef.current = false;
      }, 300);
      return;
    }

    if (move === 'PARRY') {
      setPlayerPose('PARRY');
      isParryingRef.current = true;
      playSfx(() => SoundJuice.playParryClash());
      setTimeout(() => {
        setPlayerPose('IDLE');
        isParryingRef.current = false;
      }, 250);
      return;
    }

    // Attacks
    const moveName = move === 'HIGH' ? 'HIGH_STRIKE' : move === 'MID' ? 'MID_STRIKE' : 'LOW_SWEEP';
    setPlayerPose(moveName);

    const dist = Math.abs(opponentXRef.current - playerXRef.current);
    if (dist <= 160) {
      // Check if Opponent Defended
      if (opponentPose === 'BLOCK') {
        playSfx(() => SoundJuice.playStrikeImpact('light'));
        setCombatState(prev => ({
          ...prev,
          opponentPosture: Math.max(0, prev.opponentPosture - 12),
          lastMovePlayer: `${move} [BLOCKED]`,
        }));
        setImpactFx({
          x: opponentXRef.current - 20,
          y: 200,
          text: 'GUARDED',
          color: '#38bdf8',
          key: Date.now(),
        });
      } else if (opponentPose === 'PARRY') {
        // Player Parried!
        playSfx(() => SoundJuice.playParryClash());
        setPlayerPose('HIT');
        setCombatState(prev => ({
          ...prev,
          playerPosture: Math.max(0, prev.playerPosture - 40),
          lastMoveOpponent: 'DEFLECT COUNTER!',
        }));
        setImpactFx({
          x: playerXRef.current + 20,
          y: 180,
          text: 'PARRIED!',
          color: '#facc15',
          key: Date.now(),
        });
      } else {
        // Clean Hit!
        const damage = move === 'HIGH' ? 22 : move === 'MID' ? 16 : 12;
        playSfx(() => SoundJuice.playStrikeImpact(move === 'HIGH' ? 'critical' : 'heavy'));
        setOpponentPose('HIT');
        setTimeout(() => setOpponentPose('IDLE'), 280);

        setImpactFx({
          x: opponentXRef.current - 15,
          y: move === 'HIGH' ? 150 : move === 'MID' ? 200 : 260,
          text: move === 'HIGH' ? 'CRITICAL KIAI!' : 'SOLID HIT',
          color: '#f43f5e',
          key: Date.now(),
        });

        setCombatState(prev => {
          const nextOppHealth = Math.max(0, prev.opponentHealth - damage);
          const nextOppPosture = Math.max(0, prev.opponentPosture - 20);
          const isOppKO = nextOppHealth <= 0;

          if (isOppKO) {
            setTimeout(() => {
              setGameState('MATCH_OVER');
              setOpponentPose('KO');
            }, 600);
          }

          return {
            ...prev,
            opponentHealth: nextOppHealth,
            opponentPosture: nextOppPosture,
            playerCombo: prev.playerCombo + 1,
            lastMovePlayer: `${move} STRIKE`,
            matchWinner: isOppKO ? 'PLAYER' : null,
          };
        });
      }
    } else {
      // Whiff
      playSfx(() => SoundJuice.playStrikeImpact('light'));
    }

    setTimeout(() => {
      setPlayerPose('IDLE');
    }, 280);
  }, [gameState, opponentPose, playerPose, playSfx]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'FIGHTING') return;

      if (e.key === 'w' || e.key === 'ArrowUp') executePlayerMove('HIGH');
      else if (e.key === 's' || e.key === 'ArrowDown') executePlayerMove('MID');
      else if (e.key === 'x') executePlayerMove('LOW');
      else if (e.key === ' ' || e.code === 'Space') executePlayerMove('BLOCK');
      else if (e.key === 'f') executePlayerMove('PARRY');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, executePlayerMove]);

  // AI Opponent Reaction Loop
  useEffect(() => {
    if (gameState !== 'FIGHTING') return;

    const aiInterval = setInterval(() => {
      if (Math.random() < 0.45) {
        // AI chooses action
        const r = Math.random();
        if (r < 0.35) {
          // AI High Strike
          setOpponentPose('HIGH_STRIKE');
          if (isParryingRef.current) {
            playSfx(() => SoundJuice.playParryClash());
            setOpponentPose('HIT');
            setImpactFx({ x: opponentXRef.current, y: 160, text: 'PARRIED!', color: '#facc15', key: Date.now() });
          } else if (isBlockingRef.current) {
            playSfx(() => SoundJuice.playStrikeImpact('light'));
          } else {
            playSfx(() => SoundJuice.playStrikeImpact('heavy'));
            setPlayerPose('HIT');
            setTimeout(() => setPlayerPose('IDLE'), 260);
            setCombatState(prev => {
              const nextHealth = Math.max(0, prev.playerHealth - 18);
              if (nextHealth <= 0) setTimeout(() => setGameState('MATCH_OVER'), 600);
              return { ...prev, playerHealth: nextHealth, matchWinner: nextHealth <= 0 ? 'OPPONENT' : null };
            });
          }
          setTimeout(() => setOpponentPose('IDLE'), 280);
        } else if (r < 0.65) {
          // AI Mid Strike
          setOpponentPose('MID_STRIKE');
          if (!isBlockingRef.current && !isParryingRef.current) {
            playSfx(() => SoundJuice.playStrikeImpact('heavy'));
            setPlayerPose('HIT');
            setTimeout(() => setPlayerPose('IDLE'), 260);
            setCombatState(prev => {
              const nextHealth = Math.max(0, prev.playerHealth - 14);
              if (nextHealth <= 0) setTimeout(() => setGameState('MATCH_OVER'), 600);
              return { ...prev, playerHealth: nextHealth, matchWinner: nextHealth <= 0 ? 'OPPONENT' : null };
            });
          }
          setTimeout(() => setOpponentPose('IDLE'), 280);
        } else {
          // AI Guard
          setOpponentPose('BLOCK');
          setTimeout(() => setOpponentPose('IDLE'), 350);
        }
      }
    }, 900);

    return () => clearInterval(aiInterval);
  }, [gameState, playSfx]);

  // Canvas Stage Renderer (Phase 8 Visual Direction: Dojo Arena & Rim Lighting)
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          // Clear Stage
          ctx.fillStyle = '#02040a';
          ctx.fillRect(0, 0, w, h);

          // Dojo Tatami Mat Horizon
          const floorY = h * 0.72;
          const grad = ctx.createLinearGradient(0, floorY, 0, h);
          grad.addColorStop(0, '#0f172a');
          grad.addColorStop(1, '#020617');
          ctx.fillStyle = grad;
          ctx.fillRect(0, floorY, w, h - floorY);

          // Floor Boundary Line
          ctx.strokeStyle = '#00f2ff';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#00f2ff';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(0, floorY);
          ctx.lineTo(w, floorY);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Draw Player Karateka (Cyan Rim Light)
          const drawFighter = (x: number, pose: string, isPlayer: boolean) => {
            ctx.save();
            ctx.translate(x, floorY);
            if (!isPlayer) ctx.scale(-1, 1);

            const color = isPlayer ? '#00f2ff' : '#f43f5e';
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;

            // Shadow
            ctx.beginPath();
            ctx.ellipse(0, 0, 32, 10, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fill();

            // Legs
            ctx.strokeStyle = color;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(-16, 0);
            ctx.lineTo(-8, -40);
            ctx.lineTo(0, -60);
            ctx.lineTo(8, -40);
            ctx.lineTo(16, 0);
            ctx.stroke();

            // Torso (Gi)
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-14, -100, 28, 42);
            // Black Belt
            ctx.fillStyle = '#000000';
            ctx.fillRect(-15, -68, 30, 8);

            // Arms based on pose
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 5;
            ctx.beginPath();
            if (pose === 'HIGH_STRIKE') {
              ctx.moveTo(0, -90);
              ctx.lineTo(45, -95); // High punch extend
            } else if (pose === 'MID_STRIKE') {
              ctx.moveTo(0, -85);
              ctx.lineTo(40, -75); // Palm strike extend
            } else if (pose === 'BLOCK' || pose === 'PARRY') {
              ctx.moveTo(-10, -90);
              ctx.lineTo(12, -92);
              ctx.lineTo(15, -70);
            } else {
              // Ready Guard Stance
              ctx.moveTo(-10, -85);
              ctx.lineTo(18, -80);
            }
            ctx.stroke();

            // Head
            ctx.beginPath();
            ctx.arc(0, -114, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#f8fafc';
            ctx.fill();

            ctx.restore();
          };

          drawFighter(playerXRef.current, playerPose, true);
          drawFighter(opponentXRef.current, opponentPose, false);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playerPose, opponentPose]);

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
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                PHASE 10 — COMBAT ARENA
              </span>
              <span className="text-xs font-mono text-zinc-400">SOUL CALIBUR BENCHMARK</span>
            </div>
            <h1 className="font-orbitron text-lg font-black text-white tracking-wide flex items-center gap-2">
              <Swords className="w-5 h-5 text-red-400 animate-pulse" />
              CYBER DOJO // MARTIAL ARTS
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-white/5 border-white/10 text-zinc-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative w-full min-h-[620px] flex flex-col items-center justify-between p-6 overflow-hidden">
        {gameState === 'SELECT' && (
          <div className="w-full max-w-2xl flex flex-col items-center my-auto z-10 text-center">
            <span className="text-xs font-mono font-bold tracking-widest text-red-400 uppercase">
              MARTIAL ARTS COMBAT BENCHMARK
            </span>
            <h2 className="font-orbitron text-4xl font-black text-white mt-1">
              CYBER DOJO ARENA
            </h2>
            <p className="text-sm font-mono text-zinc-400 mt-2 max-w-lg leading-relaxed">
              Test your reaction timing and posture defense. Execute High/Mid/Low strikes, block incoming attacks, and trigger frame-perfect Parries to break enemy posture!
            </p>

            <div className="grid grid-cols-3 gap-4 w-full my-8 text-left">
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">STRIKES</span>
                <p className="font-mono text-xs font-bold text-white mt-1">W (High) / S (Mid) / X (Low)</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">DEFENSE</span>
                <p className="font-mono text-xs font-bold text-cyan-400 mt-1">Space (Guard Block)</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">COUNTER</span>
                <p className="font-mono text-xs font-bold text-amber-400 mt-1">F (Timed Parry Deflect)</p>
              </div>
            </div>

            <button
              onClick={startMatch}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-white font-orbitron font-black text-base tracking-wider hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(244,63,94,0.4)] flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" /> ENTER THE DOJO
            </button>
          </div>
        )}

        {gameState === 'FIGHTING' && (
          <div className="relative w-full flex flex-col items-center">
            {/* Health & Posture Gauges */}
            <div className="w-full max-w-4xl grid grid-cols-2 gap-6 mb-4 z-10">
              {/* Player Health/Posture */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-cyan-500/30 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-orbitron font-bold text-cyan-400">PLAYER (CYBER KARATEKA)</span>
                  <span className="text-xs font-mono font-bold text-white">{combatState.playerHealth}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-zinc-900 overflow-hidden border border-white/10">
                  <div className="h-full bg-cyan-400 transition-all duration-150" style={{ width: `${combatState.playerHealth}%` }} />
                </div>
              </div>

              {/* Opponent Health/Posture */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-red-500/30 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-orbitron font-bold text-red-400">OPPONENT (SHADOW MASTER)</span>
                  <span className="text-xs font-mono font-bold text-white">{combatState.opponentHealth}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-zinc-900 overflow-hidden border border-white/10">
                  <div className="h-full bg-red-500 transition-all duration-150" style={{ width: `${combatState.opponentHealth}%` }} />
                </div>
              </div>
            </div>

            {/* Canvas Combat Arena */}
            <div className="relative w-full max-w-4xl h-[420px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center bg-[#02040a]">
              <canvas
                ref={canvasRef}
                width={850}
                height={420}
                className="w-full h-full object-contain"
              />

              {/* Floating Impact FX */}
              <AnimatePresence>
                {impactFx && (
                  <motion.div
                    key={impactFx.key}
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1.2, y: -20 }}
                    exit={{ opacity: 0, scale: 0.8, y: -40 }}
                    transition={{ duration: 0.25 }}
                    className="absolute pointer-events-none z-30 font-orbitron font-black text-xl"
                    style={{ left: `${(impactFx.x / 850) * 100}%`, top: `${(impactFx.y / 420) * 100}%`, color: impactFx.color }}
                  >
                    {impactFx.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Virtual Combat Touch Controls */}
            <div className="grid grid-cols-5 gap-3 w-full max-w-4xl mt-4 z-10">
              <button
                onClick={() => executePlayerMove('HIGH')}
                className="py-3 rounded-2xl bg-zinc-950/80 border border-white/10 text-white font-mono font-bold hover:border-cyan-400"
              >
                HIGH [W]
              </button>
              <button
                onClick={() => executePlayerMove('MID')}
                className="py-3 rounded-2xl bg-zinc-950/80 border border-white/10 text-white font-mono font-bold hover:border-cyan-400"
              >
                MID [S]
              </button>
              <button
                onClick={() => executePlayerMove('LOW')}
                className="py-3 rounded-2xl bg-zinc-950/80 border border-white/10 text-white font-mono font-bold hover:border-cyan-400"
              >
                LOW [X]
              </button>
              <button
                onClick={() => executePlayerMove('BLOCK')}
                className="py-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-bold"
              >
                <Shield className="w-4 h-4 inline mr-1" /> BLOCK [SPACE]
              </button>
              <button
                onClick={() => executePlayerMove('PARRY')}
                className="py-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold"
              >
                PARRY [F]
              </button>
            </div>
          </div>
        )}

        {gameState === 'MATCH_OVER' && (
          <div className="w-full max-w-2xl flex flex-col items-center my-auto p-8 rounded-3xl bg-zinc-950/90 border border-red-500/40 shadow-[0_0_40px_rgba(244,63,94,0.2)] z-10 text-center">
            <span className="text-xs font-mono font-bold tracking-widest text-red-400 uppercase">
              MATCH DECIDED
            </span>
            <h2 className="font-orbitron text-4xl font-black text-white mt-1">
              {combatState.matchWinner === 'PLAYER' ? 'VICTORY — K.O.!' : 'DEFEAT'}
            </h2>

            <p className="text-sm font-mono text-zinc-400 my-4">
              {combatState.matchWinner === 'PLAYER'
                ? 'Flawless posture control and devastating counter timing.'
                : 'Posture collapsed under opponent pressure.'}
            </p>

            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={startMatch}
                className="px-6 py-3 rounded-xl bg-red-500 text-white font-mono text-xs font-black hover:bg-red-400 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> REMATCH
              </button>
              <button
                onClick={() => setGameState('SELECT')}
                className="px-6 py-3 rounded-xl bg-white/10 text-white font-mono text-xs font-bold hover:bg-white/20 transition-colors"
              >
                CHANGE OPPONENT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
