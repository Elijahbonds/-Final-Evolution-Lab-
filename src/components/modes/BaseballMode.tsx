import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, VolumeX, 
  Zap, ArrowLeft, Trophy, RotateCcw,
  Sparkles, Flame, Target
} from 'lucide-react';
import { 
  BaseballScoreState, 
  createInitialBaseballScore, 
  recordBaseballSwing, 
  computePrqDelta, 
  SoundJuice 
} from '../../lib/judgeScoring';

type PitchType = 'FASTBALL' | 'SLIDER' | 'CURVEBALL' | 'CHANGEUP';
type GamePhase = 'ready_for_pitch' | 'pitching' | 'ball_in_play' | 'result_pause' | 'derby_over';

interface PitchInfo {
  type: PitchType;
  speedMph: number;
  startX: number;
  startY: number; // feet from home plate (60.5)
  startZ: number; // height (5.8)
  plateX: number; // -1.0 to 1.0 (inside to outside)
  plateZ: number; // 1.5 to 3.8 (knees to letters)
  breakX: number;
  breakZ: number;
}

interface BattedBall {
  x: number; // -300 to 300 (left to right field)
  y: number; // 0 to 550 (distance from home plate in ft)
  z: number; // height in ft
  vx: number;
  vy: number;
  vz: number;
  exitVeloMph: number;
  launchAngleDeg: number;
  isHomeRun: boolean;
  distanceFt: number;
  apexFt: number;
  trail: Array<{ x: number; y: number; z: number }>;
}

interface FeedbackPopup {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface BaseballModeProps {
  onBack?: () => void;
  onGameComplete?: (result: { victory: boolean; prqDelta: number; homeRuns: number; longestFt: number }) => void;
}

export const BaseballMode: React.FC<BaseballModeProps> = ({ onBack, onGameComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Derby State
  const [scoreState, setScoreState] = useState<BaseballScoreState>(createInitialBaseballScore(10));
  const [gamePhase, setGamePhase] = useState<GamePhase>('ready_for_pitch');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [matchBanner, setMatchBanner] = useState<string | null>('PRESS SPACE OR TAP SWING WHEN READY');
  const [screenShake, setScreenShake] = useState<number>(0);
  const [popups, setPopups] = useState<FeedbackPopup[]>([]);
  const [lastPitchResult, setLastPitchResult] = useState<{
    text: string;
    subtext: string;
    exitMph: number;
    launchDeg: number;
    distFt: number;
    quality: 'perfect' | 'good' | 'foul' | 'miss';
  } | null>(null);

  // PCI (Plate Coverage Indicator) Position (-1 to 1 X, 1.5 to 3.8 Z)
  const pciPos = useRef<{ x: number; z: number }>({ x: 0, z: 2.6 });
  const [pciDisplay, setPciDisplay] = useState<{ x: number; z: number }>({ x: 0, z: 2.6 });

  // Physics Simulation Refs
  const pitchRef = useRef<PitchInfo | null>(null);
  const pitchProgressRef = useRef<number>(0); // 0 (mound) to 1.0 (plate)
  const currentBallPosRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 60.5, z: 5.8 });
  const battedBallRef = useRef<BattedBall | null>(null);
  const swingTriggeredRef = useRef<boolean>(false);
  const swingTimeRef = useRef<number>(0);

