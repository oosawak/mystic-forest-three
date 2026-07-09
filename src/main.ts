import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');

if (!canvas) {
  throw new Error('Canvas element was not found.');
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas,
  powerPreference: 'high-performance',
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x081831, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b2138, 0.026);

const camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100);
camera.position.set(12, 10.5, 12);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minZoom = 0.75;
controls.maxZoom = 1.55;
controls.target.set(0, 0.6, 0);

const textureLoader = new THREE.TextureLoader();
const publicAssetUrl = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
function pseudoRandom(value: number): number {
  const raw = Math.sin(value * 12.9898) * 43758.5453123;
  return raw - Math.floor(raw);
}

function readMapSeed(): number {
  const params = new URLSearchParams(window.location.search);
  const rawSeed = params.get('seed');
  if (rawSeed !== null) {
    const parsed = Number(rawSeed);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }
  return Math.floor(Math.random() * 1_000_000_000);
}

const hasMapSeedQuery = new URLSearchParams(window.location.search).has('seed');
const isInitialMap = !hasMapSeedQuery;
type MapEntrySide = 'left' | 'right' | 'top' | 'bottom';
const mapSeed = readMapSeed();
const mapTerrainShiftX = pseudoRandom(mapSeed + 11.1) * 4 - 2;
const mapTerrainShiftZ = pseudoRandom(mapSeed + 22.2) * 4 - 2;
const mapTerrainPhase = pseudoRandom(mapSeed + 33.3) * Math.PI * 2;
const mapPathShiftX = pseudoRandom(mapSeed + 44.4) * 3 - 1.5;
const mapPathShiftZ = pseudoRandom(mapSeed + 55.5) * 3 - 1.5;
const mapPathPhase = pseudoRandom(mapSeed + 66.6) * Math.PI * 2;
const mapWaterShiftX = pseudoRandom(mapSeed + 77.7) * 3 - 1.5;
const mapWaterShiftZ = pseudoRandom(mapSeed + 88.8) * 3 - 1.5;
const mapBounds = {
  minX: -7.6,
  maxX: 7.6,
  minZ: -5.6,
  maxZ: 5.6,
};
function mapJitter(salt: number, amount: number): number {
  return (pseudoRandom(mapSeed + salt) - 0.5) * amount;
}

function readMapEntrySide(): MapEntrySide | null {
  const params = new URLSearchParams(window.location.search);
  const rawEntry = params.get('entry');
  if (rawEntry === 'left' || rawEntry === 'right' || rawEntry === 'top' || rawEntry === 'bottom') {
    return rawEntry;
  }
  return null;
}

function readMapLane(): number | null {
  const params = new URLSearchParams(window.location.search);
  const rawLane = params.get('lane');
  if (rawLane === null) return null;
  const parsed = Number(rawLane);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

const mapEntrySide = readMapEntrySide();
const mapLane = readMapLane();

function initialPlayerSpawn(): { position: THREE.Vector3; facingWorld: THREE.Vector3 } {
  if (isInitialMap) {
    return {
      position: new THREE.Vector3(0.65, 0, 1.1),
      facingWorld: new THREE.Vector3(0, 0, 1),
    };
  }

  const inset = 0.82;
  const lane = mapLane ?? (pseudoRandom(mapSeed + 901.1) * 6 - 3);
  switch (mapEntrySide) {
    case 'left':
      return {
        position: new THREE.Vector3(mapBounds.minX + inset, 0, THREE.MathUtils.clamp(lane, mapBounds.minZ + 0.9, mapBounds.maxZ - 0.9)),
        facingWorld: new THREE.Vector3(1, 0, 0),
      };
    case 'right':
      return {
        position: new THREE.Vector3(mapBounds.maxX - inset, 0, THREE.MathUtils.clamp(lane, mapBounds.minZ + 0.9, mapBounds.maxZ - 0.9)),
        facingWorld: new THREE.Vector3(-1, 0, 0),
      };
    case 'top':
      return {
        position: new THREE.Vector3(THREE.MathUtils.clamp(lane, mapBounds.minX + 1.1, mapBounds.maxX - 1.1), 0, mapBounds.minZ + inset),
        facingWorld: new THREE.Vector3(0, 0, 1),
      };
    case 'bottom':
      return {
        position: new THREE.Vector3(THREE.MathUtils.clamp(lane, mapBounds.minX + 1.1, mapBounds.maxX - 1.1), 0, mapBounds.maxZ - inset),
        facingWorld: new THREE.Vector3(0, 0, -1),
      };
    default:
      return {
        position: new THREE.Vector3(0.65, 0, 1.1),
        facingWorld: new THREE.Vector3(0, 0, 1),
      };
  }
}

const atlasUrl = publicAssetUrl('textures/mystic-forest-atlas.png');
const crystalAtlasUrl = publicAssetUrl('textures/crystal-emissive-atlas.png');
const mushroomCapUrl = publicAssetUrl('textures/mushroom-cap-pink-v2.png');
const playerWeaponUrl = publicAssetUrl('sprites/player_weapon.png');
const swordsmanWeaponUrl = publicAssetUrl('sprites/sordsman_weapon.png');

function atlasTile(column: number, row: number): THREE.Texture {
  const texture = textureLoader.load(atlasUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1 / 3, 1 / 3);
  texture.offset.set(column / 3, (2 - row) / 3);
  return texture;
}

function crystalTile(column: 0 | 1): THREE.Texture {
  const texture = textureLoader.load(crystalAtlasUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  texture.repeat.set(1 / 2, 1);
  texture.offset.set(column / 2, 0);
  return texture;
}

function materialTexture(url: string): THREE.Texture {
  const texture = textureLoader.load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function loadChromaKeyTexture(
  url: string,
  keyRgb: [number, number, number],
  tolerance = 140,
  flipX = false,
): THREE.Texture | null {
  const image = new Image();
  image.src = url;

  const texture = new THREE.Texture();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.wrapS = flipX ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  if (flipX) {
    texture.repeat.x = -1;
    texture.offset.x = 1;
  }

  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - keyRgb[0];
      const dg = data[i + 1] - keyRgb[1];
      const db = data[i + 2] - keyRgb[2];
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      if (distance < tolerance) {
        data[i + 3] = 0;
      }
    }

    context.putImageData(imageData, 0, 0);
    texture.image = canvas;
    texture.needsUpdate = true;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  };

  image.onerror = () => {
    texture.dispose();
  };

  return texture;
}

const textures = {
  grass: atlasTile(0, 0),
  dirt: atlasTile(1, 0),
  rock: atlasTile(2, 0),
  bark: atlasTile(0, 1),
  pine: atlasTile(1, 1),
  cyanCrystal: crystalTile(0),
  purpleCrystal: crystalTile(1),
  water: atlasTile(1, 2),
  stone: atlasTile(2, 2),
  mushroomCap: materialTexture(mushroomCapUrl),
};

const weaponTextures = {
  player: loadChromaKeyTexture(playerWeaponUrl, [245, 120, 8]),
  swordsman: loadChromaKeyTexture(swordsmanWeaponUrl, [245, 120, 8]),
};

type PlayerDirection = 'down' | 'down-left' | 'left' | 'up-left' | 'up' | 'up-right' | 'right' | 'down-right';
const playerWalkColumns = 2;
const playerWalkRows = 2;
const playerWalkFrameCount = playerWalkColumns * playerWalkRows;
const playerWalkFramesPerSecond = 8;
type CompanionRole = 'thief' | 'swordsman' | 'wizard';
type CompanionRenderVariant = {
  row: number;
  flipX: 1 | -1;
};
const companionWalkColumns = 4;
const companionWalkRows = 4;
const companionWalkFrameCount = companionWalkColumns;
const companionSpriteWidth = 0.78;
const companionSpriteHeight = 1.16;
const companionFramePixelHeight = 96;
const companionFrameBottomPaddingPixels = 6;
const companionFootPaddingWorld = (companionFrameBottomPaddingPixels / companionFramePixelHeight) * companionSpriteHeight;
const companionWalkFramesPerSecond = 8;
const companionIdleFrame = 1;

function playerWalkTexture(direction: PlayerDirection): THREE.Texture {
  const texture = textureLoader.load(publicAssetUrl(`sprites/player-walk-${direction}/sheet-transparent.png`));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1 / playerWalkColumns, 1 / playerWalkRows);
  return texture;
}

function companionWalkTexture(role: CompanionRole): THREE.Texture {
  const texture = textureLoader.load(publicAssetUrl(`sprites/companions/${role}/sheet-transparent.png`));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1 / companionWalkColumns, 1 / companionWalkRows);
  return texture;
}

const playerWalkTextures: Record<PlayerDirection, THREE.Texture> = {
  down: playerWalkTexture('down'),
  'down-left': playerWalkTexture('down-left'),
  left: playerWalkTexture('left'),
  'up-left': playerWalkTexture('up-left'),
  up: playerWalkTexture('up'),
  'up-right': playerWalkTexture('up-right'),
  right: playerWalkTexture('right'),
  'down-right': playerWalkTexture('down-right'),
};

const companionWalkTextures: Record<CompanionRole, THREE.Texture> = {
  thief: companionWalkTexture('thief'),
  swordsman: companionWalkTexture('swordsman'),
  wizard: companionWalkTexture('wizard'),
};

