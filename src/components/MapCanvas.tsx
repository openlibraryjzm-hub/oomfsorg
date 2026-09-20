import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapSettings, Region, UserAccount } from '../types/map';
import { drawRegionTexture } from '../utils/partitionEngine';

interface MapCanvasProps {
  settings: MapSettings;
  users: UserAccount[];
  tiles: Region[];
  onSelectUser: (id: number | null) => void;
  onHoverUser: (id: number | null, pos?: { x: number; y: number }) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  settings,
  users,
  tiles,
  onSelectUser,
  onHoverUser,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Mutable ref for settings so animation loop always reads latest state
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // 1. Initialize Native 3D Three.js Globe Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene Setup: Calm Blue Sky Atmospheric Skysphere
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Calm Blue Sky Shader Skysphere (Floating in atmosphere, no black bottom, zero rings)
    const skysphereGeo = new THREE.SphereGeometry(500, 64, 32);
    const skysphereMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color('#0c4a6e') },      // Deep Calm Azure Zenith
        midColor: { value: new THREE.Color('#0284c7') },      // Cerulean Sky Blue
        horizonColor: { value: new THREE.Color('#bae6fd') },  // Soft Hazy Pastel Horizon Light
        bottomColor: { value: new THREE.Color('#0369a1') },   // Calm Lower Atmosphere Blue (No Black!)
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPosition;
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;

        void main() {
          float h = normalize(vWorldPosition).y;
          vec3 finalColor;

          if (h > 0.0) {
            float mixFactor = smoothstep(0.0, 0.7, h);
            finalColor = mix(horizonColor, topColor, mixFactor);
            float skyFactor = sin(smoothstep(0.0, 0.9, h) * 3.14159);
            finalColor = mix(finalColor, midColor, skyFactor * 0.35);
          } else {
            float mixFactor = smoothstep(0.0, -0.8, h);
            finalColor = mix(horizonColor, bottomColor, mixFactor);
          }

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
    const skysphereMesh = new THREE.Mesh(skysphereGeo, skysphereMat);
    scene.add(skysphereMesh);

    // 3D Perspective Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 6.5);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Full 3D Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 15;
    controls.minDistance = 2.4;
    controls.rotateSpeed = 0.8;
    controlsRef.current = controls;

    // 3D Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    // Initial Texture (4K Resolution for Sharp Crisp Tile Images)
    const initialCanvas = drawRegionTexture(
      users,
      tiles,
      4096,
      2048,
      settings.hoveredUserId,
      settings.selectedUserId,
      settings.theme,
      settings.showGrid
    );
    const texture = new THREE.CanvasTexture(initialCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    textureRef.current = texture;

    // Native 3D Globe Mesh Geometry
    const radius = 2.0;
    const geometry = new THREE.SphereGeometry(radius, 120, 60);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const currentSettings = settingsRef.current;

      // Auto Rotation for sphere globe
      if (currentSettings.autoRotate && meshRef.current) {
        meshRef.current.rotation.y += 0.003;
      }

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }
    };
  }, []);

  // 2. Update Canvas Texture when users, tiles, selection, hover, theme, or grid toggles
  useEffect(() => {
    if (!textureRef.current) return;

    const handleImageLoaded = () => {
      if (textureRef.current) {
        textureRef.current.image = drawRegionTexture(
          users,
          tiles,
          4096,
          2048,
          settings.hoveredUserId,
          settings.selectedUserId,
          settings.theme,
          settings.showGrid
        );
        textureRef.current.needsUpdate = true;
      }
    };

    const newCanvas = drawRegionTexture(
      users,
      tiles,
      4096,
      2048,
      settings.hoveredUserId,
      settings.selectedUserId,
      settings.theme,
      settings.showGrid,
      handleImageLoaded
    );

    textureRef.current.image = newCanvas;
    textureRef.current.needsUpdate = true;
  }, [users, tiles, settings.hoveredUserId, settings.selectedUserId, settings.theme, settings.showGrid]);

  // 3. Ceramic White Background update
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color('#f8fafc');
    }
  }, []);

  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 4. Pointer Raycasting on Native 3D Sphere Surface
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current || !cameraRef.current || !meshRef.current || tiles.length === 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(meshRef.current);

    if (intersects.length > 0 && intersects[0].uv) {
      const uv = intersects[0].uv;
      const u = uv.x;
      const v = 1.0 - uv.y;

      const foundTile = findTileByUV(u, v, tiles);
      if (foundTile) {
        onHoverUser(foundTile.ownerUserId, { x: e.clientX, y: e.clientY });
        return;
      }
    }

    onHoverUser(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Ignore click if the mouse moved more than 5px (drag/orbit gesture)
    const dx = e.clientX - pointerDownPosRef.current.x;
    const dy = e.clientY - pointerDownPosRef.current.y;
    const dragDistance = Math.hypot(dx, dy);
    if (dragDistance > 5) return;

    if (!containerRef.current || !cameraRef.current || !meshRef.current || tiles.length === 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(meshRef.current);

    if (intersects.length > 0 && intersects[0].uv) {
      const uv = intersects[0].uv;
      const u = uv.x;
      const v = 1.0 - uv.y;

      const foundTile = findTileByUV(u, v, tiles);
      if (foundTile) {
        onSelectUser(foundTile.ownerUserId === settings.selectedUserId ? null : foundTile.ownerUserId);
        return;
      }
    }

    onSelectUser(null);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    />
  );
};

function findTileByUV(u: number, v: number, tiles: Region[]): Region | null {
  for (const tile of tiles) {
    const [[u0, v0], [u1, _1], [_2, v1]] = tile.polygonUV;
    if (u >= u0 && u <= u1 && v >= v0 && v <= v1) {
      return tile;
    }
  }
  return null;
}
