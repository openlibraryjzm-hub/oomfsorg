import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { RightDockPanel } from './components/RightDockPanel';
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
    showAtmosphere: true,
    seed: 42,
    showRightPanel: true,
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
    setSpheres(prev => [newSphere, ...prev]);
    setActiveSphereId(newSphere.id);
    setCustomUserShares(newSphere.customUserShares);
    setCustomUserImages(newSphere.customUserImages || {});

    setSettings(prev => ({
      ...prev,
      mappingMode: newSphere.mappingMode,
      userCount: newSphere.userCount,
      gridResolution: newSphere.gridResolution,
      theme: newSphere.theme,
      seed: newSphere.seed,
      selectedUserId: null,
      hoveredUserId: null,
    }));
    setActiveTab('map');

    // Persist to Supabase DB
    await saveSphereToSupabase(newSphere);
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
      showRightPanel: id !== null ? true : prev.showRightPanel,
      activePanelTab: id !== null ? 'inspector' : prev.activePanelTab,
    }));
  }, []);

  const handleHoverUser = useCallback((id: number | null) => {
    setSettings(prev => ({ ...prev, hoveredUserId: id }));
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

  // Active user to show in Inspector
  const activeUser = useMemo(() => {
    if (settings.selectedUserId !== null) {
      return users.find((u: UserAccount) => u.id === settings.selectedUserId) || null;
    }
    if (settings.hoveredUserId !== null) {
      return users.find((u: UserAccount) => u.id === settings.hoveredUserId) || null;
    }
    return null;
  }, [users, settings.selectedUserId, settings.hoveredUserId]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#080c16]">
      {/* 1. Header Navigation Bar */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={currentUser}
        activeSphereOwnerName={activeSphere?.ownerName}
        onOpenAuthModal={handleOpenAuthModal}
        onSignOut={handleSignOut}
        onViewMyProfile={handleViewMyProfile}
      />

      {/* 2. Background Native 3D Interactive Three.js Sphere Globe Canvas */}
      <MapCanvas
        settings={settings}
        users={users}
        tiles={tiles}
        onSelectUser={handleSelectUser}
        onHoverUser={handleHoverUser}
      />

      {/* 3. Conditional Page View Rendering */}
      {activeTab === 'map' && (
        <RightDockPanel
          settings={settings}
          users={users}
          activeUser={activeUser}
          isHoveredOnly={settings.selectedUserId === null && settings.hoveredUserId !== null}
          onUpdateSettings={handleUpdateSettings}
          onResetSeed={handleResetSeed}
          onSelectUser={handleSelectUser}
          onUpdateUserShares={handleUpdateShares}
          onEqualizeShares={handleEqualizeShares}
          onParetoShares={handleParetoShares}
          onRandomizeShares={handleRandomizeShares}
          onUploadUserImageFile={handleUploadUserImageFile}
          isSphereOwner={isSphereOwner}
          activeSphereOwnerName={activeSphere?.ownerName}
        />
      )}

      {/* Code Galaxy Interactive View */}
      {activeTab === 'galaxy' && (
        <div className="absolute inset-0 top-16 z-10 overflow-y-auto bg-[#080c16]/90 backdrop-blur-md">
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

      {/* Sphere Owner Profile View */}
      {activeTab === 'owner' && (
        <div className="absolute inset-0 top-16 z-10 overflow-y-auto bg-[#080c16]/90 backdrop-blur-md">
          <SphereOwnerPage
            userCount={users.length}
            tileCount={tiles.length}
            onGoToMap={() => setActiveTab('map')}
          />
        </div>
      )}

      {/* Account Profile View */}
      {activeTab === 'member' && (
        <div className="absolute inset-0 top-16 z-10 overflow-y-auto bg-[#080c16]/90 backdrop-blur-md">
          <MemberProfilePage
            currentUser={currentUser}
            onGoToMap={() => setActiveTab('map')}
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

