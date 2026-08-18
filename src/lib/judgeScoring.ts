/**
 * Final Evolution Lab — Shared Judge, Scoring & Session Telemetry Engine
 * Reused across all sport & creative modes for unified PRQ progression and session logging.
 */

export interface GameScoreResult {
  modeId: string;
  modeTitle: string;
  playerScore: number;
  opponentScore: number;
  isVictory: boolean;
  performanceGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  prqDelta: number;
  shardsEarned: number;
  influenceGained: number;
  metrics: Record<string, number | string>;
  timestamp: string;
}

export interface TennisScoreState {
  playerPoints: number; // 0, 1, 2, 3 (0, 15, 30, 40)
  opponentPoints: number;
  playerGames: number;
  opponentGames: number;
  playerSets: number;
  opponentSets: number;
  isDeuce: boolean;
  advantage: 'player' | 'opponent' | null;
  server: 'player' | 'opponent';
  gameHistory: string[];
  matchOver: boolean;
  winner: 'player' | 'opponent' | null;
}

export function createInitialTennisScore(): TennisScoreState {
  return {
    playerPoints: 0,
    opponentPoints: 0,
    playerGames: 0,
    opponentGames: 0,
    playerSets: 0,
    opponentSets: 0,
    isDeuce: false,
    advantage: null,
    server: 'player',
    gameHistory: [],
    matchOver: false,
    winner: null,
  };
}

export function formatTennisPoints(points: number, _opponentPoints: number, isDeuce: boolean, advantage: 'player' | 'opponent' | null, side: 'player' | 'opponent'): string {
  if (isDeuce) return '40 (DEUCE)';
  if (advantage === side) return 'AD';
  if (advantage && advantage !== side) return '40';
  switch (points) {
    case 0: return '0';
    case 1: return '15';
    case 2: return '30';
    case 3: return '40';
    default: return '40';
  }
}

export interface SoccerScoreState {
  playerGoals: number;
  opponentGoals: number;
  half: 1 | 2;
  matchClockSec: number; // 0 to 180 (represents 90 minutes scaled to 3 min arcade half)
  playerShots: number;
  playerShotsOnTarget: number;
  playerSaves: number;
  playerTackles: number;
  possessionTeam: 'player' | 'opponent';
  matchOver: boolean;
  winner: 'player' | 'opponent' | 'draw' | null;
  matchEvents: string[];
}

export function createInitialSoccerScore(): SoccerScoreState {
  return {
    playerGoals: 0,
    opponentGoals: 0,
    half: 1,
    matchClockSec: 0,
    playerShots: 0,
    playerShotsOnTarget: 0,
    playerSaves: 0,
    playerTackles: 0,
    possessionTeam: 'player',
    matchOver: false,
    winner: null,
    matchEvents: ['Match Kickoff — 1st Half'],
  };
}

export function advanceSoccerMatch(
  state: SoccerScoreState,
  deltaSec: number
): SoccerScoreState {
  if (state.matchOver) return state;
  const next = { ...state };
  next.matchClockSec += deltaSec;

  if (next.half === 1 && next.matchClockSec >= 90) {
    next.half = 2;
    next.matchClockSec = 90;
    next.matchEvents.push('Halftime reached (1-1 / score check)');
  } else if (next.half === 2 && next.matchClockSec >= 180) {
    next.matchOver = true;
    if (next.playerGoals > next.opponentGoals) next.winner = 'player';
    else if (next.opponentGoals > next.playerGoals) next.winner = 'opponent';
    else next.winner = 'draw';
    next.matchEvents.push(`Full Time Whistle: ${next.playerGoals} - ${next.opponentGoals}`);
  }
  return next;
}

export function recordSoccerGoal(
  state: SoccerScoreState,
  scorer: 'player' | 'opponent',
  distanceYards: number
): { nextState: SoccerScoreState; event: string } {
  const next = { ...state };
  if (scorer === 'player') {
    next.playerGoals += 1;
    next.playerShots += 1;
    next.playerShotsOnTarget += 1;
    next.matchEvents.push(`⚽ GOAL! Player strike from ${Math.round(distanceYards)}m!`);
  } else {
    next.opponentGoals += 1;
    next.matchEvents.push(`⚽ Opponent Goal!`);
  }
  return { nextState: next, event: 'GOAL' };
}

