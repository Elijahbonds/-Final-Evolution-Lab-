import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Volume2, VolumeX, Play } from 'lucide-react';
import { Vector3, FreeCamera, Color3 } from '@babylonjs/core';
import { createBabylonContext } from '../../lib/babylon/BabylonSceneBuilder';
import { createMixamoAthlete, MixamoAthlete } from '../../lib/babylon/MixamoAthlete';
import { buildVeniceNightCourt, VeniceNightCourt } from '../../lib/babylon/VeniceNightCourt';
import {
  VeniceDunkAttempt,
  EASTBAY_MASTER_STANDARD,
  AttemptMetrics,
  ContactOutcome,
  DunkPhase,
} from '../../core/VeniceDunkLoop';
import { SoundJuice } from '../../lib/judgeScoring';

interface BabylonDunkModeProps {
  onBack: () => void;
}

type IdleFrame = 'BOARDWALK' | 'COURTSIDE' | 'RIM';

function directedFraming(
  phase: DunkPhase,
  athlete: Vector3,
  rim: Vector3
): { pos: Vector3; target: Vector3 } {
  if (phase === 'IDLE' || phase === 'RUNWAY') {
    return {
      pos: new Vector3(athlete.x + 2.6, 1.65, athlete.z - 3.6),
      target: new Vector3(athlete.x, 1.25, athlete.z + 3.2),
    };
  }
  if (phase === 'GATHER' || phase === 'BLOWN') {
    return {
      pos: new Vector3(athlete.x + 2.15, 1.5, athlete.z - 2.2),
      target: new Vector3(athlete.x, 1.4, athlete.z + 2.4),
    };
  }
  if (phase === 'PLANT') {
    return {
      pos: new Vector3(1.8, 1.35, athlete.z - 1.4),
      target: new Vector3(0, 1.55, athlete.z + 1.6),
    };
  }
  if (phase === 'TAKEOFF') {
    return {
      pos: new Vector3(2.0, athlete.y + 1.1, athlete.z - 1.8),
      target: new Vector3(0, athlete.y + 1.4, athlete.z + 1.8),
    };
  }
  if (phase === 'HANG') {
    return {
      pos: new Vector3(2.4, athlete.y + 0.35, athlete.z - 1.1),
      target: new Vector3(0.1, Math.max(athlete.y, rim.y - 0.1), rim.z - 0.2),
    };
  }
  if (phase === 'CONTACT') {
    return {
      pos: new Vector3(1.15, rim.y + 0.15, rim.z - 1.55),
      target: new Vector3(0, rim.y, rim.z),
    };
  }
  return {
    pos: new Vector3(3.2, 1.8, rim.z - 4.5),
    target: new Vector3(0, 1.2, rim.z - 0.6),
  };
}

