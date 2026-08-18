/**
 * Venice night-court dunk loop — hang continuity, plant-measured CASE, contact-time outcome.
 *
 * Hang must continue from takeoff apex. Outcome is unset until CONTACT.
 * Eastbay 164 / 38.5 / 4.8 / 3.0 are Master Standard CASE comparison only.
 */

export type DunkPhase =
  | 'IDLE'
  | 'RUNWAY'
  | 'GATHER'
  | 'BLOWN'
  | 'PLANT'
  | 'TAKEOFF'
  | 'HANG'
  | 'CONTACT'
  | 'LAND';

export type GatherCommit = 'EARLY' | 'WINDOW' | 'LATE';
export type AirFinish = 'NONE' | 'EARLY' | 'WINDOW';
export type DunkStyle = 'REVERSE_TWO_HAND' | 'WINDMILL' | 'TOMAHAWK' | '360_SPIN';

export const EASTBAY_MASTER_STANDARD = {
  gctMs: 164,
  verticalIn: 38.5,
  elasticRecoilBw: 4.8,
  trunkLeanDeg: 3.0,
  role: 'CASE_COMPARISON' as const,
  classification: 'NOT CLINICAL' as const,
};

export interface PlantSample {
  gctMs: number;
  trunkLeanDeg: number;
  compression01: number;
  approachSpeed: number;
}

export interface AttemptMetrics {
  gctMs: number;
  verticalIn: number;
  elasticRecoilBw: number;
  trunkLeanDeg: number;
}

export interface ContactOutcome {
  isMake: boolean;
  missReason: 'EARLY' | 'LATE' | 'AIR' | 'SHORT' | 'RIM_OUT' | 'MUSHY_PLANT' | null;
  rimDeflectionM: number;
}

export const PHASE_SECONDS = {
  CONTACT: 0.14,
  LAND: 0.36,
} as const;

export const AIR_G = 8.2;
export const RIM_TARGET_IN = 0.42;
export const RIM_FINISH_SLACK = 0.62;
const PLANT_ROOT_Y = 0.04;

export function takeoffRiseSeconds(apexY: number, plantY = PLANT_ROOT_Y, g = AIR_G): number {
  return Math.sqrt((2 * Math.max(0.08, apexY - plantY)) / g);
}

/** Fallen meters after `hangT` seconds at apex. Pure ½gt² — not a 10–22cm hover. */
export function hangDropFromApex(apexY: number, hangT: number, g = AIR_G): number {
  return Math.max(0, apexY - hangWorldY(hangT, apexY, g));
}

export const PLANT_MARK_Z = -0.7;
export const GATHER_WINDOW_BEFORE = 0.55;
export const GATHER_WINDOW_AFTER = 0.28;

export type GatherZone = 'APPROACH' | 'WINDOW' | 'PASSED';

/** Hang style from live air steer. Not a HUD pre-pick. */
export function styleFromAirSteer(airSteer: number): DunkStyle {
  const mag = Math.abs(airSteer);
  if (mag > 0.82) return '360_SPIN';
  if (airSteer < -0.22) return 'WINDMILL';
  if (airSteer > 0.22) return 'TOMAHAWK';
  return 'REVERSE_TWO_HAND';
}

export function gatherWindowState(rootZ: number, plantZ: number = PLANT_MARK_Z): GatherZone {
  const delta = rootZ - plantZ;
  if (delta < -GATHER_WINDOW_BEFORE) return 'APPROACH';
  if (delta > GATHER_WINDOW_AFTER) return 'PASSED';
  return 'WINDOW';
}

const STANDING_ROOT_Y = 0;

/** Takeoff y at p in [0,1]. p=1 is the apex handed to hang. */
export function takeoffWorldY(p: number, plantY: number, apexY: number): number {
  const t = clamp01(p);
  return plantY + (apexY - plantY) * Math.sin(t * Math.PI * 0.5);
}

/**
 * Hang y at t seconds after apex. t=0 equals takeoff apex.
 * After apex, y only falls — ½gt², not a normalized 0.5s hover.
 */
export function hangWorldY(tSec: number, takeoffApexY: number, g = AIR_G): number {
  const t = Math.max(0, tSec);
  return takeoffApexY - 0.5 * g * t * t;
}

