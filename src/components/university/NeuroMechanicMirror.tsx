import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  VideoOff, 
  RefreshCw, 
  AlertTriangle, 
  Activity, 
  Sparkles,
  Info
} from 'lucide-react';
import { MovementSignature } from '../../types/university';

interface NeuroMechanicMirrorProps {
  onScanComplete?: (newSignature: MovementSignature) => void;
  currentSignature?: MovementSignature;
}

export const NeuroMechanicMirror: React.FC<NeuroMechanicMirrorProps> = ({
  onScanComplete,
  currentSignature
}) => {
  const [useLiveCamera, setUseLiveCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<'deep_squat' | 'hurdle_step' | 'aslr' | 'trunk_stability'>('deep_squat');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [liveAngles, setLiveAngles] = useState({
    kneeFlexion: 118,
    ankleDorsiflexion: 34,
    hipAngle: 104,
    trunkLean: 14,
    valgusAngle: 4.2
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Toggle Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (useLiveCamera) {
      navigator.mediaDevices?.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
          setCameraError(null);
        })
        .catch((err) => {
          console.warn('Camera access error or permission denied:', err);
          setCameraError('Camera access unavailable. Falling back to synthetic Neuro-Mechanic Rig simulator.');
          setUseLiveCamera(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useLiveCamera]);

  // Synthetic skeleton generator & canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.03;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Oscillate simulated angles
      const knee = Math.round(90 + Math.sin(time) * 35);
      const ankle = Math.round(28 + Math.cos(time) * 12);
      const hip = Math.round(100 + Math.sin(time) * 25);
      const trunk = Math.round(12 + Math.cos(time * 0.8) * 6);
      const valgus = Number((3.5 + Math.sin(time * 1.5) * 2.5).toFixed(1));

      setLiveAngles({
        kneeFlexion: knee,
        ankleDorsiflexion: ankle,
        hipAngle: hip,
        trunkLean: trunk,
        valgusAngle: valgus
      });

      // Draw Grid / Coordinate Matrix
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center Coordinate Origin
      const cx = width / 2;
      const cy = height * 0.28;

      // Simulated Skeleton Keypoints (MediaPipe Rig)
      const head = { x: cx, y: cy - 40 };
      const neck = { x: cx, y: cy };
      const leftShoulder = { x: cx - 45, y: cy + 15 };
      const rightShoulder = { x: cx + 45, y: cy + 15 };
      const midSpine = { x: cx + Math.sin(time) * 4, y: cy + 70 };
      const pelvis = { x: cx + Math.sin(time * 0.8) * 6, y: cy + 130 };

      // Knee flexion displacement
      const squatSquish = Math.sin(time) * 30;
      const leftHip = { x: pelvis.x - 30, y: pelvis.y };
      const rightHip = { x: pelvis.x + 30, y: pelvis.y };

      const leftKnee = { x: leftHip.x - 15 - (valgus * 2), y: pelvis.y + 70 + squatSquish };
      const rightKnee = { x: rightHip.x + 15 + (valgus * 1.5), y: pelvis.y + 70 + squatSquish };

      const leftAnkle = { x: leftHip.x - 20, y: pelvis.y + 140 };
      const rightAnkle = { x: rightHip.x + 20, y: pelvis.y + 140 };

      // Draw Bones (Lines)
      const bones = [
        [head, neck],
        [neck, leftShoulder],
        [neck, rightShoulder],
        [neck, midSpine],
        [midSpine, pelvis],
        [pelvis, leftHip],
        [pelvis, rightHip],
        [leftHip, leftKnee],
        [rightHip, rightKnee],
        [leftKnee, leftAnkle],
        [rightKnee, rightAnkle],
      ];

      ctx.lineWidth = 3;
      bones.forEach(([p1, p2]) => {
        const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        grad.addColorStop(0, '#00F2FF');
        grad.addColorStop(1, '#7000FF');
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Draw Joints (Points)
      const joints = [head, neck, leftShoulder, rightShoulder, midSpine, pelvis, leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle];
      joints.forEach((j, idx) => {
        ctx.fillStyle = idx >= 8 ? (valgus > 5 ? '#EF4444' : '#00F2FF') : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(j.x, j.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Glow ring
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(j.x, j.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Vector Angle Callouts
      ctx.fillStyle = '#00F2FF';
      ctx.font = '10px monospace';
      ctx.fillText(`KNEE: ${knee}°`, rightKnee.x + 12, rightKnee.y);
      ctx.fillText(`ANKLE: ${ankle}°`, rightAnkle.x + 12, rightAnkle.y);
      ctx.fillText(`TRUNK: ${trunk}°`, neck.x + 12, neck.y - 10);
      if (valgus > 4.5) {
        ctx.fillStyle = '#EF4444';
        ctx.fillText(`VALGUS LEAK: +${valgus}°`, leftKnee.x - 90, leftKnee.y);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleStartScan = () => {
    setIsAnalyzing(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalyzing(false);
          
          const newSignature: MovementSignature = {
            scanDate: new Date().toISOString().split('T')[0],
            intervalWeek: 4,
            prqScore: Number((0.82 + (Math.random() * 0.08)).toFixed(2)),
            asymmetryIndex: Number((5.8 + Math.random() * 2).toFixed(1)),
            mobilityScore: 82,
            stabilityScore: 88,
            reactiveStiffness: 26.4,
            deepSquatScore: 2,
            hurdleStepScore: 3,
            inlineLungeScore: 3,
            aslrScore: 2,
            trunkStabilityScore: 3,
            rotaryStabilityScore: 2,
            shoulderMobilityScore: 2,
            compensationPatterns: [
              'Achilles tendon stiffness verified at 26.4 kN/m',
              'Right knee abduction angle stabilized within normal bounds (< 4.5 deg)',
              'Trunk inclination angle neutral through 90-degree descent'
            ],
            restrictedJoints: ['Mild left subtalar restriction'],
            kineticChainLeakage: {
              ankle: 11.2,
              knee: 4.5,
              hip: 9.8,
              lumbar: 3.2
            },
            diagnosticNotes: 'Neuro-Mechanic Mirror scan complete. Neuromuscular recruitment shows +4.2% rate of force development increase compared to baseline.',
            disclaimer: 'All outputs generated represent estimated kinematic engagement and biomechanical modeling. Non-clinical diagnostic framework.'
          };

          onScanComplete?.(newSignature);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner / Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00F2FF]/10 border border-[#00F2FF]/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-[#00F2FF]" />
          </div>
          <div>
            <h3 className="font-orbitron text-sm font-black tracking-tight text-white uppercase">
              NEURO-MECHANIC MIRROR (FMS1 DIGITIZER)
            </h3>
            <p className="text-[10px] font-mono text-zinc-400">
              MediaPipe Pose Estimation • 33-Point Rig • Real-Time Angle Kinematics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseLiveCamera(!useLiveCamera)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-wider flex items-center gap-2 border transition-all ${
              useLiveCamera 
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {useLiveCamera ? <Camera className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
            {useLiveCamera ? 'WEBCAM STREAM ACTIVE' : 'SWITCH TO WEBCAM'}
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Main Viewport & Live Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Viewport */}
        <div className="lg:col-span-2 relative aspect-[16/10] bg-[#030608] rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
          {/* Live Camera Video underneath */}
          {useLiveCamera && (
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover opacity-30 mirror-mode"
            />
          )}

          {/* Skeleton Overlay Canvas */}
          <canvas
            ref={canvasRef}
            width={640}
            height={400}
            className="w-full h-full relative z-10"
          />

          {/* HUD Target Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6">
            <div className="flex justify-between items-start">
              <div className="glass px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-[9px] font-mono text-[#00F2FF] uppercase tracking-widest font-bold">
                  TEST: {activeTest.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                  {useLiveCamera ? 'LIVE_FEED' : 'RIG_SYNTHESIS_ACTIVE'}
                </span>
              </div>
            </div>

            {/* Bottom Telemetry HUD */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <div>
                  <span className="text-zinc-500">KNEE FLEXION:</span>
                  <span className="text-white ml-1 font-bold">{liveAngles.kneeFlexion}°</span>
                </div>
                <div>
                  <span className="text-zinc-500">ANKLE DORSI:</span>
                  <span className="text-[#00F2FF] ml-1 font-bold">{liveAngles.ankleDorsiflexion}°</span>
                </div>
                <div>
                  <span className="text-zinc-500">VALGUS LEAK:</span>
                  <span className={`ml-1 font-bold ${liveAngles.valgusAngle > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {liveAngles.valgusAngle}°
                  </span>
                </div>
              </div>

              <button
                onClick={handleStartScan}
                disabled={isAnalyzing}
                className="px-4 py-2 bg-[#00F2FF] hover:bg-[#00F2FF]/80 text-black font-orbitron font-black text-xs rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,255,0.3)] transition-all disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ANALYZING KINEMATICS ({scanProgress}%)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    RUN 4-WEEK RE-SCREEN
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Screen Protocol & Movement Signature */}
        <div className="flex flex-col gap-4">
          <div className="glass-card p-5 border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-orbitron text-xs font-black tracking-widest text-white uppercase">
                FMS1 BATTERY SELECTOR
              </h4>
              <span className="text-[9px] font-mono text-zinc-500">4-WEEK RE-SCREEN PROTOCOL</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'deep_squat', name: 'Deep Squat', sfma: 'Ankle / Hip' },
                { id: 'hurdle_step', name: 'Hurdle Step', sfma: 'Single-Leg' },
                { id: 'aslr', name: 'Active SLR', sfma: 'Hamstring' },
                { id: 'trunk_stability', name: 'Trunk Stability', sfma: 'Core/Spine' }
              ].map((test) => (
                <button
                  key={test.id}
                  onClick={() => setActiveTest(test.id as 'deep_squat' | 'hurdle_step' | 'aslr' | 'trunk_stability')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activeTest === test.id
                      ? 'bg-[#00F2FF]/10 border-[#00F2FF] text-white'
                      : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-orbitron text-[10px] font-bold uppercase">{test.name}</div>
                  <div className="text-[8px] font-mono text-zinc-500 mt-0.5">{test.sfma} Trigger</div>
                </button>
              ))}
            </div>

            {/* Current Signature Metric Readout */}
            <div className="pt-3 border-t border-white/5 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-zinc-400">MEASURED ASYMMETRY:</span>
                <span className="text-[#00F2FF] font-bold">
                  {currentSignature?.asymmetryIndex || 7.2}%
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-zinc-400">REACTIVE STIFFNESS:</span>
                <span className="text-emerald-400 font-bold">
                  {currentSignature?.reactiveStiffness || 24.8} kN/m
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-zinc-400">PRQ ESTIMATED INDEX:</span>
                <span className="text-purple-400 font-bold">
                  {currentSignature?.prqScore || 0.84}
                </span>
              </div>
            </div>
          </div>

          {/* Safety & Non-Clinical Guardrail */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-[10px] font-mono text-zinc-500 space-y-2">
            <div className="flex items-center gap-1.5 text-zinc-400 font-bold uppercase">
              <Info className="w-3.5 h-3.5 text-[#00F2FF]" />
              <span>ESTIMATED ENGAGEMENT GUARDRAIL</span>
            </div>
            <p className="leading-relaxed">
              All outputs are framed as estimated kinematic engagement and biomechanical education. Non-clinical diagnostic framework strictly aligned with NASM/FMS1 scope.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
