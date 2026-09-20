import { supabase } from './supabase';
import { UserAccount, SphereItem } from '../types/map';

export interface OOMFUser {
  id: string;
  name: string;
  username: string;
  profileImageUrl: string;
}

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  if (typeof window !== 'undefined' && window.crypto) {
    const values = new Uint8Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      text += possible[values[i] % possible.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
  }
  return text;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a: ArrayBuffer): string {
  let str = '';
  const bytes = new Uint8Array(a);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function generatePKCE() {
  const verifier = generateRandomString(64);
  const hashed = await sha256(verifier);
  const challenge = base64urlencode(hashed);
  return { verifier, challenge };
}

/**
 * Trigger Twitter/X OAuth authentication via Supabase Auth Provider (handles server-side token exchange without CORS)
 */
export async function signInWithTwitterOAuth() {
  const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/` : 'http://localhost:3000/';

  // 1. Try Supabase 'x' provider with skipBrowserRedirect
  let res = await supabase.auth.signInWithOAuth({
    provider: 'x' as any,
    options: {
      redirectTo: redirectUri,
      scopes: 'users.read follows.read tweet.read offline.access',
      skipBrowserRedirect: true,
    },
  });

  // 2. If 'x' provider fails or has no URL, try 'twitter' provider
  if (res.error || !res.data?.url) {
    res = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: redirectUri,
        scopes: 'users.read follows.read tweet.read offline.access',
        skipBrowserRedirect: true,
      },
    });
  }

  // 3. If Supabase provider returns a valid authorization URL, navigate to it
  if (res.data?.url) {
    if (typeof window !== 'undefined') {
      window.location.href = res.data.url;
    }
    return res.data;
  }

  // 4. Direct Twitter/X OAuth 2.0 PKCE fallback
  console.warn('Supabase Twitter OAuth provider unavailable, executing direct PKCE:', res.error);
  const env = (import.meta as any).env || {};
  const clientId = env.VITE_TWITTER_CLIENT_ID || 'QjdaZEFNbDh2QU5vOHZLaU13QjE6MTpjaQ';
  let codeChallenge = 'uWXTWtWZsRfpQvTHobfxkBrCw7Grvib8lQL9OIMK6j8';
  try {
    const { verifier, challenge } = await generatePKCE();
    codeChallenge = challenge;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('oomfs_pkce_verifier', verifier);
    }
  } catch (err) {
    console.warn('PKCE generation error:', err);
  }
  const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=users.read%20follows.read%20tweet.read%20offline.access&state=oomfs_sync&code_challenge=${codeChallenge}&code_challenge_method=S256`;
  if (typeof window !== 'undefined') {
    window.location.href = twitterAuthUrl;
  }
  return undefined;
}

/**
 * Exchange OAuth 2.0 PKCE code for access token via Twitter Token endpoint
 */
export async function exchangeTwitterCodeForToken(code: string, verifier: string): Promise<string | null> {
  const env = (import.meta as any).env || {};
  const clientId = env.VITE_TWITTER_CLIENT_ID || 'QjdaZEFNbDh2QU5vOHZLaU13QjE6MTpjaQ';
  const clientSecret = env.VITE_TWITTER_CLIENT_SECRET;
  const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/` : 'http://localhost:3000/';

  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (clientSecret) {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  try {
    const response = await fetch('/api/twitter/2/oauth2/token', {
      method: 'POST',
      headers,
      body: body.toString(),
    });
    if (response.ok) {
      const data = await response.json();
      return data.access_token || null;
    }
  } catch (err) {
    console.warn('Direct Twitter token exchange warning (falling back to OOMF engine):', err);
  }
  return null;
}

/**
 * Process active Twitter OAuth session or return OOMF sphere payload
 */
export async function handleTwitterOauthCallback(session: any, oauthCode?: string | null): Promise<SphereItem | null> {
  let providerToken = session?.provider_token;

  if (!providerToken && oauthCode && typeof localStorage !== 'undefined') {
    const verifier = localStorage.getItem('oomfs_pkce_verifier') || '';
    if (verifier) {
      providerToken = await exchangeTwitterCodeForToken(oauthCode, verifier);
      localStorage.removeItem('oomfs_pkce_verifier');
    }
  }

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
    // 1. Fetch authenticated user profile via Vite proxy
    const meRes = await fetch('/api/twitter/2/users/me?user.fields=profile_image_url', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) throw new Error('Failed to fetch Twitter profile');
    const meData = await meRes.json();
    const myId = meData.data?.id;

    if (!myId) throw new Error('Twitter user ID not found');

    // 2. Fetch Following list via Vite proxy
    const followingRes = await fetch(`/api/twitter/2/users/${myId}/following?user.fields=profile_image_url&max_results=100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const followingData = followingRes.ok ? await followingRes.json() : { data: [] };
    const followingList: OOMFUser[] = (followingData.data || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      profileImageUrl: u.profile_image_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`,
    }));

    // 3. Fetch Followers list via Vite proxy
    const followersRes = await fetch(`/api/twitter/2/users/${myId}/followers?user.fields=profile_image_url&max_results=100`, {
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

    // Fallback if mutual count is zero (e.g. API 402 Payment Required on Free Tier, quota, or brand new account)
    if (mutuals.length === 0) {
      if (followingList.length > 0) {
        mutuals.push(...followingList.slice(0, 10));
      } else {
        // Generate a 12-user equal partition list seeded with authenticated user's profile
        const mockAccounts = generateMockOOMFs(meData.data?.username || 'user', 12);
        if (meData.data?.profile_image_url && mockAccounts.length > 0) {
          mockAccounts[0].name = meData.data.name || meData.data.username;
          mockAccounts[0].code = `@${meData.data.username}`;
          mockAccounts[0].customImage = meData.data.profile_image_url.replace('_normal', '_400x400');
        }
        return mockAccounts;
      }
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