const materials = {
  grass: new THREE.MeshStandardMaterial({
    color: 0x8bc46a,
    map: textures.grass,
    roughness: 0.88,
  }),
  dirt: new THREE.MeshStandardMaterial({
    color: 0xb28d67,
    map: textures.dirt,
    roughness: 0.92,
  }),
  rock: new THREE.MeshStandardMaterial({
    color: 0x5d7382,
    map: textures.rock,
    roughness: 0.94,
  }),
  bark: new THREE.MeshStandardMaterial({
    color: 0x684032,
    map: textures.bark,
    roughness: 0.9,
  }),
  pine: new THREE.MeshStandardMaterial({
    color: 0x2d8a62,
    map: textures.pine,
    roughness: 0.86,
  }),
  water: new THREE.MeshStandardMaterial({
    color: 0x32b8d8,
    map: textures.water,
    transparent: true,
    opacity: 0.76,
    emissive: 0x0e6f8f,
    emissiveIntensity: 0.42,
    roughness: 0.36,
    metalness: 0.04,
  }),
  stone: new THREE.MeshStandardMaterial({
    color: 0x9ba9a6,
    map: textures.stone,
    roughness: 0.88,
  }),
  cyanCrystal: new THREE.MeshStandardMaterial({
    color: 0x5feaff,
    map: textures.cyanCrystal,
    emissiveMap: textures.cyanCrystal,
    emissive: 0x0fbfe8,
    emissiveIntensity: 1.35,
    roughness: 0.22,
    metalness: 0.08,
  }),
  purpleCrystal: new THREE.MeshStandardMaterial({
    color: 0xc35cff,
    map: textures.purpleCrystal,
    emissiveMap: textures.purpleCrystal,
    emissive: 0x8e32ff,
    emissiveIntensity: 1.55,
    roughness: 0.22,
    metalness: 0.08,
  }),
  flower: new THREE.MeshStandardMaterial({
    color: 0xff8ec2,
    map: textures.mushroomCap,
    emissiveMap: textures.mushroomCap,
    emissive: 0x7a1f4b,
    emissiveIntensity: 0.22,
    roughness: 0.68,
  }),
  shadow: new THREE.MeshBasicMaterial({
    color: 0x06101c,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  }),
};

const terrainGroup = new THREE.Group();
const propGroup = new THREE.Group();
const glowGroup = new THREE.Group();
const attackEffectGroup = new THREE.Group();
const enemyGroup = new THREE.Group();
const damagePopupGroup = new THREE.Group();
const companionGroup = new THREE.Group();
const playerGroup = new THREE.Group();
scene.add(terrainGroup, propGroup, glowGroup, attackEffectGroup, enemyGroup, damagePopupGroup, companionGroup, playerGroup);

const hemiLight = new THREE.HemisphereLight(0xb7f5ff, 0x213412, 3.2);
scene.add(hemiLight);

const moon = new THREE.DirectionalLight(0xd5ecff, 5.2);
moon.position.set(-8, 14, 8);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -15;
moon.shadow.camera.right = 15;
moon.shadow.camera.top = 15;
moon.shadow.camera.bottom = -15;
scene.add(moon);

const fill = new THREE.DirectionalLight(0x9e7cff, 1.25);
fill.position.set(8, 8, -6);
scene.add(fill);

function addPointLight(color: THREE.ColorRepresentation, position: THREE.Vector3Tuple, intensity = 2.2, distance = 8): void {
  const light = new THREE.PointLight(color, intensity, distance, 2.2);
  light.position.set(...position);
  scene.add(light);
}

addPointLight(0x8f4dff, [0, 2.6, 0], 3.6, 10);
addPointLight(0x20dfff, [-5.5, 1.4, -2.8], 2.1, 8);
addPointLight(0x25e8ff, [5.6, 2.2, -4.2], 2.6, 8);
addPointLight(0xb246ff, [6.8, 2.2, 3.2], 2.2, 8);

const topGrass = [materials.rock, materials.rock, materials.grass, materials.rock, materials.rock, materials.rock];
const topDirt = [materials.rock, materials.rock, materials.dirt, materials.rock, materials.rock, materials.rock];
const topStone = [materials.rock, materials.rock, materials.stone, materials.rock, materials.rock, materials.rock];
const blockGeometry = new THREE.BoxGeometry(1, 1, 1);

function terrainHeight(x: number, z: number): number {
  const sx = x + mapTerrainShiftX;
  const sz = z + mapTerrainShiftZ;
  const edge = Math.max(Math.abs(sx) - 5.5, Math.abs(sz) - 4.7, 0);
  const ridge =
    0.35 * Math.sin(sx * 0.8 + mapTerrainPhase) +
    0.25 * Math.cos(sz * 0.9 - mapTerrainPhase * 0.7) +
    0.45 * Math.sin((sx + sz) * 0.42 + mapTerrainPhase * 1.3);
  const plateau = sx > 4 && sz < -1 ? 0.9 : 0;
  return THREE.MathUtils.clamp(0.65 + edge * 0.45 + ridge + plateau, 0.45, 2.8);
}

function isPath(x: number, z: number): boolean {
  const sx = x + mapPathShiftX;
  const sz = z + mapPathShiftZ;
  const winding = Math.abs(sz - Math.sin(sx * 0.7 + mapPathPhase) * 1.15 - sx * -0.18) < 0.78;
  const eastPath = Math.abs(sx - 5.2) < 0.7 && sz > -5.2 && sz < 2.5;
  const center = Math.hypot(sx, sz) < 2.4;
  return winding || eastPath || center;
}

function isWater(x: number, z: number): boolean {
  const sx = x + mapWaterShiftX;
  const sz = z + mapWaterShiftZ;
  const stream = Math.abs(sx + 4.2 + Math.sin(sz * 1.1 + mapPathPhase * 0.8) * 0.62) < 0.86 && sz > -6.3 && sz < 5.4;
  const pond = Math.hypot(sx + 5.1, sz + 0.6) < 1.6;
  return stream || pond;
}

function surfaceHeightAt(x: number, z: number): number {
  const tileX = Math.round(x);
  const tileZ = Math.round(z);
  return isWater(tileX, tileZ) ? 0.22 : terrainHeight(tileX, tileZ) - 0.5;
}

for (let x = -8; x <= 8; x += 1) {
  for (let z = -6; z <= 6; z += 1) {
    const water = isWater(x, z);
    const path = isPath(x, z);
    const height = water ? 0.35 : terrainHeight(x, z);
    const material = water ? topStone : path ? topDirt : Math.hypot(x, z) < 2.7 ? topStone : topGrass;
    const block = new THREE.Mesh(blockGeometry, material);
    block.position.set(x, height / 2 - 0.5, z);
    block.scale.set(1, height, 1);
    block.castShadow = true;
    block.receiveShadow = true;
    terrainGroup.add(block);

    if (water) {
      const waterMesh = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.08, 0.94), materials.water);
      waterMesh.position.set(x, 0.15, z);
      waterMesh.receiveShadow = true;
      terrainGroup.add(waterMesh);
    }
  }
}

function addShadowDisc(x: number, z: number, radius: number): void {
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 18), materials.shadow);
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(x, 0.03, z);
  propGroup.add(disc);
}

function addCrystal(x: number, z: number, color: 'cyan' | 'purple', scale = 1): void {
  const mat = color === 'cyan' ? materials.cyanCrystal : materials.purpleCrystal;
  const main = new THREE.Mesh(new THREE.OctahedronGeometry(0.42 * scale, 0), mat);
  main.scale.set(0.7, 1.75, 0.7);
  main.position.set(x, 0.9 * scale, z);
  main.castShadow = true;
  main.receiveShadow = true;
  propGroup.add(main);

  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2 + 0.3;
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 * scale, 0), mat);
    shard.scale.set(0.55, 1.15, 0.55);
    shard.position.set(x + Math.cos(angle) * 0.62 * scale, 0.34 * scale, z + Math.sin(angle) * 0.62 * scale);
    shard.rotation.y = angle;
    shard.castShadow = true;
    propGroup.add(shard);
  }

  addShadowDisc(x, z, 0.95 * scale);
}

function addPine(x: number, z: number, height = 1.8): void {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, height * 0.75, 5), materials.bark);
  trunk.position.set(x, height * 0.38, z);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  propGroup.add(trunk);

  for (let i = 0; i < 3; i += 1) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.85 - i * 0.15, 1.05, 5), materials.pine);
    cone.position.set(x, height * 0.75 + i * 0.48, z);
    cone.rotation.y = i * 0.62;
    cone.castShadow = true;
    cone.receiveShadow = true;
    propGroup.add(cone);
  }

  addShadowDisc(x, z, 0.85);
}

