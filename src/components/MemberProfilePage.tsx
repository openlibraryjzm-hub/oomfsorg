import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, CarouselSection, CarouselItem, AuthModalMode, FollowStats, FollowUserSummary } from '../types/auth';
import { fetchUserProfileByUsername, updateUserProfile } from '../utils/authService';
import { uploadTileImageToSupabase } from '../utils/sphereService';
import {
  followUser,
  unfollowUser,
  checkIsFollowing,
  fetchFollowStats,
  fetchFollowersList,
  fetchFollowingList,
} from '../utils/followService';
import {
  ArrowRight,
  ImagePlus,
  Edit3,
  Plus,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Sparkles,
  UserCheck,
  LogIn,
  LogOut,
  UserPlus,
  UserX,
  Users,
  Search,
  Globe,
} from 'lucide-react';

interface MemberProfilePageProps {
  currentUser: UserProfile | null;
  targetUsername?: string;
  onGoToMap: () => void;
  onOpenSphereStudio?: () => void;
  onOpenAuthModal?: (mode: AuthModalMode) => void;
  onSignOut?: () => void;
  onSelectUser?: (username: string) => void;
}

export const MemberProfilePage: React.FC<MemberProfilePageProps> = ({
  currentUser,
  targetUsername,
  onGoToMap,
  onOpenSphereStudio,
  onOpenAuthModal,
  onSignOut,
  onSelectUser,
}) => {
  const effectiveUsername = targetUsername || currentUser?.username || 'oprah';
  const cleanHandle = effectiveUsername.replace(/^@/, '').toLowerCase().replace(/\s+/g, '-');

  const isOwnProfile = Boolean(
    currentUser &&
    currentUser.username.replace(/^@/, '').toLowerCase().replace(/\s+/g, '-') === cleanHandle
  );

  const [profile, setProfile] = useState<UserProfile | null>(isOwnProfile ? currentUser : null);

  // Bio state
  const [isEditingBio, setIsEditingBio] = useState<boolean>(false);
  const [bioInput, setBioInput] = useState<string>(currentUser?.bio || '');

  // Twitter handle state
  const [isEditingTwitter, setIsEditingTwitter] = useState<boolean>(false);
  const [twitterInput, setTwitterInput] = useState<string>(currentUser?.twitterHandle || '');

  // Carousels state
  const [carousels, setCarousels] = useState<CarouselSection[]>(
    (isOwnProfile ? currentUser?.carousels : profile?.carousels) || []
  );
  const [isAddingCarousel, setIsAddingCarousel] = useState<boolean>(false);
  const [newCarouselTitle, setNewCarouselTitle] = useState<string>('');
  const [uploadingCarouselId, setUploadingCarouselId] = useState<string | null>(null);

  // Carousel inline editing state
  const [editingCarouselId, setEditingCarouselId] = useState<string | null>(null);
  const [editingTitleInput, setEditingTitleInput] = useState<string>('');

  // Lightbox modal state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState<boolean>(false);

  // Follow system state
  const [followStats, setFollowStats] = useState<FollowStats>({ followerCount: 0, followingCount: 0 });
  const [isFollowingState, setIsFollowingState] = useState<boolean>(false);
  const [isFollowLoading, setIsFollowLoading] = useState<boolean>(false);
  const [isHoveringUnfollow, setIsHoveringUnfollow] = useState<boolean>(false);

  // Follow modal state
  const [activeFollowModalTab, setActiveFollowModalTab] = useState<'followers' | 'following' | null>(null);
  const [followModalList, setFollowModalList] = useState<FollowUserSummary[]>([]);
  const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');

  const handleUploadBannerFile = async (file: File) => {
    if (!currentUser || !isOwnProfile) return;
    setIsUploadingBanner(true);
    try {
      const publicUrl = await uploadTileImageToSupabase(file);
      if (publicUrl) {
        const updated = await updateUserProfile(currentUser.id, { bannerUrl: publicUrl });
        setProfile(updated);
      }
    } catch (err) {
      console.error('Failed to upload banner image:', err);
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Sync profile state and follow details when currentUser or targetUsername prop changes
  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      const handleToFetch = targetUsername || currentUser?.username || 'oprah';
      if (!handleToFetch) return;

      const cleanHandleToFetch = handleToFetch.replace(/^@/, '').toLowerCase().replace(/\s+/g, '-');

      if (isOwnProfile && currentUser) {
        setProfile(currentUser);
        setBioInput(currentUser.bio || '');
        setTwitterInput(currentUser.twitterHandle || '');
        setCarousels(currentUser.carousels || []);
      }

      const fetched = await fetchUserProfileByUsername(cleanHandleToFetch);
      if (isMounted) {
        const activeProfile: UserProfile = fetched || {
          id: cleanHandleToFetch,
          username: cleanHandleToFetch,
          displayName: `@${cleanHandleToFetch}`,
          createdAt: new Date().toISOString(),
        };
        setProfile(activeProfile);
        setBioInput(activeProfile.bio || '');
        setTwitterInput(activeProfile.twitterHandle || '');
        setCarousels(activeProfile.carousels || []);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [currentUser, targetUsername, isOwnProfile]);

  // Sync follow stats & follow status for the current active profile
  useEffect(() => {
    let isMounted = true;
    async function loadFollowData() {
      const targetHandle = profile?.username || cleanHandle;
      if (!targetHandle) return;

      // 1. Fetch Stats
      const stats = await fetchFollowStats(targetHandle);
      if (isMounted) {
        setFollowStats(stats);
      }

      // 2. Fetch isFollowing check if currentUser is viewing someone else's profile
      const currentHandle = currentUser?.username;
      if (currentHandle && !isOwnProfile) {
        const following = await checkIsFollowing(currentHandle, targetHandle);
        if (isMounted) {
          setIsFollowingState(following);
        }
      } else {
        if (isMounted) {
          setIsFollowingState(false);
        }
      }
    }

    loadFollowData();

    window.addEventListener('oomfs-follow-change', loadFollowData);

    return () => {
      isMounted = false;
      window.removeEventListener('oomfs-follow-change', loadFollowData);
    };
  }, [profile, currentUser, cleanHandle, isOwnProfile]);

  // Follow/Unfollow toggle handler for profile hero
  const handleToggleFollow = async () => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }

    const targetHandle = profile?.username || cleanHandle;
    const currentHandle = currentUser?.username;

    if (!targetHandle || !currentHandle || isOwnProfile || isFollowLoading) return;

    setIsFollowLoading(true);
    const willFollow = !isFollowingState;

    // Optimistic UI updates
    setIsFollowingState(willFollow);
    setFollowStats(prev => ({
      ...prev,
      followerCount: willFollow ? prev.followerCount + 1 : Math.max(0, prev.followerCount - 1),
    }));

    try {
      if (willFollow) {
        await followUser(currentHandle, targetHandle);
      } else {
        await unfollowUser(currentHandle, targetHandle);
      }
      const updatedStats = await fetchFollowStats(targetHandle);
      setFollowStats(updatedStats);
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Open Followers/Following Modal Handler
  const handleOpenFollowModal = async (tab: 'followers' | 'following') => {
    const targetHandle = profile?.username || cleanHandle;
    if (!targetHandle) return;

    setActiveFollowModalTab(tab);
    setIsModalLoading(true);
    setModalSearchQuery('');

    try {
      const list = tab === 'followers'
        ? await fetchFollowersList(targetHandle, currentUser?.username)
        : await fetchFollowingList(targetHandle, currentUser?.username);
      setFollowModalList(list);
    } catch (err) {
      console.error(`Failed to fetch ${tab} list:`, err);
      setFollowModalList([]);
    } finally {
      setIsModalLoading(false);
    }
  };

  // Switch tabs inside modal handler
  const handleSwitchModalTab = async (tab: 'followers' | 'following') => {
    const targetHandle = profile?.username || cleanHandle;
    if (!targetHandle || activeFollowModalTab === tab) return;

    setActiveFollowModalTab(tab);
    setIsModalLoading(true);
    setModalSearchQuery('');

    try {
      const list = tab === 'followers'
        ? await fetchFollowersList(targetHandle, currentUser?.username)
        : await fetchFollowingList(targetHandle, currentUser?.username);
      setFollowModalList(list);
    } catch (err) {
      console.error(`Failed to fetch ${tab} list:`, err);
      setFollowModalList([]);
    } finally {
      setIsModalLoading(false);
    }
  };

  // Inline toggle follow state inside modal list
  const handleToggleModalItemFollow = async (targetUser: FollowUserSummary) => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }
    const currentHandle = currentUser.username;
    const targetHandle = targetUser.username;
    const willFollow = !targetUser.isFollowing;

    setFollowModalList(prev =>
      prev.map(u => (u.id === targetUser.id ? { ...u, isFollowing: willFollow } : u))
    );

    try {
      if (willFollow) {
        await followUser(currentHandle, targetHandle);
      } else {
        await unfollowUser(currentHandle, targetHandle);
      }
      const activeTargetHandle = profile?.username || cleanHandle;
      if (activeTargetHandle) {
        const updatedStats = await fetchFollowStats(activeTargetHandle);
        setFollowStats(updatedStats);
      }
    } catch (err) {
      console.error('Failed to toggle follow in modal:', err);
    }
  };

  // Save bio handler
  const handleSaveBio = async () => {
    if (!currentUser || !isOwnProfile) return;
    try {
      const updated = await updateUserProfile(currentUser.id, { bio: bioInput });
      setProfile(updated);
      setIsEditingBio(false);
    } catch (err) {
      console.error('Failed to save bio:', err);
    }
  };

  // Save twitter handle handler
  const handleSaveTwitter = async () => {
    if (!currentUser || !isOwnProfile) return;
    const cleanTwitter = twitterInput.replace(/^@/, '').trim();
    try {
      const updated = await updateUserProfile(currentUser.id, { twitterHandle: cleanTwitter });
      setProfile(updated);
      setIsEditingTwitter(false);
    } catch (err) {
      console.error('Failed to save twitter handle:', err);
    }
  };

  // Add Carousel section handler
  const handleAddCarousel = async () => {
    if (!currentUser || !isOwnProfile || !newCarouselTitle.trim()) return;
    const newSection: CarouselSection = {
      id: `carousel-${Date.now()}`,
      title: newCarouselTitle.trim(),
      items: [],
    };
    const nextCarousels = [...carousels, newSection];
    setCarousels(nextCarousels);
    setNewCarouselTitle('');
    setIsAddingCarousel(false);

    try {
      const updated = await updateUserProfile(currentUser.id, { carousels: nextCarousels });
      setProfile(updated);
    } catch (err) {
      console.error('Failed to save new carousel:', err);
    }
  };

  // Rename carousel handler
  const handleRenameCarousel = async (carouselId: string) => {
    if (!currentUser || !isOwnProfile || !editingTitleInput.trim()) return;
    const nextCarousels = carousels.map(c =>
      c.id === carouselId ? { ...c, title: editingTitleInput.trim() } : c
    );
    setCarousels(nextCarousels);
    setEditingCarouselId(null);
    setEditingTitleInput('');

    try {
      const updated = await updateUserProfile(currentUser.id, { carousels: nextCarousels });
      setProfile(updated);
    } catch (err) {
      console.error('Failed to rename carousel:', err);
    }
  };

  // Delete carousel section handler
  const handleDeleteCarousel = async (carouselId: string) => {
    if (!currentUser || !isOwnProfile) return;
    const nextCarousels = carousels.filter(c => c.id !== carouselId);
    setCarousels(nextCarousels);

    try {
      const updated = await updateUserProfile(currentUser.id, { carousels: nextCarousels });
      setProfile(updated);
    } catch (err) {
      console.error('Failed to delete carousel:', err);
    }
  };

  // Upload image to carousel handler
  const handleUploadCarouselImage = async (carouselId: string, file: File) => {
    if (!currentUser || !isOwnProfile) return;
    setUploadingCarouselId(carouselId);

    try {
      const publicUrl = await uploadTileImageToSupabase(file);
      if (!publicUrl) {
        throw new Error('Failed to upload image file.');
      }

      const newItem: CarouselItem = {
        id: `img-${Date.now()}`,
        imageUrl: publicUrl,
        createdAt: new Date().toISOString(),
      };

      const nextCarousels = carousels.map(c =>
        c.id === carouselId ? { ...c, items: [...c.items, newItem] } : c
      );

      setCarousels(nextCarousels);
      const updated = await updateUserProfile(currentUser.id, { carousels: nextCarousels });
      setProfile(updated);
    } catch (err) {
      console.error('Error uploading image to carousel:', err);
    } finally {
      setUploadingCarouselId(null);
    }
  };

  // Delete image from carousel handler
  const handleDeleteImage = async (carouselId: string, imageId: string) => {
    if (!currentUser || !isOwnProfile) return;
    const nextCarousels = carousels.map(c =>
      c.id === carouselId ? { ...c, items: c.items.filter(i => i.id !== imageId) } : c
    );
    setCarousels(nextCarousels);

    try {
      const updated = await updateUserProfile(currentUser.id, { carousels: nextCarousels });
      setProfile(updated);
    } catch (err) {
      console.error('Failed to delete carousel image:', err);
    }
  };

  if (!currentUser && !targetUsername) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-6 z-10">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center flex flex-col gap-4 border border-slate-800 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Account Profile</h2>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            Log in or register an account to manage your profile, customize your bio, and add showcase carousels.
          </p>
          <div className="flex items-center gap-2.5 justify-center mt-2 flex-wrap">
            {onOpenAuthModal && (
              <>
                <button
                  onClick={() => onOpenAuthModal('login')}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/30"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log In</span>
                </button>
                <button
                  onClick={() => onOpenAuthModal('register')}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register</span>
                </button>
              </>
            )}
            <button
              onClick={onGoToMap}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
            >
              Return to Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-start z-10 overflow-y-auto bg-slate-950 text-white">
      <div className="max-w-4xl w-full flex flex-col gap-0 border-x border-slate-800/80 min-h-screen bg-slate-950 animate-in fade-in duration-300">
        
        {/* 1. HD Twitter Cover Banner (1500x500 Header) */}
        <div className="relative w-full h-44 sm:h-56 bg-gradient-to-r from-slate-900 via-cyan-950 to-blue-950 overflow-hidden border-b border-slate-800 group">
          {profile?.bannerUrl ? (
            <img
              src={profile.bannerUrl}
              alt={`${cleanHandle} Cover Banner`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 opacity-90 flex items-center justify-center">
              <span className="font-mono text-xs text-slate-600 uppercase tracking-widest">𝕏 Header Banner</span>
            </div>
          )}

          {isOwnProfile && (
            <label className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer opacity-80 hover:opacity-100 transition-all shadow-xl backdrop-blur-md">
              {isUploadingBanner ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <ImagePlus className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Change Cover Banner</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadBannerFile(file);
                }}
              />
            </label>
          )}
        </div>


        {/* 2. Overlapping HD Avatar & Profile Action Bar */}
        <div className="relative px-5 sm:px-8 pb-6 border-b border-slate-800/80">
          <div className="flex items-end justify-between -mt-14 sm:-mt-16 mb-4">
            
            {/* Overlapping Avatar */}
            <div className="relative">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={cleanHandle}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover ring-4 ring-slate-950 shadow-2xl bg-slate-900"
                />
              ) : (
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-4xl uppercase ring-4 ring-slate-950 shadow-2xl">
                  {cleanHandle.charAt(0)}
                </div>
              )}
            </div>

            {/* Action Buttons Aligned Right */}
            <div className="flex items-center gap-2 flex-wrap justify-end pt-3">
              {!isOwnProfile && (
                <button
                  onClick={handleToggleFollow}
                  onMouseEnter={() => setIsHoveringUnfollow(true)}
                  onMouseLeave={() => setIsHoveringUnfollow(false)}
                  disabled={isFollowLoading}
                  className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                    isFollowingState
                      ? isHoveringUnfollow
                        ? 'bg-rose-950/90 text-rose-300 border border-rose-700/80 shadow-rose-900/20'
                        : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-slate-600'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20 font-black'
                  }`}
                >
                  {isFollowLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  ) : isFollowingState ? (
                    isHoveringUnfollow ? (
                      <>
                        <UserX className="w-3.5 h-3.5 text-rose-400" />
                        <span>Unfollow</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Following</span>
                      </>
                    )
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}
              {isOwnProfile && onOpenSphereStudio && (
                <button
                  onClick={onOpenSphereStudio}
                  className="px-4 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Manage My Spheres</span>
                </button>
              )}
              {isOwnProfile && onSignOut && (
                <button
                  onClick={onSignOut}
                  className="px-3.5 py-2 rounded-full bg-slate-900 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sign Out</span>
                </button>
              )}
              <button
                onClick={onGoToMap}
                className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <span>Return to Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* User Display Name & @handle Badge */}
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {profile?.displayName || `@${cleanHandle}`}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
                ✓ Verified Account
              </span>
            </div>
            
            <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
              <span>@{cleanHandle}</span>
              {profile?.twitterHandle && (
                <>
                  <span>•</span>
                  <a
                    href={`https://x.com/${profile.twitterHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>𝕏 @{profile.twitterHandle}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </div>

            {/* Followers & Following Counts (X/Twitter Style) */}
            <div className="flex items-center gap-4 mt-3 text-xs sm:text-sm text-slate-400">
              <button
                onClick={() => handleOpenFollowModal('following')}
                className="hover:underline flex items-center gap-1.5 group cursor-pointer"
              >
                <span className="font-extrabold text-white group-hover:text-cyan-400 transition-colors">
                  {followStats.followingCount.toLocaleString()}
                </span>
                <span className="text-slate-400 font-medium">Following</span>
              </button>
              <button
                onClick={() => handleOpenFollowModal('followers')}
                className="hover:underline flex items-center gap-1.5 group cursor-pointer"
              >
                <span className="font-extrabold text-white group-hover:text-cyan-400 transition-colors">
                  {followStats.followerCount.toLocaleString()}
                </span>
                <span className="text-slate-400 font-medium">Followers</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Native Bio / Description Section */}
        <div className="p-5 sm:p-8 flex flex-col gap-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" /> About & Bio
            </span>
            {isOwnProfile && !isEditingBio && (
              <button
                onClick={() => setIsEditingBio(true)}
                className="px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Bio</span>
              </button>
            )}
          </div>

          {isEditingBio ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={bioInput}
                onChange={e => setBioInput(e.target.value)}
                rows={3}
                placeholder="Write a few lines about yourself, your projects, or your OOMF network..."
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setIsEditingBio(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBio}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Check className="w-4 h-4" /> Save Bio
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
              {profile?.bio && profile.bio.trim().length > 0 ? (
                profile.bio
              ) : (
                <span className="text-slate-500 italic">
                  No bio written yet.
                </span>
              )}
            </p>
          )}
        </div>

        {/* 4. Showcase Carousels Section */}
        <div className="p-5 sm:p-8 flex flex-col gap-6">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>🖼️ Showcase Carousels</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-black/30 border border-white/15 text-slate-200 font-mono text-xs font-bold">
                {carousels.length} {carousels.length === 1 ? 'carousel' : 'carousels'}
              </span>
            </div>

            <button
              onClick={() => setIsAddingCarousel(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Carousel</span>
            </button>
          </div>

          {/* Add New Carousel Modal Input */}
          {isAddingCarousel && (
            <div className="bg-black/40 backdrop-blur-xl p-5 rounded-3xl border border-cyan-400/40 flex flex-col gap-3.5 shadow-xl animate-in fade-in duration-200">
              <span className="text-xs font-bold text-cyan-300 uppercase font-mono tracking-wider">Create Custom Title Carousel</span>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newCarouselTitle}
                  onChange={e => setNewCarouselTitle(e.target.value)}
                  placeholder="e.g. Favorite Games, My Projects, Setup & Gear..."
                  className="flex-1 bg-black/50 border border-white/20 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
                <button
                  onClick={handleAddCarousel}
                  disabled={!newCarouselTitle.trim()}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-md shadow-emerald-600/20"
                >
                  Create
                </button>
                <button
                  onClick={() => setIsAddingCarousel(false)}
                  className="px-4 py-2.5 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/10 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Carousels List */}
          {carousels.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-3xl bg-black/40 border border-white/15 flex items-center justify-center text-slate-200 shadow-inner">
                <ImagePlus className="w-7 h-7" />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <p className="text-sm font-bold text-slate-100">No Showcase Carousels Yet</p>
                <p className="text-xs text-sky-100/80 leading-relaxed font-normal">
                  Click "+ Add Carousel" above to create custom image rows showcasing your favorite games, art, setup, or projects!
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {carousels.map(carousel => (
                <CarouselRow
                  key={carousel.id}
                  carousel={carousel}
                  isOwnProfile={true}
                  uploadingCarouselId={uploadingCarouselId}
                  editingCarouselId={editingCarouselId}
                  editingTitleInput={editingTitleInput}
                  onStartRename={() => {
                    setEditingCarouselId(carousel.id);
                    setEditingTitleInput(carousel.title);
                  }}
                  onCancelRename={() => setEditingCarouselId(null)}
                  onSaveRename={() => handleRenameCarousel(carousel.id)}
                  onChangeRenameTitle={setEditingTitleInput}
                  onDeleteCarousel={() => handleDeleteCarousel(carousel.id)}
                  onUploadImage={file => handleUploadCarouselImage(carousel.id, file)}
                  onDeleteImage={imageId => handleDeleteImage(carousel.id, imageId)}
                  onSelectImage={imgUrl => setLightboxImage(imgUrl)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Fullscreen Preview Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-200"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-colors shadow-2xl"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Carousel Fullscreen Preview"
            className="max-w-full max-h-[90vh] rounded-3xl object-contain shadow-2xl ring-1 ring-cyan-400/50"
          />
        </div>
      )}

      {/* Followers / Following List Modal */}
      {activeFollowModalTab && (
        <div
          onClick={() => setActiveFollowModalTab(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Modal Header & Tabs */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleSwitchModalTab('followers')}
                  className={`text-sm font-bold pb-1 relative transition-colors ${
                    activeFollowModalTab === 'followers'
                      ? 'text-white border-b-2 border-cyan-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Followers ({followStats.followerCount})
                </button>
                <button
                  onClick={() => handleSwitchModalTab('following')}
                  className={`text-sm font-bold pb-1 relative transition-colors ${
                    activeFollowModalTab === 'following'
                      ? 'text-white border-b-2 border-cyan-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Following ({followStats.followingCount})
                </button>
              </div>

              <button
                onClick={() => setActiveFollowModalTab(null)}
                className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar Input */}
            <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/40">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5" />
                <input
                  type="text"
                  value={modalSearchQuery}
                  onChange={e => setModalSearchQuery(e.target.value)}
                  placeholder="Search accounts..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            {/* Modal User List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[250px]">
              {isModalLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  <span className="text-xs font-mono">Loading accounts...</span>
                </div>
              ) : (
                (() => {
                  const filteredModalList = followModalList.filter(
                    u =>
                      u.username.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                      (u.displayName && u.displayName.toLowerCase().includes(modalSearchQuery.toLowerCase()))
                  );

                  if (filteredModalList.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 gap-2">
                        <Users className="w-8 h-8 text-slate-600" />
                        <p className="text-xs font-medium">
                          {modalSearchQuery.trim()
                            ? 'No accounts match your search.'
                            : activeFollowModalTab === 'followers'
                            ? 'No followers yet.'
                            : 'Not following anyone yet.'}
                        </p>
                      </div>
                    );
                  }

                  return filteredModalList.map(userItem => (
                    <div
                      key={userItem.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/80 transition-all gap-3"
                    >
                      <div
                        onClick={() => {
                          setActiveFollowModalTab(null);
                          if (onSelectUser) {
                            onSelectUser(userItem.username);
                          }
                          if (typeof window !== 'undefined') {
                            window.history.pushState({}, '', `?u=${userItem.username}`);
                            window.dispatchEvent(new Event('popstate'));
                          }
                        }}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        {userItem.avatarUrl ? (
                          <img
                            src={userItem.avatarUrl}
                            alt={userItem.username}
                            className="w-10 h-10 rounded-full object-cover bg-slate-800 ring-1 ring-slate-700"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-white text-sm uppercase ring-1 ring-slate-700">
                            {userItem.username.charAt(0)}
                          </div>
                        )}

                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate hover:underline">
                            {userItem.displayName || `@${userItem.username}`}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 truncate">
                            @{userItem.username}
                          </span>
                          {userItem.bio && (
                            <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                              {userItem.bio}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Inline Follow / Unfollow toggle button for list item */}
                      {currentUser && currentUser.id !== userItem.id && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleToggleModalItemFollow(userItem);
                          }}
                          className={`px-3 py-1.5 rounded-full font-bold text-[11px] transition-all flex-shrink-0 ${
                            userItem.isFollowing
                              ? 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-rose-800 hover:text-rose-300'
                              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-sm'
                          }`}
                        >
                          {userItem.isFollowing ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                  ));
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


interface CarouselRowProps {
  carousel: CarouselSection;
  isOwnProfile: boolean;
  uploadingCarouselId: string | null;
  editingCarouselId: string | null;
  editingTitleInput: string;
  onStartRename: () => void;
  onCancelRename: () => void;
  onSaveRename: () => void;
  onChangeRenameTitle: (val: string) => void;
  onDeleteCarousel: () => void;
  onUploadImage: (file: File) => void;
  onDeleteImage: (imageId: string) => void;
  onSelectImage: (url: string) => void;
}

const CarouselRow: React.FC<CarouselRowProps> = ({
  carousel,
  isOwnProfile,
  uploadingCarouselId,
  editingCarouselId,
  editingTitleInput,
  onStartRename,
  onCancelRename,
  onSaveRename,
  onChangeRenameTitle,
  onDeleteCarousel,
  onUploadImage,
  onDeleteImage,
  onSelectImage,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-6 border-b border-white/10">
      {/* Carousel Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        {editingCarouselId === carousel.id ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editingTitleInput}
              onChange={e => onChangeRenameTitle(e.target.value)}
              className="bg-black/50 border border-cyan-400/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            />
            <button
              onClick={onSaveRename}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onCancelRename}
              className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-slate-300 border border-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest">
              {carousel.title}
            </h3>
            {isOwnProfile && (
              <button
                onClick={onStartRename}
                className="text-slate-400 hover:text-white transition-colors"
                title="Rename Carousel"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Scroll Nav Buttons */}
          <button
            onClick={scrollLeft}
            className="p-1.5 rounded-xl bg-black/40 hover:bg-black/70 text-slate-300 border border-white/15 transition-colors"
            title="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={scrollRight}
            className="p-1.5 rounded-xl bg-black/40 hover:bg-black/70 text-slate-300 border border-white/15 transition-colors"
            title="Scroll Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {isOwnProfile && (
            <button
              onClick={onDeleteCarousel}
              className="p-1.5 rounded-xl bg-black/40 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-white/15 hover:border-rose-900/50 transition-colors ml-1"
              title="Delete Carousel"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Scrolling Track */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 py-1.5 h-64 sm:h-72 snap-x snap-mandatory"
      >
        {carousel.items.map(item => (
          <div
            key={item.id}
            className="relative flex-shrink-0 h-full w-auto rounded-2xl overflow-hidden group cursor-pointer border border-white/15 hover:border-cyan-300/80 transition-all snap-start bg-black/40 flex items-center justify-center shadow-xl"
            onClick={() => onSelectImage(item.imageUrl)}
          >
            <img
              src={item.imageUrl}
              alt="Carousel item"
              className="h-full w-auto max-w-[550px] min-w-[140px] object-cover rounded-2xl group-hover:scale-[1.03] transition-transform duration-500 shadow-2xl"
            />

            {/* Dark gradient hover overlay with expand hint */}
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 pointer-events-none">
              <span className="text-[11px] font-medium text-slate-200 font-mono flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-xl border border-white/15 shadow-lg">
                🔍 Click to expand
              </span>
            </div>

            {isOwnProfile && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onDeleteImage(item.id);
                }}
                className="absolute top-2.5 right-2.5 z-30 p-2 rounded-xl bg-black/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-all shadow-xl border border-white/20"
                title="Remove Image"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {/* Upload Image Card (Owner Only) */}
        {isOwnProfile && (
          <label className="flex-shrink-0 w-44 sm:w-48 h-full rounded-2xl border-2 border-dashed border-white/20 hover:border-cyan-300/60 bg-black/20 hover:bg-black/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all snap-start shadow-md">
            {uploadingCarouselId === carousel.id ? (
              <>
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                <span className="text-xs text-cyan-300 font-mono font-medium">Uploading...</span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-2xl bg-black/40 border border-white/15 flex items-center justify-center text-slate-200 shadow-md">
                  <ImagePlus className="w-5 h-5 text-cyan-300" />
                </div>
                <span className="text-xs font-bold text-slate-200">+ Upload Image</span>
                <span className="text-[10px] text-slate-400 font-mono">PNG, JPG, WebP</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) onUploadImage(file);
              }}
            />
          </label>
        )}

        {carousel.items.length === 0 && !isOwnProfile && (
          <div className="w-full py-8 text-center text-xs text-slate-400 italic">
            No images uploaded to this carousel yet.
          </div>
        )}
      </div>
    </div>
  );
};
