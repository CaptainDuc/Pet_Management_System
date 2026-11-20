---
name: Pet Service
description: Landing identity and light customer portal/authentication system
colors:
  primary: "#273172"
  primary-hover: "#354490"
  sky: "#49B3F4"
  peach: "#FFBC7D"
  ground: "#F3F8FE"
  surface: "#FFFFFF"
  muted: "#62718B"
  secondary-text: "#51617D"
  border: "#DCE5F0"
  selected: "#EAF5FE"
typography:
  display:
    fontFamily: "Fira Sans, sans-serif"
    fontSize: "clamp(30px,3.5vw,48px)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-1.3px"
  headline:
    fontFamily: "Fira Sans, sans-serif"
    fontSize: "clamp(26px,2.4vw,34px)"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.7px"
  title:
    fontFamily: "Fira Sans, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    letterSpacing: "-0.3px"
  body:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: "14px"
    lineHeight: 1.7
  label:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 800
rounded:
  field: "11px"
  navigation: "13px"
  card: "22px"
  dialog: "24px"
  pill: "100px"
spacing:
  compact: "8px"
  control-gap: "10px"
  field-gap: "16px"
  form-gap: "18px"
  panel: "25px"
  workspace-gap: "26px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "11px 21px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-soft:
    backgroundColor: "#E9F5FF"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "11px 21px"
  button-line:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "11px 21px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.field}"
    padding: "11px 13px"
  navigation-active:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.primary}"
    rounded: "{rounded.navigation}"
    padding: "12px 15px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.panel}"
---

# Design System: Pet Service

## Overview

**Creative North Star: "A personal home for each pet"**

Pet Service pairs a warm, Vietnamese-first voice with clear navy headings, pale blue grounds and rounded controls. This is a code-led record of the inherited landing identity and its approved customer/authentication extension, not a new visual direction or an approved image comp.

The frontmatter describes the light customer/authentication implementation. The landing retains its established marketing composition, white/pale sections, navy sections, gradients and photography. Existing staff/admin pages retain their separate legacy system. The durable identity comes from the landing's Tailwind theme and the scoped customer stylesheet; the page-specific direction remains in the customer surface brief.

**Key Characteristics:**

- Fira Sans headings and Nunito Sans reading/control text.
- Navy actions, sky selection cues and peach warmth on generous light surfaces.
- Rounded panels, pill actions and simple Lucide SVG icons.
- Native form controls and explicit loading, empty, success and error states.

## Colors

Navy carries text and action hierarchy; sky and peach add emphasis against white and pale blue.

Sidecar tonal ramps are synthesized preview aids, not additional implementation tokens.

### Primary

- **Pet Service Navy** (`primary`): headings, primary actions, brand mark and active navigation; `primary-hover` deepens action feedback.

### Secondary

- **Clear Sky** (`sky`): visible focus outlines, selected service/time borders and the upcoming-appointment top border. It is not the default reading-text color.

### Tertiary

- **Warm Peach** (`peach`): inherited landing accents. Customer/authentication use lighter peach relatives for avatar, support and image-note surfaces.

### Neutral

- **Pale Blue Ground** (`ground`) and **White Surface** (`surface`): portal canvas and cards/forms.
- **Muted Slate** (`muted`) and **Supporting Slate** (`secondary-text`): secondary text.
- **Cool Border** (`border`) and **Selected Blue** (`selected`): control divisions and active navigation.

**The Scoped Light Rule.** Apply the light palette through the customer/authentication wrapper, including dialogs rendered into the document body; preserve the legacy staff theme outside that scope.

