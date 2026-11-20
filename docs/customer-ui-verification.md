# Customer portal and login redesign

Implemented against the user-approved brief in `customer-surface-brief.md`.
The landing page keeps its visual design. Its signed-in navigation now exposes
the customer dashboard. Login and customer areas inherit its light backgrounds,
navy, sky and peach palette, Fira Sans headings and Nunito Sans body text.

## Behavior

- Successful customer login/registration returns to `/`; customers open their
  workspace using **Bảng điều khiển**. Saved sessions follow the same behavior.
- Dashboard overview shows real pets and upcoming appointments. Customers can
  create/edit profiles, open the booking flow, and view existing bookings.
- Booking uses three steps: pet/service, date/available slot, then confirmation.
  Back navigation preserves input. A promotion result is valid only for the
  service against which it was checked. Prices and booking creation use existing APIs.
- Desktop navigation keeps points, AI and profile accessible. Mobile uses bottom
  navigation; account contains entry points for points/AI and logout.
- Staff and multi-role users retain the original portal and role switcher.

## Verification completed

- Docker web image built and deployed locally.
- `node test-dash.mjs` from `web/`: sidebar regression cases, initial session
  restoration state and customer shell render pass.
- `python scripts/check-services.py`: **42/42 checks passed** after restoring
  database/AI containers that had stopped during the work.
- Edge via Chrome DevTools Protocol: real registration, invalid-credential error,
  customer login returning home, dashboard navigation, saved-session navigation,
  real pet creation and update through backend APIs, and authenticated profile/
  notification reads pass without uncaught JavaScript exceptions.
- Native pet form retains focus when editing fields; dialogs retain focus trapping,
  visible focus rings and correct label associations. The modal supports both
  existing `open` callers and `isOpen` callers.
- Browser-only controlled service/slot/booking responses verify all three booking
  steps, date/notes retention, expected POST payload and stale promotion recovery.
  The promotion regression delays its response until after changing service, then
  verifies the new service total and disabled confirmation until revalidation/removal.
- Desktop 1440×900 and mobile 390×844 captures pass horizontal-overflow assertions,
  including emulated dark color preference: customer/auth surfaces remain light.
- Mechanical Impeccable detector returned `[]` on the changed primary UI targets.
- Independent finish review requested three material fixes. Its verdict pass
  scored all three resolved and returned **ship**, scoped to that fix list.

Evidence lives in `.impeccable/review/`: login desktop/mobile, overview populated/
empty, booking service step and desktop/mobile confirmation. Full-page mobile
overview captures retain the fixed navigation at the original viewport boundary;
dialog captures use the 390×844 viewport. Only pre-existing landing imagery is reused.

Four temporary accounts and their three pet profiles/session records from this
redesign's checks were removed. No existing user's password or pet record changed.

## Limits

The current service catalog was empty during validation. Positive booking UI tests
therefore used responses intercepted only inside the dedicated test browser; no
demo services or appointments were added to the application/database. Real booking
requires services and staff schedules configured in the existing backend. Real
bank transfers, refunds, SMTP and every staff workflow were not tested here.
Existing points/AI business behavior was retained rather than redesigned in this scope.

## Recheck

With a dedicated headless Chromium browser on debugging port 9222:

```powershell
node scripts/check-web-login.mjs http://localhost:3000 --register --customer-flow
```

This command creates a marked account and pet for verification. Its output prints
the account email for targeted cleanup; generated credentials/tokens are not printed.
