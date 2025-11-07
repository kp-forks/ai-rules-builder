# Prompt Library Navigation & Request Access Page Enhancement

## Overview

Enable all authenticated users to see "Prompt Library" in the navigation menu, while showing an enhanced landing page to users without organization membership. The landing page will explain the Prompt Library feature and guide users to request access.

## Current State Analysis

**Navigation Visibility Logic:**
- Navigation dropdown only appears when user has more than 1 available menu item (src/components/Topbar.tsx:40-51)
- "Prompt Library" menu item only shows when `hasPromptAccess === true` (organizations.length > 0) (src/components/NavigationDropdown.tsx:71-83)
- This means authenticated users without org membership cannot see the "Prompt Library" option

**Current Access Flow:**
1. Middleware checks if route is `/prompts/*` (src/middleware/index.ts:108-122)
2. If user has NO organization membership → redirect to `/prompts/request-access` (line 206)
3. Request access page shows basic message with Airtable form link and 10xDevs invite link

**Existing Assets:**
- Landing page components in `src/components/landing/` with rich content
- `FeaturesGrid.astro` - Compares Rules Builder vs Prompt Library features
- `ChooseYourPath.astro` - Shows two paths with CTAs
- `PathCard.astro` - Reusable card component for presenting options
- Research document: `thoughts/shared/research/2025-11-07-prompt-library-access-control.md`

### Key Discoveries:
- Navigation dropdown uses `hasPromptAccess` (organizations.length > 0) to conditionally show Prompts Library
- `isAdmin` implies `hasPromptAccess` (you must be in an org to be admin of it)
- Request access page is a protected route (requires authentication)
- Landing page components are self-contained sections that can be reused

## Desired End State

**Navigation Behavior:**
- All authenticated users see navigation dropdown with:
  - Rules Builder (always)
  - Prompts Library (always)
  - Prompts Admin (only for admin users)

**Request Access Page:**
- Rich landing page explaining Prompt Library features
- Visual comparison between Rules Builder and Prompt Library
- Clear CTAs for different user paths:
  - "Go to Rules Builder" for immediate access
  - "Request Access" for Prompt Library waitlist (Airtable form)

**Verification:**
1. Log in as user without org membership
2. See "Prompt Library" in navigation dropdown
3. Click "Prompts Library" → redirected to `/prompts/request-access`
4. See enhanced landing page with features and CTAs
5. Click "Request Access" → opens Airtable form
6. Click "Go to Rules Builder" → navigates to "/"

## What We're NOT Doing

- NOT changing authentication requirements (still requires login)
- NOT modifying middleware access control logic
- NOT building in-app waitlist form (keeping Airtable)
- NOT showing Prompt Library to unauthenticated users
- NOT changing the redirect behavior for users without org access
- NOT modifying the database schema or RLS policies

## Implementation Approach

Two-phase implementation:
1. **Phase 1**: Update navigation components to show Prompt Library to all authenticated users
2. **Phase 2**: Enhance request-access page with landing components

This approach allows testing navigation changes independently before enhancing the landing page.

---

## Phase 1: Update Navigation Components

### Overview
Modify Topbar and NavigationDropdown to show "Prompt Library" menu item to all authenticated users, regardless of organization membership.

### Changes Required

#### 1. Update Topbar Component
**File**: `src/components/Topbar.tsx`

**Changes**: Update navigation item calculation logic

**Current code** (lines 40-51):
```typescript
const isAdmin = organizations.some((org) => org.role === 'admin');
const hasPromptAccess = organizations.length > 0;

// Count available navigation items
const availableNavItems = 1 + (hasPromptAccess ? 1 : 0) + (isAdmin ? 1 : 0);
const showNavigation = availableNavItems > 1;

// Don't show navigation until hydrated and data loaded
const shouldShowNavigation = hasHydrated && !isLoading && showNavigation;
```

**New code**:
```typescript
const isAdmin = organizations.some((org) => org.role === 'admin');
const hasPromptAccess = organizations.length > 0;

// Count available navigation items - Prompts Library now always visible to authenticated users
const availableNavItems = 2 + (isAdmin ? 1 : 0); // Rules Builder + Prompts Library + Admin (if applicable)
const showNavigation = availableNavItems > 1; // Always true for authenticated users

// Don't show navigation until hydrated and data loaded
const shouldShowNavigation = hasHydrated && !isLoading && showNavigation;
```

