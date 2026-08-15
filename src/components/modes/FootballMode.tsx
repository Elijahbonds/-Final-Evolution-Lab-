import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, VolumeX, 
  Zap, ArrowLeft, Shield
} from 'lucide-react';
import { 
  FootballScoreState, 
  createInitialFootballScore, 
  advanceFootballPlay, 
  computePrqDelta, 
  SoundJuice 
} from '../../lib/judgeScoring';

type PlayType = 'slants' | 'verticals' | 'hb_zone' | 'screen';
type PlayPhase = 'play_call' | 'pre_snap' | 'in_pocket' | 'ball_in_air' | 'run_after_catch' | 'play_ended' | 'game_over';

interface PlayerEntity {
  id: string;
  name: string;
  number: number;
  role: 'QB' | 'WR' | 'RB' | 'OL' | 'DL' | 'LB' | 'CB' | 'FS';
  team: 'offense' | 'defense';
  x: number; // -120 to 120 (sideline to sideline)
  y: number; // Yard line on field (0 = own goal line, 100 = opponent goal line)
  vx: number;
  vy: number;
  speed: number;
  routeType?: 'slant' | 'streak' | 'out' | 'screen' | 'block' | 'rush' | 'coverage';
  routeStep: number;
  hasBall: boolean;
  isTackled: boolean;
  targetKey?: 'J' | 'K' | 'L'; // Button trigger to pass to this receiver
  color: string;
}

interface FootballBall {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  inAir: boolean;
  targetEntityId: string | null;
  carrierId: string | null;
  spiralRot: number;
  speedMph: number;
  tracer: Array<{ x: number; y: number; z: number; alpha: number }>;
}

interface Popup {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface FootballModeProps {
  onBack?: () => void;
  onGameComplete?: (result: { victory: boolean; prqDelta: number; score: string }) => void;
}

export const FootballMode: React.FC<FootballModeProps> = ({ onBack, onGameComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Match & Drive State
  const [scoreState, setScoreState] = useState<FootballScoreState>(createInitialFootballScore());
  const [playPhase, setPlayPhase] = useState<PlayPhase>('play_call');
  const [selectedPlay, setSelectedPlay] = useState<PlayType>('slants');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [matchBanner, setMatchBanner] = useState<string | null>('CHOOSE OFFENSIVE PLAY CALL');
  const [screenShake, setScreenShake] = useState<number>(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [carrierTurbo, setCarrierTurbo] = useState<number>(100);

  // Entities Ref
  const playersRef = useRef<PlayerEntity[]>([]);
  const ballRef = useRef<FootballBall>({
    x: 0,
    y: 25,
    z: 12,
    vx: 0,
    vy: 0,
    vz: 0,
    inAir: false,
    targetEntityId: null,
    carrierId: 'qb',
    spiralRot: 0,
    speedMph: 0,
    tracer: [],
  });

  const keysPressed = useRef<Record<string, boolean>>({});
  const pocketTimerRef = useRef<number>(0);
  const lineOfScrimmageRef = useRef<number>(25);

  // Add floating banner / text popup
  const addPopup = useCallback((text: string, x: number, y: number, color = '#00F2FF') => {
    const newPopup: Popup = {
      id: Date.now() + Math.random(),
      text,
      x,
      y,
      color,
    };
    setPopups(prev => [...prev.slice(-5), newPopup]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== newPopup.id));
    }, 1400);
  }, []);

