# Supabase Backend & Cloud Storage Architecture

## 📌 Architectural Overview

OOMFS uses **Supabase** (PostgreSQL + S3-compatible Cloud Storage) for persistent storage of user profiles, custom media carousels, 3D Sphere Map configurations, user territory partition allocations, zero-sum slider target shares, and custom uploaded tile texture images.

---

## 🔑 Credentials & Environment Configuration

Environment variables are defined in `.env.local` (and exposed via Vite's `import.meta.env`):

```env
VITE_SUPABASE_URL=https://giguvusbbgonlvsqtrei.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_-eLh4iHUShl5pYEyXOLEvg_YBvfrLST
```

The Supabase client is initialized in [src/utils/supabase.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/supabase.ts).

---

## 🗄 Database Schema: `public.profiles`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, `DEFAULT gen_random_uuid()` | Unique user account identifier |
| `username` | `text` | `UNIQUE`, `NOT NULL` | Lowercase unique handle (e.g. `satoshi`) |
| `password_hash` | `text` | `NOT NULL` | Hex-encoded SHA-256 hash (`oomfs_salt_` salted) |
| `avatar_url` | `text` | Optional | CDN URL for profile avatar image |
| `bio` | `text` | Optional | User bio description text |
| `twitter_handle` | `text` | Optional | Linked Twitter / 𝕏 handle (without `@`) |
| `carousels` | `jsonb` | `DEFAULT '[]'::jsonb` | Array of custom media carousel sections (`CarouselSection[]`) |
| `created_at` | `timestamptz` | `DEFAULT now() NOT NULL` | Registration timestamp |

---

## 🗄 Database Schema: `public.spheres`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, `DEFAULT gen_random_uuid()` | Unique sphere identifier |
| `name` | `text` | `NOT NULL` | Display name of the 3D sphere |
| `owner_name` | `text` | `NOT NULL` | Host / owner handle (e.g. `@satoshi_oomf`) |
| `description` | `text` | Optional | Sphere description |
| `mapping_mode` | `text` | `NOT NULL DEFAULT 'conquest'` | Paradigm: `'conquest'` \| `'discrete_1to1'` |
| `user_count` | `int4` | `NOT NULL DEFAULT 6` | Number of active user territory partitions ($U$) |
| `grid_resolution` | `int4` | `NOT NULL DEFAULT 512` | Grid quads count: `256`, `512`, `1024`, `2048` |
| `theme` | `text` | `NOT NULL DEFAULT 'neon'` | Visual theme (`neon`, `cyber`, `topographic`, etc.) |
| `seed` | `int4` | `NOT NULL DEFAULT 42` | Randomization seed for compact tile Voronoi solver |
| `custom_user_shares` | `jsonb` | `DEFAULT '[]'::jsonb` | Array of target area share percentages (e.g. `[20, 30, 50]`) |
| `custom_user_images` | `jsonb` | `DEFAULT '{}'::jsonb` | Map of `userId -> customImageCDNUrl` |
| `created_at` | `timestamptz` | `DEFAULT now() NOT NULL` | Creation timestamp |

---

## 🪣 Cloud Storage Bucket: `sphere-images`

- **Bucket Name**: `sphere-images`
- **Access**: Public
- **Purpose**: Stores custom uploaded image textures for sphere partition tiles and media carousel images for member profiles.
- **Workflow**: When an image file is uploaded in [RightDockPanel.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/RightDockPanel.tsx) or [MemberProfilePage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MemberProfilePage.tsx), it is saved to `sphere-images/<filename>`, and its public CDN URL (`getPublicUrl`) is persisted in the database (`spheres.custom_user_images` or `profiles.carousels`).

---

## 🛠 Database & Service API Contracts

1. **[authService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/authService.ts)**: Handles profile creation, authentication (`signUpUser`, `signInUser`), session management, and profile updates (`updateUserProfile`).
2. **[sphereService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/sphereService.ts)**: Handles sphere persistence (`fetchSpheresFromSupabase`, `saveSphereToSupabase`, `updateSphereInSupabase`) and image uploads to Supabase storage (`uploadTileImageToSupabase`).
3. **[twitterService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/twitterService.ts)**: Handles Twitter/𝕏 OAuth 2.0 PKCE authentication via Supabase Auth Provider (`signInWithTwitterOAuth`), token exchange, and Twitter API v2 mutual OOMF extraction via Vite dev proxy. See [TWITTER_AUTH_SYSTEM.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/TWITTER_AUTH_SYSTEM.md).

---

## 📜 Full SQL Migration & RLS Script

To set up or reset the backend database and storage policies on Supabase:

```sql
-- 1. Wipe Existing Tables
DROP TABLE IF EXISTS public.spheres CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Create User Profiles Table (Direct Username + Password Auth & Profile Customizations)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  twitter_handle TEXT,
  carousels JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow user update profile" ON public.profiles FOR UPDATE USING (true);

-- 3. Create Spheres Table
CREATE TABLE public.spheres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  description TEXT,
  mapping_mode TEXT NOT NULL DEFAULT 'conquest',
  user_count INT NOT NULL DEFAULT 6,
  grid_resolution INT NOT NULL DEFAULT 512,
  theme TEXT NOT NULL DEFAULT 'neon',
  seed INT NOT NULL DEFAULT 42,
  custom_user_shares JSONB DEFAULT '[]'::jsonb,
  custom_user_images JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Enable RLS with Open Public Access Policies
ALTER TABLE public.spheres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.spheres FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.spheres FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.spheres FOR UPDATE USING (true);

-- 5. Create Public Storage Bucket for Uploaded Tile & Carousel Images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sphere-images', 'sphere-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public storage upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sphere-images');
CREATE POLICY "Allow public storage select" ON storage.objects FOR SELECT USING (bucket_id = 'sphere-images');
```
