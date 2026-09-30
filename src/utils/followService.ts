import { supabase } from './supabase';
import { FollowStats, FollowUserSummary, UserProfile } from '../types/auth';
import { fetchUserProfileByUsername, getCurrentUserProfile } from './authService';

const LOCAL_FOLLOWS_KEY = 'oomfs_local_follows_v2';

interface LocalFollowRecord {
  followerHandle: string;
  followingHandle: string;
  createdAt: string;
}

function cleanHandle(h: string): string {
  if (!h) return '';
  return h.trim().toLowerCase().replace(/^@/, '');
}

function getLocalFollows(): LocalFollowRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_FOLLOWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFollows(records: LocalFollowRecord[]): void {
  try {
    localStorage.setItem(LOCAL_FOLLOWS_KEY, JSON.stringify(records));
  } catch {}
}

/**
 * Resolve profile from DB or cache given username or UUID string.
 */
async function resolveProfile(identifier: string): Promise<UserProfile | null> {
  const clean = cleanHandle(identifier);
  if (!clean) return null;

  // 1. Check active user session first
  const current = await getCurrentUserProfile();
  if (current && (cleanHandle(current.username) === clean || current.id === identifier)) {
    return current;
  }

  // 2. Query Supabase profile by username or id
  try {
    const { data: byUsername } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', clean)
      .maybeSingle();

    if (byUsername) {
      return {
        id: byUsername.id,
        username: byUsername.username,
        displayName: byUsername.display_name || byUsername.username,
        createdAt: byUsername.created_at || new Date().toISOString(),
        bio: byUsername.bio || '',
        avatarUrl: byUsername.avatar_url || '',
        bannerUrl: byUsername.banner_url || '',
        twitterHandle: byUsername.twitter_handle || '',
      };
    }

    const { data: byId } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', identifier)
      .maybeSingle();

    if (byId) {
      return {
        id: byId.id,
        username: byId.username,
        displayName: byId.display_name || byId.username,
        createdAt: byId.created_at || new Date().toISOString(),
        bio: byId.bio || '',
        avatarUrl: byId.avatar_url || '',
        bannerUrl: byId.banner_url || '',
        twitterHandle: byId.twitter_handle || '',
      };
    }
  } catch (err) {
    console.warn('Error resolving profile for follow action:', err);
  }

  // 3. Fallback to fetchUserProfileByUsername
  return await fetchUserProfileByUsername(clean);
}

/**
 * Follow a target user account by username or profile ID.
 */
export async function followUser(followerIdentifier: string, followingIdentifier: string): Promise<boolean> {
  const followerHandle = cleanHandle(followerIdentifier);
  const targetHandle = cleanHandle(followingIdentifier);

  if (!followerHandle || !targetHandle || followerHandle === targetHandle) return false;

  // 1. Update local cache immediately
  const local = getLocalFollows();
  if (!local.some(f => cleanHandle(f.followerHandle) === followerHandle && cleanHandle(f.followingHandle) === targetHandle)) {
    local.push({ followerHandle, followingHandle: targetHandle, createdAt: new Date().toISOString() });
    saveLocalFollows(local);
  }

  // Notify listeners across app
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('oomfs-follow-change'));
  }

  // 2. Persist to Supabase public.follows table with resolved UUIDs
  try {
    const [followerProfile, targetProfile] = await Promise.all([
      resolveProfile(followerIdentifier),
      resolveProfile(followingIdentifier),
    ]);

    if (followerProfile && targetProfile && followerProfile.id && targetProfile.id) {
      const { error } = await supabase.from('follows').insert([
        { follower_id: followerProfile.id, following_id: targetProfile.id }
      ]);
      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.warn('Supabase follow insert warning:', error);
      }
    }
  } catch (err) {
    console.warn('Failed to persist follow to Supabase:', err);
  }

  return true;
}

/**
 * Unfollow a target user account by username or profile ID.
 */
