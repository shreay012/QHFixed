import { NextResponse } from 'next/server';
import { blogFetchPost } from '@/lib/blog/fetchBlog';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url);
  const lang    = searchParams.get('lang')    || 'en';
  const country = searchParams.get('country') || 'IN';
  try {
    const data = await blogFetchPost(params.slug, lang, country);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 502 });
  }
}
