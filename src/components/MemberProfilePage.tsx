import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, CarouselSection, CarouselItem, AuthModalMode } from '../types/auth';
import { updateUserProfile } from '../utils/authService';
import { uploadTileImageToSupabase } from '../utils/sphereService';
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
} from 'lucide-react';

interface MemberProfilePageProps {
  currentUser: UserProfile | null;
  onGoToMap: () => void;
  onOpenAuthModal?: (mode: AuthModalMode) => void;
  onSignOut?: () => void;
}

export const MemberProfilePage: React.FC<MemberProfilePageProps> = ({
  currentUser,
  onGoToMap,
  onOpenAuthModal,
  onSignOut,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(currentUser);

  // Bio state
  const [isEditingBio, setIsEditingBio] = useState<boolean>(false);
  const [bioInput, setBioInput] = useState<string>(currentUser?.bio || '');

  // Twitter handle state
  const [isEditingTwitter, setIsEditingTwitter] = useState<boolean>(false);
  const [twitterInput, setTwitterInput] = useState<string>(currentUser?.twitterHandle || '');

  // Carousels state
  const [carousels, setCarousels] = useState<CarouselSection[]>(currentUser?.carousels || []);
  const [isAddingCarousel, setIsAddingCarousel] = useState<boolean>(false);
  const [newCarouselTitle, setNewCarouselTitle] = useState<string>('');
  const [uploadingCarouselId, setUploadingCarouselId] = useState<string | null>(null);

  // Carousel inline editing state
  const [editingCarouselId, setEditingCarouselId] = useState<string | null>(null);
  const [editingTitleInput, setEditingTitleInput] = useState<string>('');

  // Lightbox modal state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Sync state when currentUser prop changes
  useEffect(() => {
    if (currentUser) {
      setProfile(currentUser);
      setBioInput(currentUser.bio || '');
      setTwitterInput(currentUser.twitterHandle || '');
      setCarousels(currentUser.carousels || []);
    }
  }, [currentUser]);

  // Save bio handler
  const handleSaveBio = async () => {
    if (!currentUser) return;
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
    if (!currentUser) return;
    const cleanHandle = twitterInput.replace(/^@/, '').trim();
    try {
      const updated = await updateUserProfile(currentUser.id, { twitterHandle: cleanHandle });
      setProfile(updated);
      setIsEditingTwitter(false);
    } catch (err) {
      console.error('Failed to save twitter handle:', err);
    }
  };

  // Add Carousel section handler
  const handleAddCarousel = async () => {
    if (!currentUser || !newCarouselTitle.trim()) return;
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
    if (!currentUser || !editingTitleInput.trim()) return;
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
    if (!currentUser) return;
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
    if (!currentUser) return;
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
    if (!currentUser) return;
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

  if (!currentUser) {
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
    <div className="relative w-full h-full flex flex-col items-center justify-start p-4 sm:p-8 z-10 overflow-y-auto">
      <div className="max-w-6xl w-full min-h-[calc(100vh-6rem)] glass-panel p-6 sm:p-10 rounded-3xl shadow-2xl border border-slate-800/90 bg-slate-950/90 backdrop-blur-2xl flex flex-col gap-10 my-4 sm:my-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Hero Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={currentUser.username}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover ring-2 ring-cyan-400/80 shadow-xl shadow-cyan-500/20"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-3xl uppercase shadow-xl ring-2 ring-white/20">
                  {currentUser.username.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">@{currentUser.username}</h1>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> Account Profile
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                <span>Registered Member</span>
                
                {/* Reserved Twitter / X Badge */}
                {profile?.twitterHandle ? (
                  <>
                    <span>•</span>
                    <a
                      href={`https://x.com/${profile.twitterHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-200 hover:text-cyan-400 font-mono font-semibold flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-700/60 transition-colors"
                    >
                      <span className="font-bold text-xs text-cyan-400">𝕏</span>
                      <span>@{profile.twitterHandle}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  </>
                ) : !isEditingTwitter ? (
                  <>
                    <span>•</span>
                    <button
                      onClick={() => setIsEditingTwitter(true)}
                      className="text-cyan-400 hover:text-cyan-300 text-xs font-medium flex items-center gap-1 hover:underline"
                    >
                      <span>+ Link Twitter Handle</span>
                    </button>
                  </>
                ) : null}
              </div>

              {/* Edit Twitter Handle Inline Input */}
              {isEditingTwitter && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-xs text-slate-500 font-mono">@</span>
                    <input
                      type="text"
                      value={twitterInput}
                      onChange={e => setTwitterInput(e.target.value)}
                      placeholder="twitter_username"
                      className="pl-7 pr-3 py-1.5 bg-slate-950 border border-cyan-500/50 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                  <button
                    onClick={handleSaveTwitter}
                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                    title="Save Twitter Handle"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsEditingTwitter(false)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end flex-wrap">
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-900/60 text-slate-300 hover:text-rose-300 font-bold text-xs flex items-center gap-2 transition-all shadow-md"
                title="Sign out of account"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Sign Out</span>
              </button>
            )}
            <button
              onClick={onGoToMap}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
            >
              <span>Return to 3D Sphere Map</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Member Bio / Description Section */}
        <div className="bg-slate-950/80 p-6 sm:p-7 rounded-3xl border border-slate-800/90 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Member Description & Bio
            </span>
            {!isEditingBio && (
              <button
                onClick={() => setIsEditingBio(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
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
                rows={4}
                placeholder="Write a few lines about yourself, your projects, or your OOMF network..."
                className="w-full bg-slate-900/90 border border-slate-700 rounded-2xl p-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setIsEditingBio(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBio}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
                >
                  <Check className="w-4 h-4" /> Save Bio
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
              {profile?.bio && profile.bio.trim().length > 0 ? (
                profile.bio
              ) : (
                <span className="text-slate-500 italic">
                  You haven't added a bio yet. Click 'Edit Bio' above to share your background with the community!
                </span>
              )}
            </p>
          )}
        </div>

        {/* Media Showcase & Custom Carousels Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>🖼️ Showcase Carousels</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-xs font-bold">
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
            <div className="bg-slate-900/90 p-5 rounded-3xl border border-cyan-500/40 flex flex-col gap-3.5 shadow-xl animate-in fade-in duration-200">
              <span className="text-xs font-bold text-cyan-300 uppercase font-mono tracking-wider">Create Custom Title Carousel</span>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newCarouselTitle}
                  onChange={e => setNewCarouselTitle(e.target.value)}
                  placeholder="e.g. Favorite Games, My Projects, Setup & Gear..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Carousels List */}
          {carousels.length === 0 ? (
            <div className="bg-slate-950/60 p-12 rounded-3xl border border-slate-800/80 text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
                <ImagePlus className="w-7 h-7" />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <p className="text-sm font-bold text-slate-300">No Showcase Carousels Yet</p>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
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
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-200"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 transition-colors shadow-2xl"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Carousel Fullscreen Preview"
            className="max-w-full max-h-[90vh] rounded-3xl object-contain shadow-2xl ring-1 ring-cyan-500/50"
          />
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
    <div className="bg-slate-950/80 p-5 sm:p-6 rounded-3xl border border-slate-800/90 flex flex-col gap-4 shadow-xl">
      {/* Carousel Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
        {editingCarouselId === carousel.id ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editingTitleInput}
              onChange={e => onChangeRenameTitle(e.target.value)}
              className="bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            />
            <button
              onClick={onSaveRename}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onCancelRename}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
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
                className="text-slate-500 hover:text-slate-300 transition-colors"
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
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={scrollRight}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Scroll Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {isOwnProfile && (
            <button
              onClick={onDeleteCarousel}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 transition-colors ml-1"
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
        className="flex items-center gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 py-1.5 h-64 sm:h-72 snap-x snap-mandatory"
      >
        {carousel.items.map(item => (
          <div
            key={item.id}
            className="relative flex-shrink-0 h-full w-auto rounded-2xl overflow-hidden group cursor-pointer border border-slate-800/90 hover:border-cyan-400/80 transition-all snap-start bg-slate-950 flex items-center justify-center shadow-xl"
            onClick={() => onSelectImage(item.imageUrl)}
          >
            <img
              src={item.imageUrl}
              alt="Carousel item"
              className="h-full w-auto max-w-[550px] min-w-[140px] object-cover rounded-2xl group-hover:scale-[1.03] transition-transform duration-500 shadow-2xl"
            />

            {/* Dark gradient hover overlay with expand hint */}
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 pointer-events-none">
              <span className="text-[11px] font-medium text-slate-200 font-mono flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-700/60 shadow-lg">
                🔍 Click to expand
              </span>
            </div>

            {isOwnProfile && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onDeleteImage(item.id);
                }}
                className="absolute top-2.5 right-2.5 z-30 p-2 rounded-xl bg-slate-950/90 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-all shadow-xl border border-slate-700/60"
                title="Remove Image"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {/* Upload Image Card (Owner Only) */}
        {isOwnProfile && (
          <label className="flex-shrink-0 w-44 sm:w-48 h-full rounded-2xl border-2 border-dashed border-slate-800 hover:border-cyan-500/60 bg-slate-900/30 hover:bg-slate-900/70 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all snap-start shadow-md">
            {uploadingCarouselId === carousel.id ? (
              <>
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                <span className="text-xs text-cyan-300 font-mono font-medium">Uploading...</span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 shadow-md">
                  <ImagePlus className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-xs font-bold text-slate-200">+ Upload Image</span>
                <span className="text-[10px] text-slate-500 font-mono">PNG, JPG, WebP</span>
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
          <div className="w-full py-8 text-center text-xs text-slate-500 italic">
            No images uploaded to this carousel yet.
          </div>
        )}
      </div>
    </div>
  );
};