export interface BaseballScoreState {
  pitchesRemaining: number;
  totalPitches: number;
  homeRuns: number;
  totalDistanceFt: number;
  longestHomeRunFt: number;
  consecutiveHRs: number;
  multiplier: number;
  hits: number;
  strikes: number;
  outs: number;
  lastExitVelocityMph: number;
  lastLaunchAngleDeg: number;
  lastDistanceFt: number;
  derbyComplete: boolean;
  history: Array<{
    pitchNumber: number;
    pitchType: string;
    result: 'HOMERUN' | 'DEEP_FLY' | 'LINE_DRIVE' | 'GROUNDOUT' | 'FOUL' | 'STRIKE' | 'BALL';
    distanceFt: number;
    exitMph: number;
    launchDeg: number;
  }>;
}

export function createInitialBaseballScore(totalPitches = 10): BaseballScoreState {
  return {
    pitchesRemaining: totalPitches,
    totalPitches,
    homeRuns: 0,
    totalDistanceFt: 0,
    longestHomeRunFt: 0,
    consecutiveHRs: 0,
    multiplier: 1.0,
    hits: 0,
    strikes: 0,
    outs: 0,
    lastExitVelocityMph: 0,
    lastLaunchAngleDeg: 0,
    lastDistanceFt: 0,
    derbyComplete: false,
    history: [],
  };
}

export function recordBaseballSwing(
  state: BaseballScoreState,
  pitchType: string,
  result: 'HOMERUN' | 'DEEP_FLY' | 'LINE_DRIVE' | 'GROUNDOUT' | 'FOUL' | 'STRIKE' | 'BALL',
  distanceFt: number,
  exitMph: number,
  launchDeg: number
): BaseballScoreState {
  const next = { ...state };
  next.pitchesRemaining = Math.max(0, next.pitchesRemaining - 1);
  next.lastExitVelocityMph = Math.round(exitMph);
  next.lastLaunchAngleDeg = Math.round(launchDeg);
  next.lastDistanceFt = Math.round(distanceFt);

  if (result === 'HOMERUN') {
    next.homeRuns += 1;
    next.hits += 1;
    next.totalDistanceFt += Math.round(distanceFt);
    next.longestHomeRunFt = Math.max(next.longestHomeRunFt, Math.round(distanceFt));
    next.consecutiveHRs += 1;
    if (next.consecutiveHRs >= 3) next.multiplier = 2.0;
    else if (next.consecutiveHRs >= 2) next.multiplier = 1.5;
  } else if (result === 'DEEP_FLY' || result === 'LINE_DRIVE') {
    next.hits += 1;
    next.consecutiveHRs = 0;
    next.multiplier = 1.0;
  } else if (result === 'STRIKE') {
    next.strikes += 1;
    next.consecutiveHRs = 0;
    next.multiplier = 1.0;
  } else {
    next.outs += 1;
    next.consecutiveHRs = 0;
    next.multiplier = 1.0;
  }

  next.history = [
    ...next.history,
    {
      pitchNumber: next.totalPitches - next.pitchesRemaining,
      pitchType,
      result,
      distanceFt: Math.round(distanceFt),
      exitMph: Math.round(exitMph),
      launchDeg: Math.round(launchDeg),
    }
  ];

  if (next.pitchesRemaining <= 0) {
    next.derbyComplete = true;
  }

  return next;
}

export interface GymnasticsScoreState {
  vaultName: string;
  vaultDifficulty: number; // D-Score e.g. 5.6 or 6.4
  runwaySpeedPercent: number;
  springboardQuality: 'PERFECT' | 'GOOD' | 'EARLY' | 'LATE' | 'MISS';
  tablePushQuality: 'PERFECT' | 'GOOD' | 'WEAK' | 'MISS';
  acrobaticComboHits: number;
  acrobaticComboTotal: number;
  landingQuality: 'STUCK' | 'SMALL_HOP' | 'LARGE_STEP' | 'FALL';
  executionScore: number; // 0 to 10.000
  difficultyScore: number; // D-Score
  totalScore: number; // D + E
  medal: 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE';
  attemptComplete: boolean;
  history: Array<{
    vaultName: string;
    dScore: number;
    eScore: number;
    total: number;
    landing: string;
  }>;
}

