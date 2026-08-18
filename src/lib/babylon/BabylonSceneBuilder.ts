import {
  Engine,
  Scene,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  ArcRotateCamera,
  MeshBuilder,
  StandardMaterial,
  Mesh,
  ShadowGenerator,
  PostProcess,
  Effect
} from '@babylonjs/core';

export interface BabylonSceneContext {
  engine: Engine;
  scene: Scene;
  camera: ArcRotateCamera;
  canvas: HTMLCanvasElement;
  shadowGenerator?: ShadowGenerator;
  celPostProcess?: PostProcess;
}

// Dark-Blue Ink Outline Color Palette Constants (Arc System Works / Anime Style)
export const ANIME_INK_BLUE = new Color3(0.035, 0.075, 0.185); // #09132f
export const RIM_CYAN = new Color3(0.0, 0.95, 1.0);
export const RIM_GOLD = new Color3(1.0, 0.85, 0.2);
export const RIM_PURPLE = new Color3(0.65, 0.1, 1.0);

/**
 * Registers and compiles the Cel-Shaded & Ink-Outline post-processing shader in BabylonJS
 */
export function setupCelShadingPipeline(scene: Scene, camera: ArcRotateCamera): PostProcess {
  if (!Effect.ShadersStore['celShadingFragmentShader']) {
    Effect.ShadersStore['celShadingFragmentShader'] = `
      #ifdef GL_ES
      precision highp float;
      #endif

      varying vec2 vUV;
      uniform sampler2D textureSampler;
      uniform vec2 screenSize;
      uniform vec3 inkColor;
      uniform vec3 rimColor;
      uniform float outlineThickness;
      uniform float celBands;

      // Convert RGB to Luminance
      float getLuminance(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }

      void main(void) {
        vec2 texel = 1.0 / screenSize;
        vec4 originalColor = texture2D(textureSampler, vUV);

        // 1. Sobel Edge Detection for Dark-Blue Ink Outlines
        float lumCenter = getLuminance(originalColor.rgb);
        float lumLeft   = getLuminance(texture2D(textureSampler, vUV - vec2(texel.x * outlineThickness, 0.0)).rgb);
        float lumRight  = getLuminance(texture2D(textureSampler, vUV + vec2(texel.x * outlineThickness, 0.0)).rgb);
        float lumUp     = getLuminance(texture2D(textureSampler, vUV + vec2(0.0, texel.y * outlineThickness)).rgb);
        float lumDown   = getLuminance(texture2D(textureSampler, vUV - vec2(0.0, texel.y * outlineThickness)).rgb);

        float dx = (lumRight - lumLeft);
        float dy = (lumUp - lumDown);
        float edge = sqrt(dx * dx + dy * dy);

        // 2. Soft band quantization; guard against pure-black crushing
        float numBands = max(celBands, 3.0);
        float steppedLum = floor(lumCenter * numBands + 0.5) / numBands;
        vec3 celShaded = originalColor.rgb * (steppedLum / max(lumCenter, 0.001));
        celShaded = clamp(celShaded * 1.06, 0.0, 1.0);

        // 3. Lift darkest tones so court/rim remain visible
        float lift = 0.035;
        celShaded = mix(celShaded, celShaded + lift, 1.0 - smoothstep(0.0, 0.25, lumCenter));

        // 4. Saturated Rim Lighting / High-Frequency Edge Highlights
        float rimFactor = smoothstep(0.65, 0.95, lumCenter);
        vec3 finalColor = mix(celShaded, celShaded + rimColor * 0.35, rimFactor);

        // 5. Blend Dark-Blue Ink Outlines (Thresholded)
        if (edge > 0.095) {
          float inkStrength = smoothstep(0.095, 0.24, edge);
          finalColor = mix(finalColor, inkColor, inkStrength * 0.82);
        }

        // Output final cel-shaded frame
        gl_FragColor = vec4(finalColor, originalColor.a);
      }
    `;
  }

  const postProcess = new PostProcess(
    'CelShadingPostProcess',
    'celShading',
    ['screenSize', 'inkColor', 'rimColor', 'outlineThickness', 'celBands'],
    null,
    1.0,
    camera,
    undefined,
    scene.getEngine()
  );

  postProcess.onApply = (effect) => {
    effect.setVector2('screenSize', new Vector3(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight(), 0));
    effect.setColor3('inkColor', ANIME_INK_BLUE);
    effect.setColor3('rimColor', RIM_CYAN);
    effect.setFloat('outlineThickness', 1.0);
    effect.setFloat('celBands', 6.0); // softer 6-tone banding to preserve visible detail
  };

  return postProcess;
}

