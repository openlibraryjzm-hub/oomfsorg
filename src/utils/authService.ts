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

  // 3. Insert profile into database
  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert([
      {
        username: cleanUsername,
        password_hash: passwordHash,
      },
    ])
    .select('id, username, created_at')
    .single();

  if (insertError || !newProfile) {
    throw new Error(insertError?.message || 'Failed to create account. Please try again.');
  }

  const userProfile: UserProfile = {
    id: newProfile.id,
    username: newProfile.username,
    createdAt: newProfile.created_at,
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

  // 1. Query matching user
  const { data: user, error } = await supabase
    .from('profiles')
    .select('id, username, password_hash, created_at, bio, carousels, avatar_url, twitter_handle')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (error) {
    throw new Error('Database error during login. Please try again.');
  }

  if (!user) {
    throw new Error('User not found. Please check your username or register a new account.');
  }

  if (user.password_hash !== passwordHash) {
    throw new Error('Incorrect password. Please try again.');
  }

  const userProfile: UserProfile = {
    id: user.id,
    username: user.username,
    createdAt: user.created_at,
    bio: user.bio || '',
    carousels: user.carousels || [],
    avatarUrl: user.avatar_url || '',
    twitterHandle: user.twitter_handle || '',
  };

  // 2. Save session to localStorage
  localStorage.setItem(SESSION_KEY, JSON.stringify(userProfile));

  // Dispatch custom event for real-time app update
  window.dispatchEvent(new Event('oomfs-auth-change'));

  return userProfile;
}

/**
 * Fetch a user profile by username from Supabase DB or local storage fallback.
 */
export async function fetchUserProfileByUsername(username: string): Promise<UserProfile | null> {
  const cleanUsername = username.trim().toLowerCase();
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, username, created_at, bio, carousels, avatar_url, twitter_handle')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (error || !user) {
      // Check if current logged-in user matches in localStorage
      const current = await getCurrentUserProfile();
      if (current && current.username.toLowerCase() === cleanUsername) {
        return current;
      }
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      createdAt: user.created_at,
      bio: user.bio || '',
      carousels: user.carousels || [],
      avatarUrl: user.avatar_url || '',
      twitterHandle: user.twitter_handle || '',
    };
  } catch (err) {
    console.warn('Error fetching profile by username:', err);
    const current = await getCurrentUserProfile();
    if (current && current.username.toLowerCase() === cleanUsername) {
      return current;
    }
    return null;
  }
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

  // 1. Update localStorage session if it's the active user
  if (current && current.id === userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextProfile));
  }

  // 2. Attempt Supabase DB update
  try {
    const dbUpdates: Record<string, any> = {};
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.carousels !== undefined) dbUpdates.carousels = updates.carousels;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.twitterHandle !== undefined) dbUpdates.twitter_handle = updates.twitterHandle;

    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('profiles').update(dbUpdates).eq('id', userId);
    }
  } catch (err) {
    console.warn('Failed to persist profile update to Supabase DB, stored in local session:', err);
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