export function createInitialGymnasticsScore(): GymnasticsScoreState {
  return {
    vaultName: 'YURCHENKO DOUBLE PIKE',
    vaultDifficulty: 6.0,
    runwaySpeedPercent: 0,
    springboardQuality: 'GOOD',
    tablePushQuality: 'GOOD',
    acrobaticComboHits: 0,
    acrobaticComboTotal: 4,
    landingQuality: 'STUCK',
    executionScore: 10.0,
    difficultyScore: 6.0,
    totalScore: 16.0,
    medal: 'NONE',
    attemptComplete: false,
    history: [],
  };
}

export function calculateGymnasticsScore(
  state: GymnasticsScoreState,
  vaultName: string,
  dScore: number,
  runwaySpeed: number,
  springQuality: 'PERFECT' | 'GOOD' | 'EARLY' | 'LATE' | 'MISS',
  tableQuality: 'PERFECT' | 'GOOD' | 'WEAK' | 'MISS',
  comboHits: number,
  comboTotal: number,
  landing: 'STUCK' | 'SMALL_HOP' | 'LARGE_STEP' | 'FALL'
): GymnasticsScoreState {
  let eScore = 10.0;

  // Runway deduction
  if (runwaySpeed < 70) eScore -= 0.4;
  else if (runwaySpeed < 85) eScore -= 0.2;

  // Springboard deduction
  if (springQuality === 'PERFECT') eScore += 0;
  else if (springQuality === 'GOOD') eScore -= 0.1;
  else if (springQuality === 'EARLY' || springQuality === 'LATE') eScore -= 0.3;
  else eScore -= 0.8;

  // Table push deduction
  if (tableQuality === 'PERFECT') eScore += 0;
  else if (tableQuality === 'GOOD') eScore -= 0.1;
  else if (tableQuality === 'WEAK') eScore -= 0.4;
  else eScore -= 1.0;

  // Mid-air acrobatic form & rhythm combo
  const missedCombos = comboTotal - comboHits;
  eScore -= missedCombos * 0.35;

  // Landing deductions
  if (landing === 'STUCK') {
    eScore -= 0.0; // 0 deductions!
  } else if (landing === 'SMALL_HOP') {
    eScore -= 0.1;
  } else if (landing === 'LARGE_STEP') {
    eScore -= 0.3;
  } else {
    eScore -= 1.0; // Fall on mat
  }

  eScore = Math.max(4.0, Math.min(10.0, Math.round(eScore * 1000) / 1000));
  const finalTotal = Math.round((dScore + eScore) * 1000) / 1000;

  let medal: 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE' = 'NONE';
  if (finalTotal >= 15.6) medal = 'GOLD';
  else if (finalTotal >= 14.8) medal = 'SILVER';
  else if (finalTotal >= 13.9) medal = 'BRONZE';

  const next: GymnasticsScoreState = {
    vaultName,
    vaultDifficulty: dScore,
    runwaySpeedPercent: Math.round(runwaySpeed),
    springboardQuality: springQuality,
    tablePushQuality: tableQuality,
    acrobaticComboHits: comboHits,
    acrobaticComboTotal: comboTotal,
    landingQuality: landing,
    executionScore: eScore,
    difficultyScore: dScore,
    totalScore: finalTotal,
    medal,
    attemptComplete: true,
    history: [
      ...state.history,
      {
        vaultName,
        dScore,
        eScore,
        total: finalTotal,
        landing,
      }
    ],
  };

  return next;
}

export interface DanceScoreState {
  trackTitle: string;
  artist: string;
  bpm: number;
  score: number;
  combo: number;
  maxCombo: number;
  multiplier: number;
  judgmentCounts: {
    marvelous: number;
    perfect: number;
    great: number;
    good: number;
    miss: number;
  };
  accuracyPercent: number;
  grade: 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D';
  energyLevel: number; // 0 to 100% (Life gauge)
  feverActive: boolean;
  totalNotes: number;
  notesHit: number;
  routineComplete: boolean;
}

export function createInitialDanceScore(trackTitle = 'NEON CYBER PULSE', artist = 'SYNTH MATRIX', bpm = 132, totalNotes = 48): DanceScoreState {
  return {
    trackTitle,
    artist,
    bpm,
    score: 0,
    combo: 0,
    maxCombo: 0,
    multiplier: 1.0,
    judgmentCounts: {
      marvelous: 0,
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
    },
    accuracyPercent: 100,
    grade: 'SSS',
    energyLevel: 80,
    feverActive: false,
    totalNotes,
    notesHit: 0,
    routineComplete: false,
  };
}