  // Setup Formations based on Line of Scrimmage and Play Call
  const setupFormation = useCallback((los: number, play: PlayType) => {
    lineOfScrimmageRef.current = los;
    const isRun = play === 'hb_zone';

    const roster: PlayerEntity[] = [
      // OFFENSE (Neon Cyan / Gold)
      { id: 'qb', name: 'QB1', number: 7, role: 'QB', team: 'offense', x: 0, y: los - 5, vx: 0, vy: 0, speed: 45, routeStep: 0, hasBall: true, isTackled: false, color: '#00F2FF' },
      { id: 'ol1', name: 'LT', number: 72, role: 'OL', team: 'offense', x: -18, y: los - 1, vx: 0, vy: 0, speed: 20, routeType: 'block', routeStep: 0, hasBall: false, isTackled: false, color: '#00D0FF' },
      { id: 'ol2', name: 'RT', number: 78, role: 'OL', team: 'offense', x: 18, y: los - 1, vx: 0, vy: 0, speed: 20, routeType: 'block', routeStep: 0, hasBall: false, isTackled: false, color: '#00D0FF' },
      { id: 'rb', name: 'RB', number: 22, role: 'RB', team: 'offense', x: -12, y: los - 7, vx: 0, vy: 0, speed: 52, routeType: isRun ? 'rush' : 'screen', routeStep: 0, hasBall: false, isTackled: false, targetKey: 'J', color: '#FFD700' },
      { id: 'wr1', name: 'WR1', number: 11, role: 'WR', team: 'offense', x: -70, y: los - 1, vx: 0, vy: 0, speed: 56, routeType: play === 'verticals' ? 'streak' : 'slant', routeStep: 0, hasBall: false, isTackled: false, targetKey: 'K', color: '#FFD700' },
      { id: 'wr2', name: 'WR2', number: 88, role: 'WR', team: 'offense', x: 70, y: los - 1, vx: 0, vy: 0, speed: 58, routeType: play === 'verticals' ? 'streak' : 'out', routeStep: 0, hasBall: false, isTackled: false, targetKey: 'L', color: '#FFD700' },

      // DEFENSE (Crimson Red / Purple)
      { id: 'dl1', name: 'DE', number: 99, role: 'DL', team: 'defense', x: -22, y: los + 2, vx: 0, vy: 0, speed: 38, routeType: 'rush', routeStep: 0, hasBall: false, isTackled: false, color: '#FF0055' },
      { id: 'dl2', name: 'DT', number: 95, role: 'DL', team: 'defense', x: 22, y: los + 2, vx: 0, vy: 0, speed: 36, routeType: 'rush', routeStep: 0, hasBall: false, isTackled: false, color: '#FF0055' },
      { id: 'lb1', name: 'MLB', number: 54, role: 'LB', team: 'defense', x: 0, y: los + 7, vx: 0, vy: 0, speed: 46, routeType: 'coverage', routeStep: 0, hasBall: false, isTackled: false, color: '#FF3366' },
      { id: 'cb1', name: 'CB1', number: 21, role: 'CB', team: 'defense', x: -68, y: los + 6, vx: 0, vy: 0, speed: 55, routeType: 'coverage', routeStep: 0, hasBall: false, isTackled: false, color: '#FF0055' },
      { id: 'cb2', name: 'CB2', number: 24, role: 'CB', team: 'defense', x: 68, y: los + 6, vx: 0, vy: 0, speed: 55, routeType: 'coverage', routeStep: 0, hasBall: false, isTackled: false, color: '#FF0055' },
      { id: 'fs', name: 'FS', number: 33, role: 'FS', team: 'defense', x: 0, y: los + 18, vx: 0, vy: 0, speed: 56, routeType: 'coverage', routeStep: 0, hasBall: false, isTackled: false, color: '#9333EA' },
    ];

    playersRef.current = roster;
    ballRef.current = {
      x: 0,
      y: los - 5,
      z: 8,
      vx: 0,
      vy: 0,
      vz: 0,
      inAir: false,
      targetEntityId: null,
      carrierId: 'qb',
      spiralRot: 0,
      speedMph: 0,
      tracer: [],
    };
    pocketTimerRef.current = 0;
  }, []);

  // Initialize play
  const startPreSnap = useCallback((play: PlayType) => {
    setSelectedPlay(play);
    setupFormation(scoreState.ballOnYard, play);
    setPlayPhase('pre_snap');
    setMatchBanner('PRESS SNAP (SPACE) TO BEGIN PLAY');
    if (soundEnabled) SoundJuice.playWhistle();
  }, [scoreState.ballOnYard, setupFormation, soundEnabled]);

