import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { Vector3, FreeCamera, Color3, TransformNode } from '@babylonjs/core';
import { createBabylonContext } from '../../lib/babylon/BabylonSceneBuilder';
import { abortMixamoLoad, createMixamoAthlete, MixamoAthlete } from '../../lib/babylon/MixamoAthlete';
import {
  buildVeniceNightCourt,
  hideCheapVenicePrimitives,
  loadMeshyVeniceCourt,
  MeshyVeniceCourt,
  VeniceNightCourt,
} from '../../lib/babylon/VeniceNightCourt';
import { directedFraming } from '../../lib/babylon/veniceDunkCamera';
import {
  VeniceDunkAttempt,
  EASTBAY_MASTER_STANDARD,
  AttemptMetrics,
  ContactOutcome,
  DunkPhase,
} from '../../core/VeniceDunkLoop';
import { VENICE_RESULT_COPY, caseMissHeadline, caseMissSub } from '../../core/veniceResultCopy';
import { LOCAL_ASSET_TIMEOUT_MS, withTimeout } from '../../lib/babylon/localAssets';
import { SoundJuice } from '../../lib/judgeScoring';
import { EmulatorPadOverlay } from './EmulatorPadOverlay';

interface BabylonDunkModeProps {
  onBack: () => void;
}

