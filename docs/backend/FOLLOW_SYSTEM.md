# Follower & Following System Specification

## 📌 Architectural Overview

OOMFS features a full-featured **X/Twitter-Style Follower & Following System** allowing authenticated users to follow other user accounts, view live follower/following counts, and browse interactive tabbed user list modals with real-time profile navigation.

Key Principles:
- **Directional Relationship Model**: Following account $A \rightarrow B$ does not automatically create $B \rightarrow A$. Relationships are tracked independently in Supabase PostgreSQL (`public.follows`).
- **X/Twitter Signature UI & UX**:
  - Unfollowed state: High-contrast **"Follow"** accent button.
  - Followed state: Muted **"Following"** button.
  - Hover state on followed accounts: Transitions to a red **"Unfollow"** action badge.
- **Atomic PostgreSQL Relational Persistence**: Follow actions map clean username handles or user IDs to canonical Supabase `public.profiles` UUIDs, ensuring relationships persist across page reloads, logouts, and multi-device sessions.
- **Optimistic UI & Cross-Component Sync**: Actions immediately reflect in local storage and emit an `oomfs-follow-change` custom browser event to synchronize stats across header navigation, profile cards, and modal views.

---

## 🗄 Database Schema & RLS Policies: `public.follows`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, `DEFAULT gen_random_uuid()` | Unique relationship identifier |
| `follower_id` | `uuid` | `NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE` | User account initiating the follow |
| `following_id` | `uuid` | `NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE` | Target user account being followed |
| `created_at` | `timestamptz` | `DEFAULT now() NOT NULL` | Follow creation timestamp |

### Constraints & Indexes
```sql
-- Guarantee no duplicate follow relationships
ALTER TABLE public.follows ADD CONSTRAINT unique_follower_following UNIQUE(follower_id, following_id);

-- Indexes for performance during follower & following list queries
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
```

### Row Level Security (RLS)
```sql
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Allow public insert follows" ON public.follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete follows" ON public.follows FOR DELETE USING (true);
```

---

## 🛠 Service API Contracts ([followService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/followService.ts))

The application manages account relationship state strictly through service functions defined in `followService.ts`:

### 1. `followUser(followerIdentifier, followingIdentifier): Promise<boolean>`
- Resolves `follower` and `following` profile UUIDs via `resolveProfile()`.
- Updates browser local cache (`oomfs_local_follows_v2`) for instant optimistic feedback.
- Dispatches `oomfs-follow-change` event.
- Inserts `{ follower_id, following_id }` into Supabase PostgreSQL `public.follows`.

### 2. `unfollowUser(followerIdentifier, followingIdentifier): Promise<boolean>`
- Resolves `follower` and `following` profile UUIDs.
- Removes matching record from local cache and dispatches `oomfs-follow-change`.
- Deletes row from Supabase `public.follows`.

### 3. `checkIsFollowing(followerIdentifier, followingIdentifier): Promise<boolean>`
- Checks local cache for instant return value.
- Queries Supabase `public.follows` by resolved UUID pair.

### 4. `fetchFollowStats(identifier): Promise<FollowStats>`
- Resolves target profile UUID.
- Queries exact count of `follower_id` and `following_id` in `public.follows`.
- Merges with local cache fallback to return `{ followerCount, followingCount }`.

### 5. `fetchFollowersList(targetIdentifier, currentIdentifier): Promise<FollowUserSummary[]>`
- Resolves target profile UUID.
- Queries `public.follows` with an SQL relational join on `public.profiles`:
  `select follower_id, profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, bio)`
- Returns list of `FollowUserSummary` objects containing real user handles, display names, avatars, bios, and `isFollowing` status relative to current user.

### 6. `fetchFollowingList(targetIdentifier, currentIdentifier): Promise<FollowUserSummary[]>`
- Queries `public.follows` with relational join on `following_id`.
- Returns user accounts being followed by `targetIdentifier`.

---

## 🎨 UI Integration & Components ([MemberProfilePage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MemberProfilePage.tsx))

1. **Profile Action Bar**:
   - Renders **Follow / Following / Unfollow** button on external profile views (`!isOwnProfile`).
   - Guest user click triggers authentication modal (`onOpenAuthModal('login')`).
2. **Followers & Following Count Badges**:
   - Displayed under user handle: **`X Following`** • **`Y Followers`**.
   - Hover underline style with pointer cursor.
3. **Tabbed Followers & Following List Modal**:
   - Overlay dialog opened by clicking count badges.
   - Headers with **[Followers]** and **[Following]** count tabs.
   - Real-time search filter input (`modalSearchQuery`).
   - User account cards with avatars, display names, handles, bios, profile navigation callbacks (`onSelectUser`), and inline follow/unfollow toggle buttons.

---

## ⚡ Extension Guidelines for AI Agents

1. **Use Username Handles or Resolved UUIDs**:
   - Always pass clean username handles (e.g. `satoshi`, `oprah_oomf`) or resolved UUIDs to `followService` methods.
   - Avoid passing raw synthetic UI strings without calling `resolveProfile()`.
2. **Preserve Relational Joins**:
   - When fetching followers or following lists in Supabase, preserve foreign key joins (`profiles!follows_follower_id_fkey` and `profiles!follows_following_id_fkey`) to ensure user metadata (username, display name, avatar) is retrieved atomically.
3. **Event Listening**:
   - UI components relying on relationship counts should register an event listener for `oomfs-follow-change` to update live stats automatically.