export function createBabylonContext(canvas: HTMLCanvasElement): BabylonSceneContext {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.07, 0.11, 0.19, 1.0);

  // Camera setup
  const camera = new ArcRotateCamera(
    'mainCamera',
    -Math.PI / 2,
    Math.PI / 2.9,
    16,
    new Vector3(0, 1.8, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 4;
  camera.upperRadiusLimit = 32;
  camera.lowerBetaLimit = 0.1;
  camera.upperBetaLimit = Math.PI / 2 - 0.04;

  // Venice night-court lighting: warm key + cool fill + rim so the canvas is not black
  const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
  hemiLight.intensity = 0.95;
  hemiLight.groundColor = new Color3(0.12, 0.16, 0.26);
  hemiLight.diffuse = new Color3(0.72, 0.8, 1.0);

  const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -2.5, -1.2).normalize(), scene);
  dirLight.position = new Vector3(12, 22, 14);
  dirLight.intensity = 1.75;
  dirLight.diffuse = new Color3(1.0, 0.95, 0.84);

  // Cool rim fill from boardwalk/ocean side
  const rimLight = new DirectionalLight('rimLight', new Vector3(1, -0.5, 0.8).normalize(), scene);
  rimLight.position = new Vector3(-10, 7, -10);
  rimLight.intensity = 0.85;
  rimLight.diffuse = new Color3(0.52, 0.78, 1.0);

  const shadowGen = new ShadowGenerator(2048, dirLight);
  shadowGen.useBlurExponentialShadowMap = true;
  shadowGen.blurKernel = 16;
  shadowGen.bias = 0.0005;

  // Attach the Cel-Shading & Dark-Blue Ink Outline Shader Post-Processing Pipeline
  const celPostProcess = setupCelShadingPipeline(scene, camera);

  // Resize handling
  window.addEventListener('resize', () => {
    engine.resize();
  });

  return { engine, scene, camera, canvas, shadowGenerator: shadowGen, celPostProcess };
}

/**
 * Applies Dark-Blue Ink Outlines and Hard Shadow parameters to any Babylon Mesh
 */
export function applyAnimeInkOutlineToMesh(mesh: Mesh, outlineWidth = 0.035) {
  mesh.renderOutline = true;
  mesh.outlineColor = ANIME_INK_BLUE;
  mesh.outlineWidth = outlineWidth;
}

export type AthletePropType = 'basketball' | 'soccer' | 'baseball_bat' | 'tennis_racket' | 'golf_club' | 'none';

export interface AthleteOptions {
  propType?: AthletePropType;
  shadowGen?: ShadowGenerator;
  skinColor?: Color3;
}

/**
 * Creates a procedural articulated athlete model in Babylon 3D with Cel-Shaded Materials & Ink Outlines.
 * Supports optional parameterized sport equipment and props.
 */
