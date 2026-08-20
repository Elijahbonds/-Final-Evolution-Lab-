/**
 * Venice dunk loop regressions — hang continuity, contact-time outcome,
 * gather you can miss early/late, plant input, no auto-plant tape.
 */

import {
  EASTBAY_MASTER_STANDARD,
  hangWorldY,
  hangDropFromApex,
  AIR_G,
  takeoffRiseSeconds,
  takeoffWorldY,
  rimDeflectionY,
  metricsFromPlant,
  decideContact,
  judgeGatherCommit,
  gatherWindowState,
  styleFromAirSteer,
  VeniceDunkAttempt,
} from '../src/core/VeniceDunkLoop';
import { readFileSync } from 'node:fs';
import {
  parseBvh,
  hangFrame01,
  hangContactT01,
  plantFrame01,
  takeoffFrame01,
  mapBvhJointToMixamo,
  ELIJAH_DUNK_BVH,
  ELIJAH_DUNK_CLIP,
  isElijahDunkTake,
} from '../src/lib/babylon/bvhRetarget';
import { VENICE_RESULT_COPY, caseMissHeadline, caseMissSub } from '../src/core/veniceResultCopy';

export interface TestResult {
  name: string;
  passed: boolean;
  actual: string;
  expected: string;
}

function driveToGather(attempt: VeniceDunkAttempt, runwayFrames = 32): void {
  attempt.startRunway();
  for (let i = 0; i < runwayFrames; i++) attempt.tick(1 / 60);
  attempt.releaseToGather();
}

function commitWhenWindow(attempt: VeniceDunkAttempt, maxFrames = 50): boolean {
  for (let i = 0; i < maxFrames; i++) {
    if (judgeGatherCommit(attempt.rootZ()) === 'WINDOW') {
      return attempt.commitPlant() === 'WINDOW';
    }
    attempt.tick(1 / 60);
    if (attempt.phase === 'BLOWN') return false;
  }
  return false;
}

function holdPlantFrames(attempt: VeniceDunkAttempt, frames: number): void {
  for (let i = 0; i < frames; i++) {
    if (attempt.phase !== 'PLANT') break;
    attempt.tick(1 / 60);
  }
}

function finishAirToContact(attempt: VeniceDunkAttempt): void {
  if (attempt.phase === 'PLANT') attempt.releaseTakeoff();
  for (let i = 0; i < 160; i++) {
    if (attempt.phase === 'TAKEOFF' || attempt.phase === 'HANG') {
      attempt.inputAir(0, true);
    }
    attempt.tick(1 / 60);
    if (attempt.outcome) break;
  }
}

function playLiveAttempt(plantFrames: number): VeniceDunkAttempt {
  const attempt = new VeniceDunkAttempt();
  driveToGather(attempt);
  commitWhenWindow(attempt);
  holdPlantFrames(attempt, plantFrames);
  finishAirToContact(attempt);
  return attempt;
}

