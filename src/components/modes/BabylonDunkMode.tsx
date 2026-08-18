import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { Vector3, FreeCamera, Color3 } from '@babylonjs/core';
import { createBabylonContext } from '../../lib/babylon/BabylonSceneBuilder';
import { createMixamoAthlete, MixamoAthlete } from '../../lib/babylon/MixamoAthlete';
import { buildVeniceNightCourt, VeniceNightCourt } from '../../lib/babylon/VeniceNightCourt';
import { directedFraming } from '../../lib/babylon/veniceDunkCamera';
import {
  VeniceDunkAttempt,
  EASTBAY_MASTER_STANDARD,
  AttemptMetrics,
  ContactOutcome,
  DunkPhase,
} from '../../core/VeniceDunkLoop';
import { VENICE_RESULT_COPY, caseMissSub } from '../../core/veniceResultCopy';
import { SoundJuice } from '../../lib/judgeScoring';

interface BabylonDunkModeProps {
  onBack: () => void;
}

type IdleFrame = 'BOARDWALK' | 'COURTSIDE' | 'RIM';

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
  const [result, setResult] = useState<ContactOutcome | null>(null);
  const [metrics, setMetrics] = useState<AttemptMetrics | null>(null);
  const [cue, setCue] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [idleFrame, setIdleFrame] = useState<IdleFrame>('BOARDWALK');
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);
  const playSfxRef = useRef(playSfx);
  const lastPointerXRef = useRef<number | null>(null);

  useEffect(() => {
    playSfxRef.current = playSfx;
  }, [playSfx]);

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

      athlete.root.position.x = snap.rootX;
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
          court.reactCrowd(snap.outcome?.isMake ? 'cheer' : 'miss', 1);
        }
        if (snap.phase === 'IDLE') {
          athlete.playIdle();
          athlete.root.rotation.y = 0;
          court.reactCrowd('sit');
        }
        if (snap.phase === 'RUNWAY') athlete.playRun(1.05);
        if (snap.phase === 'GATHER') {
          athlete.playRun(0.72);
          court.reactCrowd('watch', 0.7);
        }
        if (snap.phase === 'PLANT') court.reactCrowd('watch', 1);
        if (snap.phase === 'HANG') court.reactCrowd('rise', 0.85);
        if (snap.phase === 'BLOWN') {
          athlete.stopClips();
          court.reactCrowd('miss', 0.7);
          setCue(snap.gatherMiss === 'EARLY' ? 'EARLY' : 'LATE');
        }
      }

      if (snap.phase === 'RUNWAY') {
        athlete.playRun(0.8 + (attempt.approachSpeed / 8.8) * 0.6);
      }

      if (snap.phase === 'PLANT' && attempt.plantElapsed > 0) {
        athlete.posePlant(Math.min(1, attempt.compression01 + 0.25));
        athlete.root.rotation.x = (attempt.trunkLeanDeg * Math.PI) / 180 * 0.15;
      }
      if (snap.phase === 'TAKEOFF') {
        const p = snap.takeoffApexY > 0.01 ? Math.max(0, Math.min(1, snap.rootY / snap.takeoffApexY)) : 0;
        athlete.poseTakeoff(p);
        athlete.root.rotation.x *= 1 - p;
      }
      if (snap.phase === 'HANG' || snap.phase === 'CONTACT') {
        athlete.playSlam(snap.style, snap.phase === 'CONTACT' ? 1 : Math.min(1, attempt.hangElapsed / 0.4));
        athlete.root.rotation.y = Math.PI;
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

  const handlePointerDown = (event?: { clientX?: number }) => {
    pointerDownRef.current = true;
    lastPointerXRef.current = event?.clientX ?? null;
    const attempt = attemptRef.current;
    if (attempt.phase === 'IDLE') {
      setResult(null);
      setMetrics(null);
      setCue(null);
      playSfx(() => SoundJuice.playCharge());
      attempt.startRunway();
      return;
    }
    if (attempt.phase === 'GATHER') {
      attempt.commitPlant();
      return;
    }
    if (attempt.phase === 'TAKEOFF' || attempt.phase === 'HANG') {
      const x = event?.clientX;
      const canvas = canvasRef.current;
      if (x != null && canvas) {
        const rect = canvas.getBoundingClientRect();
        const nx = ((x - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        attempt.inputAir(Math.max(-1, Math.min(1, nx)), true);
      } else {
        attempt.inputAir(0, true);
      }
    }
  };

  const handlePointerUp = () => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = false;
    lastPointerXRef.current = null;
    const attempt = attemptRef.current;
    if (attempt.phase === 'RUNWAY') {
      attempt.releaseToGather();
      return;
    }
    if (attempt.phase === 'PLANT') {
      attempt.releaseTakeoff();
    }
  };

  const handlePointerMove = (event: { clientX: number }) => {
    const attempt = attemptRef.current;
    if (attempt.phase !== 'TAKEOFF' && attempt.phase !== 'HANG') return;
    if (lastPointerXRef.current === null) {
      lastPointerXRef.current = event.clientX;
      attempt.inputAir(0);
      return;
    }
    const dx = (event.clientX - lastPointerXRef.current) / 140;
    lastPointerXRef.current = event.clientX;
    attempt.inputAir(dx);
  };

  const eastbay = EASTBAY_MASTER_STANDARD;
  const showCase = result !== null && metrics !== null;
  const copy = VENICE_RESULT_COPY;

  const clearCase = () => {
    setResult(null);
    setMetrics(null);
    setCue(null);
  };

  const nextAttempt = () => {
    clearCase();
    attemptRef.current.reset();
  };

  const instantRetry = () => {
    clearCase();
    attemptRef.current.reset();
    playSfx(() => SoundJuice.playCharge());
    attemptRef.current.startRunway();
  };

  return (
    <div className="unreal-canvas relative w-full h-[720px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none z-0"
        onPointerDown={(e) => handlePointerDown(e)}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
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

      {cue && phase === 'IDLE' && !showCase && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest">
            {cue}
          </span>
        </div>
      )}

      {showCase && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-[min(92%,36rem)]">
          <div className="px-4 py-3 rounded-2xl bg-black/70 border border-[#00F2FF]/30 backdrop-blur-md">
            <div className="mb-1">
              <div className={`text-sm font-orbitron font-black ${result?.isMake ? 'text-[#00FF9D]' : 'text-red-400'}`}>
                {result?.isMake ? copy.makeHeadline : copy.missHeadline}
              </div>
              <div className="text-[10px] font-mono text-zinc-300 mt-0.5">
                {result?.isMake ? copy.makeSub : caseMissSub(result?.missReason ?? null)}
              </div>
            </div>
            <div className="text-[9px] font-mono text-zinc-400 mt-2">
              {copy.eastbayName} · {copy.eastbayLine} · {copy.eastbayClass} · {copy.eastbayRole}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center mt-2">
              <div>
                <div className="text-[8px] font-mono text-zinc-500">GCT</div>
                <div className="text-sm font-orbitron text-white">{metrics?.gctMs}<span className="text-[9px] text-zinc-500 ml-0.5">ms</span></div>
                <div className="text-[8px] font-mono text-zinc-600">{eastbay.gctMs} ms</div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-zinc-500">VERTICAL</div>
                <div className="text-sm font-orbitron text-white">{metrics?.verticalIn}<span className="text-[9px] text-zinc-500 ml-0.5">in</span></div>
                <div className="text-[8px] font-mono text-zinc-600">{eastbay.verticalIn} in</div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-zinc-500">RECOIL</div>
                <div className="text-sm font-orbitron text-white">{metrics?.elasticRecoilBw}<span className="text-[9px] text-zinc-500 ml-0.5">x</span></div>
                <div className="text-[8px] font-mono text-zinc-600">{eastbay.elasticRecoilBw}x</div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-zinc-500">TRUNK</div>
                <div className="text-sm font-orbitron text-white">{metrics?.trunkLeanDeg}°</div>
                <div className="text-[8px] font-mono text-zinc-600">{eastbay.trunkLeanDeg}°</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={nextAttempt}
                className="flex-1 px-2 py-2 rounded-xl bg-white/10 border border-white/20 text-[10px] font-mono font-bold text-white hover:bg-white/20"
              >
                {copy.nextAttempt}
              </button>
              <button
                type="button"
                onClick={instantRetry}
                className="flex-1 px-2 py-2 rounded-xl bg-[#00F2FF] text-black text-[10px] font-mono font-bold hover:bg-[#00F2FF]/90"
              >
                {copy.instantRetry}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'IDLE' || phase === 'RUNWAY' || phase === 'GATHER' || phase === 'PLANT' ? (
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <button
            aria-label="hold"
            onPointerDown={(e) => {
              e.preventDefault();
              handlePointerDown(e);
            }}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => {
              if (pointerDownRef.current) handlePointerUp();
            }}
            className="w-[4.5rem] h-[4.5rem] rounded-full bg-white/10 border-2 border-white/35 shadow-[0_0_24px_rgba(255,255,255,0.12)] active:scale-95 active:bg-white/20"
          />
        </div>
      ) : null}

      {(phase === 'TAKEOFF' || phase === 'HANG') && (
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 w-[min(92%,28rem)] pointer-events-auto">
          <div
            className="flex h-16 rounded-2xl overflow-hidden border-2 border-white/35 bg-black/45"
            onPointerDown={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
              attemptRef.current.inputAir(Math.max(-1, Math.min(1, nx)), true);
              pointerDownRef.current = true;
              lastPointerXRef.current = e.clientX;
            }}
            onPointerMove={(e) => {
              if (!pointerDownRef.current) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
              attemptRef.current.inputAir(Math.max(-1, Math.min(1, nx)), true);
            }}
            onPointerUp={() => {
              pointerDownRef.current = false;
              lastPointerXRef.current = null;
            }}
          >
            <div className="flex-1 bg-[#00F2FF]/10" />
            <div className="w-px bg-white/25" />
            <div className="flex-[1.15] bg-white/10" />
            <div className="w-px bg-white/25" />
            <div className="flex-1 bg-[#00F2FF]/10" />
          </div>
        </div>
      )}
    </div>
  );
};
