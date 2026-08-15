/**
 * LocomotionDriver: State machine and blend-tree coordinator for athlete locomotion.
 * Manages smooth crossfades between Idle, Walk, Jog, Sprint, Hard Plant, and Crossover Burst.
 */

export type LocomotionState = 'IDLE' | 'WALK' | 'JOG' | 'SPRINT' | 'PLANT' | 'CROSSOVER';

export interface AnimLayerHandle {
  name: string;
  weight: number;
  play: () => void;
  stop: () => void;
  setWeight: (w: number) => void;
}

export class LocomotionDriver {
  public currentState: LocomotionState = 'IDLE';
  public previousState: LocomotionState = 'IDLE';
  public blendWeights: Record<LocomotionState, number> = {
    IDLE: 1.0,
    WALK: 0.0,
    JOG: 0.0,
    SPRINT: 0.0,
    PLANT: 0.0,
    CROSSOVER: 0.0,
  };

  private crossfadeSpeed = 8.0; // Blend speed factor (1/s)

  /**
   * Updates blend weights and resolves active locomotion state
   * @param dt Delta time in seconds
   * @param speed01 Normalized movement speed [0, 1]
   * @param isPlanting Weight-transfer / hard cut active
   * @param isSprinting Sprint modifier active
   * @param isSkilledCutting Crossover burst active
   */
  public update(
    dt: number,
    speed01: number,
    isPlanting: boolean,
    isSprinting: boolean,
    isSkilledCutting: boolean
  ): {
    state: LocomotionState;
    weights: Record<LocomotionState, number>;
    primaryPlaybackRate: number;
  } {
    // 1. Resolve Target State
    let targetState: LocomotionState;

    if (isSkilledCutting) {
      targetState = 'CROSSOVER';
    } else if (isPlanting) {
      targetState = 'PLANT';
    } else if (speed01 > 0.65 || (isSprinting && speed01 > 0.35)) {
      targetState = 'SPRINT';
    } else if (speed01 > 0.32) {
      targetState = 'JOG';
    } else if (speed01 > 0.04) {
      targetState = 'WALK';
    } else {
      targetState = 'IDLE';
    }

    if (targetState !== this.currentState) {
      this.previousState = this.currentState;
      this.currentState = targetState;
    }

    // 2. Smoothly adjust crossfade weights toward target
    const blendRate = Math.min(1.0, this.crossfadeSpeed * dt);
    const states: LocomotionState[] = ['IDLE', 'WALK', 'JOG', 'SPRINT', 'PLANT', 'CROSSOVER'];

    let totalWeight = 0;
    for (const state of states) {
      const targetWeight = state === this.currentState ? 1.0 : 0.0;
      this.blendWeights[state] += (targetWeight - this.blendWeights[state]) * blendRate;
      if (this.blendWeights[state] < 0.001) this.blendWeights[state] = 0.0;
      totalWeight += this.blendWeights[state];
    }

    // Normalize weights to sum to 1.0
    if (totalWeight > 0.0001) {
      for (const state of states) {
        this.blendWeights[state] /= totalWeight;
      }
    }

    // 3. Compute dynamic animation playback rate matched to speed
    let playbackRate = 1.0;
    if (this.currentState === 'WALK') {
      playbackRate = 0.85 + (speed01 / 0.35) * 0.35;
    } else if (this.currentState === 'JOG') {
      playbackRate = 0.9 + ((speed01 - 0.35) / 0.35) * 0.35;
    } else if (this.currentState === 'SPRINT') {
      playbackRate = 1.0 + (speed01 - 0.7) * 0.5;
    } else if (this.currentState === 'CROSSOVER') {
      playbackRate = 1.25;
    }

    return {
      state: this.currentState,
      weights: { ...this.blendWeights },
      primaryPlaybackRate: Math.max(0.7, Math.min(1.5, playbackRate)),
    };
  }
}
