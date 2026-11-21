/* Seed: creates the default admin, settings, menus, every page with every section, and all collections
 * with original placeholder content. Safe to re-run: it wipes content tables first (users are kept). */
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_SETTINGS } from '../src/lib/settings-defs';
import { DEFAULT_THEME } from '../src/lib/theme';

const prisma = new PrismaClient();
const J = (v: unknown) => v as Prisma.InputJsonValue;
let k = 0;
const key = () => `seed${++k}`;

// ─── Placeholder images (Unsplash). Any that fail to load fall back to /placeholder.svg automatically. ───
type Img = { url: string; alt: string; width: number; height: number; publicId: null; focalX: number; focalY: number };
const un = (id: string, alt: string, w = 1600, h = 1067): Img => ({ url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`, alt, width: w, height: h, publicId: null, focalX: 50, focalY: 50 });
const local = (path: string, alt: string, w: number, h: number): Img => ({ url: path, alt, width: w, height: h, publicId: null, focalX: 50, focalY: 50 });

const IMG = {
  peaks: un('1506905925346-21bda4d32df4', 'Snow-capped peaks glowing at sunrise above a sea of clouds'),
  peak2: un('1464822759023-fed622ff2c3b', 'A lone mountain summit under a clear blue sky'),
  stars: un('1519681393784-d120267933ba', 'The Milky Way over snowy mountains at night'),
  snow: un('1454496522488-7a8e488e8606', 'Fresh snow on a high Himalayan-style ridge'),
  mist: un('1470071459604-3b5ec3a7fe05', 'Mist rolling over forested hills in the morning'),
  lake: un('1501785888041-af3ef285b470', 'Still lake reflecting pine forest and mountains'),
  sunrise: un('1469474968028-56623f02e42e', 'Golden sunrise light over a mountain valley'),
  valley: un('1472214103451-9374bd1c798e', 'Wide green valley with mountains on the horizon'),
  forestPath: un('1447752875215-b2761acb3c5d', 'A quiet trail through a sunlit forest'),
  forest: un('1441974231531-c6227db76b6e', 'Sunbeams through tall forest trees'),
  tent: un('1504280390367-361c6d9f38f4', 'A tent pitched in the mountains at golden hour'),
  tentNight: un('1478131143081-80f7f84ca84d', 'Glowing tent under a starry night sky'),
  tentGlow: un('1510312305653-8ed496efae75', 'Warm light from a canvas tent at dusk'),
  campfire: un('1445308394109-4ec2920981b1', 'Friends around a campfire at night'),
  bed: un('1505693416388-ac5ce068fe85', 'A cosy bed with soft linen and warm lighting'),
  bed2: un('1522771739844-6a9f6d5f14af', 'Neatly made bed with natural textures'),
  room: un('1590490360182-c33d57733427', 'Bright, airy guest room with a large window'),
  room2: un('1566665797739-1674de7a421a', 'Bedroom with wooden accents and a view'),
  interior: un('1586023492125-27b2c045efd7', 'Lounge with earthy textiles and natural light'),
  coffee: un('1495474472287-4d71bcdd2085', 'Freshly brewed coffee in a ceramic cup'),
  coffee2: un('1509042239860-f550ce710b93', 'Barista pouring latte art'),
  cafe: un('1554118811-1e0d58224f24', 'Warm café interior with wooden tables'),
  cafe2: un('1501339847302-ac426a4a7cbb', 'Café counter with pastries and plants'),
  restaurant: un('1517248135467-4c7edcad34c4', 'Restaurant dining room glowing in the evening'),
  food: un('1504674900247-0877df9cc836', 'A plate of fresh seasonal food'),
  bowl: un('1512621776951-a57141f2eefd', 'Colourful salad bowl with garden vegetables'),
  bowl2: un('1546069901-ba9599a7e63c', 'Wholesome grain bowl with greens'),
  spa: un('1544161515-4ab6ce6db874', 'Calm massage room prepared for a treatment'),
  spa2: un('1540555700478-4be289fbecef', 'Spa towels, stones and flowers arranged neatly'),
  spa3: un('1600334089648-b0d9d3028eb2', 'Candles and oils in a quiet spa'),
  yoga: un('1506126613408-eca07ce68773', 'Yoga at sunset facing the mountains'),
  hike: un('1551632811-561732d1e306', 'Hikers on a ridge trail'),
  hiker: un('1501555088652-021faa106b9b', 'A hiker looking out over a mountain range'),
  trek: un('1528543606781-2f6e6857f318', 'Trekkers walking towards a mountain pass'),
  starsky: un('1419242902214-272b3f66ee7a', 'A sky full of stars over the hills'),
  night: un('1444703686981-a3abbc4d4fe3', 'Starry night above a dark ridge line'),
  travel: un('1476514525535-07fb3b4ae5f1', 'Traveller sitting on a rock above a turquoise lake'),
  laptop: un('1499750310107-5fef28a66643', 'Laptop and coffee on a wooden desk by a window'),
  desk: un('1497032628192-86f99bcd76bc', 'Minimal workspace with a laptop and notebook'),
};
const LOGO_LIGHT = local('/seed/logo-light.svg', 'Glamo Home Cheog logo', 300, 72);
const LOGO_DARK = local('/seed/logo-dark.svg', 'Glamo Home Cheog logo', 300, 72);
const FAVICON = local('/seed/favicon.svg', 'Glamo Home Cheog icon', 64, 64);

const cta = (label: string, href: string, style: 'primary' | 'secondary' | 'link' | 'light' = 'primary', newTab = false) => ({ label, href, style, newTab });
const p = (...paras: string[]) => paras.map((t) => `<p>${t}</p>`).join('');

async function wipe() {
  await prisma.$transaction([
    prisma.booking.deleteMany(), prisma.roomRate.deleteMany(),
    prisma.section.deleteMany(), prisma.page.deleteMany(), prisma.menu.deleteMany(), prisma.setting.deleteMany(), prisma.redirect.deleteMany(),
    prisma.room.deleteMany(), prisma.stay.deleteMany(), prisma.amenity.deleteMany(), prisma.activity.deleteMany(), prisma.specialArrangement.deleteMany(),
    prisma.spaTreatment.deleteMany(), prisma.menuItem.deleteMany(), prisma.menuCategory.deleteMany(), prisma.cafeTiming.deleteMany(),
    prisma.testimonial.deleteMany(), prisma.mediaMention.deleteMany(), prisma.award.deleteMany(), prisma.stat.deleteMany(),
    prisma.faq.deleteMany(), prisma.faqCategory.deleteMany(), prisma.teamMember.deleteMany(), prisma.instagramPost.deleteMany(),
    prisma.post.deleteMany(), prisma.tag.deleteMany(), prisma.blogCategory.deleteMany(), prisma.author.deleteMany(),
    prisma.revision.deleteMany(), prisma.media.deleteMany(),
  ]);
}

/** Email of the demo admin account created by earlier versions of this seed (disabled on every run). */
const LEGACY_DEMO_ADMIN = 'admin@example.com';

async function main() {
  console.log('Seeding…');
  await wipe();

  // ── Admin user ──
  // The login comes ONLY from .env (ADMIN_EMAIL / ADMIN_PASSWORD) — there is no built-in default password.
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set ADMIN_EMAIL in .env before seeding (the admin login email).');
  if (password.length < 10) throw new Error('Set ADMIN_PASSWORD in .env before seeding (at least 10 characters). You can remove it from .env again afterwards.');
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'SUPER_ADMIN', active: true, sessionVersion: { increment: 1 } },
    create: { email, name: 'Site Admin', role: 'SUPER_ADMIN', passwordHash },
  });
  // The original demo account must never keep working.
  await prisma.user.updateMany({ where: { email: LEGACY_DEMO_ADMIN, NOT: { email } }, data: { active: false, sessionVersion: { increment: 1 } } });
  await prisma.loginAttempt.deleteMany();

  // ── Settings & theme ──
  const settings: Record<string, Record<string, unknown>> = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  Object.assign(settings.general, { logoLight: LOGO_LIGHT, logoDark: LOGO_DARK, favicon: FAVICON });
  Object.assign(settings.contact, { phones: ['+91 90000 00001', '+91 90000 00002'], address: 'Cheog, Shimla\nHimachal Pradesh, India', latitude: '', longitude: '' });
  settings.social.links = [
    { platform: 'instagram', url: 'https://instagram.com/' },
    { platform: 'facebook', url: 'https://facebook.com/' },
    { platform: 'youtube', url: 'https://youtube.com/' },
  ];
  settings.footer.about = 'An eco-luxury hideaway with a geodesic glamping dome and cosy Backwood Stays, tucked into the forest at Cheog, Shimla.';
  settings.seo.ogImage = IMG.peaks;
  for (const [key, value] of Object.entries(settings)) await prisma.setting.create({ data: { key, value: J(value) } });
  await prisma.setting.create({ data: { key: 'theme', value: J(DEFAULT_THEME) } });

  // ── Menus ──
  const m = (label: string, href: string, children: unknown[] = []) => ({ id: key(), label, href, newTab: false, children });
  await prisma.menu.createMany({
    data: [
      { location: 'header', name: 'Main menu', items: J([
        m('Experience', '/experiences'),
        m('Book Now', '/book'),
        m('Café', '/cafe'),
        m('Stay Options', '/stays', [m('Glamping Dome', '/stays/domes'), m('Backwood Stays', '/stays/backwood'), m('Long Stays', '/long-stays')]),
        m('About', '/faqs', [m('FAQs', '/faqs'), m('Awards', '/about/awards')]),
        m('Blog', '/blog'),
        m('Contact', '/contact'),
      ]) },
      { location: 'utility', name: 'Utility bar', items: J([m('Blog', '/blog'), m('Contact', '/contact'), m('FAQs', '/faqs')]) },
      { location: 'footer', name: 'Footer', items: J([m('Glamping Dome', '/stays/domes'), m('Backwood Stays', '/stays/backwood'), m('Long Stays', '/long-stays'), m('Experiences', '/experiences'), m('Book Your Stay', '/book'), m('Café', '/cafe'), m('Special Arrangements', '/special-arrangements')]) },
      { location: 'legal', name: 'Legal', items: J([m('Privacy Policy', '/privacy-policy'), m('Booking & Refund Policy', '/booking-refund-policy')]) },
    ],
  });

  // ── Stays & rooms (4 room types) ──
  const domes = await prisma.stay.create({ data: { name: 'Glamping Dome', slug: 'domes', eyebrow: 'Sleep under the sky', summary: 'Our climate-controlled geodesic dome with panoramic windows, a private deck and a star-gazing skylight.', image: J(IMG.tentNight), pageSlug: 'stays/domes', order: 0 } });
  const mud = await prisma.stay.create({ data: { name: 'Backwood Stays', slug: 'backwood', eyebrow: 'Tucked into the woods', summary: 'Two cosy rooms among the pines — a private room for two and an interconnected room for families and friends.', image: J(IMG.interior), pageSlug: 'stays/backwood', order: 1 } });
  const feat = (...pairs: [string, string][]) => pairs.map(([icon, label]) => ({ icon, label, _key: key() }));
  await prisma.room.createMany({
    data: [
      { stayId: domes.id, name: 'Glamping Dome', description: 'Our signature dome with a king bed facing a wall of glass and a skylight above — the sky is the ceiling.', images: J([IMG.tentNight, IMG.bed, IMG.stars]), size: '314 sq ft', view: 'Mountain View', capacity: 'Up to 3 guests', order: 0, features: J(feat(['BedDouble', 'King bed'], ['Telescope', 'Star-gazing skylight'], ['Heater', 'Heated floors'], ['Bath', 'Private bathroom'])), bookable: true, units: 1, basePrice: 9500, baseGuests: 2, maxGuests: 3, maxAdults: 3, extraGuestPrice: 1500, extraChildPrice: 1000, minNights: 1 },
      { stayId: mud.id, name: 'Single Room', description: 'A private room for two among the pines — warm wood, soft linen and a window onto the forest.', images: J([IMG.room2, IMG.interior]), size: '240 sq ft', view: 'Forest View', capacity: 'Up to 2 guests', order: 0, features: J(feat(['BedDouble', 'Queen bed'], ['Trees', 'Forest view'], ['Heater', 'Room heater'], ['Bath', 'Private bathroom'])), bookable: true, units: 1, basePrice: 5500, baseGuests: 2, maxGuests: 2, maxChildren: 1, extraGuestPrice: 0, minNights: 1, occupancyNote: 'Perfect for couples — 2 guests' },
      { stayId: mud.id, name: 'Interconnected Room', description: 'Two rooms joined by a connecting door — space for a family or friends to stay together, with privacy when you want it.', images: J([IMG.room, IMG.campfire]), size: '2 rooms · 460 sq ft', view: 'Forest View', capacity: 'Up to 6 guests', order: 1, features: J(feat(['BedDouble', 'Two bedrooms'], ['DoorOpen', 'Connecting door'], ['Users', 'Ideal for families'], ['Bath', 'Two bathrooms'])), bookable: true, units: 1, basePrice: 9000, baseGuests: 4, maxGuests: 6, extraGuestPrice: 1000, extraChildPrice: 600, minNights: 1, occupancyNote: 'Ideal for families & friends — up to 6 guests' },
    ],
  });

  // ── 8 amenities ──
  const amenities: [string, string, string][] = [
    ['Wifi', 'High-speed Wi-Fi', 'Reliable connection across the property, including the café and work lounge.'],
    ['Heater', 'Heated interiors', 'Underfloor heating and insulated walls keep things cosy in every season.'],
    ['Coffee', 'Glass café', 'Breakfast to late dinners, made from local and home-grown ingredients.'],
    ['Waves', 'Hot jacuzzi', 'An outdoor hot tub facing the peaks — magical on a starry night.'],
    ['Flame', 'Bonfire evenings', 'Gather around the fire with stories, music and hot chocolate.'],
    ['CircleParking', 'Free parking', 'Secure parking for cars and bikes at the property entrance.'],
    ['Recycle', 'Low-impact living', 'Solar water heating, composting and zero single-use plastic.'],
    ['Dog', 'Pet friendly', 'Well-behaved four-legged guests are welcome in select stays.'],
  ];
  await prisma.amenity.createMany({ data: amenities.map(([icon, title, text], order) => ({ icon, title, text, group: 'general', order })) });

  // ── 6 activities ──
  const acts = [
    { title: 'Sunrise Ridge Hike', tags: ['Adventure', 'Nature'], featured: true, seasonal: false, duration: '3 hours', price: '₹1,200 per person', image: IMG.hike, excerpt: 'Walk up to a quiet ridge in the blue hour and watch the first light touch the snow peaks.' },
    { title: 'Star-Gazing Night', tags: ['Night', 'Nature'], featured: true, seasonal: false, duration: '2 hours', price: '₹900 per person', image: IMG.starsky, excerpt: 'Telescopes, a warm blanket and a guide to the constellations above the valley.' },
    { title: 'Village Heritage Walk', tags: ['Culture'], featured: false, seasonal: false, duration: '2 hours', price: 'Complimentary', image: IMG.forestPath, excerpt: 'Meet artisans, visit old temples and learn how mud homes are built and maintained.' },
    { title: 'Snow Trail Day Trip', tags: ['Adventure'], featured: false, seasonal: true, duration: 'Full day', price: '₹3,500 per person', image: IMG.snow, excerpt: 'A guided winter excursion to snowfields with lunch packed by our café.' },
    { title: 'Apple Orchard Picnic', tags: ['Family', 'Food'], featured: false, seasonal: true, duration: '3 hours', price: '₹2,200 for two', image: IMG.valley, excerpt: 'Harvest-season picnics among the orchards with a hamper of local treats.' },
    { title: 'Forest Bathing & Yoga', tags: ['Wellness'], featured: true, seasonal: false, duration: '90 minutes', price: '₹1,000 per person', image: IMG.yoga, excerpt: 'Slow, mindful movement and breathwork among the pines.' },
  ];
  await prisma.activity.createMany({
    data: acts.map((a, order) => ({
      ...a,
      slug: a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
      tags: J(a.tags),
      image: J(a.image),
      video: '',
      gallery: J([IMG.mist, IMG.sunrise, IMG.trek]),
      content: `<h2>What to expect</h2>${p(`${a.excerpt} Our hosts know these hills intimately and keep groups small so the experience stays personal.`, 'We provide water, snacks and any equipment you need. Please wear comfortable shoes and bring a warm layer — mountain weather changes quickly.')}<h3>Good to know</h3><ul><li>Suitable for most fitness levels</li><li>Bookable at the front desk or in advance</li><li>Timings shift with the seasons</li></ul>`,
      order,
    })),
  });

  // ── 3 special arrangements ──
  const arr = [
    { title: 'Celebration Cake Setup', price: 'From ₹2,500', image: IMG.cafe2, excerpt: 'A freshly baked cake, candles, flowers and a hand-written note waiting in your room.' },
    { title: 'Candle-Light Dinner', price: 'From ₹6,500 for two', image: IMG.restaurant, excerpt: 'A private multi-course dinner on the deck, lit by lanterns and the stars.' },
    { title: 'Dome Decoration', price: 'From ₹4,000', image: IMG.tentGlow, excerpt: 'Fairy lights, petals and balloons to turn your stay into a surprise.' },
  ];
  await prisma.specialArrangement.createMany({
    data: arr.map((a, order) => ({ ...a, slug: a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), image: J(a.image), content: p(`${a.excerpt}`, 'Tell us the occasion and any preferences when you book, and we’ll take care of the details. Please request at least 24 hours in advance.'), order })),
  });

  // ── Spa treatments ──
  await prisma.spaTreatment.createMany({
    data: [
      ['Himalayan Herbal Massage', 'Massage', '60 min', '₹3,800', 'Warm herbal oils and long, flowing strokes to release tension.'],
      ['Deep Tissue Recovery', 'Massage', '75 min', '₹4,500', 'Focused pressure for tired legs after a day on the trails.'],
      ['Hot Stone Ritual', 'Massage', '90 min', '₹5,200', 'River stones heated and placed to melt away stiffness.'],
      ['Forest Glow Facial', 'Facial', '45 min', '₹2,900', 'A gentle facial using local botanicals and cold-pressed oils.'],
      ['Jacuzzi & Steam Session', 'Hydrotherapy', '45 min', '₹1,800', 'Private time in the hot tub followed by a eucalyptus steam.'],
      ['Couple’s Retreat', 'Packages', '120 min', '₹9,500', 'Side-by-side massages, a jacuzzi soak and herbal tea for two.'],
    ].map(([name, category, duration, price, description], order) => ({ name, category, duration, price, description, order })),
  });

  // ── Café menu & timings ──
  const menu: [string, string, [string, string, string, boolean, boolean][]][] = [
    ['Breakfast', 'Served until 11 am', [['Mountain Porridge', 'Millet porridge with jaggery, nuts and seasonal fruit', '₹320', true, true], ['Farm Eggs Your Way', 'With sourdough toast and garden greens', '₹380', false, false], ['Buckwheat Pancakes', 'With local honey and whipped butter', '₹360', true, false], ['Aloo Paratha Plate', 'With curd, pickle and butter', '₹340', true, false]]],
    ['Mains', 'From noon to 10 pm', [['Valley Thali', 'A rotating spread of dals, sabzis, rice and rotis', '₹620', true, false], ['Trout in Brown Butter', 'Pan-fried local trout with herbed potatoes', '₹890', false, false], ['Garden Grain Bowl', 'Roasted vegetables, red rice, tahini and seeds', '₹520', true, true], ['Hill Chicken Curry', 'Slow-cooked with whole spices, served with rice', '₹720', false, false]]],
    ['Drinks & Bakes', 'All day', [['Single-Origin Pour-Over', 'Rotating beans from Indian estates', '₹260', true, true], ['Rhododendron Iced Tea', 'House-made from seasonal blossoms', '₹220', true, true], ['Apple Crumble', 'Orchard apples, oat crumble, cream', '₹340', true, false], ['Hot Chocolate', 'Dark chocolate, oat or dairy milk', '₹280', true, false]]],
  ];
  for (const [ci, [name, description, items]] of menu.entries()) {
    const cat = await prisma.menuCategory.create({ data: { name, description, order: ci } });
    await prisma.menuItem.createMany({ data: items.map(([n, d, price, veg, vegan], order) => ({ categoryId: cat.id, name: n, description: d, price, veg, vegan, order })) });
  }
  await prisma.cafeTiming.createMany({
    data: [
      ['Breakfast', '7:30 am – 11:00 am', '10:45 am'],
      ['Lunch', '12:30 pm – 3:30 pm', '3:15 pm'],
      ['Café & snacks', '11:00 am – 7:00 pm', '6:45 pm'],
      ['Dinner', '7:30 pm – 10:30 pm', '10:00 pm'],
    ].map(([meal, hours, lastOrder], order) => ({ meal, hours, lastOrder, order })),
  });

  // ── Social proof ──
  await prisma.testimonial.createMany({
    data: [
      ['Ananya R.', 'Mumbai', 'Waking up in the dome with the peaks right in front of us was unreal. The team thought of every little detail.', 'Google'],
      ['Daniel K.', 'Berlin', 'The interconnected room was perfect for our family, and the café food is worth the trip alone.', 'TripAdvisor'],
      ['Meera & Arjun', 'Bengaluru', 'We came for two nights and stayed for five. The candle-light dinner on the deck was the highlight of our anniversary.', 'Google'],
      ['Sofia L.', 'Lisbon', 'Worked remotely for three weeks with fast Wi-Fi, great coffee and evening hikes. I already miss it.', 'Booking.com'],
      ['Rahul S.', 'Delhi', 'Spotless, warm and genuinely eco-conscious without compromising comfort. The star-gazing night was magical.', 'Google'],
    ].map(([name, location, quote, source], order) => ({ name, location, quote, source, rating: 5, order })),
  });
  await prisma.mediaMention.createMany({ data: ['The Green Ledger', 'Travel Notes Weekly', 'Mountain Monthly', 'Slow Journeys', 'Wander Review'].map((name, i) => ({ name, logo: J(local(`/seed/mention-${i + 1}.svg`, `${name} logo`, 240, 60)), url: 'https://example.com', order: i })) });
  await prisma.award.createMany({
    data: [
      ['Eco Stay Award', 'Regional Tourism Board', '2024'],
      ['Best Glamping Experience', 'Travel Guild', '2025'],
      ['Green Hospitality Honour', 'Sustainable Hotels Forum', '2023'],
      ['Travellers’ Choice', 'Guest Reviews', '2025'],
      ['Sustainable Tourism Award', 'State Tourism Council', '2024'],
      ['Boutique Stay of the Year', 'Hospitality Circle', '2025'],
    ].map(([title, issuer, year], i) => ({ title, issuer, year, description: 'Recognised for thoughtful design, low-impact operations and warm hospitality.', image: J(local(`/seed/award-${i + 1}.svg`, `${title} badge`, 200, 200)), order: i })),
  });
  await prisma.stat.createMany({ data: [[8, '+', 'Years of hosting'], [25000, '+', 'Travellers hosted'], [40, '', 'Local jobs created'], [100, '%', 'Solar hot water']].map(([value, suffix, label], order) => ({ value: Number(value), suffix: String(suffix), label: String(label), group: 'community', order })) });
  await prisma.teamMember.createMany({
    data: [
      ['Founder Name', 'Founder & Host', 'Left the city to build a place that gives back to the mountains.'],
      ['Chef Name', 'Head Chef', 'Cooks with what the valley grows each season.'],
      ['Host Name', 'Guest Experience', 'Makes sure every stay feels like home.'],
      ['Guide Name', 'Experiences Lead', 'Knows every trail, bird call and village story.'],
    ].map(([name, role, bio], i) => ({ name, role, bio, photo: J(local(`/seed/avatar-${i + 1}.svg`, `Placeholder portrait for ${role}`, 400, 500)), order: i })),
  });
  await prisma.instagramPost.createMany({ data: [IMG.tentNight, IMG.coffee2, IMG.peak2, IMG.tent, IMG.campfire, IMG.lake].map((image, order) => ({ image: J(image), link: 'https://instagram.com/', caption: image.alt, order })) });

  // ── 20 FAQs in 4 categories ──
  const faqCats = [
    { name: 'Stays & Booking', slug: 'stays-booking', pages: ['stays/domes', 'stays/backwood', 'faqs', 'book'], faqs: [
      ['What are the check-in and check-out times?', p('Check-in is from 1 pm and check-out is until 11 am. Early check-in or late check-out can be arranged on request, subject to availability.')],
      ['How do I make a booking?', p('Choose your stay and dates on our Book Now page and pay securely online (UPI, cards or net banking) — you’ll get an instant confirmation by email. You can also send us an enquiry.')],
      ['Is the dome heated?', p('Yes. The dome has underfloor heating, insulated walls and an electric heater, so it stays warm even on snowy nights.')],
      ['Is there a minimum stay?', p('We have a two-night minimum on weekends and long weekends. Weekday stays can be booked for a single night.')],
      ['Do you accept pets?', p('Well-behaved pets are welcome in the Backwood Stays rooms for a small cleaning fee. Please let us know when booking.')],
    ] },
    { name: 'Getting Here', slug: 'getting-here', pages: ['contact', 'faqs'], faqs: [
      ['How do I reach the property?', p('The nearest airport and railway station are about three hours away by road. We can arrange a pick-up on request.')],
      ['Is the road accessible in winter?', p('The main road is cleared regularly. After heavy snowfall the last stretch may need a short walk — our team will help with luggage.')],
      ['Is there parking?', p('Yes, free parking is available at the entrance for cars and two-wheelers.')],
      ['When is the best time to visit?', `<p>Every season has its own charm:</p><h3>Spring (March–May)</h3><ul><li>Blossoms in the orchards, mild days</li><li>Great for hiking and picnics</li></ul><h3>Summer (June–August)</h3><ul><li>Cool escape from the plains</li><li>Occasional monsoon showers</li></ul><h3>Autumn (September–November)</h3><ul><li>Clear skies and the best mountain views</li><li>Apple harvest season</li></ul><h3>Winter (December–February)</h3><ul><li>Snowfall and cosy evenings by the fire</li><li>Pack thermals and waterproof shoes</li></ul><table><thead><tr><th>Season</th><th>Day temp</th><th>Night temp</th></tr></thead><tbody><tr><td>Spring</td><td>15–22°C</td><td>5–10°C</td></tr><tr><td>Summer</td><td>20–28°C</td><td>12–16°C</td></tr><tr><td>Autumn</td><td>14–22°C</td><td>4–9°C</td></tr><tr><td>Winter</td><td>2–10°C</td><td>-6–2°C</td></tr></tbody></table>`],
      ['Is there mobile network coverage?', p('Most major networks work well on the property, and our Wi-Fi covers all rooms and common areas.')],
    ] },
    { name: 'Café & Dining', slug: 'cafe-dining', pages: ['cafe'], faqs: [
      ['Is the café open to non-staying guests?', p('Yes, the café welcomes day visitors. Dinner reservations are recommended for non-staying guests.')],
      ['Do you cater to dietary requirements?', p('Absolutely. We have vegetarian, vegan and gluten-free options and can adapt most dishes — just let our team know.')],
      ['Can I use the jacuzzi at night?', p('The jacuzzi is open until 10 pm and can be reserved for private sessions.')],
    ] },
    { name: 'Long Stays & Policies', slug: 'long-stays-policies', pages: ['long-stays', 'faqs'], faqs: [
      ['Do you offer discounts for long stays?', p('Yes. Stays of 7 nights or more receive special rates, with further savings for 14 and 30 nights.')],
      ['Is the Wi-Fi good enough for video calls?', p('Our fibre connection with backup supports video calls. The work lounge has quiet booths for meetings.')],
      ['What is your cancellation policy?', p('Please see our <a href="/booking-refund-policy">Booking & Refund Policy</a> for full details.')],
      ['Is smoking allowed?', p('Smoking is not permitted indoors. A designated outdoor area is available.')],
      ['Are children welcome?', p('Yes! Children are welcome in the Family Dome and private rooms. The dorm is for guests aged 18 and over.')],
    ] },
  ];
  for (const [ci, c] of faqCats.entries()) {
    const cat = await prisma.faqCategory.create({ data: { name: c.name, slug: c.slug, order: ci } });
    await prisma.faq.createMany({ data: c.faqs.map(([question, answer], order) => ({ categoryId: cat.id, question, answer, pages: J(c.pages), order })) });
  }

  // ── Blog: authors, categories, tags, 6 posts ──
  const [a1, a2] = await Promise.all([
    prisma.author.create({ data: { name: 'The Host Team', slug: 'host-team', bio: 'Stories from the people who run the resort.', avatar: J(local('/seed/avatar-1.svg', 'Host team avatar', 400, 500)) } }),
    prisma.author.create({ data: { name: 'Guest Writer', slug: 'guest-writer', bio: 'Travellers who stayed with us and wrote about it.', avatar: J(local('/seed/avatar-2.svg', 'Guest writer avatar', 400, 500)), order: 1 } }),
  ]);
  const cats = await Promise.all(['Travel Guides', 'Sustainability', 'Food & Café'].map((name, order) => prisma.blogCategory.create({ data: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), order } })));
  const tags = await Promise.all(['Hiking', 'Winter', 'Eco living', 'Recipes', 'Workation', 'Star-gazing'].map((name, order) => prisma.tag.create({ data: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), order } })));
  const posts = [
    { title: 'A First-Timer’s Guide to the Mountains in Winter', cat: 0, tags: [0, 1], img: IMG.snow, author: a1, excerpt: 'What to pack, how to stay warm and the experiences that make a snowy escape special.' },
    { title: 'How We Built a Resort That Gives Back', cat: 1, tags: [2], img: IMG.forest, author: a1, excerpt: 'Solar water, composting and local hiring — the choices behind our low-impact design.' },
    { title: 'Five Café Recipes Our Guests Ask For', cat: 2, tags: [3], img: IMG.food, author: a1, excerpt: 'From millet porridge to apple crumble, a few favourites you can make at home.' },
    { title: 'Working From the Mountains: A Month-Long Diary', cat: 0, tags: [4], img: IMG.laptop, author: a2, excerpt: 'Morning hikes, focused afternoons and the best sunsets I’ve seen from a desk.' },
    { title: 'A Beginner’s Night Under the Stars', cat: 0, tags: [5, 0], img: IMG.stars, author: a2, excerpt: 'Constellations to look for and tips for photographing the night sky.' },
    { title: 'Why We Chose Mud and Timber', cat: 1, tags: [2], img: IMG.interior, author: a1, excerpt: 'The surprising comfort of building the old way, and what it means for the planet.' },
  ];
  for (const [i, ps] of posts.entries()) {
    const content = `<p>${ps.excerpt} This is placeholder copy for your journal — replace it with your own story from the admin panel.</p><h2>Getting started</h2><p>Every good mountain story begins with slowing down. Arrive a little early, unpack, and let the quiet settle in before you plan anything at all.</p><ul><li>Pack layers rather than one heavy coat</li><li>Keep a reusable bottle handy</li><li>Leave a little room in the day for doing nothing</li></ul><h2>What we love most</h2><p>Ask our hosts and you will hear a dozen different answers: the first coffee on the deck, the hush after snowfall, or the way the valley turns gold in the evening.</p><blockquote><p>The mountains don’t ask you to rush. That’s the whole point.</p></blockquote><h3>Before you go</h3><p>Write to us with any questions — we are always happy to help you plan.</p>`;
    await prisma.post.create({
      data: {
        title: ps.title,
        slug: ps.title.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
        excerpt: ps.excerpt,
        content,
        coverImage: J(ps.img),
        authorId: ps.author.id,
        categoryId: cats[ps.cat].id,
        tags: { connect: ps.tags.map((t) => ({ id: tags[t].id })) },
        status: 'PUBLISHED',
        publishedAt: new Date(Date.now() - (i + 1) * 9 * 86400000),
        readingTime: 3,
        seoDescription: ps.excerpt,
      },
    });
  }

  // ── Pages & sections ──
  const H = (slides: unknown[], extra: Record<string, unknown> = {}) => ({ type: 'hero', data: { slides: slides.map((s) => ({ _key: key(), ctas: [], video: '', badge: '', subheading: '', text: '', ...(s as object) })), height: 'medium', overlay: 40, autoplay: 6, kenBurns: true, align: 'center', showScrollCue: false, ...extra } });
  const S = (type: string, data: Record<string, unknown>) => ({ type, data: { background: 'cream', anchorId: '', align: 'center', eyebrow: '', heading: '', intro: '', showOn: 'always', ...data } });
  const pageHero = (heading: string, sub: string, image: Img, text = '') => H([{ image, heading, subheading: sub, text }]);

  const pages: { slug: string; title: string; seoDescription: string; sections: { type: string; data: Record<string, unknown> }[] }[] = [
    {
      slug: '', title: 'Home', seoDescription: 'An eco-luxury glamping dome, cosy Backwood Stays and a glass café in the forests of Cheog, Shimla. Book direct.',
      sections: [
        H([
          { image: IMG.peaks, heading: 'Wake up where the mountains begin', video: '', mobileVideo: '', contentType: 'text', animation: '' },
          { image: IMG.tentNight, heading: 'Sleep under a sky full of stars', video: '', mobileVideo: '', contentType: 'text', animation: 'letters-up' },
          { image: IMG.interior, heading: 'Cosy rooms in the woods', video: '', mobileVideo: '', contentType: 'text', animation: 'blur-in' },
        ], {
          topImage: LOGO_LIGHT, topImageWidth: 260, topImageMobileWidth: 170, topOffset: 96, topGap: 16,
          showTabs: true, tab1Label: 'Stays', tab2Label: 'Experiences',
          slides2: [
            { image: IMG.hike, heading: 'Walk the ridge at sunrise', animation: 'words-up' },
            { image: IMG.starsky, heading: 'Count the stars, not the hours', animation: 'typewriter' },
            { image: IMG.campfire, heading: '', contentType: 'image', contentImage: LOGO_LIGHT, contentImageWidth: 640, contentImageMobileWidth: 300, animation: 'zoom-in' },
          ].map((x) => ({ _key: key(), ctas: [], video: '', mobileVideo: '', badge: '', subheading: '', text: '', contentType: 'text', ...x })),
          height: 'full', overlay: 35, autoplay: 6, kenBurns: true, showScrollCue: false,
          textAlign: 'center', verticalAlign: 'center', fontSize: 96, mobileFontSize: 46, fontWeight: '600', fontFamily: 'heading',
          textColor: '#FFFFFF', textColor2: '#E8C9A0', textEffect: 'solid', outlineWidth: 1.5, maxWidth: 1100, lineHeight: 1.05, letterSpacing: 0, uppercase: false, italic: false, textShadow: true,
          animation: 'fade-up', animEasing: 'smooth', animDuration: 1.2, animDelay: 0.3, animStagger: 45, animDistance: 40, animRepeat: 1, animRepeatGap: 2, animFadeOut: true,
        }),
        S('activities', { showOn: 'tab2', eyebrow: 'Things to do', heading: 'Experiences in the hills', intro: 'Pick what you’re in the mood for — guided by people who call these hills home.', filter: 'all', limit: 0, showFilters: true, ctas: [] }),
        S('specialArrangements', { showOn: 'tab2', eyebrow: 'Make it special', heading: 'Special arrangements', limit: 3, ctas: [], background: 'white' }),
        S('split', { showOn: 'tab1', eyebrow: 'Glamping domes', heading: 'A room with the whole sky in it', body: p('Our climate-controlled geodesic domes pair hotel comfort with the thrill of sleeping outdoors. Floor-to-ceiling windows frame the peaks; a skylight frames the stars.'), bullets: ['Private deck with mountain views', 'Heated floors and rain showers', 'Star-gazing skylight above the bed'], ctas: [cta('Book Now', '/contact#enquiry'), cta('Learn more', '/stays/domes', 'link')], media: 'gallery', imagePosition: 'right', image: IMG.tentNight, gallery: [IMG.bed, IMG.tentGlow, IMG.stars, IMG.peak2, IMG.sunrise] }),
        S('split', { showOn: 'tab1', eyebrow: 'Backwood stays', heading: 'Cosy rooms in the woods', body: p('Two warm, wood-lined rooms tucked among the pines: a private room for two, and an interconnected room for families and friends who want to stay together.'), bullets: ['Private room for two', 'Interconnected room for families', 'Forest views and bonfire evenings'], ctas: [cta('Book Now', '/book'), cta('Learn more', '/stays/backwood', 'link')], media: 'image', image: IMG.interior, imagePosition: 'right', background: 'white' }),
        S('split', { eyebrow: 'The glass café', heading: 'Seasonal food with a view', body: p('A light-filled café serving breakfasts, thalis, bakes and pour-over coffee — made with produce from our garden and the valley.'), ctas: [cta('See the menu', '/cafe')], media: 'gallery', imagePosition: 'left', image: IMG.cafe, gallery: [IMG.coffee, IMG.bowl, IMG.food, IMG.coffee2], background: 'white' }),
        S('activities', { showOn: 'tab1', eyebrow: 'Things to do', heading: 'Days full of small adventures', intro: 'Guided hikes, star-gazing, village walks and more — curated by people who call these hills home.', filter: 'all', limit: 6, showFilters: false, ctas: [cta('More activities', '/experiences', 'secondary')] }),
        S('awards', { eyebrow: 'Recognition', heading: 'Honoured to be recognised', style: 'strip', ctas: [cta('Learn more', '/about/awards', 'link')], background: 'white' }),
        S('testimonials', { eyebrow: 'Guest stories', heading: 'Words from our guests', showMentions: true, mentionsHeading: 'As featured in', communityHeading: 'Our community', communityPhotos: [IMG.campfire, IMG.hike, IMG.coffee2, IMG.yoga, IMG.travel, IMG.hiker] }),
        S('stats', { eyebrow: 'Community impact', heading: 'Growing with the valley', body: p('We work with local farmers, artisans and guides, and reinvest in the village school and trail upkeep.'), image: IMG.trek, source: 'collection', group: 'community', items: [], background: 'green' }),
        S('ctaBand', { eyebrow: 'Workation', heading: 'Work from the mountains', text: 'Fast Wi-Fi, a quiet work lounge, long-stay rates and evenings that make every deadline worth it.', ctas: [cta('Explore long stays', '/long-stays', 'light'), cta('Enquire now', '/contact#enquiry')], layout: 'images', images: [IMG.laptop, IMG.desk], background: 'green' }),
        S('latestPosts', { eyebrow: 'From the journal', heading: 'Stories from the hills', count: 3, ctas: [cta('Read the blog', '/blog', 'secondary')] }),
        S('videoReviews', {
          eyebrow: 'In their words', heading: 'Guest video reviews', intro: 'Real stays, real voices. Click a video to hear it.', align: 'center',
          items: [
            { _key: key(), video: '', poster: IMG.peaks, name: 'Aanya & Rohit', location: 'Mumbai', caption: 'Woke up to clouds below the deck — unreal.', rating: 5 },
            { _key: key(), video: '', poster: IMG.tentNight, name: 'Sarah', location: 'London', caption: 'The star-gazing dome was the highlight of our India trip.', rating: 5 },
            { _key: key(), video: '', poster: IMG.interior, name: 'The Mehta family', location: 'Delhi', caption: 'Kids did not want to leave the interconnected room!', rating: 5 },
            { _key: key(), video: '', poster: IMG.peaks, name: 'Kabir', location: 'Bengaluru', caption: 'Food, hikes and silence. Exactly what I needed.', rating: 5 },
            { _key: key(), video: '', poster: IMG.tentNight, name: 'Lena', location: 'Berlin', caption: 'Hosts made us feel like family.', rating: 5 },
          ],
          perView: '4', hoverPreview: true, edgeHover: true, background: 'cream',
        }),
        S('instagram', { eyebrow: '', heading: 'Follow along', count: 6, buttonLabel: 'Follow on Instagram', background: 'white' }),
      ],
    },
    {
      slug: 'stays', title: 'Stay Options', seoDescription: 'Choose between our geodesic glamping dome and cosy Backwood Stays.',
      sections: [
        pageHero('Stay Options', 'Where you’ll sleep', IMG.tent),
        S('staysGrid', { eyebrow: 'Two ways to stay', heading: 'The dome or the woods?', intro: 'Both share the same mountain air, café and bonfire evenings — choose the mood that suits your trip.' }),
        S('amenities', { eyebrow: 'Included with every stay', heading: 'Thoughtful comforts', group: 'general', layout: 'carousel', background: 'white' }),
        S('ctaBand', { heading: 'Staying a week or more?', text: 'Ask about our long-stay rates and workation packages.', ctas: [cta('Long stays', '/long-stays', 'light')], layout: 'plain', background: 'green' }),
      ],
    },
    ...[
      { stay: domes, slug: 'stays/domes', title: 'Glamping Dome', hero: IMG.tentNight, sub: 'Glamping domes', heading: 'Sleep beneath the stars, in comfort', intro: 'Each dome is a private hideaway with panoramic windows, a skylight above the bed and a deck facing the peaks.', gallery: [IMG.tentNight, IMG.bed, IMG.stars, IMG.tentGlow, IMG.peak2, IMG.sunrise] },
      { stay: mud, slug: 'stays/backwood', title: 'Backwood Stays', hero: IMG.interior, sub: 'Backwood stays', heading: 'Cosy rooms in the woods', intro: 'Two warm, wood-lined rooms among the pines — a private room for two, and an interconnected room for families and friends who want to stay together.', gallery: [IMG.interior, IMG.room2, IMG.room, IMG.campfire, IMG.forest] },
    ].map((x) => ({
      slug: x.slug, title: x.title, seoDescription: x.intro,
      sections: [
        H([{ image: x.hero, subheading: x.sub, heading: x.heading, text: x.intro, ctas: [cta('Book Now', '/book')] }], { height: 'large' }),
        S('richText', { eyebrow: 'Overview', heading: x.title, content: p(x.intro, 'Expect crisp mountain mornings, the smell of pine and woodsmoke, and a team that’s happy to help with anything you need.'), width: 'narrow' }),
        S('gallery', { heading: 'A look inside', images: x.gallery, layout: 'masonry', columns: '3', background: 'white' }),
        S('featureList', { eyebrow: 'Your sanctuary', heading: 'Everything you need, nothing you don’t', layout: 'checklist', image: x.gallery[1], items: [
          { _key: key(), icon: 'BedDouble', title: 'Premium bedding', text: 'Organic cotton and wool duvets' }, { _key: key(), icon: 'Heater', title: 'Warmth all year', text: 'Heating and insulated walls' },
          { _key: key(), icon: 'ShowerHead', title: 'Hot showers', text: 'Solar-assisted hot water' }, { _key: key(), icon: 'Coffee', title: 'Tea & coffee', text: 'Local blends in your room' },
          { _key: key(), icon: 'Wifi', title: 'Wi-Fi', text: 'Fast and reliable' }, { _key: key(), icon: 'Leaf', title: 'Natural toiletries', text: 'Refillable, plastic-free' },
        ], ctas: [] }),
        S('rooms', { eyebrow: 'Choose your room', heading: 'Rooms & rates', stayId: x.stay.id, background: 'white' }),
        S('amenities', { eyebrow: 'Amenities', heading: 'Comforts on site', group: 'general', layout: 'carousel' }),
        S('activities', { eyebrow: 'Make a day of it', heading: 'Activities nearby', filter: 'featured', limit: 3, ctas: [cta('All experiences', '/experiences', 'secondary')], background: 'white' }),
        S('specialArrangements', { eyebrow: 'Make it special', heading: 'Special arrangements', limit: 3 }),
        S('faq', { eyebrow: 'Questions', heading: 'Good to know', mode: 'page', limit: 0, background: 'white' }),
      ],
    })),
    {
      slug: 'long-stays', title: 'Long Stays & Workations', seoDescription: 'Weekly and monthly stays with fast Wi-Fi, a work lounge and forest walks.',
      sections: [
        pageHero('Long stays & workations', 'Stay a while', IMG.laptop, 'Weekly and monthly packages for remote workers, writers and anyone who needs a slower pace.'),
        S('cardGrid', { eyebrow: 'Packages', heading: 'Pick your pace', columns: '3', cards: [
          { _key: key(), image: IMG.desk, tag: '7+ nights', title: 'Workation Week', price: 'From ₹62,000', text: 'A week of focused work with mountain breaks.', features: ['Daily breakfast', 'Work lounge access', 'One guided hike'], cta: cta('Enquire', '/contact#enquiry', 'link') },
          { _key: key(), image: IMG.yoga, tag: '14+ nights', title: 'Slow Fortnight', price: 'From ₹1,15,000', text: 'Reset with forest walks, bonfires and nourishing food.', features: ['All meals', 'Daily guided walk', 'One special dinner'], cta: cta('Enquire', '/contact#enquiry', 'link') },
          { _key: key(), image: IMG.valley, tag: '30+ nights', title: 'Mountain Month', price: 'On request', text: 'Live like a local with our best long-stay rate.', features: ['Breakfast & dinner', 'Laundry included', 'Airport transfer'], cta: cta('Enquire', '/contact#enquiry', 'link') },
        ], ctas: [] }),
        S('featureList', { eyebrow: 'Built for long stays', heading: 'Long-stay amenities', layout: 'grid', columns: '4', items: [
          { _key: key(), icon: 'Wifi', title: 'Fibre internet', text: 'With power and network backup' }, { _key: key(), icon: 'Laptop', title: 'Work lounge', text: 'Desks, ergonomic chairs and call booths' },
          { _key: key(), icon: 'Shirt', title: 'Laundry', text: 'Weekly laundry service' }, { _key: key(), icon: 'UtensilsCrossed', title: 'Meal plans', text: 'Flexible plans at the café' },
        ], background: 'white', ctas: [] }),
        S('faq', { eyebrow: 'Questions', heading: 'Long-stay FAQs', mode: 'page', limit: 0 }),
        S('ctaBand', { heading: 'Ready to swap your desk for a view?', ctas: [cta('Send an enquiry', '/contact#enquiry', 'light')], layout: 'plain', background: 'green' }),
      ],
    },
    {
      slug: 'experiences', title: 'Experiences', seoDescription: 'Hikes, star-gazing, village walks and seasonal adventures.',
      sections: [
        pageHero('Experiences', 'Things to do', IMG.hiker, 'Curated by locals, designed to help you slow down and see more.'),
        S('activities', { eyebrow: 'Explore', heading: 'Find your adventure', intro: 'Filter by what you’re in the mood for.', filter: 'all', limit: 0, showFilters: true, ctas: [] }),
        S('ctaBand', { eyebrow: 'Celebrating something?', heading: 'Add a special arrangement', text: 'Cakes, candle-light dinners and decorations to make your stay unforgettable.', ctas: [cta('See arrangements', '/special-arrangements', 'light')], layout: 'background', backgroundImage: IMG.restaurant }),
      ],
    },
    {
      slug: 'special-arrangements', title: 'Special Arrangements', seoDescription: 'Cake setups, candle-light dinners and room decorations.',
      sections: [pageHero('Special arrangements', 'Make it memorable', IMG.tentGlow), S('specialArrangements', { eyebrow: 'Add-ons', heading: 'For the moments that matter', intro: 'Let us know at least 24 hours ahead and we’ll take care of everything.', limit: 0, ctas: [] })],
    },
    {
      slug: 'cafe', title: 'Café', seoDescription: 'Our glass café serves seasonal breakfasts, thalis, bakes and coffee.',
      sections: [
        H([{ image: IMG.cafe, subheading: 'The glass café', heading: 'Seasonal food, mountain views', text: 'Open to guests and day visitors, from first coffee to late dinner.', ctas: [cta('See the menu', '#menu')] }], { height: 'large' }),
        S('split', { eyebrow: 'Our food story', heading: 'Grown nearby, cooked with care', body: p('Our menu follows the seasons and the valley: millets and buckwheat, orchard fruit, trout from clean streams and vegetables from our kitchen garden.'), media: 'image', imagePosition: 'right', image: IMG.food, gallery: [], ctas: [] }),
        S('split', { eyebrow: 'Sustainability', heading: 'Low waste, high flavour', body: p('We compost kitchen waste for the garden, avoid single-use plastic and buy directly from local farmers whenever we can.'), media: 'image', imagePosition: 'left', image: IMG.bowl, gallery: [], background: 'white', ctas: [] }),
        S('featureList', { layout: 'tiles', columns: '4', items: [
          { _key: key(), icon: 'Sprout', title: 'Garden to table', text: 'Herbs and greens from our garden' }, { _key: key(), icon: 'Coffee', title: 'Pour-over coffee', text: 'Single-origin Indian beans' },
          { _key: key(), icon: 'Wheat', title: 'Ancient grains', text: 'Millets and buckwheat' }, { _key: key(), icon: 'Mountain', title: 'A view with every meal', text: 'Floor-to-ceiling glass' },
        ], ctas: [] }),
        S('cafeTimings', { eyebrow: 'Hours', heading: 'Café timings', note: 'Timings may change slightly with the seasons.', background: 'white' }),
        S('cafeMenu', { eyebrow: 'Menu', heading: 'What’s cooking', anchorId: 'menu', pdf: '', pdfLabel: 'Download menu (PDF)' }),
        S('gallery', { heading: 'Around the café', images: [IMG.cafe, IMG.coffee, IMG.coffee2, IMG.bowl2, IMG.cafe2, IMG.food], layout: 'masonry', columns: '3', background: 'white' }),
        S('faq', { eyebrow: 'Questions', heading: 'Café FAQs', mode: 'page', limit: 0 }),
      ],
    },
    {
      slug: 'about/awards', title: 'Awards', seoDescription: 'Awards and recognition for Glamo Home Cheog.',
      sections: [pageHero('Awards & recognition', 'Honours', IMG.sunrise), S('awards', { eyebrow: 'Recognition', heading: 'Thank you for the support', intro: 'Every award belongs to our team, our village partners and our guests.', style: 'cards', ctas: [] }), S('mediaMentions', { eyebrow: 'As featured in', background: 'white' })],
    },
    {
      slug: 'faqs', title: 'FAQs', seoDescription: 'Answers to common questions about stays, booking, travel and the café.',
      sections: [pageHero('Frequently asked questions', 'Help', IMG.lake), S('faqBrowser', { eyebrow: 'Find an answer', heading: 'How can we help?', searchPlaceholder: 'Search questions…' }), S('ctaBand', { heading: 'Still have a question?', text: 'Our team usually replies within a few hours.', ctas: [cta('Contact us', '/contact', 'light')], layout: 'plain', background: 'green' })],
    },
    {
      slug: 'blog', title: 'Journal', seoDescription: 'Travel guides, sustainability stories and recipes from the mountains.',
      sections: [pageHero('The journal', 'Stories from the hills', IMG.travel)],
    },
    {
      slug: 'contact', title: 'Contact', seoDescription: 'Get in touch or send a booking enquiry.',
      sections: [
        pageHero('Contact us', 'Plan your stay', IMG.valley),
        S('contactDetails', { eyebrow: 'Get in touch', heading: 'We’d love to host you', intro: 'Call, email or send an enquiry — we usually reply within a few hours.', showForm: true, formHeading: 'Booking enquiry', formIntro: 'Share your dates and we’ll confirm availability.', align: 'left', anchorId: 'enquiry' }),
        S('map', { eyebrow: 'Find us', heading: 'Directions to reach', embedUrl: 'https://maps.google.com/maps?q=Cheog%2C%20Shimla%2C%20Himachal%20Pradesh&z=12&output=embed', directions: '<h3>By air</h3><p>Shimla (Jubbarhatti) airport is the closest; Chandigarh airport is the best-connected. We can arrange a pick-up from either.</p><h3>By train</h3><p>Ride the Kalka–Shimla toy train to Shimla, then drive on towards Cheog.</p><h3>By road</h3><p>From Shimla, take the highway towards Theog and turn off at Cheog. The last 500 m is a gentle uphill walk — our team will meet you.</p>', staticImage: IMG.valley, background: 'white' }),
        S('faq', { eyebrow: 'Questions', heading: 'Getting here', mode: 'page', limit: 0 }),
      ],
    },
    {
      slug: 'privacy-policy', title: 'Privacy Policy', seoDescription: 'How we collect and use your information.',
      sections: [pageHero('Privacy Policy', 'Legal', IMG.mist), S('richText', { content: `<p><em>Placeholder — replace with a policy reviewed for your business and jurisdiction.</em></p><h2>Information we collect</h2>${p('When you send an enquiry or subscribe, we collect the details you provide such as your name, email, phone and travel dates.')}<h2>How we use it</h2>${p('We use your information to respond to enquiries, manage bookings and, if you opt in, send occasional newsletters.')}<h2>Cookies</h2>${p('With your consent, we use analytics cookies to understand how the site is used. You can change your choice at any time by clearing your browser storage.')}<h2>Your rights</h2>${p('You may request access to, correction of or deletion of your personal data by contacting us.')}`, width: 'narrow' })],
    },
    {
      slug: 'booking-refund-policy', title: 'Booking & Refund Policy', seoDescription: 'Booking terms, cancellations and refunds.',
      sections: [pageHero('Booking & Refund Policy', 'Legal', IMG.lake), S('richText', { content: `<p><em>Placeholder — replace with your own terms.</em></p><h2>Bookings</h2>${p('A booking is confirmed once the advance payment is received and a confirmation email is sent.')}<h2>Cancellations</h2><table><thead><tr><th>Cancelled</th><th>Refund</th></tr></thead><tbody><tr><td>15+ days before arrival</td><td>Full refund</td></tr><tr><td>7–14 days before arrival</td><td>50% refund</td></tr><tr><td>Less than 7 days</td><td>No refund (date change possible)</td></tr></tbody></table><h2>Refunds</h2>${p('Approved refunds are processed to the original payment method within 7–10 working days.')}`, width: 'narrow' })],
    },
  ];

  for (const pg of pages) {
    const page = await prisma.page.create({ data: { slug: pg.slug, title: pg.title, isSystem: true, seoDescription: pg.seoDescription } });
    await prisma.section.createMany({ data: pg.sections.map((s, order) => ({ pageId: page.id, type: s.type, order, isVisible: true, data: J(s.data) })) });
  }

  // ── Example redirect, enquiries and subscribers ──
  await prisma.redirect.createMany({
    data: [
      { from: '/about', to: '/about/awards', type: 301 },
      { from: '/stays/mudhouse', to: '/stays/backwood', type: 301 },
      { from: '/spa', to: '/', type: 301 },
      { from: '/spa/wellness-retreat', to: '/', type: 301 },
      { from: '/about/our-story', to: '/', type: 301 },
    ],
  });
  if ((await prisma.enquiry.count()) === 0) {
    const d = (n: number) => new Date(Date.now() + n * 86400000);
    await prisma.enquiry.createMany({
      data: [
        { name: 'Sample Guest', email: 'guest@example.com', phone: '+91 90000 11111', checkIn: d(14), checkOut: d(17), guests: 2, stayType: 'Glamping Dome', message: 'Anniversary trip — could you arrange a cake?', status: 'NEW' },
        { name: 'Remote Worker', email: 'remote@example.com', checkIn: d(30), checkOut: d(58), guests: 1, stayType: 'Backwood Stays', message: 'Interested in a month-long workation.', status: 'CONTACTED' },
      ],
    });
  }
  await prisma.subscriber.upsert({ where: { email: 'subscriber@example.com' }, update: {}, create: { email: 'subscriber@example.com', source: 'footer' } });

  // ── Register every seeded image in the Media Library ──
  const seen = new Map<string, Img>();
  const walk = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) return v.forEach(walk);
    const o = v as Record<string, unknown>;
    if (typeof o.url === 'string' && typeof o.alt === 'string' && 'width' in o) seen.set(o.url, o as unknown as Img);
    Object.values(o).forEach(walk);
  };
  walk([IMG, LOGO_LIGHT, LOGO_DARK, FAVICON, pages]);
  for (const t of ['mediaMention', 'award', 'teamMember', 'author'] as const) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    walk(await (prisma[t] as any).findMany());
  }
  await prisma.media.createMany({
    data: [...seen.values()].map((i) => ({
      url: i.url,
      alt: i.alt,
      width: i.width,
      height: i.height,
      filename: i.url.split('/').pop()!.split('?')[0],
      mime: i.url.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg',
      folder: i.url.startsWith('/seed/') ? 'brand' : 'placeholders',
    })),
  });

  console.log(`✔ Seed complete. Admin login email: ${email} (password: the ADMIN_PASSWORD you set in .env — never printed).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
