---
date: 2025-11-07T11:10:51Z
researcher: Claude Code
git_commit: d8a283f62f016128581b4c0814a31623b6a8ebac
branch: master
repository: ai-rules-builder
topic: "Analyze access to Prompt Library - when main navigation is visible, what is checked and where, etc. feature flags, database checks, user status, etc."
tags: [research, codebase, prompt-library, navigation, access-control, feature-flags, authentication, authorization]
status: complete
last_updated: 2025-11-07
last_updated_by: Claude Code
---

# Research: Prompt Library Access Control and Navigation Visibility

**Date**: 2025-11-07T11:10:51Z
**Researcher**: Claude Code
**Git Commit**: d8a283f62f016128581b4c0814a31623b6a8ebac
**Branch**: master
**Repository**: ai-rules-builder

## Research Question

Analyze access to Prompt Library - when main navigation is visible, what is checked and where, etc. feature flags, database checks, user status, etc.

## Summary

The Prompt Library feature implements a comprehensive **multi-layered access control system** with defense-in-depth architecture:

1. **Feature Flag Layer** - Environment-based toggle with override capability
2. **Authentication Layer** - User session validation via Supabase Auth
3. **Authorization Layer** - Organization membership and role-based access control (RBAC)
4. **Navigation Layer** - Conditional UI rendering based on user permissions
5. **Database Layer** - Row-level security policies enforcing data isolation

**Navigation visibility** is determined by:
- User authentication status
- Organization membership (requires at least one organization for Prompt Library access)
- Admin role status (for admin routes)
- Feature flag enablement
- Hydration state (client-side)

## Detailed Findings

### Navigation Components and Visibility Logic

#### Topbar Component (Desktop/Tablet Navigation)

**File**: `src/components/Topbar.tsx`

The Topbar is the primary navigation component with sophisticated visibility logic:

**Visibility Determination** (Lines 40-51):
```typescript
const isAdmin = organizations.some((org) => org.role === 'admin');
const hasPromptAccess = organizations.length > 0;
const availableNavItems = 1 + (hasPromptAccess ? 1 : 0) + (isAdmin ? 1 : 0);
const showNavigation = availableNavItems > 1;
const shouldShowNavigation = hasHydrated && !isLoading && showNavigation;
```

This calculates:
- **isAdmin**: User has admin role in any organization
- **hasPromptAccess**: User is member of at least one organization
- **availableNavItems**: Count of menu items (1=Rules Builder, +1 if has prompt access, +1 if admin)
- **showNavigation**: Only show dropdown if more than 1 item available
- **shouldShowNavigation**: Final check including hydration and loading state

**Conditional Rendering** (Lines 62-77):
- Navigation dropdown only shown if `initialUser` exists AND `shouldShowNavigation` is true
- Loading skeleton displayed during hydration (lines 70-76)

#### NavigationDropdown Component

**File**: `src/components/NavigationDropdown.tsx`

This component renders the actual navigation items with conditional visibility:

**Props** (Lines 4-8):
- `isAdmin: boolean` - Controls admin link visibility
- `hasPromptAccess: boolean` - Controls prompt library link visibility
- `currentPath: string` - Current route for active state styling

**Navigation Items**:

1. **Rules Builder** (Lines 59-69) - Always visible
   - Route: `/`
   - Active state: `currentPath === '/'`

2. **Prompts Library** (Lines 71-83) - Conditional
   - **Visibility**: `hasPromptAccess === true`
   - Route: `/prompts`
   - Active state: `currentPath === '/prompts'`

3. **Prompts Admin** (Lines 85-96) - Double conditional
   - **Visibility**: `hasPromptAccess === true` AND `isAdmin === true`
   - Route: `/prompts/admin`
   - Active state: `currentPath.startsWith('/prompts/admin')`

#### Mobile Navigation Component

**File**: `src/components/MobileNavigation.tsx`

Mobile-specific bottom navigation bar with feature flag integration:

**Feature Flag Check** (Line 32):
```typescript
const isCollectionsEnabled = isFeatureEnabled('authOnUI');
```

**Navigation Items**:
- Collections tab (conditional on `authOnUI` feature flag)
- Builder tab (always visible)
- Preview tab (always visible)

### Feature Flag System

#### Configuration

**File**: `src/features/featureFlags.ts`