function addAncientTree(x: number, z: number, canopyColor = 0x347c4c): void {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.72, 2.1, 6), materials.bark);
  trunk.position.set(x, 1.0, z);
  trunk.rotation.z = -0.12;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  propGroup.add(trunk);

  const canopyMat = materials.pine.clone();
  canopyMat.color = new THREE.Color(canopyColor);
  const lumps: Array<[number, number, number, number]> = [
    [0, 2.35, 0, 1.18],
    [-0.75, 2.05, 0.1, 0.88],
    [0.68, 2.1, -0.18, 0.82],
    [0.1, 2.75, 0.08, 0.76],
  ];
  for (const [ox, oy, oz, s] of lumps) {
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), canopyMat);
    crown.position.set(x + ox, oy, z + oz);
    crown.rotation.set(0.2 + ox, 0.45 + oz, 0.1);
    crown.castShadow = true;
    crown.receiveShadow = true;
    propGroup.add(crown);
  }

  addShadowDisc(x, z, 1.45);
}

function addMushrooms(x: number, z: number): void {
  for (let i = 0; i < 5; i += 1) {
    const angle = i * 1.37;
    const radius = 0.22 + (i % 3) * 0.12;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.22, 5), materials.stone);
    stem.position.set(x + Math.cos(angle) * radius, 0.17, z + Math.sin(angle) * radius);
    propGroup.add(stem);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 6), materials.flower);
    cap.position.set(stem.position.x, 0.34, stem.position.z);
    cap.castShadow = true;
    propGroup.add(cap);
  }
}

function addLantern(x: number, z: number, color: THREE.ColorRepresentation): void {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.4, 6), materials.stone);
  base.position.set(x, 0.2, z);
  base.castShadow = true;
  propGroup.add(base);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.82, 6), materials.stone);
  post.position.set(x, 0.8, z);
  post.castShadow = true;
  propGroup.add(post);

  const flameMat = color === 0x34f7ff ? materials.cyanCrystal : materials.purpleCrystal;
  const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), flameMat);
  flame.scale.y = 1.35;
  flame.position.set(x, 1.34, z);
  propGroup.add(flame);
  addPointLight(color, [x, 1.35, z], 1.6, 5);
}

type SlimeEnemy = {
  root: THREE.Group;
  body: THREE.Mesh;
  face: THREE.Group;
  seed: number;
  roamPhase: number;
  roamSpeed: number;
  moveSpeed: number;
  homeX: number;
  homeZ: number;
  hp: number;
  maxHp: number;
  hitFlashUntil: number;
};

type DamagePopup = {
  root: THREE.Sprite;
  material: THREE.SpriteMaterial;
  texture: THREE.CanvasTexture;
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  startTime: number;
  duration: number;
};

const slimeEnemies: SlimeEnemy[] = [];
const damagePopups: DamagePopup[] = [];

function makeDamageTexture(text: string): { texture: THREE.CanvasTexture; material: THREE.SpriteMaterial } {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) {
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { texture, material };
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = 'bold 72px Trebuchet MS, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 12;
  context.strokeStyle = 'rgba(70, 8, 8, 0.95)';
  context.fillStyle = '#ff5c5c';
  context.strokeText(text, canvas.width / 2, canvas.height / 2);
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return { texture, material };
}

function spawnDamagePopup(position: THREE.Vector3, amount: number, elapsed: number): void {
  const basePosition = position.clone();
  basePosition.y += 1.22;
  const { texture, material } = makeDamageTexture(`-${amount}`);
  const root = new THREE.Sprite(material);
  root.position.copy(basePosition);
  root.scale.set(0.92, 0.46, 1);
  damagePopupGroup.add(root);
  damagePopups.push({
    root,
    material,
    texture,
    basePosition,
    velocity: new THREE.Vector3((pseudoRandom(elapsed * 17.1 + amount) - 0.5) * 0.18, 0.55, 0),
    startTime: elapsed,
    duration: 0.72,
  });
}

function removeDamagePopup(index: number): void {
  const popup = damagePopups[index];
  damagePopupGroup.remove(popup.root);
  popup.material.map = null;
  popup.material.dispose();
  popup.texture.dispose();
  damagePopups.splice(index, 1);
}

function removeSlime(index: number): void {
  const slime = slimeEnemies[index];
  slimeGroupCleanup(slime.root);
  slimeEnemies.splice(index, 1);
}

function clearDamagePopups(): void {
  for (let i = damagePopups.length - 1; i >= 0; i -= 1) {
    removeDamagePopup(i);
  }
}

function addSlime(x: number, z: number, seed: number): void {
  const root = new THREE.Group();
  root.position.set(x, surfaceHeightAt(x, z), z);
  enemyGroup.add(root);

  const bodyGeometry = new THREE.SphereGeometry(0.34, 10, 8);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x68e87f,
    transparent: true,
    opacity: 0.92,
    roughness: 0.72,
    metalness: 0.02,
    emissive: 0x1f6b28,
    emissiveIntensity: 0.25,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.scale.set(1.18, 0.82, 1.18);
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);

  const face = new THREE.Group();
  face.position.set(0, 0.06, 0.24);
  root.add(face);

  const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 6);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xf8fffb });
  const pupilGeometry = new THREE.SphereGeometry(0.018, 6, 4);
  const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x173217 });

  for (const eyeX of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(eyeX, 0.05, 0);
    face.add(eye);

    const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    pupil.position.set(eyeX, 0.045, 0.04);
    face.add(pupil);
  }

  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.015, 4, 8, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0x205c2b }),
  );
  mouth.rotation.x = Math.PI / 2;
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, -0.03, 0.08);
  face.add(mouth);

  slimeEnemies.push({
    root,
    body,
    face,
    seed,
    roamPhase: pseudoRandom(seed + 1.7) * Math.PI * 2,
    roamSpeed: 0.65 + pseudoRandom(seed + 2.1) * 0.45,
    moveSpeed: 0.45 + pseudoRandom(seed + 3.4) * 0.35,
    homeX: x,
    homeZ: z,
    hp: 2,
    maxHp: 2,
    hitFlashUntil: 0,
  });
}

function clearSlimes(): void {
  for (const slime of slimeEnemies) {
    slimeGroupCleanup(slime.root);
  }
  slimeEnemies.length = 0;
  clearDamagePopups();
}

function slimeGroupCleanup(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry.dispose();
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => material.dispose());
      } else {
        node.material.dispose();
      }
    }
  });
  enemyGroup.remove(root);
}

function spawnSlimes(): void {
  clearSlimes();
  const desiredCount = isInitialMap ? 4 : 6;
  for (let i = 0; i < desiredCount; i += 1) {
    const angle = pseudoRandom(mapSeed + 320 + i * 17.3) * Math.PI * 2;
    const radius = 3.4 + pseudoRandom(mapSeed + 340 + i * 9.1) * 3.4;
    const x = THREE.MathUtils.clamp(Math.cos(angle) * radius + mapJitter(360 + i, 0.8), mapBounds.minX + 1.0, mapBounds.maxX - 1.0);
    const z = THREE.MathUtils.clamp(Math.sin(angle) * radius + mapJitter(380 + i, 0.8), mapBounds.minZ + 1.0, mapBounds.maxZ - 1.0);
    if (isWater(Math.round(x), Math.round(z))) continue;
    if (Math.hypot(x, z) < 1.8) continue;
    addSlime(x, z, mapSeed + 400 + i * 13.7);
  }
}

function updateSlimes(delta: number, elapsed: number): void {
  const leader = partyMembers[0];
  const chaseRange = 4.8;

  for (const slime of slimeEnemies) {
    const dx = leader.position.x - slime.root.position.x;
    const dz = leader.position.z - slime.root.position.z;
    const distance = Math.hypot(dx, dz);
    const roamAngle = elapsed * slime.roamSpeed + slime.roamPhase;
    const wanderX = Math.cos(roamAngle * 0.9 + slime.seed * 0.01) * 0.42;
    const wanderZ = Math.sin(roamAngle * 1.2 + slime.seed * 0.013) * 0.42;
    let moveX = wanderX;
    let moveZ = wanderZ;

    if (distance < chaseRange && distance > 0.001) {
      moveX = (dx / distance) * slime.moveSpeed;
      moveZ = (dz / distance) * slime.moveSpeed;
    } else {
      const homeDx = slime.homeX - slime.root.position.x;
      const homeDz = slime.homeZ - slime.root.position.z;
      const homeDistance = Math.hypot(homeDx, homeDz);
      if (homeDistance > 1.2) {
        moveX += (homeDx / homeDistance) * 0.12;
        moveZ += (homeDz / homeDistance) * 0.12;
      }
    }

    const nextX = THREE.MathUtils.clamp(slime.root.position.x + moveX * delta, mapBounds.minX + 0.35, mapBounds.maxX - 0.35);
    const nextZ = THREE.MathUtils.clamp(slime.root.position.z + moveZ * delta, mapBounds.minZ + 0.35, mapBounds.maxZ - 0.35);
    slime.root.position.x = nextX;
    slime.root.position.z = nextZ;
    slime.root.position.y = surfaceHeightAt(nextX, nextZ) + 0.02 + Math.sin(elapsed * 5.5 + slime.seed) * 0.04;
    if (distance > 0.001) {
      slime.root.rotation.y = Math.atan2(dx, dz);
    }
    const squash = 1 + Math.sin(elapsed * 8 + slime.roamPhase) * 0.07;
    slime.face.position.y = 0.06 + Math.sin(elapsed * 9 + slime.seed) * 0.015;
    slime.face.rotation.y = Math.sin(elapsed * 2.2 + slime.roamPhase) * 0.14;
    slime.face.rotation.x = Math.sin(elapsed * 3.1 + slime.seed) * 0.08;
    if (slime.hitFlashUntil > elapsed) {
      const flash = Math.max((slime.hitFlashUntil - elapsed) * 6, 0);
      const bodyMaterial = slime.body.material as THREE.MeshStandardMaterial;
      bodyMaterial.emissiveIntensity = 0.25 + flash * 1.5;
      bodyMaterial.color.setHex(0xa4ffb1);
      slime.body.scale.set(
        (1.18 + squash * 0.05) * (1.03 + flash * 0.02),
        (0.82 - Math.sin(elapsed * 10 + slime.seed) * 0.03) * (1.03 + flash * 0.02),
        (1.18 + squash * 0.05) * (1.03 + flash * 0.02),
      );
    } else {
      const bodyMaterial = slime.body.material as THREE.MeshStandardMaterial;
      bodyMaterial.emissiveIntensity = 0.25;
      bodyMaterial.color.setHex(0x68e87f);
      slime.body.scale.set(
        1.18 + squash * 0.05,
        0.82 - Math.sin(elapsed * 10 + slime.seed) * 0.03,
        1.18 + squash * 0.05,
      );
    }
  }
}

