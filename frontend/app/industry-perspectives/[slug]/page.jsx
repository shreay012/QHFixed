import BlogDetail from '@/features/blog/components/BlogDetail';
import BlogCard from '@/features/blog/components/BlogCard';
import Link from 'next/link';
import { getDb } from '@/lib/blog/mongoClient';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

async function getPost(slug, country = 'IN') {
  try {
    const db = await getDb();
    // 1. Try exact slug + published
    let post = await db.collection('blog_posts').findOne({ slug, status: 'published' });

    // 2. Fallback: published post whose slug starts with this (handles nanoid suffix)
    if (!post) {
      const safe = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      post = await db.collection('blog_posts').findOne(
        { slug: { $regex: `^${safe}` }, status: 'published' },
        { sort: { publishedAt: -1 } },
      );
    }
    if (!post) {
      console.error(`[blog] no published post for slug "${slug}"`);
      return null;
    }

    const catIds = (post.categories || [])
      .map(id => { try { return new ObjectId(id); } catch { return null; } })
      .filter(Boolean);
    const catDocs = catIds.length
      ? await db.collection('blog_categories').find({ _id: { $in: catIds } }).toArray()
      : [];

    db.collection('blog_posts').updateOne({ _id: post._id }, { $inc: { viewCount: 1 } }).catch(() => {});

    return {
      ...post,
      _id: String(post._id),
      coverImage: (country && post.coverImageByCountry?.[country]) || post.coverImage || '',
      categoriesData: catDocs.map(c => ({ ...c, _id: String(c._id) })),
    };
  } catch (e) {
    console.error(`[blog] getPost error for "${slug}":`, e?.message);
    return null;
  }
}

async function getRelated(post, lang, country) {
  try {
    const catId = post.categoriesData?.[0]?._id;
    const filter = { status: 'published', _id: { $ne: new ObjectId(post._id) } };
    if (catId) filter.categories = String(catId);
    const db  = await getDb();
    const raw = await db.collection('blog_posts').find(filter).sort({ publishedAt: -1 }).limit(3).toArray();
    return raw.map(p => ({ ...p, _id: String(p._id) }));
  } catch { return []; }
}

export async function generateMetadata({ params, searchParams }) {
  const p  = await params;
  const sp = await searchParams;
  const lang = sp?.lang || 'en';
  const post = await getPost(p.slug, sp?.country || 'IN');
  if (!post) return { title: 'Article not found — Industry Perspectives' };
  const seo   = post.seo?.[lang] || post.seo?.en || {};
  const title = seo.metaTitle || post.title?.[lang] || post.title?.en || '';
  const desc  = seo.metaDescription || post.excerpt?.[lang] || post.excerpt?.en || '';
  const ogImg = seo.ogImage || post.coverImage || '';
  return {
    title: `${title} — Industry Perspectives | QuickHire`,
    description: desc,
    openGraph: { title, description: desc, images: ogImg ? [{ url: ogImg }] : [], type: 'article' },
  };
}

export default async function ArticlePage({ params, searchParams }) {
  const p  = await params;
  const sp = await searchParams;
  const lang    = sp?.lang    || 'en';
  const country = sp?.country || 'IN';
  const post    = await getPost(p.slug, country);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-[#f9fbf8]">
        <div className="text-6xl mb-5">📰</div>
        <h1 className="text-2xl font-bold text-[#1a2e1a] mb-2">Article not found</h1>
        <p className="text-[#6b7280] mb-6">
          No published post with slug &quot;{p.slug}&quot;.<br/>
          Check that it&apos;s published in admin.
        </p>
        <Link href="/industry-perspectives" className="bg-[#45A735] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#3a9028] transition-colors">
          Back to Industry Perspectives
        </Link>
      </div>
    );
  }

  const related = await getRelated(post, lang, country);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-[#f9fbf8] border-b border-[#e5ede3]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-xs text-[#6b7280]">
          <Link href="/" className="hover:text-[#45A735]">Home</Link>
          <span>/</span>
          <Link href="/industry-perspectives" className="hover:text-[#45A735] font-medium text-[#45A735]">Industry Perspectives</Link>
          {post.categoriesData?.[0] && (
            <>
              <span>/</span>
              <Link href={`/industry-perspectives/category/${post.categoriesData[0].slug}`} className="hover:text-[#45A735]">
                {post.categoriesData[0].name?.[lang] || post.categoriesData[0].name?.en}
              </Link>
            </>
          )}
        </div>
      </div>

      <BlogDetail post={post} lang={lang} basePath="/industry-perspectives" />

      {related.length > 0 && (
        <section className="border-t border-[#e5ede3] bg-[#f9fbf8]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
            <h2 className="text-xl font-bold text-[#1a2e1a] mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {related.map(p => <BlogCard key={p._id} post={p} lang={lang} basePath="/industry-perspectives" />)}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        <Link href="/industry-perspectives" className="inline-flex items-center gap-2 text-[#45A735] font-semibold hover:underline text-sm">
          ← All Industry Perspectives
        </Link>
      </div>
    </div>
  );
}
