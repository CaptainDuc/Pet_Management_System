# Customer portal and authentication

Mode: Operate. Approved scope: retain the landing identity; customer overview,
pet profiles, three-step bookings and login. Successful customer authentication
returns home; the signed-in landing navigation links to the dashboard. Existing
staff portals retain their behavior. Real APIs supply pets, prices and availability.

## Direction contract

THESIS: A personal home for each pet, with the next appointment one action away.
The homepage stays the familiar landing page; the dashboard serves daily tasks.

OWN-WORLD: Inherit the landing's Fira Sans/Nunito Sans, navy #273172, sky #49B3F4,
peach #FFBC7D and white/pale-blue grounds. Rounded controls, generous whitespace,
clear navy text and simple Lucide icons; customer surfaces remain light.

STORY: Sign in, return home, enter the dashboard, see pets and upcoming bookings,
then maintain a pet profile or book a service with its real available time.

FIRST VIEWPORT: White brand header, compact left navigation on desktop, a friendly
greeting and prominent booking action. Pet profiles occupy the main column; the
next appointment occupies a narrower adjacent area. Login pairs the existing pet
photography with a focused, airy form. Mobile stacks content and uses bottom navigation.

FORM: User-confirmed overview and three-step booking flow; the user's landing
reference and explicit approval govern composition. seed:aced74861d2e5570.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Pet profile photo extension

The existing pet add/edit dialog includes PetPhotoInput: an OS file picker and
single-image drag/drop area with preview, replacement and removal. Accept JPG,
PNG or WebP up to 5 MB. The browser converts the image to JPEG on a white ground,
preserving aspect ratio within a 640px long edge without upscaling. The resulting
data URL must fit within 350000 characters. No separate upload is performed:
the thumbnail is saved atomically with the pet profile through the existing JSON
API. Database migration V12 widens photo_url to TEXT for this bounded thumbnail.
An optional existing HTTP/HTTPS image URL remains under details/summary.

Keep the inherited light styling: a pale dashed drop area, rounded cropped
preview, navy hover/drag border and sky focus-within outline. Preparing an image
shows loading text and blocks replacement, removal, profile save and dismissal;
validation/decoding failures use an associated alert and preserve the draft image.
Choosing or removing an image changes the draft; saving the profile persists it.
Retain the existing five-destination mobile navigation and legacy staff surfaces.
