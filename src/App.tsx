import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Target, Activity, MapPin, User } from 'lucide-react';
import { MapSettings, UserAccount, SphereItem } from './types/map';
import { AuthModalMode, UserProfile } from './types/auth';
import { onAuthStateChange, signOutUser } from './utils/authService';
import { generateClusteredPartitions } from './utils/partitionEngine';
import {
  fetchSpheresFromSupabase,
  saveSphereToSupabase,
  updateSphereInSupabase,
  uploadTileImageToSupabase
} from './utils/sphereService';
import { MapCanvas } from './components/MapCanvas';
import { Header, NavigationTab } from './components/Header';
import { FloatingInspectCard } from './components/FloatingInspectCard';
import { SphereStudioPage } from './components/SphereStudioPage';
import { CodeGalaxyPage } from './components/CodeGalaxyPage';
import { SphereOwnerPage } from './components/SphereOwnerPage';
import { MemberProfilePage } from './components/MemberProfilePage';
import { AuthModal } from './components/AuthModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('map');

  // Auth & User Account State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');

  // Spheres Collection State (Live from Supabase)
  const [spheres, setSpheres] = useState<SphereItem[]>([]);
  const [activeSphereId, setActiveSphereId] = useState<string>('sphere-genesis');

  const [settings, setSettings] = useState<MapSettings>({
    mappingMode: 'conquest',
    userCount: 6,
    gridResolution: 512,
    theme: 'neon',
    selectedUserId: null,
    hoveredUserId: null,
    autoRotate: false,
    showGrid: true,
    seed: 42,
    showRightPanel: false,
    activePanelTab: 'config',
  });

  // Target area shares state
  const [customUserShares, setCustomUserShares] = useState<number[] | undefined>(undefined);

  // Custom user images state
  const [customUserImages, setCustomUserImages] = useState<Record<number, string>>({});

  // 1. Subscribe to Supabase auth state changes
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((user) => {
      setCurrentUser(user);
    });
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // 2. Fetch live spheres from Supabase on App mount
  useEffect(() => {
    async function loadData() {
      const data = await fetchSpheresFromSupabase();
      if (data && data.length > 0) {
        setSpheres(data);
        const prime = data[0];
        setActiveSphereId(prime.id);
        setCustomUserShares(prime.customUserShares);
        setCustomUserImages(prime.customUserImages || {});
        setSettings(prev => ({
          ...prev,
          mappingMode: prime.mappingMode,
          userCount: prime.userCount,
          gridResolution: prime.gridResolution,
          theme: prime.theme,
          seed: prime.seed,
        }));
      }
    }
    loadData();
  }, []);

  // Auth Handlers
  const handleOpenAuthModal = useCallback((mode: AuthModalMode) => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOutUser();
      setCurrentUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }, []);

  const activeSphere = useMemo(
    () => spheres.find(s => s.id === activeSphereId) || null,
    [spheres, activeSphereId]
  );

  const isSphereOwner = useMemo(() => {
    if (!currentUser || !activeSphere) return false;
    const myHandle = `@${currentUser.username}`.toLowerCase();
    const rawUsername = currentUser.username.toLowerCase();
    const owner = activeSphere.ownerName.toLowerCase();
    return owner === myHandle || owner === rawUsername;
  }, [currentUser, activeSphere]);

  // Helper to sync local sphere changes to both local state array & Supabase DB
  const syncSphereUpdates = useCallback((updates: Partial<SphereItem>) => {
    setSpheres(prev =>
      prev.map(s => (s.id === activeSphereId ? { ...s, ...updates } : s))
    );
    // Guard database write if active user is not the sphere owner
    if (isSphereOwner) {
      updateSphereInSupabase(activeSphereId, updates);
    }
  }, [activeSphereId, isSphereOwner]);

  // Switch Active Sphere from Galaxy View
  const handleSelectSphere = useCallback((sphereId: string) => {
    const target = spheres.find(s => s.id === sphereId);
    if (!target) return;

    setActiveSphereId(target.id);
    setCustomUserShares(target.customUserShares);
    setCustomUserImages(target.customUserImages || {});

    setSettings(prev => ({
      ...prev,
      mappingMode: target.mappingMode,
      userCount: target.userCount,
      gridResolution: target.gridResolution,
      theme: target.theme,
      seed: target.seed,
      selectedUserId: null,
      hoveredUserId: null,
    }));
  }, [spheres]);

  // Create New Sphere & Save to Supabase
  const handleCreateSphere = useCallback(async (newSphere: SphereItem) => {
    // Persist to Supabase DB first to obtain canonical DB UUID
    const saved = await saveSphereToSupabase(newSphere);
    const targetSphere = saved || newSphere;

    setSpheres(prev => [targetSphere, ...prev.filter(s => s.id !== newSphere.id)]);
    setActiveSphereId(targetSphere.id);
    setCustomUserShares(targetSphere.customUserShares);
    setCustomUserImages(targetSphere.customUserImages || {});

    setSettings(prev => ({
      ...prev,
      mappingMode: targetSphere.mappingMode,
      userCount: targetSphere.userCount,
      gridResolution: targetSphere.gridResolution,
      theme: targetSphere.theme,
      seed: targetSphere.seed,
      selectedUserId: null,
      hoveredUserId: null,
    }));
    setActiveTab('map');
  }, []);

  // Upload custom tile image file to Supabase Storage & sync URL
  const handleUploadUserImageFile = useCallback(async (userId: number, file: File | undefined) => {
    let nextImages = { ...customUserImages };

    if (!file) {
      delete nextImages[userId];
    } else {
      const publicUrl = await uploadTileImageToSupabase(file);
      if (publicUrl) {
        nextImages[userId] = publicUrl;
      }
    }

    setCustomUserImages(nextImages);
    syncSphereUpdates({ customUserImages: nextImages });
  }, [customUserImages, syncSphereUpdates]);

  // Generate Multi-Tile Territory Clusters
  const { users, tiles } = useMemo(() => {
    return generateClusteredPartitions(
      settings.gridResolution,
      settings.userCount,
      settings.seed,
      settings.theme,
      customUserShares,
      customUserImages,
      settings.mappingMode
    );
  }, [settings.gridResolution, settings.userCount, settings.seed, settings.theme, customUserShares, customUserImages, settings.mappingMode]);

  // Partial settings update handler + Supabase sync
  const handleUpdateSettings = useCallback((updated: Partial<MapSettings>) => {
    let resetShares = false;

    if (
      (updated.userCount && updated.userCount !== settings.userCount) ||
      (updated.gridResolution && updated.gridResolution !== settings.gridResolution) ||
      (updated.mappingMode && updated.mappingMode !== settings.mappingMode)
    ) {
      setCustomUserShares(undefined);
      resetShares = true;
    }

    setSettings(prev => ({ ...prev, ...updated }));

    const sphereUpdates: Partial<SphereItem> = {};
    if (updated.mappingMode !== undefined) sphereUpdates.mappingMode = updated.mappingMode;
    if (updated.userCount !== undefined) sphereUpdates.userCount = updated.userCount;
    if (updated.gridResolution !== undefined) sphereUpdates.gridResolution = updated.gridResolution;
    if (updated.theme !== undefined) sphereUpdates.theme = updated.theme;
    if (updated.seed !== undefined) sphereUpdates.seed = updated.seed;
    if (resetShares) sphereUpdates.customUserShares = undefined;

    if (Object.keys(sphereUpdates).length > 0) {
      syncSphereUpdates(sphereUpdates);
    }
  }, [settings.userCount, settings.gridResolution, settings.mappingMode, syncSphereUpdates]);

  const handleResetSeed = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 10000);
    setSettings(prev => ({ ...prev, seed: newSeed }));
    syncSphereUpdates({ seed: newSeed });
  }, [syncSphereUpdates]);

  const handleUpdateShares = useCallback((normalizedShares: number[]) => {
    setCustomUserShares(normalizedShares);
    syncSphereUpdates({ customUserShares: normalizedShares });
  }, [syncSphereUpdates]);

  const handleSelectUser = useCallback((id: number | null) => {
    setSettings(prev => ({
      ...prev,
      selectedUserId: id,
    }));
  }, []);

  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const handleHoverUser = useCallback((id: number | null, pos?: { x: number; y: number }) => {
    setSettings(prev => ({ ...prev, hoveredUserId: id }));
    if (pos) {
      setHoverPos(pos);
    } else if (id === null) {
      setHoverPos(null);
    }
  }, []);

  const handleViewMyProfile = useCallback(() => {
    if (!currentUser) {
      handleOpenAuthModal('login');
      return;
    }
    setActiveTab('member');
  }, [currentUser, handleOpenAuthModal]);

  // Weight Presets (for active user accounts)
  const handleEqualizeShares = useCallback(() => {
    const N = settings.userCount;
    const raw = Array(N).fill(100 / N);
    const normalized = raw.map(s => Math.round(s * 10) / 10);
    const sum = Math.round(normalized.reduce((a, b) => a + b, 0) * 10) / 10;
    const diff = Math.round((100 - sum) * 10) / 10;
    if (diff !== 0) normalized[0] = Math.round((normalized[0] + diff) * 10) / 10;
    handleUpdateShares(normalized);
  }, [settings.userCount, handleUpdateShares]);

  const handleParetoShares = useCallback(() => {
    const N = settings.userCount;
    const top20Count = Math.max(1, Math.floor(N * 0.2));
    const remCount = N - top20Count;

    const shares: number[] = [];
    for (let i = 0; i < N; i++) {
      if (i < top20Count) {
        shares.push(80 / top20Count);
      } else {
        shares.push(20 / remCount);
      }
    }
    const normalized = shares.map(s => Math.round(s * 10) / 10);
    const sum = Math.round(normalized.reduce((a, b) => a + b, 0) * 10) / 10;
    const diff = Math.round((100 - sum) * 10) / 10;
    if (diff !== 0) normalized[0] = Math.round((normalized[0] + diff) * 10) / 10;
    handleUpdateShares(normalized);
  }, [settings.userCount, handleUpdateShares]);

  const handleRandomizeShares = useCallback(() => {
    const N = settings.userCount;
    const raw = Array.from({ length: N }, () => Math.random() * 80 + 10);
    const sum = raw.reduce((a, b) => a + b, 0);
    const normalized = raw.map(s => Math.round((s / sum) * 1000) / 10);
    const normSum = Math.round(normalized.reduce((a, b) => a + b, 0) * 10) / 10;
    const diff = Math.round((100 - normSum) * 10) / 10;
    if (diff !== 0) {
      const maxIdx = normalized.indexOf(Math.max(...normalized));
      normalized[maxIdx] = Math.round((normalized[maxIdx] + diff) * 10) / 10;
    }
    handleUpdateShares(normalized);
  }, [settings.userCount, handleUpdateShares]);

  // Active user to show in Floating Inspect Card (ONLY when actively selected/clicked)
  const activeInspectUser = useMemo(() => {
    if (settings.selectedUserId !== null) {
      return users.find((u: UserAccount) => u.id === settings.selectedUserId) || null;
    }
    return null;
  }, [users, settings.selectedUserId]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#f8fafc]">
      {/* 1. Global Header Navigation Bar (Rendered across Sphere, Galaxy, Owner, and Member views) */}
      {activeTab !== 'studio' && (
        <Header
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          user={currentUser}
          activeSphereOwnerName={activeSphere?.ownerName}
          onOpenAuthModal={handleOpenAuthModal}
          onSignOut={handleSignOut}
          onViewMyProfile={handleViewMyProfile}
        />
      )}

      {/* 2. Background Native 3D Interactive Three.js Sphere Globe Canvas (Rendered on map & studio views for live preview) */}
      {(activeTab === 'map' || activeTab === 'studio') && (
        <MapCanvas
          settings={settings}
          users={users}
          tiles={tiles}
          onSelectUser={handleSelectUser}
          onHoverUser={handleHoverUser}
        />
      )}

      {/* 2.5 Floating Partition Inspect HUD Card (Bottom Right) */}
      {activeTab === 'map' && activeInspectUser && (
        <FloatingInspectCard
          user={activeInspectUser}
          isPinned={settings.selectedUserId !== null}
          onClose={() => setSettings(prev => ({ ...prev, selectedUserId: null }))}
        />
      )}

      {/* 3. Conditional Dedicated Page View Rendering */}

      {/* Sphere Studio Dedicated Glassmorphism Overlay Dock */}
      {activeTab === 'studio' && (
        <div className="fixed inset-0 z-20 w-full h-full pointer-events-none">
          <SphereStudioPage
            spheres={spheres}
            activeSphereId={activeSphereId}
            onSelectSphere={handleSelectSphere}
            currentUser={currentUser}
            settings={settings}
            users={users}
            onUpdateSettings={handleUpdateSettings}
            onResetSeed={handleResetSeed}
            onUpdateUserShares={handleUpdateShares}
            onEqualizeShares={handleEqualizeShares}
            onParetoShares={handleParetoShares}
            onRandomizeShares={handleRandomizeShares}
            onUploadUserImageFile={handleUploadUserImageFile}
            isSphereOwner={isSphereOwner}
            activeSphereOwnerName={activeSphere?.ownerName}
            onGoToMap={() => setActiveTab('map')}
          />
        </div>
      )}

      {/* Code Galaxy Dedicated Full-Bleed Opaque Page View */}
      {activeTab === 'galaxy' && (
        <div className="fixed inset-0 z-30 w-full h-full overflow-hidden bg-[#080c14] pointer-events-auto">
          <CodeGalaxyPage
            spheres={spheres}
            activeSphereId={activeSphereId}
            onSelectSphere={handleSelectSphere}
            onCreateSphere={handleCreateSphere}
            onGoToMap={() => setActiveTab('map')}
            currentUser={currentUser}
            onOpenAuthModal={handleOpenAuthModal}
          />
        </div>
      )}

      {/* Sphere Owner Host Dedicated Full-Bleed Opaque Profile View */}
      {activeTab === 'owner' && (
        <div className="fixed inset-0 z-30 w-full h-full overflow-y-auto bg-gradient-to-b from-[#0c4a6e] via-[#0284c7] to-[#0369a1] pointer-events-auto">
          <MemberProfilePage
            currentUser={currentUser}
            targetUsername={activeSphere?.ownerName || 'oprah'}
            onGoToMap={() => setActiveTab('map')}
            onOpenSphereStudio={() => setActiveTab('studio')}
            onOpenAuthModal={handleOpenAuthModal}
            onSignOut={handleSignOut}
          />
        </div>
      )}

      {/* Signed-In Account Dedicated Full-Bleed Opaque Profile View */}
      {activeTab === 'member' && (
        <div className="fixed inset-0 z-30 w-full h-full overflow-y-auto bg-gradient-to-b from-[#0c4a6e] via-[#0284c7] to-[#0369a1] pointer-events-auto">
          <MemberProfilePage
            currentUser={currentUser}
            targetUsername={currentUser?.username}
            onGoToMap={() => setActiveTab('map')}
            onOpenSphereStudio={() => setActiveTab('studio')}
            onOpenAuthModal={handleOpenAuthModal}
            onSignOut={handleSignOut}
          />
        </div>
      )}

      {/* Auth Modal (Login / Account Creation) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => setCurrentUser(user)}
        initialMode={authModalMode}
      />
    </main>
  );
};

export default App;