export function runVeniceDunkLoopTests(): TestResult[] {
  const results: TestResult[] = [];

  {
    const takeoffApex = takeoffWorldY(1, 0.04, 2.15);
    const hang0 = hangWorldY(0, takeoffApex);
    const rejected = 2.15 * Math.sin((1 - 0) * Math.PI);
    const passed = Math.abs(hang0 - takeoffApex) < 1e-6 && hang0 > 1.5 && rejected < 1e-6;
    results.push({
      name: 'Hang y is continuous from takeoff apex (not sin hop at y=0)',
      passed,
      actual: `hang(0)=${hang0.toFixed(4)} takeoffApex=${takeoffApex.toFixed(4)} rejectedSin=${rejected.toFixed(4)}`,
      expected: 'hang(0) === takeoff apex and rejected formula === 0',
    });
  }

  {
    const apex = 2.1;
    const samples = [0, 0.08, 0.16, 0.24, 0.32, 0.4].map((t) => hangWorldY(t, apex));
    const neverRises = samples.every((y, i) => y <= apex + 1e-9 && (i === 0 || y <= samples[i - 1] + 1e-9));
    const drop = apex - samples[samples.length - 1];
    const hover = 0.10 + (1 - 0.81) * 0.12;
    results.push({
      name: 'Hang y never rises after takeoff apex (ballistic fall)',
      passed: neverRises && drop >= 0.6 && drop > hover + 0.4 && samples[0] === apex,
      actual: `${samples.map((y) => y.toFixed(3)).join(', ')} drop=${drop.toFixed(3)} hoverWas=${hover.toFixed(3)}`,
      expected: '½gt² from 2.1 over 0.4s (~0.66m), not a 10–22cm hover',
    });
  }

  {
    const attempt = new VeniceDunkAttempt();
    driveToGather(attempt);
    const planted = commitWhenWindow(attempt);
    const afterPlant = attempt.outcome;
    holdPlantFrames(attempt, 10);
    finishAirToContact(attempt);
    const passed =
      planted &&
      afterPlant === null &&
      attempt.phase === 'CONTACT' &&
      attempt.outcome !== null;
    results.push({
      name: 'Outcome is not locked on pointer-up; first exists at CONTACT',
      passed,
      actual: `planted=${planted} afterPlant=${afterPlant} phase=${attempt.phase} outcome=${attempt.outcome ? 'set' : 'null'}`,
      expected: 'null until CONTACT, then set',
    });
  }

  {
    const idle = new VeniceDunkAttempt();
    driveToGather(idle);
    for (let i = 0; i < 15; i++) idle.tick(1 / 60);
    const after024 = idle.phase;
    const zone024 = gatherWindowState(idle.rootZ());

    for (let i = 0; i < 9; i++) idle.tick(1 / 60);
    const after396 = idle.phase;

    const mash = new VeniceDunkAttempt();
    driveToGather(mash);
    const mashVerdict = mash.commitPlant();

    const late = new VeniceDunkAttempt();
    driveToGather(late);
    let lateSawPlant = false;
    for (let i = 0; i < 80; i++) {
      late.tick(1 / 60);
      if (late.phase === 'PLANT') lateSawPlant = true;
      if (late.phase === 'BLOWN') break;
    }

    const passed =
      after024 !== 'PLANT' &&
      after024 !== 'BLOWN' &&
      after396 !== 'PLANT' &&
      mashVerdict === 'EARLY' &&
      mash.phase === 'BLOWN' &&
      mash.outcome?.missReason === 'EARLY' &&
      mash.metrics !== null &&
      late.phase === 'BLOWN' &&
      late.gatherMiss === 'LATE' &&
      late.plant === null &&
      !lateSawPlant &&
      late.outcome?.missReason === 'LATE' &&
      late.metrics !== null;
    results.push({
      name: 'Gather window: no 0.24s auto-plant; late miss fires without ever planting',
      passed,
      actual: `t0.24=${after024}/${zone024} t0.396=${after396} mash=${mashVerdict}/${mash.outcome?.missReason} late=${late.phase}/${late.gatherMiss}/${late.outcome?.missReason} latePlanted=${lateSawPlant}`,
      expected: '0.24s and 0.396s never PLANT; mash EARLY on CASE; LATE on CASE without a plant phase',
    });
  }

  {
    const plant = { gctMs: 178.4, trunkLeanDeg: 6.2, compression01: 0.7, approachSpeed: 7.1 };
    const metrics = metricsFromPlant(plant, 0.84, 0);
    const dressed = Math.round(164 + (1 - 0.8) * 60);
    const passed =
      metrics.gctMs === 178 &&
      metrics.gctMs !== EASTBAY_MASTER_STANDARD.gctMs &&
      metrics.gctMs !== dressed &&
      metrics.verticalIn !== EASTBAY_MASTER_STANDARD.verticalIn &&
      metrics.elasticRecoilBw !== EASTBAY_MASTER_STANDARD.elasticRecoilBw;
    results.push({
      name: 'CASE metrics are plant-measured, not Eastbay literals or GCT_SWEET+(1-q)*60',
      passed,
      actual: JSON.stringify(metrics) + ` dressed=${dressed}`,
      expected: 'gct 178, none of 164 / 38.5 / 4.8 / dressed 176',
    });
  }

  {
    const passed =
      EASTBAY_MASTER_STANDARD.role === 'CASE_COMPARISON' &&
      EASTBAY_MASTER_STANDARD.classification === 'NOT CLINICAL' &&
      EASTBAY_MASTER_STANDARD.gctMs === 164 &&
      EASTBAY_MASTER_STANDARD.verticalIn === 38.5 &&
      EASTBAY_MASTER_STANDARD.elasticRecoilBw === 4.8 &&
      EASTBAY_MASTER_STANDARD.trunkLeanDeg === 3.0;
    results.push({
      name: 'Eastbay is Master Standard CASE comparison, NOT CLINICAL',
      passed,
      actual: `${EASTBAY_MASTER_STANDARD.role} / ${EASTBAY_MASTER_STANDARD.classification}`,
      expected: 'CASE_COMPARISON / NOT CLINICAL with 164 / 38.5 / 4.8 / 3.0',
    });
  }

  {
    const make = decideContact(false, {
      gctMs: 168,
      trunkLeanDeg: 5,
      compression01: 0.8,
      approachSpeed: 7.4,
    }, 0.95, 3.05, 'WINDOW');
    const missShort = decideContact(false, {
      gctMs: 190,
      trunkLeanDeg: 8,
      compression01: 0.4,
      approachSpeed: 2.0,
    }, 0.42, 3.05, 'WINDOW');
    const air = decideContact(false, {
      gctMs: 168,
      trunkLeanDeg: 5,
      compression01: 0.8,
      approachSpeed: 7.4,
    }, 0.95, 3.05, 'NONE');
    const defl = rimDeflectionY(0.5, make.rimDeflectionM);
    const passed =
      make.isMake &&
      make.rimDeflectionM > 0 &&
      defl < 0 &&
      missShort.rimDeflectionM === 0 &&
      !air.isMake &&
      air.missReason === 'AIR';
    results.push({
      name: 'Rim deflects on contact makes; air finish NONE is a miss at contact',
      passed,
      actual: `makeDefl=${make.rimDeflectionM.toFixed(3)} air=${air.missReason} shortDefl=${missShort.rimDeflectionM}`,
      expected: 'make > 0; NONE → AIR; short = 0',
    });
  }

  {
    const attempt = new VeniceDunkAttempt();
    driveToGather(attempt);
    const planted = commitWhenWindow(attempt);
    const afterCommit = attempt.outcome;
    holdPlantFrames(attempt, 10);
    const gctWhileHeld = attempt.plantElapsed * 1000;
    attempt.releaseTakeoff();
    let firstHangY: number | null = null;
    let apexAtHang: number | null = null;
    let hangRose = false;
    let lastHangY = Number.POSITIVE_INFINITY;
    let plantBeforeOutcome = false;
    for (let i = 0; i < 200; i++) {
      if (attempt.phase === 'TAKEOFF' || attempt.phase === 'HANG') attempt.inputAir(0, true);
      attempt.tick(1 / 60);
      if (attempt.phase === 'HANG') {
        const y = attempt.rootY();
        if (firstHangY === null) {
          firstHangY = y;
          apexAtHang = attempt.takeoffApexY;
          lastHangY = y;
        } else {
          if (y > lastHangY + 1e-6 || y > (apexAtHang ?? y) + 1e-6) hangRose = true;
          lastHangY = y;
        }
      }
      if (attempt.plant && attempt.outcome === null) plantBeforeOutcome = true;
      if (attempt.outcome) break;
    }
    const continuous =
      firstHangY !== null &&
      apexAtHang !== null &&
      Math.abs(firstHangY - apexAtHang) < 0.08;
    const plantHeld = gctWhileHeld > 80 && attempt.plant !== null && Math.abs((attempt.plant.gctMs) - gctWhileHeld) < 25;
    const passed = planted && afterCommit === null && continuous && !hangRose && plantBeforeOutcome && plantHeld && attempt.outcome !== null;
    results.push({
      name: 'Live attempt: hang starts at recorded apex and never rises; plant hold clocks GCT',
      passed,
      actual: `hang0=${firstHangY?.toFixed(3)} apex=${apexAtHang?.toFixed(3)} rose=${hangRose} heldMs=${gctWhileHeld.toFixed(0)} plantMs=${attempt.plant?.gctMs}`,
      expected: 'hang y ≈ apex, no rise, GCT from hold, plant before CONTACT',
    });
  }

  {
    const made = playLiveAttempt(10);
    const passed =
      made.outcome !== null &&
      made.outcome.isMake === true &&
      made.plant !== null &&
      made.plant.gctMs < 240 &&
      made.plant.gctMs !== EASTBAY_MASTER_STANDARD.gctMs;
    results.push({
      name: 'Live VeniceDunkAttempt can make (not a hand-built 168ms fixture)',
      passed,
      actual: `isMake=${made.outcome?.isMake} reason=${made.outcome?.missReason} gct=${made.plant?.gctMs} comp=${made.plant?.compression01.toFixed(2)}`,
      expected: 'isMake true from the attempt class',
    });
  }

  {
    const shortHold = playLiveAttempt(8);
    const longHold = playLiveAttempt(22);
    const gctA = shortHold.plant?.gctMs ?? 0;
    const gctB = longHold.plant?.gctMs ?? 0;
    const passed =
      gctA > 0 &&
      gctB > 0 &&
      gctA !== gctB &&
      gctA !== 283 &&
      gctB !== 283 &&
      !(gctA === 164 && gctB === 164) &&
      longHold.outcome?.isMake === false;
    results.push({
      name: 'Live plant GCT varies with hold; long hold is not the only timer and not Eastbay 164',
      passed,
      actual: `short=${gctA} long=${gctB} longMake=${longHold.outcome?.isMake} longReason=${longHold.outcome?.missReason}`,
      expected: 'different GCTs, neither stuck at 283, long hold misses mushy',
    });
  }

  {
    const attempt = playLiveAttempt(10);
    for (let i = 0; i < 80; i++) attempt.tick(1 / 60);
    const passed = attempt.phase === 'IDLE';
    results.push({
      name: 'After land the loop is IDLE (retry in one breath, no SCORED modal state)',
      passed,
      actual: attempt.phase,
      expected: 'IDLE',
    });
  }

  {
    const attempt = new VeniceDunkAttempt();
    driveToGather(attempt);
    commitWhenWindow(attempt);
    holdPlantFrames(attempt, 10);
    attempt.releaseTakeoff();
    for (let i = 0; i < 160; i++) {
      attempt.tick(1 / 60);
      if (attempt.outcome) break;
    }
    const passed =
      attempt.outcome !== null &&
      attempt.outcome.isMake === false &&
      attempt.outcome.missReason === 'AIR';
    results.push({
      name: 'No air input through hang is a miss at contact (not a make tape)',
      passed,
      actual: `${attempt.outcome?.missReason} make=${attempt.outcome?.isMake}`,
      expected: 'AIR miss at CONTACT',
    });
  }

  {
    const mapOk =
      styleFromAirSteer(0) === 'REVERSE_TWO_HAND' &&
      styleFromAirSteer(-0.4) === 'WINDMILL' &&
      styleFromAirSteer(0.4) === 'TOMAHAWK' &&
      styleFromAirSteer(0.95) === '360_SPIN' &&
      styleFromAirSteer(-0.95) === '360_SPIN';

    const attempt = new VeniceDunkAttempt();
    driveToGather(attempt);
    commitWhenWindow(attempt);
    holdPlantFrames(attempt, 10);
    attempt.releaseTakeoff();
    let hangStyle = attempt.style;
    for (let i = 0; i < 80; i++) {
      attempt.tick(1 / 60);
      if (attempt.phase === 'HANG') {
        attempt.inputAir(-0.35);
        hangStyle = attempt.style;
        break;
      }
    }
    const passed = mapOk && hangStyle === 'WINDMILL';
    results.push({
      name: 'Hang style comes from air steer during the play, not a pre-pick tab',
      passed,
      actual: `mapOk=${mapOk} hangStyle=${hangStyle}`,
      expected: 'center reverse, left windmill, right tomahawk, flick 360; live hang = WINDMILL',
    });
  }

  {
    let bvhText = '';
    try {
      bvhText = readFileSync(new URL(`../public/assets/${ELIJAH_DUNK_BVH}`, import.meta.url), 'utf8');
    } catch {
      bvhText = '';
    }
    const parsed = bvhText ? parseBvh(bvhText) : null;
    const name = parsed?.meta.clipName ?? '';
    const hangSpan = parsed ? parsed.meta.hangEnd - parsed.meta.hangStart : 0;
    const t0 = parsed ? hangFrame01(parsed.meta, 0) : -1;
    const t1 = parsed ? hangFrame01(parsed.meta, 1) : -1;
    const windowed =
      !!parsed &&
      parsed.meta.hangStart > 50 &&
      hangSpan > 8 &&
      hangSpan < 80 &&
      t0 === parsed.meta.hangStart &&
      t1 === parsed.meta.hangEnd &&
      t1 < parsed.frames.length - 100;
    const passed =
      !!parsed &&
      isElijahDunkTake(bvhText) &&
      parsed.frames.length > 20 &&
      parsed.joints.length > 10 &&
      name === ELIJAH_DUNK_CLIP &&
      !name.includes('SLAM_CLIP') &&
      !name.includes('cmu') &&
      windowed;
    results.push({
      name: 'Hang body is basketball_dunk__elijah.bvh windowed apex-through-rim, not the whole take',
      passed,
      actual: parsed
        ? `clip=${name} frames=${parsed.frames.length} hang=${parsed.meta.hangStart}-${parsed.meta.hangEnd} t0=${t0} t1=${t1}`
        : `missing public/assets/${ELIJAH_DUNK_BVH}; CMU lay-up is not the hang take`,
      expected: 'one Elijah take; hangFrame01(0..1) is apex→rim, not 0→2028',
    });
  }

  {
    let bvhText = '';
    let modeSrc = '';
    try {
      bvhText = readFileSync(new URL(`../public/assets/${ELIJAH_DUNK_BVH}`, import.meta.url), 'utf8');
      modeSrc = readFileSync(new URL('../src/components/modes/BabylonDunkMode.tsx', import.meta.url), 'utf8');
    } catch {
      bvhText = '';
    }
    const parsed = bvhText ? parseBvh(bvhText) : null;
    const hips = parsed?.joints.find((j) => mapBvhJointToMixamo(j.name) === 'Hips');
    const yi = hips?.channels.indexOf('Yposition') ?? -1;
    const yAt = (frame: number) => {
      if (!parsed || !hips || yi < 0) return Number.NaN;
      return parsed.frames[Math.round(frame)]?.[hips.channelOffset + yi] ?? Number.NaN;
    };
    const contactT = parsed ? hangContactT01(parsed.meta) : 1;
    const contactFrame = parsed ? hangFrame01(parsed.meta, contactT) : -1;
    const landFrame = parsed ? hangFrame01(parsed.meta, 1) : -1;
    const yContact = yAt(contactFrame);
    const yLand = yAt(landFrame);
    const forcesT1 =
      modeSrc.includes("CONTACT' ? 1") ||
      modeSrc.includes('CONTACT ? 1') ||
      /phase === 'CONTACT' \? 1/.test(modeSrc);
    const usesContactT = modeSrc.includes('hangContactT01');
    const passed =
      !!parsed &&
      contactT < 1 - 1e-6 &&
      contactFrame >= parsed.meta.hangStart &&
      contactFrame < parsed.meta.hangEnd &&
      Math.abs(contactFrame - parsed.meta.hangContact) < 1e-6 &&
      yContact > 150 &&
      yLand < 80 &&
      !forcesT1 &&
      usesContactT;
    results.push({
      name: 'CONTACT samples Elijah rim pose in the hang window, not t=1 land squash',
      passed,
      actual: parsed
        ? `contactT=${contactT.toFixed(3)} frame=${contactFrame.toFixed(1)} y=${yContact.toFixed(1)} t1=${landFrame} y1=${yLand.toFixed(1)} forceT1=${forcesT1} usesContactT=${usesContactT} hang=${parsed.meta.hangStart}-${parsed.meta.hangEnd}`
        : `missing public/assets/${ELIJAH_DUNK_BVH}`,
      expected: 'hangContact t<1, Hips Y still aerial, hangEnd Y≈68 squash; mode does not force t=1',
    });
  }

  {
    let bvhText = '';
    let athleteSrc = '';
    try {
      bvhText = readFileSync(new URL(`../public/assets/${ELIJAH_DUNK_BVH}`, import.meta.url), 'utf8');
      athleteSrc = readFileSync(new URL('../src/lib/babylon/MixamoAthlete.ts', import.meta.url), 'utf8');
    } catch {
      bvhText = '';
    }
    const parsed = bvhText ? parseBvh(bvhText) : null;
    const hips = parsed?.joints.find((j) => mapBvhJointToMixamo(j.name) === 'Hips');
    const yi = hips?.channels.indexOf('Yposition') ?? -1;
    const yAt = (frame: number) => {
      if (!parsed || !hips || yi < 0) return Number.NaN;
      return parsed.frames[Math.round(frame)]?.[hips.channelOffset + yi] ?? Number.NaN;
    };
    const plant0 = parsed ? plantFrame01(parsed.meta, 0) : -1;
    const plant1 = parsed ? plantFrame01(parsed.meta, 1) : -1;
    const take0 = parsed ? takeoffFrame01(parsed.meta, 0) : -1;
    const take1 = parsed ? takeoffFrame01(parsed.meta, 1) : -1;
    const yPlant = yAt(plant1);
    const yTake0 = yAt(take0);
    const yTake1 = yAt(take1);
    const liveFromBake =
      athleteSrc.includes('APPROACH_TRACKS') ||
      athleteSrc.includes('slamClipTracks') ||
      athleteSrc.includes('writeTrack');
    const samplesTake =
      athleteSrc.includes('plantFrame01') &&
      athleteSrc.includes('takeoffFrame01') &&
      athleteSrc.includes('dunkTake');
    const passed =
      !!parsed &&
      parsed.meta.plantEnd < parsed.meta.hangStart &&
      parsed.meta.plantStart < parsed.meta.plantEnd &&
      parsed.meta.plantStart > 100 &&
      parsed.meta.takeoffStart === parsed.meta.plantEnd &&
      parsed.meta.takeoffEnd === parsed.meta.hangStart &&
      plant0 === parsed.meta.plantStart &&
      plant1 === parsed.meta.plantEnd &&
      take0 === parsed.meta.takeoffStart &&
      take1 === parsed.meta.takeoffEnd &&
      yPlant < 120 &&
      yTake0 < 120 &&
      yTake1 > 200 &&
      yTake1 > yTake0 + 80 &&
      !liveFromBake &&
      samplesTake;
    results.push({
      name: 'Plant and takeoff windows are on basketball_dunk__elijah.bvh before hangStart',
      passed,
      actual: parsed
        ? `plant=${parsed.meta.plantStart}-${parsed.meta.plantEnd} y1=${yPlant.toFixed(1)} takeoff=${parsed.meta.takeoffStart}-${parsed.meta.takeoffEnd} y0=${yTake0.toFixed(1)} y1=${yTake1.toFixed(1)} hang=${parsed.meta.hangStart} bake=${liveFromBake} sample=${samplesTake}`
        : `missing public/assets/${ELIJAH_DUNK_BVH}`,
      expected: 'same 2029-frame take; plant on the floor; takeoff rises into hangStart 222; not slamClipTracks',
    });
  }

  {
    const t = 0.38;
    const drop = hangDropFromApex(1.06, t);
    const hover = 0.10 + (1 - 0.81) * 0.12;
    const y0 = hangWorldY(0, 1.06);
    const y1 = hangWorldY(t, 1.06);
    const halfSec = 1.06 - hangWorldY(0.5, 1.06);
    const passed =
      Math.abs(drop - 0.5 * AIR_G * t * t) < 1e-9 &&
      drop > hover + 0.4 &&
      halfSec > 0.9 &&
      Math.abs(y0 - 1.06) < 1e-9 &&
      y1 < y0 - 0.5 &&
      AIR_G >= 6 &&
      Math.abs(takeoffRiseSeconds(1.06) - 0.3) > 0.08;
    results.push({
      name: 'Hang fall is ½gt² from apex; extraHang is not a 10–22cm hover',
      passed,
      actual: `drop=${drop.toFixed(3)} hoverWas=${hover.toFixed(3)} halfSec=${halfSec.toFixed(3)} y0=${y0.toFixed(3)} y1=${y1.toFixed(3)} riseT=${takeoffRiseSeconds(1.06).toFixed(3)} g=${AIR_G}`,
      expected: '0.38s drop ≈ 0.59m, 0.5s drop ≈ 1.03m, not 0.10+(1-comp)*0.12',
    });
  }

  {
    const attempt = new VeniceDunkAttempt();
    driveToGather(attempt);
    commitWhenWindow(attempt);
    holdPlantFrames(attempt, 10);
    attempt.releaseTakeoff();
    let y0: number | null = null;
    let y1 = 0;
    let apex = 0;
    let rose = false;
    let last = Number.POSITIVE_INFINITY;
    let formulaDrift = false;
    for (let i = 0; i < 160; i++) {
      if (attempt.phase === 'TAKEOFF' || attempt.phase === 'HANG') attempt.inputAir(0, true);
      attempt.tick(1 / 60);
      if (attempt.phase === 'HANG') {
        const y = attempt.rootY();
        const expected = hangWorldY(attempt.hangElapsed, attempt.takeoffApexY);
        if (Math.abs(y - expected) > 1e-6) formulaDrift = true;
        if (y0 === null) {
          y0 = y;
          apex = attempt.takeoffApexY;
          last = y;
        } else {
          if (y > last + 1e-6) rose = true;
          last = y;
          y1 = y;
        }
      }
      if (attempt.outcome) break;
    }
    const drop = (y0 ?? 0) - y1;
    const hover = 0.10 + (1 - attempt.compression01) * 0.12;
    const extra = attempt.extraHang();
    const passed =
      y0 !== null &&
      Math.abs((y0 ?? 0) - apex) < 0.08 &&
      !rose &&
      !formulaDrift &&
      drop >= 0.25 &&
      extra > hover + 0.1 &&
      Math.abs(extra - 0.5 * AIR_G * attempt.hangElapsed * attempt.hangElapsed) < 1e-6 &&
      attempt.outcome?.isMake === true;
    results.push({
      name: 'Live hang falls from apex and a takeoff hold still finishes at the rim',
      passed,
      actual: `drop=${drop.toFixed(3)} extra=${extra.toFixed(3)} hoverWas=${hover.toFixed(3)} hang0=${y0?.toFixed(3)} apex=${apex.toFixed(3)} rose=${rose} drift=${formulaDrift} make=${attempt.outcome?.isMake}`,
      expected: 'rootY === hangWorldY(t), extraHang === ½gt², takeoff hold → make at the rim',
    });
  }

  {
    const a = playLiveAttempt(10);
    const b = playLiveAttempt(22);
    const takeoffA = a.takeoffElapsed;
    const takeoffB = b.takeoffElapsed;
    const hangA = a.hangElapsed;
    const tape =
      Math.abs(takeoffA - 0.3) < 0.012 &&
      Math.abs(hangA - 0.5) < 0.012;
    const passed =
      !tape &&
      Math.abs(takeoffA - 0.3) > 0.05 &&
      Math.abs(hangA - 0.5) > 0.05 &&
      Math.abs(takeoffA - takeoffB) > 0.02 &&
      hangA > 0.12 &&
      hangA < 1.2 &&
      a.outcome?.isMake === true;
    results.push({
      name: 'Air after WINDOW plant is not a 0.30/0.50 tape; plant changes rise time',
      passed,
      actual: `takeoffA=${takeoffA.toFixed(3)} takeoffB=${takeoffB.toFixed(3)} hangA=${hangA.toFixed(3)} tape=${tape} make=${a.outcome?.isMake}`,
      expected: 'takeoff !== 0.30, hang !== 0.50, different plants different rise, make still possible',
    });
  }

  {
    const early = new VeniceDunkAttempt();
    driveToGather(early);
    commitWhenWindow(early);
    holdPlantFrames(early, 10);
    early.releaseTakeoff();
    for (let i = 0; i < 160; i++) {
      early.tick(1 / 60);
      if (early.phase === 'HANG') {
        early.inputAir(0, true);
        for (let j = 0; j < 20; j++) {
          early.tick(1 / 60);
          if (early.outcome) break;
        }
        break;
      }
    }
    const passed =
      early.outcome !== null &&
      early.outcome.isMake === false &&
      early.outcome.missReason === 'RIM_OUT' &&
      early.hangElapsed < 0.2;
    results.push({
      name: 'First hang press far from the rim is an early miss, not a 0.50s QTE window',
      passed,
      actual: `reason=${early.outcome?.missReason} hangT=${early.hangElapsed.toFixed(3)} make=${early.outcome?.isMake}`,
      expected: 'RIM_OUT on first hang press while short of the rim',
    });
  }

  {
    const c = VENICE_RESULT_COPY;
    const plantHead = 'Missed the plant, not the rim.';
    const lateLine = 'Gather was late. The block foot paid for it.';
    const earlyLine = 'Left too early. You never loaded it.';
    const mushyLine = 'You stayed in the plant.';
    const airLine = "Never got there. That's air.";
    const rimLine = 'Caught iron. Off the window.';
    const modeSrc = (() => {
      try {
        return readFileSync(new URL('../src/components/modes/BabylonDunkMode.tsx', import.meta.url), 'utf8');
      } catch {
        return '';
      }
    })();
    const copySrc = (() => {
      try {
        return readFileSync(new URL('../src/core/veniceResultCopy.ts', import.meta.url), 'utf8');
      } catch {
        return '';
      }
    })();
    const late = new VeniceDunkAttempt();
    driveToGather(late);
    for (let i = 0; i < 80; i++) {
      late.tick(1 / 60);
      if (late.outcome) break;
    }
    const mash = new VeniceDunkAttempt();
    driveToGather(mash);
    mash.commitPlant();
    const mushy = playLiveAttempt(22);
    const air = new VeniceDunkAttempt();
    driveToGather(air);
    commitWhenWindow(air);
    holdPlantFrames(air, 10);
    air.releaseTakeoff();
    for (let i = 0; i < 160; i++) {
      air.tick(1 / 60);
      if (air.outcome) break;
    }
    const rim = new VeniceDunkAttempt();
    driveToGather(rim);
    commitWhenWindow(rim);
    holdPlantFrames(rim, 10);
    rim.releaseTakeoff();
    for (let i = 0; i < 160; i++) {
      rim.tick(1 / 60);
      if (rim.phase === 'HANG') {
        rim.inputAir(0, true);
        for (let j = 0; j < 20; j++) {
          rim.tick(1 / 60);
          if (rim.outcome) break;
        }
        break;
      }
    }
    const routed =
      late.outcome?.missReason === 'LATE' &&
      late.metrics !== null &&
      mash.outcome?.missReason === 'EARLY' &&
      mash.metrics !== null &&
      mushy.outcome?.missReason === 'MUSHY_PLANT' &&
      air.outcome?.missReason === 'AIR' &&
      rim.outcome?.missReason === 'RIM_OUT' &&
      caseMissSub('LATE') === lateLine &&
      caseMissSub('EARLY') === earlyLine &&
      caseMissSub('MUSHY_PLANT') === mushyLine &&
      caseMissSub('AIR') === airLine &&
      caseMissSub('RIM_OUT') === rimLine &&
      caseMissHeadline('LATE') === plantHead &&
      caseMissHeadline('EARLY') === plantHead &&
      caseMissHeadline('MUSHY_PLANT') === plantHead &&
      caseMissHeadline('AIR') === airLine &&
      caseMissHeadline('SHORT') === airLine &&
      caseMissHeadline('SHORT') !== plantHead &&
      caseMissHeadline('RIM_OUT') === rimLine &&
      caseMissHeadline('AIR') !== plantHead &&
      caseMissHeadline('RIM_OUT') !== plantHead &&
      caseMissSub('SHORT') === airLine &&
      caseMissSub('SHORT') !== '' &&
      caseMissSub('EARLY') !== lateLine &&
      caseMissSub('MUSHY_PLANT') !== lateLine &&
      c.makeHeadline === "That's the Bonds Bounce." &&
      c.missHeadline === plantHead &&
      !c.missHeadline.includes('SLAMMED') &&
      !copySrc.includes('missHeadlineLate') &&
      !copySrc.includes('missHeadlineEarly') &&
      !copySrc.includes('You mashed the mark.') &&
      !copySrc.includes('Held too long. The bounce sat.') &&
      !copySrc.includes("'Gather was late.'") &&
      !copySrc.includes("'Gather was early.'") &&
      modeSrc.includes('caseMissHeadline') &&
      modeSrc.includes('setResult(snap.outcome)');
    const appSrc = (() => {
      try {
        return readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
      } catch {
        return '';
      }
    })();
    const overlaySrc = (() => {
      try {
        return readFileSync(new URL('../src/components/modes/EmulatorPadOverlay.tsx', import.meta.url), 'utf8');
      } catch {
        return '';
      }
    })();
    const mixamoFailIdx = modeSrc.indexOf('Mixamo dunker failed to load');
    const mixamoFailWindow = mixamoFailIdx > -1 ? modeSrc.slice(mixamoFailIdx, mixamoFailIdx + 280) : '';
    const courtAssignIdx = modeSrc.indexOf('courtRef.current = court');
    const firstAllowedIdx = modeSrc.indexOf('allowedToDraw = true');
    const mixamoTimeoutIdx = modeSrc.indexOf("'Mixamo dunker'");
    const overlayAlwaysOn =
      modeSrc.includes('<EmulatorPadOverlay') &&
      !modeSrc.includes('{ready &&') &&
      !modeSrc.includes('ready ?') &&
      !/ready\s*&&[\s\S]{0,80}EmulatorPadOverlay/.test(modeSrc) &&
      !/phase === 'IDLE'[\s\S]{0,120}aria-label="hold"/.test(modeSrc);
    const emulatorLook =
      overlaySrc.includes('aria-label="joystick"') &&
      overlaySrc.includes('ariaLabel="hold"') &&
      overlaySrc.includes('ariaLabel="plant"') &&
      !overlaySrc.includes('ariaLabel="dunk"') &&
      overlaySrc.includes('emulator-pad') &&
      overlaySrc.includes('emulator-abxy') &&
      overlaySrc.includes('L1') &&
      overlaySrc.includes('L2') &&
      overlaySrc.includes('R1') &&
      overlaySrc.includes('R2') &&
      !overlaySrc.includes('>HOLD<') &&
      !overlaySrc.includes('>PLANT<') &&
      !overlaySrc.includes('>DUNK<') &&
      !overlaySrc.includes('HOLD ·') &&
      !overlaySrc.includes('onDunkDown');
    const fullBleedHub =
      appSrc.includes('dunkLive') &&
      appSrc.includes("arenaMode === 'babylon_dunk'") &&
      appSrc.includes('{!dunkLive &&') &&
      appSrc.includes('fixed inset-0') &&
      modeSrc.includes('z-[4000]') &&
      !modeSrc.includes('h-[720px]') &&
      !modeSrc.includes('unreal-canvas') &&
      !modeSrc.includes('SOVEREIGN PORTAL') &&
      !appSrc.includes('HUD/ARENA');
    const nextPaintCam =
      modeSrc.includes("directedFraming('IDLE'") &&
      !modeSrc.includes('2.8, 1.8, -9.2') &&
      modeSrc.includes('meshyPromise') &&
      modeSrc.includes('playSlam');
    const hangSafeOverlay =
      overlaySrc.includes('emulator-pad-left') &&
      overlaySrc.includes('emulator-pad-right');
    const noChopOnMiss =
      !mixamoFailWindow.includes('stopRenderLoop') &&
      firstAllowedIdx > -1 &&
      courtAssignIdx > -1 &&
      firstAllowedIdx > courtAssignIdx &&
      (mixamoTimeoutIdx < 0 || firstAllowedIdx < mixamoTimeoutIdx) &&
      !modeSrc.includes('1000 / 24');
    const caseDoesNotBuryPad =
      modeSrc.includes('z-10') &&
      modeSrc.includes('pointer-events-none') &&
      modeSrc.includes('plantedGct') &&
      !modeSrc.includes('bottom-24') &&
      overlaySrc.includes('zIndex: 40');
    const overlayAfterCase =
      modeSrc.indexOf('showCase') > -1 &&
      modeSrc.indexOf('<EmulatorPadOverlay') > modeSrc.indexOf('showCase') &&
      !modeSrc.includes('nextAttempt') &&
      !modeSrc.includes('instantRetry') &&
      !modeSrc.includes('keydown') &&
      !modeSrc.includes('onDunkDown') &&
      modeSrc.includes('holdDown') &&
      modeSrc.includes('holdUp') &&
      modeSrc.includes('pointer-events-none');
    const overlayPassed = overlayAlwaysOn && emulatorLook && fullBleedHub && noChopOnMiss && nextPaintCam && hangSafeOverlay && caseDoesNotBuryPad && overlayAfterCase;
    results.push({
      name: 'Console overlay: full-bleed dunk, DualShock faces+shoulders always on canvas, no CASE retry menu, no stopRenderLoop on Mixamo miss',
      passed: overlayPassed,
      actual: `alwaysOn=${overlayAlwaysOn} emulator=${emulatorLook} fullBleed=${fullBleedHub} noChop=${noChopOnMiss} cam=${nextPaintCam} hangSafe=${hangSafeOverlay} caseClear=${caseDoesNotBuryPad} afterCase=${overlayAfterCase} failWindowHasStop=${mixamoFailWindow.includes('stopRenderLoop')}`,
      expected: 'EmulatorPadOverlay always mounted after CASE proof; stick left, ABXY+shoulders right; no HOLD/PLANT/DUNK chrome; no keydown; no NEXT/RETRY buttons; dunkLive hides portal',
    });

    results.push({
      name: 'Miss routing: locked lines only; plant headline on LATE/EARLY/MUSHY; CASE not skipped',
      passed: routed,
      actual: `late=${late.outcome?.missReason}/${caseMissHeadline('LATE')}/${caseMissSub('LATE')} early=${mash.outcome?.missReason}/${caseMissSub('EARLY')} mushy=${mushy.outcome?.missReason}/${caseMissSub('MUSHY_PLANT')} air=${air.outcome?.missReason}/${caseMissHeadline('AIR')} short=${caseMissHeadline('SHORT')}/${caseMissSub('SHORT')} rim=${rim.outcome?.missReason}/${caseMissHeadline('RIM_OUT')}`,
      expected: 'plant headline on LATE/EARLY/MUSHY only; SHORT uses AIR pair; locked lines unchanged; BLOWN sets CASE',
    });
  }

  {
    const hold = new VeniceDunkAttempt();
    hold.holdDown();
    let sawHang = false;
    let rose = false;
    let lastY = Number.POSITIVE_INFINITY;
    let apex = 0;
    for (let i = 0; i < 240; i++) {
      if (hold.phase === 'TAKEOFF' || hold.phase === 'HANG') hold.inputAir(0, true);
      hold.tick(1 / 60);
      if (hold.phase === 'HANG') {
        const y = hold.rootY();
        if (!sawHang) {
          sawHang = true;
          apex = hold.takeoffApexY;
          lastY = y;
        } else if (y > lastY + 1e-6) {
          rose = true;
        } else {
          lastY = y;
        }
      }
      if (hold.outcome) break;
    }
    const tap = new VeniceDunkAttempt();
    tap.holdDown();
    tap.holdUp();
    for (let i = 0; i < 24; i++) {
      tap.tick(1 / 60);
      if (tap.outcome) break;
    }
    const holdGct = hold.plant?.gctMs ?? 0;
    const tapGct = tap.plant?.gctMs ?? tap.metrics?.gctMs ?? 0;
    const passed =
      sawHang &&
      !rose &&
      apex > 0.4 &&
      hold.hangElapsed > 0 &&
      holdGct > 0 &&
      hold.gatherMiss !== 'LATE' &&
      tap.outcome?.missReason === 'EARLY' &&
      tap.outcome?.missReason !== hold.outcome?.missReason &&
      tapGct === 0 &&
      holdGct !== tapGct;
    results.push({
      name: 'QA: one hold leaves ground and hangs with real GCT; one tap blows gather on a different card',
      passed,
      actual: `hang=${sawHang} hangT=${hold.hangElapsed.toFixed(3)} rose=${rose} holdGct=${holdGct} holdReason=${hold.outcome?.missReason} tapReason=${tap.outcome?.missReason} tapGct=${tapGct}`,
      expected: 'hold → hang from apex, GCT > 0; tap → EARLY gather blow, not the same card, no dummy hold GCT 0',
    });
  }

  return results;
}