export async function unfollowUser(followerIdentifier: string, followingIdentifier: string): Promise<boolean> {
  const followerHandle = cleanHandle(followerIdentifier);
  const targetHandle = cleanHandle(followingIdentifier);

  if (!followerHandle || !targetHandle) return false;

  // 1. Update local cache
  const local = getLocalFollows().filter(
    f => !(cleanHandle(f.followerHandle) === followerHandle && cleanHandle(f.followingHandle) === targetHandle)
  );
  saveLocalFollows(local);

  // Notify listeners across app
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('oomfs-follow-change'));
  }

  // 2. Delete from Supabase public.follows
  try {
    const [followerProfile, targetProfile] = await Promise.all([
      resolveProfile(followerIdentifier),
      resolveProfile(followingIdentifier),
    ]);

    if (followerProfile && targetProfile && followerProfile.id && targetProfile.id) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerProfile.id)
        .eq('following_id', targetProfile.id);

      if (error) {
        console.warn('Supabase unfollow delete warning:', error);
      }
    }
  } catch (err) {
    console.warn('Failed to delete follow from Supabase:', err);
  }

  return true;
}

/**
 * Check if followerIdentifier is following followingIdentifier.
 */
export async function checkIsFollowing(followerIdentifier: string, followingIdentifier: string): Promise<boolean> {
  const followerHandle = cleanHandle(followerIdentifier);
  const targetHandle = cleanHandle(followingIdentifier);

  if (!followerHandle || !targetHandle) return false;

  // Check local cache first
  const local = getLocalFollows();
  if (local.some(f => cleanHandle(f.followerHandle) === followerHandle && cleanHandle(f.followingHandle) === targetHandle)) {
    return true;
  }

  // Query Supabase public.follows by resolved UUIDs
  try {
    const [followerProfile, targetProfile] = await Promise.all([
      resolveProfile(followerIdentifier),
      resolveProfile(followingIdentifier),
    ]);

    if (followerProfile && targetProfile && followerProfile.id && targetProfile.id) {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerProfile.id)
        .eq('following_id', targetProfile.id)
        .maybeSingle();

      if (!error && data) {
        return true;
      }
    }
  } catch (err) {
    console.warn('Supabase checkIsFollowing error:', err);
  }

  return false;
}

/**
 * Fetch total follower & following counts for a given user handle or ID.
 */
export async function fetchFollowStats(identifier: string): Promise<FollowStats> {
  const targetHandle = cleanHandle(identifier);
  if (!targetHandle) return { followerCount: 0, followingCount: 0 };

  let followerCount = 0;
  let followingCount = 0;

  try {
    const profile = await resolveProfile(identifier);
    if (profile && profile.id) {
      const [followersRes, followingRes] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profile.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profile.id),
      ]);

      if (followersRes.count !== null && followersRes.count !== undefined) {
        followerCount = followersRes.count;
      }
      if (followingRes.count !== null && followingRes.count !== undefined) {
        followingCount = followingRes.count;
      }
    }
  } catch (err) {
    console.warn('Supabase fetchFollowStats query warning:', err);
  }

  // Combine with local cache fallback
  const local = getLocalFollows();
  const localFollowers = local.filter(f => cleanHandle(f.followingHandle) === targetHandle).length;
  const localFollowing = local.filter(f => cleanHandle(f.followerHandle) === targetHandle).length;

  return {
    followerCount: Math.max(followerCount, localFollowers),
    followingCount: Math.max(followingCount, localFollowing),
  };
}

/**
 * Fetch user profiles following targetIdentifier (Followers list).
 */
