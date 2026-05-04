import axiosInstance from '@/lib/axios/axiosInstance';
import BlogDetail from '@/features/blog/components/BlogDetail';
import BlogCard from '@/features/blog/components/BlogCard';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Server-side fetch for SEO
async function getPost(slug, lang = 'en', country = 'IN') {
  try {
    const res = await fetch(`${API}/blog/posts/${slug}?lang=${lang}&country=${country}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch { return null; }
}

async function getRelated(categoryIds = [], excludeSlug = '', lang = 'en', country = 'IN') {
  if (!categoryIds.length) return [];
  try {
    const id = categoryIds[0];
    const res = await fetch(`${API}/blog/posts?category=${id}&lang=${lang}&country=${country}&limit=3`, {
      next: { revalidate: 300 },
    });
    const json = await res.json();
    return (json.data || []).filter(p => p.slug !== excludeSlug).slice(0, 3);
  } catch { return []; }
}

// Dynamic metadata for SEO
export async function generateMetadata({ params, searchParams }) {
  const lang    = searchParams?.lang    || 'en';
  const country = searchParams?.country || 'IN';
  const post    = await getPost(params.slug, lang, country);
  if (!post) return { title: 'Post not found' };

  const seo     = post.seo?.[lang] || post.seo?.en || {};
  const title   = seo.metaTitle    || post.title?.[lang] || post.title?.en || '';
  const desc    = seo.metaDescription || post.excerpt?.[lang] || post.excerpt?.en || '';
  const ogImg   = seo.ogImage || post.coverImage || '';

  return {
    title,
    description: desc,
    keywords:    seo.keywords?.join(', ') || '',
    openGraph: {
      title:       seo.ogTitle || title,
      description: seo.ogDescription || desc,
      images:      ogImg ? [{ url: ogImg }] : [],
      type:        'article',
      publishedTime: post.publishedAt,
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description: desc,
      images:      ogImg ? [ogImg] : [],
    },
    alternates: {
      canonical: seo.canonicalUrl || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/blog/${params.slug}`,
    },
  };
}

export default async function BlogPostPage({ params, searchParams }) {
  const lang    = searchParams?.lang    || 'en';
  const country = searchParams?.country || 'IN';
  const post    = await getPost(params.slug, lang, country);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
        <div className="text-5xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-[#26472B] mb-2">Article not found</h1>
        <p className="text-[#666] mb-6">This article may have been removed or the URL is incorrect.</p>
        <Link href="/blog" className="bg-[#45A735] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#3a9028] transition-colors">
          Back to Blog
        </Link>
      </div>
    );
  }

  const catIds  = (post.categoriesData || []).map(c => c.slug).filter(Boolean);
  const related = await getRelated(catIds, post.slug, lang, country);

  // JSON-LD structured data
  const jsonLd = {
    '@context':        'https://schema.org',
    '@type':           'BlogPosting',
    headline:          post.title?.[lang] || post.title?.en || '',
    description:       post.excerpt?.[lang] || post.excerpt?.en || '',
    image:             post.coverImage,
    datePublished:     post.publishedAt,
    dateModified:      post.updatedAt,
    author: {
      '@type': 'Person',
      name:    post.authorName || 'QuickHire Team',
    },
    publisher: {
      '@type': 'Organization',
      name:    'QuickHire Global',
      logo: {
        '@type': 'ImageObject',
        url:     `${process.env.NEXT_PUBLIC_SITE_URL || ''}/logo.png`,
      },
    },
    keywords: (post.seo?.[lang]?.keywords || post.seo?.en?.keywords || []).join(', '),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="min-h-screen bg-white">
        <BlogDetail post={post} lang={lang} />

        {/* Related articles */}
        {related.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 border-t border-[#E5F1E2]">
            <h2 className="text-2xl font-bold text-[#26472B] mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map(p => <BlogCard key={p._id} post={p} lang={lang} />)}
            </div>
          </section>
        )}

        {/* Back to blog */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
          <Link href="/blog" className="inline-flex items-center gap-2 text-[#45A735] font-semibold hover:underline">
            ← All Articles
          </Link>
        </div>
      </div>
    </>
  );
}
