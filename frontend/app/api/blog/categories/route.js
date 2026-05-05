import { NextResponse } from 'next/server';
import { blogFetchCategories } from '@/lib/blog/fetchBlog';

export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'en';
  try {
    const data = await blogFetchCategories(lang);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 502 });
  }
}