export function landWorldY(p: number, hangEndY: number, groundY: number): number {
  const t = clamp01(p);
  return hangEndY + (groundY - hangEndY) * (t * t);
}

/** Rim drops then springs when contact actually happens. */
export function rimDeflectionY(p: number, amountM: number): number {
  if (amountM <= 0) return 0;
  return -amountM * Math.sin(clamp01(p) * Math.PI);
}

export function metricsFromPlant(
  plant: PlantSample,
  apexY: number,
  standingY: number = STANDING_ROOT_Y
): AttemptMetrics {
  const verticalIn = Math.max(0, apexY - standingY) * 39.3701;
  const gctSec = Math.max(0.08, plant.gctMs / 1000);
  const elasticRecoilBw =
    plant.compression01 * (1 / gctSec) * 0.55 + plant.approachSpeed * 0.12;
  return {
    gctMs: Math.round(plant.gctMs),
    verticalIn: round1(verticalIn),
    elasticRecoilBw: round1(elasticRecoilBw),
    trunkLeanDeg: round1(plant.trunkLeanDeg),
  };
}

export function judgeGatherCommit(rootZ: number, plantZ: number = PLANT_MARK_Z): GatherCommit {
  const zone = gatherWindowState(rootZ, plantZ);
  if (zone === 'APPROACH') return 'EARLY';
  if (zone === 'PASSED') return 'LATE';
  return 'WINDOW';
}

export function judgeAirFinish(state: {
  rootZ: number;
  rootY: number;
  apexY: number;
  rimZ: number;
  rising: boolean;
  pressed: boolean;
}): AirFinish {
  if (!state.pressed) return 'NONE';
  if (state.rising) return 'NONE';
  const zErr = state.rootZ - (state.rimZ - RIM_TARGET_IN);
  const fallen = state.apexY - state.rootY;
  if (zErr < -RIM_FINISH_SLACK || fallen < 0.06) return 'EARLY';
  if (zErr > 0.55) return 'EARLY';
  return 'WINDOW';
}

export function decideContact(
  gatherBlown: boolean,
  plant: PlantSample,
  apexY: number,
  rimY: number,
  airFinish: AirFinish = 'WINDOW',
  gatherMiss: GatherCommit | null = null
): ContactOutcome {
  if (gatherBlown || gatherMiss === 'EARLY') {
    return { isMake: false, missReason: 'EARLY', rimDeflectionM: 0 };
  }
  if (gatherMiss === 'LATE') {
    return { isMake: false, missReason: 'LATE', rimDeflectionM: 0 };
  }
  if (airFinish === 'NONE') {
    return { isMake: false, missReason: 'AIR', rimDeflectionM: 0 };
  }
  if (airFinish === 'EARLY') {
    return { isMake: false, missReason: 'RIM_OUT', rimDeflectionM: 0.07 };
  }

  const standingReachM = 2.42;
  const twoHandReach = standingReachM + apexY;
  if (twoHandReach < rimY - 0.04 || plant.approachSpeed < 3.0) {
    return { isMake: false, missReason: 'SHORT', rimDeflectionM: 0 };
  }

  if (plant.gctMs > 240 || (plant.gctMs > 210 && plant.compression01 < 0.32)) {
    return { isMake: false, missReason: 'MUSHY_PLANT', rimDeflectionM: 0.035 };
  }

  if (plant.gctMs < 100 || plant.compression01 < 0.20) {
    return { isMake: false, missReason: 'RIM_OUT', rimDeflectionM: 0.07 };
  }

  return {
    isMake: true,
    missReason: null,
    rimDeflectionM: 0.08 + plant.compression01 * 0.05,
  };
}

export function plannedApexFromPlant(plant: PlantSample): number {
  const speedLift = clamp(plant.approachSpeed / 8.8, 0, 1) * 0.24;
  const elasticLift = plant.compression01 * 0.16;
  const mushPenalty = plant.gctMs > 210 ? 0.18 : 0;
  return clamp(0.70 + speedLift + elasticLift - mushPenalty, 0.52, 1.12);
}

