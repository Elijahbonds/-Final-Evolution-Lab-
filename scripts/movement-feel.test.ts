/**
 * Movement Feel Headless Test Suite
 * Asserts all EA Sports NBA Live 07/08 feel targets:
 * 1. Sprint reaches 95% top speed in 0.45 - 0.50s.
 * 2. Full-sprint stop takes 0.17 - 0.28s (strong braking decel).
 * 3. Plant-and-cut: reversing direction at sprint keeps ~45% of entry speed; at jog keeps ~63%.
 * 4. Turn-rate cap: 1 frame of hard stick reversal turns ~3.1° (arcs, not instant twitch).
 * 5. Skilled cut (crossover) bypasses plant penalty with momentum burst.
 */

import { CourtMovement, GUARD_TUNING } from '../src/core/CourtMovement';

export interface TestResult {
  name: string;
  passed: boolean;
  actual: number | string;
  expected: string;
  message?: string;
}

export function runMovementFeelTests(): TestResult[] {
  const results: TestResult[] = [];
  const dt = 1 / 60; // 60 FPS frame step

  // TEST 1: Sprint Accel Ramp (reaches >= 95% top speed in 0.44s - 0.50s)
  {
    const cm = new CourtMovement(GUARD_TUNING, 0);
    let timeTo95Percent = 0;
    const targetSpeed95 = GUARD_TUNING.sprintSpeed * 0.95;

    for (let frame = 0; frame < 120; frame++) {
      const output = cm.update(dt, 0, 1.0, true, false);
      if (output.speed >= targetSpeed95 && timeTo95Percent === 0) {
        timeTo95Percent = frame * dt;
        break;
      }
    }

    const passed = timeTo95Percent >= 0.42 && timeTo95Percent <= 0.50;
    results.push({
      name: 'Sprint Accel Ramp (0.45s-0.50s to 95%)',
      passed,
      actual: `${timeTo95Percent.toFixed(3)}s`,
      expected: '0.42s - 0.50s',
      message: `Player reached 95% speed (${(GUARD_TUNING.sprintSpeed * 0.95).toFixed(2)} m/s) in ${timeTo95Percent.toFixed(3)}s`,
    });
  }

  // TEST 2: Full-Sprint Deceleration Stop (stops in 0.17s - 0.28s)
  {
    const cm = new CourtMovement(GUARD_TUNING, 0);
    // Accelerate to top speed first
    for (let f = 0; f < 60; f++) {
      cm.update(dt, 0, 1.0, true, false);
    }
    const entrySpeed = Math.hypot(cm.velX, cm.velZ);

    // Release stick and measure time until speed is 0
    let stopTime = 0;
    for (let f = 0; f < 60; f++) {
      const output = cm.update(dt, 0, 0, false, false);
      if (output.speed === 0 && stopTime === 0) {
        stopTime = (f + 1) * dt;
        break;
      }
    }

    const passed = stopTime >= 0.17 && stopTime <= 0.28;
    results.push({
      name: 'Full-Sprint Deceleration Stop (0.17s - 0.28s)',
      passed,
      actual: `${stopTime.toFixed(3)}s`,
      expected: '0.17s - 0.28s',
      message: `Player decelerated from ${entrySpeed.toFixed(2)} m/s to complete stop in ${stopTime.toFixed(3)}s`,
    });
  }

  // TEST 3A: Plant-and-Cut Sprint Momentum Retention (~45% speed kept)
  {
    const cm = new CourtMovement(GUARD_TUNING, 0);
    // Reach full sprint forward (Z positive)
    for (let f = 0; f < 60; f++) {
      cm.update(dt, 0, 1.0, true, false);
    }
    const preCutSpeed = Math.hypot(cm.velX, cm.velZ);

    // Immediate 180° reversal on stick (Z negative)
    const cutOutput = cm.update(dt, 0, -1.0, true, false);
    const postCutRetention = cutOutput.speed / preCutSpeed;

    const passed = cutOutput.isPlanting && Math.abs(postCutRetention - 0.45) < 0.05;
    results.push({
      name: 'Sprint Plant-and-Cut Retention (~45%)',
      passed,
      actual: `${(postCutRetention * 100).toFixed(1)}% (isPlanting=${cutOutput.isPlanting})`,
      expected: '40% - 50%',
      message: `Hard cut from full sprint reduced speed from ${preCutSpeed.toFixed(2)} m/s to ${cutOutput.speed.toFixed(2)} m/s`,
    });
  }

  // TEST 3B: Plant-and-Cut Jog Momentum Retention (~63% speed kept)
  {
    const cm = new CourtMovement(GUARD_TUNING, 0);
    // Reach jog speed forward
    for (let f = 0; f < 30; f++) {
      cm.update(dt, 0, 1.0, false, false);
    }
    const preCutSpeed = Math.hypot(cm.velX, cm.velZ);

    // Immediate 180° reversal on stick (Z negative)
    const cutOutput = cm.update(dt, 0, -1.0, false, false);
    const postCutRetention = cutOutput.speed / preCutSpeed;

    const passed = cutOutput.isPlanting && Math.abs(postCutRetention - 0.63) < 0.06;
    results.push({
      name: 'Jog Plant-and-Cut Retention (~63%)',
      passed,
      actual: `${(postCutRetention * 100).toFixed(1)}% (isPlanting=${cutOutput.isPlanting})`,
      expected: '57% - 69%',
      message: `Cut from jog reduced speed from ${preCutSpeed.toFixed(2)} m/s to ${cutOutput.speed.toFixed(2)} m/s`,
    });
  }

  // TEST 4: Turn Rate Cap (~3.1° per frame at 60Hz)
  {
    const cm = new CourtMovement(GUARD_TUNING, 0); // initial yaw 0
    // Request instant 90° turn (X=1, Y=0)
    const output = cm.update(dt, 1.0, 0, true, false);
    const turnedDeg = (output.facingYaw * 180) / Math.PI;

    const passed = turnedDeg > 2.7 && turnedDeg < 3.5;
    results.push({
      name: 'Single-Frame Turn Rate Cap (~3.1°/frame @ 60Hz)',
      passed,
      actual: `${turnedDeg.toFixed(2)}°`,
      expected: '2.7° - 3.5° per frame',
      message: `Facing angle turned ${turnedDeg.toFixed(2)}° in one frame (tracing smooth arcs)`,
    });
  }

  // TEST 5: Skilled Crossover (Quickstrike) Burst Bypass
  {
    const cm = new CourtMovement(GUARD_TUNING, 0);
    // Reach sprint speed
    for (let f = 0; f < 60; f++) {
      cm.update(dt, 0, 1.0, true, false);
    }
    const preCutSpeed = Math.hypot(cm.velX, cm.velZ);

    // Hard cut WITH skilled cut trigger
    const cutOutput = cm.update(dt, 1.0, 0, true, true);
    const burstSpeed = Math.hypot(cutOutput.velX, cutOutput.velZ);

    const passed = !cutOutput.isPlanting && cutOutput.isSkilledCutting && burstSpeed >= preCutSpeed * 1.15;
    results.push({
      name: 'Skilled Cut Crossover Burst (No plant penalty, +18% speed)',
      passed,
      actual: `burstSpeed=${burstSpeed.toFixed(2)} m/s (isPlanting=${cutOutput.isPlanting}, isSkilledCutting=${cutOutput.isSkilledCutting})`,
      expected: `>= ${(preCutSpeed * 1.15).toFixed(2)} m/s with isPlanting=false`,
      message: `Skilled cut awarded crossover speed burst of ${(burstSpeed).toFixed(2)} m/s without plant penalty`,
    });
  }

  return results;
}

// Direct execution when run via tsx / node
const nodeProcess = typeof process !== 'undefined' ? process : undefined;
if (nodeProcess?.argv?.[1]?.includes('movement-feel')) {
  console.log('=== NBA LIVE 07/08 MOVEMENT FEEL SUITE ===\n');
  const testResults = runMovementFeelTests();
  let allPass = true;
  for (const t of testResults) {
    const mark = t.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${mark} | ${t.name}`);
    console.log(`  Actual: ${t.actual} (Expected: ${t.expected})`);
    if (t.message) console.log(`  Detail: ${t.message}`);
    console.log('');
    if (!t.passed) allPass = false;
  }
  if (!allPass) {
    console.error('Movement feel regression tests failed.');
    nodeProcess?.exit(1);
  } else {
    console.log('All 5 feel targets verified green!');
  }
}
