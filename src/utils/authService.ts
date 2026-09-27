import { supabase } from './supabase';
import { UserProfile } from '../types/auth';
import { SphereItem } from '../types/map';
import { saveSphereToSupabase } from './sphereService';

const SESSION_KEY = 'oomfs_user_session';

/**
 * Ensure user has a personal 3D sphere planet named after their handle.
 */
export async function ensureUserHomeSphere(username: string): Promise<SphereItem> {
  const cleanHandle = `@${username.trim().toLowerCase().replace(/^@/, '')}`;
  try {
    const { data: existingSpheres } = await supabase
      .from('spheres')
      .select('*')
      .eq('owner_name', cleanHandle)
      .limit(1);

    if (existingSpheres && existingSpheres.length > 0) {
      const row = existingSpheres[0];
      return {
        id: row.id.toString(),
        name: row.name,
        ownerName: row.owner_name,
        description: row.description || '',
        mappingMode: row.mapping_mode,
        userCount: row.user_count,
        gridResolution: row.grid_resolution,
        theme: row.theme,
        seed: row.seed,
        createdAt: new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        customUserShares: row.custom_user_shares || undefined,
        customUserImages: row.custom_user_images || {},
      };
    }

    const newHomeSphere: SphereItem = {
      id: `sphere-${Date.now()}`,
      name: cleanHandle,
      ownerName: cleanHandle,
      description: `Official 3D community sphere for ${cleanHandle}`,
      mappingMode: 'discrete_1to1',
      userCount: 6,
      gridResolution: 512,
      theme: 'neon',
      seed: Math.floor(Math.random() * 10000),
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    const saved = await saveSphereToSupabase(newHomeSphere);
    return saved || newHomeSphere;
  } catch (err) {
    console.warn('Error creating user home sphere:', err);
    return {
      id: `sphere-${Date.now()}`,
      name: cleanHandle,
      ownerName: cleanHandle,
      description: `Official 3D community sphere for ${cleanHandle}`,
      mappingMode: 'discrete_1to1',
      userCount: 6,
      gridResolution: 512,
      theme: 'neon',
      seed: Math.floor(Math.random() * 10000),
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  }
}

/**
 * Hash password securely using native Web Crypto SHA-256 algorithm.
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`oomfs_salt_${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sign up a new user with Username and Password directly in public.profiles.
 */
export async function signUpUser({
  username,
  password,
}: {
  username: string;
  password: string;
}): Promise<UserProfile> {
  const cleanUsername = username.trim().toLowerCase();

  // 1. Check if username is already taken
  const { data: existingUser, error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    console.warn('Profile check warning:', checkError);
  }

  if (existingUser) {
    throw new Error('Username is already taken. Please choose another.');
  }

  // 2. Hash password
  const passwordHash = await hashPassword(password);

  // 3. Insert profile into database
  let newProfile: any = null;
  const res1 = await supabase
    .from('profiles')
    .insert([
      {
        username: cleanUsername,
        password_hash: passwordHash,
      },
    ])
    .select('*')
    .maybeSingle();

  if (res1.error) {
    const res2 = await supabase
      .from('profiles')
      .insert([{ username: cleanUsername }])
      .select('*')
      .single();

    if (res2.error || !res2.data) {
      throw new Error(res2.error?.message || 'Failed to create account. Please try again.');
    }
    newProfile = res2.data;
  } else {
    newProfile = res1.data;
  }

  const userProfile: UserProfile = {
    id: newProfile.id,
    username: newProfile.username,
    createdAt: newProfile.created_at || new Date().toISOString(),
  };

  // 4. Auto create user home sphere named after handle
  await ensureUserHomeSphere(cleanUsername);

  // 5. Save session to localStorage
  localStorage.setItem(SESSION_KEY, JSON.stringify(userProfile));

  // Dispatch custom event for real-time app update
  window.dispatchEvent(new Event('oomfs-auth-change'));

  return userProfile;
}

/**
 * Sign in existing user via Username + Password.
 */
export async function signInUser({
  identifier,
  password,
}: {
  identifier: string;
  password: string;
}): Promise<UserProfile> {
  const cleanUsername = identifier.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  // 1. Query matching user
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (error) {
    console.error('Database query error during login:', error);
    throw new Error(error.message || 'Database error during login. Please try again.');
  }

  if (!user) {
    throw new Error('User not found. Please check your username or register a new account.');
  }

  // 2. Verify password_hash if present in DB record
  if (user.password_hash && user.password_hash !== passwordHash) {
    throw new Error('Incorrect password. Please try again.');
  }

  const userProfile: UserProfile = {
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.username,
    createdAt: user.created_at || new Date().toISOString(),
    bio: user.bio || '',
    carousels: user.carousels || [],
    avatarUrl: user.avatar_url || '',
    bannerUrl: user.banner_url || '',
    twitterHandle: user.twitter_handle || '',
  };

  // Ensure home sphere exists for user
  await ensureUserHomeSphere(cleanUsername);

  // Save session to localStorage
  localStorage.setItem(SESSION_KEY, JSON.stringify(userProfile));

  // Dispatch custom event for real-time app update
  window.dispatchEvent(new Event('oomfs-auth-change'));

  return userProfile;
}

const PROFILE_CACHE_PREFIX = 'oomfs_profile_';

/**
 * Fetch a user profile by username from Supabase DB or per-user local storage cache.
 */
export async function fetchUserProfileByUsername(username: string): Promise<UserProfile | null> {
  const cleanUsername = username.trim().toLowerCase();
  const cacheKey = `${PROFILE_CACHE_PREFIX}${cleanUsername}`;

  let cachedProfile: UserProfile | null = null;
  try {
    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      cachedProfile = JSON.parse(cachedRaw) as UserProfile;
    }
  } catch {}

  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (!error && user) {
      const fetched: UserProfile = {
        id: user.id,
        username: user.username,
        displayName: user.display_name || cachedProfile?.displayName || user.username,
        createdAt: user.created_at || new Date().toISOString(),
        bio: user.bio || cachedProfile?.bio || '',
        carousels: (user.carousels && user.carousels.length > 0) ? user.carousels : (cachedProfile?.carousels || []),
        avatarUrl: user.avatar_url || cachedProfile?.avatarUrl || '',
        bannerUrl: user.banner_url || cachedProfile?.bannerUrl || '',
        twitterHandle: user.twitter_handle || cachedProfile?.twitterHandle || '',
      };
      localStorage.setItem(cacheKey, JSON.stringify(fetched));
      return fetched;
    }
  } catch (err) {
    console.warn('Error querying Supabase profile:', err);
  }

  if (cachedProfile) {
    return cachedProfile;
  }

  const current = await getCurrentUserProfile();
  if (current && current.username.toLowerCase() === cleanUsername) {
    return current;
  }

  return null;
}

