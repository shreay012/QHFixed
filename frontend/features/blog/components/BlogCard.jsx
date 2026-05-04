import Link from 'next/link';
import Image from 'next/image';

function readingLabel(mins) {
  return `${mins ?? 1} min read`;
}

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export default function BlogCard({ post, lang = 'en', variant = 'default', basePath = '/industry-perspectives' }) {
  const title   = post.title?.[lang]   || post.title?.en   || 'Untitled';
  const excerpt = post.excerpt?.[lang] || post.excerpt?.en || '';
  const cover   = post.coverImage || '/images/blog-placeholder.png';
  const cats    = post.categoriesData || [];
  const date    = post.publishedAt;
  const slug    = post.slug;

  if (variant === 'featured') {
    return (
      <Link href={`${basePath}/${slug}`} className="group block relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow bg-[#26472B]">
        <div className="relative aspect-[16/9]">
          <Image src={cover} alt={title} fill className="object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" sizes="(max-width:768px) 100vw,60vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d2211] via-[#0d221188] to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            {cats.length > 0 && (
              <span className="inline-block bg-[#45A735] text-white text-xs font-semibold px-3 py-0.5 rounded-full mb-3">
                {cats[0].name?.[lang] || cats[0].name?.en}
              </span>
            )}
            <h2 className="text-2xl font-bold leading-tight mb-2 line-clamp-2">{title}</h2>
            {excerpt && <p className="text-sm text-white/80 line-clamp-2 mb-3">{excerpt}</p>}
            <div className="flex items-center gap-3 text-white/60 text-xs">
              {date && <span>{fmtDate(date)}</span>}
              <span>·</span>
              <span>{readingLabel(post.readingTimeMinutes)}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`${basePath}/${slug}`} className="group flex flex-col rounded-xl border border-[#E5F1E2] bg-white hover:border-[#45A735] hover:shadow-md transition-all overflow-hidden">
      {/* Cover image */}
      <div className="relative aspect-[16/9] bg-[#F2F9F1] overflow-hidden">
        <Image src={cover} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw" />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {cats.length > 0 && (
          <span className="inline-block self-start bg-[#F2F9F1] text-[#45A735] text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2 border border-[#C5E0BF]">
            {cats[0].name?.[lang] || cats[0].name?.en}
          </span>
        )}
        <h3 className="text-[#1a2e1a] font-bold text-base leading-snug mb-2 line-clamp-2 group-hover:text-[#45A735] transition-colors">
          {title}
        </h3>
        {excerpt && (
          <p className="text-[#5a5a5a] text-sm leading-relaxed mb-4 line-clamp-3 flex-1">{excerpt}</p>
        )}

        {/* Meta footer */}
        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-[#F2F9F1]">
          {post.authorAvatar && (
            <Image src={post.authorAvatar} alt={post.authorName || ''} width={24} height={24} className="rounded-full object-cover" />
          )}
          <span className="text-xs text-[#777] font-medium">{post.authorName || 'QuickHire Team'}</span>
          <span className="text-[#ccc] text-xs ml-auto">{date ? fmtDate(date) : ''}</span>
          <span className="text-[#ccc] text-xs">·</span>
          <span className="text-[#888] text-xs">{readingLabel(post.readingTimeMinutes)}</span>
        </div>
      </div>
    </Link>
  );
}