export function recordDanceNoteHit(
  state: DanceScoreState,
  judgment: 'marvelous' | 'perfect' | 'great' | 'good' | 'miss'
): DanceScoreState {
  const nextCounts = { ...state.judgmentCounts, [judgment]: state.judgmentCounts[judgment] + 1 };
  
  let basePoints: number;
  let energyDelta: number;
  let nextCombo = state.combo;

  if (judgment === 'marvelous') {
    basePoints = 1000;
    energyDelta = 3;
    nextCombo += 1;
  } else if (judgment === 'perfect') {
    basePoints = 800;
    energyDelta = 2;
    nextCombo += 1;
  } else if (judgment === 'great') {
    basePoints = 500;
    energyDelta = 1;
    nextCombo += 1;
  } else if (judgment === 'good') {
    basePoints = 250;
    energyDelta = 0;
    nextCombo = 0; // Combo breaks on Good in DDR
  } else {
    // Miss
    basePoints = 0;
    energyDelta = -8;
    nextCombo = 0;
  }

  const feverActive = nextCombo >= 20 || state.feverActive;
  const comboMultiplier = 1.0 + Math.min(4.0, Math.floor(nextCombo / 10) * 0.5) + (feverActive ? 0.5 : 0);
  const earnedScore = Math.round(basePoints * comboMultiplier);
  const nextScore = state.score + earnedScore;
  const nextMaxCombo = Math.max(state.maxCombo, nextCombo);
  const nextEnergy = Math.max(0, Math.min(100, state.energyLevel + energyDelta));

  const totalProcessed = nextCounts.marvelous + nextCounts.perfect + nextCounts.great + nextCounts.good + nextCounts.miss;
  const maxPossible = totalProcessed * 1000;
  const currentEarned = (nextCounts.marvelous * 1000) + (nextCounts.perfect * 800) + (nextCounts.great * 500) + (nextCounts.good * 250);
  const accuracy = totalProcessed > 0 ? Math.round((currentEarned / maxPossible) * 1000) / 10 : 100;

  let grade: 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D';
  if (accuracy >= 99) grade = 'SSS';
  else if (accuracy >= 95) grade = 'SS';
  else if (accuracy >= 90) grade = 'S';
  else if (accuracy >= 80) grade = 'A';
  else if (accuracy >= 70) grade = 'B';
  else if (accuracy >= 60) grade = 'C';
  else grade = 'D';

  const routineComplete = totalProcessed >= state.totalNotes || nextEnergy <= 0;

  return {
    ...state,
    score: nextScore,
    combo: nextCombo,
    maxCombo: nextMaxCombo,
    multiplier: Math.round(comboMultiplier * 10) / 10,
    judgmentCounts: nextCounts,
    accuracyPercent: accuracy,
    grade,
    energyLevel: nextEnergy,
    feverActive,
    notesHit: judgment !== 'miss' ? state.notesHit + 1 : state.notesHit,
    routineComplete,
  };
}

export interface SnowboardScoreState {
  courseName: string;
  totalScore: number;
  currentComboScore: number;
  multiplier: number;
  boostMeter: number; // 0 to 100%
  isTrickyMode: boolean;
  speedKph: number;
  currentTrick: string;
  totalRotationsDeg: number;
  grindDistanceM: number;
  bigAirTimeSec: number;
  landingHistory: Array<'STUCK' | 'CLEAN' | 'SKETCHY' | 'BAIL'>;
  runFinished: boolean;
}

export function createInitialSnowboardScore(courseName = 'PEAK OVERDRIVE'): SnowboardScoreState {
  return {
    courseName,
    totalScore: 0,
    currentComboScore: 0,
    multiplier: 1.0,
    boostMeter: 30,
    isTrickyMode: false,
    speedKph: 55,
    currentTrick: 'CARVE',
    totalRotationsDeg: 0,
    grindDistanceM: 0,
    bigAirTimeSec: 0,
    landingHistory: [],
    runFinished: false,
  };
}