export interface AttemptSnapshot {
  phase: DunkPhase;
  outcome: ContactOutcome | null;
  metrics: AttemptMetrics | null;
  rootX: number;
  rootY: number;
  rootZ: number;
  rimYOffset: number;
  takeoffApexY: number;
  plant: PlantSample | null;
  style: DunkStyle;
  gatherMiss: GatherCommit | null;
}

/**
 * Dunk attempt. Gather is missable. After a WINDOW plant the body is ballistic,
 * not a 0.30/0.50/0.20/0.34 tape. CONTACT is the first moment outcome exists.
 */
export class VeniceDunkAttempt {
  phase: DunkPhase = 'IDLE';
  outcome: ContactOutcome | null = null;
  metrics: AttemptMetrics | null = null;
  plant: PlantSample | null = null;

  runwayElapsed = 0;
  plantElapsed = 0;
  takeoffElapsed = 0;
  hangElapsed = 0;
  contactElapsed = 0;
  landElapsed = 0;

  approachSpeed = 0;
  gatherBlown = false;
  gatherMiss: GatherCommit | null = null;
  plantHolding = false;
  airFinish: AirFinish = 'NONE';
  airHeld = false;
  airSteer = 0;
  style: DunkStyle = 'REVERSE_TWO_HAND';
  trunkLeanDeg = 0;
  compression01 = 0;
  takeoffApexY = 0;
  hangEndY = 0;
  posX = 0;
  posY = 0;
  posZ = 0;
  velX = 0;
  velY = 0;
  velZ = 0;
  plantLeaveZ = 0;
  pendingContact = false;

  readonly startZ: number;
  readonly rimZ: number;
  readonly rimY: number;
  readonly plantMarkZ: number;

  constructor(startZ = -6.2, rimZ = 5.5, rimY = 3.05, plantMarkZ = PLANT_MARK_Z) {
    this.startZ = startZ;
    this.rimZ = rimZ;
    this.rimY = rimY;
    this.plantMarkZ = plantMarkZ;
    this.posZ = startZ;
  }

  reset(): void {
    this.phase = 'IDLE';
    this.outcome = null;
    this.metrics = null;
    this.plant = null;
    this.runwayElapsed = 0;
    this.plantElapsed = 0;
    this.takeoffElapsed = 0;
    this.hangElapsed = 0;
    this.contactElapsed = 0;
    this.landElapsed = 0;
    this.approachSpeed = 0;
    this.gatherBlown = false;
    this.gatherMiss = null;
    this.plantHolding = false;
    this.airFinish = 'NONE';
    this.airHeld = false;
    this.airSteer = 0;
    this.style = 'REVERSE_TWO_HAND';
    this.trunkLeanDeg = 0;
    this.compression01 = 0;
    this.takeoffApexY = 0;
    this.hangEndY = 0;
    this.posX = 0;
    this.posY = 0;
    this.posZ = this.startZ;
    this.velX = 0;
    this.velY = 0;
    this.velZ = 0;
    this.plantLeaveZ = 0;
    this.pendingContact = false;
  }

  startRunway(): void {
    if (this.phase !== 'IDLE') return;
    this.reset();
    this.phase = 'RUNWAY';
  }

  /** Release starts gather. Does not compute make/miss and does not plant. */
  releaseToGather(): void {
    if (this.phase !== 'RUNWAY') return;
    this.phase = 'GATHER';
  }

  /** Press during gather — early / window / late. Window enters plant; early/late blow. */
  commitPlant(): GatherCommit | null {
    if (this.phase !== 'GATHER') return null;
    const verdict = judgeGatherCommit(this.posZ, this.plantMarkZ);
    this.gatherMiss = verdict === 'WINDOW' ? null : verdict;
    if (verdict !== 'WINDOW') {
      this.gatherBlown = true;
      this.phase = 'BLOWN';
      this.landElapsed = 0;
      return verdict;
    }
    this.phase = 'PLANT';
    this.plantElapsed = 0;
    this.compression01 = 0;
    this.plantHolding = true;
    return verdict;
  }

  /** Release during plant leaves the ground. GCT is the hold. */
  releaseTakeoff(): void {
    if (this.phase !== 'PLANT' || !this.plantHolding) return;
    this.plantHolding = false;
    this.leaveGround();
  }

