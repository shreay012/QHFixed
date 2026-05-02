/**
 * Banner seed script — populates cms_banners with starter banners that
 * admins can edit/duplicate immediately. Idempotent: each banner is
 * upserted on its `internalName` so re-running this script just refreshes
 * existing seed records and won't create duplicates.
 *
 * Run via:
 *   node src/scripts/seed-banners.js
 *
 * Banners shipped:
 *   1. "Not sure what you need?"  — expert-match variant, home-secondary
 *   2. "Find a developer in 60s"   — simple variant, home-mid
 *   3. "Tell us about your project" — split variant, services-top
 *
 * The expert-match banner mirrors the design the founder shared so the
 * homepage already shows something the moment the slider component goes
 * live; admin can then edit copy / experts / media in place.
 */
import 'dotenv/config';
import { connectDb, closeDb, getDb } from '../config/db.js';
import { logger } from '../config/logger.js';

const BANNERS = [
  {
    internalName: 'Home — Not sure what you need?',
    position: 'home-secondary',
    variant: 'expert-match',
    title: {
      en: 'Not sure what\nyou need?',
      hi: 'पता नहीं क्या\nचाहिए?',
      de: 'Nicht sicher, was\nSie brauchen?',
      ar: 'غير متأكد ما\nتحتاج؟',
      es: '¿No sabes qué\nnecesitas?',
    },
    body: {
      en: "Tell us what you're trying to build or fix, and we'll match you with the right expert.",
      hi: 'हमें बताएं कि आप क्या बनाना या ठीक करना चाहते हैं, और हम आपको सही विशेषज्ञ से मिलाएंगे।',
      de: 'Sagen Sie uns, was Sie bauen oder reparieren möchten — wir vermitteln den passenden Experten.',
      ar: 'أخبرنا بما تحاول بناءه أو إصلاحه، وسنقوم بمطابقتك مع الخبير المناسب.',
      es: 'Cuéntanos qué estás tratando de construir o arreglar y te conectaremos con el experto adecuado.',
    },
    ctaLabel: {
      en: 'Find Right Expert',
      hi: 'सही विशेषज्ञ ढूंढें',
      de: 'Experten finden',
      ar: 'ابحث عن خبير',
      es: 'Encontrar experto',
    },
    ctaUrl: '/book-your-resource',
    experts: [
      { name: 'Rohan',   role: 'Vibe Coding Expert', yearsOfExperience: 9, verified: true,
        imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&auto=format&q=70' },
      { name: 'Akansha', role: 'AI Engineer',         yearsOfExperience: 3, verified: true,
        imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&auto=format&q=70' },
    ],
    order: 0,
    autoplayMs: 6000,
    active: true,
  },
  {
    internalName: 'Home — Find a developer in 60s',
    position: 'home-mid',
    variant: 'simple',
    title: {
      en: 'Find a verified developer in 60 seconds',
      hi: '60 सेकंड में सत्यापित डेवलपर खोजें',
      de: 'In 60 Sekunden einen verifizierten Entwickler finden',
    },
    body: {
      en: 'Browse 400+ pre-vetted experts across React, Node, AI, Mobile and more.',
      hi: 'React, Node, AI, मोबाइल और अधिक में 400+ पूर्व-सत्यापित विशेषज्ञ ब्राउज़ करें।',
      de: 'Durchsuchen Sie 400+ vorab geprüfte Experten in React, Node, KI, Mobile und mehr.',
    },
    ctaLabel: { en: 'Browse experts', hi: 'विशेषज्ञ देखें', de: 'Experten ansehen' },
    ctaUrl: '/book-your-resource',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=900&h=600&fit=crop&auto=format&q=70',
    order: 1,
    active: true,
  },
  {
    internalName: 'Services — Tell us about your project',
    position: 'services-top',
    variant: 'split',
    title: {
      en: 'Tell us about your project',
      hi: 'अपनी परियोजना के बारे में बताएं',
      de: 'Erzählen Sie uns von Ihrem Projekt',
    },
    body: {
      en: 'Brief us once, get matched in minutes, hire in hours.',
      hi: 'एक बार बताएं, मिनटों में मिलान करें, घंटों में हायर करें।',
      de: 'Ein kurzes Briefing — Match in Minuten — Vertrag in Stunden.',
    },
    ctaLabel: { en: 'Start brief', hi: 'ब्रीफ शुरू करें', de: 'Briefing starten' },
    ctaUrl: '/book-your-resource',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=900&h=600&fit=crop&auto=format&q=70',
    order: 0,
    active: true,
  },
];

async function run() {
  await connectDb();
  const db = getDb();
  const col = db.collection('cms_banners');

  let upserted = 0, modified = 0;
  for (const banner of BANNERS) {
    const result = await col.replaceOne(
      { internalName: banner.internalName },
      { ...banner, updatedAt: new Date(), createdAt: new Date() },
      { upsert: true },
    );
    if (result.upsertedCount) upserted++;
    else if (result.modifiedCount) modified++;
  }
  logger.info({ upserted, modified, total: BANNERS.length }, 'banner seed complete');
  await closeDb();
}

run().catch((err) => {
  logger.fatal({ err }, 'banner seed failed');
  process.exit(1);
});
