# User Account System & Auth Architecture Specification

## 📌 Architecture Overview

OOMFS features a lightweight, high-performance **Username & Password Authentication Engine** backed by PostgreSQL (`public.profiles`) via Supabase and client-side password hashing using the native **Web Crypto API (SHA-256)**.

Key Principles:
- **No Email Verification Friction**: Accounts are identified strictly by unique usernames and passwords.
- **Immunity to Auth API Gateway Rate Limits**: Direct database queries replace Supabase Auth email endpoints, eliminating HTTP 429 rate limit issues.
- **Persistent Sessions**: User session state persists across page reloads via `localStorage` (`oomfs_user_session`) and custom cross-tab events (`oomfs-auth-change`).
- **Sphere Ownership & Account Profiles**: Active user handles map directly to 3D sphere globe creation rights and personal account profiles (`@username`) equipped with bio, Twitter/𝕏 handle, avatar, and custom media carousels.

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

### SQL Setup Script
```sql
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
```

---

## 🛠 Auth Service API Contracts ([authService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/authService.ts))

The application manages account sessions strictly through service functions defined in `authService.ts`:

### 1. `signUpUser({ username, password }): Promise<UserProfile>`
- Hashes password using `crypto.subtle.digest('SHA-256')` with string salting.
- Verifies username availability in `public.profiles`.
- Inserts new profile record and writes user session to `localStorage`.
- Dispatches `oomfs-auth-change` event for instant UI re-renders.

### 2. `signInUser({ identifier, password }): Promise<UserProfile>`
- Hashes password and matches `username` and `password_hash` against `public.profiles`.
- Writes user session to `localStorage` and dispatches `oomfs-auth-change` event.

### 3. `signOutUser(): Promise<void>`
- Removes `oomfs_user_session` from `localStorage` and dispatches `oomfs-auth-change` event.

### 4. `getCurrentUserProfile(): Promise<UserProfile | null>`
- Reads and parses active `UserProfile` from `localStorage`.

### 5. `updateUserProfile({ userId, updates }): Promise<UserProfile | null>`
- Updates `bio`, `twitter_handle`, `avatar_url`, and `carousels` columns in `public.profiles` for `userId`.
- Updates active session in `localStorage` and dispatches `oomfs-auth-change` event.

### 6. `fetchUserProfileByUsername(username): Promise<UserProfile | null>`
- Queries `public.profiles` by `username` and returns the mapped `UserProfile` object.

### 7. `onAuthStateChange(callback): { data: { subscription: { unsubscribe } } }`
- Listens to window `oomfs-auth-change` and `storage` events, invoking `callback` whenever authentication state updates.

---

## 🎨 UI Component Architecture & Behavioral Details

### 1. `UserMenu.tsx` (Header Navigation Widget)
Located on the top-right of [Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/UserMenu.tsx):
- **Unauthenticated View**: Displays two action buttons:
  - `"Log In"` (Cyan icon) $\rightarrow$ opens `AuthModal` in `'login'` mode.
  - `"Register"` (Cyan gradient pill) $\rightarrow$ opens `AuthModal` in `'register'` mode.
- **Authenticated View**: Renders a glassmorphism pill displaying a round avatar with the user's handle initial and `@username`.
- **Dropdown Popover**: Clicking `@username` toggles a popup menu showing:
  - Account handle header.
  - `"My Profile"` action item $\rightarrow$ navigates directly to `MemberProfilePage`.
  - `"Sign Out"` action button with a rose-red icon.

### 2. `Header.tsx` (Top Navigation Bar)
- Includes direct **"My Profile"** navigation tab when `currentUser !== null`.
- Switches `activeTab` to `'member'` in root `App.tsx`.

### 3. `MemberProfilePage.tsx` (Account Profile Page)
- Page-sized account profile manager (`max-w-6xl`).
- Features bio text editor, Twitter handle reservation, custom titled image carousels with tightly packed native aspect ratio cards, lightbox preview modal, and profile owner controls.

### 4. `AuthModal.tsx` (Login & Account Creation Modal)
Glassmorphism modal popup rendered at root in [App.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/App.tsx):
- **Backdrop & Styling**: Fullscreen dark backdrop blur overlay (`backdrop-blur-md bg-slate-950/80`).
- **Tab Switcher**: Toggle buttons to switch between `"Log In"` and `"Create Account"` modes.
- **Inputs**: Username and Password inputs.
- **Error Banner**: Renders animated rose-red alert box when validation or database errors occur.
- **Loading State**: Submit button displays an animated spinner (`Loader2`) during async auth operations.

---

## 🔒 Sphere Ownership & Account Separation Model

1. **Sphere Auto-Attribution**: Creating a 3D sphere planet in Code Galaxy attributes `ownerName` to `@` + `currentUser.username`.
2. **View-Only Mode for Non-Owners**: Spheres enforce a **`🔒 View-Only Mode`** lock banner for non-owners in `RightDockPanel.tsx`.
3. **Strict Account/Partition Separation**: 3D globe partition tiles are strictly map territory allocations. Member Profile pages represent authenticated user accounts (`UserProfile`).
