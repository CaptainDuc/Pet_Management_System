# Internal workspace UI verification

The approved light customer/login visual identity now extends to ADMIN, OWNER,
STAFF and VETERINARIAN workspaces. The scoped contract is
`docs/workspace-surface-brief.md`. Global palette/type choices in DESIGN.md are
preserved; its older references to the separate staff shell describe the prior
implementation, superseded for these routes by the workspace brief.

## Behavior

- Internal roles log in directly to `/dashboard`. Opening `/` with an authenticated
  internal session redirects there while showing a loading state, without rendering
  the landing page. Customers retain landing-first login and the customer portal.
- Assigned roles are normalized and prioritized by one shared helper, including
  object-based and `ROLE_`-prefixed values. Multiple-role users retain their role
  selector; no unassigned role is offered.
- The new workspace uses the existing brand, light grounds, navy/sky/peach palette,
  Fira Sans/Nunito Sans and Lucide icons. The duplicate authentication toolbar is
  removed. Header, task sidebar, active states and logout share one shell.
- Below 760 px, a native menu button reveals all workspace destinations and logout.
  Selecting a destination closes the menu. Tables scroll within their own region.
- Staff and veterinarian dialogs use the light theme even when rendered in a portal
  outside the workspace DOM. Existing API actions remain connected.

## Evidence

`npm.cmd run build` and `node test-dash.mjs` in `web` passed. The render checks also
cover staff/customer login destinations, normalized/multiple roles, restoration
loading and landing/promotions rendering.

`node scripts/check-workspaces.mjs` passed using the five existing, Git-ignored
local test accounts. It reads credentials without printing passwords or tokens.
No API responses were mocked. It verified:

- Customer login returns home; the customer dashboard retains its own shell.
- Four internal roles enter the dashboard without rendering landing navigation.
- All 22 internal destinations work at 1440 and 390 px, without page overflow.
- Admin account search filters real users; no account state/role was modified.
- Mobile menu, profile navigation, saved-session redirect and logout work.
- Reception and medical-record dialogs stay light at both sizes.
- No uncaught browser exceptions across the tested navigation flows.

`python -u scripts/check-services.py` passed 42/42 checks after deployment.

Fresh captures are in ignored `.impeccable/review/`:
`workspace-{admin,owner,staff,veterinarian}-{desktop,mobile,menu}.png`,
`workspace-{staff,veterinarian}-form-{desktop,mobile}.png` and
`workspace-admin-permissions-mobile.png`. Before captures use
`workspace-before-{role}.png`. Browser testing emulates dark color preference
and reduced motion in Edge/Chromium; physical mobile devices were not tested.

## Limits

This is a UI/auth-navigation change. Existing client-side reception, directory,
medical and report demonstrations are explicitly labeled. They were not turned
into new backend workflows. The owner's service catalog now displays actual API
results instead of retaining example prices when the backend returns an empty list.
No live payment, account locking, role reassignment or medical-record save was
performed during this visual check.

## Finish review

The independent reviewer returned `ship` for the three scored corrections:
desktop form width, remaining glyph icons and small green/teal text contrast.
All 17 current captures were valid. Workspace forms now cap at 680 px and retain
scrollable bodies; corrected supporting colors measure 5.48:1 and 5.47:1 on white.
The final browser/SSR checks were rerun after those changes and passed.

The credential file remains ignored by Git and was not copied into source,
screenshots or reports. No new packages or generated image assets were introduced.
