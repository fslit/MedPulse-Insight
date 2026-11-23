import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Activity,
  ChevronRight,
  Eye,
  EyeOff,
  Grid2x2,
  Hand,
  Layers,
  MousePointer,
  Orbit,
  RotateCcw,
  Scissors,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  BodyVistaAxis,
  BodyVistaLayerKey,
  BodyVistaLayerLevel,
  ORGAN_ORDER,
  ORGAN_RECORDS,
  OrganId,
  OrganRecord,
  StageMode,
  computeClippingPlaneConstant,
  computeExplodeOffset,
  getDefaultLayersForMode,
  getStageMaterialPreset,
  isTapGesture,
  layerLevelToOpacity,
} from '../utils/healthModel';
import { OrganIcon } from './OrganIcons';
import { BodyVistaWorkbench, OrientationPreset } from './BodyVistaWorkbench';

interface Human3DStageProps {
  selectedOrgan: OrganId | null;
  organRecords?: Record<OrganId, OrganRecord>;
  stageMode: StageMode;
  layers?: Record<BodyVistaLayerKey, BodyVistaLayerLevel>;
  onChangeLayer?: (key: BodyVistaLayerKey, level: BodyVistaLayerLevel) => void;
  paused?: boolean;
  onChangeStageMode: (mode: StageMode) => void;
  onSelectOrgan: (organId: OrganId) => void;
  onOpenOrganDetail?: (organId: OrganId) => void;
  onResetSelection: () => void;
  onOpenMobileSystemsSheet?: () => void;
}

type StageToolId = 'browse' | 'select' | 'dissect' | 'slice' | 'explode';

const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  const probeCanvas = document.createElement('canvas');
  const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

// Pre-allocated math scratch objects outside the render loop (zero GC)
const _worldPos = new THREE.Vector3();
const _ndcPos = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _colorTarget = new THREE.Color();
const _emissiveTarget = new THREE.Color();
const _upAxis = new THREE.Vector3(0, 1, 0);

const DEFAULT_CAM_POS = new THREE.Vector3(0, 0.22, 4.88);
const DEFAULT_LOOK_AT = new THREE.Vector3(0, 0.15, 0);

const BODY_AXIS_BOUNDS: Record<BodyVistaAxis, [number, number]> = {
  y: [-1.46, 1.75],
  x: [-0.62, 0.62],
  z: [-0.26, 0.28],
};

interface OrganPalettePair {
  holoColor: number;
  holoEmissive: number;
  atlasColor: number;
  atlasEmissive: number;
  roughness: number;
}

const ORGAN_PALETTES: Record<OrganId, OrganPalettePair> = {
  brain: {
    holoColor: 0x168a9c,
    holoEmissive: 0x0d7a8a,
    atlasColor: 0xd99e9b,
    atlasEmissive: 0x451f24,
    roughness: 0.46,
  },
  lungs: {
    holoColor: 0x0ea5e9,
    holoEmissive: 0x0369a1,
    atlasColor: 0xd98994,
    atlasEmissive: 0x451a23,
    roughness: 0.45,
  },
  heart: {
    holoColor: 0xe11d48,
    holoEmissive: 0x9f1239,
    atlasColor: 0xb92835,
    atlasEmissive: 0x6b141a,
    roughness: 0.32,
  },
  liver: {
    holoColor: 0xd97706,
    holoEmissive: 0x92400e,
    atlasColor: 0x9c3f36,
    atlasEmissive: 0x4f1d16,
    roughness: 0.38,
  },
  stomach: {
    holoColor: 0x0d9488,
    holoEmissive: 0x115e59,
    atlasColor: 0xd67e70,
    atlasEmissive: 0x421d19,
    roughness: 0.4,
  },
  kidneys: {
    holoColor: 0x059669,
    holoEmissive: 0x065f46,
    atlasColor: 0x963d46,
    atlasEmissive: 0x3b161b,
    roughness: 0.38,
  },
  bone: {
    holoColor: 0x568d9c,
    holoEmissive: 0x0d7a8a,
    atlasColor: 0xe6dccd,
    atlasEmissive: 0x292524,
    roughness: 0.48,
  },
  vascular: {
    holoColor: 0xdc2626,
    holoEmissive: 0x991b1b,
    atlasColor: 0xc9282f,
    atlasEmissive: 0x5c1414,
    roughness: 0.32,
  },
};