function addBridge(): void {
  const plankMat = materials.bark;
  for (let i = 0; i < 5; i += 1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 1.6), plankMat);
    plank.position.set(-4.2 + i * 0.34, 0.55, 4.0);
    plank.rotation.y = 0.07;
    plank.castShadow = true;
    plank.receiveShadow = true;
    propGroup.add(plank);
  }

  for (const side of [-0.92, 0.92]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.12), plankMat);
    rail.position.set(-3.55, 0.92, 4.0 + side);
    rail.rotation.y = 0.07;
    rail.castShadow = true;
    propGroup.add(rail);
  }
}

function addStoneCircle(): void {
  for (let i = 0; i < 24; i += 1) {
    const radius = i % 2 === 0 ? 1.65 : 2.12;
    const angle = (i / 24) * Math.PI * 2;
    const tile = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.3), materials.stone);
    tile.position.set(Math.cos(angle) * radius, 0.18, Math.sin(angle) * radius);
    tile.rotation.y = -angle;
    tile.castShadow = true;
    tile.receiveShadow = true;
    propGroup.add(tile);
  }

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.08, 18), materials.stone);
  disc.position.set(0, 0.14, 0);
  disc.receiveShadow = true;
  propGroup.add(disc);
}

addStoneCircle();
if (isInitialMap) {
  addCrystal(0, 0, 'purple', 1.35);
}
addBridge();

const pines: Array<[number, number, number]> = [
  [-7.2, -5.0, 2.3],
  [-6.5, -2.4, 1.9],
  [-7.6, 1.1, 2.2],
  [-6.2, 4.5, 2.4],
  [-3.3, -5.4, 1.8],
  [2.2, -5.5, 1.85],
  [6.6, -5.2, 2.4],
  [7.3, -2.3, 1.95],
  [7.0, 1.3, 2.15],
  [6.4, 5.0, 2.35],
  [2.8, 5.3, 1.9],
  [-1.8, 5.1, 1.75],
];
pines.forEach(([x, z, h], index) => addPine(x + mapJitter(100 + index * 3, 0.9), z + mapJitter(101 + index * 3, 0.9), h));

addAncientTree(-5.7 + mapJitter(140, 0.8), -0.9 + mapJitter(141, 0.8), 0x2f7342);
addAncientTree(3.6 + mapJitter(142, 0.8), -2.7 + mapJitter(143, 0.8), 0x2e895f);
addAncientTree(6.3 + mapJitter(144, 0.8), 2.5 + mapJitter(145, 0.8), 0x7133a5);

const crystals: Array<[number, number, 'cyan' | 'purple', number]> = [
  [-6.7, 3.0, 'purple', 0.8],
  [-5.0, -3.2, 'cyan', 0.72],
  [-2.2, -2.2, 'cyan', 0.62],
  [3.2, -4.7, 'cyan', 0.66],
  [5.7, -3.1, 'cyan', 0.98],
  [6.8, 2.8, 'purple', 0.85],
  [-1.4, 4.2, 'purple', 0.7],
  [4.4, 1.4, 'cyan', 0.58],
];
crystals.forEach(([x, z, color, scale], index) => addCrystal(x + mapJitter(180 + index * 2, 0.9), z + mapJitter(181 + index * 2, 0.9), color, scale));

const mushroomPatches: Array<[number, number]> = [
  [-2.8, 1.6],
  [2.7, 1.2],
  [4.9, -0.6],
  [-6.1, 1.9],
  [5.3, 4.2],
  [-0.9, -4.6],
];
mushroomPatches.forEach(([x, z], index) => addMushrooms(x + mapJitter(220 + index * 2, 0.7), z + mapJitter(221 + index * 2, 0.7)));

addLantern(-1.8 + mapJitter(260, 0.5), 1.4 + mapJitter(261, 0.5), 0x34f7ff);
addLantern(2.0 + mapJitter(262, 0.5), -1.5 + mapJitter(263, 0.5), 0x34f7ff);
addLantern(4.4 + mapJitter(264, 0.5), -0.1 + mapJitter(265, 0.5), 0x9b50ff);
addLantern(-3.9 + mapJitter(266, 0.5), -2.3 + mapJitter(267, 0.5), 0x34f7ff);
spawnSlimes();

for (let i = 0; i < 56; i += 1) {
  const x = pseudoRandom(mapSeed * 0.001 + i * 13.1) * 15.8 - 7.9;
  const z = pseudoRandom(mapSeed * 0.001 + i * 29.7) * 11.4 - 5.7;
  if (isWater(Math.round(x), Math.round(z)) || Math.hypot(x, z) < 2.2) continue;
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + pseudoRandom(mapSeed * 0.002 + i) * 0.16, 0), materials.rock);
  stone.position.set(x, 0.28, z);
  stone.rotation.set(i * 0.2, i * 0.37, i * 0.13);
  stone.castShadow = true;
  stone.receiveShadow = true;
  propGroup.add(stone);
}

