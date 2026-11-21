# [YOUR RESORT NAME] — Eco-luxury glamping website + CMS

A production-ready Next.js 14 website for a boutique glamping resort, with a full admin panel where **every text, image, button, link, list item and visibility toggle is editable**.

- **Public site:** home, stays (domes / mudhouse) with room cards, long stays, experiences (+ detail pages), special arrangements, spa (+ wellness retreat), café (timings table, on-page menu, PDF), our story, awards, FAQs (tabs + search), blog (categories, tags, search, pagination, share, related posts), contact (enquiry form + map), legal pages, and any custom page you build.
- **Admin (`/admin`):** dashboard, site settings, theme (live preview), menu builder (drag & drop nesting), pages & sections (block library, drag to reorder, show/hide, duplicate, draft auto-save, preview, publish, revisions), 21 collections with full CRUD, media library (multi-upload, folders, required alt text, focal point, crop, “where used” check before delete), enquiries (status, notes, CSV), newsletter subscribers (CSV), SEO, redirects (301/302), users & roles, activity log.

---

## 1. Requirements

- Node.js **18.18+** (20 LTS recommended)
- MySQL **8.0+** (or MariaDB 10.6+)

## 2. Setup

```bash
npm i
cp .env.example .env          # then edit DATABASE_URL, NEXTAUTH_SECRET, etc.
npx prisma migrate dev --name init   # creates prisma/migrations/… and the tables
npm run seed                  # fills every page and collection with placeholder content
npm run dev                   # http://localhost:3000  ·  admin at /admin
```

> The first `prisma migrate dev` generates the initial SQL migration from `prisma/schema.prisma` into `prisma/migrations/`. Commit that folder. In production run `npm run db:deploy` (`prisma migrate deploy`).

### Admin login

There is **no built-in default login**. Before `npm run seed`, set in `.env`:

```
ADMIN_EMAIL="your@email"
ADMIN_PASSWORD="your password (min 10 characters)"
```

The seed stores the password only as a bcrypt hash; you can delete the `ADMIN_PASSWORD` line afterwards.
To change the login on an existing site (without re-seeding) run `npm run admin:set` — it asks for the new password
(or reads `ADMIN_PASSWORD`), disables the old demo account and signs every admin out.

After **3 wrong passwords** in a row, sign-in is locked for **1 hour** for that email and for that IP address
(stored in the database, so a restart doesn’t reset it). A successful sign-in clears the count.

> ⚠️ `npm run seed` **wipes all content** (pages, sections, collections, settings, media records, bookings) and recreates the placeholders. Users, enquiries and subscribers are kept; the admin from `.env` gets the `.env` password. Don’t run it on a live site.

