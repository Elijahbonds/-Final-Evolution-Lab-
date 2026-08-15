import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, VolumeX, 
  Zap, ArrowLeft, Trophy, RotateCcw,
  Sparkles, Flame, CheckCircle, ArrowUp, ArrowDown, ArrowLeft as ArrL, ArrowRight as ArrR
} from 'lucide-react';
import { 
  GymnasticsScoreState, 
  createInitialGymnasticsScore, 
  calculateGymnasticsScore, 
  computePrqDelta, 
  SoundJuice 
} from '../../lib/judgeScoring';

type VaultPhase = 'ready' | 'runway_sprint' | 'springboard' | 'table_block' | 'midair_flips' | 'landing_window' | 'result_verdict';

interface VaultRoutine {
  id: string;
  name: string;
  dScore: number;
  description: string;
  comboSequence: Array<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>;
  rotationFlips: number;
  rotationTwists: number;
}

const VAULT_ROUTINES: VaultRoutine[] = [
  {
    id: 'yurchenko_dbl_pike',
    name: 'YURCHENKO DOUBLE PIKE',
    dScore: 6.0,
    description: 'Round-off back handspring entry with two full backward piked somersaults.',
    comboSequence: ['UP', 'RIGHT', 'DOWN', 'UP'],
    rotationFlips: 2.0,
    rotationTwists: 0.5,
  },
  {
    id: 'produnova',
    name: 'PRODUNOVA (VAULT OF DEATH)',
    dScore: 6.4,
    description: 'Front handspring entry into two and a half forward somersaults in tuck position.',
    comboSequence: ['UP', 'UP', 'RIGHT', 'DOWN'],
    rotationFlips: 2.5,
    rotationTwists: 0.0,
  },
  {
    id: 'amanar',
    name: 'AMANAR (YURCHENKO 2.5 TWIST)',
    dScore: 5.8,
    description: 'Round-off back handspring onto the table into a layout with 2.5 twists.',
    comboSequence: ['LEFT', 'UP', 'RIGHT', 'RIGHT'],
    rotationFlips: 1.0,
    rotationTwists: 2.5,
  },
  {
    id: 'tsukahara',
    name: 'TSUKAHARA DOUBLE PIKE',
    dScore: 5.4,
    description: 'Half twist onto the table into two backward piked somersaults.',
    comboSequence: ['RIGHT', 'DOWN', 'LEFT', 'UP'],
    rotationFlips: 2.0,
    rotationTwists: 0.5,
  }
];