const starGeometry = new THREE.BufferGeometry();
const starCount = 180;
const positions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i += 1) {
  positions[i * 3] = pseudoRandom(mapSeed * 0.003 + i * 8.9) * 42 - 21;
  positions[i * 3 + 1] = pseudoRandom(mapSeed * 0.003 + i * 14.1) * 8 + 7;
  positions[i * 3 + 2] = pseudoRandom(mapSeed * 0.003 + i * 22.5) * 42 - 21;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const starMaterial = new THREE.PointsMaterial({
  color: 0x8defff,
  size: 0.035,
  transparent: true,
  opacity: 0.72,
  depthWrite: false,
});
glowGroup.add(new THREE.Points(starGeometry, starMaterial));

const playerSpriteWidth = 0.86;
const playerSpriteHeight = 1.32;
const playerFramePixelHeight = 128;
const playerFrameBottomPaddingPixels = 13.5;
const playerFootPaddingWorld = (playerFrameBottomPaddingPixels / playerFramePixelHeight) * playerSpriteHeight;
const playerMaterial = new THREE.MeshBasicMaterial({
  map: playerWalkTextures.down,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const playerSprite = new THREE.Mesh(new THREE.PlaneGeometry(playerSpriteWidth, playerSpriteHeight), playerMaterial);
playerSprite.position.y = playerSpriteHeight / 2 - playerFootPaddingWorld;
playerSprite.renderOrder = 10;
playerGroup.add(playerSprite);

const playerShadow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 18), materials.shadow.clone());
playerShadow.rotation.x = -Math.PI / 2;
playerGroup.add(playerShadow);

type PartyMemberBase = {
  position: THREE.Vector3;
  facingWorld: THREE.Vector3;
  material: THREE.MeshBasicMaterial;
  sprite: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  shadow: THREE.Mesh<THREE.CircleGeometry, THREE.Material>;
  currentFrame: number;
  currentRow: number;
  currentFlipX: 1 | -1;
};

type PlayerMember = PartyMemberBase & {
  kind: 'player';
};

type CompanionMember = PartyMemberBase & {
  kind: 'companion';
  role: CompanionRole;
  texture: THREE.Texture;
};

type PartyMember = PlayerMember | CompanionMember;

type TrailPoint = {
  position: THREE.Vector3;
  direction: PlayerDirection;
  distance: number;
};

const companionSpecs: Array<{ role: CompanionRole; spacing: number }> = [
  { role: 'thief', spacing: 0.78 },
  { role: 'swordsman', spacing: 1.56 },
  { role: 'wizard', spacing: 2.34 },
];
const partySpacing = [0, ...companionSpecs.map((spec) => spec.spacing)];
const playerSpawn = initialPlayerSpawn();

const player = {
  kind: 'player',
  position: playerSpawn.position,
  facingWorld: playerSpawn.facingWorld,
  material: playerMaterial,
  sprite: playerSprite,
  shadow: playerShadow,
  currentFrame: -1,
  currentRow: -1,
  currentFlipX: 1,
} satisfies PlayerMember;

let partyMembers: PartyMember[] = [player];

const pressedKeys = new Set<string>();
let currentPlayerDirection: PlayerDirection = 'down';
let currentPlayerTextureDirection: PlayerDirection = 'down';
let currentPlayerFlipX = 1;
let currentPlayerFrame = -1;

const partyTrail: TrailPoint[] = [];
let partyTrailDistance = 0;

const hud = document.createElement('div');
hud.className = 'party-hud';
hud.innerHTML = `
  <div class="party-hud__label">Front</div>
  <div class="party-hud__name"></div>
  <div class="party-hud__meta"></div>
  <div class="party-hud__hint">C key: leader switch / Space: attack</div>
  <button type="button" class="party-hud__button">次のマップ</button>
`;
document.body.appendChild(hud);

const controlsHud = document.createElement('div');
controlsHud.className = 'controls-hud';
controlsHud.innerHTML = `
  <div class="controls-hud__label">Controls</div>
  <div class="controls-hud__row"><span>WASD / Arrows</span><span>Move</span></div>
  <div class="controls-hud__row"><span>C</span><span>Switch leader</span></div>
  <div class="controls-hud__row"><span>Space</span><span>Attack</span></div>
`;
document.body.appendChild(controlsHud);

const hudName = hud.querySelector<HTMLElement>('.party-hud__name');
const hudMeta = hud.querySelector<HTMLElement>('.party-hud__meta');
const hudNextMapButton = hud.querySelector<HTMLButtonElement>('.party-hud__button');

function partyMemberDisplayName(member: PartyMember): string {
  if (member.kind === 'player') return '風魔導士';
  switch (member.role) {
    case 'thief':
      return '盗賊';
    case 'swordsman':
      return '土魔導士';
    case 'wizard':
      return '大魔法士';
  }
}

function updateHud(): void {
  if (!hudName || !hudMeta) return;
  const leader = partyMembers[0];
  hudName.textContent = partyMemberDisplayName(leader);
  hudMeta.textContent = `x ${leader.position.x.toFixed(2)} / z ${leader.position.z.toFixed(2)} / facing ${directionFromWorldFacing(leader.facingWorld)}`;
}

function oppositeEntrySide(side: MapEntrySide): MapEntrySide {
  switch (side) {
    case 'left':
      return 'right';
    case 'right':
      return 'left';
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
  }
}

function goToNextMap(entrySide?: MapEntrySide, lane?: number): void {
  const nextSeed = Math.floor(Math.random() * 1_000_000_000);
  const url = new URL(window.location.href);
  url.searchParams.set('seed', String(nextSeed));
  if (entrySide) {
    url.searchParams.set('entry', entrySide);
  } else {
    url.searchParams.delete('entry');
  }
  if (lane !== undefined) {
    url.searchParams.set('lane', String(lane.toFixed(3)));
  } else {
    url.searchParams.delete('lane');
  }
  window.location.href = url.toString();
}

function mapExitTransition(x: number, z: number): { entrySide: MapEntrySide; lane: number } | null {
  if (x < mapBounds.minX) return { entrySide: 'right', lane: z };
  if (x > mapBounds.maxX) return { entrySide: 'left', lane: z };
  if (z < mapBounds.minZ) return { entrySide: 'bottom', lane: x };
  if (z > mapBounds.maxZ) return { entrySide: 'top', lane: x };
  return null;
}

if (hudNextMapButton) {
  hudNextMapButton.addEventListener('click', () => {
    const leader = partyMembers[0];
    const entrySide = oppositeEntrySide(mapEntrySide ?? 'left');
    const lane = (entrySide === 'left' || entrySide === 'right') ? leader.position.z : leader.position.x;
    goToNextMap(entrySide, lane);
  });
}

function playerRenderVariant(direction: PlayerDirection): { textureDirection: PlayerDirection; flipX: 1 | -1 } {
  switch (direction) {
    case 'right':
      return { textureDirection: 'left', flipX: -1 };
    case 'up-right':
      return { textureDirection: 'up-left', flipX: -1 };
    case 'down-right':
      return { textureDirection: 'down-left', flipX: -1 };
    default:
      return { textureDirection: direction, flipX: 1 };
  }
}

function companionRenderVariant(direction: PlayerDirection): CompanionRenderVariant {
  switch (direction) {
    case 'up':
      return { row: 3, flipX: 1 };
    case 'up-left':
      return { row: 2, flipX: 1 };
    case 'up-right':
      return { row: 2, flipX: -1 };
    case 'left':
    case 'down-left':
      return { row: 1, flipX: 1 };
    case 'right':
    case 'down-right':
      return { row: 1, flipX: -1 };
    case 'down':
    default:
      return { row: 0, flipX: 1 };
  }
}

function createCompanion(role: CompanionRole): CompanionMember {
  const texture = companionWalkTextures[role];
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(companionSpriteWidth, companionSpriteHeight), material);
  sprite.renderOrder = 9;
  companionGroup.add(sprite);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.29, 18), materials.shadow.clone());
  shadow.rotation.x = -Math.PI / 2;
  companionGroup.add(shadow);

  return {
    kind: 'companion',
    role,
    position: player.position.clone(),
    facingWorld: player.facingWorld.clone(),
    material,
    sprite,
    shadow,
    texture,
    currentFrame: -1,
    currentRow: -1,
    currentFlipX: 1,
  };
}

const companions = companionSpecs.map((spec) => createCompanion(spec.role));
partyMembers = [player, ...companions];

function refreshPartyRenderOrder(): void {
  partyMembers.forEach((member, index) => {
    member.sprite.renderOrder = 10 - index * 0.1;
    member.shadow.renderOrder = 9 - index * 0.1;
  });
}

function setPlayerFrame(direction: PlayerDirection, frame: number): void {
  const { textureDirection, flipX } = playerRenderVariant(direction);

  if (direction !== currentPlayerDirection) {
    currentPlayerDirection = direction;
    currentPlayerFrame = -1;
  }

  if (textureDirection !== currentPlayerTextureDirection) {
    currentPlayerTextureDirection = textureDirection;
    player.material.map = playerWalkTextures[textureDirection];
    player.material.needsUpdate = true;
  }

  if (flipX !== currentPlayerFlipX) {
    currentPlayerFlipX = flipX;
    player.sprite.scale.x = flipX;
  }

  if (frame === currentPlayerFrame) return;
  currentPlayerFrame = frame;
  const col = frame % playerWalkColumns;
  const row = Math.floor(frame / playerWalkColumns);
  playerWalkTextures[textureDirection].offset.set(col / playerWalkColumns, (playerWalkRows - 1 - row) / playerWalkRows);
}

function setCompanionFrame(companion: CompanionMember, direction: PlayerDirection, frame: number): void {
  const { row, flipX } = companionRenderVariant(direction);

  if (flipX !== companion.currentFlipX) {
    companion.currentFlipX = flipX;
    companion.sprite.scale.x = flipX;
  }

  if (frame === companion.currentFrame && row === companion.currentRow) return;
  companion.currentFrame = frame;
  companion.currentRow = row;
  companion.texture.offset.set(frame / companionWalkColumns, (companionWalkRows - 1 - row) / companionWalkRows);
}

function setPartyMemberFrame(member: PartyMember, direction: PlayerDirection, frame: number): void {
  if (member.kind === 'player') {
    setPlayerFrame(direction, frame);
    return;
  }

  setCompanionFrame(member, direction, frame);
}

function frameForPartyMemberMotion(member: PartyMember, isWalking: boolean, elapsed: number, index: number): number {
  if (!isWalking) return member.kind === 'player' ? 0 : companionIdleFrame;
  if (member.kind === 'player') {
    return Math.floor((elapsed + index * 0.11) * playerWalkFramesPerSecond) % playerWalkFrameCount;
  }
  return Math.floor((elapsed + index * 0.11) * companionWalkFramesPerSecond) % companionWalkFrameCount;
}

function directionFromMemberFacing(member: PartyMember): PlayerDirection {
  return directionFromWorldFacing(member.facingWorld);
}

function updatePartyMemberPlacement(member: PartyMember): void {
  const groundY = surfaceHeightAt(member.position.x, member.position.z);
  member.position.y = groundY;
  if (member.kind === 'player') {
    member.sprite.position.set(member.position.x, groundY + playerSpriteHeight / 2 - playerFootPaddingWorld, member.position.z);
  } else {
    member.sprite.position.set(
      member.position.x,
      groundY + companionSpriteHeight / 2 - companionFootPaddingWorld,
      member.position.z,
    );
  }
  member.shadow.position.set(member.position.x, groundY + 0.025, member.position.z);
}

type AttackEffect = {
  root: THREE.Group;
  startTime: number;
  duration: number;
  update: (progress: number) => void;
  dispose: () => void;
  hitSlimes: Set<SlimeEnemy>;
  damageRadius: number;
  damage: number;
};

const attackEffects: AttackEffect[] = [];
const attackCooldownMs = 260;
let lastAttackAt = -attackCooldownMs;

type AttackStyle = 'player' | 'thief' | 'swordsman' | 'wizard';

function attackStyleForLeader(member: PartyMember): AttackStyle {
  if (member.kind === 'player') return 'player';
  return member.role;
}