## 3. Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | `mysql://USER:PASS@HOST:3306/DB` |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Public URL, e.g. `https://yourresort.com` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Same as above (used for canonical URLs, sitemap, JSON-LD) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | seed / `admin:set` | The admin login. Password is hashed (bcrypt) — no default exists. Remove `ADMIN_PASSWORD` from `.env` after use if you like |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | for payments | Online booking payments (see “Online booking & payments”) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER` | optional | When set, uploads go to Cloudinary. When empty, files are stored in `storage/uploads/` |
| `UPLOAD_MAX_MB` / `VIDEO_MAX_MB` | optional | Max upload size for images/PDF (default 8) and videos (default 150). Mirror them in `NEXT_PUBLIC_UPLOAD_MAX_MB` / `NEXT_PUBLIC_VIDEO_MAX_MB` |
| `UPLOAD_DIR` | optional | Where local uploads are stored (default `storage/uploads`, served at `/media/...`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | optional | Enquiry notifications and user invites. Without SMTP, enquiries are still saved and invite passwords are shown on screen |
| `ENQUIRY_NOTIFY_TO` | optional | Defaults to the reservations/contact email in Site Settings |

## 4. How content is organised

| Where | What you edit |
|---|---|
| **Pages & Sections** | Every page is a list of blocks. Add from the block library (Hero/slider, Split image/text, CTA band, Rich text, Feature list, Card grid, Stats, Timeline, Table, FAQ, FAQ browser, Gallery, Video, Instagram, Testimonials, Featured-in marquee, Activities, Special arrangements, Stay types, Rooms, Amenities, Awards, Team, Spa treatments, Café timings, Café menu, Latest posts, Contact + form, Enquiry form, Map, Newsletter). Drag to reorder, show/hide, duplicate. Edits **auto-save as a draft**; visitors see them only after **Publish**. Use **Preview** to see drafts on the real page. The last 10 published versions can be restored. Any image can have a separate **mobile variant**. |
| **New pages** | Pages & Sections → New page. Nested URLs like `about/sustainability` work. New pages start unpublished. |
| **Collections** | Stays, Rooms, Amenities (Lucide icon picker), Activities (tags, Featured/Seasonal), Special arrangements, Spa treatments, Café menu categories & items, Café timings, Testimonials, Media mentions, Awards, Stats, FAQ categories & FAQs (assign FAQs to pages), Team, Instagram posts, Blog posts (with revisions), Blog categories, Tags, Authors. All sortable by drag and drop with publish toggles. |
| **Header** | Site Settings → Header: Contact button label/link, Book Now on/off, optional main menu and utility bar, transparent-over-hero. |
| **Header** | Site Settings → Header → *Contact button position*: top-left corner (default) or next to Book Now. |
| **Move the text / image** | Home → Hero / slider → *4 · Position*: alignment plus left/right and up/down nudges (px), separately for desktop and mobile. |
| **Show / hide menu items** | Menu Builder → eye icon on any item hides it from the website without deleting it (hiding a parent hides its dropdown items too). Click again to show, then *Save menus*. |
| **Activity videos** | Collections → Activities → *Video*: plays muted on the activity card while it is on screen (pauses when scrolled away, only downloads when near) and as the header of the activity’s detail page. |
| **Stays / Experiences switch for the page below** | Every section has *Show this section*: Always / Only with Stays / Only with Experiences. Clicking Experiences in the hero swaps the sections below (e.g. Things to do appears straight under the hero). Link to `/#experiences` to open on Experiences. |
| **Top image (PNG)** | Home → Hero / slider → *1 · Image at the top*: upload a PNG, set its width for desktop and mobile, its distance from the top and the gap above the links. The old top-left logo is off by default (Site Settings → Header → Show logo). |
| **Stays / Experiences switch** | Home → Hero / slider: turn on “Show the two set switch links”, rename the links, and fill **Set 1 slides** (shown first) and **Set 2 slides**. Each slide is a video or photo with its own big text. Photos advance after the set number of seconds; videos play to the end, then move on. |
| **Hero text or image + animations** | Home → Hero / slider → *3 · Slides*: each slide shows **Text** or an **Image (JPG/PNG)** over the video/photo, and can pick its own entrance effect. *4 · Text style*: 40+ Google Fonts, weights 100–900, size per device, solid / outline / gradient / glow, spacing, uppercase, italic. *5 · Animation*: 24 entrance effects (fades, slides, zooms, blur, mask reveal, 3D flip, bounce, letter-by-letter, word-by-word, typewriter), easing, duration, delay, letter/word gap, distance, repeat count (0 = loop forever), pause between repeats, fade out between repeats. |
| **Hero video** | Home → Hero / slider: upload an MP4/WEBM (plus an optional lighter mobile file), set the image used as poster/fallback, and adjust text alignment, vertical position, desktop/mobile size, weight, font, colour, width, line height, letter spacing, uppercase, italic and shadow. One slide = no slider dots. |
| **Site Settings** | Name, tagline, logos (light/dark/favicon), contact, social, **Book Now target** (external booking engine or internal enquiry form), WhatsApp button, announcement bar (with active dates), footer, cookie banner, analytics IDs, Instagram feed, maintenance mode. |
| **Theme** | Colour tokens, heading/body Google Fonts, button & card radius, section spacing, with a live preview. |
| **Menu Builder** | Main menu, utility bar, footer quick links, legal links. Drag an item right to nest it in a dropdown. |
| **SEO** | Title template, default description and share image, site-wide noindex. Per-page and per-post meta title, description, OG image, canonical and noindex. `sitemap.xml`, `robots.txt` and JSON-LD (`LodgingBusiness`, `FAQPage`, `BlogPosting`) are automatic. |

### Roles
- **Super Admin:** everything.
- **Editor:** all content, media, menus, enquiries, SEO and redirects. Cannot manage users, theme, analytics or maintenance mode.

## 5. Architecture notes

- **Stack:** Next.js 14 App Router · TypeScript · Tailwind (tokens as CSS variables, set at runtime from Admin → Theme) · Prisma + MySQL · NextAuth credentials (bcrypt, JWT sessions) · Cloudinary or local uploads · TipTap · Framer Motion (LazyMotion) · Swiper · yet-another-react-lightbox · React Hook Form + Zod · Nodemailer.
- **One source of truth for fields:** `src/lib/sections.ts` (blocks), `src/lib/collections.ts` (collections) and `src/lib/settings-defs.ts` (settings) declare fields once. The admin forms, Zod validation (client and server) and defaults are generated from them. To add a field, add it there and render it in the block component.
- **Sections** are stored as `Section { pageId, type, order, isVisible, data Json, draftData Json? }`. Every image field stores `{ url, alt, width, height, publicId, focalX, focalY, mobile? }`.
- **Rendering:** public pages are cached (ISR). Every admin save calls `revalidatePath`, so changes are live on the next request.
- **Security:** `/admin` is protected by middleware and every server action re-checks the session and role in the database. Login, enquiry, newsletter and upload are rate-limited. Uploads are checked by magic bytes (JPG/PNG/WEBP/AVIF/GIF/PDF only; SVG uploads are blocked) and size. Rich text is sanitised when rendered. The enquiry form has a honeypot. Secrets are only read on the server.
- **Redirects and maintenance mode** are handled in middleware (cached for 30 seconds).
- **Instagram:** the “live feed” mode uses a long-lived token from the *Instagram API with Instagram Login* (the old Basic Display API was retired by Meta in December 2024). If the token fails, the manual posts are shown.
- **Rate limiting** is in-memory per server instance. For several instances behind a load balancer, swap `src/lib/rate-limit.ts` for Redis or Upstash.

## 6. Deploy

### Vercel + managed MySQL (PlanetScale-compatible, Aiven, Railway, AWS RDS…)
1. Push the repo to GitHub and import it in Vercel.
2. Add the environment variables. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to the production domain.
3. **Set the Cloudinary variables.** Vercel’s file system is read-only, so local uploads will not work there.
4. Build command: `npm run build` (runs `prisma generate`). Run `npx prisma migrate deploy` against the production DB (locally or as a deploy step), then `npm run seed` once if you want the placeholder content.

### VPS (Ubuntu, e.g. Hostinger) with PM2 + Nginx
Needs Node.js 18.17+ (20 LTS recommended) and MySQL 8.

```bash
# on the server
git clone <repo> /var/www/resort && cd /var/www/resort   # or upload and unzip the project
npm ci
cp .env.example .env && nano .env
#   DATABASE_URL, NEXTAUTH_SECRET (openssl rand -base64 32),
#   NEXTAUTH_URL + NEXT_PUBLIC_SITE_URL = https://yourdomain.com (no trailing slash),
#   ADMIN_EMAIL (+ ADMIN_PASSWORD for the first seed only), SMTP_*, RAZORPAY_*
npx prisma migrate deploy
npm run seed            # FIRST deploy only — it wipes and refills content
#   then delete the ADMIN_PASSWORD line from .env
npm run build
mkdir -p storage/uploads storage/backups   # must be writable by the user that runs pm2
npm i -g pm2
pm2 start npm --name resort -- start -- -p 3000 -H 127.0.0.1   # only nginx can reach it
pm2 save && pm2 startup
```

Nginx site (then add HTTPS with `sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com`):
```nginx
server {
  server_name yourdomain.com www.yourdomain.com;
  client_max_body_size 200M;             # video uploads and backup restores
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;   # REQUIRED: login lockout and rate limits use it
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;               # large uploads / restores
  }
}
```

**Updating an existing install:**
```bash
cd /var/www/resort
# copy in the new files (keep your .env and storage/ folder)
npm ci
npx prisma migrate deploy
npm run build
pm2 restart resort
```

Without Cloudinary, uploads live in `storage/uploads/` (or `UPLOAD_DIR`). The app serves them at `/media/...`, with range requests for video. Back up that folder along with the database. All paths are relative to the project folder, so nothing depends on the machine the site was built on.

**Admin account and lockout on the server:**
- `npm run admin:set` changes the admin email/password and signs everyone out.
- `npm run admin:unlock` clears a login lockout (3 wrong passwords lock that email and that IP for 1 hour).

## 7. Scripts

| Command | |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run seed` | Reset and seed placeholder content |
| `npm run db:migrate` / `npm run db:deploy` | Prisma migrate dev / deploy |
| `npm run typecheck` / `npm run lint` | Checks |
| `npm run zip` | Package the project as `glamping-resort.zip` |

## 8. Placeholder content

All copy is original placeholder text using **[YOUR RESORT NAME]** and **[LOCATION]**. Search for those strings in Admin (or re-seed after editing `prisma/seed.ts`) to brand the site. Photos are Unsplash placeholders loaded from `images.unsplash.com`; if any fails to load, a neutral illustration is shown. Replace them with your own photos via the Media Library. Logos, award badges, press logos and team avatars are simple SVG placeholders in `public/seed/`.

## 9. Self-review: does every public element map to an admin field?

| Public element | Edited in |
|---|---|
| Header logo, site name, utility links, main menu with dropdowns, Book Now label/target | Site Settings → General / Booking · Menu Builder |
| Announcement bar, cookie banner, WhatsApp button, analytics | Site Settings |
| Every section heading, eyebrow, body, bullets, buttons, images (+ mobile), backgrounds, order, visibility | Pages & Sections |
| Room cards, amenities, activities, arrangements, treatments, menu, timings, testimonials, press logos, awards, stats, FAQs, team, Instagram, posts | Collections |
| Footer about text, headings, newsletter text, copyright, social icons, contact block, quick and legal links | Site Settings → Footer / Contact / Social · Menu Builder |
| Colours, fonts, radius, spacing — or one-click presets (Pine & Sand, Midnight Lake, Terracotta Desert, Alpine Snow, Charcoal Minimal, Monochrome Luxe, Noir Linen, Black & Sage, Black & Teal, Black & Warm Stone, Monsoon Jungle); button colour; solid or square-outline buttons; site-wide text sizes | Theme |
| “← Home” link at the bottom-left of each page’s main image (all pages except Home) | Automatic · rename or hide per page: open the page’s Hero section → “8 · Home link” |
| Text size of one section (label above heading, heading, paragraphs, card titles) | Open the section → “Text sizes” |
| Guest video reviews (vertical 9:16 reels with sound, hover edges to slide) | Pages → Home → “Guest video reviews (reels)” section |
| Where a button / card leads (“Opens →”), where its items are edited (“Content from →”), which pages lead here (“Visitors reach this page from”) | Pages list (site-flow order) · page editor · each section’s “Where this section leads” card |
| Page titles, meta, OG images, canonical, noindex | Page settings & SEO · SEO |

**Remaining fixed text** (UI microcopy that isn’t content): form field labels and validation messages in the enquiry form, “Read more / View details / Share / Keep reading / More to explore” labels, blog filter and pagination labels, the 404 page text, and the column headings of the café timings table (“Meal / Hours / Last order”). These live in the components and can be changed in code (or moved into Site Settings later if you need them translated).

### Hero video tips
- Export at 1920×1080 (and optionally 720×1280 for the mobile file), H.264 MP4, no audio, 10–30 seconds, ideally under 15 MB. HandBrake's "Web" presets work well.
- Always set a background image too: it shows while the video loads and if a browser blocks autoplay (e.g. iOS Low Power Mode).

## Replacing the placeholder name in an existing database

If your site still shows “[YOUR RESORT NAME]” or “[LOCATION]”, run once:

```bash
npm run brand
```

It swaps them for **Glamo Home Cheog** / **Cheog, Shimla** in site settings, SEO, page descriptions and section text. Nothing else is touched.

## Backup & Restore · Change log

- **Admin → Backup & Restore** (Super Admin): download the whole site as one ZIP (content, settings, theme, menus and optionally uploaded photos/videos, enquiries, change history, admin logins). Restore replaces the content from such a ZIP; a safety copy of the current site is saved first in `storage/backups/`.
- **Admin → Change Log (for Claude)**: every published change is recorded with the exact field, old value and new value. *Copy all* / *Download .txt* gives plain text to paste to Claude; *Mark as sent* starts a fresh list.
- After updating to this version run once: `npx prisma migrate dev --name change-log-details`

## Online booking & payments (Razorpay)

- Guests book and pay on **/book**: choose the Glamping Dome, Single Room or Interconnected Room → pick dates (each night shows its price) → guests → details → pay the full amount via Razorpay (UPI, cards, net banking). Prices include GST. Bookings are non-refundable online.
- Dates are held for 15 minutes while a guest pays; two guests can never book the same night.
- **Admin → Bookings**: all bookings, cancel (refunds are done from the Razorpay dashboard), notes, and **Add booking** for phone / walk-in guests (blocks those dates online).
- **Admin → Rates & availability**: set the price of any night (weekends, festivals…), close or reopen nights.
- **Stays → Rooms & units**: per room — bookable online, normal price, guests included, extra-guest charge, maximum guests, minimum nights.
- **Settings → Booking**: check-in/out times, children free under age, policy text, booking notification email.
- `.env`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (see `.env.example`). Webhook URL: `https://YOUR-DOMAIN/api/razorpay/webhook` (events `payment.captured`, `order.paid`, `payment.failed`). Turn on **automatic capture** in Razorpay (Settings → Payment capture).
- Content update for an existing site: `npm run update-content` (`-- --dry` to preview).
