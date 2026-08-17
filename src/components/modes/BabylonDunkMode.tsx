import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, 
  Trophy, Play
} from 'lucide-react';
import { 
  Vector3, Color3, MeshBuilder, StandardMaterial, 
  ParticleSystem, Texture
} from '@babylonjs/core';
import { createBabylonContext, createProceduralAthlete, BabylonSceneContext } from '../../lib/babylon/BabylonSceneBuilder';
import { SoundJuice } from '../../lib/judgeScoring';

interface BabylonDunkModeProps {
  onBack: () => void;
}

export const BabylonDunkMode: React.FC<BabylonDunkModeProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<BabylonSceneContext | null>(null);

  const [gameState, setGameState] = useState<
    'IDLE' | 'GATHER' | 'PLANT' | 'TAKEOFF' | 'HANG' | 'CONTACT' | 'LAND' | 'SCORED'
  >('IDLE');
  const [charge, setCharge] = useState<number>(0);
  const [dunkStyle, setDunkStyle] = useState<'WINDMILL' | 'TOMAHAWK' | '360_SPIN' | 'BETWEEN_LEGS'>('WINDMILL');
  const [result, setResult] = useState<'make' | 'miss' | null>(null);
  const [gctMs, setGctMs] = useState<number>(164);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<'BROADCAST' | 'COURTSIDE' | 'RIM_CAM'>('BROADCAST');

  const athleteRef = useRef<ReturnType<typeof createProceduralAthlete> | null>(null);
  const hoopPosRef = useRef<Vector3>(new Vector3(0, 3.05, 5.5));
  const athletePosRef = useRef<Vector3>(new Vector3(0, 0, -6));
  const isHoldingCharge = useRef<boolean>(false);
  const chargeStartTime = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);

  // Initialize Babylon 3D Scene
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = createBabylonContext(canvasRef.current);
    contextRef.current = ctx;
    const { scene, shadowGenerator } = ctx;
    const hoopPosition = hoopPosRef.current;

    // 1. Venice Beach night hardcourt (visible under cel-shader)
    const court = MeshBuilder.CreateGround('venice_court', { width: 16, height: 24 }, scene);
    const courtMat = new StandardMaterial('courtMat', scene);
    courtMat.diffuseColor = new Color3(0.16, 0.34, 0.52);
    courtMat.specularColor = new Color3(0.12, 0.12, 0.12);
    court.material = courtMat;
    court.receiveShadows = true;

    // Court Boundary Lines
    const lines = MeshBuilder.CreateBox('court_lines', { width: 14.8, height: 0.01, depth: 22.8 }, scene);
    const lineMat = new StandardMaterial('lineMat', scene);
    lineMat.diffuseColor = new Color3(0.95, 0.95, 1.0);
    lineMat.alpha = 0.85;
    lines.position.y = 0.005;
    lines.material = lineMat;

    // Subtle key paint to give the court visible structure
    const keyPaint = MeshBuilder.CreateBox('key_paint', { width: 4.9, height: 0.005, depth: 5.8 }, scene);
    const keyMat = new StandardMaterial('keyMat', scene);
    keyMat.diffuseColor = new Color3(0.12, 0.26, 0.42);
    keyPaint.material = keyMat;
    keyPaint.position.set(0, 0.003, 4.9);

    // 2. Regulation 3.05m Basketball Backboard & Rim
    const post = MeshBuilder.CreateCylinder('hoop_post', { height: 3.8, diameter: 0.16 }, scene);
    post.position.set(0, 1.9, 6.2);
    const postMat = new StandardMaterial('postMat', scene);
    postMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
    post.material = postMat;
    shadowGenerator?.addShadowCaster(post);

    const backboard = MeshBuilder.CreateBox('backboard', { width: 1.8, height: 1.05, depth: 0.08 }, scene);
    backboard.position.set(0, 3.4, 5.8);
    const boardMat = new StandardMaterial('boardMat', scene);
    boardMat.diffuseColor = new Color3(0.9, 0.9, 1.0);
    boardMat.alpha = 0.85;
    backboard.material = boardMat;
    shadowGenerator?.addShadowCaster(backboard);

    // Rim (Torus)
    const rim = MeshBuilder.CreateTorus('rim', { diameter: 0.55, thickness: 0.05, tessellation: 24 }, scene);
    rim.position.copyFrom(hoopPosition);
    rim.rotation.x = Math.PI / 2;
    const rimMat = new StandardMaterial('rimMat', scene);
    rimMat.diffuseColor = new Color3(1.0, 0.35, 0.0);
    rimMat.emissiveColor = new Color3(0.4, 0.15, 0.0);
    rim.material = rimMat;
    shadowGenerator?.addShadowCaster(rim);

    // 3. Procedural Athlete in 3D
    const athlete = createProceduralAthlete(
      scene,
      'heroAthlete',
      new Color3(0.1, 0.85, 1.0), // Neon Cyan Jersey
      new Color3(0.55, 0.05, 1.0), // Purple Accent
      shadowGenerator
    );
    athleteRef.current = athlete;
    athlete.root.position.copyFrom(athletePosRef.current);
    // Start with ball held in right hand (dribble-ready)
    if (athlete.basketball) {
      athlete.basketball.position.set(0.8, 1.25, 0.2);
    }
    athlete.rightArm.rotation.z = -Math.PI / 6;

    // Particle Burst for Rim Slam
    const particleSys = new ParticleSystem('slamParticles', 100, scene);
    particleSys.particleTexture = new Texture('https://assets.babylonjs.com/textures/flare.png', scene);
    particleSys.emitter = hoopPosition;
    particleSys.minEmitBox = new Vector3(-0.2, -0.2, -0.2);
    particleSys.maxEmitBox = new Vector3(0.2, 0.2, 0.2);
    particleSys.color1 = new Color3(1.0, 0.8, 0.2).toColor4(1);
    particleSys.color2 = new Color3(0.0, 0.95, 1.0).toColor4(1);
    particleSys.minSize = 0.1;
    particleSys.maxSize = 0.3;
    particleSys.minLifeTime = 0.2;
    particleSys.maxLifeTime = 0.6;
    particleSys.manualEmitCount = 0;
    particleSys.start();

    // Game loop render
    ctx.engine.runRenderLoop(() => {
      scene.render();
    });

    return () => {
      ctx.engine.stopRenderLoop();
      ctx.scene.dispose();
      ctx.engine.dispose();
    };
  }, []);

  // Camera preset switcher
  const handleCameraChange = (mode: 'BROADCAST' | 'COURTSIDE' | 'RIM_CAM') => {
    setCameraMode(mode);
    const ctx = contextRef.current;
    if (!ctx) return;
    const cam = ctx.camera;

    if (mode === 'BROADCAST') {
      cam.alpha = -Math.PI / 2;
      cam.beta = Math.PI / 3.2;
      cam.radius = 15;
      cam.target = new Vector3(0, 1.8, 0);
    } else if (mode === 'COURTSIDE') {
      cam.alpha = -Math.PI / 3.8;
      cam.beta = Math.PI / 2.4;
      cam.radius = 9;
      cam.target = new Vector3(0, 1.4, 2);
    } else if (mode === 'RIM_CAM') {
      cam.alpha = Math.PI / 2;
      cam.beta = Math.PI / 2.8;
      cam.radius = 6.5;
      cam.target = hoopPosRef.current;
    }
  };

  const resetAthletePose = (athlete: ReturnType<typeof createProceduralAthlete>) => {
    athlete.root.position.copyFrom(athletePosRef.current);
    athlete.root.rotation.set(0, 0, 0);
    athlete.leftLeg.rotation.set(0, 0, 0);
    athlete.rightLeg.rotation.set(0, 0, 0);
    athlete.leftArm.rotation.set(0, 0, Math.PI / 8);
    athlete.rightArm.rotation.set(0, 0, -Math.PI / 6);
    if (athlete.basketball) {
      athlete.basketball.position.set(0.8, 1.25, 0.2);
    }
  };

  const clearAnimation = () => {
    if (animationRef.current !== null) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
  };

  // Charge up mechanic
  const handlePointerDown = () => {
    if (gameState !== 'IDLE') return;
    isHoldingCharge.current = true;
    chargeStartTime.current = performance.now();
    playSfx(() => SoundJuice.playCharge());

    const interval = window.setInterval(() => {
      if (!isHoldingCharge.current) {
        clearInterval(interval);
        return;
      }
      const elapsed = (performance.now() - chargeStartTime.current) / 1000;
      const pct = Math.min(100, Math.round((elapsed / 1.1) * 100));
      setCharge(pct);
    }, 30);
  };

  // Release jump & execute the Venice dunk loop: gather → plant → takeoff → hang → contact → land
  const handlePointerUp = () => {
    if (!isHoldingCharge.current || gameState !== 'IDLE') return;
    isHoldingCharge.current = false;
    const finalCharge = charge;

    const athlete = athleteRef.current;
    if (!athlete) return;

    playSfx(() => SoundJuice.playTakeoff());
    setGameState('GATHER');

    const gatherZ = -2.4;
    const plantZ = -0.9;
    const takeoffZ = 0.7;
    const rimZ = hoopPosRef.current.z;
    const rimY = hoopPosRef.current.y;

    // Determine make/miss based on charge window (sweet spot 80-95)
    const isMake = finalCharge >= 72 && finalCharge <= 96;
    setResult(isMake ? 'make' : 'miss');

    // Clamp miss type: short vs long/brick
    const missReason = finalCharge < 72 ? 'SHORT' : 'RIM_OUT';

    let t = 0;
    clearAnimation();
    animationRef.current = window.setInterval(() => {
      t += 0.022;

      // Phase 1: GATHER (dribble into controlled approach)
      if (t < 0.35) {
        const p = t / 0.35;
        athlete.root.position.z = athletePosRef.current.z + (gatherZ - athletePosRef.current.z) * p;
        athlete.root.position.y = Math.abs(Math.sin(p * Math.PI * 4)) * 0.08;
        athlete.leftLeg.rotation.x = Math.sin(p * Math.PI * 8) * 0.4;
        athlete.rightLeg.rotation.x = -Math.sin(p * Math.PI * 8) * 0.4;
        if (athlete.basketball) {
          athlete.basketball.position.set(0.55, 1.05 + Math.sin(p * Math.PI * 6) * 0.25, 0.3);
        }
      }
      // Phase 2: PLANT (penultimate stride compression)
      else if (t < 0.55) {
        setGameState('PLANT');
        const p = (t - 0.35) / 0.2;
        athlete.root.position.z = gatherZ + (plantZ - gatherZ) * p;
        athlete.root.position.y = 0.15 * (1 - p);
        athlete.leftLeg.rotation.x = -0.35 * p;
        athlete.rightLeg.rotation.x = 0.55 * p;
        athlete.root.rotation.x = 0.18 * p; // forward trunk lean into plant
        if (athlete.basketball) {
          athlete.basketball.position.set(0.45, 1.15, 0.35);
        }
      }
      // Phase 3: TAKEOFF (drive up)
      else if (t < 0.85) {
        setGameState('TAKEOFF');
        const p = (t - 0.55) / 0.3;
        athlete.root.position.z = plantZ + (takeoffZ - plantZ) * p;
        athlete.root.position.y = 1.9 * Math.sin(p * Math.PI * 0.55);
        athlete.root.rotation.x = 0.18 * (1 - p * 0.7); // trunk extends
        athlete.leftLeg.rotation.x = 0.75 * p;
        athlete.rightLeg.rotation.x = -0.85 * p;
        if (athlete.basketball) {
          athlete.basketball.position.set(0.55, 1.65 + p * 0.6, 0.3);
        }
      }
      // Phase 4: HANG (apex at rim)
      else if (t < 1.35) {
        setGameState('HANG');
        const p = (t - 0.85) / 0.5;
        const apexHeight = 3.35 + (finalCharge / 100) * 0.55;
        athlete.root.position.z = takeoffZ + (rimZ - 0.55 - takeoffZ) * Math.sin(p * Math.PI * 0.5);
        athlete.root.position.y = apexHeight * Math.sin((1 - p) * Math.PI);

        // Style motion during hang
        if (dunkStyle === '360_SPIN') {
          athlete.root.rotation.y = p * Math.PI * 2;
        } else if (dunkStyle === 'WINDMILL') {
          athlete.rightArm.rotation.x = -p * Math.PI * 2.6;
        } else if (dunkStyle === 'TOMAHAWK') {
          athlete.rightArm.rotation.x = -Math.PI * 0.9 + Math.sin(p * Math.PI) * 1.0;
        } else if (dunkStyle === 'BETWEEN_LEGS') {
          athlete.rightArm.rotation.x = -Math.PI * 0.45 * p;
          athlete.leftLeg.rotation.x = 0.65 * Math.sin(p * Math.PI);
        }
        if (athlete.basketball) {
          athlete.basketball.position.set(0.55, athlete.root.position.y + 0.85, 0.3);
        }
      }
      // Phase 5: CONTACT (visible rim interaction)
      else if (t < 1.55) {
        setGameState('CONTACT');
        const p = (t - 1.35) / 0.2;
        athlete.root.position.z = rimZ - 0.35 + 0.25 * p;
        athlete.root.position.y = rimY + 0.15 - 0.35 * p;

        if (isMake) {
          athlete.rightArm.rotation.x = -Math.PI * 1.05;
          if (athlete.basketball) {
            athlete.basketball.position.set(0.25, rimY - 0.08 - p * 0.12, rimZ - 0.05);
          }
        if (p > 0.5) {
            playSfx(() => SoundJuice.playSlam());
          }
        } else {
          // Visible miss: ball hits front rim / short
          if (athlete.basketball) {
            const missZ = missReason === 'SHORT' ? rimZ - 0.35 - p * 0.55 : rimZ + 0.12 + p * 0.18;
            const missY = rimY - 0.1 - p * 0.55;
            athlete.basketball.position.set(0.18, missY, missZ);
          }
          athlete.rightArm.rotation.x = -Math.PI * 0.75;
        }
      }
      // Phase 6: LAND
      else if (t < 1.95) {
        setGameState('LAND');
        const p = (t - 1.55) / 0.4;
        athlete.root.position.z = rimZ - 0.1 + 0.25 * p;
        athlete.root.position.y = Math.max(0, 0.9 * (1 - p));
        athlete.root.rotation.y *= (1 - p);
        athlete.leftLeg.rotation.x = -0.25 * p;
        athlete.rightLeg.rotation.x = 0.35 * p;
        athlete.root.rotation.x = 0;
      }
      // Done
      else {
        clearAnimation();
        setGameState('SCORED');
        setGctMs(isMake ? 164 : 198);
      }
    }, 22);
  };

  const resetDunk = () => {
    clearAnimation();
    setGameState('IDLE');
    setCharge(0);
    setResult(null);
    const athlete = athleteRef.current;
    if (athlete) {
      resetAthletePose(athlete);
    }
  };

  return (
    <div className="unreal-canvas relative w-full h-[720px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
      {/* 3D WebGL Canvas with Dark-Blue Ink Outlines & Cel Shader Pipeline */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full touch-none z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Top Overlay HUD */}
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
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40 font-bold uppercase">
              VENICE NIGHT COURT
              </span>
            <span className="text-xs font-mono text-zinc-400">• 3.05M REGULATION</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase tracking-tight mt-0.5">
            SLAM DUNK CONTEST
            </h1>
          </div>
        </div>

        {/* Controls & Camera Switcher */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-black/60 border border-white/10 p-1 rounded-2xl flex items-center gap-1 backdrop-blur-md">
            {(['BROADCAST', 'COURTSIDE', 'RIM_CAM'] as const).map((cam) => (
              <button
                key={cam}
                onClick={() => handleCameraChange(cam)}
                className={`px-3 py-1.5 rounded-xl font-mono text-[10px] uppercase font-bold transition-all cursor-pointer ${
                  cameraMode === cam ? 'bg-[#00F2FF] text-black shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cam}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00F2FF]" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Phase Feedback Overlay */}
      {gameState !== 'IDLE' && gameState !== 'SCORED' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="px-5 py-3 rounded-2xl bg-black/70 border border-white/10 backdrop-blur-md">
            <span className="text-xs font-mono font-bold text-[#00F2FF] uppercase tracking-widest">
              {gameState.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}

      {/* Eastbay Master Standard Result Card */}
      {gameState === 'SCORED' && result !== null && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="max-w-sm w-full p-6 rounded-3xl bg-[#090B12] border border-[#00F2FF]/40 shadow-[0_0_80px_rgba(0,242,255,0.25)] text-center space-y-5">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="w-6 h-6 text-[#00F2FF]" />
              <span className="text-[10px] font-mono tracking-widest text-[#00F2FF] uppercase font-bold">
                Eastbay Master Standard
              </span>
            </div>

            <div className={`text-3xl font-orbitron font-black uppercase tracking-tight ${result === 'make' ? 'text-[#00FF9D]' : 'text-red-400'}`}>
              {result === 'make' ? 'DUNK CONFIRMED' : result === 'miss' ? 'RIM OUT — RETRY' : ''}
            </div>

            {/* Master Standard metrics */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="text-[9px] font-mono text-zinc-500 uppercase">GCT</div>
                <div className="text-lg font-orbitron font-black text-white">{gctMs}<span className="text-xs font-mono text-zinc-500 ml-1">ms</span></div>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="text-[9px] font-mono text-zinc-500 uppercase">ELASTIC RECOIL</div>
                <div className="text-lg font-orbitron font-black text-white">4.8<span className="text-xs font-mono text-zinc-500 ml-1">x BW</span></div>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="text-[9px] font-mono text-zinc-500 uppercase">VERTICAL</div>
                <div className="text-lg font-orbitron font-black text-white">38.5<span className="text-xs font-mono text-zinc-500 ml-1">in</span></div>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="text-[9px] font-mono text-zinc-500 uppercase">TRUNK LEAN</div>
                <div className="text-lg font-orbitron font-black text-white">3°<span className="text-xs font-mono text-zinc-500 ml-1">right</span></div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">CASE CLASSIFICATION</div>
              <div className="text-sm font-mono font-bold text-white mt-1">NOT CLINICAL</div>
            </div>

            <button
              onClick={resetDunk}
              className="w-full py-4 bg-[#00F2FF] text-black font-orbitron font-black text-sm rounded-2xl hover:bg-[#00F2FF]/90 transition-all shadow-[0_0_25px_rgba(0,242,255,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              {result === 'make' ? 'NEXT ATTEMPT' : 'INSTANT RETRY'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Interactive Charge & Style Bar */}
      <div className="relative z-10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-none">
        
        {/* Style Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md pointer-events-auto">
          {(['WINDMILL', 'TOMAHAWK', '360_SPIN', 'BETWEEN_LEGS'] as const).map((style) => (
            <button
              key={style}
              onClick={() => {
                playSfx(() => SoundJuice.playZoneBeep());
                setDunkStyle(style);
              }}
              className={`px-3 py-2 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer ${
                dunkStyle === style 
                  ? 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40 shadow-[0_0_15px_rgba(0,242,255,0.2)]' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {style.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Central Charge / Takeoff Action Button */}
        {gameState === 'IDLE' && (
          <div className="flex items-center gap-4 pointer-events-auto">
            {/* Charge Meter */}
            <div className="w-36 sm:w-48 space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-zinc-400">JUMP VELOCITY:</span>
                <span className="text-[#00F2FF] font-bold">{charge}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#00F2FF] to-[#7000FF] transition-all duration-75"
                  style={{ width: `${charge}%` }}
                />
              </div>
            </div>

            <button
              onMouseDown={handlePointerDown}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchEnd={handlePointerUp}
              onMouseLeave={() => {
                if (isHoldingCharge.current) handlePointerUp();
              }}
              className="px-8 py-4 rounded-2xl bg-[#00F2FF] text-black font-orbitron font-black text-sm tracking-wider hover:bg-[#00F2FF]/90 transition-all shadow-[0_0_35px_rgba(0,242,255,0.4)] active:scale-95 flex items-center gap-2 cursor-pointer select-none"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>HOLD TO CHARGE</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