interface FeedbackPopup {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface GymnasticsModeProps {
  onBack?: () => void;
  onGameComplete?: (result: { victory: boolean; prqDelta: number; totalScore: number; medal: string }) => void;
}

export const GymnasticsMode: React.FC<GymnasticsModeProps> = ({ onBack, onGameComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Selected Vault & State
  const [selectedVault, setSelectedVault] = useState<VaultRoutine>(VAULT_ROUTINES[0]);
  const [phase, setPhase] = useState<VaultPhase>('ready');
  const [scoreState, setScoreState] = useState<GymnasticsScoreState>(createInitialGymnasticsScore());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [bannerText, setBannerText] = useState<string>('SELECT VAULT & SPRINT DOWN RUNWAY');
  const [screenShake, setScreenShake] = useState<number>(0);
  const [popups, setPopups] = useState<FeedbackPopup[]>([]);

  // Real-time Execution Dynamics
  const [sprintSpeed, setSprintSpeed] = useState<number>(0); // 0 to 100%
  const sprintSpeedRef = useRef<number>(0);
  const lastSprintTapRef = useRef<number>(0);

  // Kinematic Gymnast Position (Runway X = 0 to 25m, Springboard at 25m, Table at 26.2m, Mat at 28-36m)
  const gymnastXRef = useRef<number>(0); // meters
  const gymnastYRef = useRef<number>(0); // height (meters)
  const gymnastRotRef = useRef<number>(0); // rotation in radians
  const gymnastPoseRef = useRef<'run' | 'hurdle' | 'block' | 'tuck' | 'pike' | 'layout' | 'land'>('run');

  // Vault Execution Tracking
  const springTimingRef = useRef<'PERFECT' | 'GOOD' | 'EARLY' | 'LATE' | 'MISS'>('GOOD');
  const tablePushRef = useRef<'PERFECT' | 'GOOD' | 'WEAK' | 'MISS'>('GOOD');
  const [currentComboIndex, setCurrentComboIndex] = useState<number>(0);
  const comboHitsRef = useRef<number>(0);
  const landingQualityRef = useRef<'STUCK' | 'SMALL_HOP' | 'LARGE_STEP' | 'FALL'>('STUCK');

  // Landing reticle ring scale (1.8 down to 0.2)
  const landingRingRef = useRef<number>(1.5);

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
    }, 1400);
  }, []);

  // Handle Sprint Tap (Mash A/D, Left/Right, or Tap Button)
  const handleSprintTap = useCallback(() => {
    if (phase !== 'runway_sprint') return;

    const now = performance.now();
    const interval = now - lastSprintTapRef.current;
    lastSprintTapRef.current = now;

    // Faster rhythm taps increase sprint power
    const boost = interval < 160 ? 12 : interval < 250 ? 8 : 4;
    sprintSpeedRef.current = Math.min(100, sprintSpeedRef.current + boost);
    setSprintSpeed(sprintSpeedRef.current);

    if (soundEnabled && Math.random() > 0.4) {
      SoundJuice.playSprintStep();
    }
  }, [phase, soundEnabled]);

  // Start Vault Run
  const startVaultAttempt = useCallback(() => {
    gymnastXRef.current = 0;
    gymnastYRef.current = 0;
    gymnastRotRef.current = 0;
    gymnastPoseRef.current = 'run';
    sprintSpeedRef.current = 15;
    setSprintSpeed(15);
    lastSprintTapRef.current = performance.now();
    comboHitsRef.current = 0;
    setCurrentComboIndex(0);
    setPhase('runway_sprint');
    setBannerText('MASH SPRINT (A/D or LEFT/RIGHT) TO BUILD MAXIMUM SPEED!');
  }, []);

  // Springboard Action
  const triggerSpringboardAction = useCallback(() => {
    if (phase !== 'springboard') return;

    const x = gymnastXRef.current;
    // Springboard is located at X = 25.0 meters. Sweet spot is 24.8 to 25.2
    const distFromSweetSpot = Math.abs(x - 25.0);

    let quality: 'PERFECT' | 'GOOD' | 'EARLY' | 'LATE' | 'MISS';
    if (distFromSweetSpot <= 0.18) quality = 'PERFECT';
    else if (distFromSweetSpot <= 0.4) quality = 'GOOD';
    else if (x < 24.6) quality = 'EARLY';
    else quality = 'LATE';

    springTimingRef.current = quality;

    if (quality === 'PERFECT') {
      setScreenShake(10);
      if (soundEnabled) SoundJuice.playSpringboardBoing();
      addPopup('PERFECT SPRINGBOARD 🚀', window.innerWidth / 2, window.innerHeight / 2.5, '#FFD700');
    } else {
      setScreenShake(4);
      if (soundEnabled) SoundJuice.playSpringboardBoing();
      addPopup(`${quality} HURDLE!`, window.innerWidth / 2, window.innerHeight / 2.5, '#00F2FF');
    }

    // Transition to Table Block
    setPhase('table_block');
    setBannerText('TABLE BLOCK! PRESS SPACE ON CONTACT FOR VERTICAL LIFT!');
  }, [addPopup, phase, soundEnabled]);

  // Table Push Action
  const triggerTablePushAction = useCallback(() => {
    if (phase !== 'table_block') return;

    const x = gymnastXRef.current;
    // Table is at 26.2 meters
    const dist = Math.abs(x - 26.2);

    let quality: 'PERFECT' | 'GOOD' | 'WEAK' | 'MISS';
    if (dist <= 0.25) quality = 'PERFECT';
    else if (dist <= 0.55) quality = 'GOOD';
    else quality = 'WEAK';

    tablePushRef.current = quality;

    if (quality === 'PERFECT') {
      setScreenShake(12);
      if (soundEnabled) SoundJuice.playTablePush();
      addPopup('EXPLOSIVE BLOCK! 🔥', window.innerWidth / 2, window.innerHeight / 2.5, '#FF0055');
    } else {
      setScreenShake(6);
      if (soundEnabled) SoundJuice.playTablePush();
      addPopup('TABLE PUSH ✅', window.innerWidth / 2, window.innerHeight / 2.5, '#00F2FF');
    }

    // Launch into Mid-Air Flips
    setPhase('midair_flips');
    setBannerText('MID-AIR ROTATIONS! HIT THE ARROW COMBO KEYS!');
  }, [addPopup, phase, soundEnabled]);

  // Mid-air Rhythm Combo Input
  const handleComboInput = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (phase !== 'midair_flips') return;

    const expected = selectedVault.comboSequence[currentComboIndex];
    if (direction === expected) {
      comboHitsRef.current += 1;
      if (soundEnabled) SoundJuice.playTwistWhoosh();
      addPopup(`ROTATION ${currentComboIndex + 1} FLIGHT! ✨`, window.innerWidth / 2, window.innerHeight / 3, '#FFD700');
    } else {
      addPopup('FORM DEDUCTION ⚠️', window.innerWidth / 2, window.innerHeight / 3, '#FF0055');
    }

    const nextIdx = currentComboIndex + 1;
    setCurrentComboIndex(nextIdx);

    if (nextIdx >= selectedVault.comboSequence.length) {
      // Finished combo -> landing approach
      setPhase('landing_window');
      setBannerText('STICK THE LANDING! PRESS SPACE WHEN CIRCLE TURNS GREEN!');
    }
  }, [addPopup, currentComboIndex, phase, selectedVault.comboSequence, soundEnabled]);

  // Landing Stick Action
  const triggerLandingStickAction = useCallback(() => {
    if (phase !== 'landing_window') return;

    const ring = landingRingRef.current;
    // Perfect stick is ring near 1.0 (0.90 to 1.10)
    const diff = Math.abs(ring - 1.0);

    let quality: 'STUCK' | 'SMALL_HOP' | 'LARGE_STEP' | 'FALL';
    if (diff <= 0.12) quality = 'STUCK';
    else if (diff <= 0.28) quality = 'SMALL_HOP';
    else if (diff <= 0.45) quality = 'LARGE_STEP';
    else quality = 'FALL';

    landingQualityRef.current = quality;
    gymnastPoseRef.current = 'land';
    gymnastYRef.current = 0;
    gymnastRotRef.current = 0;

    if (quality === 'STUCK') {
      setScreenShake(18);
      if (soundEnabled) {
        SoundJuice.playMatLanding('stuck');
        setTimeout(() => SoundJuice.playOlympicFanfare(), 400);
      }
      addPopup('🎯 STUCK THE LANDING! 0 DEDUCTIONS!', window.innerWidth / 2, window.innerHeight / 2.2, '#00F2FF');
    } else if (quality === 'SMALL_HOP') {
      setScreenShake(6);
      if (soundEnabled) SoundJuice.playMatLanding('hop');
      addPopup('SMALL HOP (-0.100)', window.innerWidth / 2, window.innerHeight / 2.2, '#FFD700');
    } else {
      setScreenShake(10);
      if (soundEnabled) SoundJuice.playMatLanding('fall');
      addPopup(quality === 'LARGE_STEP' ? 'LARGE STEP (-0.300)' : 'FALL ON MAT (-1.000)', window.innerWidth / 2, window.innerHeight / 2.2, '#FF0055');
    }

    // Calculate Olympic Score
    const calculated = calculateGymnasticsScore(
      scoreState,
      selectedVault.name,
      selectedVault.dScore,
      sprintSpeedRef.current,
      springTimingRef.current,
      tablePushRef.current,
      comboHitsRef.current,
      selectedVault.comboSequence.length,
      quality
    );

    setScoreState(calculated);
    setPhase('result_verdict');
    setBannerText(`FINAL SCORE: ${calculated.totalScore.toFixed(3)} • ${calculated.medal} MEDAL!`);

    if (onGameComplete) {
      const pWon = calculated.totalScore >= 14.8;
      const delta = computePrqDelta(pWon, calculated.totalScore >= 15.6 ? 'S' : calculated.totalScore >= 14.8 ? 'A' : 'B', 1.0);
      onGameComplete({
        victory: pWon,
        prqDelta: delta,
        totalScore: calculated.totalScore,
        medal: calculated.medal,
      });
    }
  }, [addPopup, onGameComplete, phase, scoreState, selectedVault.comboSequence.length, selectedVault.dScore, selectedVault.name, soundEnabled]);

  // Keyboard Event Dispatcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Sprinting
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        if (phase === 'runway_sprint') {
          handleSprintTap();
        }
      }

      // 2. Action Key (Space / Enter)
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (phase === 'ready') {
          startVaultAttempt();
        } else if (phase === 'springboard') {
          triggerSpringboardAction();
        } else if (phase === 'table_block') {
          triggerTablePushAction();
        } else if (phase === 'landing_window') {
          triggerLandingStickAction();
        }
      }

      // 3. Mid-Air Combos
      if (phase === 'midair_flips') {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') handleComboInput('UP');
        else if (e.code === 'KeyS' || e.code === 'ArrowDown') handleComboInput('DOWN');
        else if (e.code === 'KeyA' || e.code === 'ArrowLeft') handleComboInput('LEFT');
        else if (e.code === 'KeyD' || e.code === 'ArrowRight') handleComboInput('RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleComboInput, 
    handleSprintTap, 
    phase, 
    startVaultAttempt, 
    triggerLandingStickAction, 
    triggerSpringboardAction, 
    triggerTablePushAction
  ]);

  // Main Canvas Render & Kinematic Loop
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

      // Kinematic State Updates
      if (phase === 'runway_sprint') {
        // Natural sprint decay
        sprintSpeedRef.current = Math.max(10, sprintSpeedRef.current - dt * 14);
        setSprintSpeed(sprintSpeedRef.current);

        // Speed in m/s (8 m/s max)
        const velo = (sprintSpeedRef.current / 100) * 8.5;
        gymnastXRef.current += velo * dt;
        gymnastPoseRef.current = 'run';

        // Check if reached Springboard Zone (X >= 24.2m)
        if (gymnastXRef.current >= 24.2) {
          setPhase('springboard');
          setBannerText('HURDLE SPRINGBOARD! HIT SPACE AS YOU HIT THE BOARD!');
        }
      } else if (phase === 'springboard') {
        // Continue forward into springboard
        const velo = (sprintSpeedRef.current / 100) * 8.5;
        gymnastXRef.current += velo * dt;
        gymnastYRef.current = Math.min(0.6, (gymnastXRef.current - 24.2) * 0.8);
        gymnastPoseRef.current = 'hurdle';

        // Auto fail if missed timing
        if (gymnastXRef.current >= 25.8) {
          springTimingRef.current = 'MISS';
          setPhase('table_block');
          setBannerText('TABLE BLOCK! PRESS SPACE ON CONTACT!');
        }
      } else if (phase === 'table_block') {
        const velo = (sprintSpeedRef.current / 100) * 7.5;
        gymnastXRef.current += velo * dt;
        gymnastYRef.current = 1.35; // Table height
        gymnastPoseRef.current = 'block';

        if (gymnastXRef.current >= 26.8) {
          tablePushRef.current = 'WEAK';
          setPhase('midair_flips');
          setBannerText('MID-AIR ROTATIONS! HIT THE ARROW COMBO KEYS!');
        }
      } else if (phase === 'midair_flips') {
        // High parabolic trajectory over vault table (Y reaches ~4.5m)
        const veloX = 3.5;
        gymnastXRef.current += veloX * dt;
        
        // Flight time calculation
        const flightProgress = (gymnastXRef.current - 26.8) / 5.0; // 0 to 1
        gymnastYRef.current = 1.35 + Math.sin(flightProgress * Math.PI) * 3.4;
        gymnastRotRef.current += dt * (selectedVault.rotationFlips * Math.PI * 3.0);
        gymnastPoseRef.current = selectedVault.id.includes('pike') ? 'pike' : selectedVault.id.includes('produnova') ? 'tuck' : 'layout';

        if (flightProgress >= 0.85) {
          setPhase('landing_window');
          setBannerText('STICK THE LANDING! PRESS SPACE WHEN CIRCLE TURNS GREEN!');
        }
      } else if (phase === 'landing_window') {
        // Descending toward the mat
        gymnastXRef.current += 2.0 * dt;
        gymnastYRef.current = Math.max(0, gymnastYRef.current - dt * 4.2);
        gymnastRotRef.current += dt * 3.0;
        gymnastPoseRef.current = 'layout';

        // Shrink landing reticle from 1.8 down to 0.4
        landingRingRef.current = Math.max(0.2, landingRingRef.current - dt * 1.1);

        // Auto land if touched mat without press
        if (gymnastYRef.current <= 0.05) {
          triggerLandingStickAction();
        }
      }

      // Decay Screen Shake
      setScreenShake(s => Math.max(0, s - dt * 25));

      // 3. Render 3D Perspective Gymnastics Arena
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Camera Tracking on Gymnast X position
      const camX = gymnastXRef.current;
      const pixelsPerMeter = 36;
      const groundY = height - 160;

      const toScreenX = (mX: number) => {
        return width / 2 + (mX - camX) * pixelsPerMeter;
      };
      const toScreenY = (mY: number) => {
        return groundY - mY * pixelsPerMeter;
      };

      // Arena Background & Stadium Seating
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#040714');
      bgGrad.addColorStop(0.6, '#0B132B');
      bgGrad.addColorStop(1, '#020308');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Arena Stadium Lights
      ctx.fillStyle = 'rgba(0, 242, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(toScreenX(25), 0);
      ctx.lineTo(toScreenX(20), groundY);
      ctx.lineTo(toScreenX(32), groundY);
      ctx.closePath();
      ctx.fill();

      // Floor & Carpet
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, groundY, width, height - groundY);

      // 1. Vault Runway (Red Carpet from X = 0 to 25m)
      const runwayStartX = toScreenX(0);
      const runwayEndX = toScreenX(25);
      ctx.fillStyle = '#991B1B';
      ctx.fillRect(runwayStartX, groundY - 4, runwayEndX - runwayStartX, 8);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(runwayStartX, groundY - 4, runwayEndX - runwayStartX, 8);

      // Distance tick marks every 5 meters
      for (let m = 0; m <= 25; m += 5) {
        const tx = toScreenX(m);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${25 - m}m`, tx - 8, groundY + 22);
      }

      // 2. Springboard (X = 25m)
      const springX = toScreenX(25);
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(springX - 22, groundY);
      ctx.lineTo(springX + 16, groundY - 14);
      ctx.lineTo(springX + 16, groundY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // 3. Vault Table / Tongue (X = 26.2m, Height = 1.35m)
      const tableX = toScreenX(26.2);
      const tableTopY = toScreenY(1.35);
      
      // Metal Base Pillar
      ctx.fillStyle = '#334155';
      ctx.fillRect(tableX - 10, tableTopY + 12, 20, groundY - (tableTopY + 12));
      // Padded Tongue Table Top
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.roundRect(tableX - 28, tableTopY, 56, 16, [8, 8, 4, 4]);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 4. Landing Safety Mat (X = 27.5m to 36m)
      const matStartX = toScreenX(27.5);
      const matEndX = toScreenX(36.0);
      ctx.fillStyle = '#1D4ED8';
      ctx.fillRect(matStartX, groundY - 12, matEndX - matStartX, 16);
      ctx.strokeStyle = '#00F2FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(matStartX, groundY - 12, matEndX - matStartX, 16);

      // Target Stick Zone on Mat (X = 30.5m to 32.5m)
      const stickZoneStartX = toScreenX(30.5);
      const stickZoneEndX = toScreenX(32.5);
      ctx.fillStyle = 'rgba(0, 242, 255, 0.25)';
      ctx.fillRect(stickZoneStartX, groundY - 12, stickZoneEndX - stickZoneStartX, 16);

      // 5. Draw Gymnast Vector Model
      const gx = toScreenX(gymnastXRef.current);
      const gy = toScreenY(gymnastYRef.current);
      const rot = gymnastRotRef.current;
      const gPose = gymnastPoseRef.current;

      ctx.save();
      ctx.translate(gx, gy - 24);
      ctx.rotate(rot);

      // Gymnast Silhouette & Leotard
      ctx.fillStyle = '#00F2FF';
      ctx.shadowColor = '#00F2FF';
      ctx.shadowBlur = 12;

      if (gPose === 'run') {
        // Head
        ctx.beginPath();
        ctx.arc(0, -18, 7, 0, Math.PI * 2);
        ctx.fill();
        // Torso
        ctx.fillRect(-5, -11, 10, 18);
        // Animated Run Legs
        const runCycle = Math.sin(performance.now() * 0.02);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-3, 7);
        ctx.lineTo(-10 + runCycle * 8, 22);
        ctx.moveTo(3, 7);
        ctx.lineTo(10 - runCycle * 8, 22);
        ctx.stroke();
      } else if (gPose === 'pike' || gPose === 'tuck') {
        // Piked / Tucked Ball Form in Mid-Air
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(6, -6, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (gPose === 'land') {
        // Stuck Landing Stance (Arms Extended Y)
        ctx.beginPath();
        ctx.arc(0, -20, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-5, -13, 10, 18);
        // Legs firmly planted
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-4, 5);
        ctx.lineTo(-8, 22);
        ctx.moveTo(4, 5);
        ctx.lineTo(8, 22);
        // Arms in Olympic V-salute
        ctx.moveTo(-5, -10);
        ctx.lineTo(-18, -26);
        ctx.moveTo(5, -10);
        ctx.lineTo(18, -26);
        ctx.stroke();
      } else {
        // Straight Layout Flight
        ctx.beginPath();
        ctx.arc(0, -20, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-5, -13, 10, 22);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, 9);
        ctx.lineTo(0, 26);
        ctx.stroke();
      }
      ctx.restore();

      // 6. Draw Landing Alignment Reticle
      if (phase === 'landing_window') {
        const ring = landingRingRef.current;
        const matTargetX = toScreenX(31.5);
        const matTargetY = groundY - 14;

        // Target Bullseye (Green)
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(matTargetX, matTargetY, 26, 0, Math.PI * 2);
        ctx.stroke();

        // Shrinking Alignment Ring
        const isAligned = Math.abs(ring - 1.0) <= 0.15;
        ctx.strokeStyle = isAligned ? '#10B981' : '#FFD700';
        ctx.lineWidth = 4;
        ctx.shadowColor = isAligned ? '#10B981' : '#FFD700';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(matTargetX, matTargetY, 26 * ring, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [phase, screenShake, selectedVault.id, selectedVault.rotationFlips, triggerLandingStickAction]);

  return (
    <div className="relative w-full max-w-7xl mx-auto flex flex-col items-center bg-[#02040A] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Top Olympic Scoreboard HUD */}
      <div className="w-full flex flex-wrap items-center justify-between p-4 sm:p-6 bg-black/60 backdrop-blur-xl border-b border-white/10 z-20 gap-4">
        {/* Left: Mode & Routine Title */}
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
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 font-bold uppercase">
                OLYMPIC VAULT FINALS
              </span>
              <h2 className="font-orbitron text-lg font-black tracking-wider text-white uppercase">
                GYMNASTICS VAULT RUNWAY
              </h2>
            </div>
            <p className="text-[11px] font-mono text-zinc-400">
              {selectedVault.name} • D-SCORE: {selectedVault.dScore.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Center: Live Judges Score Breakdown */}
        <div className="flex items-center gap-6 bg-black/80 px-6 py-2.5 rounded-2xl border border-white/10 shadow-inner">
          <div className="text-center">
            <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase">D-SCORE</div>
            <div className="font-orbitron text-xl font-black text-cyan-400">
              {scoreState.difficultyScore.toFixed(1)}
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          <div className="text-center">
            <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase">E-SCORE</div>
            <div className="font-orbitron text-xl font-black text-yellow-400">
              {scoreState.executionScore.toFixed(3)}
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          <div className="text-center">
            <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase">TOTAL SCORE</div>
            <div className="font-orbitron text-2xl font-black text-white flex items-center gap-1">
              <Trophy className="w-5 h-5 text-yellow-400" /> {scoreState.totalScore.toFixed(3)}
            </div>
          </div>
        </div>

        {/* Right: Sound & Status */}
        <div className="flex items-center gap-3">
          {scoreState.medal !== 'NONE' && (
            <div className={`flex items-center gap-1 px-3 py-1 rounded-xl font-orbitron text-xs font-black border ${
              scoreState.medal === 'GOLD' ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/40' :
              scoreState.medal === 'SILVER' ? 'bg-slate-300/20 text-slate-200 border-slate-300/40' :
              'bg-amber-700/20 text-amber-500 border-amber-600/40'
            }`}>
              <Sparkles className="w-4 h-4 fill-current" /> {scoreState.medal} MEDAL
            </div>
          )}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
          </button>
        </div>
      </div>

      {/* Main Arena 3D Viewport */}
      <div className="relative w-full aspect-[16/9] max-h-[68vh] bg-black flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-contain cursor-crosshair touch-none"
        />

        {/* Floating Feedback Popups */}
        <AnimatePresence>
          {popups.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -65, scale: 1.25 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              style={{ left: p.x, top: p.y, color: p.color }}
              className="absolute pointer-events-none font-orbitron text-xl sm:text-2xl font-black drop-shadow-[0_0_15px_rgba(0,242,255,0.9)] -translate-x-1/2 -translate-y-1/2 z-30"
            >
              {p.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Top Banner Direction Instruction */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-black/85 border border-cyan-400/40 text-cyan-400 font-orbitron text-xs sm:text-sm font-bold uppercase tracking-widest backdrop-blur-md z-20 shadow-[0_0_20px_rgba(0,242,255,0.25)]"
        >
          {bannerText}
        </motion.div>

        {/* Runway Sprint Velocity Gauge */}
        {phase === 'runway_sprint' && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-20 bg-black/80 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between w-64 text-[10px] font-mono font-bold text-zinc-300">
              <span className="flex items-center gap-1 text-cyan-400"><Flame className="w-3.5 h-3.5 fill-current" /> RUNWAY VELOCITY</span>
              <span className="text-white font-orbitron">{Math.round(sprintSpeed)}%</span>
            </div>
            <div className="w-64 h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                style={{ width: `${sprintSpeed}%` }}
                className={`h-full rounded-full transition-all duration-75 ${
                  sprintSpeed >= 85 ? 'bg-gradient-to-r from-yellow-400 to-red-500 shadow-[0_0_12px_rgba(255,0,85,0.8)]' :
                  sprintSpeed >= 60 ? 'bg-gradient-to-r from-cyan-400 to-emerald-400' :
                  'bg-cyan-500'
                }`}
              />
            </div>
          </div>
        )}

        {/* Mid-Air Acrobatic Rhythm Arrow Prompts */}
        {phase === 'midair_flips' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30 p-4 rounded-3xl bg-black/90 border border-cyan-400/40 backdrop-blur-xl shadow-[0_0_30px_rgba(0,242,255,0.3)]"
          >
            {selectedVault.comboSequence.map((dir, idx) => {
              const isCurrent = idx === currentComboIndex;
              const isDone = idx < currentComboIndex;

              return (
                <div
                  key={idx}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all ${
                    isDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                    isCurrent ? 'bg-cyan-500 text-black scale-110 shadow-[0_0_15px_rgba(0,242,255,0.8)] animate-pulse' :
                    'bg-white/5 text-zinc-600 border border-white/10'
                  }`}
                >
                  {dir === 'UP' && <ArrowUp className="w-6 h-6" />}
                  {dir === 'DOWN' && <ArrowDown className="w-6 h-6" />}
                  {dir === 'LEFT' && <ArrL className="w-6 h-6" />}
                  {dir === 'RIGHT' && <ArrR className="w-6 h-6" />}
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Result Breakdown Card Overlay */}
        {phase === 'result_verdict' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute p-6 rounded-3xl bg-black/90 border border-cyan-400/40 backdrop-blur-xl z-30 flex flex-col items-center gap-4 max-w-md shadow-2xl"
          >
            <div className="text-center">
              <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">
                OFFICIAL JUDGES SCORECARD
              </div>
              <h3 className="font-orbitron text-2xl font-black text-white mt-1">
                {scoreState.vaultName}
              </h3>
            </div>

            <div className="w-full grid grid-cols-3 gap-2 bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
              <div>
                <div className="text-[10px] font-mono text-zinc-400">D-SCORE</div>
                <div className="font-orbitron text-lg font-black text-cyan-400">
                  {scoreState.difficultyScore.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-zinc-400">E-SCORE</div>
                <div className="font-orbitron text-lg font-black text-yellow-400">
                  {scoreState.executionScore.toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-zinc-400">LANDING</div>
                <div className="font-orbitron text-xs font-black text-emerald-400 mt-1">
                  {scoreState.landingQuality}
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase">FINAL SCORE</div>
              <div className="font-orbitron text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                {scoreState.totalScore.toFixed(3)}
              </div>
            </div>

            <button
              onClick={startVaultAttempt}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-orbitron text-xs font-black uppercase shadow-[0_0_20px_rgba(0,242,255,0.4)] hover:scale-105 transition-transform"
            >
              NEXT VAULT ATTEMPT
            </button>
          </motion.div>
        )}
      </div>

      {/* Bottom Controls & Routine Selector */}
      <div className="w-full p-4 sm:p-6 bg-zinc-950/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 z-20">
        {/* Left: Select Vault Routine */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {VAULT_ROUTINES.map(routine => {
            const isSel = selectedVault.id === routine.id;
            return (
              <button
                key={routine.id}
                disabled={phase !== 'ready' && phase !== 'result_verdict'}
                onClick={() => setSelectedVault(routine)}
                className={`px-3.5 py-2 rounded-xl text-xs font-orbitron font-bold transition-all border whitespace-nowrap min-h-[44px] ${
                  isSel ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.2)]' :
                  'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                }`}
              >
                {routine.name.split(' ')[0]} (D: {routine.dScore.toFixed(1)})
              </button>
            );
          })}
        </div>

        {/* Right: Dynamic Phase Actions */}
        <div className="flex items-center gap-2">
          {phase === 'ready' || phase === 'result_verdict' ? (
            <button
              onClick={startVaultAttempt}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-orbitron text-xs font-black uppercase shadow-[0_0_20px_rgba(0,242,255,0.4)] min-h-[44px] flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <Zap className="w-4 h-4 fill-current" /> START VAULT RUN (SPACE)
            </button>
          ) : phase === 'runway_sprint' ? (
            <button
              onClick={handleSprintTap}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-orbitron text-xs font-black uppercase shadow-[0_0_20px_rgba(255,0,85,0.4)] min-h-[44px] flex items-center gap-2 active:scale-95 animate-pulse"
            >
              <Flame className="w-4 h-4 fill-current" /> TAP TO SPRINT!
            </button>
          ) : phase === 'springboard' ? (
            <button
              onClick={triggerSpringboardAction}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-orbitron text-xs font-black uppercase shadow-[0_0_20px_rgba(255,215,0,0.4)] min-h-[44px] flex items-center gap-2 hover:scale-105"
            >
              <Zap className="w-4 h-4 fill-current" /> HURDLE SPRINGBOARD! (SPACE)
            </button>
          ) : phase === 'table_block' ? (
            <button
              onClick={triggerTablePushAction}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-orbitron text-xs font-black uppercase shadow-[0_0_20px_rgba(168,85,247,0.4)] min-h-[44px] flex items-center gap-2 hover:scale-105"
            >
              <Sparkles className="w-4 h-4 fill-current" /> PUSH TABLE! (SPACE)
            </button>
          ) : phase === 'midair_flips' ? (
            <div className="flex items-center gap-1.5">
              <button onClick={() => handleComboInput('UP')} className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 min-h-[44px] min-w-[44px] flex items-center justify-center font-bold"><ArrowUp className="w-5 h-5" /></button>
              <button onClick={() => handleComboInput('LEFT')} className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 min-h-[44px] min-w-[44px] flex items-center justify-center font-bold"><ArrL className="w-5 h-5" /></button>
              <button onClick={() => handleComboInput('DOWN')} className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 min-h-[44px] min-w-[44px] flex items-center justify-center font-bold"><ArrowDown className="w-5 h-5" /></button>
              <button onClick={() => handleComboInput('RIGHT')} className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 min-h-[44px] min-w-[44px] flex items-center justify-center font-bold"><ArrR className="w-5 h-5" /></button>
            </div>
          ) : (
            <button
              onClick={triggerLandingStickAction}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-orbitron text-xs font-black uppercase shadow-[0_0_20px_rgba(16,185,129,0.4)] min-h-[44px] flex items-center gap-2 hover:scale-105 active:scale-95"
            >
              <CheckCircle className="w-4 h-4 fill-current" /> STICK LANDING! (SPACE)
            </button>
          )}

          <button
            onClick={() => {
              setScoreState(createInitialGymnasticsScore());
              setPhase('ready');
              gymnastXRef.current = 0;
              gymnastYRef.current = 0;
            }}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Restart Attempt"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
