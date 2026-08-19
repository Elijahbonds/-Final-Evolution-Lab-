#!/usr/bin/env node
/**
 * Historical stub writer — do not run this to emit GLBs.
 *
 * Git must never ship venice-blue-court.glb / venice-court-surround.glb.
 * Google AI Studio /assets holds the live Meshy mural. The
 * FEL-meshy-placeholder quad (~928B/912B) overwrites that mural on
 * ZIP/import. Tests build placeholder fixtures in memory only
 * (scripts/meshy-venice-court.test.ts).
 */
console.error(
  'Refusing to write Meshy placeholder GLBs. Studio holds the real mural; git must not ship stubs.'
);
process.exit(1);
