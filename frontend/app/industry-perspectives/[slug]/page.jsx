import BlogDetail from '@/features/blog/components/BlogDetail';
import BlogCard from '@/features/blog/components/BlogCard';
import Link from 'next/link';
import { getDb } from '@/lib/blog/mongoClient';
import { ObjectId } from 'mongodb';

async function getPost(slug, lang = 'en', country = 'IN') {
  try {
    const db   = await getDb();
    const post = await db.collection('blog_posts').findOne({ slug, status: 'published' });
    if (!post) return null;
    const catIds  = (post.categories || []).map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean);
    const catDocs = catIds.length ? await db.collection('blog_categories').find({ _id: { $in: catIds } }).toArray() : [];
    db.collection('blog_posts').updateOne({ slug }, { $inc: { viewCount: 1 } }).catch(() => {});
    return { ...post, _id: String(post._id), coverImage: (country && post.coverImageByCountry?.[country]) || post.coverImage || '', categoriesData: catDocs };
  } catch (e) {
    console.error(`[blog] getPost ${slug}:`, e?.message);
    return null;
  }
}

async function getRelated(cats = [], excludeSlug = '', lang = 'en', country = 'IN') {
  if (!cats.length) return [];
  try {
    const db  = await getDb();
    const cat = await db.collection('blog_categories').findOne({ slug: cats[0], active: true });
    const filter = { status: 'published', ...(cat ? { categories: String(cat._id) } : {}) };
    const raw = await db.collection('blog_posts').find(filter).sort({ publishedAt: -1 }).limit(4).toArray();
    return raw.filter(p => p.slug !== excludeSlug).slice(0, 3).map(p => ({ ...p, _id: String(p._id) }));
  } catch { return []; }
}

export async function generateMetadata({ params, searchParams }) {
  const lang = searchParams?.lang || 'en';
  const post = await getPost(params.slug, lang, searchParams?.country || 'IN');
  if (!post) return { title: 'Article not found — Industry Perspectives' };
  const seo   = post.seo?.[lang] || post.seo?.en || {};
  const title = seo.metaTitle || post.title?.[lang] || post.title?.en || '';
  const desc  = seo.metaDescription || post.excerpt?.[lang] || post.excerpt?.en || '';
  const ogImg = seo.ogImage || post.coverImage || '';
  return {
    title: `${title} — Industry Perspectives | QuickHire`,
    description: desc,
    keywords: seo.keywords?.join(', ') || '',
    openGraph: { title: seo.ogTitle || title, description: seo.ogDescription || desc, images: ogImg ? [{ url: ogImg }] : [], type: 'article', publishedTime: post.publishedAt },
    twitter: { card: 'summary_large_image', title, description: desc, images: ogImg ? [ogImg] : [] },
    alternates: { canonical: seo.canonicalUrl || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/industry-perspectives/${params.slug}` },
  };
}

export default async function ArticlePage({ params, searchParams }) {
  const lang    = searchParams?.lang    || 'en';
  const country = searchParams?.country || 'IN';
  const post    = await getPost(params.slug, lang, country);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-[#f9fbf8]">
        <div className="text-6xl mb-5">📰</div>
        <h1 className="text-2xl font-bold text-[#1a2e1a] mb-2">Article not found</h1>
        <p className="text-[#6b7280] mb-6">This article may have been removed or the URL is incorrect.</p>
        <Link href="/industry-perspectives" className="bg-[#45A735] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#3a9028] transition-colors">
          Back to Industry Perspectives
        </Link>
      </div>
    );
  }

  const catSlugs = (post.categoriesData || []).map(c => c.slug).filter(Boolean);
  const related  = await getRelated(catSlugs, post.slug, lang, country);

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline:    post.title?.[lang] || post.title?.en || '',
    description: post.excerpt?.[lang] || post.excerpt?.en || '',
    image:       post.coverImage,
    datePublished: post.publishedAt,
    dateModified:  post.updatedAt,
    author: { '@type': 'Person', name: post.authorName || 'QuickHire Team' },
    publisher: { '@type': 'Organization', name: 'QuickHire Global', logo: { '@type': 'ImageObject', url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/quickhire-logo.svg` } },
    keywords: (post.seo?.[lang]?.keywords || post.seo?.en?.keywords || []).join(', '),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-white">

        {/* Top breadcrumb bar */}
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

        {/* Article body — reuse BlogDetail but with updated back-link */}
        <BlogDetail post={post} lang={lang} basePath="/industry-perspectives" />

        {/* Related articles */}
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
    </>
  );
}
