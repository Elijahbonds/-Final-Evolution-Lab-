/**
 * Vision bar in the files: Venice night place + hang cam that shows the fall.
 */
import './venice-place-canvas-polyfill.ts';
import { Color4, Effect, NullEngine, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import { buildVeniceNightCourt } from '../src/lib/babylon/VeniceNightCourt';
import { directedFraming } from '../src/lib/babylon/veniceDunkCamera';

export async function runVenicePlaceTests(): Promise<
  Array<{ name: string; passed: boolean; actual: string; expected: string }>
> {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.03, 0.05, 0.09, 1);
  const hoop = new Vector3(0, 3.05, 5.5);
  const court = await buildVeniceNightCourt(scene, undefined, hoop, { spectators: false });

  const sky = scene.getMeshByName('venice_sky');
  const water = scene.getMeshByName('venice_ocean');
  const fence = scene.getMeshByName('fence_l');
  const bleacher = scene.getMeshByName('bleacher_row_0');
  const fenceMat = fence?.material as StandardMaterial | null;
  const waterShader = Effect.ShadersStore['veniceWaterFragmentShader'] ?? '';
  const skyShader = Effect.ShadersStore['veniceSkyFragmentShader'] ?? '';

  const placeOk =
    !!sky &&
    !!water &&
    !!fence &&
    !!bleacher &&
    !!court.rimSpot &&
    !!court.skyMat &&
    !!court.waterMat &&
    skyShader.includes('zenith') &&
    waterShader.includes('fres') &&
    fenceMat?.transparencyMode === StandardMaterial.MATERIAL_ALPHATEST &&
    (fenceMat?.alphaCutOff ?? 0) > 0.2;

  const rim = new Vector3(0, 3.05, 5.5);
  const apex = directedFraming('HANG', new Vector3(0, 1.06, 2.2), rim);
  const fallen = directedFraming('HANG', new Vector3(0, 0.68, 4.1), rim);
  const hoverRide = Math.abs(apex.pos.y - (1.06 + 0.35)) < 0.02;
  const hangCamHolds =
    Math.abs(apex.pos.y - fallen.pos.y) < 1e-6 &&
    apex.pos.y >= rim.y - 0.2 &&
    !hoverRide &&
    apex.target.y >= rim.y - 0.15;

  const results = [
    {
      name: 'Place is Venice night: sky, fresnel water, occluding fence, bleachers, rim light',
      passed: placeOk,
      actual: `sky=${!!sky} water=${!!water} fresnel=${waterShader.includes('fres')} fenceAlpha=${fenceMat?.transparencyMode} bleacher=${!!bleacher} rimSpot=${!!court.rimSpot}`,
      expected: 'sky + displaced/fresnel water + alpha-test fence + bleachers + rim spot',
    },
    {
      name: 'Hang cam is directed and locked to the rim so the fall reads (not a ride-along hover)',
      passed: hangCamHolds,
      actual: `apexCamY=${apex.pos.y.toFixed(3)} fallenCamY=${fallen.pos.y.toFixed(3)} hoverRide=${hoverRide} targetY=${apex.target.y.toFixed(3)}`,
      expected: 'same cam Y at apex and after a 38cm drop, aimed at the rim',
    },
  ];

  scene.dispose();
  engine.dispose();
  return results;
}

const nodeProcess = typeof process !== 'undefined' ? process : undefined;
if (nodeProcess?.argv?.[1]?.includes('venice-place')) {
  console.log('=== VENICE PLACE / CAM ===\n');
  const rows = await runVenicePlaceTests();
  let all = true;
  for (const t of rows) {
    console.log(`${t.passed ? '✓ PASS' : '✗ FAIL'} | ${t.name}`);
    console.log(`  Actual: ${t.actual}`);
    console.log(`  Expected: ${t.expected}\n`);
    if (!t.passed) all = false;
  }
  if (!all) {
    console.error('Venice place tests failed.');
    nodeProcess?.exit(1);
  }
}