export interface KarateScoreState {
  round: number;
  playerHealth: number; // 0 to 100
  opponentHealth: number; // 0 to 100
  playerPosture: number; // 0 to 100 (PRQ Guard Meter)
  opponentPosture: number; // 0 to 100
  playerRoundWins: number;
  opponentRoundWins: number;
  playerCombo: number;
  lastMovePlayer: string;
  lastMoveOpponent: string;
  parryFlash: boolean;
  matchWinner: 'PLAYER' | 'OPPONENT' | 'DRAW' | null;
}

export function createInitialKarateScore(): KarateScoreState {
  return {
    round: 1,
    playerHealth: 100,
    opponentHealth: 100,
    playerPosture: 100,
    opponentPosture: 100,
    playerRoundWins: 0,
    opponentRoundWins: 0,
    playerCombo: 0,
    lastMovePlayer: 'READY STANCE',
    lastMoveOpponent: 'KATA STANCE',
    parryFlash: false,
    matchWinner: null,
  };
}

export interface FootballScoreState {
  playerScore: number;
  opponentScore: number;
  quarter: number;
  timeRemainingSec: number;
  down: number; // 1, 2, 3, 4
  yardsToGo: number; // e.g. 10
  ballOnYard: number; // 0 to 100 (100 is Opponent Endzone, 0 is Own Endzone)
  driveYards: number;
  possession: 'player' | 'opponent';
  playHistory: string[];
  gameOver: boolean;
  winner: 'player' | 'opponent' | null;
}

export function createInitialFootballScore(): FootballScoreState {
  return {
    playerScore: 0,
    opponentScore: 0,
    quarter: 1,
    timeRemainingSec: 120, // 2:00 arcade quarter
    down: 1,
    yardsToGo: 10,
    ballOnYard: 25, // Start at own 25 yard line
    driveYards: 0,
    possession: 'player',
    playHistory: [],
    gameOver: false,
    winner: null,
  };
}

export function advanceFootballPlay(
  state: FootballScoreState,
  yardsGained: number,
  isTurnover: boolean = false
): { nextState: FootballScoreState; event: 'FIRST_DOWN' | 'TOUCHDOWN' | 'SAFETY' | 'TURNOVER_ON_DOWNS' | 'NEXT_DOWN' | 'INTERCEPTION' } {
  const next: FootballScoreState = { ...state };
  next.timeRemainingSec = Math.max(0, next.timeRemainingSec - 12);

  if (isTurnover) {
    next.possession = next.possession === 'player' ? 'opponent' : 'player';
    next.down = 1;
    next.yardsToGo = 10;
    next.ballOnYard = 100 - next.ballOnYard;
    next.driveYards = 0;
    next.playHistory.push(`Interception / Turnover! Ball turned over.`);
    return { nextState: next, event: 'INTERCEPTION' };
  }

  const newYard = next.ballOnYard + yardsGained;
  next.driveYards += yardsGained;

  // Check Touchdown
  if (newYard >= 100) {
    if (next.possession === 'player') {
      next.playerScore += 7; // Touchdown + Automatic Extra Point
      next.playHistory.push(`TOUCHDOWN! (${yardsGained} yd play)`);
    } else {
      next.opponentScore += 7;
      next.playHistory.push(`Opponent Touchdown!`);
    }

    // Reset drive
    next.possession = next.possession === 'player' ? 'opponent' : 'player';
    next.down = 1;
    next.yardsToGo = 10;
    next.ballOnYard = 25;
    next.driveYards = 0;
    return { nextState: next, event: 'TOUCHDOWN' };
  }

  // Check Safety
  if (newYard <= 0) {
    if (next.possession === 'player') {
      next.opponentScore += 2;
    } else {
      next.playerScore += 2;
    }
    next.possession = next.possession === 'player' ? 'opponent' : 'player';
    next.down = 1;
    next.yardsToGo = 10;
    next.ballOnYard = 25;
    next.driveYards = 0;
    return { nextState: next, event: 'SAFETY' };
  }

  next.ballOnYard = newYard;
  const remainingYards = next.yardsToGo - yardsGained;

  if (remainingYards <= 0) {
    // First Down
    next.down = 1;
    next.yardsToGo = 10;
    next.playHistory.push(`1st Down! (+${yardsGained} yds)`);
    return { nextState: next, event: 'FIRST_DOWN' };
  } else {
    // Increment Down
    if (next.down >= 4) {
      // Turnover on Downs
      next.possession = next.possession === 'player' ? 'opponent' : 'player';
      next.down = 1;
      next.yardsToGo = 10;
      next.ballOnYard = 100 - next.ballOnYard;
      next.driveYards = 0;
      next.playHistory.push(`Turnover on Downs!`);
      return { nextState: next, event: 'TURNOVER_ON_DOWNS' };
    } else {
      next.down += 1;
      next.yardsToGo = remainingYards;
      next.playHistory.push(`${next.down}th & ${next.yardsToGo} (+${yardsGained} yds)`);
      return { nextState: next, event: 'NEXT_DOWN' };
    }
  }
}