function makeSlashAttackEffect(position: THREE.Vector3, facing: THREE.Vector3, elapsed: number, kind: 'player' | 'swordsman'): AttackEffect {
  const root = new THREE.Group();
  const groundY = surfaceHeightAt(position.x, position.z);
  root.position.set(position.x, groundY + 0.08, position.z);
  root.rotation.y = Math.atan2(facing.x, facing.z);
  const effectScale = 2 / 3;

  const isHeavy = kind === 'swordsman';
  const arcRadius = isHeavy ? 0.72 : 0.52;
  const arcTube = isHeavy ? 0.07 : 0.05;
  const arcSpan = isHeavy ? 1.35 * Math.PI : 1.05 * Math.PI;

  const arcGeometry = new THREE.TorusGeometry(arcRadius, arcTube, 10, 28, arcSpan);
  const arcMaterial = new THREE.MeshBasicMaterial({
    color: isHeavy ? 0xffc05c : 0xa5f7ff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const arc = new THREE.Mesh(arcGeometry, arcMaterial);
  arc.rotation.x = Math.PI / 2;
  arc.rotation.z = isHeavy ? -0.55 : -0.2;

  const weaponTexture = kind === 'player' ? weaponTextures.player : weaponTextures.swordsman;
  const weaponWidth = (isHeavy ? 1.15 : 0.72) * 0.5;
  const weaponHeight = (isHeavy ? 2.08 : 1.68) * 0.5;
  const weaponGeometry = new THREE.PlaneGeometry(weaponWidth, weaponHeight);
  weaponGeometry.translate(0, weaponHeight / 2, 0);
  const weaponMaterial = new THREE.MeshBasicMaterial({
    map: weaponTexture ?? null,
    transparent: true,
    color: 0xffffff,
    opacity: 1,
    blending: THREE.NormalBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const weaponPivot = new THREE.Group();
  weaponPivot.position.y = 0.02;
  root.add(weaponPivot);
  const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
  weapon.position.set((isHeavy ? 0.72 : 0.58) * 0.5, 0, 0);
  weapon.rotation.y = -Math.PI / 2;
  weaponPivot.add(weapon);

  const centerGeometry = new THREE.CircleGeometry(isHeavy ? 0.12 : 0.1, 18);
  const centerMaterial = new THREE.MeshBasicMaterial({
    color: isHeavy ? 0xfff0c8 : 0xe2ffff,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const centerFlash = new THREE.Mesh(centerGeometry, centerMaterial);
  centerFlash.rotation.x = -Math.PI / 2;
  root.add(centerFlash);

  const sparkGeometry = new THREE.BufferGeometry();
  const sparkPositions = new Float32Array([
    0.18, 0.08, 0,
    -0.12, 0.1, 0.1,
    0.02, 0.14, -0.16,
    0.14, 0.11, 0.16,
    -0.2, 0.06, -0.04,
  ]);
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  const sparkMaterial = new THREE.PointsMaterial({
    color: isHeavy ? 0xffd28f : 0xc8ffff,
    size: isHeavy ? 0.1 : 0.08,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
  root.add(arc);
  root.add(sparks);

  attackEffectGroup.add(root);

  return {
    root,
    startTime: elapsed,
    duration: isHeavy ? 0.44 : 0.32,
    hitSlimes: new Set<SlimeEnemy>(),
    damageRadius: isHeavy ? 1.0 : 0.8,
    damage: isHeavy ? 2 : 1,
    update: (progress: number) => {
      const pulse = progress < 0.5 ? progress / 0.5 : (1 - progress) / 0.5;
      root.scale.setScalar(((isHeavy ? 0.98 : 0.88) + progress * (isHeavy ? 2.0 : 2.4)) * effectScale);
      centerMaterial.opacity = 0.6 * (1 - progress * 0.85);
      arcMaterial.opacity = (isHeavy ? 0.98 : 0.92) * (1 - progress);
      weaponMaterial.opacity = 1 * (1 - progress * 0.84);
      sparkMaterial.opacity = 0.95 * (1 - progress);
      if (isHeavy) {
        const verticalLift = Math.sin(progress * Math.PI) * 0.56;
        root.position.y = groundY + 0.08 + verticalLift;
        arc.position.y = verticalLift * 0.72;
        centerFlash.position.y = verticalLift * 0.22;
        sparks.position.y = verticalLift * 0.72;
        arc.rotation.x = Math.PI / 2 + progress * Math.PI * 0.5;
        arc.rotation.z = 0;
        weaponPivot.rotation.x = 0;
        weaponPivot.rotation.y = 0;
      } else {
        root.position.y = groundY + 0.08;
        arc.position.y = 0;
        centerFlash.position.y = 0;
        sparks.position.y = 0;
        arc.rotation.x = Math.PI / 2;
        arc.rotation.z = -0.2 + progress * Math.PI * 1.2;
        weaponPivot.rotation.x = 0;
        weaponPivot.rotation.y = -progress * Math.PI * 2;
      }
      weapon.rotation.z = 0;
      weapon.position.x = (isHeavy ? 0.72 : 0.58) * 0.5;
      weapon.scale.setScalar(((isHeavy ? 1.15 : 0.86) + pulse * (isHeavy ? 0.3 : 0.18)) * 0.5);
      sparks.scale.setScalar(0.8 + progress * 0.9);
    },
    dispose: () => {
      arcGeometry.dispose();
      arcMaterial.dispose();
      weaponGeometry.dispose();
      weaponMaterial.dispose();
      sparkGeometry.dispose();
      sparkMaterial.dispose();
      centerGeometry.dispose();
      centerMaterial.dispose();
    },
  };
}

function makeWindAttackEffect(position: THREE.Vector3, facing: THREE.Vector3, elapsed: number): AttackEffect {
  const root = new THREE.Group();
  const groundY = surfaceHeightAt(position.x, position.z);
  root.position.set(position.x, groundY + 0.05, position.z);
  root.rotation.y = Math.atan2(facing.x, facing.z);

  const ringGeometry = new THREE.TorusGeometry(0.18, 0.025, 10, 24);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xcdf6ff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  root.add(ring);

  const ring2Geometry = new THREE.TorusGeometry(0.28, 0.02, 8, 20);
  const ring2Material = new THREE.MeshBasicMaterial({
    color: 0x8fd8ff,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring2 = new THREE.Mesh(ring2Geometry, ring2Material);
  ring2.rotation.x = Math.PI / 2;
  ring2.scale.setScalar(0.8);
  root.add(ring2);

  const gustGeometry = new THREE.CylinderGeometry(0.06, 0.16, 1.0, 7, 1, true);
  const gustMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const gust = new THREE.Mesh(gustGeometry, gustMaterial);
  gust.position.y = 0.5;
  root.add(gust);

  const streakGeometry = new THREE.BufferGeometry();
  const streakPositions = new Float32Array([
    -0.12, 0.08, 0,
    0.16, 0.1, 0.02,
    -0.06, 0.24, -0.04,
    0.08, 0.36, 0.03,
    -0.03, 0.5, -0.02,
    0.05, 0.66, 0.01,
  ]);
  streakGeometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
  const streakMaterial = new THREE.PointsMaterial({
    color: 0xeefbff,
    size: 0.05,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const streaks = new THREE.Points(streakGeometry, streakMaterial);
  root.add(streaks);

  attackEffectGroup.add(root);

  return {
    root,
    startTime: elapsed,
    duration: 0.48,
    hitSlimes: new Set<SlimeEnemy>(),
    damageRadius: 1.0,
    damage: 1,
    update: (progress: number) => {
      const swell = Math.min(progress / 0.2, 1);
      const fade = progress > 0.55 ? (1 - progress) / 0.45 : 1;
      root.scale.setScalar(0.9 + swell * 1.25);
      ring.rotation.z = progress * Math.PI * 2.2;
      ring.scale.setScalar(0.9 + swell * 1.4);
      ringMaterial.opacity = 0.9 * Math.max(fade, 0);
      ring2.rotation.z = -progress * Math.PI * 1.7;
      ring2.scale.setScalar(0.7 + swell * 1.1);
      ring2Material.opacity = 0.72 * Math.max(fade, 0);
      gust.scale.set(1 + swell * 0.3, 1 + swell * 0.55, 1 + swell * 0.3);
      gust.position.y = 0.5 + swell * 0.12;
      gustMaterial.opacity = 0.65 * Math.max(fade, 0);
      streaks.position.y = 0.02 + swell * 0.18;
      streaks.scale.setScalar(0.8 + swell * 0.9);
      streakMaterial.opacity = 0.88 * Math.max(fade, 0);
    },
    dispose: () => {
      ringGeometry.dispose();
      ringMaterial.dispose();
      ring2Geometry.dispose();
      ring2Material.dispose();
      gustGeometry.dispose();
      gustMaterial.dispose();
      streakGeometry.dispose();
      streakMaterial.dispose();
    },
  };
}

function makeMagicAttackEffect(position: THREE.Vector3, facing: THREE.Vector3, elapsed: number): AttackEffect {
  const root = new THREE.Group();
  const groundY = surfaceHeightAt(position.x, position.z);
  root.position.set(position.x, groundY + 0.04, position.z);
  root.rotation.y = Math.atan2(facing.x, facing.z);

  const columnGeometry = new THREE.CylinderGeometry(0.08, 0.14, 1.2, 6, 1, true);
  const columnMaterial = new THREE.MeshBasicMaterial({
    color: 0xd6a25a,
    transparent: true,
    opacity: 0.9,
    blending: THREE.NormalBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const column = new THREE.Mesh(columnGeometry, columnMaterial);
  column.position.set(0, 0.58, 0.46);
  root.add(column);

  const emberGeometry = new THREE.BufferGeometry();
  const emberPositions = new Float32Array([
    0.02, 0.1, 0.38,
    -0.03, 0.24, 0.44,
    0.04, 0.42, 0.5,
    -0.02, 0.6, 0.56,
  ]);
  emberGeometry.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
  const emberMaterial = new THREE.PointsMaterial({
    color: 0xffd48a,
    size: 0.05,
    transparent: true,
    opacity: 0.9,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });
  const embers = new THREE.Points(emberGeometry, emberMaterial);
  root.add(embers);

  attackEffectGroup.add(root);

  return {
    root,
    startTime: elapsed,
    duration: 0.56,
    hitSlimes: new Set<SlimeEnemy>(),
    damageRadius: 0.95,
    damage: 1,
    update: (progress: number) => {
      const fall = progress > 0.55 ? (1 - progress) / 0.45 : 1;
      const forwardPush = progress * 0.5;
      const shrink = Math.max(1 - progress * 0.78, 0.22);
      root.position.y = groundY + 0.04 + Math.sin(progress * Math.PI) * 0.03;
      column.position.z = 0.46 + forwardPush;
      column.position.y = 0.58 * shrink;
      column.scale.set(1 + progress * 0.06, shrink, 1 + progress * 0.06);
      column.material.opacity = 0.9 * Math.max(fall, 0);
      embers.position.z = 0.42 + forwardPush;
      embers.position.y = 0.62 * shrink;
      embers.scale.setScalar(0.78 + (1 - shrink) * 0.7);
      emberMaterial.opacity = 0.9 * Math.max(fall, 0);
    },
    dispose: () => {
      columnGeometry.dispose();
      columnMaterial.dispose();
      column.material.dispose();
      emberGeometry.dispose();
      emberMaterial.dispose();
    },
  };
}

function makeArrowAttackEffect(position: THREE.Vector3, facing: THREE.Vector3, elapsed: number): AttackEffect {
  const root = new THREE.Group();
  const groundY = surfaceHeightAt(position.x, position.z);
  const origin = position.clone();
  origin.y = groundY + 0.66;
  root.position.copy(origin);
  root.rotation.y = Math.atan2(facing.x, facing.z);

  const shaftGeometry = new THREE.BoxGeometry(0.62, 0.03, 0.03);
  const shaftMaterial = new THREE.MeshBasicMaterial({
    color: 0xf7e4a7,
    transparent: true,
    opacity: 0.98,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
  shaft.position.z = 0.1;
  root.add(shaft);

  const headGeometry = new THREE.ConeGeometry(0.07, 0.16, 5);
  const headMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff7d6,
    transparent: true,
    opacity: 0.98,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.rotation.x = Math.PI / 2;
  head.position.z = 0.37;
  root.add(head);

  const trailGeometry = new THREE.BufferGeometry();
  const trailPositions = new Float32Array([
    -0.24, 0, 0,
    -0.46, 0, 0.01,
    -0.62, 0, -0.01,
  ]);
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  const trailMaterial = new THREE.PointsMaterial({
    color: 0xa2e8ff,
    size: 0.06,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const trail = new THREE.Points(trailGeometry, trailMaterial);
  root.add(trail);

  attackEffectGroup.add(root);

  const direction = facing.clone().normalize();

  return {
    root,
    startTime: elapsed,
    duration: 0.72,
    hitSlimes: new Set<SlimeEnemy>(),
    damageRadius: 0.45,
    damage: 1,
    update: (progress: number) => {
      const distance = progress * 5.6;
      const lift = Math.sin(progress * Math.PI) * 0.4;
      root.position.copy(origin).addScaledVector(direction, distance);
      root.position.y = origin.y + lift;
      root.scale.setScalar(1 - progress * 0.1);
      shaftMaterial.opacity = 0.98 * (1 - progress * 0.72);
      headMaterial.opacity = 0.98 * (1 - progress * 0.65);
      trailMaterial.opacity = 0.9 * (1 - progress);
      trail.scale.setScalar(1 + progress * 0.35);
      root.rotation.z = Math.sin(progress * Math.PI) * 0.12;
    },
    dispose: () => {
      shaftGeometry.dispose();
      shaftMaterial.dispose();
      headGeometry.dispose();
      headMaterial.dispose();
      trailGeometry.dispose();
      trailMaterial.dispose();
    },
  };
}

function makeFirewallAttackEffect(position: THREE.Vector3, facing: THREE.Vector3, elapsed: number): AttackEffect {
  const root = new THREE.Group();
  const groundY = surfaceHeightAt(position.x, position.z);
  root.position.set(position.x, groundY + 0.02, position.z);
  root.rotation.y = Math.atan2(facing.x, facing.z);

  const columns: Array<{
    mesh: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;
    seed: number;
  }> = [];

  const columnOffsets = [-0.72, -0.36, 0, 0.36, 0.72];
  columnOffsets.forEach((offset, index) => {
    const geometry = new THREE.ConeGeometry(0.12, 0.8, 5);
    const material = new THREE.MeshBasicMaterial({
      color: index % 2 === 0 ? 0xffac4d : 0xff5c2d,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flame = new THREE.Mesh(geometry, material);
    flame.position.set(offset, 0.4, 1.12);
    flame.rotation.z = Math.PI;
    root.add(flame);
    columns.push({ mesh: flame, seed: index * 0.9 + offset });
  });

  const glowGeometry = new THREE.CircleGeometry(1.08, 20);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff7b2e,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, 0.05, 1.02);
  root.add(glow);

  attackEffectGroup.add(root);

  return {
    root,
    startTime: elapsed,
    duration: 0.88,
    hitSlimes: new Set<SlimeEnemy>(),
    damageRadius: 1.15,
    damage: 1,
    update: (progress: number) => {
      const rise = Math.min(progress / 0.22, 1);
      const fade = progress > 0.7 ? (1 - progress) / 0.3 : 1;
      columns.forEach(({ mesh, seed }) => {
        const flicker = 0.9 + Math.sin(progress * 22 + seed) * 0.18;
        mesh.scale.set(1.15, (0.85 + rise * 1.9) * flicker, 1.15);
        mesh.position.y = 0.32 + rise * 0.08 + Math.sin(progress * 18 + seed) * 0.04;
        mesh.material.opacity = 0.94 * Math.max(fade, 0) * flicker;
      });
      glow.scale.setScalar(0.86 + rise * 0.28);
      glowMaterial.opacity = 0.42 * Math.max(fade, 0);
      root.position.y = groundY + 0.02 + rise * 0.05;
    },
    dispose: () => {
      columns.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      glowGeometry.dispose();
      glowMaterial.dispose();
    },
  };
}

function triggerAttackEffect(elapsed: number): void {
  const leader = partyMembers[0];
  const nowMs = elapsed * 1000;
  if (nowMs - lastAttackAt < attackCooldownMs) return;

  lastAttackAt = nowMs;
  const style = attackStyleForLeader(leader);
  if (style === 'player') {
    attackEffects.push(makeWindAttackEffect(leader.position.clone(), leader.facingWorld.clone(), elapsed));
    return;
  }
  if (style === 'thief') {
    attackEffects.push(makeArrowAttackEffect(leader.position.clone(), leader.facingWorld.clone(), elapsed));
    return;
  }
  if (style === 'swordsman') {
    attackEffects.push(makeMagicAttackEffect(leader.position.clone(), leader.facingWorld.clone(), elapsed));
    return;
  }
  attackEffects.push(makeFirewallAttackEffect(leader.position.clone(), leader.facingWorld.clone(), elapsed));
}

function updateAttackEffects(elapsed: number): void {
  for (let i = attackEffects.length - 1; i >= 0; i -= 1) {
    const effect = attackEffects[i];
    const progress = (elapsed - effect.startTime) / effect.duration;
    if (progress >= 1) {
      attackEffectGroup.remove(effect.root);
      effect.dispose();
      attackEffects.splice(i, 1);
      continue;
    }

    effect.update(progress);
    const effectCenter = effect.root.position;
    for (let j = slimeEnemies.length - 1; j >= 0; j -= 1) {
      const slime = slimeEnemies[j];
      if (effect.hitSlimes.has(slime)) continue;
      const slimeCenterY = slime.root.position.y + 0.55;
      const dx = slime.root.position.x - effectCenter.x;
      const dz = slime.root.position.z - effectCenter.z;
      const dy = slimeCenterY - effectCenter.y;
      const distance = Math.hypot(dx, dz, dy * 0.6);
      if (distance > effect.damageRadius) continue;

      effect.hitSlimes.add(slime);
      slime.hp -= effect.damage;
      slime.hitFlashUntil = elapsed + 0.16;
      spawnDamagePopup(slime.root.position.clone(), effect.damage, elapsed);
      if (slime.hp <= 0) {
        removeSlime(j);
      }
    }
  }
}

function updateDamagePopups(elapsed: number): void {
  for (let i = damagePopups.length - 1; i >= 0; i -= 1) {
    const popup = damagePopups[i];
    const progress = (elapsed - popup.startTime) / popup.duration;
    if (progress >= 1) {
      removeDamagePopup(i);
      continue;
    }

    popup.root.position.copy(popup.basePosition).addScaledVector(popup.velocity, progress * popup.duration);
    popup.root.position.y += progress * 0.7;
    popup.root.scale.setScalar(0.92 + Math.sin(progress * Math.PI) * 0.14);
    popup.material.opacity = 1 - progress;
  }
}

function resetPartyTrail(): void {
  const leader = partyMembers[0];
  const maxSpacing = partySpacing[partySpacing.length - 1] + 0.9;
  partyTrail.length = 0;
  partyTrailDistance = maxSpacing;

  for (let i = 0; i <= 8; i += 1) {
    const distance = (maxSpacing / 8) * i;
    const position = leader.position.clone().addScaledVector(leader.facingWorld, distance - maxSpacing);
    partyTrail.push({
      position,
      direction: directionFromMemberFacing(leader),
      distance,
    });
  }
}

function initializePartyFormation(): void {
  const leader = partyMembers[0];
  partyMembers.slice(1).forEach((member, index) => {
    member.position.copy(leader.position).addScaledVector(leader.facingWorld, -partySpacing[index + 1]);
    member.facingWorld.copy(leader.facingWorld);
  });
  resetPartyTrail();
}

function rotatePartyLeader(): void {
  const previousParty = partyMembers.slice();
  partyMembers = previousParty.slice(1).concat(previousParty[0]);

  partyMembers.forEach((member, index) => {
    member.position.copy(previousParty[index].position);
    member.facingWorld.copy(previousParty[index].facingWorld);
  });

  refreshPartyRenderOrder();
  resetPartyTrail();
  updateHud();
}

function recordPartyTrail(direction: PlayerDirection): void {
  const leader = partyMembers[0];
  const lastPoint = partyTrail[partyTrail.length - 1];
  if (!lastPoint) {
    partyTrail.push({
      position: leader.position.clone(),
      direction,
      distance: partyTrailDistance,
    });
    return;
  }

  const stepDistance = lastPoint.position.distanceTo(leader.position);
  if (stepDistance < 0.015) {
    lastPoint.direction = direction;
    return;
  }

  partyTrailDistance += stepDistance;
  partyTrail.push({
    position: leader.position.clone(),
    direction,
    distance: partyTrailDistance,
  });

  const maxTrailLength = partySpacing[partySpacing.length - 1] + 1.2;
  while (partyTrail.length > 2 && partyTrailDistance - partyTrail[0].distance > maxTrailLength) {
    partyTrail.shift();
  }
}

function samplePartyTrail(spacing: number): { position: THREE.Vector3; direction: PlayerDirection } {
  const firstPoint = partyTrail[0];
  const lastPoint = partyTrail[partyTrail.length - 1];
  if (!firstPoint || !lastPoint) {
    return { position: partyMembers[0].position.clone(), direction: directionFromMemberFacing(partyMembers[0]) };
  }

  const targetDistance = Math.max(lastPoint.distance - spacing, firstPoint.distance);
  for (let i = 1; i < partyTrail.length; i += 1) {
    const previous = partyTrail[i - 1];
    const next = partyTrail[i];
    if (next.distance < targetDistance) continue;
    const segmentLength = Math.max(next.distance - previous.distance, 0.0001);
    const t = THREE.MathUtils.clamp((targetDistance - previous.distance) / segmentLength, 0, 1);
    return {
      position: new THREE.Vector3().lerpVectors(previous.position, next.position, t),
      direction: next.direction,
    };
  }

  return { position: lastPoint.position.clone(), direction: lastPoint.direction };
}

function updateFollowers(delta: number, elapsed: number, leaderMoving: boolean): void {
  const followAlpha = 1 - Math.exp(-delta * 14);

  partyMembers.slice(1).forEach((member, index) => {
    const sample = samplePartyTrail(partySpacing[index + 1]);
    const previousPosition = member.position.clone();
    member.position.lerp(sample.position, followAlpha);

    const moved = previousPosition.distanceTo(member.position) > 0.006;
    if (moved) {
      member.facingWorld.copy(member.position).sub(previousPosition).normalize();
    }

    const walking = leaderMoving && moved;
    const direction = walking ? directionFromWorldFacing(member.facingWorld) : sample.direction;
    const frame = frameForPartyMemberMotion(member, walking, elapsed, index + 1);
    if (member.kind === 'player') {
      setPlayerFrame(direction, frame);
    } else {
      setCompanionFrame(member, direction, frame);
    }
    updatePartyMemberPlacement(member);
  });
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'c') {
    if (!event.repeat) {
      rotatePartyLeader();
    }
    event.preventDefault();
    return;
  }

  if (key === ' ') {
    if (!event.repeat) {
      triggerAttackEffect(clock.elapsedTime);
    }
    event.preventDefault();
    return;
  }

  pressedKeys.add(key);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.key.toLowerCase());
});

function cameraGroundBasis(): { right: THREE.Vector3; up: THREE.Vector3 } {
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  right.y = 0;
  up.y = 0;
  right.normalize();
  up.normalize();
  return { right, up };
}

function directionFromWorldFacing(facing: THREE.Vector3): PlayerDirection {
  const { right, up } = cameraGroundBasis();
  const screenX = facing.dot(right);
  const screenY = facing.dot(up);
  const angle = Math.atan2(screenY, screenX);
  const octant = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
  const directions: PlayerDirection[] = ['right', 'up-right', 'up', 'up-left', 'left', 'down-left', 'down', 'down-right'];
  return directions[octant];
}

function facePlaneToCamera(sprite: THREE.Object3D): void {
  const toCamera = camera.position.clone().sub(sprite.position);
  toCamera.y = 0;
  if (toCamera.lengthSq() > 0.0001) {
    sprite.rotation.y = Math.atan2(toCamera.x, toCamera.z);
  }
}

function updateParty(delta: number, elapsed: number): void {
  const leader = partyMembers[0];
  const inputX = Number(pressedKeys.has('d') || pressedKeys.has('arrowright')) - Number(pressedKeys.has('a') || pressedKeys.has('arrowleft'));
  const inputY = Number(pressedKeys.has('w') || pressedKeys.has('arrowup')) - Number(pressedKeys.has('s') || pressedKeys.has('arrowdown'));
  const { right, up } = cameraGroundBasis();
  const movement = right.multiplyScalar(inputX).add(up.multiplyScalar(inputY));
  let leaderMoving = false;

  if (movement.lengthSq() > 0) {
    leaderMoving = true;
    movement.normalize();
    leader.facingWorld.copy(movement);
    const step = movement.multiplyScalar(delta * 2.5);
    const nextX = leader.position.x + step.x;
    const nextZ = leader.position.z + step.z;
    const exitTransition = mapExitTransition(nextX, nextZ);
    if (exitTransition) {
      goToNextMap(exitTransition.entrySide, exitTransition.lane);
      return;
    }
    leader.position.x = THREE.MathUtils.clamp(nextX, mapBounds.minX, mapBounds.maxX);
    leader.position.z = THREE.MathUtils.clamp(nextZ, mapBounds.minZ, mapBounds.maxZ);
    const direction = directionFromWorldFacing(leader.facingWorld);
    setPartyMemberFrame(leader, direction, frameForPartyMemberMotion(leader, true, elapsed, 0));
    recordPartyTrail(direction);

    const follow = new THREE.Vector3(leader.position.x, 0.6, leader.position.z);
    const targetDelta = follow.sub(controls.target).multiplyScalar(0.06);
    controls.target.add(targetDelta);
    camera.position.add(targetDelta);
  } else {
    const direction = directionFromWorldFacing(leader.facingWorld);
    setPartyMemberFrame(leader, direction, 0);
    recordPartyTrail(direction);
  }

  updatePartyMemberPlacement(leader);
  updateFollowers(delta, elapsed, leaderMoving);
  partyMembers.forEach((member) => facePlaneToCamera(member.sprite));
  updateHud();
}

setPlayerFrame('down', 0);
companions.forEach((companion) => {
  setCompanionFrame(companion, 'down', companionIdleFrame);
});
initializePartyFormation();
partyMembers.forEach((member) => updatePartyMemberPlacement(member));
refreshPartyRenderOrder();
updateHud();

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  const aspect = width / height;
  const viewSize = width < 700 ? 9.4 : 7.9;
  camera.left = -viewSize * aspect;
  camera.right = viewSize * aspect;
  camera.top = viewSize;
  camera.bottom = -viewSize;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();

function animate(): void {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  propGroup.children.forEach((child, index) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      if (child.material.emissiveIntensity > 0.9) {
        child.position.y += Math.sin(elapsed * 1.8 + index) * 0.0009;
      }
    }
  });

  glowGroup.rotation.y = elapsed * 0.015;
  updateAttackEffects(elapsed);
  updateDamagePopups(elapsed);
  updateParty(delta, elapsed);
  updateSlimes(delta, elapsed);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