export const BabylonDunkMode: React.FC<BabylonDunkModeProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const attemptRef = useRef(new VeniceDunkAttempt(-6.2, 5.5, 3.05));
  const athleteRef = useRef<MixamoAthlete | null>(null);
  const courtRef = useRef<VeniceNightCourt | null>(null);
  const meshyCourtRef = useRef<MeshyVeniceCourt | null>(null);
  const worldScaleRef = useRef(1);
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
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const holdPressedRef = useRef(false);
  const stickXRef = useRef(0);

  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);
  const playSfxRef = useRef(playSfx);

  useEffect(() => {
    playSfxRef.current = playSfx;
  }, [playSfx]);

  useEffect(() => {
    if (!canvasRef.current) return;
    // The finished product is Unreal-reading Venice night — real sky/water
    // shaders, rim spot, shadows, antialiasing. The previewSafe escape
    // hatch flattened all of that to a beige/blue toy slab; it must be
    // OFF for the actual dunk boot.
    const ctx = createBabylonContext(canvasRef.current, { previewSafe: false });
    const { scene, shadowGenerator, camera, engine } = ctx;
    camera.detachControl();

    const dunkCam = new FreeCamera('veniceDunkCam', new Vector3(2.8, 1.8, -9.2), scene);
    dunkCam.minZ = 0.08;
    dunkCam.maxZ = 220;
    dunkCam.fov = 0.88;
    dunkCam.inputs.clear();
    const lookAt = new TransformNode('veniceDunkLook', scene);
    lookAt.position.copyFrom(camTargetRef.current);
    dunkCam.lockedTarget = lookAt;
    scene.activeCamera = dunkCam;
    dunkCamRef.current = dunkCam;

    let disposed = false;
    let allowedToDraw = false;
    let bootAborted = false;
    const hoop = hoopPosRef.current;
    const framePos = new Vector3();
    const frameTarget = new Vector3();

    const killHungLoad = () => {
      bootAborted = true;
      abortMixamoLoad(scene);
      try {
        athleteRef.current?.dispose();
      } catch {
        /* athlete may not exist yet */
      }
      athleteRef.current = null;
    };

    const boot = async () => {
      try {
        // Authored Venice night (real shaders, rim spot, fence) renders
        // first — court and athlete gameplay never wait on the Meshy
        // mural, so the night court is never an infinite spinner.
        const court = await buildVeniceNightCourt(scene, shadowGenerator, hoop, {
          spectators: false,
          previewSafe: false,
        });
        if (disposed || bootAborted || scene.isDisposed) {
          return;
        }
        courtRef.current = court;
        // Court is enough to paint a TV. Do not wait on Mixamo `ready`
        // or a load miss will look like a dead title card.
        allowedToDraw = true;

        // Meshy court + surround: fetch + File + glTF import on the LIVE
        // scene, fully resolved (load, attach, hideCheap) BEFORE the
        // athlete's hang-required timeout below can start, let alone
        // dispose anything. This load has its own timeout and is
        // best-effort — any failure keeps the cheap court visible and
        // must never throw out of boot() or touch athlete state.
        try {
          const meshy = await loadMeshyVeniceCourt(scene, {
            courtWidth: 15.2,
            courtDepth: 28,
            surroundWidth: 60,
            surroundDepth: 60,
            courtCenterZ: 5.0,
          });
          if (disposed || bootAborted || scene.isDisposed) {
            meshy.dispose();
          } else {
            meshyCourtRef.current = meshy;
            worldScaleRef.current = meshy.worldScale;
            hideCheapVenicePrimitives(scene, {
              court: meshy.courtLoaded,
              surround: meshy.surroundLoaded,
            });
            // Hoop, backboard, and post fit the mural's own native scale —
            // not the other way around. Rim Y stays gameplay-driven
            // (hoopRestY + rimYOffset below); this only sets visual size
            // and, for backboard/post, repositions them at the SAME
            // proportional offset from the hoop so a bigger assembly does
            // not clip through itself.
            if ((meshy.courtLoaded || meshy.surroundLoaded) && meshy.worldScale > 1) {
              const s = meshy.worldScale;
              const rim = courtRef.current?.rim;
              const backboard = courtRef.current?.backboard;
              const post = scene.getMeshByName('venice_post');
              rim?.scaling.set(s, s, s);
              if (backboard) {
                backboard.scaling.set(s, s, s);
                const offset = backboard.position.subtract(hoop);
                backboard.position.copyFrom(hoop.add(offset.scale(s)));
              }
              if (post) {
                post.scaling.set(s, s, s);
                const offset = post.position.subtract(hoop);
                post.position.copyFrom(hoop.add(offset.scale(s)));
              }
            }
          }
        } catch {
          /* Meshy mural is best-effort; cheap procedural court stays up */
        }

        if (disposed || bootAborted || scene.isDisposed) {
          return;
        }

        // Hang-required stays scoped to the athlete only: GLB + Elijah BVH.
        await withTimeout(
          (async () => {
            const athlete = await createMixamoAthlete(scene, 'veniceDunker', shadowGenerator, {
              tint: new Color3(0.05, 0.55, 0.7),
            });
            if (disposed || bootAborted || scene.isDisposed) {
              athlete.dispose();
              abortMixamoLoad(scene);
              return;
            }
            if (!athlete.anims.dunkTake) {
              athlete.dispose();
              throw new Error('Elijah dunk BVH missing — hang body required');
            }
            if (disposed || bootAborted || scene.isDisposed) {
              athlete.dispose();
              abortMixamoLoad(scene);
              return;
            }
            athlete.root.position.set(0, 0, -6.2);
            athlete.root.rotation.y = 0;
            athleteRef.current = athlete;
            athlete.playIdle();
            try {
              scene.cleanCachedTextureBuffer();
            } catch {
              /* older engines may not expose the cache wipe */
            }
            if (disposed || bootAborted || scene.isDisposed) {
              athlete.dispose();
              athleteRef.current = null;
              abortMixamoLoad(scene);
              return;
            }
            setReady(true);
          })(),
          LOCAL_ASSET_TIMEOUT_MS + 4000,
          'Mixamo dunker',
          killHungLoad
        );
      } catch (err) {
        // Athlete miss: keep the court rendering. Never stopRenderLoop
        // on a load miss — chop here is a dead title card.
        killHungLoad();
        if (disposed) return;
        setLoadError(err instanceof Error ? err.message : 'Mixamo dunker failed to load');
      }
    };
    void boot();

    const observer = scene.onBeforeRenderObservable.add(() => {
      if (disposed || scene.isDisposed || engine.isDisposed) return;
      try {
      const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
      const attempt = attemptRef.current;
      const athlete = athleteRef.current;
      const court = courtRef.current;
      const cam = dunkCamRef.current;
      if (!court || !cam) return;

      // Stick + hold still drive the loop while Mixamo is late.
      if (!athlete) {
        court.tick(performance.now() / 1000);
        const idlePos = new Vector3(0, 0, -6.2);
        const framing = directedFraming(
          'IDLE',
          idlePos,
          hoopPosRef.current,
          framePos,
          frameTarget,
          worldScaleRef.current
        );
        Vector3.LerpToRef(camPosRef.current, framing.pos, 0.08, camPosRef.current);
        Vector3.LerpToRef(camTargetRef.current, framing.target, 0.08, camTargetRef.current);
        cam.position.copyFrom(camPosRef.current);
        lookAt.position.copyFrom(camTargetRef.current);
        return;
      }

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
          // Continual: hold still down after land → next run, no menu.
          if (holdPressedRef.current) {
            setResult(null);
            setMetrics(null);
            setCue(null);
            playSfxRef.current(() => SoundJuice.playCharge());
            attempt.startRunway();
          }
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
          setResult(snap.outcome);
          setMetrics(snap.metrics);
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
        const hangT = Math.min(athlete.hangContactT01, attempt.hangElapsed / 0.4);
        athlete.playSlam(snap.style, snap.phase === 'CONTACT' ? athlete.hangContactT01 : hangT);
        athlete.root.rotation.y = Math.PI;
      }
      if (snap.phase === 'LAND' || snap.phase === 'BLOWN') {
        athlete.root.rotation.y *= 0.85;
        athlete.root.rotation.x *= 0.7;
      }

      if ((snap.phase === 'TAKEOFF' || snap.phase === 'HANG') && (holdPressedRef.current || stickXRef.current !== 0)) {
        attempt.inputAir(stickXRef.current, true);
      }

      const framing = directedFraming(
        snap.phase,
        athlete.root.position,
        hoopPosRef.current,
        framePos,
        frameTarget,
        worldScaleRef.current
      );
      const follow = snap.phase === 'IDLE' ? 0.08 : 0.14;
      Vector3.LerpToRef(camPosRef.current, framing.pos, follow, camPosRef.current);
      Vector3.LerpToRef(camTargetRef.current, framing.target, follow, camTargetRef.current);
      cam.position.copyFrom(camPosRef.current);
      lookAt.position.copyFrom(camTargetRef.current);
      } catch {
        /* keep the iframe alive if a pose or cam frame throws */
      }
    });

    let drawFails = 0;
    engine.onContextLostObservable.add(() => {
      disposed = true;
      try {
        engine.stopRenderLoop();
      } catch {
        /* already gone */
      }
      setLoadError('Preview renderer lost the GPU context');
    });
    engine.runRenderLoop(() => {
      try {
        if (disposed || engine.isDisposed || scene.isDisposed || !allowedToDraw) return;
        scene.render();
        drawFails = 0;
      } catch {
        drawFails += 1;
        if (drawFails >= 3) {
          try {
            engine.stopRenderLoop();
          } catch {
            /* already gone */
          }
          setLoadError('Preview renderer stopped');
        }
      }
    });

    return () => {
      disposed = true;
      allowedToDraw = false;
      abortMixamoLoad(scene);
      scene.onBeforeRenderObservable.remove(observer);
      athleteRef.current?.dispose();
      athleteRef.current = null;
      meshyCourtRef.current?.dispose();
      meshyCourtRef.current = null;
      worldScaleRef.current = 1;
      courtRef.current = null;
      dunkCamRef.current = null;
      ctx.dispose();
    };
  }, []);

  const handleHoldDown = () => {
    holdPressedRef.current = true;
    pointerDownRef.current = true;
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
      attempt.inputAir(stickXRef.current, true);
    }
  };

  const handleHoldUp = () => {
    if (!holdPressedRef.current && !pointerDownRef.current) return;
    holdPressedRef.current = false;
    pointerDownRef.current = false;
    const attempt = attemptRef.current;
    if (attempt.phase === 'RUNWAY') {
      attempt.releaseToGather();
      return;
    }
    if (attempt.phase === 'PLANT') {
      attempt.releaseTakeoff();
    }
  };

  const handlePlantDown = () => {
    const attempt = attemptRef.current;
    if (attempt.phase === 'GATHER') {
      attempt.commitPlant();
    }
  };

  const handleDunkDown = () => {
    const attempt = attemptRef.current;
    if (attempt.phase === 'TAKEOFF' || attempt.phase === 'HANG') {
      attempt.inputAir(stickXRef.current, true);
    }
  };

  const handleStick = (x: number, y: number) => {
    void y;
    stickXRef.current = x;
    const attempt = attemptRef.current;
    if (attempt.phase === 'TAKEOFF' || attempt.phase === 'HANG') {
      attempt.inputAir(x, true);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'KeyZ') {
        e.preventDefault();
        handleHoldDown();
      } else if (e.code === 'KeyX' || e.code === 'KeyK') {
        handlePlantDown();
      } else if (e.code === 'KeyC' || e.code === 'KeyL') {
        handleDunkDown();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        handleStick(-1, 0);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        handleStick(1, 0);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyZ') {
        handleHoldUp();
      } else if (
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight' ||
        e.code === 'KeyA' ||
        e.code === 'KeyD'
      ) {
        handleStick(0, 0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  });

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
    <div className="relative w-full h-full min-h-screen bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none z-0"
      />

      <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2.5 rounded-full bg-black/45 border border-white/20 text-white pointer-events-auto cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/40 text-white/70 border border-white/15 uppercase tracking-widest">
            VENICE NIGHT COURT
          </span>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2.5 rounded-full bg-black/45 border border-white/20 text-zinc-300 pointer-events-auto cursor-pointer"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {!ready && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
            {loadError ?? 'Loading Mixamo dunker…'}
          </span>
        </div>
      )}

      {cue && phase === 'IDLE' && !showCase && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest">
            {cue}
          </span>
        </div>
      )}

      {showCase && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-[min(92%,28rem)] pointer-events-auto">
          <div className="px-3 py-2 rounded-xl bg-black/55 border border-white/15">
            <div className="mb-1">
              <div className={`text-sm font-orbitron font-black ${result?.isMake ? 'text-[#00FF9D]' : 'text-red-400'}`}>
                {result?.isMake ? copy.makeHeadline : caseMissHeadline(result?.missReason ?? null)}
              </div>
              <div className="text-[10px] font-mono text-zinc-300 mt-0.5">
                {result?.isMake ? copy.makeSub : caseMissSub(result?.missReason ?? null)}
              </div>
            </div>
            <div className="text-[9px] font-mono text-zinc-400 mt-1">
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
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={nextAttempt}
                className="flex-1 px-2 py-1.5 rounded-lg bg-white/10 border border-white/20 text-[10px] font-mono font-bold text-white"
              >
                {copy.nextAttempt}
              </button>
              <button
                type="button"
                onClick={instantRetry}
                className="flex-1 px-2 py-1.5 rounded-lg bg-[#00F2FF] text-black text-[10px] font-mono font-bold"
              >
                {copy.instantRetry}
              </button>
            </div>
          </div>
        </div>
      )}

      <EmulatorPadOverlay
        onStick={handleStick}
        onHoldDown={handleHoldDown}
        onHoldUp={handleHoldUp}
        onPlantDown={handlePlantDown}
        onDunkDown={handleDunkDown}
      />
    </div>
  );
};
