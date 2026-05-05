import { NextResponse } from 'next/server';
import { getDb } from '@/lib/blog/mongoClient';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const lang    = searchParams.get('lang')    || 'en';
  const country = searchParams.get('country') || '';

  try {
    const db   = await getDb();
    const post = await db.collection('blog_posts').findOne({ slug, status: 'published' });
    if (!post) return NextResponse.json({ success: false }, { status: 404 });

    const catIds  = (post.categories || []).map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean);
    const catDocs = catIds.length ? await db.collection('blog_categories').find({ _id: { $in: catIds } }).toArray() : [];

    // fire-and-forget view count
    db.collection('blog_posts').updateOne({ slug }, { $inc: { viewCount: 1 } }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        ...post,
        _id: String(post._id),
        coverImage: (country && post.coverImageByCountry?.[country]) || post.coverImage || '',
        categoriesData: catDocs,
      },
    });
  } catch (e) {
    console.error('[blog/posts/slug]', e.message);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
