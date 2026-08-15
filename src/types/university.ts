export type TrackType = 'physical' | 'educational' | 'career' | 'profile' | 'overview' | 'brain_brawl';

export type CreatorCardRarity = 'Common' | 'Rare' | 'Epic' | 'Sovereign Legendary';

export interface MovementSignature {
  scanDate: string;
  intervalWeek: number;
  prqScore: number;
  asymmetryIndex: number; // percentage, e.g. 8.4%
  mobilityScore: number; // 0-100
  stabilityScore: number; // 0-100
  reactiveStiffness: number; // kN/m or index
  deepSquatScore: number; // 0-3 FMS
  hurdleStepScore: number; // 0-3 FMS
  inlineLungeScore: number; // 0-3 FMS
  aslrScore: number; // 0-3 FMS (Active Straight Leg Raise)
  trunkStabilityScore: number; // 0-3 FMS
  rotaryStabilityScore: number; // 0-3 FMS
  shoulderMobilityScore: number; // 0-3 FMS
  compensationPatterns: string[];
  restrictedJoints: string[];
  kineticChainLeakage: {
    ankle: number; // %
    knee: number; // %
    hip: number; // %
    lumbar: number; // %
  };
  diagnosticNotes: string;
  disclaimer: string;
}

export interface ProgressionLevel {
  level: 1 | 2 | 3;
  title: string;
  subtitle: string;
  description: string;
  competencies: {
    id: string;
    name: string;
    fmsPrerequisite: string;
    criteria: string;
    completed: boolean;
    verificationStatus: 'verified' | 'in-progress' | 'locked';
  }[];
  expressionModes: string[];
  unlocked: boolean;
}

export interface StressTestCase {
  id: string;
  title: string;
  athlete: string;
  discipline: string;
  videoDuration: string;
  sscEfficiency: number; // 0-100%
  takeoffAngle: number; // degrees
  groundContactTime: number; // ms
  peakGRF: number; // x bodyweight
  keyFrames: {
    frameNumber: number;
    timecode: string;
    phase: string;
    biomechanicalFault?: string;
    blueprintPrinciple: string;
    jointAngles: {
      hip: number;
      knee: number;
      ankle: number;
      trunk: number;
    };
  }[];
  blueprintLessonUrl?: string;
}

export interface EducationalModule {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  wordCountEstimate: string;
  coreConcepts: string[];
  blueprintTopics: string[];
  inGameMechanicMirror: string;
  appliedScenarios: {
    id: string;
    scenario: string;
    context: string;
    prompt: string;
    options: {
      id: string;
      text: string;
      rationale: string;
      isCorrect: boolean;
    }[];
  }[];
  creatorCardCredential: {
    id: string;
    cardName: string;
    rarity: 'Common' | 'Rare' | 'Epic' | 'Sovereign Legendary';
    badgeIcon: string;
    description: string;
    issuedAt?: string;
    credentialHash?: string;
  };
  facilitatorDiscussionPrompts: string[];
}

export interface CareerLadderStep {
  tier: number;
  title: string;
  role: string;
  compensationModel: string;
  requirements: {
    physicalPrereq: string;
    educationalPrereq: string;
    facilitationHours: number;
    validationCount: number;
  };
  unlocked: boolean;
  status: 'active' | 'in-training' | 'eligible' | 'locked';
  badge: string;
  deliverables: string[];
}

export interface SharedProfileData {
  athleteId: string;
  fullName: string;
  avatarSeed: string;
  joinedDate: string;
  careerTier: string;
  prqScore: number;
  movementSignature: MovementSignature;
  completedModuleIds: string[];
  earnedCreatorCards: {
    id: string;
    cardName: string;
    moduleNumber: number;
    rarity: string;
    issuedDate: string;
    credentialHash: string;
    signatureAuthority: string;
  }[];
  progressionLevels: ProgressionLevel[];
  facilitatorCertifiedTiers: {
    physicalTier1: boolean;
    educationalTier1: boolean;
    leadTrainer: boolean;
  };
  gamePerformanceHistory: {
    gameMode: string;
    date: string;
    metric: string;
    score: string;
    status: 'Verified' | 'Pending';
  }[];
  portfolioVerificationCode: string;
}

export interface UoPeopleComparisonMetric {
  pillar: string;
  uoPeopleApproach: string;
  felUniversityApproach: string;
  institutionalOutcome: string;
}
