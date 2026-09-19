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
  email?: string;
  createdAt: string;
  bio?: string;
  carousels?: CarouselSection[];
  avatarUrl?: string;
  twitterHandle?: string;
}

export type AuthModalMode = 'login' | 'register';

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

