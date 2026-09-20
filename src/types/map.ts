export type MapTheme = 'neon' | 'topographic' | 'heatmap' | 'wireframe' | 'minimal' | 'cyber';

export type RightPanelTab = 'config' | 'allocator' | 'inspector';

export type MappingMode = 'conquest' | 'discrete_1to1';

export interface UserAccount {
  id: number;
  name: string;
  code: string;
  color: string;
  category: string;
  value: number; // Metric score
  targetShare: number; // Target area allocation % (0..100)
  actualShare: number; // Actual physical area share %
  tileCount: number; // Number of 3D quad tiles owned
  centroid3D: [number, number, number]; // Territory centroid in 3D
  centroid2D: [number, number]; // Territory centroid on 2D texture
  isSystemReserved?: boolean; // True for North/South Polar Network Host Accounts
  customImage?: string; // Custom uploaded image data URL / image URL
}

export interface Region {
  id: number;
  faceIndex: number; // 0..3 (Equatorial side faces: +X, -X, +Z, -Z) or 4, 5 (North/South Polar Caps)
  ownerUserId: number; // ID of the UserAccount owning this tile
  polygonUV: Array<[number, number]>;
  isPolarCap?: boolean;
  polarType?: 'north' | 'south';
}

export interface MapSettings {
  mappingMode: MappingMode; // 'conquest' | 'discrete_1to1'
  userCount: number; // Active user accounts (dynamic U)
  gridResolution: number; // Fixed grid options: 256, 512, 1024, 2048
  theme: MapTheme;
  selectedUserId: number | null;
  hoveredUserId: number | null;
  autoRotate: boolean;
  showGrid: boolean;
  seed: number;
  showRightPanel: boolean; // Toggle Right Dock Panel
  activePanelTab: RightPanelTab; // Active tab in Right Dock Panel
}

export interface SphereItem {
  id: string;
  name: string;
  ownerName: string;
  description: string;
  mappingMode: MappingMode;
  userCount: number;
  gridResolution: number;
  theme: MapTheme;
  seed: number;
  createdAt: string;
  customUserShares?: number[];
  customUserImages?: Record<number, string>;
}