**Rationale**:
- Prompts Library is now always counted as an available item for authenticated users
- `availableNavItems` is now always at least 2 (Rules Builder + Prompts Library)
- `showNavigation` will always be true for authenticated users
- We keep `hasPromptAccess` variable as it's still passed to NavigationDropdown for admin check

#### 2. Update NavigationDropdown Component
**File**: `src/components/NavigationDropdown.tsx`

**Changes**: Remove conditional rendering wrapper from Prompts Library item

**Current code** (lines 71-98):
```typescript
{hasPromptAccess && (
  <>
    <a
      href="/prompts"
      className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
        currentPath === '/prompts'
          ? 'bg-teal-900/30 text-teal-300'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      <FileText className="size-4" />
      Prompts Library
    </a>

    {isAdmin && (
      <a
        href="/prompts/admin"
        className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
          currentPath.startsWith('/prompts/admin')
            ? 'bg-purple-900/30 text-purple-300'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
      >
        <Shield className="size-4" />
        Prompts Admin
      </a>
    )}
  </>
)}
```

**New code**:
```typescript
{/* Prompts Library - always visible to authenticated users */}
<a
  href="/prompts"
  className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
    currentPath === '/prompts'
      ? 'bg-teal-900/30 text-teal-300'
      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
  }`}
>
  <FileText className="size-4" />
  Prompts Library
</a>