function createBodyVistaSkinShaderMaterial(colorHex = 0x0d7a8a, initialOpacity = 0.22): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uAtlasColor: { value: new THREE.Color(0xdcb0a4) },
      uAtlasMix: { value: 1.0 },
      uTime: { value: 0 },
      uOpacity: { value: initialOpacity },
      uClipActive: { value: 0 },
      uClipNormal: { value: new THREE.Vector3(0, -1, 0) },
      uClipConstant: { value: 2.0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPos;
      varying vec3 vWorldPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        vec4 mvPosition = viewMatrix * worldPosition;
        vViewPos = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uAtlasColor;
      uniform float uAtlasMix;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uClipActive;
      uniform vec3 uClipNormal;
      uniform float uClipConstant;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      varying vec3 vWorldPos;
      void main() {
        float planeDist = dot(vWorldPos, uClipNormal) + uClipConstant;
        if (uClipActive > 0.5 && planeDist < 0.0) discard;

        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPos);
        float ndv = abs(dot(normal, viewDir));
        float fresnel = pow(1.0 - ndv, 1.85);
        float scanWave = 0.94 + 0.06 * sin(vWorldPos.y * 28.0 - uTime * 2.0);

        // Clean clinical teal contour on light canvas vs BodyVista rose-flesh translucent dermis
        vec3 holoCol = mix(uColor, vec3(0.05, 0.36, 0.44), fresnel * 0.65);
        float keyDiff = 0.52 + 0.48 * max(dot(normal, normalize(vec3(0.38, 0.58, 0.72))), 0.0);
        vec3 atlasCol = mix(uAtlasColor * keyDiff, vec3(0.68, 0.42, 0.40), fresnel * 0.55);

        vec3 finalRgb = mix(holoCol, atlasCol, uAtlasMix);
        float holoAlpha = clamp((0.18 + fresnel * 0.82) * uOpacity * scanWave, 0.0, 0.88);
        float atlasAlpha = clamp((0.46 + fresnel * 0.62) * uOpacity, 0.0, 0.92);
        float alpha = mix(holoAlpha, atlasAlpha, uAtlasMix);

        // Clean cross-section edge highlight when slicing is active
        if (uClipActive > 0.5 && planeDist < 0.022) {
          float edgeFactor = 1.0 - (planeDist / 0.022);
          finalRgb = mix(finalRgb, vec3(0.05, 0.48, 0.54), edgeFactor * 0.9);
          alpha = max(alpha, edgeFactor * 0.85);
        }

        if (alpha < 0.006) discard;
        gl_FragColor = vec4(finalRgb, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createRadialShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    g.addColorStop(0, 'rgba(15, 23, 42, 0.16)');
    g.addColorStop(0.5, 'rgba(15, 23, 42, 0.06)');
    g.addColorStop(1, 'rgba(244, 246, 248, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSoftParticleTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    g.addColorStop(0, 'rgba(13, 122, 138, 1)');
    g.addColorStop(0.5, 'rgba(13, 122, 138, 0.65)');
    g.addColorStop(1, 'rgba(13, 122, 138, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Assign realistic BodyVista dual arterial crimson (#D6262E) + venous royal blue (#1C54C7)
 * vertex colors across parallel vascular strands.
 */
function applyDualArterialVenousVertexColors(geo: THREE.BufferGeometry) {
  const posAttr = geo.attributes.position;
  if (!posAttr) return;
  const count = posAttr.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    // Separate parallel arterial & venous trunks cleanly across limbs, neck, and torso
    const wave = Math.sin(x * 46.0 + z * 34.0 + y * 5.2);
    const isArtery = wave >= -0.05;
    if (isArtery) {
      colors[i * 3] = 0.82;
      colors[i * 3 + 1] = 0.14;
      colors[i * 3 + 2] = 0.17;
    } else {
      colors[i * 3] = 0.11;
      colors[i * 3 + 1] = 0.33;
      colors[i * 3 + 2] = 0.78;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

export const Human3DStage: React.FC<Human3DStageProps> = ({
  selectedOrgan,
  organRecords = ORGAN_RECORDS,
  stageMode,
  layers: externalLayers,
  onChangeLayer: externalOnChangeLayer,
  paused = false,
  onChangeStageMode,
  onSelectOrgan,
  onOpenOrganDetail,
  onResetSelection,
  onOpenMobileSystemsSheet,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const viewportAreaRef = useRef<HTMLDivElement | null>(null);

  // Refs for zero-React-render 60fps overlay coordinate projection
  const hotspotRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<SVGPolylineElement | null>(null);

  // Mutable refs read inside the WebGL loop
  const selectedOrganRef = useRef<OrganId | null>(selectedOrgan);
  const organRecordsRef = useRef<Record<OrganId, OrganRecord>>(organRecords);
  const stageModeRef = useRef<StageMode>(stageMode);
  const pausedRef = useRef<boolean>(paused);
  const onSelectOrganRef = useRef(onSelectOrgan);
  const onResetSelectionRef = useRef(onResetSelection);
  // Start facing upright anterior anatomical view matching BodyVista reference
  const autoRotateRef = useRef<boolean>(false);
  const cameraAnimatingRef = useRef<boolean>(false);
  const resetRequestedRef = useRef<boolean>(false);
  const orientationTargetYawRef = useRef<number | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // BodyVista interactive state + loop refs
  const [workbenchOpen, setWorkbenchOpen] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<StageToolId>('browse');
  const [internalLayers, setInternalLayers] = useState<Record<BodyVistaLayerKey, BodyVistaLayerLevel>>(
    () => getDefaultLayersForMode(stageMode)
  );
  const layers = externalLayers ?? internalLayers;

  const [sectionAxis, setSectionAxis] = useState<BodyVistaAxis>('z');
  const [sectionPercent, setSectionPercent] = useState<number>(0);
  const [explodePercent, setExplodePercent] = useState<number>(0);
  const [flowParticles, setFlowParticles] = useState<boolean>(false);
  const [dimSurrounding, setDimSurrounding] = useState<boolean>(true);
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);

  const layersRef = useRef(layers);
  const sectionAxisRef = useRef<BodyVistaAxis>(sectionAxis);
  const sectionPercentRef = useRef<number>(sectionPercent);
  const explodePercentRef = useRef<number>(explodePercent);
  const flowParticlesRef = useRef<boolean>(flowParticles);
  const dimSurroundingRef = useRef<boolean>(dimSurrounding);

  const [autoRotateUi, setAutoRotateUi] = useState<boolean>(false);
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [mobileScrollPassthrough, setMobileScrollPassthrough] = useState<boolean>(false);
  const [webglFallback, setWebglFallback] = useState<boolean>(false);

  useEffect(() => {
    selectedOrganRef.current = selectedOrgan;
    if (selectedOrgan) {
      autoRotateRef.current = false;
      setAutoRotateUi(false);
      orientationTargetYawRef.current = 0;
      cameraAnimatingRef.current = true;
    }
  }, [selectedOrgan]);

  useEffect(() => {
    stageModeRef.current = stageMode;
    if (!externalLayers) {
      const nextLayers = getDefaultLayersForMode(stageMode);
      setInternalLayers(nextLayers);
      layersRef.current = nextLayers;
    }
  }, [stageMode, externalLayers]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    sectionAxisRef.current = sectionAxis;
  }, [sectionAxis]);

  useEffect(() => {
    sectionPercentRef.current = sectionPercent;
  }, [sectionPercent]);

  useEffect(() => {
    explodePercentRef.current = explodePercent;
  }, [explodePercent]);

  useEffect(() => {
    flowParticlesRef.current = flowParticles;
  }, [flowParticles]);

  useEffect(() => {
    dimSurroundingRef.current = dimSurrounding;
  }, [dimSurrounding]);

  useEffect(() => {
    onSelectOrganRef.current = onSelectOrgan;
  }, [onSelectOrgan]);

  useEffect(() => {
    onResetSelectionRef.current = onResetSelection;
  }, [onResetSelection]);

  useEffect(() => {
    organRecordsRef.current = organRecords;
  }, [organRecords]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    const areaEl = viewportAreaRef.current;
    if (!mountEl || !areaEl) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFallback(true);
      return;
    }

    const initW = Math.max(areaEl.clientWidth, 300);
    const initH = Math.max(areaEl.clientHeight, 360);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.localClippingEnabled = true;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initW, initH);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.dataset.testid = 'human-3d-canvas';

    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFallback(true);
    };
    const onContextRestored = () => {
      setWebglFallback(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf4f6f8, 0.018);

    const disposables: Array<{ dispose: () => void }> = [];

    // Studio environment reflection for PBR organ & skeletal highlights (skip heavy PMREM shader pass on CPU software WebGL)
    if (!isSoftwareGl) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envRT.texture;
      pmremGenerator.dispose();
      disposables.push(envRT);
    }

    const getDefaultCamZ = () => (areaEl.clientWidth < 500 ? 5.25 : 4.82);
    const camera = new THREE.PerspectiveCamera(37, initW / initH, 0.1, 60);
    camera.position.set(DEFAULT_CAM_POS.x, DEFAULT_CAM_POS.y, getDefaultCamZ());

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.1;
    controls.maxDistance = 6.8;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.target.copy(DEFAULT_LOOK_AT);

    const handleControlStart = () => {
      cameraAnimatingRef.current = false;
      resetRequestedRef.current = false;
      orientationTargetYawRef.current = null;
    };
    controls.addEventListener('start', handleControlStart);

    // Crisp BodyVista Clinical Light Studio 3-point lighting rig
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xdbe4ec, 1.42);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.52);
    keyLight.position.set(2.8, 3.6, 4.2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.86);
    fillLight.position.set(-3.0, 0.8, 2.4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xcbd5e1, 0.92);
    rimLight.position.set(-2.2, 2.2, -3.5);
    scene.add(rimLight);

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      disposables.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      disposables.push(m);
      return m;
    };

    // Shared BodyVista local clipping plane
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 2.0);

    // Root anatomical human group
    const humanGroup = new THREE.Group();
    scene.add(humanGroup);

    // Visual cross-section scan plane indicator inside humanGroup
    const sliceIndicatorGroup = new THREE.Group();
    sliceIndicatorGroup.visible = false;
    const slicePlaneMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x0d7a8a,
        transparent: true,
        opacity: 0.09,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    const slicePlaneMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.35, 1.35)), slicePlaneMat);
    const sliceBorderLine = new THREE.LineSegments(
      trackGeo(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.35, 1.35))),
      trackMat(
        new THREE.LineBasicMaterial({
          color: 0x0d7a8a,
          transparent: true,
          opacity: 0.55,
        })
      )
    );
    sliceIndicatorGroup.add(slicePlaneMesh, sliceBorderLine);
    humanGroup.add(sliceIndicatorGroup);

    // Multi-layer BodyVista materials
    const bodyShellMat = trackMat(createBodyVistaSkinShaderMaterial(0x0d7a8a, 0.18));
    const bodyWireMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x0d7a8a,
        wireframe: true,
        transparent: true,
        opacity: 0.04,
        depthWrite: false,
      })
    );

    const muscularMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc85a64,
        emissive: 0x3f1218,
        emissiveIntensity: 0.12,
        roughness: 0.54,
        metalness: 0.04,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );

    const skeletonMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe8dfd1,
        emissive: 0x332d26,
        emissiveIntensity: 0.06,
        roughness: 0.48,
        metalness: 0.06,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );

    const vascularTreeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x2a1428,
        emissiveIntensity: 0.12,
        roughness: 0.34,
        metalness: 0.08,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );

    const visceralContextMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc98a4b,
        emissive: 0x3b2310,
        emissiveIntensity: 0.08,
        roughness: 0.48,
        metalness: 0.04,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );

    const clippableStandardMats: THREE.MeshStandardMaterial[] = [
      muscularMat,
      skeletonMat,
      vascularTreeMat,
      visceralContextMat,
    ];

    // Lightweight instant placeholder silhouette until /models/bodyvista_anatomy.glb finishes parsing
    const placeholderGroup = new THREE.Group();
    const phTorso = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.24, 0.92, 8, 16)),
      bodyShellMat
    );
    phTorso.position.set(0, 0.56, 0);
    phTorso.scale.set(1.05, 1, 0.65);
    const phHead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.16, 16, 14)), bodyShellMat);
    phHead.position.set(0, 1.54, 0);
    placeholderGroup.add(phTorso, phHead);
    humanGroup.add(placeholderGroup);

    // 8 Clickable Organ Groups + Pin Anchors + Layer 1 Hit Proxies
    const organGroups: Record<OrganId, THREE.Group> = {} as Record<OrganId, THREE.Group>;
    const organBasePositions: Record<OrganId, [number, number, number]> = {} as Record<
      OrganId,
      [number, number, number]
    >;
    const organPinAnchors: Record<OrganId, THREE.Object3D> = {} as Record<OrganId, THREE.Object3D>;
    const organMaterials: Record<OrganId, THREE.MeshStandardMaterial> = {} as Record<
      OrganId,
      THREE.MeshStandardMaterial
    >;
    const hitTargets: THREE.Object3D[] = [];

    const invisibleHitMat = trackMat(new THREE.MeshBasicMaterial({ visible: false }));
    const hitSphereGeo = trackGeo(new THREE.SphereGeometry(0.17, 10, 10));

    for (const id of ORGAN_ORDER) {
      const rec = ORGAN_RECORDS[id];
      const pal = ORGAN_PALETTES[id];
      const mat = trackMat(
        new THREE.MeshStandardMaterial({
          color: pal.atlasColor,
          emissive: pal.atlasEmissive,
          emissiveIntensity: 0.16,
          roughness: pal.roughness,
          metalness: 0.06,
          transparent: true,
          opacity: 0.94,
          side: THREE.DoubleSide,
        })
      );
      clippableStandardMats.push(mat);
      organMaterials[id] = mat;

      const grp = new THREE.Group();
      grp.position.set(...rec.pos);
      grp.renderOrder = 3;
      humanGroup.add(grp);
      organGroups[id] = grp;
      organBasePositions[id] = [...rec.pos];

      const pinAnchor = new THREE.Object3D();
      pinAnchor.position.set(0, 0, 0);
      grp.add(pinAnchor);
      organPinAnchors[id] = pinAnchor;

      // Generous spherical hit proxy on Layer 1 so narrow vessels/femur are effortless to tap
      const proxy = new THREE.Mesh(hitSphereGeo, invisibleHitMat);
      proxy.layers.set(1);
      proxy.userData.organId = id;
      pinAnchor.add(proxy);
      hitTargets.push(proxy);
    }

    // Load Real Curated BodyVista 3D Anatomical GLB (/public/models/bodyvista_anatomy.glb)
    let skinMeshRef: THREE.Mesh | null = null;
    let skinWireRef: THREE.Mesh | null = null;
    let muscularMeshRef: THREE.Mesh | null = null;
    let skeletonMeshRef: THREE.Mesh | null = null;
    let vascularMeshRef: THREE.Mesh | null = null;
    let visceralMeshRef: THREE.Mesh | null = null;

    let unmounted = false;
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/models/bodyvista_anatomy.glb',
      (gltf) => {
        if (unmounted) {
          gltf.scene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              (obj as THREE.Mesh).geometry?.dispose();
            }
          });
          return;
        }

        placeholderGroup.visible = false;

        const meshMap = new Map<string, { geo: THREE.BufferGeometry; pos: THREE.Vector3 }>();
        gltf.scene.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.isMesh && m.geometry) {
            trackGeo(m.geometry);
            meshMap.set(m.name || obj.name, {
              geo: m.geometry,
              pos: obj.position.clone(),
            });
          }
        });

        const skinData = meshMap.get('skin_shell');
        if (skinData) {
          skinMeshRef = new THREE.Mesh(skinData.geo, bodyShellMat);
          skinMeshRef.renderOrder = 6;
          skinWireRef = new THREE.Mesh(skinData.geo, bodyWireMat);
          skinWireRef.renderOrder = 7;
          humanGroup.add(skinMeshRef, skinWireRef);
        }

        const muscData = meshMap.get('muscular_layer');
        if (muscData) {
          muscularMeshRef = new THREE.Mesh(muscData.geo, muscularMat);
          muscularMeshRef.renderOrder = 5;
          humanGroup.add(muscularMeshRef);
        }

        const skelData = meshMap.get('skeleton_frame');
        if (skelData) {
          skeletonMeshRef = new THREE.Mesh(skelData.geo, skeletonMat);
          skeletonMeshRef.renderOrder = 1;
          humanGroup.add(skeletonMeshRef);
        }

        const vascData = meshMap.get('vascular_tree');
        if (vascData) {
          applyDualArterialVenousVertexColors(vascData.geo);
          vascularTreeMat.vertexColors = true;
          vascularTreeMat.needsUpdate = true;
          vascularMeshRef = new THREE.Mesh(vascData.geo, vascularTreeMat);
          vascularMeshRef.renderOrder = 2;
          humanGroup.add(vascularMeshRef);
        }

        const viscData = meshMap.get('visceral_context');
        if (viscData) {
          visceralMeshRef = new THREE.Mesh(viscData.geo, visceralContextMat);
          visceralMeshRef.renderOrder = 2;
          humanGroup.add(visceralMeshRef);
        }

        // Attach real BodyVista 3D organ meshes with exact centered pivots + Layer 1 raycast support
        for (const id of ORGAN_ORDER) {
          const organData = meshMap.get(`organ_${id}`);
          if (!organData) continue;
          const grp = organGroups[id];
          const rec = ORGAN_RECORDS[id];

          const truePivot: [number, number, number] = [
            organData.pos.x,
            organData.pos.y,
            organData.pos.z,
          ];
          organBasePositions[id] = truePivot;
          grp.position.set(...truePivot);

          // Offset pinAnchor so bilateral organs (lungs, kidneys) keep hotspot right on the anterior lobe
          organPinAnchors[id].position.set(
            rec.pos[0] - truePivot[0],
            rec.pos[1] - truePivot[1],
            rec.pos[2] - truePivot[2]
          );

          const realOrganMesh = new THREE.Mesh(organData.geo, organMaterials[id]);
          realOrganMesh.renderOrder = 3;
          realOrganMesh.layers.enable(1);
          realOrganMesh.userData.organId = id;
          grp.add(realOrganMesh);
          hitTargets.push(realOrganMesh);
        }

        setModelLoaded(true);
      },
      undefined,
      () => {
        // Keep procedural fallback visible if asset fetch ever fails
      }
    );

    // BodyVista "生命律动" Arterial & Neural Signal Flow Particles (NormalBlending for light studio visibility)
    const particleCount = 72;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSeeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      particleSeeds[i] = i / particleCount;
    }
    const particleGeo = trackGeo(new THREE.BufferGeometry());
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleTex = createSoftParticleTexture();
    disposables.push(particleTex);
    const particleMat = trackMat(
      new THREE.PointsMaterial({
        size: 0.038,
        map: particleTex,
        color: 0x0d7a8a,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.NormalBlending,
      })
    );
    const flowPoints = new THREE.Points(particleGeo, particleMat);
    flowPoints.frustumCulled = false;
    flowPoints.renderOrder = 4;
    humanGroup.add(flowPoints);

    // Subtle Grounded Contact Shadow Pedestal (offset >= 0.02 on Y to prevent Z-fighting)
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -1.48, 0);

    const shadowTex = trackMat(
      new THREE.MeshBasicMaterial({
        map: createRadialShadowTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0.92,
      })
    );
    disposables.push(shadowTex.map!);
    const contactDisc = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(1.05, 48)), shadowTex);
    contactDisc.rotation.x = -Math.PI / 2;
    contactDisc.position.y = 0.0;

    const outerArcRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.76, 0.778, 56, 1, 0, Math.PI * 1.45)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xcbd5e1,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        })
      )
    );
    outerArcRing.rotation.x = -Math.PI / 2;
    outerArcRing.position.y = 0.024;

    pedestalGroup.add(contactDisc, outerArcRing);
    scene.add(pedestalGroup);

    // Raycasting on Layer 1 (real BodyVista organ meshes + generous hit proxies)
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };
    let hoveredOrganId: OrganId | null = null;
    let lastHoverRaycast = 0;

    const handlePointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isTapGesture(downPos.x, downPos.y, e.clientX, e.clientY, 6)) return;
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitTargets, false);
      if (hits.length > 0) {
        const id = hits[0].object.userData.organId as OrganId | undefined;
        if (id) onSelectOrganRef.current(id);
      } else if (selectedOrganRef.current !== null) {
        // Tapping empty space dismisses the active organ leader line & callout card
        onResetSelectionRef.current();
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverRaycast < 55) return;
      lastHoverRaycast = now;
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitTargets, false);
      const hitId = hits.length > 0 ? (hits[0].object.userData.organId as OrganId) : null;
      hoveredOrganId = hitId;
      renderer.domElement.style.cursor = hitId ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);

    const resizeObs = new ResizeObserver(() => {
      const w = areaEl.clientWidth;
      const h = areaEl.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObs.observe(areaEl);

    // Project 3D world pin anchors onto 2D hotspot buttons & click-to-reveal leader line
    const updateOverlayProjections = () => {
      const w = areaEl.clientWidth;
      const h = areaEl.clientHeight;
      if (!w || !h) return;
      const showDesktopCallout = w >= 520 && window.innerWidth >= 768;
      const activeId = selectedOrganRef.current;
      const liveRecs = organRecordsRef.current;

      for (const id of ORGAN_ORDER) {
        const pinObj = organPinAnchors[id];
        if (!pinObj) continue;
        pinObj.getWorldPosition(_worldPos);
        _ndcPos.copy(_worldPos).project(camera);

        const sx = (_ndcPos.x * 0.5 + 0.5) * w;
        const sy = (-_ndcPos.y * 0.5 + 0.5) * h;
        const inBounds =
          _ndcPos.z <= 1 && sx >= 18 && sx <= w - 18 && sy >= 18 && sy <= h - 18;

        const dotEl = hotspotRefs.current[id];
        if (dotEl) {
          dotEl.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
          dotEl.style.opacity = inBounds ? '1' : '0';
          dotEl.style.pointerEvents = inBounds ? 'auto' : 'none';
        }

        if (activeId === id) {
          const rec = liveRecs[id];
          const cardEl = activeCardRef.current;
          const lineEl = activeLineRef.current;
          const cardW = 178;
          const cardH = 108;

          if (!showDesktopCallout) {
            if (lineEl) {
              const clampedSx = THREE.MathUtils.clamp(sx, 28, w - 28);
              const clampedSy = THREE.MathUtils.clamp(sy, 24, Math.max(40, h - 84));
              const cardTopY = Math.max(clampedSy + 18, h - 60);
              const targetCardX = THREE.MathUtils.clamp(clampedSx + 26, 72, w - 72);
              lineEl.setAttribute(
                'points',
                `${clampedSx.toFixed(1)},${clampedSy.toFixed(1)} ${targetCardX.toFixed(1)},${(cardTopY - 14).toFixed(1)} ${targetCardX.toFixed(1)},${cardTopY.toFixed(1)}`
              );
            }
          } else {
            const targetY = Math.round(
              THREE.MathUtils.clamp(sy - cardH * 0.5, 58, Math.max(60, h - cardH - 18))
            );
            // Always clear the left-3.5 w-[54px] (x=14..68) vertical BodyVista toolbar on desktop
            const leftSafeX = 76;
            const targetX =
              rec.side === 'left' ? leftSafeX : Math.max(w - cardW - 14, leftSafeX + cardW + 24);

            if (cardEl) {
              cardEl.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
            }
            if (lineEl) {
              const endX = rec.side === 'left' ? targetX + cardW : targetX;
              const endY = targetY + cardH * 0.5;
              const clampedSx = THREE.MathUtils.clamp(sx, 140, w - 140);
              const clampedSy = THREE.MathUtils.clamp(sy, 18, h - 18);
              const elbowX =
                rec.side === 'left'
                  ? Math.min(endX + 14, Math.max(endX + 4, clampedSx - 6))
                  : Math.max(endX - 14, Math.min(endX - 4, clampedSx + 6));
              lineEl.setAttribute(
                'points',
                `${clampedSx.toFixed(1)},${clampedSy.toFixed(1)} ${elbowX.toFixed(1)},${endY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`
              );
            }
          }
        }
      }
    };

    const startTimeMs = performance.now();
    let lastTimeMs = startTimeMs;
    let frameId = 0;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext | null;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (unmounted) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 85);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 85);
      }
    };

    const tick = () => {
      if (unmounted) return;
      if (pausedRef.current) {
        lastTimeMs = performance.now();
        frameId = window.setTimeout(tick, 180);
        return;
      }
      const nowMs = performance.now();
      const dt = Math.min(Math.max((nowMs - lastTimeMs) / 1000, 0.001), 0.1);
      lastTimeMs = nowMs;
      const elapsed = (nowMs - startTimeMs) / 1000;

      const mode = stageModeRef.current;
      const preset = getStageMaterialPreset(mode);
      const curLayers = layersRef.current;
      const activeId = selectedOrganRef.current;
      const isolateDim = Boolean(activeId && dimSurroundingRef.current);
      const surroundFactor = isolateDim ? 0.28 : 1.0;

      bodyShellMat.uniforms.uTime.value = elapsed;
      bodyShellMat.uniforms.uAtlasMix.value = THREE.MathUtils.damp(
        bodyShellMat.uniforms.uAtlasMix.value,
        preset.isAtlasPbr ? 1.0 : 0.0,
        6,
        dt
      );

      // Compute target opacities from BodyVista 4-level layer state
      const targetSkinOp =
        layerLevelToOpacity('skin', curLayers.skin, mode) * (isolateDim ? 0.35 : 1.0);
      const targetMuscOp =
        layerLevelToOpacity('muscular', curLayers.muscular, mode) * surroundFactor;
      const targetSkelOp =
        layerLevelToOpacity('skeletal', curLayers.skeletal, mode) * surroundFactor;
      const targetVascOp =
        layerLevelToOpacity('vascular', curLayers.vascular, mode) * surroundFactor;
      const targetViscBase = layerLevelToOpacity('visceral', curLayers.visceral, mode);
      const targetViscContextOp =
        (preset.isAtlasPbr ? targetViscBase * 0.72 : targetViscBase * preset.visceralOpacity) *
        surroundFactor;

      bodyShellMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
        bodyShellMat.uniforms.uOpacity.value,
        targetSkinOp,
        6.5,
        dt
      );
      bodyWireMat.opacity = THREE.MathUtils.damp(
        bodyWireMat.opacity,
        curLayers.skin > 0 ? preset.wireOpacity * surroundFactor : 0,
        6.5,
        dt
      );
      muscularMat.opacity = THREE.MathUtils.damp(muscularMat.opacity, targetMuscOp, 6.5, dt);
      skeletonMat.opacity = THREE.MathUtils.damp(skeletonMat.opacity, targetSkelOp, 6.5, dt);
      vascularTreeMat.opacity = THREE.MathUtils.damp(vascularTreeMat.opacity, targetVascOp, 6.5, dt);
      visceralContextMat.opacity = THREE.MathUtils.damp(
        visceralContextMat.opacity,
        targetViscContextOp,
        6.5,
        dt
      );

      if (skinMeshRef) skinMeshRef.visible = bodyShellMat.uniforms.uOpacity.value > 0.008;
      if (skinWireRef) skinWireRef.visible = bodyWireMat.opacity > 0.006;
      if (muscularMeshRef) muscularMeshRef.visible = muscularMat.opacity > 0.008;
      if (skeletonMeshRef) skeletonMeshRef.visible = skeletonMat.opacity > 0.008;
      if (vascularMeshRef) vascularMeshRef.visible = vascularTreeMat.opacity > 0.008;
      if (visceralMeshRef) visceralMeshRef.visible = visceralContextMat.opacity > 0.008;

      // Smoothly transition structural colors between Clinical Light Holographic and BodyVista Atlas PBR
      _colorTarget.setHex(preset.isAtlasPbr ? 0xe8dfd1 : 0x7cb0bf);
      skeletonMat.color.lerp(_colorTarget, Math.min(1, dt * 6));
      skeletonMat.emissiveIntensity = THREE.MathUtils.damp(
        skeletonMat.emissiveIntensity,
        preset.isAtlasPbr ? 0.06 : 0.18,
        6,
        dt
      );

      // Keep vertexColors (arterial red + venous blue) vivid in Atlas & Systems modes
      _colorTarget.setHex(preset.isAtlasPbr || mode === 'systems' ? 0xffffff : 0xddeff4);
      vascularTreeMat.color.lerp(_colorTarget, Math.min(1, dt * 6));
      vascularTreeMat.emissiveIntensity = THREE.MathUtils.damp(
        vascularTreeMat.emissiveIntensity,
        preset.isAtlasPbr ? 0.12 : 0.22,
        6,
        dt
      );

      _colorTarget.setHex(preset.isAtlasPbr ? 0xc98a4b : 0x3b9ab2);
      visceralContextMat.color.lerp(_colorTarget, Math.min(1, dt * 6));
      visceralContextMat.emissiveIntensity = THREE.MathUtils.damp(
        visceralContextMat.emissiveIntensity,
        preset.isAtlasPbr ? 0.08 : 0.15,
        6,
        dt
      );

      // Update BodyVista 3-axis anatomical clipping plane
      const axis = sectionAxisRef.current;
      const [minB, maxB] = BODY_AXIS_BOUNDS[axis];
      const clipConst = computeClippingPlaneConstant(sectionPercentRef.current, minB, maxB);
      if (clipConst !== null) {
        clipPlane.normal.set(
          axis === 'x' ? -1 : 0,
          axis === 'y' ? -1 : 0,
          axis === 'z' ? -1 : 0
        );
        if (axis !== 'y') {
          clipPlane.normal.applyAxisAngle(_upAxis, humanGroup.rotation.y);
        }
        clipPlane.constant = clipConst;

        bodyShellMat.uniforms.uClipActive.value = 1.0;
        bodyShellMat.uniforms.uClipNormal.value.copy(clipPlane.normal);
        bodyShellMat.uniforms.uClipConstant.value = clipConst;

        for (const m of clippableStandardMats) {
          if (!m.clippingPlanes || m.clippingPlanes.length === 0) {
            m.clippingPlanes = [clipPlane];
            m.needsUpdate = true;
          }
        }

        sliceIndicatorGroup.visible = true;
        if (axis === 'y') {
          sliceIndicatorGroup.position.set(0, clipConst, 0);
          sliceIndicatorGroup.rotation.set(Math.PI / 2, 0, 0);
          sliceIndicatorGroup.scale.set(0.95, 0.55, 1);
        } else if (axis === 'x') {
          sliceIndicatorGroup.position.set(clipConst, 0.22, 0);
          sliceIndicatorGroup.rotation.set(0, Math.PI / 2, 0);
          sliceIndicatorGroup.scale.set(0.55, 2.45, 1);
        } else {
          sliceIndicatorGroup.position.set(0, 0.22, clipConst);
          sliceIndicatorGroup.rotation.set(0, 0, 0);
          sliceIndicatorGroup.scale.set(1.02, 2.45, 1);
        }
      } else {
        bodyShellMat.uniforms.uClipActive.value = 0.0;
        sliceIndicatorGroup.visible = false;
        for (const m of clippableStandardMats) {
          if (m.clippingPlanes && m.clippingPlanes.length > 0) {
            m.clippingPlanes = [];
            m.needsUpdate = true;
          }
        }
      }

      // Rotate human gently or align to orientation preset / organ focus
      if (autoRotateRef.current) {
        humanGroup.rotation.y += dt * 0.34;
      } else if (orientationTargetYawRef.current !== null) {
        humanGroup.rotation.y = THREE.MathUtils.damp(
          humanGroup.rotation.y,
          orientationTargetYawRef.current,
          6,
          dt
        );
        if (Math.abs(humanGroup.rotation.y - orientationTargetYawRef.current) < 0.008) {
          humanGroup.rotation.y = orientationTargetYawRef.current;
          orientationTargetYawRef.current = null;
        }
      } else if (resetRequestedRef.current) {
        humanGroup.rotation.y = THREE.MathUtils.damp(humanGroup.rotation.y, 0, 5.5, dt);
      }

      // Smooth camera focus or reset transition
      const defaultZ = getDefaultCamZ();
      if (resetRequestedRef.current) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, DEFAULT_CAM_POS.x, 5.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, DEFAULT_CAM_POS.y, 5.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, defaultZ, 5.5, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, DEFAULT_LOOK_AT.x, 5.5, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, DEFAULT_LOOK_AT.y, 5.5, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, DEFAULT_LOOK_AT.z, 5.5, dt);
        if (
          Math.abs(camera.position.z - defaultZ) < 0.03 &&
          Math.abs(camera.position.y - DEFAULT_CAM_POS.y) < 0.03
        ) {
          resetRequestedRef.current = false;
        }
      } else if (cameraAnimatingRef.current && activeId) {
        const rec = ORGAN_RECORDS[activeId];
        _targetLookAt.set(
          rec.pos[0] * 0.5,
          THREE.MathUtils.clamp(rec.pos[1], -0.65, 1.38),
          0
        );
        _targetCamPos.set(
          rec.camOffset[0],
          THREE.MathUtils.clamp(rec.pos[1] * 0.58 + rec.camOffset[1], -0.28, 1.32),
          rec.camOffset[2] + 1.4
        );
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 5, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLookAt.x, 5, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLookAt.y, 5, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLookAt.z, 5, dt);
        if (camera.position.distanceTo(_targetCamPos) < 0.04) {
          cameraAnimatingRef.current = false;
        }
      }

      // Physiological organ micro-animations (76 BPM heartbeat & gentle lung respiration)
      const heartGrp = organGroups.heart;
      if (heartGrp) {
        const beat = 1 + 0.072 * Math.pow(Math.max(0, Math.sin(elapsed * 4.0)), 4);
        heartGrp.scale.setScalar(beat);
      }
      const lungGrp = organGroups.lungs;
      if (lungGrp) {
        const breath = 1 + 0.032 * Math.sin(elapsed * 1.65);
        lungGrp.scale.set(breath, breath * 0.99, breath);
      }

      // Update radial BodyVista Explode offsets & organ PBR/Holographic materials
      const explodeVal = explodePercentRef.current;
      for (const id of ORGAN_ORDER) {
        const grp = organGroups[id];
        const mat = organMaterials[id];
        const pal = ORGAN_PALETTES[id];
        const baseP = organBasePositions[id];
        const [ox, oy, oz] = computeExplodeOffset(ORGAN_RECORDS[id].pos, explodeVal);

        grp.position.x = THREE.MathUtils.damp(grp.position.x, baseP[0] + ox, 6.5, dt);
        grp.position.y = THREE.MathUtils.damp(grp.position.y, baseP[1] + oy, 6.5, dt);
        grp.position.z = THREE.MathUtils.damp(grp.position.z, baseP[2] + oz, 6.5, dt);

        const isTarget = id === activeId || id === hoveredOrganId;
        const organLayerKey: BodyVistaLayerKey =
          id === 'bone' ? 'skeletal' : id === 'vascular' ? 'vascular' : 'visceral';
        const layerOp = layerLevelToOpacity(organLayerKey, curLayers[organLayerKey], mode);

        const desiredOp = isTarget
          ? 0.98
          : isolateDim
          ? Math.min(0.22, layerOp)
          : id === 'bone' || id === 'vascular'
          ? layerOp
          : Math.max(layerOp, curLayers[organLayerKey] > 0 ? 0.88 : 0);

        mat.opacity = THREE.MathUtils.damp(mat.opacity, desiredOp, 7, dt);
        mat.depthWrite = mat.opacity > 0.92;
        grp.visible = mat.opacity > 0.01;

        _colorTarget.setHex(preset.isAtlasPbr ? pal.atlasColor : pal.holoColor);
        mat.color.lerp(_colorTarget, Math.min(1, dt * 6));

        if (isTarget) {
          _emissiveTarget.setHex(
            organRecordsRef.current[id].severity === 'alert'
              ? 0xdc2626
              : organRecordsRef.current[id].severity === 'caution'
              ? 0xd97706
              : 0x0d7a8a
          );
        } else {
          _emissiveTarget.setHex(preset.isAtlasPbr ? pal.atlasEmissive : pal.holoEmissive);
        }
        mat.emissive.lerp(_emissiveTarget, Math.min(1, dt * 7));

        const baseEmissive = preset.isAtlasPbr
          ? organRecordsRef.current[id].severity !== 'normal'
            ? 0.28
            : 0.12
          : organRecordsRef.current[id].severity !== 'normal'
          ? 0.48
          : 0.26;
        mat.emissiveIntensity = THREE.MathUtils.damp(
          mat.emissiveIntensity,
          isTarget ? 0.92 : baseEmissive * (isolateDim ? 0.35 : 1),
          8,
          dt
        );
      }

      // Advance BodyVista physiological flow particles along aorta, carotids, and femoral vessels
      const showFlow = flowParticlesRef.current && curLayers.vascular > 0 && sectionPercentRef.current < 90;
      flowPoints.visible = showFlow;
      if (showFlow) {
        const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          const phase = (particleSeeds[i] + elapsed * 0.24) % 1;
          const lane = i % 4;
          let px = 0;
          let py = 0;
          let pz = -0.02;
          if (lane === 0) {
            py = 1.05 - phase * 1.85;
            px = phase > 0.42 ? -(phase - 0.42) * 0.26 : 0.015 * Math.sin(phase * 9);
            pz = -0.03 + 0.02 * Math.cos(phase * 6);
          } else if (lane === 1) {
            py = 1.05 - phase * 1.85;
            px = phase > 0.42 ? (phase - 0.42) * 0.26 : -0.015 * Math.sin(phase * 9);
            pz = -0.03 + 0.02 * Math.sin(phase * 6);
          } else if (lane === 2) {
            py = 0.92 + phase * 0.68;
            px = (i % 8 < 4 ? 1 : -1) * (0.025 + phase * 0.045);
            pz = 0.01 - phase * 0.05;
          } else {
            const ang = phase * Math.PI * 2;
            px = Math.cos(ang) * 0.13;
            py = 0.96 + Math.sin(ang) * 0.09;
            pz = 0.02 * Math.sin(ang * 2);
          }
          arr[i * 3] = px;
          arr[i * 3 + 1] = py;
          arr[i * 3 + 2] = pz;
        }
        posAttr.needsUpdate = true;
      }

      outerArcRing.rotation.z = elapsed * 0.32;

      controls.update();
      humanGroup.updateMatrixWorld(true);
      renderer.render(scene, camera);
      updateOverlayProjections();

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      unmounted = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObs.disconnect();
      controls.removeEventListener('start', handleControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, []);

  const handleToggleAutoRotate = () => {
    const next = !autoRotateUi;
    autoRotateRef.current = next;
    if (next) orientationTargetYawRef.current = null;
    setAutoRotateUi(next);
  };

  const handleResetView = () => {
    cameraAnimatingRef.current = false;
    orientationTargetYawRef.current = 0;
    resetRequestedRef.current = true;
    onResetSelection();
  };

  const handleSelectOrientation = (preset: OrientationPreset) => {
    autoRotateRef.current = false;
    setAutoRotateUi(false);
    cameraAnimatingRef.current = false;
    resetRequestedRef.current = true;
    const yawMap: Record<OrientationPreset, number> = {
      front: 0,
      back: Math.PI,
      left: Math.PI * 0.5,
      right: -Math.PI * 0.5,
    };
    orientationTargetYawRef.current = yawMap[preset];
  };

  const handleChangeLayer = (key: BodyVistaLayerKey, level: BodyVistaLayerLevel) => {
    if (externalOnChangeLayer) {
      externalOnChangeLayer(key, level);
    } else {
      setInternalLayers((prev) => {
        const next = { ...prev, [key]: level };
        layersRef.current = next;
        return next;
      });
    }
  };

  const handlePeelDissectToggle = () => {
    setActiveTool((prev) => (prev === 'dissect' ? 'browse' : 'dissect'));
    if (layers.skin > 0 || layers.muscular > 1) {
      handleChangeLayer('skin', 0);
      handleChangeLayer('muscular', 1);
    } else {
      const defaults = getDefaultLayersForMode(stageMode);
      handleChangeLayer('skin', defaults.skin);
      handleChangeLayer('muscular', defaults.muscular);
    }
  };

  const handleResetWorkbench = () => {
    const defaultLayers = getDefaultLayersForMode(stageMode);
    if (externalOnChangeLayer) {
      (Object.keys(defaultLayers) as BodyVistaLayerKey[]).forEach((k) => {
        externalOnChangeLayer(k, defaultLayers[k]);
      });
    } else {
      setInternalLayers(defaultLayers);
      layersRef.current = defaultLayers;
    }
    setActiveTool('browse');
    setSectionPercent(0);
    sectionPercentRef.current = 0;
    setExplodePercent(0);
    explodePercentRef.current = 0;
    setFlowParticles(false);
    flowParticlesRef.current = false;
    setDimSurrounding(true);
    dimSurroundingRef.current = true;
    handleResetView();
  };

  const handleToggleMobileScrollLock = () => {
    const nextPassthrough = !mobileScrollPassthrough;
    setMobileScrollPassthrough(nextPassthrough);
    if (controlsRef.current) {
      controlsRef.current.enabled = !nextPassthrough;
      if (controlsRef.current.domElement) {
        controlsRef.current.domElement.style.touchAction = nextPassthrough ? 'pan-y' : 'none';
      }
    }
  };

  const hasActiveDissection = sectionPercent > 0 || explodePercent > 0;

  return (
    <div
      id="human-3d-stage"
      data-stage-mode={stageMode}
      data-selected-organ={selectedOrgan ?? 'none'}
      data-bodyvista-loaded={modelLoaded ? 'true' : 'loading'}
      data-section-percent={sectionPercent}
      data-explode-percent={explodePercent}
      className="relative flex-1 h-full flex flex-col bg-[#f4f6f8] border border-[#dce5ec] rounded-2xl overflow-hidden min-h-[440px] md:min-h-[640px]"
    >
      {/* Top Display Mode Segmented Control */}
      {!zenMode && (
        <div className="relative z-20 pt-3 px-3.5 flex items-center justify-center md:justify-end">
          <div
            role="tablist"
            aria-label="3D人体显示模式"
            className="inline-flex items-center bg-white/95 border border-[#dce5ec] rounded-xl p-1 gap-1 shadow-[0_2px_10px_rgba(15,23,42,0.04)] max-w-full overflow-x-auto no-scrollbar"
          >
            {(
              [
                { id: 'atlas', label: '解剖图谱' },
                { id: 'systems', label: '系统分层' },
                { id: 'overview', label: '全息概览' },
                { id: 'xray', label: '透视模式' },
              ] as const
            ).map((tab) => {
              const active = stageMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onChangeStageMode(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#eaf5f7] text-[#0d7a8a] border border-[#9fd0d9]'
                      : 'text-slate-600 hover:text-[#0d7a8a] hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dedicated WebGL Canvas + BodyVista Floating Vertical Toolbar + Projected Overlays */}
      <div
        ref={viewportAreaRef}
        className="relative flex-1 w-full overflow-hidden h-[360px] sm:h-[430px] md:h-auto md:min-h-[500px]"
      >
        {/* Isolated WebGL Mount Container */}
        <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

        {webglFallback && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#f4f6f8]">
            <p className="text-sm font-semibold text-slate-800 mb-1">当前设备暂未开启 3D 硬件加速</p>
            <p className="text-xs text-slate-500 max-w-xs">
              您仍可通过下方器官列表点击查看完整临床评估数据与干预方案。
            </p>
          </div>
        )}

        {/* BodyVista Signature Left Floating Vertical Tool Strip (Desktop) */}
        {!zenMode && (
          <div
            role="toolbar"
            aria-label="BodyVista 三维交互工具栏"
            className="hidden md:flex flex-col items-center gap-1 absolute left-3.5 top-2 z-20 bg-white/95 border border-[#dce5ec] rounded-2xl p-1.5 shadow-[0_6px_22px_rgba(15,23,42,0.06)] w-[54px]"
          >
            <button
              type="button"
              onClick={() => setActiveTool('browse')}
              aria-pressed={activeTool === 'browse'}
              className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                activeTool === 'browse'
                  ? 'bg-[#e2f2f5] border border-[#8ac6d1] text-[#0d7a8a] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Hand className="w-4 h-4 stroke-[1.75]" />
              <span>浏览</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('select')}
              aria-pressed={activeTool === 'select'}
              className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                activeTool === 'select'
                  ? 'bg-[#e2f2f5] border border-[#8ac6d1] text-[#0d7a8a] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <MousePointer className="w-4 h-4 stroke-[1.75]" />
              <span>选择</span>
            </button>

            <button
              type="button"
              onClick={handlePeelDissectToggle}
              aria-pressed={activeTool === 'dissect'}
              className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                activeTool === 'dissect'
                  ? 'bg-[#e2f2f5] border border-[#8ac6d1] text-[#0d7a8a] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Scissors className="w-4 h-4 stroke-[1.75]" />
              <span>解剖</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool((prev) => (prev === 'slice' ? 'browse' : 'slice'))}
              aria-pressed={activeTool === 'slice' || sectionPercent > 0}
              className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                activeTool === 'slice' || sectionPercent > 0
                  ? 'bg-[#e2f2f5] border border-[#8ac6d1] text-[#0d7a8a] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Grid2x2 className="w-4 h-4 stroke-[1.75]" />
              <span>剖切</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool((prev) => (prev === 'explode' ? 'browse' : 'explode'))}
              aria-pressed={activeTool === 'explode' || explodePercent > 0}
              className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                activeTool === 'explode' || explodePercent > 0
                  ? 'bg-[#e2f2f5] border border-[#8ac6d1] text-[#0d7a8a] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Layers className="w-4 h-4 stroke-[1.75]" />
              <span>拆解</span>
            </button>

            <button
              type="button"
              onClick={() => setFlowParticles((prev) => !prev)}
              aria-pressed={flowParticles}
              className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                flowParticles
                  ? 'bg-[#e2f2f5] border border-[#8ac6d1] text-[#0d7a8a] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Activity className="w-4 h-4 stroke-[1.75]" />
              <span>律动</span>
            </button>

            <div className="w-8 h-px bg-[#e2e8f0] my-0.5" aria-hidden="true" />

            <button
              type="button"
              onClick={handleResetWorkbench}
              aria-label="复位三维视图与解剖状态"
              className="w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-medium bg-[#eaf5f7] hover:bg-[#d8ecf0] text-[#0d7a8a] transition-colors"
            >
              <RotateCcw className="w-4 h-4 stroke-[1.75]" />
              <span>复位</span>
            </button>
          </div>
        )}

        {/* Mobile Mini-Program Right-Side Floating Thumb Rail (44x44px hitboxes) */}
        {!zenMode && (
          <div
            role="toolbar"
            aria-label="小程序三维快捷手势栏"
            className="md:hidden flex flex-col items-center gap-1.5 absolute right-2.5 top-2 z-20"
          >
            {onOpenMobileSystemsSheet && (
              <button
                type="button"
                onClick={onOpenMobileSystemsSheet}
                aria-label="打开人体系统分层抽屉"
                className="min-w-[44px] min-h-[44px] rounded-2xl bg-white/95 border border-[#dce5ec] shadow-sm flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-slate-700 active:scale-95 transition-transform"
              >
                <Layers className="w-4 h-4 text-[#0d7a8a]" />
                <span>分层</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setWorkbenchOpen(true)}
              aria-label="打开剖切与拆解控制抽屉"
              className={`min-w-[44px] min-h-[44px] rounded-2xl border shadow-sm flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold active:scale-95 transition-transform ${
                hasActiveDissection
                  ? 'bg-[#eaf5f7] border-[#8ac6d1] text-[#0d7a8a]'
                  : 'bg-white/95 border-[#dce5ec] text-slate-700'
              }`}
            >
              <Scissors className="w-4 h-4 text-[#0d7a8a]" />
              <span>剖切</span>
            </button>

            <button
              type="button"
              onClick={handleToggleMobileScrollLock}
              aria-label={mobileScrollPassthrough ? '恢复三维旋转手势' : '锁定三维开启页面上下滑屏'}
              className={`min-w-[44px] min-h-[44px] rounded-2xl border shadow-sm flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold active:scale-95 transition-transform ${
                mobileScrollPassthrough
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white/95 border-[#dce5ec] text-slate-700'
              }`}
            >
              <Hand className="w-4 h-4 text-[#0d7a8a]" />
              <span>{mobileScrollPassthrough ? '已锁' : '滑屏'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetWorkbench}
              aria-label="复位三维人体视角"
              className="min-w-[44px] min-h-[44px] rounded-2xl bg-white/95 border border-[#dce5ec] shadow-sm flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-[#0d7a8a] active:scale-95 transition-transform"
            >
              <RotateCcw className="w-4 h-4" />
              <span>复位</span>
            </button>
          </div>
        )}

        {/* Compact Floating Popover next to Vertical Toolbar when Slice or Explode is active */}
        {!zenMode && (activeTool === 'slice' || activeTool === 'explode') && (
          <div
            role="region"
            aria-label="剖切与拆解参数浮窗"
            className="hidden md:block absolute left-[76px] top-16 z-30 w-60 bg-white/98 border border-[#dce5ec] rounded-xl p-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                {activeTool === 'slice' ? '三维断面剖切' : '器官径向拆解'}
              </span>
              <button
                type="button"
                onClick={() => setActiveTool('browse')}
                aria-label="关闭剖切拆解浮窗"
                className="text-slate-400 hover:text-slate-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeTool === 'slice' ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-1 bg-[#edf2f6] p-0.5 rounded-lg border border-[#dce5ec]">
                  {(
                    [
                      { id: 'y', label: '横断 Y' },
                      { id: 'x', label: '矢状 X' },
                      { id: 'z', label: '冠状 Z' },
                    ] as const
                  ).map((ax) => (
                    <button
                      key={ax.id}
                      type="button"
                      onClick={() => setSectionAxis(ax.id)}
                      className={`py-1 rounded-md text-[11px] font-medium transition-colors ${
                        sectionAxis === ax.id
                          ? 'bg-white text-[#0d7a8a] font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {ax.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sectionPercent}
                    aria-label="浮窗剖切深度百分比"
                    onChange={(e) => setSectionPercent(Number(e.target.value))}
                    className="flex-1 accent-[#0d7a8a] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs font-num font-semibold text-[#0d7a8a] w-9 text-right">
                    {sectionPercent}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={explodePercent}
                  aria-label="浮窗器官拆解百分比"
                  onChange={(e) => setExplodePercent(Number(e.target.value))}
                  className="flex-1 accent-[#0d7a8a] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-num font-semibold text-[#0d7a8a] w-9 text-right">
                  {explodePercent}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Click-to-Reveal Desktop Leader Line & Clinical White Floating Callout Card (0 lines initially!) */}
        {!zenMode && selectedOrgan && (() => {
          const rec = organRecords[selectedOrgan];
          const primaryMetric = rec.metrics[0];
          const strokeColor =
            rec.severity === 'alert'
              ? '#dc2626'
              : rec.severity === 'caution'
              ? '#d97706'
              : '#0d7a8a';

          return (
            <>
              <svg
                aria-hidden="true"
                data-testid="active-leader-svg"
                className="block absolute inset-0 w-full h-full pointer-events-none z-10"
              >
                <polyline
                  ref={activeLineRef}
                  data-testid="active-leader-line"
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div className="hidden md:block absolute inset-0 pointer-events-none z-20">
                <div
                  ref={activeCardRef}
                  role="region"
                  aria-label={`${rec.name}三维关联浮窗`}
                  className={`pointer-events-auto absolute top-0 left-0 w-[178px] p-2.5 rounded-xl bg-white/98 shadow-[0_8px_24px_rgba(15,23,42,0.09)] border transition-colors text-slate-900 ${
                    rec.severity === 'alert'
                      ? 'border-red-300'
                      : rec.severity === 'caution'
                      ? 'border-amber-300'
                      : 'border-[#8ac6d1]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          rec.severity === 'alert'
                            ? 'bg-red-50 text-red-600'
                            : rec.severity === 'caution'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-[#eaf5f7] text-[#0d7a8a]'
                        }`}
                      >
                        <OrganIcon organId={selectedOrgan} className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight text-slate-900 truncate">
                          {rec.name} · <span className="font-num">{rec.score}分</span>
                        </div>
                        <div
                          className={`text-[11px] font-semibold leading-tight mt-0.5 truncate ${
                            rec.severity === 'alert'
                              ? 'text-red-600'
                              : rec.severity === 'caution'
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {rec.statusLabel}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onResetSelection}
                      aria-label="收起器官引线浮窗"
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {primaryMetric && (
                    <div className="mt-2 pt-1.5 border-t border-[#e8eef3] text-[11px] flex items-center justify-between gap-1">
                      <span className="text-slate-500 truncate">{primaryMetric.label}</span>
                      <strong className="font-num text-slate-900 shrink-0">
                        {primaryMetric.value}
                      </strong>
                    </div>
                  )}

                  {onOpenOrganDetail && (
                    <button
                      type="button"
                      onClick={() => onOpenOrganDetail(selectedOrgan)}
                      className="mt-2 w-full py-1 px-2 rounded-lg text-[11px] font-semibold bg-[#eaf5f7] hover:bg-[#d8ecf0] border border-[#b5dce3] text-[#0d7a8a] flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                    >
                      <span>查看专项详情</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Compact Click-to-Reveal Organ Callout Card */}
              <div
                data-testid="active-organ-callout"
                className="md:hidden absolute left-2.5 right-2.5 bottom-2 z-30 bg-white/98 border border-[#8ac6d1] shadow-md rounded-2xl px-3 py-2 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <OrganIcon organId={selectedOrgan} className="w-4 h-4 text-[#0d7a8a] shrink-0" />
                  <div className="min-w-0 text-xs">
                    <span className="font-bold text-slate-900">{rec.name}</span>
                    <span className="text-slate-300 mx-1">·</span>
                    <span
                      className={
                        rec.severity !== 'normal'
                          ? 'text-amber-700 font-semibold'
                          : 'text-emerald-700 font-semibold'
                      }
                    >
                      {rec.statusLabel}
                    </span>
                    <span className="text-slate-300 mx-1">·</span>
                    <span className="font-num text-slate-600">{rec.score}分</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onOpenOrganDetail && (
                    <button
                      type="button"
                      onClick={() => onOpenOrganDetail(selectedOrgan)}
                      className="min-h-[36px] px-3 py-1 rounded-xl text-xs font-semibold bg-[#0d7a8a] text-white active:scale-95 transition-transform whitespace-nowrap"
                    >
                      查看详情
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onResetSelection}
                    aria-label="收起移动端器官提示"
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          );
        })()}

        {/* Projected 3D Organ Hotspot Pins (discreet clinical markers on light anatomy; ring highlights when selected) */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {ORGAN_ORDER.map((id) => {
            const rec = organRecords[id];
            const isSelected = selectedOrgan === id;
            const pinColor =
              rec.severity === 'alert'
                ? 'bg-red-500 border-white'
                : rec.severity === 'caution'
                ? 'bg-amber-500 border-white'
                : 'bg-[#0d7a8a] border-white';

            return (
              <button
                key={id}
                type="button"
                ref={(el) => {
                  hotspotRefs.current[id] = el;
                }}
                onClick={() => onSelectOrgan(id)}
                aria-label={`点击3D${rec.name}热点（${rec.statusLabel}）`}
                className="pointer-events-auto absolute top-0 left-0 -ml-5.5 -mt-5.5 w-11 h-11 md:-ml-3.5 md:-mt-3.5 md:w-7 md:h-7 flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7a8a] group"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full border-[1.5px] shadow-xs transition-transform group-hover:scale-125 ${pinColor} ${
                    isSelected
                      ? 'scale-135 ring-4 ring-[#0d7a8a]/30'
                      : activeTool === 'select'
                      ? 'scale-110'
                      : 'opacity-85 group-hover:opacity-100'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Inline BodyVista Workbench */}
      {!zenMode && (
        <div className="hidden md:block">
          <BodyVistaWorkbench
            open={workbenchOpen}
            layers={layers}
            onChangeLayer={handleChangeLayer}
            sectionAxis={sectionAxis}
            onChangeSectionAxis={setSectionAxis}
            sectionPercent={sectionPercent}
            onChangeSectionPercent={setSectionPercent}
            explodePercent={explodePercent}
            onChangeExplodePercent={setExplodePercent}
            flowParticles={flowParticles}
            onToggleFlowParticles={() => setFlowParticles((prev) => !prev)}
            dimSurrounding={dimSurrounding}
            onToggleDimSurrounding={() => setDimSurrounding((prev) => !prev)}
            onSelectOrientation={handleSelectOrientation}
            onResetWorkbench={handleResetWorkbench}
          />
        </div>
      )}

      {/* Mobile Mini-Program Bottom Sheet for Cross-Section Slice & Explode */}
      {workbenchOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-900/40 flex items-end justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWorkbenchOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="移动端解剖剖切与拆解抽屉"
        >
          <div className="w-full bg-white rounded-t-3xl border-t border-[#dce5ec] px-4 pt-2.5 pb-6 shadow-2xl space-y-4">
            <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto my-1.5" aria-hidden="true" />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">三维剖切与器官拆解</h3>
                <p className="text-xs text-slate-500">支持三轴断面观察、结构拆解与多视角切换</p>
              </div>
              <button
                type="button"
                onClick={() => setWorkbenchOpen(false)}
                aria-label="关闭移动端解剖控制抽屉"
                className="min-w-[44px] min-h-[44px] -mr-1.5 rounded-full flex items-center justify-center text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <BodyVistaWorkbench
              open={true}
              layers={layers}
              onChangeLayer={handleChangeLayer}
              sectionAxis={sectionAxis}
              onChangeSectionAxis={setSectionAxis}
              sectionPercent={sectionPercent}
              onChangeSectionPercent={setSectionPercent}
              explodePercent={explodePercent}
              onChangeExplodePercent={setExplodePercent}
              flowParticles={flowParticles}
              onToggleFlowParticles={() => setFlowParticles((prev) => !prev)}
              dimSurrounding={dimSurrounding}
              onToggleDimSurrounding={() => setDimSurrounding((prev) => !prev)}
              onSelectOrientation={handleSelectOrientation}
              onResetWorkbench={handleResetWorkbench}
            />

            <button
              type="button"
              onClick={() => setWorkbenchOpen(false)}
              className="w-full min-h-[48px] rounded-xl text-sm font-semibold bg-[#0d7a8a] text-white active:scale-[0.98] transition-transform"
            >
              完成并返回 3D 视图
            </button>
          </div>
        </div>
      )}

      {/* Mobile Exclusive: Horizontal Touch-Friendly Organ Quick Bar (< 768px, 44px touch height) */}
      <div
        aria-label="移动端器官快速定位栏"
        className="md:hidden flex items-center gap-2 px-3 py-2.5 overflow-x-auto no-scrollbar bg-white border-t border-[#dce5ec]"
      >
        {ORGAN_ORDER.map((id) => {
          const rec = organRecords[id];
          const isSelected = selectedOrgan === id;
          const isWarn = rec.severity !== 'normal';
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectOrgan(id)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 border active:scale-[0.97] transition-all ${
                isSelected
                  ? 'bg-[#0d7a8a] border-[#0d7a8a] text-white shadow-2xs'
                  : isWarn
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-[#f8fafc] border-[#dce5ec] text-slate-700'
              }`}
            >
              <OrganIcon organId={id} className="w-4 h-4" />
              <span>{rec.name}</span>
              <span className="text-[11px] opacity-85 font-num">{rec.score}</span>
            </button>
          );
        })}
      </div>

      {/* Unified Bottom Control Dock (Desktop/Tablet >= 768px) */}
      <div className="hidden md:flex relative z-20 items-center justify-between gap-2 px-3.5 py-2.5 bg-white border-t border-[#dce5ec] flex-wrap">
        <span className="text-xs text-slate-500 hidden lg:inline">
          点击器官或指标唤出三维引线与评估卡 · 支持旋转、剖切、拆解与系统分层
        </span>

        <div className="flex items-center gap-1 sm:gap-1.5 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <button
              type="button"
              aria-expanded={workbenchOpen}
              onClick={() => {
                setZenMode(false);
                setWorkbenchOpen((prev) => !prev);
              }}
              className={`min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium inline-flex items-center gap-1 sm:gap-1.5 border transition-colors whitespace-nowrap shrink-0 ${
                workbenchOpen || hasActiveDissection
                  ? 'bg-[#eaf5f7] border-[#8ac6d1] text-[#0d7a8a] font-semibold'
                  : 'bg-[#f8fafc] border-[#dce5ec] text-slate-700 hover:text-[#0d7a8a]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>解剖控制</span>
            </button>

            <button
              type="button"
              onClick={handleToggleAutoRotate}
              aria-label="切换自动旋转"
              className={`min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium inline-flex items-center gap-1 sm:gap-1.5 border transition-colors whitespace-nowrap shrink-0 ${
                autoRotateUi
                  ? 'bg-[#eaf5f7] border-[#8ac6d1] text-[#0d7a8a] font-semibold'
                  : 'bg-[#f8fafc] border-[#dce5ec] text-slate-700 hover:text-[#0d7a8a]'
              }`}
            >
              <Orbit className="w-3.5 h-3.5 shrink-0" />
              <span>
                <span className="hidden sm:inline">自动</span>旋转
              </span>
            </button>

            <button
              type="button"
              onClick={handleResetView}
              aria-label="重置视角"
              className="min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium inline-flex items-center gap-1 sm:gap-1.5 bg-[#f8fafc] hover:bg-[#eaf5f7] border border-[#dce5ec] text-slate-700 hover:text-[#0d7a8a] transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>
                重置<span className="hidden sm:inline">视角</span>
              </span>
            </button>

            {/* Mobile Scroll-Lock Toggle */}
            <button
              type="button"
              onClick={handleToggleMobileScrollLock}
              className={`md:hidden min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium inline-flex items-center gap-1 border transition-colors whitespace-nowrap shrink-0 ${
                mobileScrollPassthrough
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                  : 'bg-[#f8fafc] border-[#dce5ec] text-slate-700'
              }`}
            >
              <Hand className="w-3.5 h-3.5 shrink-0" />
              <span>{mobileScrollPassthrough ? '恢复3D' : '允许滑屏'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setZenMode((prev) => !prev)}
            aria-label={zenMode ? '展开3D标注浮层' : '收起3D标注浮层'}
            className="min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium inline-flex items-center gap-1 bg-[#f8fafc] hover:bg-[#eaf5f7] border border-[#dce5ec] text-slate-700 hover:text-[#0d7a8a] transition-colors whitespace-nowrap shrink-0"
          >
            {zenMode ? <Eye className="w-3.5 h-3.5 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 shrink-0" />}
            <span className="hidden sm:inline">{zenMode ? '显示标注' : '纯净视图'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