const nodeProcess = typeof process !== 'undefined' ? process : undefined;
if (nodeProcess?.argv?.[1]?.includes('venice-dunk-loop')) {
  console.log('=== VENICE DUNK LOOP REGRESSIONS ===\n');
  const testResults = runVeniceDunkLoopTests();
  let allPass = true;
  for (const t of testResults) {
    console.log(`${t.passed ? '✓ PASS' : '✗ FAIL'} | ${t.name}`);
    console.log(`  Actual: ${t.actual}`);
    console.log(`  Expected: ${t.expected}\n`);
    if (!t.passed) allPass = false;
  }
  const { runVenicePlaceTests } = await import('./venice-place.test.ts');
  console.log('=== VENICE PLACE / CAM ===\n');
  const placeResults = await runVenicePlaceTests();
  for (const t of placeResults) {
    console.log(`${t.passed ? '✓ PASS' : '✗ FAIL'} | ${t.name}`);
    console.log(`  Actual: ${t.actual}`);
    console.log(`  Expected: ${t.expected}\n`);
    if (!t.passed) allPass = false;
  }
  const { runMixamoSlamMeshTests } = await import('./mixamo-slam-mesh.test.ts');
  console.log('=== MIXAMO SLAM MESH ===\n');
  const meshResults = await runMixamoSlamMeshTests();
  for (const t of meshResults) {
    console.log(`${t.passed ? '✓ PASS' : '✗ FAIL'} | ${t.name}`);
    console.log(`  Actual: ${t.actual}`);
    console.log(`  Expected: ${t.expected}\n`);
    if (!t.passed) allPass = false;
  }
  if (!allPass) {
    console.error('Venice dunk loop tests failed.');
    nodeProcess?.exit(1);
  } else {
    console.log('All Venice dunk loop targets verified.');
  }
}
