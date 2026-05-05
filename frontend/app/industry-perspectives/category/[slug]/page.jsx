import BlogCard from '@/features/blog/components/BlogCard';
import Link from 'next/link';
import { getDb } from '@/lib/blog/mongoClient';
import { ObjectId } from 'mongodb';

async function getCategory(slug) {
  try {
    const db  = await getDb();
    const cat = await db.collection('blog_categories').findOne({ slug, active: true });
    return cat ? { ...cat, _id: String(cat._id) } : null;
  } catch { return null; }
}

async function getPosts(categorySlug, lang = 'en', country = 'IN', page = 1) {
  try {
    const db    = await getDb();
    const cat   = await db.collection('blog_categories').findOne({ slug: categorySlug, active: true });
    const filter = { status: 'published', ...(cat ? { categories: String(cat._id) } : {}) };
    const limit = 12; const skip = (page - 1) * limit;
    const [raw, total] = await Promise.all([
      db.collection('blog_posts').find(filter).sort({ publishedAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection('blog_posts').countDocuments(filter),
    ]);
    return { posts: raw.map(p => ({ ...p, _id: String(p._id) })), total, pages: Math.ceil(total / limit) };
  } catch { return { posts: [], total: 0, pages: 1 }; }
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = sp?.lang || 'en';
  const cat  = await getCategory(slug);
  const name = cat?.name?.[lang] || cat?.name?.en || slug;
  return {
    title: `${name} — Industry Perspectives | QuickHire`,
    description: cat?.description?.[lang] || cat?.description?.en || `Browse ${name} articles on QuickHire Industry Perspectives.`,
    alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/industry-perspectives/category/${slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang    = sp?.lang    || 'en';
  const country = sp?.country || 'IN';
  const page    = Number(sp?.page) || 1;

  const [cat, { posts, total, pages }] = await Promise.all([
    getCategory(slug),
    getPosts(slug, lang, country, page),
  ]);

  const name = cat?.name?.[lang] || cat?.name?.en || slug;
  const desc = cat?.description?.[lang] || cat?.description?.en || '';

  return (
    <div className="min-h-screen bg-white">
      {/* Header strip */}
      <div className="bg-[#F9FBF8] border-b border-[#E5EDE3]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-xs text-[#6b7280]">
          <Link href="/" className="hover:text-[#45A735]">Home</Link>
          <span>/</span>
          <Link href="/industry-perspectives" className="hover:text-[#45A735]">Industry Perspectives</Link>
          <span>/</span>
          <span className="text-[#1a2e1a] font-medium">{name}</span>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#26472B] to-[#1a2e1a] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="inline-block bg-[#45A735]/20 text-[#9de893] text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-[#45A735]/30">
            Category
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{name}</h1>
          {desc && <p className="text-white/70 max-w-xl mx-auto text-base">{desc}</p>}
          <p className="text-white/50 text-sm mt-3">{total} article{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Posts grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-[#6b7280] text-lg">No articles in this category yet.</p>
            <Link href="/industry-perspectives" className="mt-6 inline-block bg-[#45A735] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#3a9028] transition-colors">
              Browse All Articles
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(p => (
                <BlogCard key={p._id} post={p} lang={lang} basePath="/industry-perspectives" />
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                {page > 1 && (
                  <Link href={`/industry-perspectives/category/${slug}?page=${page - 1}${lang !== 'en' ? `&lang=${lang}` : ''}${country !== 'IN' ? `&country=${country}` : ''}`}
                        className="px-4 py-2 rounded-lg border border-[#D0E8CB] text-[#45A735] font-medium hover:bg-[#F2F9F1] transition-colors text-sm">
                    ← Prev
                  </Link>
                )}
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <Link key={p} href={`/industry-perspectives/category/${slug}?page=${p}${lang !== 'en' ? `&lang=${lang}` : ''}${country !== 'IN' ? `&country=${country}` : ''}`}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-[#45A735] text-white' : 'border border-[#D0E8CB] text-[#45A735] hover:bg-[#F2F9F1]'}`}>
                    {p}
                  </Link>
                ))}
                {page < pages && (
                  <Link href={`/industry-perspectives/category/${slug}?page=${page + 1}${lang !== 'en' ? `&lang=${lang}` : ''}${country !== 'IN' ? `&country=${country}` : ''}`}
                        className="px-4 py-2 rounded-lg border border-[#D0E8CB] text-[#45A735] font-medium hover:bg-[#F2F9F1] transition-colors text-sm">
                    Next →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Back link */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        <Link href="/industry-perspectives" className="inline-flex items-center gap-2 text-[#45A735] font-semibold hover:underline text-sm">
          ← All Industry Perspectives
        </Link>
      </div>
    </div>
  );
}
