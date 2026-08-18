import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, 
  Trophy, Play
} from 'lucide-react';
import { 
  Vector3, Color3, MeshBuilder, StandardMaterial, 
  ParticleSystem, Texture
} from '@babylonjs/core';
import { createBabylonContext, createProceduralAthlete, BabylonSceneContext, poseReverseTwoHandSlam } from '../../lib/babylon/BabylonSceneBuilder';
import { SoundJuice } from '../../lib/judgeScoring';

const GCT_SWEET = 164;
const VERTICAL_SWEET = 38.5;
const ELASTIC_RECOIL_SWEET = 4.8;
const TRUNK_LEAN_CASE = 3.0;

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
  const [gctMs, setGctMs] = useState<number>(GCT_SWEET);
  const [verticalIn, setVerticalIn] = useState<number>(VERTICAL_SWEET);
  const [elasticRecoil, setElasticRecoil] = useState<number>(ELASTIC_RECOIL_SWEET);
  const [trunkLean, setTrunkLean] = useState<number>(TRUNK_LEAN_CASE);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<'BROADCAST' | 'COURTSIDE' | 'RIM_CAM'>('BROADCAST');

  const athleteRef = useRef<ReturnType<typeof createProceduralAthlete> | null>(null);
  const hoopPosRef = useRef<Vector3>(new Vector3(0, 3.05, 5.5));
  const athletePosRef = useRef<Vector3>(new Vector3(0, 0, -6));
  const isHoldingCharge = useRef<boolean>(false);
  const chargeStartTime = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const sceneRef = useRef<ReturnType<typeof createBabylonContext>['scene'] | null>(null);

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

    // --- Venice Beach night court environment ---

    // 1. Ocean beyond the baseline
    const ocean = MeshBuilder.CreateGround('ocean', { width: 80, height: 80 }, scene);
    const oceanMat = new StandardMaterial('oceanMat', scene);
    oceanMat.diffuseColor = new Color3(0.04, 0.12, 0.22);
    oceanMat.specularColor = new Color3(0.15, 0.25, 0.35);
    ocean.material = oceanMat;
    ocean.position.set(0, -0.08, 40);
    ocean.rotation.x = -0.02;

    // 2. Sand under the court and out of bounds
    const sand = MeshBuilder.CreateGround('sand', { width: 40, height: 60 }, scene);
    const sandMat = new StandardMaterial('sandMat', scene);
    sandMat.diffuseColor = new Color3(0.22, 0.2, 0.16);
    sandMat.specularColor = new Color3(0.05, 0.05, 0.05);
    sand.material = sandMat;
    sand.position.y = -0.04;
    sand.receiveShadows = true;

    // 3. Venice Beach night hardcourt
    const court = MeshBuilder.CreateGround('venice_court', { width: 16, height: 24 }, scene);
    const courtMat = new StandardMaterial('courtMat', scene);
    courtMat.diffuseColor = new Color3(0.18, 0.36, 0.55);
    courtMat.specularColor = new Color3(0.14, 0.14, 0.14);
    court.material = courtMat;
    court.receiveShadows = true;

    // Court Boundary Lines
    const lines = MeshBuilder.CreateBox('court_lines', { width: 14.8, height: 0.01, depth: 22.8 }, scene);
    const lineMat = new StandardMaterial('lineMat', scene);
    lineMat.diffuseColor = new Color3(0.95, 0.95, 1.0);
    lineMat.alpha = 0.9;
    lines.position.y = 0.005;
    lines.material = lineMat;

    // Key paint
    const keyPaint = MeshBuilder.CreateBox('key_paint', { width: 4.9, height: 0.005, depth: 5.8 }, scene);
    const keyMat = new StandardMaterial('keyMat', scene);
    keyMat.diffuseColor = new Color3(0.13, 0.28, 0.45);
    keyPaint.material = keyMat;
    keyPaint.position.set(0, 0.003, 4.9);

    // 4. Regulation 3.05m Basketball Backboard & Rim
    const post = MeshBuilder.CreateCylinder('hoop_post', { height: 3.8, diameter: 0.16 }, scene);
    post.position.set(0, 1.9, 6.2);
    const postMat = new StandardMaterial('postMat', scene);
    postMat.diffuseColor = new Color3(0.22, 0.22, 0.27);
    post.material = postMat;
    shadowGenerator?.addShadowCaster(post);

    const backboard = MeshBuilder.CreateBox('backboard', { width: 1.8, height: 1.05, depth: 0.08 }, scene);
    backboard.position.set(0, 3.4, 5.8);
    const boardMat = new StandardMaterial('boardMat', scene);
    boardMat.diffuseColor = new Color3(0.92, 0.92, 1.0);
    boardMat.alpha = 0.88;
    backboard.material = boardMat;
    shadowGenerator?.addShadowCaster(backboard);

    // Rim
    const rim = MeshBuilder.CreateTorus('rim', { diameter: 0.55, thickness: 0.05, tessellation: 24 }, scene);
    rim.position.copyFrom(hoopPosition);
    rim.rotation.x = Math.PI / 2;
    const rimMat = new StandardMaterial('rimMat', scene);
    rimMat.diffuseColor = new Color3(1.0, 0.38, 0.0);
    rimMat.emissiveColor = new Color3(0.45, 0.16, 0.0);
    rim.material = rimMat;
    shadowGenerator?.addShadowCaster(rim);

    // 5. Chain-link fence along sidelines + baseline
    const fenceMat = new StandardMaterial('fenceMat', scene);
    fenceMat.diffuseColor = new Color3(0.12, 0.12, 0.14);
    fenceMat.alpha = 0.55;
    fenceMat.wireframe = true;

    const fenceL = MeshBuilder.CreatePlane('fence_l', { width: 24, height: 3.2 }, scene);
    fenceL.position.set(-8.2, 1.6, 0);
    fenceL.rotation.y = -Math.PI / 2;
    fenceL.material = fenceMat;

    const fenceR = MeshBuilder.CreatePlane('fence_r', { width: 24, height: 3.2 }, scene);
    fenceR.position.set(8.2, 1.6, 0);
    fenceR.rotation.y = Math.PI / 2;
    fenceR.material = fenceMat;

    const fenceBack = MeshBuilder.CreatePlane('fence_back', { width: 18, height: 3.2 }, scene);
    fenceBack.position.set(0, 1.6, -12.2);
    fenceBack.rotation.y = Math.PI;
    fenceBack.material = fenceMat;

    // 6. Bleachers / crowd side beyond fence
    const bleacherMat = new StandardMaterial('bleacherMat', scene);
    bleacherMat.diffuseColor = new Color3(0.18, 0.18, 0.2);
    for (let i = 0; i < 5; i++) {
      const bench = MeshBuilder.CreateBox(`bleacher_${i}`, { width: 14, height: 0.12, depth: 0.6 }, scene);
      bench.position.set(0, 0.2 + i * 0.35, -14 - i * 0.7);
      bench.material = bleacherMat;
      shadowGenerator?.addShadowCaster(bench);
    }

    // 7. Palms silhouettes behind the bleachers
    const trunkMat = new StandardMaterial('trunkMat', scene);
    trunkMat.diffuseColor = new Color3(0.14, 0.1, 0.08);
    const frondMat = new StandardMaterial('frondMat', scene);
    frondMat.diffuseColor = new Color3(0.06, 0.16, 0.12);

    const palmPositions = [
      { x: -10, z: -18 }, { x: -6, z: -20 }, { x: 9, z: -17 }, { x: 13, z: -21 }
    ];
    palmPositions.forEach((pos, idx) => {
      const trunk = MeshBuilder.CreateCylinder(`palm_trunk_${idx}`, { height: 6, diameterTop: 0.25, diameterBottom: 0.4, tessellation: 8 }, scene);
      trunk.position.set(pos.x, 2.8, pos.z);
      trunk.rotation.z = (Math.random() - 0.5) * 0.25;
      trunk.material = trunkMat;
      shadowGenerator?.addShadowCaster(trunk);

      const fronds = MeshBuilder.CreateSphere(`palm_fronds_${idx}`, { diameter: 2.8, segments: 8 }, scene);
      fronds.position.set(pos.x, 5.8, pos.z);
      fronds.scaling.y = 0.45;
      fronds.material = frondMat;
    });

    // 8. String lights above the court
    const bulbMat = new StandardMaterial('bulbMat', scene);
    bulbMat.diffuseColor = new Color3(1.0, 0.9, 0.7);
    bulbMat.emissiveColor = new Color3(0.5, 0.4, 0.2);
    for (let i = 0; i < 9; i++) {
      const bulb = MeshBuilder.CreateSphere(`bulb_${i}`, { diameter: 0.18 }, scene);
      bulb.position.set(-8 + i * 2, 6.8, -5 + Math.sin(i * 0.6) * 0.4);
      bulb.material = bulbMat;
    }

    // 9. Procedural Athlete in 3D
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

    sceneRef.current = scene;

    // Game loop render
    ctx.engine.runRenderLoop(() => {
      scene.render();
    });

    return () => {
      ctx.engine.stopRenderLoop();
      ctx.scene.dispose();
      ctx.engine.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Camera preset switcher — only active when not in a dunk play
  const handleCameraChange = (mode: 'BROADCAST' | 'COURTSIDE' | 'RIM_CAM') => {
    setCameraMode(mode);
    const ctx = contextRef.current;
    if (!ctx || gameState !== 'IDLE') return;
    const cam = ctx.camera;

    if (mode === 'BROADCAST') {
      cam.alpha = -Math.PI / 2;
      cam.beta = Math.PI / 2.9;
      cam.radius = 16;
      cam.target = new Vector3(0, 1.8, 0);
    } else if (mode === 'COURTSIDE') {
      cam.alpha = -Math.PI / 3.8;
      cam.beta = Math.PI / 2.4;
      cam.radius = 11;
      cam.target = new Vector3(0, 1.4, 2);
    } else if (mode === 'RIM_CAM') {
      cam.alpha = Math.PI / 2;
      cam.beta = Math.PI / 2.8;
      cam.radius = 7.5;
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

  const easeLerp = (start: number, end: number, p: number, ease: 'linear' | 'in' | 'out' | 'inOut' = 'linear') => {
    let t = Math.max(0, Math.min(1, p));
    if (ease === 'in') t = t * t;
    else if (ease === 'out') t = 1 - (1 - t) * (1 - t);
    else if (ease === 'inOut') t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return start + (end - start) * t;
  };

  // Charge up mechanic — runway gather, release commits the approach
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
    const ctx = contextRef.current;
    if (!athlete || !ctx) return;

    playSfx(() => SoundJuice.playTakeoff());
    setGameState('GATHER');

    const gatherZ = -2.4;
    const plantZ = -0.9;
    const takeoffZ = 0.7;
    const rimZ = hoopPosRef.current.z;
    const rimY = hoopPosRef.current.y;

    // Outcome not locked until contact; compute contact-quality from charge now
    const timingError = Math.abs(finalCharge - 84);
    const contactQuality = Math.max(0, 1 - timingError / 24); // 1.0 at 84, 0 at 60/108
    const isMake = finalCharge >= 72 && finalCharge <= 96;
    const missReason = finalCharge < 72 ? 'SHORT' : 'RIM_OUT';

    // Dynamic CASE metrics derived from this attempt (Eastbay remains the Master Standard comparison)
    const attemptGct = Math.round(GCT_SWEET + (1 - contactQuality) * 60);
    const attemptVertical = Math.round((VERTICAL_SWEET * (0.78 + 0.22 * contactQuality)) * 10) / 10;
    const attemptRecoil = Math.round((ELASTIC_RECOIL_SWEET * (0.72 + 0.28 * contactQuality)) * 10) / 10;
    const attemptTrunkLean = Math.round(TRUNK_LEAN_CASE + (1 - contactQuality) * 5);
    setGctMs(attemptGct);
    setVerticalIn(attemptVertical);
    setElasticRecoil(attemptRecoil);
    setTrunkLean(attemptTrunkLean);

    // Directed dunk camera: start wide behind runway
    const cam = ctx.camera;
    cam.detachControl();
    cam.alpha = -Math.PI / 2;
    cam.beta = Math.PI / 2.7;
    cam.radius = 16;
    cam.target = new Vector3(0, 1.6, -2);

    let t = 0;
    clearAnimation();
    animationRef.current = window.setInterval(() => {
      t += 0.022;

      // Phase 1: GATHER (dribble into controlled approach)
      if (t < 0.35) {
        const p = t / 0.35;
        athlete.root.position.z = easeLerp(athletePosRef.current.z, gatherZ, p, 'out');
        athlete.root.position.y = Math.abs(Math.sin(p * Math.PI * 4)) * 0.08;
        athlete.leftLeg.rotation.x = Math.sin(p * Math.PI * 8) * 0.4;
        athlete.rightLeg.rotation.x = -Math.sin(p * Math.PI * 8) * 0.4;
        if (athlete.basketball) {
          athlete.basketball.position.set(0.55, 1.05 + Math.sin(p * Math.PI * 6) * 0.25, 0.3);
        }
        // Camera pushes in behind gather
        cam.alpha = easeLerp(-Math.PI / 2, -Math.PI / 2.25, p, 'inOut');
        cam.radius = easeLerp(16, 11, p, 'inOut');
        cam.target = Vector3.Lerp(new Vector3(0, 1.6, -2), new Vector3(0, 1.6, 1), p);
      }
      // Phase 2: PLANT (penultimate stride compression)
      else if (t < 0.55) {
        setGameState('PLANT');
        const p = (t - 0.35) / 0.2;
        athlete.root.position.z = easeLerp(gatherZ, plantZ, p, 'inOut');
        athlete.root.position.y = 0.15 * (1 - p);
        athlete.leftLeg.rotation.x = -0.35 * p;
        athlete.rightLeg.rotation.x = 0.55 * p;
        athlete.root.rotation.x = 0.18 * p; // forward trunk lean into plant
        if (athlete.basketball) {
          athlete.basketball.position.set(0.45, 1.15, 0.35);
        }
        cam.alpha = easeLerp(-Math.PI / 2.25, -Math.PI / 2.6, p, 'inOut');
        cam.radius = easeLerp(11, 9, p, 'inOut');
        cam.target = Vector3.Lerp(new Vector3(0, 1.6, 1), new Vector3(0, 2.2, 3), p);
      }
      // Phase 3: TAKEOFF (drive up)
      else if (t < 0.85) {
        setGameState('TAKEOFF');
        const p = (t - 0.55) / 0.3;
        athlete.root.position.z = easeLerp(plantZ, takeoffZ, p, 'out');
        athlete.root.position.y = 1.9 * Math.sin(p * Math.PI * 0.55);
        athlete.root.rotation.x = 0.18 * (1 - p * 0.7); // trunk extends
        athlete.leftLeg.rotation.x = 0.75 * p;
        athlete.rightLeg.rotation.x = -0.85 * p;
        if (athlete.basketball) {
          athlete.basketball.position.set(0.55, 1.65 + p * 0.6, 0.3);
        }
        cam.alpha = easeLerp(-Math.PI / 2.6, -Math.PI / 2.1, p, 'inOut');
        cam.radius = easeLerp(9, 7.5, p, 'inOut');
        cam.target = Vector3.Lerp(new Vector3(0, 2.2, 3), new Vector3(0, 2.8, 4.5), p);
      }
      // Phase 4: HANG (apex at rim)
      else if (t < 1.35) {
        setGameState('HANG');
        const p = (t - 0.85) / 0.5;
        const apexHeight = 3.35 + (finalCharge / 100) * 0.55;
        athlete.root.position.z = easeLerp(takeoffZ, rimZ - 0.55, Math.sin(p * Math.PI * 0.5), 'out');
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
        // Drive segmented body into reverse two-hand slam silhouette at peak
        if (sceneRef.current) {
          poseReverseTwoHandSlam(athlete, sceneRef.current, p);
        }
        // Hold hang, sell the rim
        cam.alpha = easeLerp(-Math.PI / 2.1, -Math.PI / 1.85, p, 'inOut');
        cam.radius = easeLerp(7.5, 6.2, p, 'out');
        cam.target = Vector3.Lerp(new Vector3(0, 2.8, 4.5), new Vector3(0, 3.0, 5.0), p);
      }
      // Phase 5: CONTACT (visible rim interaction)
      else if (t < 1.55) {
        setGameState('CONTACT');
        const p = (t - 1.35) / 0.2;
        athlete.root.position.z = easeLerp(rimZ - 0.35, rimZ - 0.1, p, 'out');
        athlete.root.position.y = easeLerp(rimY + 0.15, rimY - 0.2, p, 'out');

        // Lock result at the moment of contact
        setResult(isMake ? 'make' : 'miss');

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
        cam.alpha = easeLerp(-Math.PI / 1.85, -Math.PI / 2.0, p, 'inOut');
        cam.radius = easeLerp(6.2, 6.5, p, 'out');
        cam.target = Vector3.Lerp(new Vector3(0, 3.0, 5.0), new Vector3(0, 2.9, 5.0), p);
      }
      // Phase 6: LAND
      else if (t < 1.95) {
        setGameState('LAND');
        const p = (t - 1.55) / 0.4;
        athlete.root.position.z = easeLerp(rimZ - 0.1, rimZ + 0.15, p, 'out');
        athlete.root.position.y = Math.max(0, 0.9 * (1 - p));
        athlete.root.rotation.y *= (1 - p);
        athlete.leftLeg.rotation.x = -0.25 * p;
        athlete.rightLeg.rotation.x = 0.35 * p;
        athlete.root.rotation.x = 0;
        // Settle on land
        cam.alpha = easeLerp(-Math.PI / 2.0, -Math.PI / 2.2, p, 'out');
        cam.radius = easeLerp(6.5, 10, p, 'out');
        cam.target = Vector3.Lerp(new Vector3(0, 2.9, 5.0), new Vector3(0, 1.6, 3), p);
      }
      // Done
      else {
        clearAnimation();
        setGameState('SCORED');
      }
    }, 22);
  };

  const resetDunk = () => {
    clearAnimation();
    setGameState('IDLE');
    setCharge(0);
    setResult(null);
    setGctMs(GCT_SWEET);
    setVerticalIn(VERTICAL_SWEET);
    setElasticRecoil(ELASTIC_RECOIL_SWEET);
    setTrunkLean(TRUNK_LEAN_CASE);
    const athlete = athleteRef.current;
    const ctx = contextRef.current;
    if (athlete) {
      resetAthletePose(athlete);
    }
    if (ctx) {
      ctx.camera.attachControl(true);
      handleCameraChange(cameraMode);
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
                disabled={gameState !== 'IDLE'}
                onClick={() => handleCameraChange(cam)}
                className={`px-3 py-1.5 rounded-xl font-mono text-[10px] uppercase font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
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

            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              CASE COMPARED TO EASTBAY MASTER STANDARD
            </div>

            {/* This-attempt metrics vs the Master Standard */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="text-[9px] font-mono text-zinc-500 uppercase">GCT</div>
                <div className="text-lg font-orbitron font-black text-white">{gctMs}<span className="text-xs font-mono text-zinc-500 ml-1">ms</span></div>
                <div className="text-[9px] font-mono text-zinc-600">MS: {GCT_SWEET} ms</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="text-[9px] font-mono text-zinc-500 uppercase">ELASTIC RECOIL</div>
                <div className="text-lg font-orbitron font-black text-white">{elasticRecoil}<span className="text-xs font-mono text-zinc-500 ml-1">x BW</span></div>
                <div className="text-[9px] font-mono text-zinc-600">MS: {ELASTIC_RECOIL_SWEET}x</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="text-[9px] font-mono text-zinc-500 uppercase">VERTICAL</div>
                <div className="text-lg font-orbitron font-black text-white">{verticalIn}<span className="text-xs font-mono text-zinc-500 ml-1">in</span></div>
                <div className="text-[9px] font-mono text-zinc-600">MS: {VERTICAL_SWEET} in</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="text-[9px] font-mono text-zinc-500 uppercase">TRUNK LEAN</div>
                <div className="text-lg font-orbitron font-black text-white">{trunkLean}°<span className="text-xs font-mono text-zinc-500 ml-1">right</span></div>
                <div className="text-[9px] font-mono text-zinc-600">MS: {TRUNK_LEAN_CASE}°</div>
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
            {/* Charge Meter with green window indicator */}
            <div className="w-36 sm:w-56 space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-zinc-400">GATHER WINDOW:</span>
                <span className={`font-bold ${charge >= 72 && charge <= 96 ? 'text-[#00FF9D]' : 'text-[#00F2FF]'}`}>{charge}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden relative">
                <div className="absolute left-[72%] right-[4%] h-full bg-[#00FF9D]/30" />
                <div 
                  className="h-full bg-gradient-to-r from-[#00F2FF] to-[#7000FF] transition-all duration-75 relative z-10"
                  style={{ width: `${charge}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                <span>BLOW IT</span>
                <span className="text-[#00FF9D]">GREEN 72-96</span>
                <span>OVERCOOK</span>
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
              <span>HOLD RUNWAY • RELEASE AT GREEN</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