  // Snap the ball
  const snapBall = useCallback(() => {
    if (playPhase !== 'pre_snap') return;
    setPlayPhase('in_pocket');
    setMatchBanner('SCAN THE FIELD — PRESS J, K, L TO PASS OR SCRAMBLE (WASD)');
    if (soundEnabled) SoundJuice.playWhistle();

    // If HB Zone run, instantly handoff to RB
    if (selectedPlay === 'hb_zone') {
      setTimeout(() => {
        const rb = playersRef.current.find(p => p.id === 'rb');
        const qb = playersRef.current.find(p => p.id === 'qb');
        if (rb && qb) {
          qb.hasBall = false;
          rb.hasBall = true;
          ballRef.current.carrierId = 'rb';
          setPlayPhase(current => {
            if (current === 'in_pocket') {
              setMatchBanner('RUN CARRIER ENGAGED! USE JUKES & TURBO TO HIT HOLE');
              addPopup('HANDOFF TO RB!', window.innerWidth / 2, window.innerHeight / 2, '#FFD700');
              return 'run_after_catch';
            }
            return current;
          });
        }
      }, 400);
    }
  }, [addPopup, playPhase, selectedPlay, soundEnabled]);

  // Pass to designated target receiver
  const throwPass = useCallback((targetKey: 'J' | 'K' | 'L') => {
    if (playPhase !== 'in_pocket') return;
    const qb = playersRef.current.find(p => p.id === 'qb');
    const target = playersRef.current.find(p => p.targetKey === targetKey);
    if (!qb || !target) return;

    qb.hasBall = false;
    const b = ballRef.current;
    b.carrierId = null;
    b.inAir = true;
    b.targetEntityId = target.id;
    b.x = qb.x;
    b.y = qb.y;
    b.z = 12;

    // Calculate lead passing arc
    const leadY = target.y + target.vy * 0.4 + 4;
    const leadX = target.x + target.vx * 0.4;
    const dist = Math.hypot(leadX - qb.x, leadY - qb.y);
    const flightTime = Math.max(0.6, dist / 85);

    b.vx = (leadX - qb.x) / (flightTime * 60);
    b.vy = (leadY - qb.y) / (flightTime * 60);
    b.vz = 1.4;
    b.speedMph = Math.round(dist * 1.8);

    setPlayPhase('ball_in_air');
    setMatchBanner(`PASS AIRBORNE TO ${target.name} (${target.role})`);
    if (soundEnabled) SoundJuice.playSpiralPass();
    setScreenShake(4);
  }, [playPhase, soundEnabled]);

  // Execute ball carrier special juke / truck
  const executeCarrierSkill = useCallback((move: 'juke_left' | 'juke_right' | 'truck' | 'spin') => {
    const carrier = playersRef.current.find(p => p.hasBall);
    if (!carrier || playPhase !== 'run_after_catch') return;

    if (move === 'juke_left') {
      carrier.x -= 24;
      if (soundEnabled) SoundJuice.playJukeCut();
      addPopup('JUKE LEFT ⚡', window.innerWidth / 2, window.innerHeight / 2, '#00F2FF');
    } else if (move === 'juke_right') {
      carrier.x += 24;
      if (soundEnabled) SoundJuice.playJukeCut();
      addPopup('JUKE RIGHT ⚡', window.innerWidth / 2, window.innerHeight / 2, '#00F2FF');
    } else if (move === 'truck' && carrierTurbo >= 30) {
      carrier.vy += 22;
      setCarrierTurbo(t => Math.max(0, t - 35));
      if (soundEnabled) SoundJuice.playTackleHit(true);
      setScreenShake(8);
      addPopup('🔥 TRUCK BREAKAWAY!', window.innerWidth / 2, window.innerHeight / 2, '#FF0055');
    } else if (move === 'spin') {
      carrier.vx += (carrier.vx >= 0 ? 16 : -16);
      if (soundEnabled) SoundJuice.playJukeCut();
      addPopup('SPIN MOVE 🌪️', window.innerWidth / 2, window.innerHeight / 2, '#FFD700');
    }
  }, [addPopup, carrierTurbo, playPhase, soundEnabled]);

