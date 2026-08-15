import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, VolumeX, 
  Zap, ArrowLeft, Dribbble, RotateCcw,
  Sparkles, Target
} from 'lucide-react';
import { 
  SoccerScoreState, 
  createInitialSoccerScore, 
  advanceSoccerMatch, 
  recordSoccerGoal, 
  computePrqDelta, 
  SoundJuice 
} from '../../lib/judgeScoring';

interface SoccerPlayerEntity {
  id: string;
  name: string;
  number: number;
  role: 'ST' | 'LW' | 'RW' | 'CB' | 'GK';
  team: 'player' | 'opponent';
  x: number; // -120 to 120 (sideline to sideline)
  y: number; // -180 to 180 (goal line to goal line)
  vx: number;
  vy: number;
  speed: number;
  hasBall: boolean;
  slideTimer: number;
  color: string;
}

interface SoccerBall {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  inAir: boolean;
  carrierId: string | null;
  speedMph: number;
  trail: Array<{ x: number; y: number; z: number; color: string }>;
}

interface GoalPopup {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface SoccerModeProps {
  onBack?: () => void;
  onGameComplete?: (result: { victory: boolean; prqDelta: number; score: string }) => void;
}

export const SoccerMode: React.FC<SoccerModeProps> = ({ onBack, onGameComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Match State
  const [scoreState, setScoreState] = useState<SoccerScoreState>(createInitialSoccerScore());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [matchBanner, setMatchBanner] = useState<string | null>('MATCH KICKOFF — TAKE CONTROL OF THE BALL');
  const [screenShake, setScreenShake] = useState<number>(0);
  const [popups, setPopups] = useState<GoalPopup[]>([]);
  const [stamina, setStamina] = useState<number>(100);
  const [shotCharge, setShotCharge] = useState<number>(0);
  const [isChargingShot, setIsChargingShot] = useState<boolean>(false);
  const [hyperStrikeReady, setHyperStrikeReady] = useState<boolean>(true);

  // Simulation Refs
  const playersRef = useRef<SoccerPlayerEntity[]>([]);
  const ballRef = useRef<SoccerBall>({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0,
    inAir: false,
    carrierId: 'p_st',
    speedMph: 0,
    trail: [],
  });

  const keysPressed = useRef<Record<string, boolean>>({});
  const shotChargeRef = useRef<number>(0);
  const isChargingRef = useRef<boolean>(false);
  const goalResetTimerRef = useRef<number>(0);

  // Add floating banner / text popup
  const addPopup = useCallback((text: string, x: number, y: number, color = '#00F2FF') => {
    const newPopup: GoalPopup = {
      id: Date.now() + Math.random(),
      text,
      x,
      y,
      color,
    };
    setPopups(prev => [...prev.slice(-4), newPopup]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== newPopup.id));
    }, 1400);
  }, []);

  // Initialize Team Rosters & Pitch Formations
  const initMatch = useCallback(() => {
    const roster: SoccerPlayerEntity[] = [
      // PLAYER TEAM (Neon Cyan / Gold) - Defending Bottom Goal (y = -180), Attacking Top Goal (y = 180)
      { id: 'p_st', name: 'Striker', number: 9, role: 'ST', team: 'player', x: 0, y: 0, vx: 0, vy: 0, speed: 65, hasBall: true, slideTimer: 0, color: '#00F2FF' },
      { id: 'p_lw', name: 'Left Wing', number: 11, role: 'LW', team: 'player', x: -60, y: 40, vx: 0, vy: 0, speed: 62, hasBall: false, slideTimer: 0, color: '#00D0FF' },
      { id: 'p_rw', name: 'Right Wing', number: 7, role: 'RW', team: 'player', x: 60, y: 40, vx: 0, vy: 0, speed: 62, hasBall: false, slideTimer: 0, color: '#00D0FF' },
      { id: 'p_cb', name: 'Defender', number: 4, role: 'CB', team: 'player', x: 0, y: -80, vx: 0, vy: 0, speed: 55, hasBall: false, slideTimer: 0, color: '#00D0FF' },
      { id: 'p_gk', name: 'Keeper', number: 1, role: 'GK', team: 'player', x: 0, y: -165, vx: 0, vy: 0, speed: 45, hasBall: false, slideTimer: 0, color: '#FFD700' },

      // OPPONENT TEAM (Crimson Red / Purple) - Defending Top Goal (y = 180), Attacking Bottom Goal (y = -180)
      { id: 'o_st', name: 'Opp Striker', number: 10, role: 'ST', team: 'opponent', x: 0, y: 30, vx: 0, vy: 0, speed: 60, hasBall: false, slideTimer: 0, color: '#FF0055' },
      { id: 'o_lw', name: 'Opp LW', number: 17, role: 'LW', team: 'opponent', x: -50, y: -20, vx: 0, vy: 0, speed: 58, hasBall: false, slideTimer: 0, color: '#FF3366' },
      { id: 'o_rw', name: 'Opp RW', number: 19, role: 'RW', team: 'opponent', x: 50, y: -20, vx: 0, vy: 0, speed: 58, hasBall: false, slideTimer: 0, color: '#FF3366' },
      { id: 'o_cb', name: 'Opp CB', number: 5, role: 'CB', team: 'opponent', x: 0, y: 110, vx: 0, vy: 0, speed: 56, hasBall: false, slideTimer: 0, color: '#FF0055' },
      { id: 'o_gk', name: 'Opp GK', number: 1, role: 'GK', team: 'opponent', x: 0, y: 165, vx: 0, vy: 0, speed: 48, hasBall: false, slideTimer: 0, color: '#9333EA' },
    ];

    playersRef.current = roster;
    ballRef.current = {
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: 0,
      inAir: false,
      carrierId: 'p_st',
      speedMph: 0,
      trail: [],
    };
    shotChargeRef.current = 0;
    isChargingRef.current = false;
    goalResetTimerRef.current = 0;
  }, []);

  // Kick / Pass Ball action
  const performKick = useCallback((type: 'pass' | 'chip' | 'shot') => {
    const controlledPlayer = playersRef.current.find(p => p.id === 'p_st');
    if (!controlledPlayer || !controlledPlayer.hasBall) return;

    controlledPlayer.hasBall = false;
    const b = ballRef.current;
    b.carrierId = null;
    b.x = controlledPlayer.x;
    b.y = controlledPlayer.y + 6;

    if (type === 'pass') {
      // Find open teammate (LW or RW)
      const target = playersRef.current.find(p => p.team === 'player' && p.id !== 'p_st' && p.role !== 'GK');
      if (target) {
        const dx = target.x - b.x;
        const dy = target.y - b.y;
        const dist = Math.hypot(dx, dy);
        b.vx = (dx / dist) * 85;
        b.vy = (dy / dist) * 85;
        b.vz = 0;
        b.inAir = false;
        b.speedMph = 45;
        if (soundEnabled) SoundJuice.playSoccerKick('ground');
        addPopup('GROUND PASS ⚡', window.innerWidth / 2, window.innerHeight / 2, '#00F2FF');
      }
    } else if (type === 'chip') {
      // Chip / Lob over defenders
      b.vx = (controlledPlayer.vx || 0) * 1.2;
      b.vy = 75;
      b.vz = 60;
      b.inAir = true;
      b.speedMph = 40;
      if (soundEnabled) SoundJuice.playSoccerKick('chip');
      addPopup('CHIP LOB ☄️', window.innerWidth / 2, window.innerHeight / 2, '#FFD700');
    } else if (type === 'shot') {
      // Powerful striking arc towards opponent goal (y = 180)
      const charge = Math.max(0.2, shotChargeRef.current);
      const isHyper = charge >= 0.95 && hyperStrikeReady;
      
      const targetGoalX = (Math.random() - 0.5) * 50;
      const dx = targetGoalX - b.x;
      const dy = 180 - b.y;
      const dist = Math.hypot(dx, dy);

      const shotSpeed = isHyper ? 140 : 80 + charge * 45;
      b.vx = (dx / dist) * shotSpeed;
      b.vy = (dy / dist) * shotSpeed;
      b.vz = isHyper ? 35 : 20 + charge * 25;
      b.inAir = true;
      b.spin = (Math.random() - 0.5) * 12;
      b.speedMph = Math.round(shotSpeed * 0.9);

      if (isHyper) {
        setHyperStrikeReady(false);
        setScreenShake(14);
        if (soundEnabled) SoundJuice.playSoccerKick('power_hyper');
        addPopup('⚡ HYPER STRIKE! ⚡', window.innerWidth / 2, window.innerHeight / 2, '#FF0055');
      } else {
        setScreenShake(6);
        if (soundEnabled) SoundJuice.playSoccerKick('curve');
        addPopup(`${Math.round(charge * 100)}% POWER SHOT!`, window.innerWidth / 2, window.innerHeight / 2, '#00F2FF');
      }

      shotChargeRef.current = 0;
      setShotCharge(0);
      setIsChargingShot(false);
      isChargingRef.current = false;
    }
  }, [addPopup, hyperStrikeReady, soundEnabled]);

  // Skill Dribble / Step-over
  const performSkillMove = useCallback(() => {
    const controlledPlayer = playersRef.current.find(p => p.id === 'p_st');
    if (!controlledPlayer || !controlledPlayer.hasBall) return;

    controlledPlayer.x += (controlledPlayer.vx >= 0 ? 18 : -18);
    controlledPlayer.y += 12;
    if (soundEnabled) SoundJuice.playJukeCut();
    addPopup('STEP-OVER FLICK 🌪️', window.innerWidth / 2, window.innerHeight / 2, '#FFD700');
  }, [addPopup, soundEnabled]);

  // Slide Tackle
  const performSlideTackle = useCallback(() => {
    const controlledPlayer = playersRef.current.find(p => p.id === 'p_st');
    if (!controlledPlayer || controlledPlayer.hasBall || controlledPlayer.slideTimer > 0) return;

    controlledPlayer.slideTimer = 0.6;
    controlledPlayer.vy += 40;
    if (soundEnabled) SoundJuice.playSlideTackle();
    addPopup('SLIDE TACKLE! 💥', window.innerWidth / 2, window.innerHeight / 2, '#00F2FF');
  }, [addPopup, soundEnabled]);

  // Goal Scored Handler
  const handleGoalScored = useCallback((team: 'player' | 'opponent') => {
    goalResetTimerRef.current = 2.5;
    if (soundEnabled) {
      SoundJuice.playGoalNet();
      SoundJuice.playGoalCelebration();
    }
    setScreenShake(18);

    setScoreState(prev => {
      const { nextState } = recordSoccerGoal(prev, team, 24);
      if (nextState.matchOver && onGameComplete) {
        const pWon = nextState.playerGoals > nextState.opponentGoals;
        const delta = computePrqDelta(pWon, pWon ? 'S' : 'B', 1.0);
        onGameComplete({
          victory: pWon,
          prqDelta: delta,
          score: `${nextState.playerGoals}-${nextState.opponentGoals}`,
        });
      }
      return nextState;
    });

    if (team === 'player') {
      setMatchBanner('🚨 GOOOOOAL! WHAT A ROCKET STRIKE! 🚨');
      addPopup('🚨 GOOOOOAL! 🚨', window.innerWidth / 2, window.innerHeight / 3, '#FFD700');
    } else {
      setMatchBanner('OPPONENT GOAL SCORED');
      addPopup('OPPONENT GOAL', window.innerWidth / 2, window.innerHeight / 3, '#FF0055');
    }

    // Reset positions after 2.5s
    setTimeout(() => {
      initMatch();
      setMatchBanner('KICKOFF RESUMED');
    }, 2500);
  }, [addPopup, initMatch, onGameComplete, soundEnabled]);

  // Keyboard Event Listeners
  useEffect(() => {
    initMatch();

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;

      if (e.code === 'KeyJ') {
        performKick('pass');
      } else if (e.code === 'KeyK') {
        performSkillMove();
      } else if (e.code === 'KeyE') {
        performSlideTackle();
      } else if (e.code === 'Space' || e.code === 'KeyL') {
        e.preventDefault();
        isChargingRef.current = true;
        setIsChargingShot(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;

      if (e.code === 'Space' || e.code === 'KeyL') {
        if (isChargingRef.current) {
          performKick('shot');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [initMatch, performKick, performSkillMove, performSlideTackle]);

  // Main Canvas Animation & Simulation Loop
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

      // Update match clock
      setScoreState(s => advanceSoccerMatch(s, dt * 0.4));

      // Handle Shot Charging
      if (isChargingRef.current) {
        shotChargeRef.current = Math.min(1.0, shotChargeRef.current + dt * 1.5);
        setShotCharge(shotChargeRef.current);
      }

      // 1. Controlled Player Movement (ST)
      const controlledPlayer = playersRef.current.find(p => p.id === 'p_st');
      if (controlledPlayer && goalResetTimerRef.current <= 0) {
        let moveX = 0;
        let moveY = 0;
        if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) moveX -= 1;
        if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) moveX += 1;
        if (keysPressed.current['KeyW'] || keysPressed.current['ArrowUp']) moveY += 1;
        if (keysPressed.current['KeyS'] || keysPressed.current['ArrowDown']) moveY -= 1;

        const isSprinting = (keysPressed.current['ShiftLeft'] || keysPressed.current['ShiftRight']) && stamina > 10;
        if (isSprinting) setStamina(s => Math.max(0, s - dt * 25));
        else setStamina(s => Math.min(100, s + dt * 15));

        const currentSpeed = controlledPlayer.speed * (isSprinting ? 1.4 : 1.0);
        controlledPlayer.vx = moveX * currentSpeed;
        controlledPlayer.vy = moveY * currentSpeed;

        controlledPlayer.x = Math.max(-105, Math.min(105, controlledPlayer.x + controlledPlayer.vx * dt));
        controlledPlayer.y = Math.max(-165, Math.min(165, controlledPlayer.y + controlledPlayer.vy * dt));

        if (controlledPlayer.slideTimer > 0) {
          controlledPlayer.slideTimer = Math.max(0, controlledPlayer.slideTimer - dt);
        }

        // If player has ball, glue ball to feet
        if (controlledPlayer.hasBall) {
          const b = ballRef.current;
          b.x = controlledPlayer.x;
          b.y = controlledPlayer.y + 4;
          b.z = 0;
          b.vx = controlledPlayer.vx;
          b.vy = controlledPlayer.vy;
          b.inAir = false;
        }
      }

      // 2. Ball Simulation & Goal Checks
      const b = ballRef.current;
      if (!b.carrierId) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z = Math.max(0, b.z + b.vz * dt);

        if (b.inAir) {
          b.vz -= 98 * dt; // Gravity
          b.vx += b.spin * dt; // Magnus curve
          if (b.z <= 0) {
            b.z = 0;
            b.vz = -b.vz * 0.45; // Bounce dampening
            b.vx *= 0.8;
            b.vy *= 0.8;
            if (Math.abs(b.vz) < 8) b.inAir = false;
          }
        } else {
          // Pitch friction
          b.vx *= Math.pow(0.88, dt * 10);
          b.vy *= Math.pow(0.88, dt * 10);
        }

        // Add trail for visualization
        b.trail.push({ x: b.x, y: b.y, z: b.z, color: '#00F2FF' });
        if (b.trail.length > 12) b.trail.shift();

        // Check Top Goal Net (Opponent Net, y >= 170 and |x| <= 35 and z <= 24)
        if (b.y >= 170 && Math.abs(b.x) <= 35 && b.z <= 24 && goalResetTimerRef.current <= 0) {
          handleGoalScored('player');
          b.vx = 0;
          b.vy = 0;
        }

        // Check Bottom Goal Net (Player Net, y <= -170 and |x| <= 35 and z <= 24)
        if (b.y <= -170 && Math.abs(b.x) <= 35 && b.z <= 24 && goalResetTimerRef.current <= 0) {
          handleGoalScored('opponent');
          b.vx = 0;
          b.vy = 0;
        }

        // Pitch Boundary Deflections
        if (Math.abs(b.x) > 115) {
          b.vx = -b.vx * 0.7;
          b.x = Math.sign(b.x) * 115;
        }
        if (Math.abs(b.y) > 175 && Math.abs(b.x) > 35) {
          b.vy = -b.vy * 0.7;
          b.y = Math.sign(b.y) * 175;
        }

        // Ball Possession Pickup Check
        playersRef.current.forEach(p => {
          if (Math.hypot(p.x - b.x, p.y - b.y) < 12 && b.z < 14 && goalResetTimerRef.current <= 0) {
            p.hasBall = true;
            b.carrierId = p.id;
            b.inAir = false;
          }
        });
      }

      // 3. AI Behavior (Opponents & Teammates)
      if (goalResetTimerRef.current <= 0) {
        playersRef.current.forEach(p => {
          if (p.id === 'p_st') return; // Skip controlled player

          if (p.role === 'GK') {
            // Goalkeeper lateral tracking in 6-yard box
            const targetX = Math.max(-28, Math.min(28, b.x * 0.7));
            p.x += (targetX - p.x) * 4 * dt;
          } else if (p.team === 'opponent') {
            // Opponent AI pursues ball or closes down player
            const targetObj = b.carrierId ? playersRef.current.find(pl => pl.id === b.carrierId) : b;
            if (targetObj) {
              const dx = targetObj.x - p.x;
              const dy = targetObj.y - p.y;
              const dist = Math.hypot(dx, dy);
              p.x += (dx / Math.max(1, dist)) * p.speed * 0.8 * dt;
              p.y += (dy / Math.max(1, dist)) * p.speed * 0.8 * dt;

              // Opponent Tackle / Interception check
              if (controlledPlayer && controlledPlayer.hasBall && Math.hypot(p.x - controlledPlayer.x, p.y - controlledPlayer.y) < 12) {
                controlledPlayer.hasBall = false;
                p.hasBall = true;
                b.carrierId = p.id;
                if (soundEnabled) SoundJuice.playSlideTackle();
                addPopup('DISPOSSESSED!', window.innerWidth / 2, window.innerHeight / 2, '#FF0055');
              }

              // Opponent Shot when in scoring range
              if (p.hasBall && p.y < -80) {
                p.hasBall = false;
                b.carrierId = null;
                b.vx = (Math.random() - 0.5) * 40;
                b.vy = -110;
                b.vz = 20;
                b.inAir = true;
                if (soundEnabled) SoundJuice.playSoccerKick('ground');
              }
            }
          } else if (p.team === 'player') {
            // Teammate AI runs into attacking half
            const targetY = Math.min(140, p.y + (controlledPlayer ? controlledPlayer.y * 0.4 : 20));
            p.y += (targetY - p.y) * 2 * dt;
          }
        });
      }

      // Goal Reset Timer Decay
      if (goalResetTimerRef.current > 0) {
        goalResetTimerRef.current = Math.max(0, goalResetTimerRef.current - dt);
      }

      // Screen Shake Decay
      setScreenShake(s => Math.max(0, s - dt * 25));

      // 4. Rendering 3D Perspective Pitch
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Camera centering on Controlled Player or Ball
      const camY = controlledPlayer ? controlledPlayer.y * 0.7 : 0;
      const project = (fx: number, fy: number, fz: number = 0) => {
        const relY = (fy - camY) * 3.8;
        const screenX = width / 2 + fx * 3.6;
        const screenY = height / 2 - relY - fz * 2.2 + 60;
        return { x: screenX, y: screenY };
      };

      // Pitch Grass Canvas
      const turfGrad = ctx.createLinearGradient(0, 0, 0, height);
      turfGrad.addColorStop(0, '#042014');
      turfGrad.addColorStop(0.5, '#0A4226');
      turfGrad.addColorStop(1, '#03180E');
      ctx.fillStyle = turfGrad;
      ctx.fillRect(0, 0, width, height);

      // Pitch Boundary Lines
      const pTL = project(-115, 175);
      const pTR = project(115, 175);
      const pBR = project(115, -175);
      const pBL = project(-115, -175);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pTL.x, pTL.y);
      ctx.lineTo(pTR.x, pTR.y);
      ctx.lineTo(pBR.x, pBR.y);
      ctx.lineTo(pBL.x, pBL.y);
      ctx.closePath();
      ctx.stroke();

      // Halfway Line & Center Circle
      const cL = project(-115, 0);
      const cR = project(115, 0);
      ctx.beginPath();
      ctx.moveTo(cL.x, cL.y);
      ctx.lineTo(cR.x, cR.y);
      ctx.stroke();

      const centerSc = project(0, 0);
      ctx.beginPath();
      ctx.ellipse(centerSc.x, centerSc.y, 65, 30, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Penalty Boxes (Top & Bottom)
      const topPenTL = project(-60, 175);
      const topPenBR = project(60, 115);
      ctx.strokeRect(topPenTL.x, topPenBR.y, topPenBR.x - topPenTL.x, topPenTL.y - topPenBR.y);

      const botPenTL = project(-60, -115);
      const botPenBR = project(60, -175);
      ctx.strokeRect(botPenTL.x, botPenBR.y, botPenBR.x - botPenTL.x, botPenTL.y - botPenBR.y);

      // Goal Posts & Nets (Glowing Cyan/Purple Laser Nets)
      // Top Opponent Goal
      const topGTL = project(-35, 175);
      const topGTR = project(35, 175);
      ctx.fillStyle = 'rgba(255, 0, 85, 0.25)';
      ctx.fillRect(topGTL.x, topGTL.y - 30, topGTR.x - topGTL.x, 30);
      ctx.strokeStyle = '#FF0055';
      ctx.lineWidth = 4;
      ctx.strokeRect(topGTL.x, topGTL.y - 30, topGTR.x - topGTL.x, 30);

      // Bottom Player Goal
      const botGTL = project(-35, -175);
      const botGTR = project(35, -175);
      ctx.fillStyle = 'rgba(0, 242, 255, 0.25)';
      ctx.fillRect(botGTL.x, botGTL.y, botGTR.x - botGTL.x, 30);
      ctx.strokeStyle = '#00F2FF';
      ctx.lineWidth = 4;
      ctx.strokeRect(botGTL.x, botGTL.y, botGTR.x - botGTL.x, 30);

      // Draw Ball Trail & Ball
      b.trail.forEach(t => {
        const tp = project(t.x, t.y, t.z);
        ctx.fillStyle = 'rgba(0, 242, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      const bp = project(b.x, b.y, b.z);
      // Ball Shadow
      const bShadow = project(b.x, b.y, 0);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bShadow.x, bShadow.y, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ball Sprite (Classic Telstar Hexagon pattern)
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#00F2FF';
      ctx.shadowBlur = b.inAir ? 12 : 4;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#02040A';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Athletes
      playersRef.current.forEach(p => {
        const pScr = project(p.x, p.y);

        // Player Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(pScr.x, pScr.y, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Player Model
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.id === 'p_st' ? 10 : 4;
        ctx.beginPath();
        ctx.arc(pScr.x, pScr.y - 18, 7, 0, Math.PI * 2); // Head
        ctx.fill();
        ctx.fillRect(pScr.x - 7, pScr.y - 11, 14, 13); // Torso / Jersey
        ctx.shadowBlur = 0;

        // Jersey Number
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(p.number.toString(), pScr.x - 3, pScr.y - 1);

        // Controlled Indicator Indicator Ring
        if (p.id === 'p_st') {
          ctx.strokeStyle = '#00F2FF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pScr.x, pScr.y, 18, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [addPopup, handleGoalScored, screenShake, soundEnabled, stamina]);

  return (
    <div className="relative w-full max-w-7xl mx-auto flex flex-col items-center bg-[#02040A] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Top HUD & Scoreboard */}
      <div className="w-full flex flex-wrap items-center justify-between p-4 sm:p-6 bg-black/60 backdrop-blur-xl border-b border-white/10 z-20 gap-4">
        {/* Left: Mode Title & Back */}
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
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00F2FF]/10 text-[#00F2FF] border border-[#00F2FF]/30 font-bold uppercase">
                STRIKERS 5v5 ARCADE
              </span>
              <h2 className="font-orbitron text-lg font-black tracking-wider text-white uppercase">
                SOCCER STRIKER ARENA
              </h2>
            </div>
            <p className="text-[11px] font-mono text-zinc-400">
              Mario Strikers Shot-Shaping • Precision Penalty Trajectories
            </p>
          </div>
        </div>

        {/* Center: Live Match Scoreboard */}
        <div className="flex items-center gap-6 bg-black/80 px-6 py-2.5 rounded-2xl border border-white/10 shadow-inner">
          {/* Player Team */}
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-[#00F2FF]">FC EVOLUTION</div>
            <div className="font-orbitron text-2xl font-black text-white">
              {scoreState.playerGoals}
            </div>
          </div>

          <div className="text-center px-3">
            <div className="text-[10px] font-mono text-yellow-400 font-bold uppercase tracking-widest">
              HALF {scoreState.half}
            </div>
            <div className="font-orbitron text-sm font-bold text-zinc-300">
              {Math.floor(scoreState.matchClockSec / 60)}:{(scoreState.matchClockSec % 60).toFixed(0).padStart(2, '0')}
            </div>
          </div>

          {/* Opponent Team */}
          <div className="text-left">
            <div className="text-xs font-mono font-bold text-[#FF0055]">CYBER UTD</div>
            <div className="font-orbitron text-2xl font-black text-white">
              {scoreState.opponentGoals}
            </div>
          </div>
        </div>

        {/* Right: Sound & Shot Charge */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] font-mono text-zinc-400">SPRINT STAMINA</span>
            <span className="font-orbitron text-sm font-bold text-[#00F2FF]">{Math.round(stamina)}%</span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-[#00F2FF]" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
          </button>
        </div>
      </div>

      {/* Primary Canvas Container */}
      <div className="relative w-full aspect-[16/9] max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-contain"
        />

        {/* Floating Popups */}
        <AnimatePresence>
          {popups.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -70, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.3 }}
              style={{ left: p.x, top: p.y, color: p.color }}
              className="absolute pointer-events-none font-orbitron text-2xl sm:text-3xl font-black drop-shadow-[0_0_15px_rgba(0,242,255,0.9)] -translate-x-1/2 -translate-y-1/2 z-30"
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
            className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-black/80 border border-[#00F2FF]/40 text-[#00F2FF] font-orbitron text-xs sm:text-sm font-bold uppercase tracking-widest backdrop-blur-md z-20 shadow-[0_0_20px_rgba(0,242,255,0.2)]"
          >
            {matchBanner}
          </motion.div>
        )}

        {/* Shot Power Charge Meter */}
        {isChargingShot && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-30 pointer-events-none">
            <div className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
              {shotCharge >= 0.95 ? '🔥 HYPER STRIKE CHARGED!' : 'STRIKE POWER CHARGE'}
            </div>
            <div className="w-48 h-3.5 rounded-full bg-black/80 border border-white/20 overflow-hidden p-0.5 shadow-lg">
              <div
                className={`h-full rounded-full transition-all ${
                  shotCharge >= 0.95 
                    ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 animate-pulse' 
                    : 'bg-gradient-to-r from-[#00F2FF] to-blue-500'
                }`}
                style={{ width: `${shotCharge * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Virtual Controls Bar */}
      <div className="w-full p-4 sm:p-6 bg-zinc-950/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 z-20">
        {/* Left: Shot / Pass Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => performKick('pass')}
            className="px-4 py-2.5 rounded-xl bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] font-mono text-xs font-bold hover:bg-[#00F2FF]/20 transition-colors min-h-[44px] flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" /> PASS (J)
          </button>
          <button
            onClick={() => performSkillMove()}
            className="px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono text-xs font-bold hover:bg-yellow-500/20 transition-colors min-h-[44px] flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" /> STEP-OVER (K)
          </button>
          <button
            onClick={() => performSlideTackle()}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs font-bold hover:bg-white/10 transition-colors min-h-[44px] flex items-center gap-1.5"
          >
            <Target className="w-4 h-4" /> SLIDE TACKLE (E)
          </button>
        </div>

        {/* Right: Shoot & Reset */}
        <div className="flex items-center gap-2">
          <button
            onMouseDown={() => {
              isChargingRef.current = true;
              setIsChargingShot(true);
            }}
            onMouseUp={() => {
              if (isChargingRef.current) performKick('shot');
            }}
            onTouchStart={() => {
              isChargingRef.current = true;
              setIsChargingShot(true);
            }}
            onTouchEnd={() => {
              if (isChargingRef.current) performKick('shot');
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-[#FF0055] text-white font-orbitron text-xs font-black uppercase shadow-[0_0_20px_rgba(255,0,85,0.4)] min-h-[44px] flex items-center gap-2"
          >
            <Dribbble className="w-4 h-4" /> HOLD: CHARGE STRIKE (SPACE)
          </button>
          <button
            onClick={initMatch}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Restart Match"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