**Available Feature Flags** (Line 14):
- `auth` - Authentication system
- `collections` - Rule collections feature
- `authOnUI` - Auth UI elements (login/logout buttons)
- **`promptLibrary`** - Prompt library access
- `orgInvites` - Organization invitations

**Environment Configuration** (Lines 31-53):
All flags are currently enabled in all environments (local, integration, prod).

**Override Mechanism** (Lines 55-77):
The Prompt Library flag can be overridden via environment variables:
- `PUBLIC_PROMPT_LIBRARY_ENABLED`
- `PROMPT_LIBRARY_ENABLED`

Accepts: '1', 'true', 'on', 'yes' (enable) or '0', 'false', 'off', 'no' (disable)

#### Middleware Integration

**File**: `src/middleware/index.ts`

**Feature Flag Check in Middleware** (Lines 180-193):
```typescript
const flagEnabled = ensurePromptLibraryEnabled();
const isPromptRoute = isPromptLibraryRoute(pathname);

if (isPromptRoute) {
  locals.promptLibrary = {
    organizations: [],
    activeOrganization: null,
    flagEnabled,
  };

  if (!flagEnabled) {
    return promptLibraryFlagDisabledResponse();  // Returns 404
  }
}
```

**Route Detection** (Lines 86-122):
- Base path: `/prompts`
- Admin path: `/prompts/admin`
- API path: `/api/prompts`
- Request access path: `/prompts/request-access`

### Authentication Flow

#### Middleware Session Validation

**File**: `src/middleware/index.ts`

**Session Check** (Lines 144-155):
```typescript
const { data: { user }, error } = await supabase.auth.getUser();

if (!error && user) {
  locals.user = {
    id: user.id,
    email: user.email || '',
  };
}
```

This happens on **every request**, setting `locals.user` if authenticated.

**Public Path Bypass** (Lines 158-161):
Certain paths don't require authentication:
- `/`, `/auth/login`, `/auth/signup`, `/auth/reset-password`
- `/api/auth/*`, `/api/captcha/verify`
- `/api/upload-dependencies`, `/api/invites/validate`
- `/privacy/*`

**Protected Route Enforcement** (Lines 164-177):
- API routes: Return 401 if not authenticated
- Page routes: Redirect to `/auth/login` if not authenticated

#### Auth Store (Client-Side State)

**File**: `src/store/authStore.ts`

Zustand store managing authentication state:
- `user: User | null` (default: null, line 16)
- `isAuthenticated: boolean` (derived from user presence)
- `setUser(user)` - Updates state (line 18)
- `logout()` - Clears state (line 19)

### Authorization and Organization Membership

#### Prompt Library Context Building

**File**: `src/middleware/index.ts` (Lines 196-217)

For Prompt Library routes, middleware builds authorization context:

```typescript
const organizations = await buildPromptLibraryContext(user.id, supabase);
locals.promptLibrary.organizations = organizations;

// Select active organization (from query param or first available)
const activeOrganization = selectActiveOrganization(organizations, url.searchParams);
locals.promptLibrary.activeOrganization = activeOrganization;

// Redirect if no organization membership
if (!hasPromptLibraryAccess({ organizations })) {
  return Response.redirect(new URL('/prompts/request-access', url));
}

// Redirect if accessing admin without admin role
if (isPromptLibraryAdminRoute(pathname)) {
  if (!hasPromptLibraryAdminAccess({ organizations })) {
    return Response.redirect(new URL('/prompts', url));
  }
}
```

#### Access Control Service

**File**: `src/services/prompt-library/access.ts`

**Key Functions**:

1. **`buildPromptLibraryContext(userId, supabase)`** (Lines 29-39)
   - Fetches user's organization memberships from database
   - Returns `OrganizationMembership[]` with role information

2. **`hasPromptLibraryAccess({ organizations })`** (Lines 41-43)
   - Checks: `organizations.length > 0`
   - User must be member of at least one organization

3. **`hasPromptLibraryAdminAccess({ organizations })`** (Lines 45-47)
   - Checks: `organizations.some((org) => org.role === 'admin')`
   - User must have admin role in at least one organization

4. **`shouldAllowPromptLibraryAccess(...)`** (Lines 53-62)
   - Combines feature flag check AND organization membership check

