/**
 * Venice dunk loop regressions — the e2c1d1b rejects.
 * Hang cannot start at y=0. Outcome cannot exist at pointer-up.
 * Eastbay literals are CASE comparison, not this attempt.
 */

import {
  EASTBAY_MASTER_STANDARD,
  hangWorldY,
  takeoffWorldY,
  rimDeflectionY,
  metricsFromPlant,
  decideContact,
  VeniceDunkAttempt,
} from '../src/core/VeniceDunkLoop';

export interface TestResult {
  name: string;
  passed: boolean;
  actual: string;
  expected: string;
}

export function runVeniceDunkLoopTests(): TestResult[] {
  const results: TestResult[] = [];

  // 1. Rejected hang formula apexHeight * sin((1-p)*π) is 0 at p=0.
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

  // 2. Hang stays off the floor through the first half.
  {
    const apex = 2.1;
    const samples = [0, 0.1, 0.25, 0.4, 0.6].map((p) => hangWorldY(p, apex, 0.2));
    const passed = samples.every((y) => y >= apex - 0.001);
    results.push({
      name: 'Hang y never drops below takeoff apex before the rim settle',
      passed,
      actual: samples.map((y) => y.toFixed(3)).join(', '),
      expected: 'all samples >= 2.1',
    });
  }

  // 3. Outcome is null until CONTACT.
  {
    const attempt = new VeniceDunkAttempt();
    attempt.startRunway();
    for (let i = 0; i < 45; i++) attempt.tick(1 / 60);
    attempt.releaseToGather();
    const afterRelease = attempt.outcome;
    let sawContact = false;
    let outcomeAtContact: typeof attempt.outcome = null;
    for (let i = 0; i < 180; i++) {
      attempt.tick(1 / 60);
      if (attempt.phase === 'CONTACT' && !sawContact) {
        sawContact = true;
        outcomeAtContact = attempt.outcome;
      }
    }
    const passed = afterRelease === null && sawContact && outcomeAtContact !== null;
    results.push({
      name: 'Outcome is not locked on pointer-up; first exists at CONTACT',
      passed,
      actual: `afterRelease=${afterRelease} contactOutcome=${outcomeAtContact ? 'set' : 'null'} sawContact=${sawContact}`,
      expected: 'null until CONTACT, then set',
    });
  }

  // 4. Extra input after release blows gather — still no make-from-charge.
  {
    const attempt = new VeniceDunkAttempt();
    attempt.startRunway();
    for (let i = 0; i < 40; i++) attempt.tick(1 / 60);
    attempt.releaseToGather();
    attempt.inputAfterRelease();
    const mid = attempt.outcome;
    for (let i = 0; i < 40; i++) attempt.tick(1 / 60);
    const passed = attempt.gatherBlown && mid === null && attempt.phase !== 'CONTACT';
    results.push({
      name: 'Input after release can blow the gather; still no charge predicate',
      passed,
      actual: `blown=${attempt.gatherBlown} outcomeAfterInput=${mid} phase=${attempt.phase}`,
      expected: 'blown, outcome null, not CONTACT',
    });
  }

  // 5. Metrics come from the plant clock, not GCT_SWEET+(1-q)*60.
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

  // 6. Eastbay remains CASE comparison, not clinical.
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

  // 7. Rim moves when contact/deflection is printed.
  {
    const make = decideContact(false, {
      gctMs: 168,
      trunkLeanDeg: 5,
      compression01: 0.8,
      approachSpeed: 7.4,
    }, 0.95, 3.05);
    const missShort = decideContact(false, {
      gctMs: 190,
      trunkLeanDeg: 8,
      compression01: 0.4,
      approachSpeed: 2.0,
    }, 0.42, 3.05);
    const defl = rimDeflectionY(0.5, make.rimDeflectionM);
    const passed = make.isMake && make.rimDeflectionM > 0 && defl < 0 && missShort.rimDeflectionM === 0;
    results.push({
      name: 'Rim deflects on contact makes; no fake deflection on a short',
      passed,
      actual: `makeDefl=${make.rimDeflectionM.toFixed(3)} midY=${defl.toFixed(3)} shortDefl=${missShort.rimDeflectionM}`,
      expected: 'make > 0 and mid-contact rim y < 0; short = 0',
    });
  }

  // 8. Full clean attempt: plant exists before outcome, hang y at first hang frame == apex.
  {
    const attempt = new VeniceDunkAttempt();
    attempt.startRunway();
    for (let i = 0; i < 50; i++) attempt.tick(1 / 60);
    attempt.releaseToGather();
    let firstHangY: number | null = null;
    let apexAtHang: number | null = null;
    let plantBeforeOutcome = false;
    for (let i = 0; i < 200; i++) {
      attempt.tick(1 / 60);
      if (attempt.phase === 'HANG' && firstHangY === null) {
        firstHangY = attempt.rootY();
        apexAtHang = attempt.takeoffApexY;
      }
      if (attempt.plant && attempt.outcome === null) plantBeforeOutcome = true;
      if (attempt.outcome) break;
    }
    const continuous =
      firstHangY !== null &&
      apexAtHang !== null &&
      Math.abs(firstHangY - apexAtHang) < 0.08;
    const passed = continuous && plantBeforeOutcome && attempt.outcome !== null;
    results.push({
      name: 'Live attempt: hang starts at recorded apex; plant precedes outcome',
      passed,
      actual: `hang0=${firstHangY?.toFixed(3)} apex=${apexAtHang?.toFixed(3)} plantFirst=${plantBeforeOutcome}`,
      expected: 'hang y ≈ apex, plant sampled before CONTACT',
    });
  }

  // 9. Instant retry: after LAND the attempt returns to IDLE without a scored modal state.
  {
    const attempt = new VeniceDunkAttempt();
    attempt.startRunway();
    for (let i = 0; i < 50; i++) attempt.tick(1 / 60);
    attempt.releaseToGather();
    for (let i = 0; i < 240; i++) attempt.tick(1 / 60);
    const passed = attempt.phase === 'IDLE';
    results.push({
      name: 'After land the loop is IDLE (retry in one breath, no SCORED modal state)',
      passed,
      actual: attempt.phase,
      expected: 'IDLE',
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
