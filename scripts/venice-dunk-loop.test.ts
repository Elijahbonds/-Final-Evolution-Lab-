/**
 * Venice dunk loop regressions — hang continuity, contact-time outcome,
 * gather you can miss early/late, plant input, no auto-plant tape.
 */

import {
  EASTBAY_MASTER_STANDARD,
  hangWorldY,
  hangDropFromApex,
  HANG_HOLD_P,
  takeoffWorldY,
  rimDeflectionY,
  metricsFromPlant,
  decideContact,
  judgeGatherCommit,
  gatherWindowState,
  styleFromAirSteer,
  VeniceDunkAttempt,
} from '../src/core/VeniceDunkLoop';
import { slamArmSignature } from '../src/lib/babylon/slamSilhouettes';

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
  for (let i = 0; i < 80; i++) {
    attempt.tick(1 / 60);
    if (attempt.phase === 'HANG' && attempt.hangElapsed / 0.5 >= 0.32) {
      attempt.inputAir(0);
    }
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
    const hang0 = hangWorldY(0, takeoffApex, 0.25);
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
    const samples = [0, 0.1, 0.25, 0.4, 0.6, 1].map((p) => hangWorldY(p, apex, 0.2));
    const neverRises = samples.every((y, i) => y <= apex + 1e-9 && (i === 0 || y <= samples[i - 1] + 1e-9));
    const falls = samples[samples.length - 1] < apex;
    results.push({
      name: 'Hang y never rises after takeoff apex (ballistic fall)',
      passed: neverRises && falls && samples[0] === apex,
      actual: samples.map((y) => y.toFixed(3)).join(', '),
      expected: 'monotone non-increasing from 2.1, last < apex',
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
      mash.outcome === null &&
      late.phase === 'BLOWN' &&
      late.gatherMiss === 'LATE' &&
      late.plant === null &&
      !lateSawPlant &&
      late.outcome === null;
    results.push({
      name: 'Gather window: no 0.24s auto-plant; late miss fires without ever planting',
      passed,
      actual: `t0.24=${after024}/${zone024} t0.396=${after396} mash=${mashVerdict} late=${late.phase}/${late.gatherMiss} latePlanted=${lateSawPlant}`,
      expected: '0.24s and 0.396s never PLANT; mash EARLY; idle LATE without a plant phase',
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
      attempt.tick(1 / 60);
      if (attempt.phase === 'HANG' && attempt.hangElapsed / 0.5 >= 0.32) attempt.inputAir(0);
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
    for (let i = 0; i < 80; i++) {
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
    const reverse = slamArmSignature('REVERSE_TWO_HAND');
    const mill = slamArmSignature('WINDMILL');
    const hawk = slamArmSignature('TOMAHAWK');
    const spin = slamArmSignature('360_SPIN');
    const passed =
      new Set([reverse, mill, hawk, spin]).size === 4 &&
      !reverse.includes('3.14') &&
      !mill.includes('3.14');
    results.push({
      name: 'Slam silhouettes differ by style and are not a 180 spine twist',
      passed,
      actual: `${reverse} // ${mill} // ${hawk} // ${spin}`,
      expected: 'four distinct arm world-spins, no PI yaw',
    });
  }

  {
    const drop = hangDropFromApex(1.06, 0.81);
    const hover = 0.10 + (1 - 0.81) * 0.12;
    const y0 = hangWorldY(0, 1.06, drop);
    const yHold = hangWorldY(HANG_HOLD_P * 0.8, 1.06, drop);
    const y1 = hangWorldY(1, 1.06, drop);
    const fallT = 0.5 * (1 - HANG_HOLD_P);
    const accel = (2 * drop) / (fallT * fallT);
    const passed =
      drop >= 0.50 &&
      drop > hover + 0.25 &&
      Math.abs(y0 - 1.06) < 1e-9 &&
      Math.abs(yHold - 1.06) < 1e-9 &&
      y1 < y0 - 0.4 &&
      accel >= 6 &&
      HANG_HOLD_P > 0.15 &&
      HANG_HOLD_P < 0.4;
    results.push({
      name: 'Hang holds apex then falls; not a 10-22cm hover',
      passed,
      actual: `drop=${drop.toFixed(3)} hoverWas=${hover.toFixed(3)} y0=${y0.toFixed(3)} yHold=${yHold.toFixed(3)} y1=${y1.toFixed(3)} a=${accel.toFixed(2)} holdP=${HANG_HOLD_P}`,
      expected: 'hold at apex, then drop >= 0.50m, fall accel >= 6',
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
    for (let i = 0; i < 80; i++) {
      attempt.tick(1 / 60);
      if (attempt.phase === 'TAKEOFF') attempt.inputAir(0, true);
      if (attempt.phase === 'HANG') {
        const y = attempt.rootY();
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
    const passed =
      y0 !== null &&
      Math.abs((y0 ?? 0) - apex) < 0.08 &&
      !rose &&
      drop >= 0.4 &&
      attempt.outcome?.isMake === true;
    results.push({
      name: 'Live hang falls from apex (>=40cm) and a takeoff press still finishes',
      passed,
      actual: `drop=${drop.toFixed(3)} hang0=${y0?.toFixed(3)} apex=${apex.toFixed(3)} rose=${rose} make=${attempt.outcome?.isMake}`,
      expected: 'continuous apex, fall >= 0.40m, takeoff press → make',
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
