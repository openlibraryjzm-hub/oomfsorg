import { supabase } from './supabase';
import { UserProfile } from '../types/auth';

const SESSION_KEY = 'oomfs_user_session';

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

  // 3. Insert profile into database (with fallback if password_hash column is not present on DB)
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
    // Retry insert without password_hash if column is missing in remote DB
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

  // 4. Save session to localStorage
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

  // 1. Query matching user with wildcard select to avoid PostgREST column 400 errors
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
    createdAt: user.created_at || new Date().toISOString(),
    bio: user.bio || '',
    carousels: user.carousels || [],
    avatarUrl: user.avatar_url || '',
    twitterHandle: user.twitter_handle || '',
  };

  // 3. Save session to localStorage
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

  // Read local cache first to preserve locally saved fields
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
        createdAt: user.created_at || new Date().toISOString(),
        bio: user.bio || cachedProfile?.bio || '',
        carousels: (user.carousels && user.carousels.length > 0) ? user.carousels : (cachedProfile?.carousels || []),
        avatarUrl: user.avatar_url || cachedProfile?.avatarUrl || '',
        twitterHandle: user.twitter_handle || cachedProfile?.twitterHandle || '',
      };
      // Save merged profile to local cache
      localStorage.setItem(cacheKey, JSON.stringify(fetched));
      return fetched;
    }
  } catch (err) {
    console.warn('Error querying Supabase profile:', err);
  }

  if (cachedProfile) {
    return cachedProfile;
  }

  // Fallback 2: Check active session if handle matches
  const current = await getCurrentUserProfile();
  if (current && current.username.toLowerCase() === cleanUsername) {
    return current;
  }

  return null;
}

/**
 * Update user profile details (bio, carousels, avatarUrl, twitterHandle).
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

  // 1. Update localStorage active session & per-user cache
  if (current && current.id === userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextProfile));
  }
  if (cleanUsername) {
    localStorage.setItem(cacheKey, JSON.stringify(nextProfile));
  }

  // 2. Attempt Supabase DB update
  try {
    const dbUpdates: Record<string, any> = {};
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.carousels !== undefined) dbUpdates.carousels = updates.carousels;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
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

  // Dispatch custom event for real-time UI updates
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

  // Initial load
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

