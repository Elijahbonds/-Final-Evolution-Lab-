import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, 
  Flame, Music, Disc, Play, Pause
} from 'lucide-react';
import { 
  DanceScoreState, 
  createInitialDanceScore, 
  recordDanceNoteHit, 
  SoundJuice 
} from '../../lib/judgeScoring';

interface DanceTrack {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  difficulty: 'EASY' | 'MEDIUM' | 'EXPERT';
  color: string;
  description: string;
  notes: Array<{
    id: number;
    beat: number; // 0, 1, 2, 2.5, 3...
    lane: 0 | 1 | 2 | 3; // 0: Left, 1: Down, 2: Up, 3: Right
  }>;
}

const LANES = [
  { id: 0, key: 'ArrowLeft', altKey: 'a', label: 'LEFT', symbol: '←', color: 'from-pink-500 to-rose-500', glow: 'rgba(244,63,94,0.6)' },
  { id: 1, key: 'ArrowDown', altKey: 's', label: 'DOWN', symbol: '↓', color: 'from-cyan-500 to-blue-500', glow: 'rgba(6,182,212,0.6)' },
  { id: 2, key: 'ArrowUp', altKey: 'w', label: 'UP', symbol: '↑', color: 'from-emerald-500 to-teal-500', glow: 'rgba(16,185,129,0.6)' },
  { id: 3, key: 'ArrowRight', altKey: 'd', label: 'RIGHT', symbol: '→', color: 'from-amber-500 to-orange-500', glow: 'rgba(245,158,11,0.6)' },
];

