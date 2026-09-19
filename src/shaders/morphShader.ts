import * as THREE from 'three';

export interface MorphShaderUniforms {
  u_morph: { value: number }; // 0.0 = 2D Plane, 1.0 = 3D Sphere
  u_texture: { value: THREE.CanvasTexture | null };
  u_time: { value: number };
  u_radius: { value: number };
  u_planeWidth: { value: number };
  u_planeHeight: { value: number };
  u_wireframe: { value: number };
  u_atmosphere: { value: number };
}

export const VertexShader = /* glsl */ `
  uniform float u_morph;
  uniform float u_radius;
  uniform float u_planeWidth;
  uniform float u_planeHeight;
  uniform float u_time;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  #define PI 3.1415926535897932384626433832795

  void main() {
    vUv = uv;

    // 1. Position on 2D Plane (Mercator/Equirectangular unroll)
    vec3 planePos = vec3(
      (uv.x - 0.5) * u_planeWidth,
      (uv.y - 0.5) * u_planeHeight,
      0.0
    );
    vec3 planeNormal = vec3(0.0, 0.0, 1.0);

    // 2. Position on 3D Sphere
    float longitude = (uv.x - 0.5) * 2.0 * PI;
    float latitude = (uv.y - 0.5) * PI;

    vec3 sphereNormal = vec3(
      cos(latitude) * cos(longitude),
      sin(latitude),
      cos(latitude) * sin(longitude)
    );
    vec3 spherePos = sphereNormal * u_radius;

    // 3. Interpolate (Morph) between Plane and Sphere
    vec3 morphedPos = mix(planePos, spherePos, u_morph);
    vec3 morphedNormal = normalize(mix(planeNormal, sphereNormal, u_morph));

    vNormal = normalMatrix * morphedNormal;
    vPosition = morphedPos;
    
    vec4 worldPos = modelMatrix * vec4(morphedPos, 1.0);
    vWorldPosition = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const FragmentShader = /* glsl */ `
  uniform sampler2D u_texture;
  uniform float u_morph;
  uniform float u_time;
  uniform float u_atmosphere;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  void main() {
    vec4 texColor = texture2D(u_texture, vUv);

    // Basic Directional Lighting
    vec3 norm = normalize(vNormal);
    vec3 lightDir = normalize(vec3(1.0, 1.5, 2.0));
    float diff = max(dot(norm, lightDir), 0.35);

    // Atmospheric Fresnel Rim Glow (Active when in 3D sphere mode)
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, norm), 0.0), 3.0);
    vec3 atmosphereColor = vec3(0.2, 0.6, 1.0) * fresnel * u_morph * u_atmosphere * 0.8;

    // Subtle Grid scanline effect
    float scanline = sin(vUv.y * 400.0 + u_time * 2.0) * 0.02;

    vec3 finalColor = texColor.rgb * diff + atmosphereColor + scanline;

    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

export function createMorphMaterial(
  texture: THREE.CanvasTexture,
  radius = 2.0,
  planeWidth = 8.0,
  planeHeight = 4.0
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VertexShader,
    fragmentShader: FragmentShader,
    uniforms: {
      u_morph: { value: 0.0 },
      u_texture: { value: texture },
      u_time: { value: 0.0 },
      u_radius: { value: radius },
      u_planeWidth: { value: planeWidth },
      u_planeHeight: { value: planeHeight },
      u_wireframe: { value: 0.0 },
      u_atmosphere: { value: 1.0 },
    },
    side: THREE.DoubleSide,
    transparent: true,
  });
}