5. **`shouldAllowPromptLibraryAdminAccess(...)`** (Lines 64-73)
   - Combines feature flag check AND admin role check

#### Organizations Service

**File**: `src/services/prompt-library/organizations.ts`

**`fetchUserOrganizations(userId, supabase)`** (Lines 30-59):
- Queries `organization_members` table
- Filters by `user_id`
- Joins with `organizations` table
- Returns array with organization details and user's role

**Role Types** (Line 5):
```typescript
type OrganizationRole = 'member' | 'admin';
```

**Role Normalization** (Line 57):
Treats anything != 'admin' as 'member' for security.

### Database Access Control

#### Database Schema

**File**: `src/db/database.types.ts`

**Key Tables**:

1. **`organization_members`** (Lines 143-174)
   - `user_id: string` - User identifier
   - `organization_id: string` - Organization association
   - `role: string` - 'admin' or 'member'

2. **`organizations`** (Lines 175-198)
   - `slug: string` - Organization identifier

3. **`prompts`** (Lines 278-353)
   - `organization_id: string` - Organization ownership
   - `created_by: string | null` - Creator tracking
   - `status: string` - Draft/published status

4. **`prompt_collections`** (Lines 237-277)
   - `organization_id: string` - Organization association

5. **`collections`** (Lines 31-60) - Legacy user collections
   - `user_id: string` - User ownership

**Database Functions** (Lines 382-398):
- `is_org_admin(org_id, user_id) -> boolean` - Server-side admin check
- `increment_invite_usage(invite_id)` - Atomic invite counter
- `get_invite_redemption_emails(invite_id)` - Audit trail

#### Row-Level Security Policies

**File**: `supabase/migrations/20251004000000_consolidated_rls.sql`

**Organization Members Policies** (Lines 116-156):
- Users can view only their own memberships
- Org admins can view all members in their orgs
- Users can add themselves (for invite redemption)
- Users can update/delete own memberships; admins can manage any

**Prompts Table Policies** (Lines 223-266):
- Members can view **published** prompts in their orgs
- Admins can view **all** prompts (including drafts)
- Only admins can create/update/delete prompts

**Prompt Collections Policies** (Lines 269-303):
- All org members can view collections
- Only admins can create/update/delete collections

**Legacy Collections Policies** (Lines 395-430):
- Users can only access their own collections (filtered by `user_id`)

### API Endpoint Access Control

#### Prompt Library Member Endpoints

**File**: `src/pages/api/prompts/index.ts` (Lines 14-60)

**Access checks**:
1. Feature flag: `isFeatureEnabled('promptLibrary')` - Returns 404 if disabled
2. Authentication: `locals.user` must exist - Returns 401 if not authenticated
3. Organization context: `locals.promptLibrary?.activeOrganization` must exist

#### Prompt Library Admin Endpoints

**File**: `src/pages/api/prompts/admin/prompts.ts`

**POST endpoint** (Lines 9-22):
```typescript
const user = locals.user;
const activeOrganization = locals.promptLibrary?.activeOrganization;

if (!user || !activeOrganization) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
  });
}

if (activeOrganization.role !== 'admin') {
  return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
    status: 403,
  });
}
```

This pattern is consistent across all admin endpoints:
- Verify user exists
- Verify active organization exists
- **Verify user has 'admin' role in organization**

### Complete Access Control Flow

Here's the end-to-end flow when a user tries to access Prompt Library:

1. **Request arrives** → Middleware executes
2. **Feature flag check** → `ensurePromptLibraryEnabled()` - If disabled, return 404
3. **Session validation** → `supabase.auth.getUser()` - Sets `locals.user` if authenticated
4. **Public path check** → If public, skip remaining checks
5. **Protected route check** → If not authenticated, return 401/redirect to login
6. **Prompt Library route detection** → Check if `/prompts` or `/api/prompts`
7. **Build authorization context** → `buildPromptLibraryContext()` fetches organizations
8. **Organization membership check** → `hasPromptLibraryAccess()` - Requires at least one org
9. **Admin route check** → If `/prompts/admin`, verify `hasPromptLibraryAdminAccess()`
10. **Redirect/allow** → Based on checks, redirect to request-access or allow through
11. **Page/API handler** → Additional verification at endpoint level
12. **Database RLS** → Final enforcement via row-level security policies

