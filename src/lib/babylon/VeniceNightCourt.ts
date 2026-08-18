/**
 * Venice Beach night court — sky, water, occluding fence, crowd, rim in light.
 * Water is a displaced/fresnel ocean, not a tinted ground plane.
 */

import {
  Scene,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  Mesh,
  ShadowGenerator,
  ShaderMaterial,
  Effect,
  DynamicTexture,
  SpotLight,
  PointLight,
  Texture,
  TransformNode,
} from '@babylonjs/core';
import { createMixamoAthlete, MixamoAthlete, CrowdReact } from './MixamoAthlete';

export interface VeniceNightCourt {
  rim: Mesh;
  backboard: Mesh;
  hoopRestY: number;
  waterMat: ShaderMaterial | StandardMaterial;
  skyMat: ShaderMaterial | StandardMaterial;
  rimSpot: SpotLight;
  crowd: MixamoAthlete[];
  reactCrowd: (kind: CrowdReact, intensity?: number) => void;
  tick: (timeSec: number) => void;
}

function registerVeniceShaders(): void {
  if (!Effect.ShadersStore['veniceSkyVertexShader']) {
    Effect.ShadersStore['veniceSkyVertexShader'] = `
      precision highp float;
      attribute vec3 position;
      attribute vec3 normal;
      uniform mat4 worldViewProjection;
      uniform mat4 world;
      varying vec3 vWorld;
      void main(void) {
        vec4 wp = world * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = worldViewProjection * vec4(position, 1.0);
      }
    `;
    Effect.ShadersStore['veniceSkyFragmentShader'] = `
      precision highp float;
      varying vec3 vWorld;
      uniform float time;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      void main(void) {
        vec3 dir = normalize(vWorld);
        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 zenith = vec3(0.02, 0.04, 0.10);
        vec3 mid = vec3(0.05, 0.07, 0.16);
        vec3 horizon = vec3(0.42, 0.22, 0.18);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.42, h));
        col = mix(col, zenith, smoothstep(0.38, 0.95, h));
        float stars = step(0.997, hash(dir.xz * 180.0 + floor(dir.y * 40.0)));
        float twinkle = 0.65 + 0.35 * sin(time * 3.0 + hash(dir.xz) * 20.0);
        col += vec3(0.85, 0.9, 1.0) * stars * twinkle * smoothstep(0.35, 0.8, h);
        vec3 moonDir = normalize(vec3(-0.35, 0.42, 0.55));
        float moon = smoothstep(0.018, 0.004, acos(clamp(dot(dir, moonDir), -1.0, 1.0)));
        col += vec3(0.85, 0.88, 0.78) * moon;
        col += vec3(0.15, 0.08, 0.04) * pow(1.0 - h, 4.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `;
  }

  if (!Effect.ShadersStore['veniceWaterVertexShader']) {
    Effect.ShadersStore['veniceWaterVertexShader'] = `
      precision highp float;
      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;
      uniform mat4 worldViewProjection;
      uniform mat4 world;
      uniform float time;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying vec2 vUV;
      void main(void) {
        float w1 = sin(position.x * 0.11 + time * 1.15) * 0.16;
        float w2 = cos(position.z * 0.09 + time * 0.82) * 0.12;
        float w3 = sin((position.x + position.z) * 0.18 + time * 1.6) * 0.05;
        vec3 displaced = position + vec3(0.0, w1 + w2 + w3, 0.0);
        vec4 wp = world * vec4(displaced, 1.0);
        vWorld = wp.xyz;
        vNormal = normalize((world * vec4(normal, 0.0)).xyz);
        vUV = uv;
        gl_Position = worldViewProjection * vec4(displaced, 1.0);
      }
    `;
    Effect.ShadersStore['veniceWaterFragmentShader'] = `
      precision highp float;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying vec2 vUV;
      uniform float time;
      uniform vec3 cameraPosition;
      void main(void) {
        vec3 n = normalize(vNormal + vec3(
          sin(vWorld.x * 0.35 + time) * 0.12,
          0.0,
          cos(vWorld.z * 0.3 + time * 0.8) * 0.12
        ));
        vec3 view = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 3.0);
        vec3 deep = vec3(0.01, 0.05, 0.10);
        vec3 shallow = vec3(0.04, 0.16, 0.22);
        vec3 specCol = vec3(0.75, 0.72, 0.62);
        vec3 col = mix(deep, shallow, fres);
        vec3 moon = normalize(vec3(-0.4, 0.55, 0.5));
        float spec = pow(max(0.0, dot(reflect(-moon, n), view)), 48.0);
        col += specCol * spec * 0.85;
        float foam = smoothstep(0.12, 0.18, sin(vWorld.x * 0.4 + time * 2.0) * 0.5 + 0.5);
        col += vec3(0.08, 0.12, 0.14) * foam * 0.15;
        gl_FragColor = vec4(col, 1.0);
      }
    `;
  }
}

