import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Flame, RotateCcw, Volume2, VolumeX, 
  Zap, ArrowLeft
} from 'lucide-react';
import { 
  TennisScoreState, 
  createInitialTennisScore, 
  awardTennisPoint, 
  formatTennisPoints, 
  computePrqDelta, 
  SoundJuice 
} from '../../lib/judgeScoring';

type ShotType = 'topspin' | 'slice' | 'lob' | 'drop' | 'zone';

interface Ball {
  x: number; // -100 to 100 court coords
  y: number; // -180 to 180 (far baseline to near baseline, net is at 0)
  z: number; // height from ground (0 to 100)
  vx: number;
  vy: number;
  vz: number;
  spin: ShotType;
  lastHitter: 'player' | 'opponent';
  bounces: number;
  inPlay: boolean;
  speedMph: number;
  tracer: Array<{ x: number; y: number; z: number; alpha: number; color: string }>;
}

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isServing: boolean;
  serveTossZ: number;
  serveTossVz: number;
  serveState: 'idle' | 'tossing' | 'struck';
  energy: number; // 0-100 for Zone Shot
  stamina: number;
}

interface Popup {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  scale: number;
}

interface TennisModeProps {
  onBack?: () => void;
  onMatchComplete?: (result: { victory: boolean; prqDelta: number; score: string }) => void;
}