const TRACK_PRESETS: DanceTrack[] = [
  {
    id: 'cyber-pulse',
    title: 'NEON CYBER PULSE',
    artist: 'SYNTH MATRIX',
    bpm: 128,
    difficulty: 'MEDIUM',
    color: '#06b6d4',
    description: 'Energetic electro synth wave with rolling bass and crisp 4-on-the-floor kick cadence.',
    notes: [
      { id: 1, beat: 4, lane: 0 },
      { id: 2, beat: 5, lane: 1 },
      { id: 3, beat: 6, lane: 2 },
      { id: 4, beat: 7, lane: 3 },
      { id: 5, beat: 8, lane: 0 },
      { id: 6, beat: 8.5, lane: 1 },
      { id: 7, beat: 9, lane: 2 },
      { id: 8, beat: 10, lane: 3 },
      { id: 9, beat: 11, lane: 1 },
      { id: 10, beat: 12, lane: 0 },
      { id: 11, beat: 12.5, lane: 2 },
      { id: 12, beat: 13, lane: 3 },
      { id: 13, beat: 14, lane: 1 },
      { id: 14, beat: 15, lane: 0 },
      { id: 15, beat: 16, lane: 3 },
      { id: 16, beat: 16.5, lane: 2 },
      { id: 17, beat: 17, lane: 1 },
      { id: 18, beat: 18, lane: 0 },
      { id: 19, beat: 19, lane: 2 },
      { id: 20, beat: 20, lane: 3 },
      { id: 21, beat: 21, lane: 0 },
      { id: 22, beat: 21.5, lane: 1 },
      { id: 23, beat: 22, lane: 2 },
      { id: 24, beat: 23, lane: 3 },
      { id: 25, beat: 24, lane: 1 },
      { id: 26, beat: 25, lane: 0 },
      { id: 27, beat: 26, lane: 3 },
      { id: 28, beat: 27, lane: 2 },
      { id: 29, beat: 28, lane: 0 },
      { id: 30, beat: 28.5, lane: 1 },
      { id: 31, beat: 29, lane: 2 },
      { id: 32, beat: 30, lane: 3 },
      { id: 33, beat: 31, lane: 1 },
      { id: 34, beat: 32, lane: 0 },
      { id: 35, beat: 33, lane: 3 },
      { id: 36, beat: 34, lane: 2 },
      { id: 37, beat: 35, lane: 1 },
      { id: 38, beat: 36, lane: 0 },
      { id: 39, beat: 37, lane: 3 },
      { id: 40, beat: 38, lane: 2 },
      { id: 41, beat: 39, lane: 1 },
      { id: 42, beat: 40, lane: 0 },
    ],
  },
  {
    id: 'tokyo-speed',
    title: 'HYPER SONIC EURO',
    artist: 'DRIFT STAR 99',
    bpm: 155,
    difficulty: 'EXPERT',
    color: '#ec4899',
    description: 'High-octane eurobeat dance anthem packed with rapid 16th stream crossovers and double steps.',
    notes: [
      { id: 1, beat: 4, lane: 0 },
      { id: 2, beat: 4.5, lane: 1 },
      { id: 3, beat: 5, lane: 2 },
      { id: 4, beat: 5.5, lane: 3 },
      { id: 5, beat: 6, lane: 0 },
      { id: 6, beat: 6.5, lane: 2 },
      { id: 7, beat: 7, lane: 1 },
      { id: 8, beat: 7.5, lane: 3 },
      { id: 9, beat: 8, lane: 0 },
      { id: 10, beat: 8.5, lane: 3 },
      { id: 11, beat: 9, lane: 1 },
      { id: 12, beat: 9.5, lane: 2 },
      { id: 13, beat: 10, lane: 0 },
      { id: 14, beat: 10.5, lane: 1 },
      { id: 15, beat: 11, lane: 2 },
      { id: 16, beat: 11.5, lane: 3 },
      { id: 17, beat: 12, lane: 0 },
      { id: 18, beat: 13, lane: 3 },
      { id: 19, beat: 14, lane: 1 },
      { id: 20, beat: 14.5, lane: 2 },
      { id: 21, beat: 15, lane: 0 },
      { id: 22, beat: 15.5, lane: 3 },
      { id: 23, beat: 16, lane: 1 },
      { id: 24, beat: 17, lane: 2 },
      { id: 25, beat: 18, lane: 0 },
      { id: 26, beat: 18.5, lane: 1 },
      { id: 27, beat: 19, lane: 2 },
      { id: 28, beat: 19.5, lane: 3 },
      { id: 29, beat: 20, lane: 0 },
      { id: 30, beat: 21, lane: 3 },
      { id: 31, beat: 22, lane: 1 },
      { id: 32, beat: 23, lane: 2 },
      { id: 33, beat: 24, lane: 0 },
      { id: 34, beat: 24.5, lane: 1 },
      { id: 35, beat: 25, lane: 2 },
      { id: 36, beat: 25.5, lane: 3 },
      { id: 37, beat: 26, lane: 1 },
      { id: 38, beat: 27, lane: 0 },
      { id: 39, beat: 28, lane: 3 },
      { id: 40, beat: 29, lane: 2 },
      { id: 41, beat: 30, lane: 1 },
      { id: 42, beat: 31, lane: 0 },
      { id: 43, beat: 32, lane: 3 },
      { id: 44, beat: 33, lane: 2 },
      { id: 45, beat: 34, lane: 1 },
      { id: 46, beat: 35, lane: 0 },
      { id: 47, beat: 36, lane: 3 },
    ],
  },
  {
    id: 'groove-lounge',
    title: 'LO-FI DISCO CHILL',
    artist: 'VELVET GROOVE',
    bpm: 105,
    difficulty: 'EASY',
    color: '#10b981',
    description: 'Smooth funky rhythm with forgiving timing windows and soulful melodic chords.',
    notes: [
      { id: 1, beat: 4, lane: 0 },
      { id: 2, beat: 6, lane: 1 },
      { id: 3, beat: 8, lane: 2 },
      { id: 4, beat: 10, lane: 3 },
      { id: 5, beat: 12, lane: 0 },
      { id: 6, beat: 14, lane: 1 },
      { id: 7, beat: 16, lane: 2 },
      { id: 8, beat: 18, lane: 3 },
      { id: 9, beat: 20, lane: 1 },
      { id: 10, beat: 22, lane: 2 },
      { id: 11, beat: 24, lane: 0 },
      { id: 12, beat: 26, lane: 3 },
      { id: 13, beat: 28, lane: 1 },
      { id: 14, beat: 30, lane: 2 },
      { id: 15, beat: 32, lane: 0 },
      { id: 16, beat: 34, lane: 3 },
    ],
  },
];

