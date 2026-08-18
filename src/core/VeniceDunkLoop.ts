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
  missReason: 'BLOWN' | 'SHORT' | 'RIM_OUT' | 'MUSHY_PLANT' | null;
  rimDeflectionM: number;
}

export const PHASE_SECONDS = {
  GATHER: 0.24,
  TAKEOFF: 0.30,
  HANG: 0.50,
  CONTACT: 0.20,
  LAND: 0.34,
} as const;

const STANDING_ROOT_Y = 0;
const PLANT_ROOT_Y = 0.04;

/** Takeoff y at p in [0,1]. p=1 is the apex handed to hang. */
export function takeoffWorldY(p: number, plantY: number, apexY: number): number {
  const t = clamp01(p);
  return plantY + (apexY - plantY) * Math.sin(t * Math.PI * 0.5);
}

/**
 * Hang y at p in [0,1].
 * p=0 MUST equal takeoffApexY — the rejected formula apexHeight*sin((1-p)*π) is 0 at p=0.
 */
export function hangWorldY(p: number, takeoffApexY: number, extraHangM: number): number {
  const peak = takeoffApexY + extraHangM;
  // Root is the feet. Hands reach the rim via the slam pose — do not hop the body to rimY.
  const settleY = takeoffApexY + extraHangM * 0.4;
  if (p <= 0) return takeoffApexY;
  if (p >= 1) return settleY;
  if (p < 0.38) {
    const t = p / 0.38;
    const e = 1 - (1 - t) * (1 - t);
    return takeoffApexY + (peak - takeoffApexY) * e;
  }
  const t = (p - 0.38) / 0.62;
  const e = t * t * (3 - 2 * t);
  return peak + (settleY - peak) * e;
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

export function decideContact(
  gatherBlown: boolean,
  plant: PlantSample,
  apexY: number,
  rimY: number
): ContactOutcome {
  if (gatherBlown) {
    return { isMake: false, missReason: 'BLOWN', rimDeflectionM: 0 };
  }

  const standingReachM = 2.42;
  const twoHandReach = standingReachM + apexY;
  if (twoHandReach < rimY - 0.04 || plant.approachSpeed < 3.0) {
    return { isMake: false, missReason: 'SHORT', rimDeflectionM: 0 };
  }

  if (plant.gctMs > 260 || (plant.gctMs > 220 && plant.compression01 < 0.35)) {
    return { isMake: false, missReason: 'MUSHY_PLANT', rimDeflectionM: 0.035 };
  }

  if (plant.gctMs < 108 || plant.compression01 < 0.26) {
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

export function gatherBlownByInput(gatherElapsed: number, extraInput: boolean): boolean {
  if (extraInput) return true;
  return gatherElapsed > PHASE_SECONDS.GATHER * 1.65;
}

export interface AttemptSnapshot {
  phase: DunkPhase;
  outcome: ContactOutcome | null;
  metrics: AttemptMetrics | null;
  rootY: number;
  rootZ: number;
  rimYOffset: number;
  takeoffApexY: number;
  plant: PlantSample | null;
}

/**
 * Clocked dunk attempt. Pointer-up starts GATHER — it does not lock isMake.
 * Plant clocks real GCT. CONTACT is the first moment outcome exists.
 */
export class VeniceDunkAttempt {
  phase: DunkPhase = 'IDLE';
  outcome: ContactOutcome | null = null;
  metrics: AttemptMetrics | null = null;
  plant: PlantSample | null = null;

  runwayElapsed = 0;
  gatherElapsed = 0;
  plantElapsed = 0;
  takeoffElapsed = 0;
  hangElapsed = 0;
  contactElapsed = 0;
  landElapsed = 0;

  approachSpeed = 0;
  gatherBlown = false;
  extraInputAfterRelease = false;
  trunkLeanDeg = 0;
  compression01 = 0;
  takeoffApexY = 0;
  hangEndY = 0;

  readonly startZ: number;
  readonly rimZ: number;
  readonly rimY: number;

  constructor(startZ = -6.2, rimZ = 5.5, rimY = 3.05) {
    this.startZ = startZ;
    this.rimZ = rimZ;
    this.rimY = rimY;
  }

  reset(): void {
    this.phase = 'IDLE';
    this.outcome = null;
    this.metrics = null;
    this.plant = null;
    this.runwayElapsed = 0;
    this.gatherElapsed = 0;
    this.plantElapsed = 0;
    this.takeoffElapsed = 0;
    this.hangElapsed = 0;
    this.contactElapsed = 0;
    this.landElapsed = 0;
    this.approachSpeed = 0;
    this.gatherBlown = false;
    this.extraInputAfterRelease = false;
    this.trunkLeanDeg = 0;
    this.compression01 = 0;
    this.takeoffApexY = 0;
    this.hangEndY = 0;
  }

  startRunway(): void {
    if (this.phase !== 'IDLE') return;
    this.reset();
    this.phase = 'RUNWAY';
  }

  /** Release commits the gather. Does not compute make/miss. */
  releaseToGather(): void {
    if (this.phase !== 'RUNWAY') return;
    this.phase = 'GATHER';
    this.gatherElapsed = 0;
  }

  /** Input after release can blow the gather. */
  inputAfterRelease(): void {
    if (this.phase !== 'GATHER') return;
    this.extraInputAfterRelease = true;
    this.gatherBlown = true;
    this.phase = 'BLOWN';
  }

  tick(dt: number): AttemptSnapshot {
    if (dt <= 0) return this.snapshot();

    switch (this.phase) {
      case 'RUNWAY': {
        this.runwayElapsed += dt;
        const accel = 19.2;
        this.approachSpeed = Math.min(8.8, this.approachSpeed + accel * dt);
        break;
      }
      case 'GATHER': {
        this.gatherElapsed += dt;
        this.approachSpeed = Math.max(2.4, this.approachSpeed * (1 - dt * 0.35));
        this.gatherBlown = gatherBlownByInput(this.gatherElapsed, this.extraInputAfterRelease);
        if (this.gatherBlown) {
          this.phase = 'BLOWN';
        } else if (this.gatherElapsed >= PHASE_SECONDS.GATHER) {
          this.phase = 'PLANT';
          this.plantElapsed = 0;
          this.compression01 = 0;
        }
        break;
      }
      case 'BLOWN': {
        this.landElapsed += dt;
        if (this.landElapsed >= PHASE_SECONDS.LAND) {
          this.phase = 'IDLE';
        }
        break;
      }
      case 'PLANT': {
        this.plantElapsed += dt;
        const load = Math.min(1, this.approachSpeed / 8.8);
        this.compression01 = Math.min(1, this.compression01 + (0.9 + load) * dt);
        this.trunkLeanDeg = 4.5 + (1 - load) * 7 + this.compression01 * 3;
        const leaveGround = this.compression01 >= 0.72 || this.plantElapsed >= 0.28;
        if (leaveGround) {
          this.plant = {
            gctMs: this.plantElapsed * 1000,
            trunkLeanDeg: this.trunkLeanDeg,
            compression01: this.compression01,
            approachSpeed: this.approachSpeed,
          };
          this.takeoffApexY = plannedApexFromPlant(this.plant);
          this.phase = 'TAKEOFF';
          this.takeoffElapsed = 0;
        }
        break;
      }
      case 'TAKEOFF': {
        this.takeoffElapsed += dt;
        if (this.takeoffElapsed >= PHASE_SECONDS.TAKEOFF) {
          this.takeoffElapsed = PHASE_SECONDS.TAKEOFF;
          this.phase = 'HANG';
          this.hangElapsed = 0;
        }
        break;
      }
      case 'HANG': {
        this.hangElapsed += dt;
        if (this.hangElapsed >= PHASE_SECONDS.HANG) {
          this.hangElapsed = PHASE_SECONDS.HANG;
          this.phase = 'CONTACT';
          this.contactElapsed = 0;
          this.resolveContact();
        }
        break;
      }
      case 'CONTACT': {
        this.contactElapsed += dt;
        if (this.contactElapsed >= PHASE_SECONDS.CONTACT) {
          this.phase = 'LAND';
          this.landElapsed = 0;
        }
        break;
      }
      case 'LAND': {
        this.landElapsed += dt;
        if (this.landElapsed >= PHASE_SECONDS.LAND) {
          this.phase = 'IDLE';
        }
        break;
      }
      default:
        break;
    }

    return this.snapshot();
  }

  private resolveContact(): void {
    const plant = this.plant ?? {
      gctMs: this.plantElapsed * 1000,
      trunkLeanDeg: this.trunkLeanDeg,
      compression01: this.compression01,
      approachSpeed: this.approachSpeed,
    };
    this.plant = plant;
    this.outcome = decideContact(this.gatherBlown, plant, this.takeoffApexY, this.rimY);
    this.metrics = metricsFromPlant(plant, this.takeoffApexY, STANDING_ROOT_Y);
    this.hangEndY = hangWorldY(1, this.takeoffApexY, this.extraHang());
  }

  extraHang(): number {
    if (!this.plant) return 0.18;
    return 0.12 + this.plant.compression01 * 0.22;
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
        return takeoffWorldY(
          this.takeoffElapsed / PHASE_SECONDS.TAKEOFF,
          PLANT_ROOT_Y,
          this.takeoffApexY
        );
      case 'HANG':
        return hangWorldY(
          this.hangElapsed / PHASE_SECONDS.HANG,
          this.takeoffApexY,
          this.extraHang()
        );
      case 'CONTACT':
        return hangWorldY(1, this.takeoffApexY, this.extraHang()) - 0.12 * clamp01(this.contactElapsed / PHASE_SECONDS.CONTACT);
      case 'LAND':
        return landWorldY(this.landElapsed / PHASE_SECONDS.LAND, this.hangEndY || this.rimY - 0.2, STANDING_ROOT_Y);
      default:
        return STANDING_ROOT_Y;
    }
  }

  rootZ(): number {
    const gatherZ = -2.2;
    const plantZ = -0.7;
    const takeoffZ = 0.85;
    const rimZ = this.rimZ;
    switch (this.phase) {
      case 'IDLE':
        return this.startZ;
      case 'RUNWAY': {
        const dist = this.approachSpeed * this.runwayElapsed * 0.55;
        return Math.min(gatherZ, this.startZ + dist);
      }
      case 'GATHER':
        return lerp(Math.min(gatherZ, this.startZ + this.approachSpeed * this.runwayElapsed * 0.55), gatherZ, clamp01(this.gatherElapsed / PHASE_SECONDS.GATHER));
      case 'BLOWN':
        return gatherZ + this.landElapsed * 0.4;
      case 'PLANT':
        return lerp(gatherZ, plantZ, clamp01(this.plantElapsed / 0.22));
      case 'TAKEOFF':
        return lerp(plantZ, takeoffZ, clamp01(this.takeoffElapsed / PHASE_SECONDS.TAKEOFF));
      case 'HANG':
        return lerp(takeoffZ, rimZ - 0.52, Math.sin(clamp01(this.hangElapsed / PHASE_SECONDS.HANG) * Math.PI * 0.5));
      case 'CONTACT':
        return lerp(rimZ - 0.52, rimZ - 0.12, clamp01(this.contactElapsed / PHASE_SECONDS.CONTACT));
      case 'LAND':
        return lerp(rimZ - 0.12, rimZ + 0.2, clamp01(this.landElapsed / PHASE_SECONDS.LAND));
      default:
        return this.startZ;
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
      rootY: this.rootY(),
      rootZ: this.rootZ(),
      rimYOffset: this.rimYOffset(),
      takeoffApexY: this.takeoffApexY,
      plant: this.plant,
    };
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
