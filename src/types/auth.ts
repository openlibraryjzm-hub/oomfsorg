export interface CarouselItem {
  id: string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
}

export interface CarouselSection {
  id: string;
  title: string;
  items: CarouselItem[];
}

export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  createdAt: string;
  bio?: string;
  carousels?: CarouselSection[];
  avatarUrl?: string;
  bannerUrl?: string;
  twitterHandle?: string;
}

export type AuthModalMode = 'login' | 'register';

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export interface FollowStats {
  followerCount: number;
  followingCount: number;
}

export interface FollowUserSummary {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  isFollowing?: boolean;
}

