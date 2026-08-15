import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, Flame, 
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

  const [gameState, setGameState] = useState<'IDLE' | 'APPROACH' | 'AIRBORNE' | 'SLAMMED' | 'SCORED'>('IDLE');
  const [charge, setCharge] = useState<number>(0);
  const [dunkStyle, setDunkStyle] = useState<'WINDMILL' | 'TOMAHAWK' | '360_SPIN' | 'BETWEEN_LEGS'>('WINDMILL');
  const [score, setScore] = useState<number | null>(null);
  const [scoresArray, setScoresArray] = useState<{ judge: string; pts: number; note: string }[]>([]);
  const [gctMs, setGctMs] = useState<number>(98);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<'BROADCAST' | 'COURTSIDE' | 'RIM_CAM'>('BROADCAST');

  const athleteRef = useRef<ReturnType<typeof createProceduralAthlete> | null>(null);
  const hoopPosRef = useRef<Vector3>(new Vector3(0, 3.05, 5.5));
  const athletePosRef = useRef<Vector3>(new Vector3(0, 0, -6));
  const isHoldingCharge = useRef<boolean>(false);
  const chargeStartTime = useRef<number>(0);

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

    // 1. Venice Beach Hardcourt Ground Mesh
    const court = MeshBuilder.CreateGround('venice_court', { width: 16, height: 24 }, scene);
    const courtMat = new StandardMaterial('courtMat', scene);
    courtMat.diffuseColor = new Color3(0.06, 0.22, 0.42); // Venice Blue
    courtMat.specularColor = new Color3(0.15, 0.15, 0.15);
    court.material = courtMat;
    court.receiveShadows = true;

    // Court Boundary Lines
    const lines = MeshBuilder.CreateBox('court_lines', { width: 14.8, height: 0.01, depth: 22.8 }, scene);
    const lineMat = new StandardMaterial('lineMat', scene);
    lineMat.diffuseColor = new Color3(0.9, 0.9, 0.95);
    lineMat.alpha = 0.6;
    lines.position.y = 0.005;
    lines.material = lineMat;

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
      new Color3(0.0, 0.95, 1.0), // Neon Cyan Jersey
      new Color3(0.44, 0.0, 1.0), // Purple Accent
      shadowGenerator
    );
    athleteRef.current = athlete;
    athlete.root.position.copyFrom(athletePosRef.current);

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

  // Charge up mechanic
  const handlePointerDown = () => {
    if (gameState !== 'IDLE') return;
    isHoldingCharge.current = true;
    chargeStartTime.current = performance.now();
    playSfx(() => SoundJuice.playCharge());

    const interval = setInterval(() => {
      if (!isHoldingCharge.current) {
        clearInterval(interval);
        return;
      }
      const elapsed = (performance.now() - chargeStartTime.current) / 1000;
      const pct = Math.min(100, Math.round((elapsed / 1.1) * 100));
      setCharge(pct);
    }, 30);
  };

  // Release jump & execute slam
  const handlePointerUp = () => {
    if (!isHoldingCharge.current || gameState !== 'IDLE') return;
    isHoldingCharge.current = false;
    const finalCharge = charge;
    setGameState('APPROACH');

    const athlete = athleteRef.current;
    if (!athlete) return;

    playSfx(() => SoundJuice.playTakeoff());

    // Animated Stride & Takeoff to Rim
    let t = 0;
    const approachInterval = setInterval(() => {
      t += 0.04;
      if (t < 0.45) {
        // Linear acceleration along Z
        const currentZ = -6 + (t / 0.45) * 8.5;
        athlete.root.position.z = currentZ;
        athlete.root.position.y = 0;
        // Running leg animation
        athlete.leftLeg.rotation.x = Math.sin(t * 20) * 0.6;
        athlete.rightLeg.rotation.x = -Math.sin(t * 20) * 0.6;
      } else if (t < 0.95) {
        // Airborne jump arc
        setGameState('AIRBORNE');
        const jumpProgress = (t - 0.45) / 0.5;
        athlete.root.position.z = 2.5 + jumpProgress * 2.8;
        // Parabolic jump arc with peak height proportional to charge
        const maxHeight = 3.3 + (finalCharge / 100) * 0.7;
        athlete.root.position.y = Math.sin(jumpProgress * Math.PI) * maxHeight;

        // Dunk trick animation
        if (dunkStyle === '360_SPIN') {
          athlete.root.rotation.y = jumpProgress * Math.PI * 2;
        } else if (dunkStyle === 'WINDMILL') {
          athlete.rightArm.rotation.x = -jumpProgress * Math.PI * 2.5;
        } else if (dunkStyle === 'TOMAHAWK') {
          athlete.rightArm.rotation.x = -Math.PI * 0.8 + Math.sin(jumpProgress * Math.PI) * 1.2;
        }
      } else {
        // Slam Impact!
        clearInterval(approachInterval);
        setGameState('SLAMMED');
        athlete.root.position.set(0, 2.7, 5.3);
        if (athlete.basketball) {
          athlete.basketball.position.copyFrom(hoopPosRef.current);
        }
        
        playSfx(() => SoundJuice.playSlam());

        // Calculate scores & feedback
        const timingScore = Math.max(70, Math.min(100, Math.round(100 - Math.abs(finalCharge - 92) * 1.5)));
        const calculatedGct = Math.max(75, Math.round(120 - (finalCharge / 100) * 35));
        setGctMs(calculatedGct);
        setScore(timingScore);

        setScoresArray([
          { judge: 'DOMINIQUE', pts: Math.min(10, Math.round(timingScore / 10)), note: 'Explosive vertical rise!' },
          { judge: 'VINCE', pts: Math.min(10, Math.round((timingScore + 2) / 10)), note: 'Flawless extension at apex.' },
          { judge: 'ELIJAH', pts: Math.min(10, Math.round((timingScore - 1) / 10)), note: `GCT: ${calculatedGct}ms · Elite recoil` }
        ]);

        setTimeout(() => {
          setGameState('SCORED');
        }, 1200);
      }
    }, 25);
  };

  const resetDunk = () => {
    setGameState('IDLE');
    setCharge(0);
    setScore(null);
    setScoresArray([]);
    const athlete = athleteRef.current;
    if (athlete) {
      athlete.root.position.set(0, 0, -6);
      athlete.root.rotation.set(0, 0, 0);
      athlete.leftLeg.rotation.set(0, 0, 0);
      athlete.rightLeg.rotation.set(0, 0, 0);
      athlete.rightArm.rotation.set(0, 0, -Math.PI / 8);
      if (athlete.basketball) {
        athlete.basketball.position.set(0.8, 1.3, 0.2);
      }
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
                BABYLON.JS 3D ENGINE
              </span>
              <span className="text-xs font-mono text-zinc-400">• VENICE 3.05M REGULATION</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase tracking-tight mt-0.5">
              3D SLAM DUNK CONTEST
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

      {/* Center Action Feedback Overlay */}
      {gameState === 'SLAMMED' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none animate-bounce">
          <div className="p-6 rounded-3xl bg-black/80 border border-[#00F2FF] shadow-[0_0_80px_rgba(0,242,255,0.6)] text-center">
            <Flame className="w-12 h-12 text-[#00F2FF] mx-auto animate-pulse" />
            <h2 className="text-4xl sm:text-5xl font-orbitron font-black text-white tracking-widest uppercase mt-2">
              SLAMMED!
            </h2>
            <p className="text-xs font-mono text-[#00FF9D] mt-1 font-bold">16.6ms KINETIC PEAK</p>
          </div>
        </div>
      )}

      {/* Scorecard Modal Overlay */}
      {gameState === 'SCORED' && score !== null && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#090B12] border border-[#00F2FF]/40 shadow-[0_0_100px_rgba(0,242,255,0.3)] text-center space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-[#00F2FF] flex items-center justify-center mx-auto">
              <Trophy className="w-6 h-6" />
            </div>

            <div>
              <div className="text-[10px] font-mono tracking-widest text-[#00F2FF] uppercase font-bold">
                ADJUDICATED CONTEST SCORE
              </div>
              <div className="text-5xl font-orbitron font-black text-white mt-1">
                {score} <span className="text-xl text-zinc-500">/ 100</span>
              </div>
            </div>

            {/* 3-Judge Array */}
            <div className="space-y-2 text-left">
              {scoresArray.map((j, i) => (
                <div key={i} className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold text-white">{j.judge}</div>
                    <div className="text-[10px] font-mono text-zinc-400">{j.note}</div>
                  </div>
                  <div className="text-lg font-orbitron font-black text-[#FFD700]">
                    {j.pts}.0
                  </div>
                </div>
              ))}
            </div>

            {/* Biometric GCT Benchmark */}
            <div className="p-3.5 rounded-2xl bg-[#00FF9D]/10 border border-[#00FF9D]/30 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300">REACTIVE GCT TIMING:</span>
              <span className="font-bold text-[#00FF9D]">{gctMs} ms [ELITE]</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={resetDunk}
                className="flex-1 py-4 bg-[#00F2FF] text-black font-orbitron font-black text-sm rounded-2xl hover:bg-[#00F2FF]/90 transition-all shadow-[0_0_25px_rgba(0,242,255,0.4)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                NEXT ATTEMPT
              </button>
            </div>
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