export function createProceduralAthlete(
  scene: Scene, 
  name: string, 
  primaryColor: Color3, 
  accentColor: Color3,
  shadowGenOrOptions?: ShadowGenerator | AthleteOptions
): {
  root: Mesh;
  head: Mesh;
  torso: Mesh;
  leftArm: Mesh;
  rightArm: Mesh;
  leftLeg: Mesh;
  rightLeg: Mesh;
  basketball?: Mesh;
  propMesh?: Mesh;
} {
  // Normalize options for backwards compatibility
  let shadowGen: ShadowGenerator | undefined;
  let propType: AthletePropType = 'none';
  let skinColor = new Color3(0.92, 0.68, 0.52);

  if (shadowGenOrOptions) {
    if ('getShadowMap' in shadowGenOrOptions) {
      shadowGen = shadowGenOrOptions as ShadowGenerator;
      // Default legacy usage for basketball modes
      propType = 'basketball';
    } else {
      const opts = shadowGenOrOptions as AthleteOptions;
      shadowGen = opts.shadowGen;
      propType = opts.propType || 'none';
      if (opts.skinColor) skinColor = opts.skinColor;
    }
  }

  const root = new Mesh(`${name}_root`, scene);

  // Materials with hard stepped specular and vibrant diffuse
  const skinMat = new StandardMaterial(`${name}_skin`, scene);
  skinMat.diffuseColor = skinColor;
  skinMat.specularColor = new Color3(0.2, 0.2, 0.2);
  skinMat.specularPower = 32;

  const kitMat = new StandardMaterial(`${name}_kit`, scene);
  kitMat.diffuseColor = primaryColor;
  kitMat.emissiveColor = primaryColor.scale(0.2);
  kitMat.specularColor = new Color3(0.3, 0.3, 0.3);

  const accentMat = new StandardMaterial(`${name}_accent`, scene);
  accentMat.diffuseColor = accentColor;
  accentMat.emissiveColor = accentColor.scale(0.35);

  const shoeMat = new StandardMaterial(`${name}_shoe`, scene);
  shoeMat.diffuseColor = accentColor;
  shoeMat.specularColor = new Color3(0.2, 0.2, 0.2);

  // Hips / pelvis anchor
  const hips = new Mesh(`${name}_hips`, scene);
  hips.position.y = 1.0;
  hips.parent = root;

  // Torso (slightly tapered)
  const torso = MeshBuilder.CreateBox(`${name}_torso`, { width: 0.72, height: 1.0, depth: 0.42 }, scene);
  torso.position.y = 1.65;
  torso.material = kitMat;
  torso.parent = root;
  applyAnimeInkOutlineToMesh(torso, 0.035);
  shadowGen?.addShadowCaster(torso);

  // Head
  const head = MeshBuilder.CreateSphere(`${name}_head`, { diameter: 0.42 }, scene);
  head.position.y = 2.35;
  head.material = skinMat;
  head.parent = root;
  applyAnimeInkOutlineToMesh(head, 0.03);
  shadowGen?.addShadowCaster(head);

  // --- Segmented arms ---
  const shoulderY = 2.05;
  const shoulderX = 0.48;

  const leftShoulder = MeshBuilder.CreateSphere(`${name}_leftShoulder`, { diameter: 0.22 }, scene);
  leftShoulder.position.set(-shoulderX, shoulderY, 0);
  leftShoulder.material = skinMat;
  leftShoulder.parent = root;
  applyAnimeInkOutlineToMesh(leftShoulder, 0.025);

  const leftUpperArm = MeshBuilder.CreateCylinder(`${name}_leftUpperArm`, { height: 0.52, diameter: 0.17 }, scene);
  leftUpperArm.position.set(-shoulderX - 0.08, shoulderY - 0.32, 0);
  leftUpperArm.rotation.z = Math.PI / 10;
  leftUpperArm.material = skinMat;
  leftUpperArm.parent = root;
  applyAnimeInkOutlineToMesh(leftUpperArm, 0.025);

  const leftElbow = MeshBuilder.CreateSphere(`${name}_leftElbow`, { diameter: 0.16 }, scene);
  leftElbow.position.set(-shoulderX - 0.16, shoulderY - 0.62, 0);
  leftElbow.material = skinMat;
  leftElbow.parent = root;
  applyAnimeInkOutlineToMesh(leftElbow, 0.02);

  const leftForearm = MeshBuilder.CreateCylinder(`${name}_leftForearm`, { height: 0.48, diameter: 0.15 }, scene);
  leftForearm.position.set(-shoulderX - 0.2, shoulderY - 0.92, 0.05);
  leftForearm.rotation.z = Math.PI / 8;
  leftForearm.material = skinMat;
  leftForearm.parent = root;
  applyAnimeInkOutlineToMesh(leftForearm, 0.025);

  const rightShoulder = MeshBuilder.CreateSphere(`${name}_rightShoulder`, { diameter: 0.22 }, scene);
  rightShoulder.position.set(shoulderX, shoulderY, 0);
  rightShoulder.material = skinMat;
  rightShoulder.parent = root;
  applyAnimeInkOutlineToMesh(rightShoulder, 0.025);

  const rightUpperArm = MeshBuilder.CreateCylinder(`${name}_rightUpperArm`, { height: 0.52, diameter: 0.17 }, scene);
  rightUpperArm.position.set(shoulderX + 0.08, shoulderY - 0.32, 0);
  rightUpperArm.rotation.z = -Math.PI / 10;
  rightUpperArm.material = skinMat;
  rightUpperArm.parent = root;
  applyAnimeInkOutlineToMesh(rightUpperArm, 0.025);

  const rightElbow = MeshBuilder.CreateSphere(`${name}_rightElbow`, { diameter: 0.16 }, scene);
  rightElbow.position.set(shoulderX + 0.16, shoulderY - 0.62, 0);
  rightElbow.material = skinMat;
  rightElbow.parent = root;
  applyAnimeInkOutlineToMesh(rightElbow, 0.02);

  const rightForearm = MeshBuilder.CreateCylinder(`${name}_rightForearm`, { height: 0.48, diameter: 0.15 }, scene);
  rightForearm.position.set(shoulderX + 0.2, shoulderY - 0.92, 0.05);
  rightForearm.rotation.z = -Math.PI / 8;
  rightForearm.material = skinMat;
  rightForearm.parent = root;
  applyAnimeInkOutlineToMesh(rightForearm, 0.025);

  // Expose arms as compound groups (visual stand-ins for full IK)
  const leftArm = MeshBuilder.CreateBox(`${name}_leftArm`, { size: 0.01 }, scene);
  leftArm.isVisible = false;
  leftArm.parent = root;
  const rightArm = MeshBuilder.CreateBox(`${name}_rightArm`, { size: 0.01 }, scene);
  rightArm.isVisible = false;
  rightArm.parent = root;

  // --- Segmented legs ---
  const hipX = 0.24;

  const leftThigh = MeshBuilder.CreateCylinder(`${name}_leftThigh`, { height: 0.62, diameterTop: 0.21, diameterBottom: 0.17 }, scene);
  leftThigh.position.set(-hipX, 0.72, 0);
  leftThigh.material = kitMat;
  leftThigh.parent = root;
  applyAnimeInkOutlineToMesh(leftThigh, 0.03);
  shadowGen?.addShadowCaster(leftThigh);

  const leftKnee = MeshBuilder.CreateSphere(`${name}_leftKnee`, { diameter: 0.18 }, scene);
  leftKnee.position.set(-hipX, 0.38, 0);
  leftKnee.material = skinMat;
  leftKnee.parent = root;
  applyAnimeInkOutlineToMesh(leftKnee, 0.02);

  const leftShin = MeshBuilder.CreateCylinder(`${name}_leftShin`, { height: 0.58, diameterTop: 0.16, diameterBottom: 0.12 }, scene);
  leftShin.position.set(-hipX, 0.06, 0.02);
  leftShin.material = skinMat;
  leftShin.parent = root;
  applyAnimeInkOutlineToMesh(leftShin, 0.03);
  shadowGen?.addShadowCaster(leftShin);

  const leftFoot = MeshBuilder.CreateBox(`${name}_leftFoot`, { width: 0.18, height: 0.12, depth: 0.4 }, scene);
  leftFoot.position.set(-hipX, -0.04, 0.1);
  leftFoot.material = shoeMat;
  leftFoot.parent = root;
  applyAnimeInkOutlineToMesh(leftFoot, 0.03);
  shadowGen?.addShadowCaster(leftFoot);

  const rightThigh = MeshBuilder.CreateCylinder(`${name}_rightThigh`, { height: 0.62, diameterTop: 0.21, diameterBottom: 0.17 }, scene);
  rightThigh.position.set(hipX, 0.72, 0);
  rightThigh.material = kitMat;
  rightThigh.parent = root;
  applyAnimeInkOutlineToMesh(rightThigh, 0.03);
  shadowGen?.addShadowCaster(rightThigh);

  const rightKnee = MeshBuilder.CreateSphere(`${name}_rightKnee`, { diameter: 0.18 }, scene);
  rightKnee.position.set(hipX, 0.38, 0);
  rightKnee.material = skinMat;
  rightKnee.parent = root;
  applyAnimeInkOutlineToMesh(rightKnee, 0.02);

  const rightShin = MeshBuilder.CreateCylinder(`${name}_rightShin`, { height: 0.58, diameterTop: 0.16, diameterBottom: 0.12 }, scene);
  rightShin.position.set(hipX, 0.06, 0.02);
  rightShin.material = skinMat;
  rightShin.parent = root;
  applyAnimeInkOutlineToMesh(rightShin, 0.03);
  shadowGen?.addShadowCaster(rightShin);

  const rightFoot = MeshBuilder.CreateBox(`${name}_rightFoot`, { width: 0.18, height: 0.12, depth: 0.4 }, scene);
  rightFoot.position.set(hipX, -0.04, 0.1);
  rightFoot.material = shoeMat;
  rightFoot.parent = root;
  applyAnimeInkOutlineToMesh(rightFoot, 0.03);
  shadowGen?.addShadowCaster(rightFoot);

  // Hidden compound legs for callers that rotate simple legs
  const leftLeg = MeshBuilder.CreateBox(`${name}_leftLeg`, { size: 0.01 }, scene);
  leftLeg.isVisible = false;
  leftLeg.parent = root;
  const rightLeg = MeshBuilder.CreateBox(`${name}_rightLeg`, { size: 0.01 }, scene);
  rightLeg.isVisible = false;
  rightLeg.parent = root;

  let basketball: Mesh | undefined;
  let propMesh: Mesh | undefined;

  // Optional Sport Props
  if (propType === 'basketball') {
    const ballMat = new StandardMaterial(`${name}_ballMat`, scene);
    ballMat.diffuseColor = new Color3(1.0, 0.42, 0.05);
    ballMat.emissiveColor = new Color3(0.25, 0.1, 0.02);

    basketball = MeshBuilder.CreateSphere(`${name}_basketball`, { diameter: 0.35 }, scene);
    basketball.position.set(0.8, 1.3, 0.2);
    basketball.material = ballMat;
    basketball.parent = root;
    applyAnimeInkOutlineToMesh(basketball, 0.04);
    shadowGen?.addShadowCaster(basketball);
    propMesh = basketball;
  } else if (propType === 'soccer') {
    const ballMat = new StandardMaterial(`${name}_soccerMat`, scene);
    ballMat.diffuseColor = new Color3(0.95, 0.95, 0.95);
    ballMat.specularColor = new Color3(0.5, 0.5, 0.5);

    const soccerBall = MeshBuilder.CreateSphere(`${name}_soccerBall`, { diameter: 0.35 }, scene);
    soccerBall.position.set(0.35, 0.18, 0.45);
    soccerBall.material = ballMat;
    soccerBall.parent = root;
    applyAnimeInkOutlineToMesh(soccerBall, 0.04);
    shadowGen?.addShadowCaster(soccerBall);
    propMesh = soccerBall;
  } else if (propType === 'baseball_bat') {
    const batMat = new StandardMaterial(`${name}_batMat`, scene);
    batMat.diffuseColor = new Color3(0.72, 0.52, 0.33);

    const bat = MeshBuilder.CreateCylinder(`${name}_bat`, { height: 1.0, diameterTop: 0.12, diameterBottom: 0.05 }, scene);
    bat.position.set(0.7, 1.9, 0.3);
    bat.rotation.x = Math.PI / 4;
    bat.material = batMat;
    bat.parent = root;
    applyAnimeInkOutlineToMesh(bat, 0.03);
    shadowGen?.addShadowCaster(bat);
    propMesh = bat;
  } else if (propType === 'tennis_racket') {
    const racketMat = new StandardMaterial(`${name}_racketMat`, scene);
    racketMat.diffuseColor = new Color3(0.0, 0.85, 1.0);

    const racket = MeshBuilder.CreateCylinder(`${name}_racket`, { height: 0.85, diameter: 0.06 }, scene);
    racket.position.set(0.75, 1.8, 0.2);
    racket.material = racketMat;
    racket.parent = root;
    applyAnimeInkOutlineToMesh(racket, 0.03);
    shadowGen?.addShadowCaster(racket);
    propMesh = racket;
  } else if (propType === 'golf_club') {
    const clubMat = new StandardMaterial(`${name}_clubMat`, scene);
    clubMat.diffuseColor = new Color3(0.75, 0.78, 0.85);

    const club = MeshBuilder.CreateCylinder(`${name}_club`, { height: 1.1, diameter: 0.04 }, scene);
    club.position.set(0.65, 1.1, 0.3);
    club.rotation.z = -Math.PI / 6;
    club.material = clubMat;
    club.parent = root;
    applyAnimeInkOutlineToMesh(club, 0.025);
    shadowGen?.addShadowCaster(club);
    propMesh = club;
  }

  return { root, head, torso, leftArm, rightArm, leftLeg, rightLeg, basketball, propMesh };
}

