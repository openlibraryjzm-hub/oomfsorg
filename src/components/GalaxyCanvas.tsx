import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SphereItem, MapTheme } from '../types/map';

interface GalaxyCanvasProps {
  spheres: SphereItem[];
  selectedSphereId: string | null;
  hoveredSphereId: string | null;
  onSelectSphere: (sphereId: string) => void;
  onHoverSphere: (sphereId: string | null) => void;
}

// Theme color map for 3D sphere node materials
const THEME_COLORS: Record<MapTheme, THREE.Color> = {
  neon: new THREE.Color(0x00f3ff),
  topographic: new THREE.Color(0x10b981),
  heatmap: new THREE.Color(0xf59e0b),
  wireframe: new THREE.Color(0x3b82f6),
  minimal: new THREE.Color(0x94a3b8),
  cyber: new THREE.Color(0xa855f7),
};

/**
 * Calculates a 3D logarithmic spiral galaxy disk position for node `index` out of `total`.
 */
export function getGalacticDiskPosition(index: number, total: number): THREE.Vector3 {
  if (index === 0) return new THREE.Vector3(0, 0, 0); // Center prime node

  const arms = 4; // 4 spiral galaxy arms
  const armAngle = ((index % arms) * (2 * Math.PI)) / arms;

  // Logarithmic spiral radius
  const distRatio = Math.pow(index / total, 0.55);
  const radius = 3.5 + distRatio * 75;

  // Spiral swirl angle
  const swirl = radius * 0.18;
  const theta = armAngle + swirl + ((index % 17) * 0.05);

  // Vertical disk thickness with Gaussian-like center bulge
  const heightFactor = Math.exp(-radius / 30);
  const y = (Math.sin(index * 1.3) * 3.5 + (Math.random() - 0.5) * 2) * heightFactor;

  const x = radius * Math.cos(theta) + (Math.sin(index * 2.7) * 1.2);
  const z = radius * Math.sin(theta) + (Math.cos(index * 3.1) * 1.2);

  return new THREE.Vector3(x, y, z);
}