/**
 * Updates Tennis scoring rules:
 * - 0 -> 15 -> 30 -> 40 -> Game
 * - Deuce at 40-40, then Advantage, then Game (must win by 2)
 * - Sets won at 6 games (or 4 in short format)
 */
export function awardTennisPoint(state: TennisScoreState, winner: 'player' | 'opponent', gamesToWinSet: number = 4): { nextState: TennisScoreState; event: string } {
  if (state.matchOver) return { nextState: state, event: 'MATCH_OVER' };

  const next: TennisScoreState = { ...state };
  let event = `${winner.toUpperCase()}_POINT`;

  const pPts = winner === 'player' ? next.playerPoints + 1 : next.playerPoints;
  const oPts = winner === 'opponent' ? next.opponentPoints + 1 : next.opponentPoints;

  // Check Deuce / Advantage situations
  if (pPts >= 3 && oPts >= 3) {
    if (pPts === oPts) {
      next.playerPoints = 3;
      next.opponentPoints = 3;
      next.isDeuce = true;
      next.advantage = null;
      event = 'DEUCE';
    } else if (winner === 'player' && next.advantage === 'player') {
      // Player wins game
      return finishTennisGame(next, 'player', gamesToWinSet);
    } else if (winner === 'opponent' && next.advantage === 'opponent') {
      // Opponent wins game
      return finishTennisGame(next, 'opponent', gamesToWinSet);
    } else if (winner === 'player' && next.advantage === 'opponent') {
      // Back to deuce
      next.advantage = null;
      next.isDeuce = true;
      event = 'DEUCE';
    } else if (winner === 'opponent' && next.advantage === 'player') {
      // Back to deuce
      next.advantage = null;
      next.isDeuce = true;
      event = 'DEUCE';
    } else {
      next.advantage = winner;
      next.isDeuce = false;
      event = `ADVANTAGE_${winner.toUpperCase()}`;
    }
  } else if (winner === 'player' && pPts >= 4 && pPts - oPts >= 2) {
    return finishTennisGame(next, 'player', gamesToWinSet);
  } else if (winner === 'opponent' && oPts >= 4 && oPts - pPts >= 2) {
    return finishTennisGame(next, 'opponent', gamesToWinSet);
  } else {
    next.playerPoints = pPts;
    next.opponentPoints = oPts;
    next.isDeuce = false;
    next.advantage = null;
  }

  return { nextState: next, event };
}

function finishTennisGame(state: TennisScoreState, winner: 'player' | 'opponent', gamesToWinSet: number): { nextState: TennisScoreState; event: string } {
  state.playerPoints = 0;
  state.opponentPoints = 0;
  state.isDeuce = false;
  state.advantage = null;
  state.server = state.server === 'player' ? 'opponent' : 'player';

  if (winner === 'player') {
    state.playerGames += 1;
  } else {
    state.opponentGames += 1;
  }

  // Check Set Win
  const pG = state.playerGames;
  const oG = state.opponentGames;
  if (winner === 'player' && pG >= gamesToWinSet && pG - oG >= 2) {
    state.playerSets += 1;
    state.gameHistory.push(`${pG}-${oG}`);
    state.playerGames = 0;
    state.opponentGames = 0;

    if (state.playerSets >= 1) { // 1-set arcade match or first to 2
      state.matchOver = true;
      state.winner = 'player';
      return { nextState: state, event: 'PLAYER_MATCH_VICTORY' };
    }
    return { nextState: state, event: 'PLAYER_SET_VICTORY' };
  } else if (winner === 'opponent' && oG >= gamesToWinSet && oG - pG >= 2) {
    state.opponentSets += 1;
    state.gameHistory.push(`${pG}-${oG}`);
    state.playerGames = 0;
    state.opponentGames = 0;

    if (state.opponentSets >= 1) {
      state.matchOver = true;
      state.winner = 'opponent';
      return { nextState: state, event: 'OPPONENT_MATCH_VICTORY' };
    }
    return { nextState: state, event: 'OPPONENT_SET_VICTORY' };
  }

  return { nextState: state, event: `${winner.toUpperCase()}_GAME_VICTORY` };
}