  /**
   * Hang finish is the style. No HUD tabs.
   * Cut left = windmill, cut right = tomahawk, hold center = reverse two-hand,
   * a hard flick = 360. Pose follows this on the body through the hang.
   */
  inputAir(steerX = 0, replace = false): void {
    if (this.phase !== 'TAKEOFF' && this.phase !== 'HANG') return;
    const wasHeld = this.airHeld;
    this.airSteer = Math.max(-1, Math.min(1, replace ? steerX : this.airSteer + steerX));
    this.style = styleFromAirSteer(this.airSteer);
    this.airHeld = true;
    this.velX = this.airSteer * 1.8;

    if (this.phase === 'HANG' && !wasHeld) {
      const verdict = this.airJudge();
      if (verdict === 'EARLY') {
        this.airFinish = 'EARLY';
        this.pendingContact = true;
      } else if (verdict === 'WINDOW') {
        this.airFinish = 'WINDOW';
        this.pendingContact = true;
      }
    }
  }

  tick(dt: number): AttemptSnapshot {
    if (dt <= 0) return this.snapshot();

    switch (this.phase) {
      case 'RUNWAY': {
        this.runwayElapsed += dt;
        this.approachSpeed = Math.min(8.8, this.approachSpeed + 19.2 * dt);
        this.posZ += this.approachSpeed * dt;
        break;
      }
      case 'GATHER': {
        this.approachSpeed = Math.max(2.8, this.approachSpeed * (1 - dt * 0.18));
        this.posZ += this.approachSpeed * dt;
        if (gatherWindowState(this.posZ, this.plantMarkZ) === 'PASSED') {
          this.gatherBlown = true;
          this.gatherMiss = 'LATE';
          this.phase = 'BLOWN';
          this.landElapsed = 0;
        }
        break;
      }
      case 'BLOWN': {
        this.landElapsed += dt;
        this.posZ += Math.max(0.4, this.approachSpeed * 0.25) * dt;
        if (this.landElapsed >= PHASE_SECONDS.LAND) {
          this.phase = 'IDLE';
        }
        break;
      }
      case 'PLANT': {
        this.plantElapsed += dt;
        this.posZ += this.approachSpeed * dt * 0.12;
        const load = Math.min(1, this.approachSpeed / 8.8);
        if (this.plantHolding) {
          this.compression01 = Math.min(1, this.compression01 + (3.8 + load * 1.1) * dt);
          this.trunkLeanDeg = 4.5 + (1 - load) * 7 + this.compression01 * 3;
          if (this.plantElapsed >= 0.36) {
            this.plantHolding = false;
            this.leaveGround();
          }
        }
        break;
      }
      case 'TAKEOFF': {
        this.takeoffElapsed += dt;
        this.integrateAir(dt);
        if (this.velY <= 0) {
          this.takeoffApexY = this.posY;
          this.velY = 0;
          this.phase = 'HANG';
          this.hangElapsed = 0;
        }
        break;
      }
      case 'HANG': {
        this.hangElapsed += dt;
        this.integrateAir(dt);
        const verdict = this.airJudge();
        if (this.airHeld && verdict === 'WINDOW') {
          this.airFinish = 'WINDOW';
          this.pendingContact = true;
        }
        if (this.pendingContact || this.pastRim()) {
          this.beginContact();
        }
        break;
      }
      case 'CONTACT': {
        this.contactElapsed += dt;
        this.posZ += this.velZ * dt * 0.2;
        this.posY += Math.min(0, this.velY) * dt * 0.25;
        if (this.contactElapsed >= PHASE_SECONDS.CONTACT) {
          this.phase = 'LAND';
          this.landElapsed = 0;
          this.velY = Math.min(this.velY, -1.4);
        }
        break;
      }
      case 'LAND': {
        this.landElapsed += dt;
        this.velY -= AIR_G * dt;
        this.posY += this.velY * dt;
        this.posZ += this.velZ * dt * 0.18;
        if (this.posY <= STANDING_ROOT_Y || this.landElapsed >= 0.7) {
          this.posY = STANDING_ROOT_Y;
          this.phase = 'IDLE';
        }
        break;
      }
      default:
        break;
    }

    return this.snapshot();
  }