  // Add floating banner popup
  const addPopup = useCallback((text: string, x: number, y: number, color = '#00F2FF') => {
    const newPopup: FeedbackPopup = {
      id: Date.now() + Math.random(),
      text,
      x,
      y,
      color,
    };
    setPopups(prev => [...prev.slice(-3), newPopup]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== newPopup.id));
    }, 1500);
  }, []);

  // Generate a realistic pitch
  const generatePitch = useCallback((): PitchInfo => {
    const types: PitchType[] = ['FASTBALL', 'FASTBALL', 'SLIDER', 'CURVEBALL', 'CHANGEUP'];
    const type = types[Math.floor(Math.random() * types.length)];

    let speedMph = 98;
    let breakX = 0;
    let breakZ = 0;

    if (type === 'FASTBALL') {
      speedMph = 96 + Math.random() * 5; // 96 - 101 mph
      breakX = (Math.random() - 0.5) * 0.4;
      breakZ = -0.3; // slight gravity drop
    } else if (type === 'SLIDER') {
      speedMph = 86 + Math.random() * 4;
      breakX = 1.4; // sharp sweep to right
      breakZ = -1.2;
    } else if (type === 'CURVEBALL') {
      speedMph = 78 + Math.random() * 4;
      breakX = -0.6;
      breakZ = -2.8; // sharp downward bite
    } else if (type === 'CHANGEUP') {
      speedMph = 82 + Math.random() * 4;
      breakX = -0.8;
      breakZ = -1.6;
    }

    // Plate crossing location (mostly in strike zone)
    const plateX = (Math.random() - 0.5) * 1.4; // -0.7 to 0.7
    const plateZ = 1.8 + Math.random() * 1.6; // 1.8 to 3.4 ft high

    return {
      type,
      speedMph,
      startX: (Math.random() - 0.5) * 0.8,
      startY: 60.5,
      startZ: 5.8,
      plateX,
      plateZ,
      breakX,
      breakZ,
    };
  }, []);

  // Throw Next Pitch
  const throwNextPitch = useCallback(() => {
    if (scoreState.pitchesRemaining <= 0) {
      setGamePhase('derby_over');
      return;
    }

    const newPitch = generatePitch();
    pitchRef.current = newPitch;
    pitchProgressRef.current = 0;
    battedBallRef.current = null;
    swingTriggeredRef.current = false;
    setGamePhase('pitching');
    setMatchBanner(`${newPitch.type} INCOMING! TIME YOUR SWING (SPACE)`);
    if (soundEnabled) SoundJuice.playPitchWhoosh();
  }, [generatePitch, scoreState.pitchesRemaining, soundEnabled]);

  // Execute Swing and Resolve Contact
  const executeSwing = useCallback(() => {
    if (gamePhase !== 'pitching' || swingTriggeredRef.current) return;

    swingTriggeredRef.current = true;
    swingTimeRef.current = performance.now();
    const pitch = pitchRef.current;
    if (!pitch) return;

    const progress = pitchProgressRef.current;
    // Perfect contact happens at progress ~ 0.92 to 0.98
    const timingDiff = progress - 0.95; // < -0.08 = VERY EARLY, > 0.08 = VERY LATE

    // Check PCI Barrel Accuracy
    const dx = pciPos.current.x - currentBallPosRef.current.x;
    const dz = pciPos.current.z - currentBallPosRef.current.z;
    const barrelDistance = Math.hypot(dx, dz); // in feet (0 = dead center of barrel)

    let timingQuality: 'PERFECT' | 'GOOD' | 'EARLY' | 'LATE' | 'MISS';
    if (Math.abs(timingDiff) <= 0.04) timingQuality = 'PERFECT';
    else if (Math.abs(timingDiff) <= 0.08) timingQuality = 'GOOD';
    else if (timingDiff < -0.08 && timingDiff >= -0.16) timingQuality = 'EARLY';
    else if (timingDiff > 0.08 && timingDiff <= 0.16) timingQuality = 'LATE';
    else timingQuality = 'MISS';

    // Barrel Quality
    const isSolidContact = barrelDistance < 0.65 && timingQuality !== 'MISS';
    const isPerfectBarrel = barrelDistance < 0.28 && (timingQuality === 'PERFECT' || timingQuality === 'GOOD');

    if (!isSolidContact) {
      // SWING AND MISS / STRIKE
      setGamePhase('result_pause');
      if (soundEnabled) SoundJuice.playUmpireCall('strike');
      setLastPitchResult({
        text: 'WHIFF / STRIKE',
        subtext: timingQuality === 'MISS' ? 'Off-Balance Timing' : 'Missed the Barrel',
        exitMph: 0,
        launchDeg: 0,
        distFt: 0,
        quality: 'miss',
      });
      addPopup('STRIKE! 💨', window.innerWidth / 2, window.innerHeight / 2, '#FF0055');

      setScoreState(prev => {
        const next = recordBaseballSwing(prev, pitch.type, 'STRIKE', 0, 0, 0);
        return next;
      });

      setTimeout(() => {
        setGamePhase('ready_for_pitch');
      }, 1600);
      return;
    }

    // HIT RESOLUTION & TRAJECTORY PHYSICS
    setGamePhase('ball_in_play');

    let baseExitVelo = pitch.speedMph * 0.25 + 75; // ~99 mph base
    if (isPerfectBarrel) baseExitVelo += 16 + Math.random() * 6; // up to 118 mph
    else if (barrelDistance < 0.45) baseExitVelo += 8 + Math.random() * 4; // ~107 mph
    else baseExitVelo -= 12; // weak contact

    // Launch Angle based on PCI elevation vs ball
    // If PCI is slightly below ball -> lift / flyball (25 - 34 deg)
    const verticalOffset = pciPos.current.z - currentBallPosRef.current.z;
    let launchAngle = 28 + verticalOffset * 22 + (Math.random() - 0.5) * 6;
    launchAngle = Math.max(8, Math.min(52, launchAngle));

    // Spray Direction based on timing
    // Early = Pull (left field, -deg), Late = Opposite (right field, +deg)
    let sprayAngleDeg = timingDiff * -350 + (Math.random() - 0.5) * 6;
    sprayAngleDeg = Math.max(-48, Math.min(48, sprayAngleDeg));

    const totalVeloFps = (baseExitVelo * 5280) / 3600; // ft/sec
    const radSpray = (sprayAngleDeg * Math.PI) / 180;
    const radLaunch = (launchAngle * Math.PI) / 180;

    const vx = totalVeloFps * Math.cos(radLaunch) * Math.sin(radSpray);
    const vy = totalVeloFps * Math.cos(radLaunch) * Math.cos(radSpray);
    const vz = totalVeloFps * Math.sin(radLaunch);

    // Theoretical distance estimation: ~ (V^2 * sin(2*theta)) / g * carry factor
    const carryFactor = 1.05;
    const estimatedDist = Math.round(((Math.pow(totalVeloFps, 2) * Math.sin(2 * radLaunch)) / 32.174) * carryFactor);

    const isHomeRun = estimatedDist >= 380 && Math.abs(sprayAngleDeg) <= 42 && launchAngle >= 18;

    battedBallRef.current = {
      x: 0,
      y: 0,
      z: 3.0,
      vx,
      vy,
      vz,
      exitVeloMph: Math.round(baseExitVelo),
      launchAngleDeg: Math.round(launchAngle),
      isHomeRun,
      distanceFt: estimatedDist,
      apexFt: 0,
      trail: [],
    };

    if (isPerfectBarrel) {
      setScreenShake(16);
      if (soundEnabled) {
        SoundJuice.playBatCrack('perfect_barrel');
      }
      addPopup('PERFECT-PERFECT 🔥', window.innerWidth / 2, window.innerHeight / 2.5, '#FFD700');
    } else {
      setScreenShake(8);
      if (soundEnabled) {
        SoundJuice.playBatCrack('solid');
      }
      addPopup(`${Math.round(baseExitVelo)} MPH CRACK! 💥`, window.innerWidth / 2, window.innerHeight / 2.5, '#00F2FF');
    }

    setLastPitchResult({
      text: isHomeRun ? '🚀 HOME RUN!' : estimatedDist >= 330 ? 'DEEP FLY OUT' : 'LINE DRIVE',
      subtext: `${Math.round(baseExitVelo)} MPH • ${Math.round(launchAngle)}° LA • ${estimatedDist} FT`,
      exitMph: Math.round(baseExitVelo),
      launchDeg: Math.round(launchAngle),
      distFt: estimatedDist,
      quality: isHomeRun ? 'perfect' : 'good',
    });

    if (isHomeRun && soundEnabled) {
      setTimeout(() => SoundJuice.playHomeRunSiren(), 1200);
    }

    // Record score outcome
    setScoreState(prev => {
      const resultType = isHomeRun ? 'HOMERUN' : estimatedDist >= 330 ? 'DEEP_FLY' : 'LINE_DRIVE';
      const next = recordBaseballSwing(prev, pitch.type, resultType, estimatedDist, baseExitVelo, launchAngle);
      if (next.derbyComplete && onGameComplete) {
        const pWon = next.homeRuns >= 5;
        const delta = computePrqDelta(pWon, next.homeRuns >= 8 ? 'S' : next.homeRuns >= 5 ? 'A' : 'B', 1.0);
        onGameComplete({
          victory: pWon,
          prqDelta: delta,
          homeRuns: next.homeRuns,
          longestFt: next.longestHomeRunFt,
        });
      }
      return next;
    });
  }, [addPopup, gamePhase, onGameComplete, soundEnabled]);

  // Handle Keyboard Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (gamePhase === 'ready_for_pitch') {
          throwNextPitch();
        } else if (gamePhase === 'pitching') {
          executeSwing();
        }
      }

      // Move PCI with WASD or Arrow Keys
      const speed = 0.14;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        pciPos.current.x = Math.max(-1.1, pciPos.current.x - speed);
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        pciPos.current.x = Math.min(1.1, pciPos.current.x + speed);
      }
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        pciPos.current.z = Math.min(3.8, pciPos.current.z + speed);
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        pciPos.current.z = Math.max(1.4, pciPos.current.z - speed);
      }
      setPciDisplay({ ...pciPos.current });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeSwing, gamePhase, throwNextPitch]);

  // Handle Mouse / Touch PCI Aiming on Canvas
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width; // 0 to 1
    const relY = (e.clientY - rect.top) / rect.height; // 0 to 1

    // Map screen box to PCI coordinates
    // Center of screen is roughly x=0, z=2.6
    pciPos.current.x = (relX - 0.5) * 2.6;
    pciPos.current.z = 3.8 - relY * 2.6;
    setPciDisplay({ ...pciPos.current });
  };

  // Main Canvas Render & Simulation Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // 1. Pitch Simulation
      if (gamePhase === 'pitching' && pitchRef.current) {
        const pitch = pitchRef.current;
        // Travel time from 60.5 ft mound to plate: ~0.41 sec for 100mph, ~0.52 sec for 80mph
        const totalDuration = (60.5 / ((pitch.speedMph * 5280) / 3600));
        pitchProgressRef.current = Math.min(1.0, pitchProgressRef.current + dt / totalDuration);

        const t = pitchProgressRef.current;
        // Cubic interpolation for break
        const curY = pitch.startY * (1 - t);
        const curX = pitch.startX * (1 - t) + pitch.plateX * t + (t > 0.6 ? pitch.breakX * Math.pow(t - 0.6, 2) * 5 : 0);
        const curZ = pitch.startZ * (1 - t) + pitch.plateZ * t + (t > 0.5 ? pitch.breakZ * Math.pow(t - 0.5, 2) * 3 : 0);

        currentBallPosRef.current = { x: curX, y: curY, z: curZ };

        // Auto strikeout if pitch crosses plate without swing
        if (t >= 1.0 && !swingTriggeredRef.current) {
          setGamePhase('result_pause');
          if (soundEnabled) SoundJuice.playUmpireCall('strike');
          setLastPitchResult({
            text: 'CALLED STRIKE',
            subtext: `${pitch.type} Caught the Plate (${Math.round(pitch.speedMph)} MPH)`,
            exitMph: 0,
            launchDeg: 0,
            distFt: 0,
            quality: 'miss',
          });
          addPopup('CALLED STRIKE! ⚾', window.innerWidth / 2, window.innerHeight / 2, '#FF0055');

          setScoreState(prev => recordBaseballSwing(prev, pitch.type, 'STRIKE', 0, 0, 0));

          setTimeout(() => {
            setGamePhase('ready_for_pitch');
          }, 1600);
        }
      }

      // 2. Batted Ball Flight Simulation
      if (gamePhase === 'ball_in_play' && battedBallRef.current) {
        const b = battedBallRef.current;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;

        b.vz -= 32.174 * dt; // Gravity
        b.vx *= Math.pow(0.985, dt * 10); // Drag
        b.vy *= Math.pow(0.985, dt * 10);

        b.apexFt = Math.max(b.apexFt, b.z);
        b.trail.push({ x: b.x, y: b.y, z: b.z });
        if (b.trail.length > 28) b.trail.shift();

        // Landing / Outfield Wall Collision
        if (b.z <= 0 || b.y >= 520) {
          b.z = 0;
          setGamePhase('result_pause');

          setTimeout(() => {
            setGamePhase('ready_for_pitch');
          }, 2400);
        }
      }

      // Screen Shake Decay
      setScreenShake(s => Math.max(0, s - dt * 25));

      // 3. Rendering 3D Perspective Stadium
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Dynamic Camera Perspective (Batter POV or Outfield Skycam)
      const isTrackingBall = gamePhase === 'ball_in_play' && battedBallRef.current;
      const bBall = battedBallRef.current;

      // Project 3D stadium coordinate (X, Y, Z in feet) to 2D screen
      const projectStadium = (fx: number, fy: number, fz: number) => {
        if (isTrackingBall && bBall) {
          // Outfield skycam tracking ball
          const camY = bBall.y * 0.6;
          const relY = Math.max(15, (fy - camY) + 50);
          const scale = 550 / relY;
          const screenX = width / 2 + (fx - bBall.x * 0.4) * scale;
          const screenY = height - 100 - (fz * scale) - (fy - camY) * 0.5;
          return { x: screenX, y: screenY };
        } else {
          // Behind Home Plate Batter POV
          const relY = Math.max(4, fy + 8);
          const scale = 520 / relY;
          const screenX = width / 2 + fx * scale * 12;
          const screenY = height / 2 + 160 - (fz - 2.8) * scale * 14 - (fy * 1.5);
          return { x: screenX, y: screenY };
        }
      };

      // Stadium Sky & LED Light Towers
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#020617');
      skyGrad.addColorStop(0.5, '#0B1528');
      skyGrad.addColorStop(1, '#061D12');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Outfield Wall & Bleachers (330ft lines, 410ft center)
      const wallPts = [
        projectStadium(-240, 330, 0),
        projectStadium(-140, 375, 0),
        projectStadium(0, 410, 0),
        projectStadium(140, 375, 0),
        projectStadium(240, 330, 0),
      ];

      // Grass Outfield
      ctx.fillStyle = '#063A1E';
      ctx.beginPath();
      const homeSc = projectStadium(0, 0, 0);
      ctx.moveTo(homeSc.x, homeSc.y);
      wallPts.forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.closePath();
      ctx.fill();

      // Infield Dirt Diamond
      const moundSc = projectStadium(0, 60.5, 0);
      const secondBaseSc = projectStadium(0, 127.3, 0);
      const firstBaseSc = projectStadium(63.6, 63.6, 0);
      const thirdBaseSc = projectStadium(-63.6, 63.6, 0);

      ctx.fillStyle = '#6E4728';
      ctx.beginPath();
      ctx.moveTo(homeSc.x, homeSc.y);
      ctx.lineTo(firstBaseSc.x, firstBaseSc.y);
      ctx.lineTo(secondBaseSc.x, secondBaseSc.y);
      ctx.lineTo(thirdBaseSc.x, thirdBaseSc.y);
      ctx.closePath();
      ctx.fill();

      // Pitcher's Mound
      ctx.fillStyle = '#5A381E';
      ctx.beginPath();
      ctx.arc(moundSc.x, moundSc.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(moundSc.x - 4, moundSc.y - 2, 8, 3); // Rubber

      // Outfield Wall (10ft High Monster Wall)
      ctx.strokeStyle = '#00F2FF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      wallPts.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Distance Markers on Wall
      const leftMarker = projectStadium(-230, 330, 12);
      const centerMarker = projectStadium(0, 410, 12);
      const rightMarker = projectStadium(230, 330, 12);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('330 FT', leftMarker.x - 18, leftMarker.y);
      ctx.fillText('410 FT', centerMarker.x - 18, centerMarker.y);
      ctx.fillText('330 FT', rightMarker.x - 18, rightMarker.y);

      // 4. Draw Pitching Animation
      if (gamePhase === 'pitching' || gamePhase === 'ready_for_pitch') {
        // Pitcher Model on Mound
        ctx.fillStyle = '#FF0055';
        ctx.beginPath();
        ctx.arc(moundSc.x, moundSc.y - 20, 8, 0, Math.PI * 2); // Head
        ctx.fill();
        ctx.fillRect(moundSc.x - 6, moundSc.y - 12, 12, 16); // Torso

        // Incoming Ball
        if (gamePhase === 'pitching') {
          const ball = currentBallPosRef.current;
          const ballSc = projectStadium(ball.x, ball.y, ball.z);
          const shadowSc = projectStadium(ball.x, ball.y, 0);

          // Ball Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.ellipse(shadowSc.x, shadowSc.y, 10, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Ball Seams and Glow
          const ballRadius = Math.max(4, 18 * (1 - ball.y / 65));
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = '#00F2FF';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(ballSc.x, ballSc.y, ballRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#FF0000';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // 5. Draw Batted Ball Trail and Flight
      if (bBall && gamePhase === 'ball_in_play') {
        // Draw Neon Flight Trail
        ctx.strokeStyle = bBall.isHomeRun ? '#FFD700' : '#00F2FF';
        ctx.lineWidth = 4;
        ctx.beginPath();
        bBall.trail.forEach((pt, idx) => {
          const sc = projectStadium(pt.x, pt.y, pt.z);
          if (idx === 0) ctx.moveTo(sc.x, sc.y);
          else ctx.lineTo(sc.x, sc.y);
        });
        ctx.stroke();

        const curSc = projectStadium(bBall.x, bBall.y, bBall.z);
        const shadowSc = projectStadium(bBall.x, bBall.y, 0);

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(shadowSc.x, shadowSc.y, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ball Projectile
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = bBall.isHomeRun ? '#FFD700' : '#00F2FF';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(curSc.x, curSc.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 6. Draw Strike Zone & PCI Indicator (Batter POV)
      if (!isTrackingBall) {
        // Strike Zone Box (Width ~1.4ft, Height ~2.0ft)
        const szTL = projectStadium(-0.7, 1.4, 3.4);
        const szBR = projectStadium(0.7, 1.4, 1.6);
        const szW = szBR.x - szTL.x;
        const szH = szBR.y - szTL.y;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(szTL.x, szTL.y, szW, szH);

        // Inner 9-grid hash marks
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(szTL.x + szW / 3, szTL.y);
        ctx.lineTo(szTL.x + szW / 3, szBR.y);
        ctx.moveTo(szTL.x + (szW * 2) / 3, szTL.y);
        ctx.lineTo(szTL.x + (szW * 2) / 3, szBR.y);
        ctx.moveTo(szTL.x, szTL.y + szH / 3);
        ctx.lineTo(szBR.x, szTL.y + szH / 3);
        ctx.moveTo(szTL.x, szTL.y + (szH * 2) / 3);
        ctx.lineTo(szBR.x, szTL.y + (szH * 2) / 3);
        ctx.stroke();

        // PCI Barrel Reticle (Glowing Gold Crosshair)
        const pciSc = projectStadium(pciPos.current.x, 1.4, pciPos.current.z);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(pciSc.x, pciSc.y, 22, 14, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Center sweet spot dot
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(pciSc.x, pciSc.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [addPopup, gamePhase, screenShake, soundEnabled]);

  return (
    <div className="relative w-full max-w-7xl mx-auto flex flex-col items-center bg-[#02040A] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Top Scoreboard HUD */}
      <div className="w-full flex flex-wrap items-center justify-between p-4 sm:p-6 bg-black/60 backdrop-blur-xl border-b border-white/10 z-20 gap-4">
        {/* Left: Mode Title */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Back to Mode Selection"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 font-bold uppercase">
                THE SHOW DERBY
              </span>
              <h2 className="font-orbitron text-lg font-black tracking-wider text-white uppercase">
                BASEBALL HOME RUN DERBY
              </h2>
            </div>
            <p className="text-[11px] font-mono text-zinc-400">
              Plate Coverage Indicator • Perfect-Perfect Exit Velocity
            </p>
          </div>
        </div>

        {/* Center: Live Derby Stats */}
        <div className="flex items-center gap-6 bg-black/80 px-6 py-2.5 rounded-2xl border border-white/10 shadow-inner">
          <div className="text-center">
            <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase">HOME RUNS</div>
            <div className="font-orbitron text-2xl font-black text-[#FFD700] flex items-center justify-center gap-1">
              <Trophy className="w-5 h-5 text-yellow-400" /> {scoreState.homeRuns}
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          <div className="text-center">
            <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase">LONGEST BLAST</div>
            <div className="font-orbitron text-lg font-black text-white">
              {scoreState.longestHomeRunFt > 0 ? `${scoreState.longestHomeRunFt} FT` : '--'}
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          <div className="text-center">
            <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase">PITCHES LEFT</div>
            <div className="font-orbitron text-lg font-black text-[#00F2FF]">
              {scoreState.pitchesRemaining} / {scoreState.totalPitches}
            </div>
          </div>
        </div>

        {/* Right: Sound & Multiplier */}
        <div className="flex items-center gap-3">
          {scoreState.multiplier > 1.0 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 font-orbitron text-xs font-black">
              <Flame className="w-4 h-4 fill-current" /> {scoreState.multiplier}x COMBO
            </div>
          )}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-yellow-400" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className="relative w-full aspect-[16/9] max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          onPointerMove={handlePointerMove}
          className="w-full h-full object-contain cursor-crosshair touch-none"
        />

        {/* Floating Text Popups */}
        <AnimatePresence>
          {popups.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -70, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.3 }}
              style={{ left: p.x, top: p.y, color: p.color }}
              className="absolute pointer-events-none font-orbitron text-2xl sm:text-3xl font-black drop-shadow-[0_0_15px_rgba(255,215,0,0.9)] -translate-x-1/2 -translate-y-1/2 z-30"
            >
              {p.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Match Notification Banner */}
        {matchBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-black/80 border border-yellow-400/40 text-yellow-400 font-orbitron text-xs sm:text-sm font-bold uppercase tracking-widest backdrop-blur-md z-20 shadow-[0_0_20px_rgba(255,215,0,0.2)]"
          >
            {matchBanner}
          </motion.div>
        )}

        {/* Statcast Launch Monitor Overlay */}
        {lastPitchResult && (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute bottom-6 left-6 p-4 rounded-2xl bg-black/85 border border-white/15 backdrop-blur-lg z-20 flex flex-col gap-2 min-w-[220px]"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> STATCAST TRACKER
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                lastPitchResult.quality === 'perfect' ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40' : 'bg-white/10 text-zinc-300'
              }`}>
                {lastPitchResult.text}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div>
                <div className="text-[9px] font-mono text-zinc-500 uppercase">EXIT VELO</div>
                <div className="font-orbitron text-sm font-black text-[#00F2FF]">
                  {lastPitchResult.exitMph > 0 ? `${lastPitchResult.exitMph} MPH` : '--'}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-zinc-500 uppercase">LAUNCH</div>
                <div className="font-orbitron text-sm font-black text-yellow-400">
                  {lastPitchResult.launchDeg > 0 ? `${lastPitchResult.launchDeg}°` : '--'}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-zinc-500 uppercase">EST DIST</div>
                <div className="font-orbitron text-sm font-black text-white">
                  {lastPitchResult.distFt > 0 ? `${lastPitchResult.distFt} FT` : '--'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Virtual Controls Bar */}
      <div className="w-full p-4 sm:p-6 bg-zinc-950/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 z-20">
        {/* Left: PCI Information */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs font-mono">
            <Target className="w-4 h-4 text-yellow-400" />
            <span>AIM PCI: MOUSE OR WASD (X: {pciDisplay.x.toFixed(1)}, Z: {pciDisplay.z.toFixed(1)})</span>
          </div>
        </div>

        {/* Right: Primary Swing / Next Pitch Actions */}
        <div className="flex items-center gap-2">
          {gamePhase === 'ready_for_pitch' ? (
            <button
              onClick={throwNextPitch}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-600 text-black font-orbitron text-xs font-black uppercase shadow-[0_0_20px_rgba(255,215,0,0.4)] min-h-[44px] flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <Zap className="w-4 h-4 fill-current" /> NEXT PITCH (SPACE)
            </button>
          ) : (
            <button
              onClick={executeSwing}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-orbitron text-xs font-black uppercase shadow-[0_0_20px_rgba(255,0,85,0.4)] min-h-[44px] flex items-center gap-2 hover:scale-105 transition-transform active:scale-95"
            >
              <Flame className="w-4 h-4 fill-current" /> SWING BAT! (SPACE)
            </button>
          )}

          <button
            onClick={() => {
              setScoreState(createInitialBaseballScore(10));
              setGamePhase('ready_for_pitch');
              setLastPitchResult(null);
            }}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Restart Derby"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