  // End of play resolution
  const resolvePlayEnd = useCallback((yardsGained: number, turnover: boolean = false, reason: string = '') => {
    setPlayPhase('play_ended');
    if (soundEnabled) SoundJuice.playWhistle();

    setScoreState(prev => {
      const { nextState, event } = advanceFootballPlay(prev, yardsGained, turnover);
      
      let bannerMsg = `PLAY ENDED (${yardsGained >= 0 ? '+' : ''}${yardsGained} YDS)`;
      if (event === 'FIRST_DOWN') {
        bannerMsg = '⚡ FIRST DOWN! CHAIN MOVES!';
        addPopup('FIRST DOWN!', window.innerWidth / 2, window.innerHeight / 3, '#00F2FF');
      } else if (event === 'TOUCHDOWN') {
        bannerMsg = '🚨 TOUCHDOWN! 7 POINTS ON THE BOARD!';
        addPopup('🚨 TOUCHDOWN! 🚨', window.innerWidth / 2, window.innerHeight / 3, '#FFD700');
        if (soundEnabled) SoundJuice.playTouchdownHorn();
        setScreenShake(16);
      } else if (event === 'TURNOVER_ON_DOWNS' || event === 'INTERCEPTION') {
        bannerMsg = 'TURNOVER! DEFENSE TAKES OVER';
        addPopup('TURNOVER!', window.innerWidth / 2, window.innerHeight / 3, '#FF0055');
      }

      if (reason) bannerMsg += ` — ${reason}`;
      setMatchBanner(bannerMsg);

      if (nextState.gameOver && onGameComplete) {
        const pWon = nextState.playerScore > nextState.opponentScore;
        const delta = computePrqDelta(pWon, pWon ? 'S' : 'B', 1.0);
        onGameComplete({
          victory: pWon,
          prqDelta: delta,
          score: `${nextState.playerScore}-${nextState.opponentScore}`,
        });
      }

      return nextState;
    });

    // Reset to play call after 2.4s
    setTimeout(() => {
      setPlayPhase('play_call');
      setMatchBanner('CHOOSE NEXT OFFENSIVE PLAY');
      setCarrierTurbo(100);
    }, 2400);
  }, [addPopup, onGameComplete, soundEnabled]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        if (playPhase === 'pre_snap') snapBall();
      } else if (e.code === 'KeyJ') {
        if (playPhase === 'in_pocket') throwPass('J');
        else if (playPhase === 'run_after_catch') executeCarrierSkill('juke_left');
      } else if (e.code === 'KeyK') {
        if (playPhase === 'in_pocket') throwPass('K');
        else if (playPhase === 'run_after_catch') executeCarrierSkill('spin');
      } else if (e.code === 'KeyL') {
        if (playPhase === 'in_pocket') throwPass('L');
        else if (playPhase === 'run_after_catch') executeCarrierSkill('juke_right');
      } else if (e.code === 'KeyI' || e.code === 'KeyE') {
        if (playPhase === 'run_after_catch') executeCarrierSkill('truck');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [executeCarrierSkill, playPhase, snapBall, throwPass]);

  // Main Canvas & Simulation Loop
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

      // 1. In-Pocket QB Control & Pressure
      if (playPhase === 'in_pocket') {
        pocketTimerRef.current += dt;
        const qb = playersRef.current.find(p => p.id === 'qb');
        if (qb) {
          let moveX = 0;
          let moveY = 0;
          if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) moveX -= 1;
          if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) moveX += 1;
          if (keysPressed.current['KeyW'] || keysPressed.current['ArrowUp']) moveY += 1;
          if (keysPressed.current['KeyS'] || keysPressed.current['ArrowDown']) moveY -= 1;

          qb.x = Math.max(-80, Math.min(80, qb.x + moveX * 42 * dt));
          qb.y = Math.max(scoreState.ballOnYard - 14, Math.min(scoreState.ballOnYard + 4, qb.y + moveY * 38 * dt));