/**
 * Helper to pose the segmented humanoid into a reverse two-hand slam silhouette.
 * Modifies the exposed compound limbs and underlying segmented meshes.
 */
export function poseReverseTwoHandSlam(
  athlete: ReturnType<typeof createProceduralAthlete>,
  scene: Scene,
  intensity = 1.0
) {
  const { root, rightArm, leftArm, rightLeg, leftLeg } = athlete;
  if (!root || !scene) return;
  const rightThigh = scene.getMeshByName(`${root.name.replace('_root', '')}_rightThigh`) as Mesh | null;
  const rightShin = scene.getMeshByName(`${root.name.replace('_root', '')}_rightShin`) as Mesh | null;
  const leftThigh = scene.getMeshByName(`${root.name.replace('_root', '')}_leftThigh`) as Mesh | null;
  const leftShin = scene.getMeshByName(`${root.name.replace('_root', '')}_leftShin`) as Mesh | null;
  const rightUpperArm = scene.getMeshByName(`${root.name.replace('_root', '')}_rightUpperArm`) as Mesh | null;
  const rightForearm = scene.getMeshByName(`${root.name.replace('_root', '')}_rightForearm`) as Mesh | null;
  const leftUpperArm = scene.getMeshByName(`${root.name.replace('_root', '')}_leftUpperArm`) as Mesh | null;
  const leftForearm = scene.getMeshByName(`${root.name.replace('_root', '')}_leftForearm`) as Mesh | null;

  // Bring knees up
  rightLeg.rotation.x = -1.1 * intensity;
  leftLeg.rotation.x = -0.9 * intensity;
  if (rightThigh) rightThigh.rotation.x = -1.0 * intensity;
  if (leftThigh) leftThigh.rotation.x = -0.85 * intensity;
  if (rightShin) rightShin.rotation.x = 1.4 * intensity;
  if (leftShin) leftShin.rotation.x = 1.25 * intensity;

  // Arms extended upward/back for reverse slam
  rightArm.rotation.x = -Math.PI * 0.95 * intensity;
  leftArm.rotation.x = -Math.PI * 0.85 * intensity;
  if (rightUpperArm) rightUpperArm.rotation.x = -Math.PI * 0.75 * intensity;
  if (leftUpperArm) leftUpperArm.rotation.x = -Math.PI * 0.7 * intensity;
  if (rightForearm) rightForearm.rotation.x = -Math.PI * 0.35 * intensity;
  if (leftForearm) leftForearm.rotation.x = -Math.PI * 0.3 * intensity;
}

