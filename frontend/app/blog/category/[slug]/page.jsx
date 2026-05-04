import Link from 'next/link';
import BlogCard from '@/features/blog/components/BlogCard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getCategoryAndPosts(slug, lang = 'en', country = 'IN', page = 1) {
  const [catsRes, postsRes] = await Promise.allSettled([
    fetch(`${API}/blog/categories?lang=${lang}`, { next: { revalidate: 600 } }),
    fetch(`${API}/blog/posts?category=${slug}&lang=${lang}&country=${country}&page=${page}&limit=12`, { next: { revalidate: 300 } }),
  ]);
  const cats  = catsRes.status === 'fulfilled'  ? (await catsRes.value.json()).data  || [] : [];
  const posts = postsRes.status === 'fulfilled' ? (await postsRes.value.json()) : { data: [], meta: null };
  const cat   = cats.find(c => c.slug === slug) || null;
  return { cat, posts: posts.data || [], meta: posts.meta || null, cats };
}

export async function generateMetadata({ params, searchParams }) {
  const lang    = searchParams?.lang    || 'en';
  const country = searchParams?.country || 'IN';
  const { cat } = await getCategoryAndPosts(params.slug, lang, country);
  const name    = cat?.name?.[lang] || cat?.name?.en || params.slug;
  return {
    title:       `${name} — QuickHire Blog`,
    description: cat?.description?.[lang] || cat?.description?.en || `Articles in ${name}`,
  };
}

export default async function BlogCategoryPage({ params, searchParams }) {
  const lang    = searchParams?.lang    || 'en';
  const country = searchParams?.country || 'IN';
  const pg      = Number(searchParams?.page || 1);
  const { cat, posts, meta, cats } = await getCategoryAndPosts(params.slug, lang, country, pg);

  const catName = cat?.name?.[lang] || cat?.name?.en || params.slug;
  const catDesc = cat?.description?.[lang] || cat?.description?.en || '';

  return (
    <div className="min-h-screen bg-[#F8FCF7]">
      {/* Header */}
      <section className="bg-gradient-to-br from-[#26472B] to-[#1a3020] py-12 px-4 text-white text-center">
        <nav className="flex items-center justify-center gap-2 text-sm text-white/60 mb-4">
          <Link href="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-white">Blog</Link>
          <span>/</span>
          <span className="text-white">{catName}</span>
        </nav>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{catName}</h1>
        {catDesc && <p className="text-white/70 text-base max-w-xl mx-auto">{catDesc}</p>}
        {meta && <p className="text-white/50 text-sm mt-3">{meta.total} article{meta.total !== 1 ? 's' : ''}</p>}
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col lg:flex-row gap-8">
        <main className="flex-1 min-w-0">
          {posts.length === 0 ? (
            <div className="text-center py-20 text-[#888]">
              <div className="text-5xl mb-4">📂</div>
              <p className="text-lg font-medium text-[#444]">No articles in this category yet</p>
              <Link href="/blog" className="mt-4 inline-block text-[#45A735] hover:underline">Browse all articles</Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {posts.map(post => <BlogCard key={post._id} post={post} lang={lang} />)}
              </div>
              {meta && meta.totalPages > 1 && (
                <div className="flex justify-center gap-3 mt-10">
                  {pg > 1 && (
                    <Link href={`/blog/category/${params.slug}?page=${pg - 1}`} className="px-4 py-2 rounded-lg border border-[#D0E8CB] text-sm hover:bg-[#F2F9F1]">← Prev</Link>
                  )}
                  <span className="px-4 py-2 text-sm text-[#666]">Page {pg} of {meta.totalPages}</span>
                  {pg < meta.totalPages && (
                    <Link href={`/blog/category/${params.slug}?page=${pg + 1}`} className="px-4 py-2 rounded-lg border border-[#D0E8CB] text-sm hover:bg-[#F2F9F1]">Next →</Link>
                  )}
                </div>
              )}
            </>
          )}
        </main>

        {/* Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-[#E5F1E2] p-5">
            <h3 className="font-bold text-[#26472B] mb-4">All Categories</h3>
            <ul className="space-y-1">
              <li>
                <Link href="/blog" className="block text-sm px-3 py-2 rounded-lg hover:bg-[#F2F9F1] text-[#333]">All Articles</Link>
              </li>
              {cats.map(c => (
                <li key={c._id}>
                  <Link href={`/blog/category/${c.slug}`}
                        className={`block text-sm px-3 py-2 rounded-lg transition-colors ${c.slug === params.slug ? 'bg-[#45A735] text-white font-medium' : 'hover:bg-[#F2F9F1] text-[#333]'}`}>
                    {c.name?.[lang] || c.name?.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