export async function fetchFollowersList(
  targetIdentifier: string,
  currentIdentifier?: string
): Promise<FollowUserSummary[]> {
  const targetHandle = cleanHandle(targetIdentifier);
  if (!targetHandle) return [];

  const resultsMap = new Map<string, FollowUserSummary>();

  // 1. Fetch from Supabase via SQL join
  try {
    const targetProfile = await resolveProfile(targetIdentifier);
    if (targetProfile && targetProfile.id) {
      const { data: followRows, error } = await supabase
        .from('follows')
        .select('follower_id, profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, bio)')
        .eq('following_id', targetProfile.id);

      if (!error && followRows && followRows.length > 0) {
        for (const row of followRows) {
          const p = (row as any).profiles;
          if (p && p.username) {
            const isFollowingCurrent = currentIdentifier
              ? await checkIsFollowing(currentIdentifier, p.username)
              : false;

            resultsMap.set(cleanHandle(p.username), {
              id: p.id,
              username: p.username,
              displayName: p.display_name || p.username,
              avatarUrl: p.avatar_url || '',
              bio: p.bio || '',
              isFollowing: isFollowingCurrent,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Supabase fetchFollowersList error:', err);
  }

  // 2. Merge local cache fallback
  const local = getLocalFollows().filter(f => cleanHandle(f.followingHandle) === targetHandle);
  for (const record of local) {
    const handle = cleanHandle(record.followerHandle);
    if (handle && !resultsMap.has(handle)) {
      const profile = await fetchUserProfileByUsername(handle);
      const username = profile?.username || handle;
      const isFollowingCurrent = currentIdentifier
        ? await checkIsFollowing(currentIdentifier, username)
        : false;

      resultsMap.set(handle, {
        id: profile?.id || username,
        username: username,
        displayName: profile?.displayName || `@${username}`,
        avatarUrl: profile?.avatarUrl || '',
        bio: profile?.bio || '',
        isFollowing: isFollowingCurrent,
      });
    }
  }

  return Array.from(resultsMap.values());
}

/**
 * Fetch user profiles being followed by targetIdentifier (Following list).
 */
export async function fetchFollowingList(
  targetIdentifier: string,
  currentIdentifier?: string
): Promise<FollowUserSummary[]> {
  const targetHandle = cleanHandle(targetIdentifier);
  if (!targetHandle) return [];

  const resultsMap = new Map<string, FollowUserSummary>();

  // 1. Fetch from Supabase via SQL join
  try {
    const targetProfile = await resolveProfile(targetIdentifier);
    if (targetProfile && targetProfile.id) {
      const { data: followRows, error } = await supabase
        .from('follows')
        .select('following_id, profiles!follows_following_id_fkey(id, username, display_name, avatar_url, bio)')
        .eq('follower_id', targetProfile.id);

      if (!error && followRows && followRows.length > 0) {
        for (const row of followRows) {
          const p = (row as any).profiles;
          if (p && p.username) {
            const isFollowingCurrent = currentIdentifier
              ? await checkIsFollowing(currentIdentifier, p.username)
              : false;

            resultsMap.set(cleanHandle(p.username), {
              id: p.id,
              username: p.username,
              displayName: p.display_name || p.username,
              avatarUrl: p.avatar_url || '',
              bio: p.bio || '',
              isFollowing: isFollowingCurrent,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Supabase fetchFollowingList error:', err);
  }

  // 2. Merge local cache fallback
  const local = getLocalFollows().filter(f => cleanHandle(f.followerHandle) === targetHandle);
  for (const record of local) {
    const handle = cleanHandle(record.followingHandle);
    if (handle && !resultsMap.has(handle)) {
      const profile = await fetchUserProfileByUsername(handle);
      const username = profile?.username || handle;
      const isFollowingCurrent = currentIdentifier
        ? await checkIsFollowing(currentIdentifier, username)
        : false;

      resultsMap.set(handle, {
        id: profile?.id || username,
        username: username,
        displayName: profile?.displayName || `@${username}`,
        avatarUrl: profile?.avatarUrl || '',
        bio: profile?.bio || '',
        isFollowing: isFollowingCurrent,
      });
    }
  }

  return Array.from(resultsMap.values());
}
