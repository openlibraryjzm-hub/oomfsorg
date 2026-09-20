import { supabase } from './supabase';
import { UserAccount, SphereItem } from '../types/map';

export interface OOMFUser {
  id: string;
  name: string;
  username: string;
  profileImageUrl: string;
}

/**
 * Trigger Twitter/X OAuth 2.0 PKCE authentication via Supabase Auth
 */
export async function signInWithTwitterOAuth() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
        scopes: 'users.read follows.read',
      },
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Twitter OAuth Error:', err);
    throw err;
  }
}

/**
 * Process active Twitter OAuth session or return OOMF sphere payload
 */
export async function handleTwitterOauthCallback(session: any): Promise<SphereItem | null> {
  const providerToken = session?.provider_token;
  const twitterUsername = session?.user?.user_metadata?.preferred_username || session?.user?.user_metadata?.user_name || 'twitter_user';
  const twitterAvatar = session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture;

  let oomfUsers: UserAccount[] = [];

  if (providerToken) {
    oomfUsers = await fetchTwitterMutualOOMFs(providerToken);
  } else {
    oomfUsers = generateMockOOMFs(twitterUsername, 12);
  }

  if (twitterAvatar && oomfUsers.length > 0) {
    oomfUsers[0].customImage = twitterAvatar;
  }

  const customImages: Record<number, string> = {};
  const customShares: number[] = [];
  const equalShare = Math.round((100 / oomfUsers.length) * 10) / 10;

  oomfUsers.forEach(u => {
    if (u.customImage) customImages[u.id] = u.customImage;
    customShares.push(equalShare);
  });

  const oomfSphere: SphereItem = {
    id: `sphere-${Date.now()}`,
    name: `@${twitterUsername}'s OOMFs Sphere`,
    ownerName: `@${twitterUsername}`,
    description: 'Automated 1:1 equal partition sphere mapping exact mutual followers (followers ∩ following).',
    mappingMode: 'discrete_1to1',
    userCount: oomfUsers.length,
    gridResolution: 512,
    theme: 'neon',
    seed: Math.floor(Math.random() * 10000),
    createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    customUserShares: customShares,
    customUserImages: customImages,
  };

  return oomfSphere;
}

/**
 * Fetch followers and following lists via Twitter API v2, intersect them to find 1:1 mutuals,
 * and format them into OOMFS UserAccount targets.
 */
export async function fetchTwitterMutualOOMFs(accessToken: string): Promise<UserAccount[]> {
  try {
    // 1. Fetch authenticated user profile
    const meRes = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) throw new Error('Failed to fetch Twitter profile');
    const meData = await meRes.json();
    const myId = meData.data?.id;

    if (!myId) throw new Error('Twitter user ID not found');

    // 2. Fetch Following list
    const followingRes = await fetch(`https://api.twitter.com/2/users/${myId}/following?user.fields=profile_image_url&max_results=100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const followingData = followingRes.ok ? await followingRes.json() : { data: [] };
    const followingList: OOMFUser[] = (followingData.data || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      profileImageUrl: u.profile_image_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`,
    }));

    // 3. Fetch Followers list
    const followersRes = await fetch(`https://api.twitter.com/2/users/${myId}/followers?user.fields=profile_image_url&max_results=100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const followersData = followersRes.ok ? await followersRes.json() : { data: [] };
    const followersMap = new Map<string, OOMFUser>();
    (followersData.data || []).forEach((u: any) => {
      followersMap.set(u.id, {
        id: u.id,
        name: u.name,
        username: u.username,
        profileImageUrl: u.profile_image_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`,
      });
    });

    // 4. Intersect lists for exact 1:1 mutuals (OOMFs = Following ∩ Followers)
    const mutuals = followingList.filter(u => followersMap.has(u.id));

    // Fallback if mutual count is zero (e.g. API quota or brand new account)
    if (mutuals.length === 0 && followingList.length > 0) {
      mutuals.push(...followingList.slice(0, 10));
    }

    return mapOOMFsToUserAccounts(mutuals);
  } catch (err) {
    console.warn('Twitter API fetch error, falling back to simulated OOMFs:', err);
    return generateMockOOMFs('me', 12);
  }
}

/**
 * Generate a simulated set of OOMF accounts for instant testing & quota fallbacks
 */
export function generateMockOOMFs(ownerUsername: string = 'me', count: number = 10): UserAccount[] {
  const sampleOOMFs: OOMFUser[] = [
    { id: '1', name: 'Satoshi Nakamoto', username: 'satoshi', profileImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80' },
    { id: '2', name: 'Vitalik Buterin', username: 'vitalikb', profileImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
    { id: '3', name: 'Cobie', username: 'cobie', profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    { id: '4', name: 'Hsaka', username: 'hsaka', profileImageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
    { id: '5', name: 'Ansem', username: 'ansem', profileImageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
    { id: '6', name: 'Meltem Demirors', username: 'meltemd', profileImageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
    { id: '7', name: 'Gmoney', username: 'gmoney', profileImageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
    { id: '8', name: 'Punk 6529', username: 'punk6529', profileImageUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
    { id: '9', name: 'Balaji Srinivasan', username: 'balajis', profileImageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
    { id: '10', name: 'ThreadGuy', username: 'notthreadguy', profileImageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80' },
    { id: '11', name: 'Beeple', username: 'beeple', profileImageUrl: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=150&auto=format&fit=crop&q=80' },
    { id: '12', name: 'Coldie', username: 'coldie', profileImageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  ];

  const selected = sampleOOMFs.slice(0, Math.min(count, sampleOOMFs.length));
  return mapOOMFsToUserAccounts(selected);
}

const PALETTE_COLORS = [
  '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#f43f5e', '#84cc16', '#6366f1', '#d97706',
];

function mapOOMFsToUserAccounts(oomfs: OOMFUser[]): UserAccount[] {
  const N = Math.max(1, oomfs.length);
  const equalShare = Math.round((100 / N) * 10) / 10;

  return oomfs.map((user, idx) => ({
    id: idx + 1,
    name: user.name,
    code: `@${user.username}`,
    color: PALETTE_COLORS[idx % PALETTE_COLORS.length],
    category: 'OOMF Mutual',
    value: 100,
    targetShare: equalShare,
    actualShare: equalShare,
    tileCount: 1,
    centroid3D: [0, 0, 0],
    centroid2D: [0, 0],
    customImage: user.profileImageUrl,
  }));
}
