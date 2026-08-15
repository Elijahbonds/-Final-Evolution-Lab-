import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, Flame
} from 'lucide-react';
import { 
  Vector3, Color3, MeshBuilder, StandardMaterial
} from '@babylonjs/core';
import { createBabylonContext, createProceduralAthlete, BabylonSceneContext } from '../../lib/babylon/BabylonSceneBuilder';
import { SoundJuice } from '../../lib/judgeScoring';

interface BabylonKarate3DModeProps {
  onBack: () => void;
}

export const BabylonKarate3DMode: React.FC<BabylonKarate3DModeProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<BabylonSceneContext | null>(null);

  const [playerHp, setPlayerHp] = useState<number>(100);
  const [oppHp, setOppHp] = useState<number>(100);
  const [comboCount, setComboCount] = useState<number>(0);
  const [roundWinner, setRoundWinner] = useState<'PLAYER' | 'OPPONENT' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [combatState, setCombatState] = useState<'IDLE' | 'STRIKING' | 'BLOCKING' | 'PARRIED' | 'KO'>('IDLE');

  const playerRef = useRef<ReturnType<typeof createProceduralAthlete> | null>(null);
  const oppRef = useRef<ReturnType<typeof createProceduralAthlete> | null>(null);

  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);

  // Init Babylon 3D Scene
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = createBabylonContext(canvasRef.current);
    contextRef.current = ctx;
    const { scene, shadowGenerator } = ctx;

    // Adjust camera for fighting duel
    ctx.camera.alpha = -Math.PI / 2;
    ctx.camera.beta = Math.PI / 2.6;
    ctx.camera.radius = 10.5;
    ctx.camera.target = new Vector3(0, 1.4, 0);

    // 1. Tatami Dojo Floor
    const tatami = MeshBuilder.CreateGround('tatami_floor', { width: 14, height: 14 }, scene);
    const tatamiMat = new StandardMaterial('tatamiMat', scene);
    tatamiMat.diffuseColor = new Color3(0.55, 0.42, 0.28);
    tatamiMat.specularColor = new Color3(0.08, 0.08, 0.08);
    tatami.material = tatamiMat;
    tatami.receiveShadows = true;

    // Outer Dojo Border
    const border = MeshBuilder.CreateBox('dojo_border', { width: 14.4, height: 0.1, depth: 14.4 }, scene);
    const borderMat = new StandardMaterial('borderMat', scene);
    borderMat.diffuseColor = new Color3(0.12, 0.08, 0.06);
    border.position.y = -0.05;
    border.material = borderMat;

    // 2. 3D Torii Gate in Background
    const toriiMat = new StandardMaterial('toriiMat', scene);
    toriiMat.diffuseColor = new Color3(0.9, 0.15, 0.05);
    toriiMat.emissiveColor = new Color3(0.3, 0.05, 0.02);

    const postL = MeshBuilder.CreateCylinder('torii_postL', { height: 6, diameter: 0.35 }, scene);
    postL.position.set(-3.5, 3.0, 5.5);
    postL.material = toriiMat;

    const postR = MeshBuilder.CreateCylinder('torii_postR', { height: 6, diameter: 0.35 }, scene);
    postR.position.set(3.5, 3.0, 5.5);
    postR.material = toriiMat;

    const lintel = MeshBuilder.CreateBox('torii_lintel', { width: 9.2, height: 0.5, depth: 0.5 }, scene);
    lintel.position.set(0, 5.8, 5.5);
    lintel.material = toriiMat;

    // 3. Player 3D Fighter (Left - Cyan/Purple)
    const player = createProceduralAthlete(
      scene,
      'playerFighter',
      new Color3(0.0, 0.95, 1.0),
      new Color3(0.5, 0.0, 1.0),
      shadowGenerator
    );
    player.root.position.set(-2.2, 0, 0);
    player.root.rotation.y = Math.PI / 2;
    playerRef.current = player;

    // 4. Opponent 3D Fighter (Right - Red/Gold)
    const opponent = createProceduralAthlete(
      scene,
      'oppFighter',
      new Color3(1.0, 0.2, 0.15),
      new Color3(1.0, 0.8, 0.0),
      shadowGenerator
    );
    opponent.root.position.set(2.2, 0, 0);
    opponent.root.rotation.y = -Math.PI / 2;
    oppRef.current = opponent;

    ctx.engine.runRenderLoop(() => {
      scene.render();
    });

    return () => {
      ctx.engine.stopRenderLoop();
      ctx.scene.dispose();
      ctx.engine.dispose();
    };
  }, []);

  // Execute Martial Strike Attack
  const handleStrike = (type: 'HIGH_JAB' | 'ROUNDHOUSE' | 'DRAGON_KICK' | 'PARRY') => {
    if (combatState !== 'IDLE' || roundWinner !== null) return;
    const player = playerRef.current;
    const opp = oppRef.current;
    if (!player || !opp) return;

    if (type === 'PARRY') {
      setCombatState('BLOCKING');
      player.rightArm.rotation.z = Math.PI / 2.5;
      playSfx(() => SoundJuice.playParryClash());
      setTimeout(() => {
        player.rightArm.rotation.z = -Math.PI / 8;
        setCombatState('IDLE');
      }, 500);
      return;
    }

    setCombatState('STRIKING');
    playSfx(() => SoundJuice.playHit());

    // Strike thrust animation
    let t = 0;
    const anim = setInterval(() => {
      t += 0.1;
      if (t < 0.5) {
        player.root.position.x = -2.2 + t * 2.0;
        player.rightArm.rotation.x = -Math.PI / 2;
      } else if (t < 1.0) {
        player.root.position.x = -1.2 - (t - 0.5) * 2.0;
        player.rightArm.rotation.x = 0;
      } else {
        clearInterval(anim);
        player.root.position.x = -2.2;
        player.rightArm.rotation.set(0, 0, -Math.PI / 8);
        
        // Damage opponent
        const damage = type === 'DRAGON_KICK' ? 35 : type === 'ROUNDHOUSE' ? 24 : 15;
        const newOppHp = Math.max(0, oppHp - damage);
        setOppHp(newOppHp);
        setComboCount(prev => prev + 1);

        // Opponent recoil
        opp.root.position.x = 2.7;
        setTimeout(() => {
          opp.root.position.x = 2.2;
        }, 150);

        if (newOppHp <= 0) {
          setRoundWinner('PLAYER');
          setCombatState('KO');
          opp.root.rotation.z = Math.PI / 2; // KO knocked down
          opp.root.position.y = 0.4;
          playSfx(() => SoundJuice.playVictory());
        } else {
          setCombatState('IDLE');
        }
      }
    }, 20);
  };

  const restartFight = () => {
    setPlayerHp(100);
    setOppHp(100);
    setComboCount(0);
    setRoundWinner(null);
    setCombatState('IDLE');

    const player = playerRef.current;
    const opp = oppRef.current;
    if (player && opp) {
      player.root.position.set(-2.2, 0, 0);
      player.root.rotation.set(0, Math.PI / 2, 0);
      opp.root.position.set(2.2, 0, 0);
      opp.root.rotation.set(0, -Math.PI / 2, 0);
    }
  };

  return (
    <div className="unreal-canvas relative w-full h-[720px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full touch-none z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Top Combat HUD */}
      <div className="relative z-10 p-6 flex items-start justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-white hover:border-[#00F2FF] transition-colors pointer-events-auto cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#FF9D5C]/20 text-[#FF9D5C] border border-[#FF9D5C]/40 font-bold uppercase">
                BABYLON 3D COMBAT
              </span>
              <span className="text-xs font-mono text-zinc-400">• SHIMOGAMO DOJO</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase tracking-tight mt-0.5">
              3D CYBER DOJO KARATE DUEL
            </h1>
          </div>
        </div>

        {/* Sound Toggle */}
        <div className="pointer-events-auto">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00F2FF]" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Health Bar Matrix */}
      <div className="relative z-10 px-6 max-w-2xl mx-auto w-full pointer-events-none">
        <div className="grid grid-cols-2 gap-4">
          {/* Player HP */}
          <div className="p-3 rounded-2xl bg-black/70 border border-[#00F2FF]/30 space-y-1.5 backdrop-blur-md">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#00F2FF] font-bold">SOVEREIGN HERO</span>
              <span className="text-white font-bold">{playerHp} HP</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00F2FF] to-[#7000FF] transition-all duration-200"
                style={{ width: `${playerHp}%` }}
              />
            </div>
          </div>

          {/* Opponent HP */}
          <div className="p-3 rounded-2xl bg-black/70 border border-[#FF3366]/30 space-y-1.5 backdrop-blur-md">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-white font-bold">{oppHp} HP</span>
              <span className="text-[#FF3366] font-bold">RIVAL MASTER</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#FF3366] to-[#FFD700] transition-all duration-200 ml-auto"
                style={{ width: `${oppHp}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Victory / KO Overlay */}
      {roundWinner && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#090B12] border border-[#00FF9D]/40 shadow-[0_0_100px_rgba(0,255,157,0.3)] text-center space-y-6">
            <Flame className="w-12 h-12 text-[#00FF9D] mx-auto animate-pulse" />
            <h2 className="text-4xl sm:text-5xl font-orbitron font-black text-white uppercase tracking-tight">
              {roundWinner === 'PLAYER' ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            <p className="text-xs font-mono text-[#00FF9D] font-bold">
              COMBO CHAIN: {comboCount} HITS • +50 SHARDS EARNED
            </p>
            <button
              onClick={restartFight}
              className="w-full py-4 bg-[#00FF9D] text-black font-orbitron font-black text-sm rounded-2xl hover:bg-[#00FF9D]/90 transition-all shadow-[0_0_25px_rgba(0,255,157,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* Bottom Move Palette */}
      <div className="relative z-10 p-6 flex flex-wrap items-center justify-center gap-3 pointer-events-none">
        <div className="flex items-center gap-2 p-2 rounded-2xl bg-black/70 border border-white/10 backdrop-blur-md pointer-events-auto">
          <button
            onClick={() => handleStrike('HIGH_JAB')}
            className="px-5 py-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-mono text-xs font-bold hover:bg-cyan-500/30 transition-all cursor-pointer"
          >
            HIGH JAB
          </button>
          <button
            onClick={() => handleStrike('ROUNDHOUSE')}
            className="px-5 py-3 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/40 font-mono text-xs font-bold hover:bg-orange-500/30 transition-all cursor-pointer"
          >
            ROUNDHOUSE
          </button>
          <button
            onClick={() => handleStrike('DRAGON_KICK')}
            className="px-6 py-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 font-orbitron text-xs font-black hover:bg-purple-500/30 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer"
          >
            DRAGON SUPER
          </button>
          <button
            onClick={() => handleStrike('PARRY')}
            className="px-5 py-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
          >
            PARRY SHIELD
          </button>
        </div>
      </div>
    </div>
  );
};
