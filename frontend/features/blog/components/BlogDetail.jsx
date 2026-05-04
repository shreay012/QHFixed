'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return ''; }
}

function ShareButtons({ title, url }) {
  const encoded = encodeURIComponent(url);
  const titleEnc = encodeURIComponent(title);

  const copy = () => { navigator.clipboard?.writeText(url); };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[#666] font-medium">Share:</span>
      <a href={`https://twitter.com/intent/tweet?text=${titleEnc}&url=${encoded}`} target="_blank" rel="noopener noreferrer"
         className="p-2 rounded-lg border border-[#E5E5E5] hover:bg-[#F8FCF7] hover:border-[#45A735] transition-colors text-[#444]" title="Twitter/X">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`} target="_blank" rel="noopener noreferrer"
         className="p-2 rounded-lg border border-[#E5E5E5] hover:bg-[#F8FCF7] hover:border-[#45A735] transition-colors text-[#0077b5]" title="LinkedIn">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
      </a>
      <button onClick={copy}
         className="p-2 rounded-lg border border-[#E5E5E5] hover:bg-[#F8FCF7] hover:border-[#45A735] transition-colors text-[#444]" title="Copy link">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
    </div>
  );
}

export default function BlogDetail({ post, lang = 'en', basePath = '/industry-perspectives' }) {
  const title    = post.title?.[lang]   || post.title?.en   || '';
  const body     = post.body?.[lang]    || post.body?.en    || '';
  const excerpt  = post.excerpt?.[lang] || post.excerpt?.en || '';
  const cover    = post.coverImage || '';
  const cats     = post.categoriesData || [];
  const seo      = post.seo?.[lang]    || post.seo?.en     || {};
  const url      = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Category badges */}
      {cats.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {cats.map(c => (
            <Link key={c._id} href={`${basePath}/category/${c.slug}`}
                  className="inline-block bg-[#F2F9F1] text-[#45A735] text-xs font-semibold px-3 py-1 rounded-full border border-[#C5E0BF] hover:bg-[#45A735] hover:text-white transition-colors">
              {c.name?.[lang] || c.name?.en}
            </Link>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold text-[#1a2e1a] leading-tight mb-4">{title}</h1>

      {/* Excerpt */}
      {excerpt && <p className="text-lg text-[#555] leading-relaxed mb-6">{excerpt}</p>}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-[#777] mb-8 pb-6 border-b border-[#E5F1E2]">
        <div className="flex items-center gap-2">
          {post.authorAvatar && (
            <Image src={post.authorAvatar} alt={post.authorName || ''} width={32} height={32} className="rounded-full object-cover" />
          )}
          <span className="font-medium text-[#333]">{post.authorName || 'QuickHire Team'}</span>
        </div>
        {post.publishedAt && (
          <span>{fmtDate(post.publishedAt)}</span>
        )}
        <span>{post.readingTimeMinutes ?? 1} min read</span>
        {post.viewCount > 0 && <span>{post.viewCount} views</span>}
        <div className="ml-auto">
          <ShareButtons title={title} url={url} />
        </div>
      </div>

      {/* Cover image */}
      {cover && (
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-10 shadow-md">
          <Image src={cover} alt={title} fill className="object-cover" sizes="(max-width:1024px) 100vw,896px" priority />
        </div>
      )}

      {/* Body HTML from TipTap */}
      <div
        className="prose prose-lg max-w-none prose-headings:text-[#1a2e1a] prose-a:text-[#45A735] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-blockquote:border-[#45A735] prose-blockquote:text-[#444]"
        dangerouslySetInnerHTML={{ __html: body }}
      />

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-[#E5F1E2]">
          <span className="text-sm text-[#666] font-medium mr-1">Tags:</span>
          {post.tags.map(tag => (
            <Link key={tag} href={`${basePath}?tag=${encodeURIComponent(tag)}`}
                  className="text-xs px-3 py-1 rounded-full bg-[#F2F9F1] text-[#45A735] border border-[#C5E0BF] hover:bg-[#45A735] hover:text-white transition-colors">
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Bottom share */}
      <div className="mt-8 pt-6 border-t border-[#E5F1E2]">
        <ShareButtons title={title} url={url} />
      </div>
    </article>
  );
}