The source differs from older records: PRODUCT.md and legacy design-system tokens name navy (#171d3f) and blue (#2563EB). The shipped landing/customer identity uses the frontmatter palette. This document records that boundary without changing those older files.

## Typography

**Display Font:** Fira Sans, sans-serif.  
**Body Font:** Nunito Sans, sans-serif.

The pairing keeps strong, friendly headings distinct from quieter supporting text. The frontmatter display role is the authentication story headline; the customer greeting uses the headline role. Section titles use the title role; fields and compact actions use the label role. Form-entry text is larger (16px) than supporting copy.

Landing retains its existing display progression (48px, 60px and 72px at its responsive sizes) and Dancing Script accent lines. That script accent is landing-specific; it is not a customer form or dashboard heading style. Authentication form headings are 34px, reducing to 31px on mobile; the portal greeting becomes 27px on mobile.

## Layout

The desktop customer shell has a sticky white header (84px), a sticky sidebar (246px) and a flexible main area. Main content has a maximum width of 1180px, with 38px/40px/56px main padding. The overview uses a 1.65:1 workspace split with a 26px gap and a two-column pet grid.

At 1150px and below, the sidebar narrows to 210px, main padding becomes 30px/24px, and the overview becomes one column with two adjacent aside panels. At 760px and below, the header becomes 72px, the sidebar hides, and five customer destinations (overview, pets, bookings, AI, profile) move to a fixed bottom navigation with safe-area padding. Main padding becomes 26px/18px/100px; aside panels stack. The pet grid retains two columns.

Authentication uses a 90px header and equal story/form columns; the form caps at 390px. At 760px and below the story image panel hides, the header becomes 76px and the form occupies one column. The landing continues using its existing Tailwind container and breakpoints rather than adopting the portal shell.

Customer dialogs cap at 680px on desktop, with width bounded by the viewport minus 32px and height bounded by the viewport minus 40px. At the mobile breakpoint they use viewport minus 24px bounds; the inherited modal overlay aligns them to the bottom at 480px and below. Dialog bodies scroll within the visible viewport.

## Elevation & Depth

Customer panels mostly separate through white fill, fine borders and space. The pet-card shadow is restrained (`0 5px 20px -18px #27317250`); button hover adds `0 6px 18px -10px #27317280`. The reused authentication image note has `0 10px 25px -20px #27317280`. The landing retains its more expressive photography layers, soft shadows and tonal gradients.

Buttons transition background/shadow over 180ms. Customer content arrives with a 6px vertical movement over 300ms only when reduced motion is not requested. Shared modal animations retain their reduced-motion overrides.

## Shapes

Controls use pill actions and softly rounded rectangular fields. Panels and pet cards use the card radius; dialogs use the dialog radius. Active desktop navigation uses the navigation radius. Pet-detail tags use a smaller 7px radius; status badges and avatars are pills/circles. Fine cool borders organize information, while the add-pet tile uses a dashed border to identify creation.

## Components

### Buttons

Primary actions use navy/white, a minimum height of 46px and the frontmatter padding. Soft actions use pale blue/navy; outlined actions use white/navy with a cool border. Small pet actions reduce to 40px minimum height. Disabled controls use half opacity and a disabled cursor. Visible keyboard focus uses a sky outline (3px, offset 4px); native fields use a closer 2px sky outline.

### Cards / Containers

Pet cards combine a 160px image/fallback area with an 18px body; on mobile these become 130px and 14px. White panels use a fine border and the panel padding, reducing to 22px on mobile. Support panels use a pale peach ground. Upcoming appointments use a sky top border. Empty states keep a real creation/booking action available rather than supplying invented pet or appointment data.

### Inputs / Fields

Use visible labels with native input, select and textarea elements. Customer fields have a minimum height of 47px, the field radius and 16px Nunito Sans entry text; authentication inputs are at least 50px tall. Preserve native email/password/date/number/URL semantics, required constraints, input bounds and form submission. Notices use alert/status semantics; service/time buttons expose `aria-pressed`.

### Pet Profile Photo

The dashboard photo area contains the whole image (`object-fit: contain`) against its pale ground, keeping portrait faces visible without cropping.

PetPhotoInput adds a native file picker and a single-image drop target inside the existing pet dialog. The pale upload area has a dashed cool border, an 18px radius, 20px padding and a 120px minimum height. A selected image uses a cropped preview (78px square, 14px radius) with a separate remove action. Hover and drag-over use a navy border and pale blue fill; keyboard focus within the native input outlines the area in sky (3px, offset 3px). Busy/disabled presentation uses 0.65 opacity and a wait cursor. The optional HTTP/HTTPS URL field remains under native details/summary.

Accept one JPG, PNG or WebP file up to 5 MB. The browser converts it to a JPEG thumbnail with a maximum 640px long edge, preserving aspect ratio without upscaling and flattening transparency onto white. Preparation updates the loading label, disables replacement/removal and blocks profile save/dismissal until complete. Invalid type, size or decoding errors appear as an alert linked to the file input; the previous selected image remains available. The thumbnail stays in the profile draft until Save; removing it also takes effect only when the profile is saved.

### Navigation

The customer shell owns header/sidebar/bottom navigation; CustomerDashboard owns overview, pets and bookings. AuthLayout shares the customer brand and stylesheet; legacy staff pages stay in their existing shell. Desktop navigation exposes `aria-current="page"`, with a pale selected surface; mobile exposes five primary destinations (overview, pets, bookings, AI, profile), and account links provide access to extras.

The landing remains at `/`. Login, register and password recovery use their explicit routes. A customer whose highest-priority assigned role is CUSTOMER returns to `/` after sign-in; signed-in landing links lead to `/dashboard`. Only customer-only accounts use the dedicated customer shell. Staff and multi-role accounts retain role priority and assigned-role navigation in the legacy shell. Customer logout returns to `/`.

### Booking / Pet Dialogs

BookingWizard presents pet/service, date/time and confirmation as three steps with a current-step marker. API results supply services, prices and available future times. Changing the service clears selection-dependent promotion validity; confirmation uses a promotion only when validated against the current code and service. A nonempty unvalidated code blocks submission.

Pet add/edit and booking reuse the shared Modal with the light dialog scope applied directly to its portal content. Preserve its dialog semantics, Escape handling, focus trap and focus return. Saving disables duplicate submission and dismissal callbacks. Pet details use actual stored values and clearly labeled fallbacks.

### Imagery

Authentication reuses the pre-existing landing asset `web/public/images/hero.webp` unmodified. No new raster was generated for this extension. Customer pet imagery comes from owner-selected profile thumbnails or existing HTTP/HTTPS URLs; missing photos use a Lucide paw placeholder, not fabricated portraits. Thumbnail conversion prepares owner-provided imagery and does not introduce a new visual identity.

## Do's and Don'ts

### Do:

- **Do** inherit the landing palette and font pairing for customer/authentication extensions.
- **Do** keep the light scope on customer dialog content as well as page wrappers.
- **Do** preserve visible labels, keyboard focus, native validation and explicit async states.
- **Do** preserve the existing staff and multi-role navigation boundaries.

### Don't:

- **Don't** apply the older staff navy/blue token values to new customer surfaces.
- **Don't** promote landing-only script accents or promotional eyebrows into dashboard typography.
- **Don't** generate replacement pet photography when the existing asset or a profile fallback already serves the component.