interface GymnasticsModeProps {
  onBack: () => void;
}

export function DanceRhythmMode({ onBack }: GymnasticsModeProps) {
  const [selectedTrack, setSelectedTrack] = useState<DanceTrack>(TRACK_PRESETS[0]);
  const [gameState, setGameState] = useState<'SELECT' | 'PLAYING' | 'PAUSED' | 'RESULTS'>('SELECT');
  const [danceScore, setDanceScore] = useState<DanceScoreState>(() => createInitialDanceScore());
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Timing / Engine refs
  const audioContextStarted = useRef(false);
  const startTimeRef = useRef<number>(0);
  const currentBeatRef = useRef<number>(0);
  const lastProcessedBeatRef = useRef<number>(-1);
  const activeKeysRef = useRef<Record<number, boolean>>({ 0: false, 1: false, 2: false, 3: false });
  const [activeLaneVisual, setActiveLaneVisual] = useState<Record<number, boolean>>({ 0: false, 1: false, 2: false, 3: false });
  
  // Floating Judgment Popups & Visual FX
  const [latestJudgment, setLatestJudgment] = useState<{
    text: string;
    color: string;
    sub: string;
    key: number;
  } | null>(null);

  // Character dancer animation frame
  const [dancerPose, setDancerPose] = useState<number>(0); // 0: Idle, 1: Left, 2: Down, 3: Up, 4: Right, 5: Spin

  // Process note hits
  const noteProcessedRef = useRef<Record<number, boolean>>({});

  // Canvas visualizer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sound trigger helper
  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) {
      fn();
    }
  }, [soundEnabled]);

  // Start Playing Routine
  const startRoutine = useCallback((track: DanceTrack) => {
    setSelectedTrack(track);
    setDanceScore(createInitialDanceScore(track.title, track.artist, track.bpm, track.notes.length));
    noteProcessedRef.current = {};
    startTimeRef.current = performance.now();
    currentBeatRef.current = 0;
    lastProcessedBeatRef.current = -1;
    setGameState('PLAYING');
    audioContextStarted.current = true;
    playSfx(() => SoundJuice.playFeverActivated());
  }, [playSfx]);

  // Trigger judgment on Lane Tap
  const handleLaneInput = useCallback((laneIndex: number) => {
    if (gameState !== 'PLAYING') return;

    // Visual lane strike
    setActiveLaneVisual(prev => ({ ...prev, [laneIndex]: true }));
    setTimeout(() => {
      setActiveLaneVisual(prev => ({ ...prev, [laneIndex]: false }));
    }, 120);

    const currentBeat = currentBeatRef.current;
    
    // Find closest unhit note in this lane within hit window (+/- 0.65 beats)
    const availableNotes = selectedTrack.notes.filter(
      n => n.lane === laneIndex && !noteProcessedRef.current[n.id]
    );

    if (availableNotes.length === 0) return;

    // Find closest
    let closestNote = availableNotes[0];
    let minDiff = Math.abs(currentBeat - closestNote.beat);

    for (let i = 1; i < availableNotes.length; i++) {
      const diff = Math.abs(currentBeat - availableNotes[i].beat);
      if (diff < minDiff) {
        minDiff = diff;
        closestNote = availableNotes[i];
      }
    }

    // Timing window evaluation (converted from beats to timing quality)
    // At 130 BPM, 1 beat = 461ms.
    // Marvelous: <= 0.12 beats (~55ms)
    // Perfect: <= 0.25 beats (~115ms)
    // Great: <= 0.40 beats (~185ms)
    // Good: <= 0.60 beats (~275ms)
    // Miss: > 0.60 beats
    if (minDiff <= 0.60) {
      noteProcessedRef.current[closestNote.id] = true;
      let judgment: 'marvelous' | 'perfect' | 'great' | 'good' = 'good';
      let judgmentColor = '#3b82f6';
      let popupText = 'GOOD';

      if (minDiff <= 0.14) {
        judgment = 'marvelous';
        judgmentColor = '#facc15';
        popupText = 'MARVELOUS!!';
      } else if (minDiff <= 0.28) {
        judgment = 'perfect';
        judgmentColor = '#10b981';
        popupText = 'PERFECT!';
      } else if (minDiff <= 0.45) {
        judgment = 'great';
        judgmentColor = '#06b6d4';
        popupText = 'GREAT';
      }

      playSfx(() => SoundJuice.playNoteHit(judgment));
      setDancerPose(laneIndex + 1);

      setLatestJudgment({
        text: popupText,
        color: judgmentColor,
        sub: `${Math.round(minDiff * (60000 / selectedTrack.bpm))}ms OFFSET`,
        key: Date.now(),
      });

      setDanceScore(prev => {
        const next = recordDanceNoteHit(prev, judgment);
        if (next.routineComplete) {
          setTimeout(() => setGameState('RESULTS'), 800);
        }
        return next;
      });
    }
  }, [gameState, selectedTrack, playSfx]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      LANES.forEach(lane => {
        if (e.key === lane.key || e.key.toLowerCase() === lane.altKey) {
          e.preventDefault();
          if (!activeKeysRef.current[lane.id]) {
            activeKeysRef.current[lane.id] = true;
            handleLaneInput(lane.id);
          }
        }
      });

      if (e.key === ' ' || e.key === 'Escape') {
        if (gameState === 'PLAYING') {
          setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
          setGameState('PLAYING');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      LANES.forEach(lane => {
        if (e.key === lane.key || e.key.toLowerCase() === lane.altKey) {
          activeKeysRef.current[lane.id] = false;
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, handleLaneInput]);

  // Beat Synthesizer & Note Highway Main Loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      if (gameState === 'PLAYING') {
        const elapsedSec = (performance.now() - startTimeRef.current) / 1000;
        const beatsPerSec = selectedTrack.bpm / 60;
        const currentBeat = elapsedSec * beatsPerSec;
        currentBeatRef.current = currentBeat;

        // Metronome / Audio Synth Beat Quantization
        const currentIntegerBeat = Math.floor(currentBeat);
        if (currentIntegerBeat > lastProcessedBeatRef.current && currentIntegerBeat >= 4) {
          lastProcessedBeatRef.current = currentIntegerBeat;
          // Beat kick drum on 1 & 3, snare on 2 & 4
          const measureBeat = currentIntegerBeat % 4;
          if (measureBeat === 0 || measureBeat === 2) {
            playSfx(() => SoundJuice.playBeatDrum('kick'));
          } else {
            playSfx(() => SoundJuice.playBeatDrum('snare'));
          }

          // Ambient synth pulse
          if (currentIntegerBeat % 2 === 0) {
            playSfx(() => SoundJuice.playBeatDrum('synth'));
          }
        }

        // Check for missed notes that scrolled past bottom target line (beat + 0.65)
        selectedTrack.notes.forEach(note => {
          if (!noteProcessedRef.current[note.id] && currentBeat > note.beat + 0.65) {
            noteProcessedRef.current[note.id] = true;
            playSfx(() => SoundJuice.playNoteHit('miss'));
            setLatestJudgment({
              text: 'MISS',
              color: '#ef4444',
              sub: 'PASSED TARGET',
              key: Date.now(),
            });
            setDanceScore(prev => {
              const next = recordDanceNoteHit(prev, 'miss');
              if (next.routineComplete) {
                setTimeout(() => setGameState('RESULTS'), 800);
              }
              return next;
            });
          }
        });

        // Check if finished track
        const lastNote = selectedTrack.notes[selectedTrack.notes.length - 1];
        if (currentBeat > lastNote.beat + 3.0) {
          setGameState('RESULTS');
        }
      }

      // Draw Canvas 3D Note Highway & Neon Cyber Stage
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // Clear stage
          ctx.fillStyle = '#05070f';
          ctx.fillRect(0, 0, width, height);

          // Perspective Highway Trapezoid
          const topWidth = width * 0.42;
          const bottomWidth = width * 0.76;
          const topY = 40;
          const bottomY = height - 70;
          const targetY = bottomY - 30;

          // Draw Highway Background
          ctx.save();
          const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
          grad.addColorStop(0, 'rgba(15, 23, 42, 0.4)');
          grad.addColorStop(1, 'rgba(30, 41, 59, 0.85)');
          ctx.fillStyle = grad;

          ctx.beginPath();
          ctx.moveTo((width - topWidth) / 2, topY);
          ctx.lineTo((width + topWidth) / 2, topY);
          ctx.lineTo((width + bottomWidth) / 2, bottomY);
          ctx.lineTo((width - bottomWidth) / 2, bottomY);
          ctx.closePath();
          ctx.fill();

          // Border neon lasers
          ctx.strokeStyle = selectedTrack.color;
          ctx.lineWidth = 3;
          ctx.shadowColor = selectedTrack.color;
          ctx.shadowBlur = 15;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Lane dividing lines (4 lanes -> 3 dividers)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1.5;
          for (let i = 1; i <= 3; i++) {
            const tX = (width - topWidth) / 2 + (topWidth / 4) * i;
            const bX = (width - bottomWidth) / 2 + (bottomWidth / 4) * i;
            ctx.beginPath();
            ctx.moveTo(tX, topY);
            ctx.lineTo(bX, bottomY);
            ctx.stroke();
          }

          // Target Receptor Line
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 10;
          const targetT = (targetY - topY) / (bottomY - topY);
          const curTargetWidth = topWidth + (bottomWidth - topWidth) * targetT;
          const targetStartX = (width - curTargetWidth) / 2;
          ctx.beginPath();
          ctx.moveTo(targetStartX, targetY);
          ctx.lineTo(targetStartX + curTargetWidth, targetY);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Draw 4 Lane Target Receptors
          for (let lane = 0; lane < 4; lane++) {
            const laneCenterRatio = (lane + 0.5) / 4;
            const laneX = targetStartX + curTargetWidth * laneCenterRatio;
            const isLaneActive = activeLaneVisual[lane];

            ctx.save();
            ctx.translate(laneX, targetY);

            // Outer Receptor Circle / Square
            ctx.beginPath();
            ctx.arc(0, 0, 24, 0, Math.PI * 2);
            ctx.strokeStyle = isLaneActive ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = isLaneActive ? 4 : 2;
            if (isLaneActive) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
              ctx.fill();
              ctx.shadowColor = '#ffffff';
              ctx.shadowBlur = 20;
            }
            ctx.stroke();

            // Arrow Symbol
            ctx.fillStyle = isLaneActive ? '#ffffff' : 'rgba(255, 255, 255, 0.8)';
            ctx.font = 'bold 22px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(LANES[lane].symbol, 0, 0);
            ctx.restore();
          }

          // Draw Falling Notes along Highway Perspective
          if (gameState === 'PLAYING' || gameState === 'PAUSED') {
            const currentBeat = currentBeatRef.current;
            const scrollSpeedBeats = 3.5; // Visible window is 3.5 beats ahead

            selectedTrack.notes.forEach(note => {
              if (noteProcessedRef.current[note.id]) return;

              const beatsUntilHit = note.beat - currentBeat;
              if (beatsUntilHit > scrollSpeedBeats || beatsUntilHit < -0.6) return;

              // Normalized highway position (0 = top spawn, 1 = target receptor line)
              const t = 1.0 - beatsUntilHit / scrollSpeedBeats;
              if (t < 0 || t > 1.2) return;

              const noteY = topY + (targetY - topY) * t;
              const currentHighwayWidth = topWidth + (bottomWidth - topWidth) * ((noteY - topY) / (bottomY - topY));
              const currentHighwayStartX = (width - currentHighwayWidth) / 2;
              const laneX = currentHighwayStartX + currentHighwayWidth * ((note.lane + 0.5) / 4);

              // Note size scales with depth
              const radius = 10 + 16 * t;

              ctx.save();
              ctx.translate(laneX, noteY);

              // Glowing Note Circle
              const noteColor = LANES[note.lane].color.includes('pink') ? '#f43f5e' :
                               LANES[note.lane].color.includes('cyan') ? '#06b6d4' :
                               LANES[note.lane].color.includes('emerald') ? '#10b981' : '#f59e0b';

              ctx.shadowColor = noteColor;
              ctx.shadowBlur = 12 * t;

              ctx.beginPath();
              ctx.arc(0, 0, radius, 0, Math.PI * 2);
              ctx.fillStyle = noteColor;
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2 * t;
              ctx.stroke();

              // Arrow text on note
              ctx.fillStyle = '#ffffff';
              ctx.font = `bold ${Math.round(14 + 8 * t)}px monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(LANES[note.lane].symbol, 0, 0);

              ctx.restore();
            });
          }

          // Cyber Dancer Side Avatars (Left & Right Stage)
          const leftStageX = width * 0.12;
          const rightStageX = width * 0.88;
          const stageFloorY = height - 90;

          // Draw Cyber Dancer Figure (Silhouette + Neon Wireframe)
          const drawDancer = (x: number, flip: boolean) => {
            ctx.save();
            ctx.translate(x, stageFloorY);
            if (flip) ctx.scale(-1, 1);

            // Shadow
            ctx.beginPath();
            ctx.ellipse(0, 0, 28, 8, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fill();

            // Dynamic Pose Shift
            const bounce = Math.sin(currentBeatRef.current * Math.PI * 2) * 6;
            const legOffset = dancerPose === 1 ? -12 : dancerPose === 4 ? 12 : 0;
            const armAngle = dancerPose === 3 ? -Math.PI / 4 : dancerPose === 2 ? Math.PI / 4 : 0;

            // Legs
            ctx.strokeStyle = selectedTrack.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-6 + legOffset, -30 + bounce);
            ctx.lineTo(0, -50 + bounce);
            ctx.lineTo(6 - legOffset, -30 + bounce);
            ctx.lineTo(10, 0);
            ctx.stroke();

            // Torso
            ctx.beginPath();
            ctx.moveTo(0, -50 + bounce);
            ctx.lineTo(0, -85 + bounce);
            ctx.stroke();

            // Arms
            ctx.beginPath();
            ctx.moveTo(-18, -75 + bounce + armAngle * 10);
            ctx.lineTo(0, -80 + bounce);
            ctx.lineTo(18, -75 + bounce - armAngle * 10);
            ctx.stroke();

            // Glowing Head
            ctx.beginPath();
            ctx.arc(0, -96 + bounce, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = selectedTrack.color;
            ctx.shadowBlur = 10;
            ctx.fill();

            ctx.restore();
          };

          drawDancer(leftStageX, false);
          drawDancer(rightStageX, true);

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, selectedTrack, activeLaneVisual, playSfx, dancerPose]);

  return (
    <div className="relative w-full max-w-7xl mx-auto flex flex-col items-center bg-[#030712] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Top Header Bar */}
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
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30">
                PHASE 7 — RHYTHM/UI
              </span>
              <span className="text-xs font-mono text-zinc-400">BEAT-MATCHING ENGINE</span>
            </div>
            <h1 className="font-orbitron text-lg font-black text-white tracking-wide flex items-center gap-2">
              <Music className="w-5 h-5 text-pink-400 animate-pulse" />
              CYBER DANCE REVOLUTION
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled ? 'bg-pink-500/20 border-pink-500/40 text-pink-300' : 'bg-white/5 border-white/10 text-zinc-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {gameState === 'PLAYING' && (
            <button
              onClick={() => setGameState('PAUSED')}
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs font-bold hover:bg-white/20 flex items-center gap-1.5"
            >
              <Pause className="w-4 h-4" /> PAUSE
            </button>
          )}

          {gameState === 'PAUSED' && (
            <button
              onClick={() => setGameState('PLAYING')}
              className="px-4 py-2 rounded-xl bg-pink-500 text-black font-mono text-xs font-black hover:bg-pink-400 flex items-center gap-1.5"
            >
              <Play className="w-4 h-4" /> RESUME
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="relative w-full min-h-[620px] flex flex-col items-center justify-between p-6 overflow-hidden">
        {/* Track Selection Mode */}
        {gameState === 'SELECT' && (
          <div className="w-full max-w-4xl flex flex-col items-center my-auto z-10">
            <div className="text-center mb-8">
              <span className="text-xs font-mono font-bold tracking-widest text-pink-400 uppercase">
                CREATOR LOFT // DANCE BENCHMARK
              </span>
              <h2 className="font-orbitron text-3xl md:text-4xl font-black text-white mt-1">
                CHOOSE YOUR BEAT TRACK
              </h2>
              <p className="text-sm font-mono text-zinc-400 mt-2 max-w-lg mx-auto">
                Hit the 4-lane directional keys in rhythm with the synth beat. Build combos, activate Fever Mode, and hit Marvelous timings!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8">
              {TRACK_PRESETS.map(track => {
                const isSelected = selectedTrack.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => setSelectedTrack(track)}
                    className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${
                      isSelected
                        ? 'bg-zinc-900/90 border-pink-500 shadow-[0_0_25px_rgba(244,63,94,0.3)] scale-105'
                        : 'bg-zinc-950/60 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          track.difficulty === 'EXPERT' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                          track.difficulty === 'MEDIUM' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' :
                          'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        }`}>
                          {track.difficulty}
                        </span>
                        <span className="text-xs font-mono text-zinc-400 flex items-center gap-1 font-bold">
                          <Disc className="w-3.5 h-3.5 text-pink-400" /> {track.bpm} BPM
                        </span>
                      </div>

                      <h3 className="font-orbitron font-black text-base text-white">{track.title}</h3>
                      <p className="text-xs font-mono text-pink-400/90 font-bold mb-2">{track.artist}</p>
                      <p className="text-xs font-mono text-zinc-400 leading-relaxed">{track.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                      <span>{track.notes.length} NOTES</span>
                      <span className="text-pink-400 font-bold">SELECT TRACK</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => startRoutine(selectedTrack)}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white font-orbitron font-black text-base tracking-wider hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(244,63,94,0.4)] flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" /> START DANCE ROUTINE
            </button>
          </div>
        )}

        {/* Active Highway Canvas & Live HUD */}
        {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
          <div className="relative w-full flex flex-col items-center">
            {/* Live Scoreboard Header */}
            <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 z-10">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/10 flex flex-col">
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">SCORE</span>
                <span className="font-orbitron text-xl font-black text-white">
                  {danceScore.score.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/10 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">COMBO</span>
                  {danceScore.feverActive && (
                    <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" /> FEVER
                    </span>
                  )}
                </div>
                <span className={`font-orbitron text-xl font-black ${danceScore.combo > 10 ? 'text-amber-400' : 'text-white'}`}>
                  {danceScore.combo} <span className="text-xs font-mono font-normal text-zinc-500">x{danceScore.multiplier}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/10 flex flex-col">
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">ACCURACY</span>
                <span className="font-orbitron text-xl font-black text-cyan-400">
                  {danceScore.accuracyPercent.toFixed(1)}% <span className="text-xs font-mono font-bold text-pink-400">[{danceScore.grade}]</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/10 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">ENERGY / LIFE</span>
                  <span className="text-[10px] font-mono font-bold text-pink-400">{danceScore.energyLevel}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-zinc-900 overflow-hidden border border-white/10">
                  <div 
                    className={`h-full rounded-full transition-all duration-100 ${
                      danceScore.energyLevel > 50 ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' :
                      danceScore.energyLevel > 20 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                      'bg-red-500 animate-pulse'
                    }`}
                    style={{ width: `${danceScore.energyLevel}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Note Highway Canvas Stage */}
            <div className="relative w-full max-w-4xl h-[420px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center bg-[#05070f]">
              <canvas
                ref={canvasRef}
                width={850}
                height={420}
                className="w-full h-full object-contain"
              />

              {/* Floating Judgment FX */}
              <AnimatePresence>
                {latestJudgment && (
                  <motion.div
                    key={latestJudgment.key}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1.2, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -30 }}
                    transition={{ duration: 0.3 }}
                    className="absolute top-1/3 flex flex-col items-center pointer-events-none z-30"
                  >
                    <span 
                      className="font-orbitron text-2xl md:text-3xl font-black drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                      style={{ color: latestJudgment.color }}
                    >
                      {latestJudgment.text}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-white/80 mt-0.5 px-2 py-0.5 rounded bg-black/60 border border-white/10">
                      {latestJudgment.sub}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Virtual Touch Dance Pad Buttons (Mobile & Desktop Accessible) */}
            <div className="grid grid-cols-4 gap-3 w-full max-w-4xl mt-4 z-10">
              {LANES.map(lane => {
                const isActive = activeLaneVisual[lane.id];
                return (
                  <button
                    key={lane.id}
                    onPointerDown={() => handleLaneInput(lane.id)}
                    className={`py-4 rounded-2xl border font-mono font-black flex flex-col items-center justify-center transition-all ${
                      isActive
                        ? `bg-gradient-to-t ${lane.color} text-white scale-95 border-white shadow-[0_0_20px_${lane.glow}]`
                        : 'bg-zinc-950/80 border-white/10 text-zinc-300 hover:border-white/25 active:scale-95'
                    }`}
                  >
                    <span className="text-2xl mb-1">{lane.symbol}</span>
                    <span className="text-[10px] uppercase tracking-wider">{lane.label}</span>
                    <span className="text-[9px] font-mono text-zinc-500 mt-0.5">[{lane.altKey.toUpperCase()}]</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Screen */}
        {gameState === 'RESULTS' && (
          <div className="w-full max-w-3xl flex flex-col items-center my-auto p-8 rounded-3xl bg-zinc-950/90 border border-pink-500/40 shadow-[0_0_40px_rgba(244,63,94,0.2)] z-10">
            <div className="text-center mb-6">
              <span className="text-xs font-mono font-bold tracking-widest text-pink-400 uppercase">
                PERFORMANCE CERTIFICATE
              </span>
              <h2 className="font-orbitron text-3xl font-black text-white mt-1">
                STAGE CLEAR
              </h2>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                {selectedTrack.title} — {selectedTrack.artist} ({selectedTrack.bpm} BPM)
              </p>
            </div>

            {/* Rank / Grade Badge */}
            <div className="flex items-center gap-8 mb-8">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border-2 border-pink-500/60 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                <span className="text-[10px] font-mono text-pink-300 font-bold uppercase">GRADE</span>
                <span className="font-orbitron text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]">
                  {danceScore.grade}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-mono text-zinc-400 uppercase font-bold">FINAL SCORE</span>
                <span className="font-orbitron text-3xl md:text-4xl font-black text-white">
                  {danceScore.score.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold mt-1">
                  ACCURACY: {danceScore.accuracyPercent.toFixed(1)}% | MAX COMBO: {danceScore.maxCombo}
                </span>
              </div>
            </div>

            {/* Detailed Judgment Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full mb-8">
              <div className="p-3 rounded-xl bg-black/40 border border-yellow-500/20 flex flex-col items-center">
                <span className="text-[10px] font-mono text-yellow-400 font-bold uppercase">MARVELOUS</span>
                <span className="font-orbitron text-lg font-black text-white">{danceScore.judgmentCounts.marvelous}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/20 flex flex-col items-center">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">PERFECT</span>
                <span className="font-orbitron text-lg font-black text-white">{danceScore.judgmentCounts.perfect}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/20 flex flex-col items-center">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">GREAT</span>
                <span className="font-orbitron text-lg font-black text-white">{danceScore.judgmentCounts.great}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-blue-500/20 flex flex-col items-center">
                <span className="text-[10px] font-mono text-blue-400 font-bold uppercase">GOOD</span>
                <span className="font-orbitron text-lg font-black text-white">{danceScore.judgmentCounts.good}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-red-500/20 flex flex-col items-center">
                <span className="text-[10px] font-mono text-red-400 font-bold uppercase">MISS</span>
                <span className="font-orbitron text-lg font-black text-white">{danceScore.judgmentCounts.miss}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => startRoutine(selectedTrack)}
                className="px-6 py-3 rounded-xl bg-pink-500 text-black font-mono text-xs font-black hover:bg-pink-400 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> RETRY TRACK
              </button>

              <button
                onClick={() => setGameState('SELECT')}
                className="px-6 py-3 rounded-xl bg-white/10 text-white font-mono text-xs font-bold hover:bg-white/20 transition-colors"
              >
                CHANGE TRACK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