/**
 * Computes PRQ Delta scaled by performance grade and score ratio.
 */
export function computePrqDelta(isVictory: boolean, grade: 'S' | 'A' | 'B' | 'C' | 'D', rawScoreRatio: number): number {
  const gradeBonus = { S: 1.8, A: 1.4, B: 1.0, C: 0.6, D: 0.2 }[grade];
  const winMultiplier = isVictory ? 1.5 : 0.8;
  const baseDelta = 0.4 * gradeBonus * winMultiplier * Math.max(0.5, rawScoreRatio);
  return Number(baseDelta.toFixed(2));
}

/**
 * Web Audio Synthesizer Juice (Zero external MP3 dependencies)
 */
export class SoundJuice {
  private static ctx: AudioContext | null = null;

  private static getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  static playServeToss() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  static playRacketHit(type: 'topspin' | 'slice' | 'lob' | 'drop' | 'zone') {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'zone') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    } else if (type === 'topspin') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    } else if (type === 'slice' || type === 'drop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    } else {
      // Lob
      osc.type = 'sine';
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (type === 'zone' ? 0.3 : 0.18));
  }

  static playBounce() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  static playScoreCheer(isVictory: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = isVictory ? [523.25, 659.25, 783.99, 1046.5] : [400, 350, 300, 250];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isVictory ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.2);
    });
  }

  static playWhistle() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2400, ctx.currentTime);
    osc.frequency.setValueAtTime(2600, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(2400, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  }

  static playSpiralPass() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  static playCatch() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  }

  static playTackleHit(isTruck: boolean = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isTruck ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isTruck ? 180 : 120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(isTruck ? 0.45 : 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  static playJukeCut() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  static playTouchdownHorn() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    });
  }

  static playSoccerKick(type: 'ground' | 'curve' | 'power_hyper' | 'chip' = 'ground') {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'power_hyper') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    } else if (type === 'curve') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    } else if (type === 'chip') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (type === 'power_hyper' ? 0.22 : 0.16));
  }

  static playGoalNet() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  static playGoalCelebration() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
    });
  }

  static playSlideTackle() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  }

  static playGoalkeeperSave() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  static playBatCrack(quality: 'perfect_barrel' | 'solid' | 'weak' | 'foul' = 'solid') {
    const ctx = this.getContext();
    if (!ctx) return;

    if (quality === 'perfect_barrel') {
      // Powerful high-pitch acoustic wood pop + sub bass boom
      const oscHigh = ctx.createOscillator();
      const gainHigh = ctx.createGain();
      oscHigh.type = 'triangle';
      oscHigh.frequency.setValueAtTime(1400, ctx.currentTime);
      oscHigh.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.14);
      gainHigh.gain.setValueAtTime(0.6, ctx.currentTime);
      gainHigh.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      oscHigh.connect(gainHigh);
      gainHigh.connect(ctx.destination);
      oscHigh.start();
      oscHigh.stop(ctx.currentTime + 0.14);

      const oscLow = ctx.createOscillator();
      const gainLow = ctx.createGain();
      oscLow.type = 'sawtooth';
      oscLow.frequency.setValueAtTime(220, ctx.currentTime);
      oscLow.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.35);
      gainLow.gain.setValueAtTime(0.5, ctx.currentTime);
      gainLow.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      oscLow.connect(gainLow);
      gainLow.connect(ctx.destination);
      oscLow.start();
      oscLow.stop(ctx.currentTime + 0.35);
    } else if (quality === 'solid') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    }
  }

  static playPitchWhoosh() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(460, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  static playUmpireCall(call: 'strike' | 'ball' | 'out') {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    const startFreq = call === 'strike' ? 340 : call === 'out' ? 260 : 440;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.7, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  static playHomeRunSiren() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.1);
      osc.stop(ctx.currentTime + idx * 0.1 + 0.5);
    });
  }

  static playSprintStep() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }

  static playSpringboardBoing() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  static playTablePush() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  static playTwistWhoosh() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  static playMatLanding(quality: 'stuck' | 'hop' | 'fall' = 'stuck') {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = quality === 'stuck' ? 'triangle' : quality === 'hop' ? 'sine' : 'sawtooth';
    const startFreq = quality === 'stuck' ? 120 : quality === 'hop' ? 180 : 80;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(quality === 'stuck' ? 0.6 : 0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  static playOlympicFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
    });
  }

  static playBeatDrum(type: 'kick' | 'snare' | 'hihat' | 'synth') {
    const ctx = this.getContext();
    if (!ctx) return;

    if (type === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'snare') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'hihat') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  }

  static playNoteHit(judgment: 'marvelous' | 'perfect' | 'great' | 'good' | 'miss') {
    const ctx = this.getContext();
    if (!ctx) return;

    if (judgment === 'miss') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      return;
    }

    const freqMap = {
      marvelous: 1046.50, // C6
      perfect: 880.00,   // A5
      great: 659.25,     // E5
      good: 523.25,      // C5
    };
    const freq = freqMap[judgment];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = judgment === 'marvelous' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(judgment === 'marvelous' ? 0.45 : 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  static playFeverActivated() {
    const ctx = this.getContext();
    if (!ctx) return;
    const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.04);
      osc.stop(ctx.currentTime + idx * 0.04 + 0.3);
    });
  }

  // --- SNOWBOARD AUDIO (SSX Style) ---
  static playSnowCarve() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  static playRailGrind() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  static playAirTrick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  }

  static playSnowLanding(quality: 'STUCK' | 'CLEAN' | 'SKETCHY' | 'BAIL') {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (quality === 'BAIL') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(quality === 'STUCK' ? 0.6 : 0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (quality === 'BAIL' ? 0.3 : 0.22));
  }

  // --- KARATE / COMBAT AUDIO (Soul Calibur Weight) ---
  static playStrikeImpact(type: 'light' | 'heavy' | 'critical') {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type === 'critical' ? 'sawtooth' : 'triangle';
    const startFreq = type === 'light' ? 240 : type === 'heavy' ? 160 : 110;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + (type === 'critical' ? 0.25 : 0.14));
    gain.gain.setValueAtTime(type === 'critical' ? 0.7 : type === 'heavy' ? 0.5 : 0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (type === 'critical' ? 0.25 : 0.14));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (type === 'critical' ? 0.25 : 0.14));
  }

  static playParryClash() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1480, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(740, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  static playCharge() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }

  static playTakeoff() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  static playSlam() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  static playZoneBeep() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  static playHit() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  static playVictory() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.1);
      osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
    });
  }

  static playGolfSwing() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  static playSwish() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  }

  static playDribble() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  static playWaveCarve() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  static playSkateGrind() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  static playVolleySpike() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.7, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  /**
   * Generic reward/unlock chime shared across modes (PRQ level-up, shard
   * payout, mastery unlock). Stubbed ahead of the Studio Kart/Karate merge
   * so a leftover `SoundJuice.playReward(...)` call resolves at compile
   * time instead of failing tsc with a missing-member error.
   */
  static playReward() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 880, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.3);
    });
  }

  /**
   * Crowd cheer stinger. Stubbed ahead of the Studio Kart/Karate merge so a
   * leftover `SoundJuice.playCrowdCheer(...)` call resolves at compile time
   * instead of failing tsc with a missing-member error. Reuses the shared
   * reward chime — no new audio behavior invented.
   */
  static playCrowdCheer() {
    this.playReward();
  }

  /**
   * Gymnastics landing success cue. Stubbed ahead of the Studio Kart/Karate
   * merge so a leftover `SoundJuice.playGymnasticSuccess(...)` call resolves
   * at compile time instead of failing tsc with a missing-member error.
   * Reuses the shared reward chime — no new audio behavior invented.
   */
  static playGymnasticSuccess() {
    this.playReward();
  }

  /**
   * Catch/thud impact cue. Stubbed ahead of the Studio Kart/Karate merge so
   * a leftover `SoundJuice.playCatchThud(...)` call resolves at compile time
   * instead of failing tsc with a missing-member error. Reuses the shared
   * reward chime — no new audio behavior invented.
   */
  static playCatchThud() {
    this.playReward();
  }

  static playBuzzer() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  }
}
