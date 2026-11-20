# Portal Pages Design System Compliance Audit

**Date:** 2026-11-18  
**Scope:** All 11 portal pages in `web/src/`  
**Status:** Phase 2 - Brand Token Application & Visual Verification

---

## Executive Summary

| Page | DS Components | Hardcoded Tailwind | Inline Styles | P0 Issues | P1 Issues | P2 Issues |
|------|---------------|-------------------|---------------|-----------|-----------|-----------|
| CustomerDashboard | ✅ Full | ✅ **Fixed** | ✅ **Fixed** | 0 | 1 | 3 |
| StaffDashboard | ✅ Full | ✅ **Fixed** | ✅ None | 0 | 1 | 3 |
| VetDashboard | ✅ Full | ✅ **Fixed** | ✅ None | 0 | 1 | 3 |
| OwnerDashboard | ✅ Full | ✅ **Fixed** | ✅ **Fixed** | 0 | 1 | 3 |
| AdminDashboard | ✅ Full | ✅ **Fixed** | ✅ None | 0 | 1 | 3 |
| ProfileTab | ✅ Full | ⚠️ None | ⚠️ None | 0 | 0 | 1 |
| **AdminConsole** | ✅ **Fixed** | ✅ **Fixed** | ✅ **Fixed** | 0 | 1 | 2 |
| **StaffPortal (App)** | ✅ **Fixed** | ✅ **Fixed** | ✅ **Fixed** | 0 | 1 | 2 |
| **AuthLayout** | ✅ **Fixed** | ✅ **Fixed** | ✅ **Fixed** | 0 | 0 | 1 |
| **LoginPage** | ✅ Via FormInput | ✅ Via AuthLayout | ⚠️ None | 0 | 0 | 0 |
| **RegisterPage** | ✅ Via FormInput | ✅ Via AuthLayout | ⚠️ None | 0 | 0 | 0 |
| **ForgotPasswordPage** | ✅ Via FormInput | ✅ Via AuthLayout | ⚠️ None | 0 | 0 | 0 |

---

## P0 - Critical Violations (Break Visual Consistency / Accessibility) - **MOSTLY FIXED**

### 1. AuthLayout.jsx - **FIXED** (2026-11-18)
**File:** `web/src/components/auth/AuthLayout.jsx`
- **Status:** ✅ Rewritten using design system Card, tokens
- **Changes:** Replaced hardcoded dark theme with `var(--color-bg-primary)`, `var(--color-brand-primary)`, `var(--radius-card-lg)`, `var(--shadow-card-lg)`

### 2. AdminConsole.jsx - **FIXED** (2026-11-19)
**File:** `web/src/AdminConsole.jsx`
- **Status:** ✅ Rewritten using design system tokens throughout
- **Changes:**
  - Replaced custom dark theme with `var(--color-bg-primary)`, `var(--color-fg-primary)`, `var(--color-bg-secondary)`, `var(--color-bg-tertiary)`
  - Hardcoded colors replaced: `var(--color-brand-primary)`, `var(--color-brand-secondary)`, `var(--color-status-success-main)`
  - Uses design system components: Card, Button, Input, Select, Badge, Table, Avatar, Sidebar
  - Gradient uses `from-[var(--color-brand-primary)] to-[var(--color-brand-secondary)]`
- **Impact:** Now consistent with portal design system

### 3. StaffPortal.jsx (AppContent) - **FIXED** (2026-11-18)
**File:** `web/src/StaffPortal.jsx`
- **Status:** ✅ Rewritten using design system tokens throughout
- **Changes:**
  - renderNavSwitcher: Uses `var(--color-bg-primary)`, `var(--color-border-primary)`, `var(--shadow-sm)`
  - Main layout: Uses `var(--color-bg-secondary)`, `var(--color-fg-primary)`, `var(--color-bg-tertiary)`
  - Sidebar header/footer: Uses `var(--color-bg-secondary)`, `var(--color-border-primary)`
  - Top bar: Uses `var(--color-bg-primary)`, `var(--color-border-primary)`
  - ROLE_CONFIGS: Now use `badgeVariant` (design system Badge variants) and `accentToken` (CSS custom properties)

### 4. Dashboard Pages - Role-Specific Hardcoded Colors - **FIXED** (2026-11-18)
**Files:** All 5 dashboards now use role-based design tokens:
- **Added to design system:** Role-based CSS custom properties (`--color-role-customer-*`, `--color-role-veterinarian-*`, `--color-role-staff-*`, `--color-role-owner-*`, `--color-role-admin-*`)
- **CustomerDashboard:** Uses `var(--color-role-customer-*)` tokens
- **StaffDashboard:** Uses `var(--color-role-staff-*)` tokens
- **VetDashboard:** Uses `var(--color-role-veterinarian-*)` tokens
- **OwnerDashboard:** Uses `var(--color-role-owner-*)` tokens + status tokens for progress bars
- **AdminDashboard:** Uses `var(--color-role-admin-*)` tokens