## Code References

**Navigation Components**:
- `src/components/Topbar.tsx:40-51` - Navigation visibility calculation
- `src/components/NavigationDropdown.tsx:71-83` - Prompt Library menu item
- `src/components/NavigationDropdown.tsx:85-96` - Admin menu item
- `src/components/MobileNavigation.tsx:32` - Feature flag check

**Feature Flags**:
- `src/features/featureFlags.ts:14` - Feature flag definitions
- `src/features/featureFlags.ts:15` - PROMPT_LIBRARY_ENABLED constant
- `src/features/featureFlags.ts:93-107` - isFeatureEnabled() function
- `src/features/featureFlags.ts:55-77` - Override mechanism

**Middleware**:
- `src/middleware/index.ts:144-155` - Session validation
- `src/middleware/index.ts:164-177` - Protected route enforcement
- `src/middleware/index.ts:180-193` - Feature flag check
- `src/middleware/index.ts:196-217` - Authorization context building

**Access Control**:
- `src/services/prompt-library/access.ts:29-39` - buildPromptLibraryContext()
- `src/services/prompt-library/access.ts:41-43` - hasPromptLibraryAccess()
- `src/services/prompt-library/access.ts:45-47` - hasPromptLibraryAdminAccess()
- `src/services/prompt-library/organizations.ts:30-59` - fetchUserOrganizations()

**Database**:
- `src/db/database.types.ts:143-174` - organization_members table
- `src/db/database.types.ts:278-353` - prompts table
- `supabase/migrations/20251004000000_consolidated_rls.sql:223-266` - Prompts RLS policies
- `supabase/migrations/20251004000000_consolidated_rls.sql:116-156` - Organization members RLS

**API Endpoints**:
- `src/pages/api/prompts/index.ts:14-22` - Member access checks
- `src/pages/api/prompts/admin/prompts.ts:9-22` - Admin access checks

**Auth System**:
- `src/store/authStore.ts:16-19` - Client-side auth state
- `src/services/auth.ts:51-58` - Login service
- `src/hooks/useAuth.ts:1-52` - React auth hook

## Architecture Insights

### Defense-in-Depth Security Model

The application implements multiple layers of security checks:

1. **Feature flag layer** - Can globally disable Prompt Library
2. **Middleware layer** - Validates session and organization membership
3. **Service layer** - Access control functions verify permissions
4. **API endpoint layer** - Explicit role checks in each endpoint
5. **Database layer** - Row-level security policies as final enforcement

This ensures that even if one layer fails, others provide protection.

### Separation of Concerns

- **Authentication** (who you are) - Handled by Supabase Auth + authStore
- **Authorization** (what you can do) - Handled by organization membership and roles
- **Feature enablement** - Handled by feature flags system

### Client-Server State Synchronization

The Topbar component demonstrates excellent SSR/CSR integration:
1. Server provides `initialUser` via Astro.locals (SSR)
2. Client initializes auth store with this data (line 28)
3. Client fetches fresh organization data (lines 34-37)
4. Navigation visibility recalculates based on fresh data

### Role-Based Access Control (RBAC)

Two-tier role system:
- **Member** - Can view published prompts and collections
- **Admin** - Can create/edit/delete prompts and collections, manage invites

This is enforced at:
- Middleware level (lines 209-216 in middleware/index.ts)
- API level (admin endpoints check `role !== 'admin'`)
- Database level (RLS policies check `is_org_admin()`)

### Atomic Operations

The invite system uses database functions for atomic operations:
- `increment_invite_usage()` prevents race conditions
- Ensures max_uses limits are respected even under concurrent redemptions

## Related Research

This research covers access control architecture. Related areas for future research:
- Invite redemption flow and user onboarding
- Prompt content management and versioning
- Organization management and multi-tenancy
- Rate limiting and abuse prevention

## Open Questions

1. **Organization creation flow** - How are new organizations created? Is there a self-service flow or admin-only?
2. **User migration** - Is there a path for users to migrate from legacy collections to organization-based prompts?
3. **Role granularity** - Are there plans for more granular permissions beyond member/admin?
4. **Audit logging** - Is there audit logging for admin actions on prompts/collections?
5. **Multi-organization users** - How do users switch between organizations? The dropdown shows current org but switching mechanism not explored.