/**
 * Update user profile details (bio, carousels, avatarUrl, bannerUrl, twitterHandle, displayName).
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const current = await getCurrentUserProfile();

  const nextProfile: UserProfile = {
    ...(current || { id: userId, username: '', createdAt: new Date().toISOString() }),
    ...updates,
  };

  const cleanUsername = nextProfile.username ? nextProfile.username.trim().toLowerCase() : '';
  const cacheKey = `${PROFILE_CACHE_PREFIX}${cleanUsername}`;

  if (current && current.id === userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextProfile));
  }
  if (cleanUsername) {
    localStorage.setItem(cacheKey, JSON.stringify(nextProfile));
  }

  try {
    const dbUpdates: Record<string, any> = {};
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.carousels !== undefined) dbUpdates.carousels = updates.carousels;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.bannerUrl !== undefined) dbUpdates.banner_url = updates.bannerUrl;
    if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
    if (updates.twitterHandle !== undefined) dbUpdates.twitter_handle = updates.twitterHandle;

    if (Object.keys(dbUpdates).length > 0) {
      const { error: updateErr } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);
      if (updateErr && updateErr.code !== 'PGRST204') {
        console.warn('Supabase profile update warning:', updateErr);
      }
    }
  } catch (err) {
    console.warn('Failed to persist profile update to Supabase DB, saved to local cache:', err);
  }

  window.dispatchEvent(new Event('oomfs-auth-change'));

  return nextProfile;
}

/**
 * Sign out current logged-in user.
 */
export async function signOutUser(): Promise<void> {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('oomfs-auth-change'));
}

/**
 * Get active user session from localStorage.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const sessionRaw = localStorage.getItem(SESSION_KEY);
    if (!sessionRaw) return null;
    return JSON.parse(sessionRaw) as UserProfile;
  } catch {
    return null;
  }
}

/**
 * Subscribe to auth state changes (localStorage & custom events).
 */