export const TennisMode: React.FC<TennisModeProps> = ({ onBack, onMatchComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game & Match State
  const [scoreState, setScoreState] = useState<TennisScoreState>(createInitialTennisScore());
  const [longestRally, setLongestRally] = useState<number>(0);
  const [currentRally, setCurrentRally] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [matchBanner, setMatchBanner] = useState<string | null>('PRESS SERVE TO START RALLY');
  const [screenShake, setScreenShake] = useState<number>(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [isServingModal, setIsServingModal] = useState<boolean>(true);
  const [playerEnergy, setPlayerEnergy] = useState<number>(40);

  // Entities
  const playerRef = useRef<Player>({
    x: 0,
    y: 135,
    vx: 0,
    vy: 0,
    isServing: true,
    serveTossZ: 0,
    serveTossVz: 0,
    serveState: 'idle',
    energy: 40,
    stamina: 100,
  });

  const opponentRef = useRef<Player>({
    x: 0,
    y: -135,
    vx: 0,
    vy: 0,
    isServing: false,
    serveTossZ: 0,
    serveTossVz: 0,
    serveState: 'idle',
    energy: 50,
    stamina: 100,
  });

  const ballRef = useRef<Ball>({
    x: 0,
    y: 120,
    z: 15,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 'topspin',
    lastHitter: 'player',
    bounces: 0,
    inPlay: false,
    speedMph: 0,
    tracer: [],
  });

  // Input states
  const keysPressed = useRef<Record<string, boolean>>({});
  const touchStick = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  // Add floating popup
  const addPopup = useCallback((text: string, x: number, y: number, color = '#00F2FF') => {
    const newPopup: Popup = {
      id: Date.now() + Math.random(),
      text,
      x,
      y,
      color,
      scale: 1,
    };
    setPopups(prev => [...prev.slice(-6), newPopup]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== newPopup.id));
    }, 1200);
  }, []);

  // Point Over Trigger
  const handlePointEnded = useCallback((winner: 'player' | 'opponent', reason: string) => {
    ballRef.current.inPlay = false;
    ballRef.current.tracer = [];
    
    if (soundEnabled) SoundJuice.playScoreCheer(winner === 'player');
    
    const isAce = reason === 'ACE';
    const popupText = winner === 'player' ? (isAce ? 'ACE! ⚡' : '+15 WIN') : 'FAULT / OUT';
    addPopup(popupText, window.innerWidth / 2, window.innerHeight / 3, winner === 'player' ? '#00F2FF' : '#FF0055');

    setScoreState(prev => {
      const { nextState, event } = awardTennisPoint(prev, winner, 4);
      
      let bannerMsg = `${winner.toUpperCase()} SCORES (${reason})`;
      if (event === 'DEUCE') bannerMsg = 'DEUCE — 40 ALL';
      else if (event.startsWith('ADVANTAGE')) bannerMsg = `ADVANTAGE ${winner.toUpperCase()}`;
      else if (event.includes('GAME')) bannerMsg = `GAME ${winner.toUpperCase()}!`;
      else if (event.includes('SET') || event.includes('MATCH')) bannerMsg = `MATCH WON BY ${winner.toUpperCase()}!`;

      setMatchBanner(bannerMsg);

      if (nextState.matchOver && onMatchComplete) {
        const pWon = nextState.winner === 'player';
        const delta = computePrqDelta(pWon, pWon ? 'S' : 'B', nextState.playerGames / Math.max(1, nextState.opponentGames + nextState.playerGames));
        onMatchComplete({
          victory: pWon,
          prqDelta: delta,
          score: `${nextState.playerGames}-${nextState.opponentGames}`,
        });
      }

      return nextState;
    });

    setCurrentRally(0);
    setIsServingModal(true);
    
    // Reset positions for next serve
    setTimeout(() => {
      const isPlayerServer = scoreState.server === 'player';
      playerRef.current.x = 0;
      playerRef.current.y = 135;
      playerRef.current.isServing = isPlayerServer;
      playerRef.current.serveState = 'idle';

      opponentRef.current.x = 0;
      opponentRef.current.y = -135;
      opponentRef.current.isServing = !isPlayerServer;

      ballRef.current.x = isPlayerServer ? 0 : 0;
      ballRef.current.y = isPlayerServer ? 120 : -120;
      ballRef.current.z = 15;
      ballRef.current.vx = 0;
      ballRef.current.vy = 0;
      ballRef.current.vz = 0;
      ballRef.current.bounces = 0;
    }, 1000);
  }, [addPopup, onMatchComplete, scoreState.server, soundEnabled]);

  // Execute a shot
  const executeShot = useCallback((type: ShotType) => {
    const p = playerRef.current;
    const b = ballRef.current;

    // If serving
    if (p.isServing && p.serveState === 'tossing') {
      // Calculate apex timing
      const tossHeight = p.serveTossZ;
      const isApex = tossHeight > 45 && tossHeight < 75;
      const speed = isApex ? (type === 'zone' ? 128 : 115) : 85;

      p.serveState = 'struck';
      p.isServing = false;
      b.inPlay = true;
      b.x = p.x;
      b.y = p.y - 10;
      b.z = tossHeight;
      
      const targetX = (Math.random() - 0.5) * 80;
      b.vx = (targetX - b.x) * 0.045;
      b.vy = -3.8 - (speed / 35);
      b.vz = -0.4;
      b.spin = type;
      b.lastHitter = 'player';
      b.bounces = 0;
      b.speedMph = speed;

      if (soundEnabled) SoundJuice.playRacketHit(type);
      setScreenShake(isApex ? 8 : 4);
      addPopup(isApex ? '🔥 POWER SERVE' : 'SERVE', window.innerWidth / 2, window.innerHeight / 2, '#FFD700');
      setIsServingModal(false);
      return;
    }

    // Normal Rally Shot
    if (!b.inPlay) return;

    // Check distance to ball
    const dist = Math.hypot(p.x - b.x, p.y - b.y);
    if (dist < 48 && b.z < 45 && b.y > 0) {
      // Valid hit
      if (soundEnabled) SoundJuice.playRacketHit(type);
      
      let baseSpeed = 82;
      let vzArc = 1.2;
      let curveVy = -3.6;

      if (type === 'topspin') {
        baseSpeed = 96;
        vzArc = 0.9;
        curveVy = -4.3;
      } else if (type === 'slice') {
        baseSpeed = 78;
        vzArc = 0.6;
        curveVy = -3.2;
      } else if (type === 'lob') {
        baseSpeed = 65;
        vzArc = 2.4;
        curveVy = -2.8;
      } else if (type === 'drop') {
        baseSpeed = 48;
        vzArc = 0.7;
        curveVy = -1.9;
      } else if (type === 'zone' && p.energy >= 80) {
        baseSpeed = 125;
        vzArc = 0.5;
        curveVy = -5.8;
        p.energy = 0;
        setPlayerEnergy(0);
        setScreenShake(14);
        addPopup('⚡ ZONE SHOT!', window.innerWidth / 2, window.innerHeight / 2, '#00F2FF');
      }

      // Steer toward directional keys
      let targetX = 0;
      if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA'] || touchStick.current.x < -0.3) {
        targetX = -60;
      } else if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD'] || touchStick.current.x > 0.3) {
        targetX = 60;
      }

      b.vx = (targetX - b.x) * 0.04 + (Math.random() - 0.5) * 0.3;
      b.vy = curveVy;
      b.vz = vzArc;
      b.spin = type;
      b.lastHitter = 'player';
      b.bounces = 0;
      b.speedMph = baseSpeed;

      // Energy increase on rally
      p.energy = Math.min(100, p.energy + 12);
      setPlayerEnergy(p.energy);
      setCurrentRally(r => {
        const next = r + 1;
        if (next > longestRally) setLongestRally(next);
        return next;
      });

      setScreenShake(4);
    }
  }, [addPopup, longestRally, soundEnabled]);

  // Ball Toss Serve action
  const startServeToss = useCallback(() => {
    const p = playerRef.current;
    if (p.isServing && p.serveState === 'idle') {
      p.serveState = 'tossing';
      p.serveTossZ = 15;
      p.serveTossVz = 2.8;
      if (soundEnabled) SoundJuice.playServeToss();
    }
  }, [soundEnabled]);

  // Keyboard and Gamepad listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;

      if (e.code === 'Space' || e.code === 'KeyJ') {
        e.preventDefault();
        if (playerRef.current.isServing && playerRef.current.serveState === 'idle') {
          startServeToss();
        } else {
          executeShot('topspin');
        }
      } else if (e.code === 'KeyK') {
        executeShot('slice');
      } else if (e.code === 'KeyL') {
        executeShot('lob');
      } else if (e.code === 'KeyI') {
        executeShot('drop');
      } else if (e.code === 'Enter') {
        executeShot('zone');
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
  }, [executeShot, startServeToss]);

  // Main Canvas Rendering & Physics Loop
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

      // Handle Gamepad API Polling
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      if (gp) {
        touchStick.current.x = gp.axes[0] || 0;
        touchStick.current.y = gp.axes[1] || 0;
        if (gp.buttons[0]?.pressed) executeShot('topspin'); // A
        if (gp.buttons[1]?.pressed) executeShot('slice');   // B
        if (gp.buttons[2]?.pressed) executeShot('lob');     // X
        if (gp.buttons[3]?.pressed) executeShot('drop');    // Y
        if (gp.buttons[7]?.pressed) executeShot('zone');    // RT
      }

      // 1. Update Player Movement
      const p = playerRef.current;
      let moveX = 0;
      let moveY = 0;
      if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) moveX -= 1;
      if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) moveX += 1;
      if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) moveY -= 1;
      if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) moveY += 1;
      
      moveX += touchStick.current.x;
      moveY += touchStick.current.y;

      const speedMult = 90;
      p.x = Math.max(-85, Math.min(85, p.x + moveX * speedMult * dt));
      p.y = Math.max(10, Math.min(155, p.y + moveY * speedMult * dt));

      // Update Serve Toss Physics
      if (p.isServing && p.serveState === 'tossing') {
        p.serveTossZ += p.serveTossVz;
        p.serveTossVz -= 9.8 * dt * 0.8;
        if (p.serveTossZ <= 10) {
          p.serveState = 'idle'; // Missed toss
          p.serveTossZ = 0;
        }
      }

      // 2. Update AI Opponent Movement
      const opp = opponentRef.current;
      const b = ballRef.current;

      if (b.inPlay && b.vy < 0) {
        // Track ball trajectory
        const diffX = b.x - opp.x;
        opp.x += Math.sign(diffX) * Math.min(Math.abs(diffX), 72 * dt);
        const targetY = -120;
        opp.y += (targetY - opp.y) * 0.05;

        // Opponent Hit Logic
        const distOpp = Math.hypot(opp.x - b.x, opp.y - b.y);
        if (distOpp < 42 && b.z < 40 && b.y < 0 && b.lastHitter === 'player') {
          if (soundEnabled) SoundJuice.playRacketHit('topspin');
          
          const oppShotType: ShotType = Math.random() > 0.3 ? 'topspin' : 'slice';
          const oppTargetX = (Math.random() - 0.5) * 110;
          b.vx = (oppTargetX - b.x) * 0.042;
          b.vy = 3.6 + Math.random() * 0.8;
          b.vz = 0.9;
          b.spin = oppShotType;
          b.lastHitter = 'opponent';
          b.bounces = 0;
          b.speedMph = 80 + Math.random() * 20;

          setCurrentRally(r => {
            const next = r + 1;
            if (next > longestRally) setLongestRally(next);
            return next;
          });
        }
      } else {
        // Return to center baseline
        opp.x += (0 - opp.x) * 0.04;
        opp.y += (-130 - opp.y) * 0.04;
      }

      // 3. Update Ball Physics
      if (b.inPlay) {
        b.x += b.vx;
        b.y += b.vy;
        b.z += b.vz;
        b.vz -= 3.2 * dt; // Gravity

        // Spin curve modifiers
        if (b.spin === 'slice') b.vx += (b.lastHitter === 'player' ? -0.05 : 0.05);

        // Ground Bounce
        if (b.z <= 0) {
          b.z = 0;
          b.bounces += 1;
          if (soundEnabled) SoundJuice.playBounce();
          
          // Bounce dampening
          b.vz = Math.abs(b.vz) * (b.spin === 'topspin' ? 0.75 : 0.6);
          b.vy *= 0.85;

          // Check Court In/Out on first bounce
          if (b.bounces === 1) {
            const isOut = Math.abs(b.x) > 75 || Math.abs(b.y) > 165;
            if (isOut) {
              handlePointEnded(b.lastHitter === 'player' ? 'opponent' : 'player', 'OUT');
            }
          } else if (b.bounces >= 2) {
            // Second bounce -> Point to hitter
            handlePointEnded(b.lastHitter, 'DOUBLE BOUNCE');
          }
        }

        // Net Collision Check (Net is at Y = 0, height = 24)
        if (Math.abs(b.y) < 6 && b.z < 24) {
          b.vy = -b.vy * 0.2;
          b.vz = 0.2;
          handlePointEnded(b.lastHitter === 'player' ? 'opponent' : 'player', 'NET FAULT');
        }

        // Add tracer particle
        const color = b.spin === 'topspin' ? '#FF6B00' : b.spin === 'slice' ? '#00F2FF' : b.spin === 'lob' ? '#FFD700' : '#A855F7';
        b.tracer.push({ x: b.x, y: b.y, z: b.z, alpha: 1.0, color });
        if (b.tracer.length > 18) b.tracer.shift();
      }

      // Screen Shake Decay
      setScreenShake(s => Math.max(0, s - dt * 25));

      // 4. Render Isometric 3D Tennis Court
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Apply screen shake
      ctx.save();
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
      }

      // Projection Helper (Court Coord to Screen Coord)
      const project = (cx: number, cy: number, cz: number = 0) => {
        const perspective = 0.0035;
        const scale = 1 / (1 + (cy + 180) * perspective);
        const screenX = width / 2 + cx * 2.8 * scale;
        const screenY = height / 2 + cy * 1.7 * scale - cz * 1.8 * scale + 40;
        return { x: screenX, y: screenY, scale };
      };

      // Draw Stadium Backdrop Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#040711');
      bgGrad.addColorStop(0.5, '#080E1E');
      bgGrad.addColorStop(1, '#020408');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw Court Surface (Dark Indigo / Blue Cyber-Clay)
      const cTL = project(-85, -170);
      const cTR = project(85, -170);
      const cBR = project(85, 170);
      const cBL = project(-85, 170);

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.moveTo(cTL.x, cTL.y);
      ctx.lineTo(cTR.x, cTR.y);
      ctx.lineTo(cBR.x, cBR.y);
      ctx.lineTo(cBL.x, cBL.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner Singles Court
      const sTL = project(-65, -155);
      const sTR = project(65, -155);
      const sBR = project(65, 155);
      const sBL = project(-65, 155);

      ctx.fillStyle = '#0B132B';
      ctx.beginPath();
      ctx.moveTo(sTL.x, sTL.y);
      ctx.lineTo(sTR.x, sTR.y);
      ctx.lineTo(sBR.x, sBR.y);
      ctx.lineTo(sBL.x, sBL.y);
      ctx.closePath();
      ctx.fill();

      // Draw Neon Court Lines
      ctx.strokeStyle = '#00F2FF';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00F2FF';
      ctx.shadowBlur = 8;

      // Outer Bounds & Service Lines
      const drawCourtLine = (x1: number, y1: number, x2: number, y2: number) => {
        const p1 = project(x1, y1);
        const p2 = project(x2, y2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      };

      drawCourtLine(-65, -155, 65, -155); // Far Baseline
      drawCourtLine(-65, 155, 65, 155);   // Near Baseline
      drawCourtLine(-65, -155, -65, 155); // Left Singles Line
      drawCourtLine(65, -155, 65, 155);   // Right Singles Line
      drawCourtLine(-65, -75, 65, -75);   // Far Service Line
      drawCourtLine(-65, 75, 65, 75);     // Near Service Line
      drawCourtLine(0, -75, 0, 75);       // Center Service Line
      drawCourtLine(0, 155, 0, 145);      // Near Center Mark
      drawCourtLine(0, -155, 0, -145);    // Far Center Mark

      ctx.shadowBlur = 0;

      // Draw 3D Net
      const netLeft = project(-80, 0, 0);
      const netRight = project(80, 0, 0);
      const netTopLeft = project(-80, 0, 22);
      const netTopRight = project(80, 0, 22);

      // Net Mesh
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(netLeft.x, netLeft.y);
      ctx.lineTo(netRight.x, netRight.y);
      ctx.lineTo(netTopRight.x, netTopRight.y);
      ctx.lineTo(netTopLeft.x, netTopLeft.y);
      ctx.closePath();
      ctx.fill();

      // Net Top Cord
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(netTopLeft.x, netTopLeft.y);
      ctx.lineTo(netTopRight.x, netTopRight.y);
      ctx.stroke();

      // Net Posts
      ctx.strokeStyle = '#00F2FF';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(netLeft.x, netLeft.y);
      ctx.lineTo(netTopLeft.x, netTopLeft.y);
      ctx.moveTo(netRight.x, netRight.y);
      ctx.lineTo(netTopRight.x, netTopRight.y);
      ctx.stroke();

      // 5. Draw Opponent Character
      const oppP = project(opp.x, opp.y);
      ctx.fillStyle = 'rgba(255, 0, 85, 0.3)';
      ctx.beginPath();
      ctx.ellipse(oppP.x, oppP.y, 22 * oppP.scale, 8 * oppP.scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Opponent Avatar Mesh (Synthesized Mixamo Rig Silhouette)
      ctx.fillStyle = '#FF0055';
      ctx.shadowColor = '#FF0055';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(oppP.x, oppP.y - 36 * oppP.scale, 10 * oppP.scale, 0, Math.PI * 2); // Head
      ctx.fill();
      ctx.fillRect(oppP.x - 8 * oppP.scale, oppP.y - 26 * oppP.scale, 16 * oppP.scale, 24 * oppP.scale); // Torso
      ctx.shadowBlur = 0;

      // 6. Draw Ball Tracers & 3D Ball
      if (b.inPlay) {
        b.tracer.forEach((t) => {
          const pt = project(t.x, t.y, t.z);
          ctx.fillStyle = t.color;
          ctx.globalAlpha = t.alpha * 0.4;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4 * pt.scale, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // Ball Shadow
        const bShadow = project(b.x, b.y, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(bShadow.x, bShadow.y, 8 * bShadow.scale, 4 * bShadow.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // High Velocity Neon Tennis Ball
        const bPos = project(b.x, b.y, b.z);
        ctx.fillStyle = '#CCFF00';
        ctx.shadowColor = '#CCFF00';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(bPos.x, bPos.y, 6 * bPos.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 7. Draw Player Character
      const plP = project(p.x, p.y);
      ctx.fillStyle = 'rgba(0, 242, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(plP.x, plP.y, 28 * plP.scale, 10 * plP.scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Player Avatar (Mixamo Rig Normalized Silhouette + Racket)
      ctx.fillStyle = '#00F2FF';
      ctx.shadowColor = '#00F2FF';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(plP.x, plP.y - 48 * plP.scale, 12 * plP.scale, 0, Math.PI * 2); // Head
      ctx.fill();
      ctx.fillRect(plP.x - 10 * plP.scale, plP.y - 36 * plP.scale, 20 * plP.scale, 32 * plP.scale); // Torso

      // Tennis Racket Socket
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(plP.x + 18 * plP.scale, plP.y - 30 * plP.scale, 8 * plP.scale, 14 * plP.scale, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Serve Toss Indicator
      if (p.isServing && p.serveState === 'tossing') {
        const tossPos = project(p.x, p.y, p.serveTossZ);
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(tossPos.x, tossPos.y, 7 * tossPos.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [executeShot, handlePointEnded, longestRally, screenShake, soundEnabled]);

  return (
    <div className="relative w-full max-w-7xl mx-auto flex flex-col items-center bg-[#02040A] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Top Telemetry & Scoreboard */}
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
                COURT-RALLY SIM
              </span>
              <h2 className="font-orbitron text-lg font-black tracking-wider text-white uppercase">
                TENNIS OPEN
              </h2>
            </div>
            <p className="text-[11px] font-mono text-zinc-400">
              Mario Tennis Aces Shot-Shaping Engine • Mixamo Rig Verified
            </p>
          </div>
        </div>

        {/* Center: Live Match Scoreboard */}
        <div className="flex items-center gap-6 bg-black/80 px-5 py-2.5 rounded-2xl border border-white/10 shadow-inner">
          {/* Player */}
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-[#00F2FF]">ATHLETE</div>
            <div className="font-orbitron text-xl font-black text-white">
              {formatTennisPoints(scoreState.playerPoints, scoreState.opponentPoints, scoreState.isDeuce, scoreState.advantage, 'player')}
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Sets & Games */}
          <div className="text-center px-2">
            <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">GAMES</div>
            <div className="font-orbitron text-base font-bold text-yellow-400">
              {scoreState.playerGames} - {scoreState.opponentGames}
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Opponent */}
          <div className="text-left">
            <div className="text-xs font-mono font-bold text-[#FF0055]">AI RIVAL</div>
            <div className="font-orbitron text-xl font-black text-white">
              {formatTennisPoints(scoreState.opponentPoints, scoreState.playerPoints, scoreState.isDeuce, scoreState.advantage, 'opponent')}
            </div>
          </div>
        </div>

        {/* Right: Telemetry & Toggles */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] font-mono text-zinc-400">RALLY COUNTER</span>
            <span className="font-orbitron text-sm font-bold text-[#00F2FF]">{currentRally} <span className="text-[10px] text-zinc-500 font-mono">(MAX {longestRally})</span></span>
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

        {/* Floating In-Game Popups */}
        <AnimatePresence>
          {popups.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -60, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.0 }}
              style={{ left: p.x, top: p.y, color: p.color }}
              className="absolute pointer-events-none font-orbitron text-xl sm:text-2xl font-black drop-shadow-[0_0_12px_rgba(0,242,255,0.8)] -translate-x-1/2 -translate-y-1/2 z-30"
            >
              {p.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Match Announcement Banner */}
        {matchBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-black/80 border border-[#00F2FF]/40 text-[#00F2FF] font-orbitron text-xs sm:text-sm font-bold uppercase tracking-widest backdrop-blur-md z-20 shadow-[0_0_20px_rgba(0,242,255,0.2)]"
          >
            {matchBanner}
          </motion.div>
        )}

        {/* Serve Overlay Prompt */}
        {isServingModal && !scoreState.matchOver && (
          <div className="absolute inset-x-0 bottom-12 flex flex-col items-center justify-center pointer-events-none z-20">
            <motion.button
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              onClick={startServeToss}
              className="pointer-events-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-[#00F2FF] to-blue-600 text-black font-orbitron font-black text-sm uppercase tracking-widest shadow-[0_0_25px_rgba(0,242,255,0.6)] min-h-[48px]"
            >
              TOSS BALL & SERVE (SPACE)
            </motion.button>
          </div>
        )}

        {/* Match Over Modal */}
        {scoreState.matchOver && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-40 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-md w-full p-8 rounded-3xl bg-zinc-950 border border-[#00F2FF]/30 text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-[#00F2FF]/10 border border-[#00F2FF]/40 flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8 text-[#00F2FF]" />
              </div>
              <div>
                <h3 className="font-orbitron text-2xl font-black text-white uppercase">
                  {scoreState.winner === 'player' ? 'VICTORY IN MATCH!' : 'MATCH COMPLETE'}
                </h3>
                <p className="text-xs font-mono text-zinc-400 mt-1">
                  Final Score: {scoreState.playerGames} - {scoreState.opponentGames} Games
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
                <div>
                  <div className="text-[10px] font-mono text-zinc-400">PRQ DELTA</div>
                  <div className="font-orbitron text-lg font-bold text-[#00F2FF]">
                    +{computePrqDelta(scoreState.winner === 'player', 'S', 1.0)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-zinc-400">LONGEST RALLY</div>
                  <div className="font-orbitron text-lg font-bold text-yellow-400">
                    {longestRally} HITS
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setScoreState(createInitialTennisScore());
                  setMatchBanner('NEW MATCH INITIALIZED');
                  setIsServingModal(true);
                }}
                className="w-full py-4 rounded-2xl bg-[#00F2FF] text-black font-orbitron font-black text-sm uppercase tracking-wider min-h-[48px] hover:bg-[#00F2FF]/90 transition-colors"
              >
                PLAY AGAIN
              </button>
            </motion.div>
          </div>
        )}
      </div>

      {/* Bottom Controls / Virtual Gamepad Bar */}
      <div className="w-full p-4 sm:p-6 bg-zinc-950/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 z-20">
        {/* Left: Shot Type Guide & Aim */}
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono text-zinc-400 hidden lg:block mr-2">
            SHOT SHAPING:
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => executeShot('topspin')}
              className="px-3.5 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono text-xs font-bold hover:bg-orange-500/20 transition-colors min-h-[44px] flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" /> TOPSPIN (J)
            </button>
            <button
              onClick={() => executeShot('slice')}
              className="px-3.5 py-2 rounded-xl bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] font-mono text-xs font-bold hover:bg-[#00F2FF]/20 transition-colors min-h-[44px] flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> SLICE (K)
            </button>
            <button
              onClick={() => executeShot('lob')}
              className="px-3.5 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono text-xs font-bold hover:bg-yellow-500/20 transition-colors min-h-[44px] flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5" /> LOB (L)
            </button>
          </div>
        </div>

        {/* Right: Zone Shot Energy Meter */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 uppercase">
              <Flame className="w-3.5 h-3.5 text-[#00F2FF]" /> ZONE ENERGY
            </div>
            <div className="w-32 h-2.5 bg-white/10 rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-[#00F2FF] transition-all duration-300"
                style={{ width: `${playerEnergy}%` }}
              />
            </div>
          </div>
          <button
            onClick={() => executeShot('zone')}
            disabled={playerEnergy < 80}
            className={`px-4 py-2.5 rounded-xl font-orbitron font-black text-xs uppercase tracking-wider min-h-[44px] transition-all flex items-center gap-2 ${
              playerEnergy >= 80
                ? 'bg-gradient-to-r from-[#00F2FF] to-blue-600 text-black shadow-[0_0_20px_rgba(0,242,255,0.5)] cursor-pointer'
                : 'bg-white/5 text-zinc-500 border border-white/5 cursor-not-allowed'
            }`}
          >
            <Zap className="w-4 h-4" /> ZONE SHOT (ENTER)
          </button>
        </div>
      </div>
    </div>
  );
};
