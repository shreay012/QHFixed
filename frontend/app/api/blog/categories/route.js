import { NextResponse } from 'next/server';
import { getDb } from '@/lib/blog/mongoClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'en';
  try {
    const db   = await getDb();
    const data = await db.collection('blog_categories')
      .find({ active: true })
      .sort({ order: 1, 'name.en': 1 })
      .toArray();
    return NextResponse.json({ success: true, data: data.map(c => ({ ...c, _id: String(c._id) })) });
  } catch (e) {
    console.error('[blog/categories]', e.message);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