export function onAuthStateChange(callback: (user: UserProfile | null) => void) {
  const handleStateChange = async () => {
    const profile = await getCurrentUserProfile();
    callback(profile);
  };

  handleStateChange();

  window.addEventListener('oomfs-auth-change', handleStateChange);
  window.addEventListener('storage', handleStateChange);

  return {
    data: {
      subscription: {
        unsubscribe: () => {
          window.removeEventListener('oomfs-auth-change', handleStateChange);
          window.removeEventListener('storage', handleStateChange);
        },
      },
    },
  };
}

/**
 * Sync user profile after Twitter/X OAuth authentication.
 */
export async function syncTwitterOAuthProfile(metadata: {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  twitterHandle?: string;
}): Promise<{ userProfile: UserProfile; homeSphere: SphereItem | null }> {
  const cleanUsername = (metadata.username || 'twitter_user').trim().toLowerCase().replace(/^@/, '');
  const twitterHandle = metadata.twitterHandle || cleanUsername;
  const displayName = metadata.displayName || cleanUsername;
  const bio = metadata.bio || '';

  // 1. High-Res Avatar Extraction (_400x400 instead of _normal 48x48)
  let avatarUrl = metadata.avatarUrl || '';
  if (avatarUrl.includes('_normal.')) {
    avatarUrl = avatarUrl.replace('_normal.', '_400x400.');
  } else if (avatarUrl.includes('_normal')) {
    avatarUrl = avatarUrl.replace('_normal', '');
  }

  // 2. High-Res Banner Extraction (1500x500 header)
  let bannerUrl = metadata.bannerUrl || '';
  if (bannerUrl && !bannerUrl.endsWith('/1500x500') && !bannerUrl.includes('/600x200')) {
    bannerUrl = `${bannerUrl.replace(/\/$/, '')}/1500x500`;
  }

  // 3. Check if user profile already exists in Supabase
  const { data: existingUser, error: queryErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (queryErr && queryErr.code !== 'PGRST116') {
    console.warn('Profile query warning during OAuth sync:', queryErr);
  }

  let userProfile: UserProfile;
  let homeSphere: SphereItem | null = null;

  if (existingUser) {
    userProfile = {
      id: existingUser.id,
      username: existingUser.username,
      displayName: existingUser.display_name || displayName,
      createdAt: existingUser.created_at || new Date().toISOString(),
      bio: existingUser.bio || bio,
      carousels: existingUser.carousels || [],
      avatarUrl: existingUser.avatar_url || avatarUrl,
      bannerUrl: existingUser.banner_url || bannerUrl,
      twitterHandle: existingUser.twitter_handle || twitterHandle,
    };
    // Returning user: Do NOT create any new spheres automatically
    homeSphere = null;
  } else {
    // Insert new profile
    const { data: newProfile, error: insertErr } = await supabase
      .from('profiles')
      .insert([
        {
          username: cleanUsername,
          display_name: displayName,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
          bio: bio,
          twitter_handle: twitterHandle,
        },
      ])
      .select('*')
      .maybeSingle();

    if (insertErr) {
      console.warn('Supabase profile insert warning, using fallback profile:', insertErr);
    }

    if (newProfile) {
      userProfile = {
        id: newProfile.id,
        username: newProfile.username,
        displayName: newProfile.display_name || displayName,
        createdAt: newProfile.created_at || new Date().toISOString(),
        bio: newProfile.bio || bio,
        carousels: [],
        avatarUrl: newProfile.avatar_url || avatarUrl,
        bannerUrl: newProfile.banner_url || bannerUrl,
        twitterHandle: newProfile.twitter_handle || twitterHandle,
      };
    } else {
      userProfile = {
        id: `user-${Date.now()}`,
        username: cleanUsername,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        bio,
        carousels: [],
        avatarUrl,
        bannerUrl,
        twitterHandle,
      };
    }

    // First time user: Auto create personal home sphere named after handle
    homeSphere = await ensureUserHomeSphere(cleanUsername);
  }

  // Save active session
  localStorage.setItem(SESSION_KEY, JSON.stringify(userProfile));
  window.dispatchEvent(new Event('oomfs-auth-change'));

  return { userProfile, homeSphere };
}