function makeChainLinkTexture(scene: Scene, size = 256): DynamicTexture {
  const tex = new DynamicTexture('veniceFenceTex', { width: size, height: size }, scene, false);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(188, 190, 196, 1)';
  ctx.lineWidth = 3;
  const step = 22;
  for (let i = -size; i < size * 2; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + size, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
  tex.hasAlpha = true;
  tex.update();
  return tex;
}

export async function buildVeniceNightCourt(
  scene: Scene,
  shadowGen: ShadowGenerator | undefined,
  hoopPosition: Vector3,
  options?: { spectators?: boolean; previewSafe?: boolean }
): Promise<VeniceNightCourt> {
  scene.clearColor = new Color4(0.03, 0.05, 0.09, 1.0);
  const previewSafe = !!options?.previewSafe;
  if (!previewSafe) {
    registerVeniceShaders();
  }

  const sky = MeshBuilder.CreateSphere(
    'venice_sky',
    { diameter: 180, segments: previewSafe ? 10 : 24, sideOrientation: Mesh.BACKSIDE },
    scene
  );
  let skyMat: ShaderMaterial | StandardMaterial;
  if (previewSafe) {
    const cheapSky = new StandardMaterial('veniceSkyMat', scene);
    cheapSky.diffuseColor = new Color3(0.04, 0.06, 0.12);
    cheapSky.emissiveColor = new Color3(0.03, 0.04, 0.09);
    cheapSky.disableLighting = true;
    cheapSky.backFaceCulling = false;
    sky.material = cheapSky;
    skyMat = cheapSky;
  } else {
    skyMat = new ShaderMaterial('veniceSkyMat', scene, 'veniceSky', {
      attributes: ['position', 'normal'],
      uniforms: ['worldViewProjection', 'world', 'time'],
    });
    sky.material = skyMat;
  }
  sky.infiniteDistance = !previewSafe;
  sky.applyFog = false;
  sky.isPickable = false;

  const water = MeshBuilder.CreateGround(
    'venice_ocean',
    { width: 160, height: 110, subdivisions: previewSafe ? 4 : 48 },
    scene
  );
  water.position.set(0, -0.55, 48);
  let waterMat: ShaderMaterial | StandardMaterial;
  if (previewSafe) {
    const cheapWater = new StandardMaterial('veniceWaterMat', scene);
    cheapWater.diffuseColor = new Color3(0.03, 0.1, 0.14);
    cheapWater.specularColor = new Color3(0.12, 0.12, 0.1);
    water.material = cheapWater;
    waterMat = cheapWater;
  } else {
    waterMat = new ShaderMaterial('veniceWaterMat', scene, 'veniceWater', {
      attributes: ['position', 'normal', 'uv'],
      uniforms: ['worldViewProjection', 'world', 'time', 'cameraPosition'],
    });
    water.material = waterMat;
  }
  water.isPickable = false;

  const sand = MeshBuilder.CreateGround(
    'venice_sand',
    { width: 48, height: 36, subdivisions: previewSafe ? 1 : 8 },
    scene
  );
  const sandMat = new StandardMaterial('veniceSandMat', scene);
  sandMat.diffuseColor = new Color3(0.18, 0.16, 0.12);
  sandMat.specularColor = new Color3(0.04, 0.04, 0.03);
  sand.material = sandMat;
  sand.position.set(0, -0.06, -2);
  sand.receiveShadows = !!shadowGen;
  sand.isPickable = false;

  const court = MeshBuilder.CreateGround('venice_court', { width: 15.2, height: 28, subdivisions: 4 }, scene);
  const courtMat = new StandardMaterial('veniceCourtMat', scene);
  courtMat.diffuseColor = new Color3(0.16, 0.32, 0.5);
  courtMat.specularColor = new Color3(0.18, 0.18, 0.2);
  court.material = courtMat;
  court.receiveShadows = !!shadowGen;
  court.isPickable = false;

  const keyPaint = MeshBuilder.CreateGround('venice_key', { width: 4.9, height: 5.8 }, scene);
  const keyMat = new StandardMaterial('veniceKeyMat', scene);
  keyMat.diffuseColor = new Color3(0.12, 0.24, 0.4);
  keyPaint.material = keyMat;
  keyPaint.position.set(0, 0.004, 5.0);

  const post = MeshBuilder.CreateCylinder(
    'venice_post',
    { height: 3.8, diameter: 0.16, tessellation: previewSafe ? 6 : 10 },
    scene
  );
  post.position.set(0, 1.9, 6.25);
  const postMat = new StandardMaterial('venicePostMat', scene);
  postMat.diffuseColor = new Color3(0.2, 0.2, 0.24);
  post.material = postMat;
  post.isPickable = false;
  shadowGen?.addShadowCaster(post);

  const backboard = MeshBuilder.CreateBox('venice_backboard', { width: 1.8, height: 1.05, depth: 0.08 }, scene);
  backboard.position.set(0, 3.4, 5.85);
  const boardMat = new StandardMaterial('veniceBoardMat', scene);
  boardMat.diffuseColor = new Color3(0.92, 0.93, 1.0);
  boardMat.alpha = 0.9;
  boardMat.specularColor = new Color3(0.6, 0.6, 0.7);
  backboard.material = boardMat;
  backboard.isPickable = false;
  shadowGen?.addShadowCaster(backboard);

  const rim = MeshBuilder.CreateTorus(
    'venice_rim',
    { diameter: 0.55, thickness: 0.05, tessellation: previewSafe ? 12 : 28 },
    scene
  );
  rim.position.copyFrom(hoopPosition);
  rim.rotation.x = Math.PI / 2;
  const rimMat = new StandardMaterial('veniceRimMat', scene);
  rimMat.diffuseColor = new Color3(1.0, 0.38, 0.0);
  rimMat.emissiveColor = new Color3(0.55, 0.2, 0.02);
  rim.material = rimMat;
  rim.isPickable = false;
  shadowGen?.addShadowCaster(rim);

  const rimSpot = new SpotLight(
    'veniceRimSpot',
    new Vector3(0, 7.2, 4.2),
    new Vector3(0, -1, 0.22),
    Math.PI / 3.2,
    12,
    scene
  );
  rimSpot.diffuse = new Color3(1.0, 0.86, 0.62);
  rimSpot.intensity = previewSafe ? 0 : 2.4;
  rimSpot.setEnabled(!previewSafe);

  if (!previewSafe) {
    const rimPoint = new PointLight('veniceRimPoint', hoopPosition.add(new Vector3(0, 0.15, 0)), scene);
    rimPoint.diffuse = new Color3(1.0, 0.55, 0.2);
    rimPoint.intensity = 1.6;
    rimPoint.range = 8;
  }

  const fenceMat = new StandardMaterial('veniceFenceMat', scene);
  fenceMat.backFaceCulling = false;
  fenceMat.diffuseColor = new Color3(0.55, 0.56, 0.58);
  fenceMat.specularColor = new Color3(0.25, 0.25, 0.28);
  if (!previewSafe) {
    const fenceTex = makeChainLinkTexture(scene);
    fenceMat.diffuseTexture = fenceTex;
    fenceMat.opacityTexture = fenceTex;
    fenceMat.useAlphaFromDiffuseTexture = true;
    fenceMat.transparencyMode = StandardMaterial.MATERIAL_ALPHATEST;
    fenceMat.alphaCutOff = 0.45;
    fenceTex.wrapU = Texture.WRAP_ADDRESSMODE;
    fenceTex.wrapV = Texture.WRAP_ADDRESSMODE;
    fenceTex.uScale = 6;
    fenceTex.vScale = 2;
  }

  const placeFence = (id: string, w: number, h: number, pos: Vector3, rotY: number) => {
    const plane = MeshBuilder.CreatePlane(id, { width: w, height: h }, scene);
    plane.position.copyFrom(pos);
    plane.rotation.y = rotY;
    plane.material = fenceMat;
    plane.isPickable = false;
    const postL = MeshBuilder.CreateCylinder(`${id}_postL`, { height: h + 0.2, diameter: 0.08, tessellation: 6 }, scene);
    postL.position.set(pos.x + Math.cos(rotY) * (w * 0.5), h * 0.5, pos.z + Math.sin(rotY) * (w * 0.5));
    const postR = MeshBuilder.CreateCylinder(`${id}_postR`, { height: h + 0.2, diameter: 0.08, tessellation: 6 }, scene);
    postR.position.set(pos.x - Math.cos(rotY) * (w * 0.5), h * 0.5, pos.z - Math.sin(rotY) * (w * 0.5));
    const steel = new StandardMaterial(`${id}_steel`, scene);
    steel.diffuseColor = new Color3(0.16, 0.16, 0.18);
    postL.material = steel;
    postR.material = steel;
    postL.isPickable = false;
    postR.isPickable = false;
    return plane;
  };

  placeFence('fence_l', 28, 3.1, new Vector3(-7.7, 1.55, 1.5), Math.PI / 2);
  placeFence('fence_r', 28, 3.1, new Vector3(7.7, 1.55, 1.5), -Math.PI / 2);
  placeFence('fence_boardwalk', 16, 3.1, new Vector3(0, 1.55, -13.4), 0);

  const bleacherMat = new StandardMaterial('veniceBleacherMat', scene);
  bleacherMat.diffuseColor = new Color3(0.14, 0.14, 0.16);
  const bleacherRoot = new TransformNode('venice_bleachers', scene);
  for (let row = 0; row < 4; row++) {
    const bench = MeshBuilder.CreateBox(`bleacher_row_${row}`, { width: 16, height: 0.14, depth: 0.55 }, scene);
    bench.position.set(0, 0.25 + row * 0.38, -15.2 - row * 0.62);
    bench.material = bleacherMat;
    bench.parent = bleacherRoot;
    bench.receiveShadows = !!shadowGen;
    bench.isPickable = false;
  }

  const crowd: MixamoAthlete[] = [];
  const seats = [
    { x: -5.2, z: -15.3, y: 0.55 },
    { x: -2.4, z: -15.9, y: 0.9 },
    { x: 0.2, z: -15.3, y: 0.55 },
    { x: 2.8, z: -16.4, y: 1.25 },
    { x: 5.1, z: -15.3, y: 0.55 },
    { x: -4.0, z: -16.5, y: 1.25 },
    { x: 1.5, z: -15.9, y: 0.9 },
    { x: -1.1, z: -16.5, y: 1.25 },
  ];

  if (options?.spectators !== false) {
    for (let i = 0; i < seats.length; i++) {
      try {
        const spectator = await createMixamoAthlete(scene, `crowd_${i}`, shadowGen, {
          seated: true,
          dunkBvh: '',
          tint: new Color3(0.15 + (i % 3) * 0.08, 0.12, 0.18 + (i % 2) * 0.1),
        });
        spectator.root.position.set(seats[i].x, seats[i].y, seats[i].z);
        spectator.root.rotation.y = Math.PI;
        spectator.poseSit();
        crowd.push(spectator);
      } catch {
        // Crowd is best-effort if the Mixamo container cannot instance again.
      }
    }
  }

  const reactCrowd = (kind: CrowdReact, intensity = 1) => {
    for (const spectator of crowd) {
      spectator.poseReact(kind, intensity);
    }
  };

  if (previewSafe) {
    for (const mesh of scene.meshes) {
      if (mesh.name.startsWith('venice_sky') || mesh.name.startsWith('venice_ocean') || mesh.name === 'venice_rim') {
        continue;
      }
      if (!mesh.name.startsWith('venice_') && !mesh.name.startsWith('fence_') && !mesh.name.startsWith('bleacher_')) {
        continue;
      }
      mesh.doNotSyncBoundingInfo = true;
      mesh.freezeWorldMatrix();
    }
  }

  const tick = (timeSec: number) => {
    if (previewSafe) return;
    if (skyMat instanceof ShaderMaterial) {
      skyMat.setFloat('time', timeSec);
    }
    if (waterMat instanceof ShaderMaterial) {
      waterMat.setFloat('time', timeSec);
      const cam = scene.activeCamera;
      if (cam) {
        waterMat.setVector3('cameraPosition', cam.position);
      }
    }
  };

  return {
    rim,
    backboard,
    hoopRestY: hoopPosition.y,
    waterMat,
    skyMat,
    rimSpot,
    crowd,
    reactCrowd,
    tick,
  };
}
