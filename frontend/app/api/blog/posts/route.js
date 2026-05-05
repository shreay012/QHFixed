import { NextResponse } from 'next/server';
import { getDb } from '@/lib/blog/mongoClient';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang     = searchParams.get('lang')     || 'en';
  const country  = searchParams.get('country')  || '';
  const category = searchParams.get('category') || '';
  const tag      = searchParams.get('tag')      || '';
  const search   = searchParams.get('search')   || '';
  const page     = Math.max(1, Number(searchParams.get('page'))  || 1);
  const limit    = Math.min(50, Number(searchParams.get('limit')) || 9);
  const skip     = (page - 1) * limit;

  try {
    const db    = await getDb();
    const posts = db.collection('blog_posts');
    const cats  = db.collection('blog_categories');

    const filter = { status: 'published' };
    if (tag)    filter.tags = tag;
    if (search) {
      const rx = new RegExp(search.substring(0, 100), 'i');
      filter.$or = [{ [`title.${lang}`]: rx }, { [`excerpt.${lang}`]: rx }, { tags: rx }];
    }
    if (category) {
      const cat = await cats.findOne({ slug: category, active: true });
      if (cat) filter.categories = String(cat._id);
    }

    const bodyExclude = { 'body.en': 0, 'body.hi': 0, 'body.ar': 0, 'body.de': 0 };

    const [raw, total] = await Promise.all([
      posts.find(filter).project(bodyExclude).sort({ featured: -1, publishedAt: -1 }).skip(skip).limit(limit).toArray(),
      posts.countDocuments(filter),
    ]);

    // Populate categories
    const catIds = [...new Set(raw.flatMap(p => p.categories || []))];
    let catMap = {};
    if (catIds.length) {
      const objIds = catIds.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean);
      const catDocs = await cats.find({ _id: { $in: objIds } }).toArray();
      catMap = Object.fromEntries(catDocs.map(c => [String(c._id), c]));
    }

    const data = raw.map(p => ({
      ...p,
      _id: String(p._id),
      coverImage: (country && p.coverImageByCountry?.[country]) || p.coverImage || '',
      categoriesData: (p.categories || []).map(id => catMap[id]).filter(Boolean),
    }));

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({
      success: true,
      data,
      meta: { page, pageSize: limit, total, totalPages },
    });
  } catch (e) {
    console.error('[blog/posts]', e.message);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