---

## P1 - High Priority (Should Use Design Tokens)

### 1. Inline Styles for Progress Bars - **PARTIALLY FIXED**
- **CustomerDashboard**: Width still uses inline style (acceptable for dynamic values), but color now uses `var(--color-role-customer-main)` ✅
- **OwnerDashboard**: Progress bar colors now use design tokens (`var(--color-role-owner-main)`, `var(--color-status-success-main)`, `var(--color-role-admin-main)`, `var(--color-status-warning-main)`) ✅

### 2. Hardcoded Gradients - **PARTIALLY FIXED**
- **CustomerDashboard**: Membership card gradient now uses `var(--gradient-peach)` design token ✅
- **OwnerDashboard**: Progress bar colors now use design tokens ✅

### 3. Spacing Not Using Tokens - **REMAINING**
- Multiple pages use `space-y-6`, `gap-4`, `p-4`, `p-6`, `px-6`, `py-2` directly
- Should use design token spacing scale (4px base)

### 4. Border Radius Not Using Tokens - **REMAINING**
- `rounded-xl`, `rounded-2xl`, `rounded-full` used directly
- Should use `var(--radius-card-lg)`, `var(--radius-full)`

---

## P2 - Medium Priority (Minor Improvements)

### 1. Shadow Tokens Not Used - **REMAINING**
- Custom `shadow-xs`, `shadow-lg`, `shadow-xl` used instead of `var(--shadow-*)`

### 2. Typography Scale - **REMAINING**
- Some `text-[11px]`, `text-[10px]` hardcoded sizes
- Should use `var(--font-size-2xs)`, `var(--font-size-3xs)`

### 3. Transition Tokens - **REMAINING**
- `transition-colors`, `transition-all`, `duration-200` used directly
- Should use `var(--transition-*)`

---

## Component Usage Summary

| Component | Used In | Status |
|-----------|---------|--------|
| Card | All dashboards, AdminConsole, ProfileTab | ✅ Good |
| Button | All pages | ✅ Good |
| Badge | All dashboards, AdminConsole, StaffPortal | ✅ Good |
| Table | All dashboards, AdminConsole, OwnerDashboard | ✅ Good |
| Input | All dashboards, AdminConsole, ProfileTab, Auth pages | ✅ Good |
| Select | All dashboards, AdminConsole | ✅ Good |
| Modal | CustomerDashboard, StaffDashboard, VetDashboard | ✅ Good |
| Avatar | CustomerDashboard, StaffDashboard, AdminConsole, StaffPortal, ProfileTab | ✅ Good |
| Sidebar | AdminConsole, StaffPortal | ✅ Good |
| Tooltip | Not used yet | ⚠️ Available |

---

## Recommended Fix Order

1. ✅ **P0 - AuthLayout.jsx** → **DONE** - Rewritten using design system Card, tokens
2. ✅ **P0 - AdminConsole.jsx** → **DONE** - Rewritten using design system tokens throughout
3. ✅ **P0 - StaffPortal.jsx** → **DONE** - Role configs use design tokens, layout uses tokens
4. ✅ **P1 - Dashboard role colors** → **DONE** - Role-based token mapping created and applied
5. ✅ **P1 - Progress bars** → **DONE** - Using CSS custom properties for colors
6. ✅ **P1 - Gradients** → **DONE** - Using `var(--gradient-peach)` design token
7. **P2 - Spacing/Radius/Shadows** → Systematic token replacement (next phase)
8. **P2 - Typography/Transitions** → Systematic token replacement (next phase)

---

## Next Steps

Run build verification after each fix:
```bash
cd web && npm run build
```

**Current Status (2026-11-19):**
- ✅ AuthLayout.jsx - Fixed
- ✅ StaffPortal.jsx - Fixed
- ✅ AdminConsole.jsx - Fixed
- ✅ All 5 Dashboard pages - Role colors fixed with design tokens
- ✅ Design system tokens - Role-based CSS custom properties added

**All P0 issues resolved.** Next phase: Address P2 spacing/radius/shadow/typography/transition tokens systematically across all pages.

Target: All pages use design system components + tokens, zero hardcoded Tailwind color/spacing/shadow classes.