{/* Prompts Admin - only for admin users */}
{isAdmin && (
  <a
    href="/prompts/admin"
    className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
      currentPath.startsWith('/prompts/admin')
        ? 'bg-purple-900/30 text-purple-300'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`}
  >
    <Shield className="size-4" />
    Prompts Admin
  </a>
)}
```

**Rationale**:
- Remove `hasPromptAccess &&` wrapper to show Prompts Library to all authenticated users
- Keep `isAdmin &&` check for admin menu (admin implies org membership)
- Add clarifying comments

### Success Criteria

#### Automated Verification:
- [x] TypeScript compilation passes: `npm run build`
- [x] No linting errors: `npm run lint`
- [x] No type errors: `npx tsc --noEmit`

#### Manual Verification:
- [ ] Log in as user WITH org membership → see "Prompts Library" in nav dropdown
- [ ] Log in as user WITHOUT org membership → see "Prompts Library" in nav dropdown
- [ ] Log in as admin user → see "Prompts Library" AND "Prompts Admin" in nav
- [ ] Log in as non-admin user → see "Prompts Library" but NOT "Prompts Admin"
- [ ] Navigation dropdown shows for all authenticated users
- [ ] Clicking "Prompts Library" (without org access) redirects to `/prompts/request-access`

---

## Phase 2: Enhance Request Access Page

### Overview
Transform the `/prompts/request-access` page from a simple message to a rich landing page that explains Prompt Library features and provides clear CTAs using existing landing page components.

### Changes Required

#### 1. Transform Request Access Page
**File**: `src/pages/prompts/request-access.astro`

**Changes**: Replace simple content with rich landing components

**Current code**:
```astro
---
import Layout from '../../layouts/Layout.astro';
import Topbar from '../../components/Topbar';
import Footer from '../../components/Footer';

const user = Astro.locals.user;
---

<Layout>
  <div class="flex flex-col h-screen max-h-screen bg-gray-950 overflow-hidden">
    <Topbar client:load initialUser={user} />
    <main class="flex-grow overflow-auto flex items-center justify-center">
      <div class="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 class="text-4xl font-bold text-white mb-4">Access Required</h1>
        <p class="text-xl text-gray-400 mb-8">
          You need organization membership to access the Prompts Library.
        </p>
        <ul class="list-disc list-inside text-gray-400 mb-8 space-y-1.5">
          <li>
            If you want to request access for your organization, please use <a
              href="https://airtable.com/appBN64leXIbQ1gDe/pagwa0kilsbzLUFBQ/form"
              target="_blank"
              class="text-blue-500 underline">this form</a
            >.
          </li>
          <li>
            If you are member of 10xDevs, please use invite from <a
              href="https://bravecourses.circle.so/c/lekcje-10x2/sections/681280/lessons/2580641"
              target="_blank"
              class="text-blue-500 underline">this lesson</a
            >.
          </li>
        </ul>

        <a
          href="/"
          class="inline-block px-6 py-3 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 transition-colors"
        >
          Return to 10xRules
        </a>
      </div>
    </main>
    <Footer client:load />
  </div>
</Layout>
```

**New code**:
```astro
---
import Layout from '../../layouts/Layout.astro';
import Topbar from '../../components/Topbar';
import Footer from '../../components/Footer';
import FeaturesGrid from '../../components/landing/FeaturesGrid.astro';
import PathCard from '../../components/ui/PathCard.astro';
import { ROUTES, EXTERNAL_LINKS } from '../../data/landingContent';
import { getTotalLibraryCount } from '../../utils/landingData';

const user = Astro.locals.user;
---

<Layout>
  <div class="flex flex-col h-screen max-h-screen bg-gray-950 overflow-hidden">
    <Topbar client:load initialUser={user} />
    <main class="flex-grow overflow-auto">
      <!-- Hero Section -->
      <section class="py-16 px-4 text-center">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
            Welcome to Prompt Library
          </h1>
          <p class="text-xl md:text-2xl text-gray-400 mb-6">
            Organization membership required to access team prompts
          </p>
          <p class="text-lg text-gray-500 max-w-2xl mx-auto">
            Prompt Library is designed for development teams to centralize and manage AI prompts.
            Individual developers can use our <strong class="text-white">Rules Builder</strong> for personal AI rules creation.
          </p>
        </div>
      </section>

      <!-- Features Comparison -->
      <FeaturesGrid />

      <!-- Choose Your Path Section -->
      <section id="choose-your-path" class="py-20 px-4">
        <div class="max-w-7xl mx-auto">
          <h2 class="text-4xl font-bold text-white text-center mb-4">
            Choose Your Path
          </h2>

          <p class="text-xl text-gray-400 text-center mb-12 max-w-3xl mx-auto">
            Start building AI rules now or request access for team collaboration
          </p>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Rules Builder Path -->
            <PathCard
              icon="🧑‍💻"
              title="Rules Builder"
              subtitle="Available now - Start immediately"
              features={[
                'Personal AI rules creation',
                `${getTotalLibraryCount()}+ framework templates`,
                'Smart import from package.json',
                'Instant export to any editor',
                'Save unlimited collections',
                'MCP server access',
              ]}
              ctaText="Go to Rules Builder"
              ctaHref={ROUTES.HOME}
              note="Already included with your account"
            />

            <!-- Prompt Library Path -->
            <PathCard
              icon="👥"
              title="Prompt Library"
              subtitle="Request access for your organization"
              features={[
                'Centralized prompt management',
                'Admin curation tools',
                'Role-based team access',
                'Collections & segments',
                'Publish/draft workflows',
                'MCP server access',
              ]}
              ctaText="Request Access"
              ctaHref={EXTERNAL_LINKS.LIBRARY_FORM}
              note="Currently available for selected organizations (pilot program)"
            />
          </div>

          <!-- Additional Info for 10xDevs Members -->
          <div class="mt-8 p-6 bg-blue-900/20 border border-blue-800 rounded-lg max-w-2xl mx-auto">
            <h3 class="text-lg font-semibold text-blue-200 mb-2">
              10xDevs Members
            </h3>
            <p class="text-blue-300 text-sm">
              If you are a member of 10xDevs, you can use the invite link from{' '}
              <a
                href="https://bravecourses.circle.so/c/lekcje-10x2/sections/681280/lessons/2580641"
                target="_blank"
                class="text-blue-400 underline hover:text-blue-300"
              >
                this lesson
              </a>
              {' '}to join the organization directly.
            </p>
          </div>
        </div>
      </section>
    </main>
    <Footer client:load />
  </div>
</Layout>
```

**Rationale**:
- Reuse `FeaturesGrid.astro` component to show feature comparison
- Use `PathCard` component (same as ChooseYourPath) with customized CTAs for authenticated users
- Rules Builder CTA points to "/" (already available)
- Prompt Library CTA points to Airtable form (external waitlist)
- Add 10xDevs member notice as supplementary info box
- Maintain existing layout structure (Topbar + Footer)

### Success Criteria

#### Automated Verification:
- [x] Page builds successfully: `npm run build`
- [x] No linting errors: `npm run lint`
- [ ] No console errors when visiting page

#### Manual Verification:
- [ ] Navigate to `/prompts/request-access` as authenticated user without org access
- [ ] See hero section explaining org membership requirement
- [ ] See FeaturesGrid comparing Rules Builder vs Prompt Library features
- [ ] See two PathCards with correct CTAs
- [ ] Click "Go to Rules Builder" → navigates to "/" (Rules Builder)
- [ ] Click "Request Access" → opens Airtable form in new tab
- [ ] See 10xDevs member notice with working link
- [ ] Page is responsive on mobile and desktop
- [ ] Visual design matches landing page aesthetics

**Implementation Note**: After completing Phase 1 and verifying all manual tests pass, proceed to Phase 2.

---

## Testing Strategy

### Unit Tests
Not required for this implementation as changes are primarily UI/UX focused without complex business logic.

### Integration Tests
Consider adding E2E test for navigation flow:
```typescript
test('authenticated user without org access sees prompt library in nav and can access landing page', async ({ page }) => {
  // Login as user without org membership
  await loginAsUserWithoutOrg(page);

  // Verify Prompts Library appears in navigation
  await expect(page.locator('text=Prompts Library')).toBeVisible();

  // Click Prompts Library
  await page.click('text=Prompts Library');

  // Verify redirected to request access page
  await expect(page).toHaveURL('/prompts/request-access');

  // Verify landing page content
  await expect(page.locator('h1:has-text("Welcome to Prompt Library")')).toBeVisible();
  await expect(page.locator('text=Request Access')).toBeVisible();
});
```

### Manual Testing Steps

**Test Case 1: Navigation Visibility (User Without Org)**
1. Log in as user without organization membership
2. Verify navigation dropdown is visible
3. Click dropdown → verify "Rules Builder" and "Prompts Library" are visible
4. Verify "Prompts Admin" is NOT visible
5. Click "Prompts Library"
6. Verify redirected to `/prompts/request-access`

**Test Case 2: Navigation Visibility (User With Org, Non-Admin)**
1. Log in as user with organization membership (non-admin role)
2. Verify navigation dropdown is visible
3. Click dropdown → verify "Rules Builder" and "Prompts Library" are visible
4. Verify "Prompts Admin" is NOT visible
5. Click "Prompts Library"
6. Verify navigated to `/prompts` (library page, not request-access)

**Test Case 3: Navigation Visibility (Admin User)**
1. Log in as admin user
2. Verify navigation dropdown is visible
3. Click dropdown → verify all three items visible: "Rules Builder", "Prompts Library", "Prompts Admin"
4. Click "Prompts Admin"
5. Verify navigated to `/prompts/admin`

**Test Case 4: Request Access Page Content**
1. Navigate to `/prompts/request-access` (as user without org)
2. Verify hero section displays "Welcome to Prompt Library"
3. Scroll down → verify FeaturesGrid shows Rules Builder vs Prompt Library comparison
4. Scroll down → verify two PathCards displayed side-by-side
5. Verify "Go to Rules Builder" button on left card
6. Verify "Request Access" button on right card
7. Verify 10xDevs member notice appears at bottom

**Test Case 5: CTAs Function Correctly**
1. On request-access page, click "Go to Rules Builder"
2. Verify navigated to "/" (Rules Builder page)
3. Go back to request-access page
4. Click "Request Access" button
5. Verify Airtable form opens in new tab
6. Click 10xDevs lesson link
7. Verify Circle lesson opens in new tab

**Test Case 6: Responsive Design**
1. View request-access page on desktop (1920x1080)
2. Verify two-column layout for PathCards
3. Resize to tablet (768px)
4. Verify layout remains readable
5. Resize to mobile (375px)
6. Verify PathCards stack vertically
7. Verify all buttons are clickable

## Performance Considerations

- No additional API calls introduced
- Landing components are static/SSR (no client-side hydration needed)
- PathCard components are lightweight
- FeaturesGrid component already optimized for landing page

## Migration Notes

No database migration required. No data migration required. This is purely a UI/UX change.

## References

- Research document: `thoughts/shared/research/2025-11-07-prompt-library-access-control.md`
- Navigation components:
  - `src/components/Topbar.tsx:40-51` - Navigation visibility calculation
  - `src/components/NavigationDropdown.tsx:71-98` - Menu items rendering
- Landing components:
  - `src/components/landing/FeaturesGrid.astro` - Feature comparison
  - `src/components/landing/ChooseYourPath.astro` - Path selection pattern
  - `src/components/ui/PathCard.astro` - Reusable card component
- Current request access page: `src/pages/prompts/request-access.astro`
- Middleware access control: `src/middleware/index.ts:196-217`
- Landing content constants: `src/data/landingContent.ts`
