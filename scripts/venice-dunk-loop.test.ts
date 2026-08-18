/**
 * Venice dunk loop regressions — hang continuity, contact-time outcome,
 * gather you can miss early/late, plant input, no auto-plant tape.
 */

import {
  EASTBAY_MASTER_STANDARD,
  hangWorldY,
  takeoffWorldY,
  rimDeflectionY,
  metricsFromPlant,
  decideContact,
  judgeGatherCommit,
  VeniceDunkAttempt,
} from '../src/core/VeniceDunkLoop';

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
    if (judgeGatherCommit(attempt.gatherElapsed, attempt.rootZ()) === 'WINDOW') {
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

    const mash = new VeniceDunkAttempt();
    driveToGather(mash);
    const mashVerdict = mash.commitPlant();

    const late = new VeniceDunkAttempt();
    driveToGather(late);
    for (let i = 0; i < 80; i++) {
      late.tick(1 / 60);
      if (late.phase === 'BLOWN') break;
    }

    const passed =
      after024 !== 'PLANT' &&
      after024 !== 'TAKEOFF' &&
      mashVerdict === 'EARLY' &&
      mash.phase === 'BLOWN' &&
      mash.outcome === null &&
      late.phase === 'BLOWN' &&
      late.gatherMiss === 'LATE' &&
      late.outcome === null;
    results.push({
      name: 'Gather can miss early or late; doing nothing does not auto-plant',
      passed,
      actual: `idle0.24=${after024} mash=${mashVerdict}/${mash.phase} late=${late.phase}/${late.gatherMiss}`,
      expected: '0.24s still not PLANT; mash EARLY BLOWN; idle LATE BLOWN; outcome null',
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
  if (!allPass) {
    console.error('Venice dunk loop tests failed.');
    nodeProcess?.exit(1);
  } else {
    console.log('All Venice dunk loop targets verified.');
  }
}