          // If QB scrambles past Line of Scrimmage, automatically switch to carrier run
          if (qb.y > scoreState.ballOnYard) {
            setPlayPhase('run_after_catch');
            setMatchBanner('QB SCRAMBLE! RUN FOR THE FIRST DOWN!');
            addPopup('QB SCRAMBLE!', window.innerWidth / 2, window.innerHeight / 2, '#00F2FF');
          }
        }
      }

      // 2. Receiver Route Running
      if (playPhase === 'in_pocket' || playPhase === 'ball_in_air' || playPhase === 'run_after_catch') {
        playersRef.current.forEach(p => {
          if (p.team === 'offense' && p.role === 'WR') {
            p.routeStep += dt;
            if (p.routeType === 'slant') {
              p.y += 32 * dt;
              p.x += (p.x < 0 ? 28 : -28) * dt;
            } else if (p.routeType === 'streak') {
              p.y += 42 * dt;
            } else if (p.routeType === 'out') {
              if (p.routeStep < 1.2) p.y += 35 * dt;
              else p.x += (p.x > 0 ? 30 : -30) * dt;
            }
          } else if (p.team === 'offense' && p.role === 'RB' && p.routeType === 'rush' && !p.hasBall) {
            p.y += 38 * dt;
          }
        });
      }

      // 3. Defense AI (Pass Rush & Coverage Pursuits)
      const carrier = playersRef.current.find(p => p.hasBall);
      const targetObj = carrier || playersRef.current.find(p => p.id === ballRef.current.targetEntityId) || playersRef.current.find(p => p.id === 'qb');

      if (playPhase === 'in_pocket' || playPhase === 'run_after_catch') {
        playersRef.current.forEach(def => {
          if (def.team === 'defense' && targetObj) {
            const dx = targetObj.x - def.x;
            const dy = targetObj.y - def.y;
            const dist = Math.hypot(dx, dy);

            if (def.role === 'DL') {
              // Pass rushers fight past blockers
              const rushSpeed = 34;
              def.x += (dx / Math.max(1, dist)) * rushSpeed * dt;
              def.y += (dy / Math.max(1, dist)) * rushSpeed * dt;
            } else {
              // LBs and DBs track carrier with agile pursuit
              const pursuitSpeed = def.speed * 0.85;
              def.x += (dx / Math.max(1, dist)) * pursuitSpeed * dt;
              def.y += (dy / Math.max(1, dist)) * pursuitSpeed * dt;
            }

            // Tackle Collision Check on Ball Carrier!
            if (carrier && Math.hypot(carrier.x - def.x, carrier.y - def.y) < 14) {
              // Tackle Made!
              if (soundEnabled) SoundJuice.playTackleHit(false);
              setScreenShake(10);
              const gained = Math.round(carrier.y - lineOfScrimmageRef.current);
              resolvePlayEnd(gained, false, `${def.name} Tackle`);
            }
          }
        });
      }

      // 4. Ball Physics in Air
      const b = ballRef.current;
      if (b.inAir && b.targetEntityId) {
        b.x += b.vx;
        b.y += b.vy;
        b.z = Math.max(0, b.z + b.vz);
        b.vz -= 3.2 * dt; // Gravity arc
        b.spiralRot += 15 * dt;

        b.tracer.push({ x: b.x, y: b.y, z: b.z, alpha: 1.0 });
        if (b.tracer.length > 15) b.tracer.shift();

        // Check Arrival at Receiver
        const targetReceiver = playersRef.current.find(p => p.id === b.targetEntityId);
        if (targetReceiver && Math.hypot(b.x - targetReceiver.x, b.y - targetReceiver.y) < 12 && b.z < 16) {
          // Complete Catch!
          b.inAir = false;
          b.carrierId = targetReceiver.id;
          targetReceiver.hasBall = true;
          setPlayPhase('run_after_catch');
          setMatchBanner(`CATCH BY ${targetReceiver.name}! GAIN YARDS & AVOID TACKLERS`);
          if (soundEnabled) SoundJuice.playCatch();
          addPopup('COMPLETE! 🔥', window.innerWidth / 2, window.innerHeight / 2, '#00F2FF');
        } else if (b.z <= 0) {
          // Incomplete Pass
          b.inAir = false;
          resolvePlayEnd(0, false, 'Incomplete Pass');
        }
      }

      // 5. Run After Catch Manual Control
      if (playPhase === 'run_after_catch') {
        const c = playersRef.current.find(p => p.hasBall);
        if (c) {
          let moveX = 0;
          let moveY = 1; // Natural forward drive
          if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) moveX -= 1;
          if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) moveX += 1;
          if (keysPressed.current['KeyW'] || keysPressed.current['ArrowUp']) moveY += 0.8;
          if (keysPressed.current['KeyS'] || keysPressed.current['ArrowDown']) moveY -= 0.6;

          const sprint = keysPressed.current['ShiftLeft'] || keysPressed.current['ShiftRight'];
          const speedMultiplier = sprint && carrierTurbo > 10 ? 1.45 : 1.0;
          if (sprint) setCarrierTurbo(t => Math.max(0, t - 25 * dt));

          c.x = Math.max(-95, Math.min(95, c.x + moveX * 48 * speedMultiplier * dt));
          c.y += moveY * 50 * speedMultiplier * dt;

          // Check Endzone Touchdown Reach
          if (c.y >= 100) {
            const gained = Math.round(100 - lineOfScrimmageRef.current);
            resolvePlayEnd(gained, false, 'TOUCHDOWN IN ENDZONE!');
          }
        }
      }

      // Screen Shake Decay
      setScreenShake(s => Math.max(0, s - dt * 25));

      // 6. Isometric 3D Field Camera Rendering
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Dynamic Camera centering on Line of Scrimmage or Carrier
      const focusY = carrier ? carrier.y : scoreState.ballOnYard;
      const project = (fx: number, fy: number, fz: number = 0) => {
        const relY = (fy - focusY) * 6.5;
        const screenX = width / 2 + fx * 3.4;
        const screenY = height / 2 - relY - fz * 3.0 + 80;
        return { x: screenX, y: screenY };
      };

      // Draw Stadium & Grass Canvas
      const turfGrad = ctx.createLinearGradient(0, 0, 0, height);
      turfGrad.addColorStop(0, '#061E14');
      turfGrad.addColorStop(0.5, '#0B3824');
      turfGrad.addColorStop(1, '#051810');
      ctx.fillStyle = turfGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw 100-Yard Field Markings (Every 5 and 10 yards)
      for (let y = 0; y <= 100; y += 5) {
        const isTen = y % 10 === 0;
        const pL = project(-100, y);
        const pR = project(100, y);

        ctx.strokeStyle = isTen ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = isTen ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(pL.x, pL.y);
        ctx.lineTo(pR.x, pR.y);
        ctx.stroke();

        // Yard Numbers
        if (isTen && y > 0 && y < 100) {
          const displayNum = y <= 50 ? y : 100 - y;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.font = 'bold 16px monospace';
          ctx.fillText(displayNum.toString(), pL.x + 20, pL.y - 6);
          ctx.fillText(displayNum.toString(), pR.x - 35, pR.y - 6);
        }
      }

      // Draw Line of Scrimmage (Blue Laser Line)
      const losL = project(-105, scoreState.ballOnYard);
      const losR = project(105, scoreState.ballOnYard);
      ctx.strokeStyle = '#00F2FF';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#00F2FF';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(losL.x, losL.y);
      ctx.lineTo(losR.x, losR.y);
      ctx.stroke();

      // Draw 1st Down Line (Yellow / Gold Laser Line)
      const firstDownYard = scoreState.ballOnYard + scoreState.yardsToGo;
      const fdL = project(-105, firstDownYard);
      const fdR = project(105, firstDownYard);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(fdL.x, fdL.y);
      ctx.lineTo(fdR.x, fdR.y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Endzones
      const ezOppTL = project(-100, 100);
      const ezOppBR = project(100, 115);
      ctx.fillStyle = 'rgba(255, 0, 85, 0.25)';
      ctx.fillRect(ezOppTL.x, ezOppBR.y, ezOppBR.x - ezOppTL.x, ezOppTL.y - ezOppBR.y);

      // Draw Receiver Target Badges (J, K, L)
      if (playPhase === 'in_pocket') {
        playersRef.current.forEach(p => {
          if (p.targetKey) {
            const pScr = project(p.x, p.y);
            ctx.fillStyle = '#00F2FF';
            ctx.shadowColor = '#00F2FF';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(pScr.x, pScr.y - 28, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(p.targetKey, pScr.x - 4, pScr.y - 24);
            ctx.shadowBlur = 0;
          }
        });
      }

      // Draw Ball Tracers & Ball
      const bPos = project(b.x, b.y, b.z);
      if (b.inAir) {
        b.tracer.forEach(t => {
          const tp = project(t.x, t.y, t.z);
          ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });

        // 3D Pro Football Leather Ball
        ctx.fillStyle = '#B45309';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(bPos.x, bPos.y, 7, 4, b.spiralRot, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw Player Athletes (7v7 Gridiron Models)
      playersRef.current.forEach(p => {
        const pScr = project(p.x, p.y);

        // Player Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(pScr.x, pScr.y, 16, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Athlete Shoulder Pads & Helmet
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pScr.x, pScr.y - 20, 8, 0, Math.PI * 2); // Helmet
        ctx.fill();
        ctx.fillRect(pScr.x - 9, pScr.y - 12, 18, 16); // Torso / Pads
        ctx.shadowBlur = 0;

        // Jersey Number
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(p.number.toString(), pScr.x - 5, pScr.y);

        // Ball Indicator on Carrier
        if (p.hasBall) {
          ctx.fillStyle = '#B45309';
          ctx.beginPath();
          ctx.arc(pScr.x + 8, pScr.y - 6, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [addPopup, carrierTurbo, playPhase, resolvePlayEnd, scoreState.ballOnYard, scoreState.yardsToGo, screenShake, soundEnabled]);

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
                GRIDIRON 7v7 SIM
              </span>
              <h2 className="font-orbitron text-lg font-black tracking-wider text-white uppercase">
                FOOTBALL ARENA
              </h2>
            </div>
            <p className="text-[11px] font-mono text-zinc-400">
              Madden Arcade Passing & Rush Engine • Field Traversal Core
            </p>
          </div>
        </div>

        {/* Center: Live Down & Distance Scoreboard */}
        <div className="flex items-center gap-6 bg-black/80 px-5 py-2.5 rounded-2xl border border-white/10 shadow-inner">
          {/* Offense */}
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-[#00F2FF]">HOME OFFENSE</div>
            <div className="font-orbitron text-xl font-black text-white">
              {scoreState.playerScore} PTS
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Down & Ball Spot */}
          <div className="text-center px-2">
            <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
              {scoreState.down}ND & {scoreState.yardsToGo} YDS
            </div>
            <div className="font-orbitron text-base font-bold text-yellow-400">
              BALL ON {scoreState.ballOnYard > 50 ? `OPP ${100 - scoreState.ballOnYard}` : `OWN ${scoreState.ballOnYard}`}
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Defense */}
          <div className="text-left">
            <div className="text-xs font-mono font-bold text-[#FF0055]">AI DEFENSE</div>
            <div className="font-orbitron text-xl font-black text-white">
              {scoreState.opponentScore} PTS
            </div>
          </div>
        </div>

        {/* Right: Sound & Turbo */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] font-mono text-zinc-400">CARRIER TURBO</span>
            <span className="font-orbitron text-sm font-bold text-[#00F2FF]">{Math.round(carrierTurbo)}%</span>
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
              animate={{ opacity: 0, y: -60, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              style={{ left: p.x, top: p.y, color: p.color }}
              className="absolute pointer-events-none font-orbitron text-xl sm:text-2xl font-black drop-shadow-[0_0_12px_rgba(0,242,255,0.8)] -translate-x-1/2 -translate-y-1/2 z-30"
            >
              {p.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Play Banner */}
        {matchBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-black/80 border border-[#00F2FF]/40 text-[#00F2FF] font-orbitron text-xs sm:text-sm font-bold uppercase tracking-widest backdrop-blur-md z-20 shadow-[0_0_20px_rgba(0,242,255,0.2)]"
          >
            {matchBanner}
          </motion.div>
        )}

        {/* Pre-Snap Prompt */}
        {playPhase === 'pre_snap' && (
          <div className="absolute inset-x-0 bottom-12 flex flex-col items-center justify-center pointer-events-none z-20">
            <motion.button
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              onClick={snapBall}
              className="pointer-events-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-[#00F2FF] to-blue-600 text-black font-orbitron font-black text-sm uppercase tracking-widest shadow-[0_0_25px_rgba(0,242,255,0.6)] min-h-[48px]"
            >
              SNAP BALL (SPACE)
            </motion.button>
          </div>
        )}

        {/* Play Call Modal */}
        {playPhase === 'play_call' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-40 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-xl w-full p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-[#00F2FF]/30 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-orbitron text-xl font-black text-white uppercase">
                    CALL OFFENSIVE PLAY
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    Down: {scoreState.down} | Need: {scoreState.yardsToGo} yds | Ball: Own {scoreState.ballOnYard}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-[#00F2FF]" />
              </div>

              {/* Play Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  onClick={() => startPreSnap('slants')}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-[#00F2FF]/10 border border-white/10 hover:border-[#00F2FF]/50 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-orbitron text-sm font-bold text-white group-hover:text-[#00F2FF]">
                      QUICK SLANTS
                    </span>
                    <span className="text-[10px] font-mono text-[#00F2FF] px-2 py-0.5 rounded bg-[#00F2FF]/10">
                      SHORT PASS
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Inside crossing routes for rapid 6-8 yard chain-moving gains.
                  </p>
                </button>

                <button
                  onClick={() => startPreSnap('verticals')}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-[#00F2FF]/10 border border-white/10 hover:border-[#00F2FF]/50 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-orbitron text-sm font-bold text-white group-hover:text-[#00F2FF]">
                      FOUR VERTICALS
                    </span>
                    <span className="text-[10px] font-mono text-yellow-400 px-2 py-0.5 rounded bg-yellow-400/10">
                      DEEP SHOT
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">
                    High velocity deep streaks attacking single-high safety coverage.
                  </p>
                </button>

                <button
                  onClick={() => startPreSnap('hb_zone')}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-[#00F2FF]/10 border border-white/10 hover:border-[#00F2FF]/50 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-orbitron text-sm font-bold text-white group-hover:text-[#00F2FF]">
                      HB INSIDE ZONE
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-400/10">
                      RUSH
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Direct handoff between tackles with cutback lane vision.
                  </p>
                </button>

                <button
                  onClick={() => startPreSnap('screen')}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-[#00F2FF]/10 border border-white/10 hover:border-[#00F2FF]/50 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-orbitron text-sm font-bold text-white group-hover:text-[#00F2FF]">
                      RB SCREEN
                    </span>
                    <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-400/10">
                      MISDIRECTION
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Let pass rush fly past and slip the ball behind pulling linemen.
                  </p>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Bottom Virtual Gamepad Controls */}
      <div className="w-full p-4 sm:p-6 bg-zinc-950/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 z-20">
        {/* Left: Receiver Pass Buttons */}
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono text-zinc-400 hidden lg:block mr-2">
            PASS TARGETS:
          </div>
          <button
            onClick={() => throwPass('J')}
            disabled={playPhase !== 'in_pocket'}
            className="px-3.5 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono text-xs font-bold hover:bg-orange-500/20 transition-colors min-h-[44px] flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Zap className="w-3.5 h-3.5" /> WR1 / RB (J)
          </button>
          <button
            onClick={() => throwPass('K')}
            disabled={playPhase !== 'in_pocket'}
            className="px-3.5 py-2 rounded-xl bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] font-mono text-xs font-bold hover:bg-[#00F2FF]/20 transition-colors min-h-[44px] flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Zap className="w-3.5 h-3.5" /> WR2 SLANT (K)
          </button>
          <button
            onClick={() => throwPass('L')}
            disabled={playPhase !== 'in_pocket'}
            className="px-3.5 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono text-xs font-bold hover:bg-yellow-500/20 transition-colors min-h-[44px] flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Zap className="w-3.5 h-3.5" /> WR3 DEEP (L)
          </button>
        </div>

        {/* Right: Ball Carrier Skill Moves */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => executeCarrierSkill('juke_left')}
            disabled={playPhase !== 'run_after_catch'}
            className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs font-bold hover:bg-white/10 transition-colors min-h-[44px] disabled:opacity-30"
          >
            JUKE L (J)
          </button>
          <button
            onClick={() => executeCarrierSkill('juke_right')}
            disabled={playPhase !== 'run_after_catch'}
            className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs font-bold hover:bg-white/10 transition-colors min-h-[44px] disabled:opacity-30"
          >
            JUKE R (L)
          </button>
          <button
            onClick={() => executeCarrierSkill('truck')}
            disabled={playPhase !== 'run_after_catch' || carrierTurbo < 30}
            className="px-3.5 py-2 rounded-xl bg-[#FF0055]/20 border border-[#FF0055]/40 text-[#FF0055] font-orbitron text-xs font-black uppercase hover:bg-[#FF0055]/30 transition-colors min-h-[44px] disabled:opacity-30"
          >
            🔥 TRUCK (I)
          </button>
        </div>
      </div>
    </div>
  );
};