  private leaveGround(): void {
    this.plant = {
      gctMs: this.plantElapsed * 1000,
      trunkLeanDeg: this.trunkLeanDeg,
      compression01: this.compression01,
      approachSpeed: this.approachSpeed,
    };
    this.takeoffApexY = plannedApexFromPlant(this.plant);
    this.plantLeaveZ = this.posZ;
    this.posX = 0;
    this.posY = PLANT_ROOT_Y;
    this.velX = 0;
    this.velY = Math.sqrt(2 * AIR_G * Math.max(0.08, this.takeoffApexY - PLANT_ROOT_Y));
    this.velZ = 2.8 + this.approachSpeed * 0.48;
    this.phase = 'TAKEOFF';
    this.takeoffElapsed = 0;
    this.hangElapsed = 0;
    this.airFinish = 'NONE';
    this.airHeld = false;
    this.pendingContact = false;
  }

  private integrateAir(dt: number): void {
    this.velY -= AIR_G * dt;
    this.posY += this.velY * dt;
    this.posZ += this.velZ * dt;
    this.posX = clamp(this.posX + this.velX * dt, -0.9, 0.9);
  }

  private airJudge(): AirFinish {
    return judgeAirFinish({
      rootZ: this.posZ,
      rootY: this.posY,
      apexY: this.takeoffApexY,
      rimZ: this.rimZ,
      rising: this.phase === 'TAKEOFF' || this.velY > 0,
      pressed: this.airHeld,
    });
  }

  private pastRim(): boolean {
    return (
      this.posZ > this.rimZ + 0.22 ||
      this.posY < 0.12 ||
      this.hangElapsed > 1.6
    );
  }

  private beginContact(): void {
    if (this.phase === 'CONTACT' || this.outcome) return;
    if (this.airFinish === 'NONE' && this.airHeld) {
      this.airFinish = this.airJudge() === 'WINDOW' ? 'WINDOW' : 'EARLY';
    }
    this.phase = 'CONTACT';
    this.contactElapsed = 0;
    this.hangEndY = this.posY;
    this.resolveContact();
  }

  private resolveContact(): void {
    const plant = this.plant ?? {
      gctMs: this.plantElapsed * 1000,
      trunkLeanDeg: this.trunkLeanDeg,
      compression01: this.compression01,
      approachSpeed: this.approachSpeed,
    };
    this.plant = plant;
    this.outcome = decideContact(
      this.gatherBlown,
      plant,
      this.takeoffApexY,
      this.rimY,
      this.airFinish,
      this.gatherMiss
    );
    this.metrics = metricsFromPlant(plant, this.takeoffApexY, STANDING_ROOT_Y);
  }

  extraHang(): number {
    return hangDropFromApex(this.takeoffApexY || 0.7, this.hangElapsed);
  }

  rootX(): number {
    return this.posX;
  }

  rootY(): number {
    switch (this.phase) {
      case 'IDLE':
      case 'RUNWAY':
      case 'GATHER':
        return STANDING_ROOT_Y + Math.abs(Math.sin(this.runwayElapsed * 14)) * 0.05 * (this.approachSpeed / 8.8);
      case 'BLOWN':
        return landWorldY(this.landElapsed / PHASE_SECONDS.LAND, 0.18, STANDING_ROOT_Y);
      case 'PLANT':
        return PLANT_ROOT_Y * (1 - this.compression01 * 0.4);
      case 'TAKEOFF':
      case 'HANG':
      case 'CONTACT':
      case 'LAND':
        return this.posY;
      default:
        return STANDING_ROOT_Y;
    }
  }

  rootZ(): number {
    switch (this.phase) {
      case 'IDLE':
        return this.startZ;
      default:
        return this.posZ;
    }
  }

  rimYOffset(): number {
    if (this.phase !== 'CONTACT' || !this.outcome) return 0;
    return rimDeflectionY(this.contactElapsed / PHASE_SECONDS.CONTACT, this.outcome.rimDeflectionM);
  }

  snapshot(): AttemptSnapshot {
    return {
      phase: this.phase,
      outcome: this.outcome,
      metrics: this.metrics,
      rootX: this.rootX(),
      rootY: this.rootY(),
      rootZ: this.rootZ(),
      rimYOffset: this.rimYOffset(),
      takeoffApexY: this.takeoffApexY,
      plant: this.plant,
      style: this.style,
      gatherMiss: this.gatherMiss,
    };
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