export const BabylonDunkMode: React.FC<BabylonDunkModeProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const attemptRef = useRef(new VeniceDunkAttempt(-6.2, 5.5, 3.05));
  const athleteRef = useRef<MixamoAthlete | null>(null);
  const courtRef = useRef<VeniceNightCourt | null>(null);
  const dunkCamRef = useRef<FreeCamera | null>(null);
  const hoopPosRef = useRef(new Vector3(0, 3.05, 5.5));
  const pointerDownRef = useRef(false);
  const lastPhaseRef = useRef<DunkPhase>('IDLE');
  const camPosRef = useRef(new Vector3(2.8, 1.8, -9.2));
  const camTargetRef = useRef(new Vector3(0, 1.4, 1.5));

  const [phase, setPhase] = useState<DunkPhase>('IDLE');
  const [runwaySpeed, setRunwaySpeed] = useState(0);
  const [result, setResult] = useState<ContactOutcome | null>(null);
  const [metrics, setMetrics] = useState<AttemptMetrics | null>(null);
  const [dunkStyle, setDunkStyle] = useState<'WINDMILL' | 'TOMAHAWK' | '360_SPIN' | 'BETWEEN_LEGS'>('WINDMILL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [idleFrame, setIdleFrame] = useState<IdleFrame>('BOARDWALK');
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);
  const dunkStyleRef = useRef(dunkStyle);
  const playSfxRef = useRef(playSfx);

  useEffect(() => {
    dunkStyleRef.current = dunkStyle;
    playSfxRef.current = playSfx;
  }, [dunkStyle, playSfx]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = createBabylonContext(canvasRef.current);
    const { scene, shadowGenerator, camera, engine } = ctx;
    camera.detachControl();

    const dunkCam = new FreeCamera('veniceDunkCam', new Vector3(2.8, 1.8, -9.2), scene);
    dunkCam.minZ = 0.08;
    dunkCam.maxZ = 220;
    dunkCam.fov = 0.88;
    dunkCam.inputs.clear();
    scene.activeCamera = dunkCam;
    dunkCamRef.current = dunkCam;

    let disposed = false;
    const hoop = hoopPosRef.current;

    const boot = async () => {
      try {
        const court = await buildVeniceNightCourt(scene, shadowGenerator, hoop);
        if (disposed) return;
        courtRef.current = court;

        const athlete = await createMixamoAthlete(scene, 'veniceDunker', shadowGenerator, {
          tint: new Color3(0.05, 0.55, 0.7),
        });
        if (disposed) return;
        athlete.root.position.set(0, 0, -6.2);
        athlete.root.rotation.y = 0;
        athleteRef.current = athlete;
        athlete.playIdle();
        setReady(true);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Mixamo dunker failed to load');
      }
    };
    void boot();

    const observer = scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
      const attempt = attemptRef.current;
      const athlete = athleteRef.current;
      const court = courtRef.current;
      const cam = dunkCamRef.current;
      if (!athlete || !court || !cam) return;

      const snap = attempt.tick(dt);
      court.tick(performance.now() / 1000);
      court.rim.position.y = court.hoopRestY + snap.rimYOffset;

      athlete.root.position.x = 0;
      athlete.root.position.y = snap.rootY;
      athlete.root.position.z = snap.rootZ;

      if (snap.phase !== lastPhaseRef.current) {
        lastPhaseRef.current = snap.phase;
        setPhase(snap.phase);
        if (snap.phase === 'PLANT') playSfxRef.current(() => SoundJuice.playTakeoff());
        if (snap.phase === 'CONTACT') {
          playSfxRef.current(() => SoundJuice.playSlam());
          setResult(snap.outcome);
          setMetrics(snap.metrics);
        }
        if (snap.phase === 'IDLE') {
          athlete.playIdle();
          athlete.root.rotation.y = 0;
        }
        if (snap.phase === 'RUNWAY') athlete.playRun(1.05);
        if (snap.phase === 'GATHER') athlete.playRun(0.72);
        if (snap.phase === 'BLOWN') athlete.stopClips();
      }

      if (snap.phase === 'RUNWAY') {
        setRunwaySpeed(attempt.approachSpeed);
        athlete.playRun(0.8 + (attempt.approachSpeed / 8.8) * 0.6);
      }

      if (snap.phase === 'PLANT' && attempt.plantElapsed > 0) {
        athlete.posePlant(Math.min(1, attempt.compression01 + 0.25));
        athlete.root.rotation.x = (attempt.trunkLeanDeg * Math.PI) / 180 * 0.15;
      }
      if (snap.phase === 'TAKEOFF') {
        const p = attempt.takeoffElapsed / 0.3;
        athlete.poseTakeoff(p);
        athlete.root.rotation.x *= 1 - p;
      }
      if (snap.phase === 'HANG' || snap.phase === 'CONTACT') {
        const p = snap.phase === 'HANG' ? attempt.hangElapsed / 0.5 : 1;
        athlete.poseReverseTwoHand(Math.min(1, 0.45 + p * 0.55));
        if (dunkStyleRef.current === '360_SPIN') {
          athlete.root.rotation.y = p * Math.PI * 2;
        } else {
          athlete.root.rotation.y = Math.PI;
        }
      }
      if (snap.phase === 'LAND' || snap.phase === 'BLOWN') {
        athlete.root.rotation.y *= 0.85;
        athlete.root.rotation.x *= 0.7;
      }

      const framing = directedFraming(
        snap.phase,
        athlete.root.position,
        hoopPosRef.current
      );
      const follow = snap.phase === 'IDLE' ? 0.08 : 0.14;
      camPosRef.current = Vector3.Lerp(camPosRef.current, framing.pos, follow);
      camTargetRef.current = Vector3.Lerp(camTargetRef.current, framing.target, follow);
      cam.position.copyFrom(camPosRef.current);
      cam.setTarget(camTargetRef.current);
    });

    engine.runRenderLoop(() => {
      scene.render();
    });

    return () => {
      disposed = true;
      scene.onBeforeRenderObservable.remove(observer);
      athleteRef.current?.dispose();
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    };
  }, []);

  const applyIdleFrame = (mode: IdleFrame) => {
    setIdleFrame(mode);
    if (phase !== 'IDLE') return;
    if (mode === 'BOARDWALK') {
      camPosRef.current = new Vector3(2.8, 1.8, -9.2);
      camTargetRef.current = new Vector3(0, 1.4, 1.5);
    } else if (mode === 'COURTSIDE') {
      camPosRef.current = new Vector3(8.4, 1.7, 1.2);
      camTargetRef.current = new Vector3(0, 1.5, 2.4);
    } else {
      camPosRef.current = new Vector3(0.2, 3.4, 8.4);
      camTargetRef.current = hoopPosRef.current.clone();
    }
  };

  const handlePointerDown = () => {
    pointerDownRef.current = true;
    const attempt = attemptRef.current;
    if (attempt.phase === 'IDLE') {
      setResult(null);
      setMetrics(null);
      playSfx(() => SoundJuice.playCharge());
      attempt.startRunway();
      return;
    }
    if (attempt.phase === 'GATHER') {
      attempt.inputAfterRelease();
    }
  };

  const handlePointerUp = () => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = false;
    const attempt = attemptRef.current;
    if (attempt.phase === 'RUNWAY') {
      attempt.releaseToGather();
    }
  };

  const eastbay = EASTBAY_MASTER_STANDARD;
  const showCase = result !== null && metrics !== null;

  return (
    <div className="unreal-canvas relative w-full h-[720px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none z-0"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />

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

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-black/60 border border-white/10 p-1 rounded-2xl flex items-center gap-1 backdrop-blur-md">
            {(['BOARDWALK', 'COURTSIDE', 'RIM'] as const).map((cam) => (
              <button
                key={cam}
                disabled={phase !== 'IDLE'}
                onClick={() => applyIdleFrame(cam)}
                className={`px-3 py-1.5 rounded-xl font-mono text-[10px] uppercase font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  idleFrame === cam ? 'bg-[#00F2FF] text-black' : 'text-zinc-400 hover:text-white'
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

      {!ready && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-mono text-[#00F2FF] uppercase tracking-widest">
            {loadError ?? 'Loading Mixamo dunker…'}
          </span>
        </div>
      )}

      {phase !== 'IDLE' && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="px-4 py-2 rounded-xl bg-black/55 border border-white/10">
            <span className="text-[10px] font-mono font-bold text-[#00F2FF] uppercase tracking-widest">
              {phase === 'BLOWN' ? 'GATHER BLOWN' : phase}
            </span>
          </div>
        </div>
      )}

      {showCase && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 w-[min(92%,36rem)] pointer-events-none">
          <div className="px-4 py-3 rounded-2xl bg-black/70 border border-[#00F2FF]/30 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className={`text-sm font-orbitron font-black uppercase ${result?.isMake ? 'text-[#00FF9D]' : 'text-red-400'}`}>
                {result?.isMake ? 'DUNK' : result?.missReason?.replace('_', ' ')}
              </span>
              <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
                {eastbay.role.replace('_', ' ')} · {eastbay.classification}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-[8px] font-mono text-zinc-500">GCT</div>
                <div className="text-sm font-orbitron text-white">{metrics?.gctMs}<span className="text-[9px] text-zinc-500 ml-0.5">ms</span></div>
                <div className="text-[8px] font-mono text-zinc-600">MS {eastbay.gctMs}</div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-zinc-500">VERTICAL</div>
                <div className="text-sm font-orbitron text-white">{metrics?.verticalIn}<span className="text-[9px] text-zinc-500 ml-0.5">in</span></div>
                <div className="text-[8px] font-mono text-zinc-600">MS {eastbay.verticalIn}</div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-zinc-500">RECOIL</div>
                <div className="text-sm font-orbitron text-white">{metrics?.elasticRecoilBw}<span className="text-[9px] text-zinc-500 ml-0.5">x</span></div>
                <div className="text-[8px] font-mono text-zinc-600">MS {eastbay.elasticRecoilBw}</div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-zinc-500">TRUNK</div>
                <div className="text-sm font-orbitron text-white">{metrics?.trunkLeanDeg}°</div>
                <div className="text-[8px] font-mono text-zinc-600">MS {eastbay.trunkLeanDeg}°</div>
              </div>
            </div>
            <div className="text-[9px] font-mono text-zinc-500 text-center mt-2 uppercase tracking-wider">
              This plant · Eastbay Master Standard is the case, not this attempt · run again
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-none">
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
                  ? 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {style.replace('_', ' ')}
            </button>
          ))}
        </div>

        {phase === 'IDLE' || phase === 'RUNWAY' || phase === 'GATHER' ? (
          <div className="flex items-center gap-4 pointer-events-auto">
            {phase === 'RUNWAY' && (
              <div className="w-40 space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                  <span>APPROACH</span>
                  <span>{runwaySpeed.toFixed(1)} m/s</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-[#00F2FF]"
                    style={{ width: `${Math.min(100, (runwaySpeed / 8.8) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            <button
              onMouseDown={handlePointerDown}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchEnd={handlePointerUp}
              onMouseLeave={() => {
                if (pointerDownRef.current) handlePointerUp();
              }}
              className="px-8 py-4 rounded-2xl bg-[#00F2FF] text-black font-orbitron font-black text-sm tracking-wider hover:bg-[#00F2FF]/90 transition-all shadow-[0_0_35px_rgba(0,242,255,0.4)] active:scale-95 flex items-center gap-2 cursor-pointer select-none"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>
                {phase === 'GATHER'
                  ? 'HOLD STEADY — DON\'T BLOW IT'
                  : phase === 'RUNWAY'
                    ? 'RELEASE TO GATHER'
                    : 'HOLD TO RUN · RELEASE TO GATHER'}
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
