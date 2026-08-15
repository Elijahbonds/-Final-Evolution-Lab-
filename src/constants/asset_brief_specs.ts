/**
 * FEL (Final Evolution Lab) Asset Direction & Technical Specification Registry
 * Strictly conforms to the Canonical 65-Bone Mixamo Humanoid Rig,
 * Cel-Shaded Anime Visual Pipeline, and Per-Mode Environment Palette Standards.
 */

export interface AthleteSkinVariant {
  id: string;
  name: string;
  theme: string;
  primaryHex: string;
  accentHex: string;
  rimColorHex: string;
  maskChannels: {
    r: string; // Base Kit / Jersey / Gi
    g: string; // Secondary trim / Accent lines
    b: string; // Shoes / Accessories
  };
  accessory: string; // Silhouette-safe accessory reading at gameplay camera distance
  description: string;
}

export const CANONICAL_ATHLETE_SKINS: AthleteSkinVariant[] = [
  {
    id: 'venice_streetball',
    name: 'Venice Streetball',
    theme: 'Venice Golden Hour',
    primaryHex: '#00F2FF', // Teal
    accentHex: '#FF5E7E',  // Coral
    rimColorHex: '#FFD700', // Sunset gold
    maskChannels: {
      r: 'Teal Oversized Street Tank & Shorts',
      g: 'Coral Piping & Number Decals',
      b: 'Court High-Tops with Cyan Soles'
    },
    accessory: 'Coral Terrycloth Headband',
    description: 'High-contrast sunset streetball look with warm amber rim highlights.'
  },
  {
    id: 'dojo_gi',
    name: 'Dojo Discipline',
    theme: 'Night Dojo Courtyard',
    primaryHex: '#F0F4F8', // Bleached white gi
    accentHex: '#09132F',  // Ink black belt & trim
    rimColorHex: '#00F2FF', // Cyan chi rim
    maskChannels: {
      r: 'Reinforced Woven White Fabric with Halftone Shading',
      g: 'Ink-Black Master Belt & Sleeve Trim',
      b: 'Wrist & Ankle Sparring Wraps'
    },
    accessory: 'Forearm Sparring Guards',
    description: 'Crisp martial arts uniform featuring ink-wash shadow terminators.'
  },
  {
    id: 'snow_freeride',
    name: 'Alpine Freeride',
    theme: 'Glacier Piste',
    primaryHex: '#1E293B', // Matte Navy Shell
    accentHex: '#FF7A00',  // High-Vis Orange
    rimColorHex: '#93C5FD', // Frost Rim
    maskChannels: {
      r: 'Matte Navy Technical Weatherproof Outer Shell',
      g: 'High-Vis Avalanche Orange Hood & Pockets',
      b: 'Rigid Bindings Boots'
    },
    accessory: 'Tinted Polarized Snow Goggles & Cap',
    description: 'Rugged winter freeride gear with frosty cyan rim lighting.'
  },
  {
    id: 'surf_break',
    name: 'North Shore Barrel',
    theme: 'Wave Express Point Break',
    primaryHex: '#06B6D4', // Teal Wetsuit
    accentHex: '#3B82F6',  // Indigo Gradient
    rimColorHex: '#67E8F9', // Sea Spray Rim
    maskChannels: {
      r: 'Compression Teal Neoprene Body',
      g: 'Deep Indigo Shoulder & Lateral Stretch Panels',
      b: 'Thermal Traction Booties'
    },
    accessory: 'Ankle Leash with Quick-Release Swivel',
    description: 'Streamlined athletic wetsuit designed for high-amplitude barrel riding.'
  },
  {
    id: 'night_stadium',
    name: 'Volt Gridiron & Derby',
    theme: 'Floodlight Stadium',
    primaryHex: '#18181B', // Charcoal Slate
    accentHex: '#10B981',  // Electric Emerald / Lime
    rimColorHex: '#A7F3D0', // High-Frequency Floodlight Rim
    maskChannels: {
      r: 'Matte Charcoal Compression Armor & Uniform',
      g: 'Electric Lime Luminescent Track Lines',
      b: 'Molded Cleats'
    },
    accessory: 'Tinted Eye-Shield & Wrist Playbook Band',
    description: 'High-tech stadium combat and ball-game suit built for floodlit nighttime matches.'
  }
];

export const RIVAL_VANE_PROFILE = {
  name: 'Vane',
  role: 'Recurring Story Antagonist & Apex Circuit Rival',
  colorway: {
    primary: '#FFFFFF',     // Immaculate Sponsor-White
    accent: '#F59E0B',      // Imperial Gold Trim
    outline: '#D97706',     // Gold Ink Outline Accent
    rim: '#FEF08A'          // Radiant Apex Rim
  },
  variants: [
    { id: 'vane_court', name: 'Court Vanguard (Sponsor Jersey #00)' },
    { id: 'vane_dojo', name: 'Imperial Dojo Hakama & Gold Sashes' },
    { id: 'vane_colosseum', name: 'Apex Colosseum High-Plate Armor' },
    { id: 'vane_sky', name: 'Stratosphere Flight-Gated Aerowing Suit' }
  ],
  lore: 'The natural prodigy handed peak sponsorships, custom facilities, and pristine gear. Demands perfection and views the player’s street hustle with aristocratic skepticism.'
};

export const COMPANION_SPECIES_EVOLUTION = [
  {
    id: 'cinderpup',
    name: 'Cinderpup',
    element: 'Ember / Energy',
    stages: [
      { stage: 1, name: 'Cinderpup', role: 'Playful ember canine with fiery tail spark' },
      { stage: 2, name: 'Pyrehound', role: 'Agile flaming-maned hunting hound' },
      { stage: 3, name: 'Solaris Wolf', role: 'Majestic celestial fire wolf with blazing trail aura' }
    ]
  },
  {
    id: 'strideraptor',
    name: 'Strideraptor',
    element: 'Wind / Velocity',
    stages: [
      { stage: 1, name: 'Swiftlet', role: 'Fluffy chick with oversized stride legs' },
      { stage: 2, name: 'Velocipteryx', role: 'Crested sprint raptor with feather blades' },
      { stage: 3, name: 'Aero Vanguard', role: 'Full rideable mount with saddle-friendly back and broad wing spread' }
    ]
  },
  {
    id: 'gardenite',
    name: 'Gardenite',
    element: 'Flora / Regeneration',
    stages: [
      { stage: 1, name: 'Sproutling', role: 'Botanical leaf sprite with curious wide eyes' },
      { stage: 2, name: 'Bloomstalker', role: 'Vigorous floral guardian with bramble shields' },
      { stage: 3, name: 'Sovereign Treant', role: 'Ancient moss-canopied forest titan with blossom aura' }
    ]
  }
];

export const TECHNICAL_RIG_SPECIFICATION = {
  rigStandard: 'Canonical Mixamo Humanoid (Prefixless)',
  boneCount: 65,
  rootOrientation: 'T-Pose, Y-up, meters, -Z forward',
  boneListPrefix: 'NO mixamorig: prefix allowed in shipping build',
  polyBudget: '<= 25,000 Triangles per character model',
  textureCompression: 'KTX2 / Basis Universal with ORM (Occlusion/Roughness/Metallic) single-channel packing',
  renderingPipeline: 'Babylon.js Cel-Shader with Sobel Ink-Outline & 3-Band Quantization PostProcess'
};
