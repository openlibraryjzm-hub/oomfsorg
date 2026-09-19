import { SphereItem, MappingMode, MapTheme } from '../types/map';

const THEMES: MapTheme[] = ['neon', 'topographic', 'heatmap', 'wireframe', 'minimal', 'cyber'];
const MODES: MappingMode[] = ['conquest', 'discrete_1to1'];
const RESOLUTIONS = [256, 512, 1024, 2048];

const PREFIXES = [
  'Genesis', 'Alpha', 'Nexus', 'Staking', 'Validator', 'Cyber', 'Quantum', 'Hyperion',
  'Solaris', 'Nebula', 'Orion', 'Pulse', 'Vertex', 'Astra', 'Horizon', 'Vortex',
  'Titan', 'Spectra', 'Zenith', 'Echo', 'Omni', 'Cosmos', 'Apex', 'Matrix'
];

const SUFFIXES = [
  'Globe', 'Realm', 'Hub', 'Matrix', 'Cluster', 'Core', 'Sphere', 'Constellation',
  'Vault', 'Network', 'Domain', 'Zone', 'Territory', 'Grid', 'Station', 'Orbit'
];

const HOST_NAMES = [
  '@satoshi_oomf', '@vitalik_oomf', '@validator_one', '@solana_dev', '@cosmos_node',
  '@ethereum_host', '@cyber_punk', '@staker_prime', '@node_runner', '@oomf_master',
  '@alpha_trader', '@quantum_dev', '@hyperion_node', '@zero_sum_host', '@apex_staking'
];

/**
 * Generates N procedural placeholder spheres arranged in a 3D galactic dataset.
 */
export function generateGalaxyDataset(count: number = 2500): SphereItem[] {
  const items: SphereItem[] = [];

  // Prime Genesis Spheres
  items.push(
    {
      id: 'sphere-genesis',
      name: 'Genesis OOMFS Globe',
      ownerName: 'Genesis Network',
      description: 'Primary network sphere for value-weighted community territory allocation and validator node governance.',
      mappingMode: 'conquest',
      userCount: 6,
      gridResolution: 512,
      theme: 'neon',
      seed: 42,
      createdAt: 'Sep 1, 2026',
    },
    {
      id: 'sphere-alpha-conquest',
      name: 'Alpha Conquest Realm',
      ownerName: '@satoshi_oomf',
      description: 'High-density 2048 quad tile conquest grid mapping staking pools and donor contributions.',
      mappingMode: 'conquest',
      userCount: 12,
      gridResolution: 2048,
      theme: 'cyber',
      seed: 1337,
      createdAt: 'Sep 10, 2026',
    },
    {
      id: 'sphere-oomf-1to1',
      name: 'OOMF 1:1 Follower Hub',
      ownerName: '@vitalik_oomf',
      description: 'Discrete 1:1 equal partition mapping engine where every follower owns exactly 1 surface quad tile.',
      mappingMode: 'discrete_1to1',
      userCount: 24,
      gridResolution: 512,
      theme: 'topographic',
      seed: 9000,
      createdAt: 'Sep 15, 2026',
    }
  );

  // Procedurally generate remaining thousands of spheres
  for (let i = items.length; i < count; i++) {
    const p = PREFIXES[i % PREFIXES.length];
    const s = SUFFIXES[(i * 3) % SUFFIXES.length];
    const name = `${p} ${s} #${i}`;
    const ownerName = HOST_NAMES[(i * 7) % HOST_NAMES.length];
    const mappingMode = MODES[i % 2];
    const gridResolution = RESOLUTIONS[(i * 2) % RESOLUTIONS.length];
    const theme = THEMES[i % THEMES.length];
    const userCount = Math.floor(4 + (i % 64));

    items.push({
      id: `sphere-${i}`,
      name,
      ownerName,
      description: `Autonomous 3D community sphere node #${i} mapped on the OOMFS network topology.`,
      mappingMode,
      userCount,
      gridResolution,
      theme,
      seed: 1000 + i,
      createdAt: `Sep ${1 + (i % 18)}, 2026`,
    });
  }

  return items;
}