export const GalaxyCanvas: React.FC<GalaxyCanvasProps> = ({
  spheres,
  selectedSphereId,
  hoveredSphereId,
  onSelectSphere,
  onHoverSphere,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const planetInstancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const positionsRef = useRef<THREE.Vector3[]>([]);
  const keysPressedRef = useRef<Record<string, boolean>>({});

  // Pure First-Person Fly Camera State (Anvaka Style)
  const isDraggingLeftRef = useRef<boolean>(false);
  const isDraggingRightRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const yawRef = useRef<number>(0);
  const pitchRef = useRef<number>(0);
  const moveVelocityRef = useRef<THREE.Vector3>(new THREE.Vector3());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const count = spheres.length;

    // 1. Scene & Fog Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080c16, 0.012);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1200
    );
    camera.position.set(0, 18, 55);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Initialize pitch/yaw from initial camera direction
    const initDir = new THREE.Vector3(0, 0, 0).sub(camera.position).normalize();
    pitchRef.current = Math.asin(initDir.y);
    yawRef.current = Math.atan2(initDir.x, initDir.z);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.NoToneMapping;
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00f3ff, 2.5, 100);
    pointLight.position.set(0, 15, 0);
    scene.add(pointLight);

    // 5. Background 3D Starfield Particle Dust Universe (5,000 Stars)
    const starCount = 5000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color(0x00f3ff),
      new THREE.Color(0xa855f7),
      new THREE.Color(0x3b82f6),
      new THREE.Color(0xffffff),
    ];

    for (let i = 0; i < starCount; i++) {
      const r = 20 + Math.random() * 150;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const color = palette[Math.floor(Math.random() * palette.length)];
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 6. InstancedMesh Pipeline for 2,500+ Sphere Nodes (1 Draw Call!)
    const planetGeo = new THREE.SphereGeometry(0.75, 16, 16);
    const planetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const planetInstancedMesh = new THREE.InstancedMesh(planetGeo, planetMat, count);
    planetInstancedMeshRef.current = planetInstancedMesh;

    // Ring Instanced Mesh (1 Draw Call!)
    const ringGeo = new THREE.TorusGeometry(1.25, 0.025, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.5, wireframe: true });
    const ringInstancedMesh = new THREE.InstancedMesh(ringGeo, ringMat, count);

    const dummy = new THREE.Object3D();
    const positions: THREE.Vector3[] = [];

    spheres.forEach((sphere, i) => {
      const pos = getGalacticDiskPosition(i, count);
      positions.push(pos);

      // Set matrix transformation
      dummy.position.copy(pos);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();

      planetInstancedMesh.setMatrixAt(i, dummy.matrix);

      dummy.rotation.x = Math.PI / 3;
      dummy.updateMatrix();
      ringInstancedMesh.setMatrixAt(i, dummy.matrix);

      // Set theme color
      const color = THEME_COLORS[sphere.theme] || THEME_COLORS.neon;
      planetInstancedMesh.setColorAt(i, color);
    });

    planetInstancedMesh.instanceMatrix.needsUpdate = true;
    if (planetInstancedMesh.instanceColor) planetInstancedMesh.instanceColor.needsUpdate = true;

    ringInstancedMesh.instanceMatrix.needsUpdate = true;

    scene.add(planetInstancedMesh);
    scene.add(ringInstancedMesh);

    positionsRef.current = positions;

    // 7. Pure First-Person Fly & Pan Camera Controls (Anvaka Style)
    const handleMouseDown = (e: MouseEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.button === 0) isDraggingLeftRef.current = true;
      if (e.button === 2 || e.button === 1) isDraggingRightRef.current = true;

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingLeftRef.current = false;
      isDraggingRightRef.current = false;
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handlePointerMove = (e: MouseEvent) => {
      const deltaX = e.clientX - lastMousePosRef.current.x;
      const deltaY = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      // Left Click Drag: Look / Rotate camera view (Pitch & Yaw around eye position)
      if (isDraggingLeftRef.current) {
        const lookSens = 0.003;
        yawRef.current -= deltaX * lookSens;
        pitchRef.current -= deltaY * lookSens;

        const maxPitch = (Math.PI / 2) - 0.02;
        pitchRef.current = Math.max(-maxPitch, Math.min(maxPitch, pitchRef.current));
      }

      // Right Click Drag: Pan camera position sideways and vertically
      if (isDraggingRightRef.current) {
        const panSens = 0.08;
        const lookDir = new THREE.Vector3(
          Math.sin(yawRef.current) * Math.cos(pitchRef.current),
          Math.sin(pitchRef.current),
          Math.cos(yawRef.current) * Math.cos(pitchRef.current)
        );

        const right = new THREE.Vector3().crossVectors(lookDir, camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, lookDir).normalize();

        camera.position.addScaledVector(right, -deltaX * panSens);
        camera.position.addScaledVector(up, deltaY * panSens);
      }

      // Instanced Raycasting against 2,500+ sphere nodes
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(planetInstancedMesh);

      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        const idx = intersects[0].instanceId;
        const targetSphere = spheres[idx];
        if (targetSphere) {
          onHoverSphere(targetSphere.id);
          container.style.cursor = 'pointer';
          return;
        }
      }

      onHoverSphere(null);
      container.style.cursor = isDraggingLeftRef.current ? 'crosshair' : 'grab';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(planetInstancedMesh);

      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        const idx = intersects[0].instanceId;
        const targetSphere = spheres[idx];
        if (targetSphere) {
          onSelectSphere(targetSphere.id);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSens = 0.08;
      const lookDir = new THREE.Vector3(
        Math.sin(yawRef.current) * Math.cos(pitchRef.current),
        Math.sin(pitchRef.current),
        Math.cos(yawRef.current) * Math.cos(pitchRef.current)
      );

      camera.position.addScaledVector(lookDir, -e.deltaY * zoomSens);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('click', handleClick);
    container.addEventListener('contextmenu', handleContextMenu);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // 8. Keyboard Flight Controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      keysPressedRef.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 9. Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // 10. High-Performance Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Calculate camera orientation direction
      const lookDir = new THREE.Vector3(
        Math.sin(yawRef.current) * Math.cos(pitchRef.current),
        Math.sin(pitchRef.current),
        Math.cos(yawRef.current) * Math.cos(pitchRef.current)
      );

      // Set camera rotation
      const targetLook = camera.position.clone().add(lookDir);
      camera.lookAt(targetLook);

      // WASD Free Flight Movement
      const keys = keysPressedRef.current;
      const flySpeed = 0.6;

      if (
        keys['KeyW'] || keys['ArrowUp'] ||
        keys['KeyS'] || keys['ArrowDown'] ||
        keys['KeyA'] || keys['ArrowLeft'] ||
        keys['KeyD'] || keys['ArrowRight'] ||
        keys['KeyE'] || keys['KeyQ']
      ) {
        const flyDir = lookDir.clone();

        const right = new THREE.Vector3().crossVectors(flyDir, camera.up).normalize();

        if (keys['KeyW'] || keys['ArrowUp']) moveVelocityRef.current.addScaledVector(flyDir, flySpeed);
        if (keys['KeyS'] || keys['ArrowDown']) moveVelocityRef.current.addScaledVector(flyDir, -flySpeed);
        if (keys['KeyD'] || keys['ArrowRight']) moveVelocityRef.current.addScaledVector(right, flySpeed);
        if (keys['KeyA'] || keys['ArrowLeft']) moveVelocityRef.current.addScaledVector(right, -flySpeed);
        if (keys['KeyE']) moveVelocityRef.current.y += flySpeed;
        if (keys['KeyQ']) moveVelocityRef.current.y -= flySpeed;
      }

      // Apply velocity damping for smooth weightless space flight
      camera.position.add(moveVelocityRef.current);
      moveVelocityRef.current.multiplyScalar(0.88);

      // Rotate background starfield dust slowly
      starField.rotation.y += 0.0002;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [spheres]);

  // Smooth camera glide to selected sphere when selection changes
  useEffect(() => {
    if (!selectedSphereId || !cameraRef.current) return;
    const selectedIndex = spheres.findIndex(s => s.id === selectedSphereId);
    if (selectedIndex !== -1 && positionsRef.current[selectedIndex]) {
      const pos = positionsRef.current[selectedIndex];
      const targetCamPos = pos.clone().add(new THREE.Vector3(0, 3, 10));

      const dir = pos.clone().sub(targetCamPos).normalize();
      pitchRef.current = Math.asin(dir.y);
      yawRef.current = Math.atan2(dir.x, dir.z);

      cameraRef.current.position.copy(targetCamPos);
    }
  }, [selectedSphereId, spheres]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />;
};

export default GalaxyCanvas;
