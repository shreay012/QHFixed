import { NextResponse } from 'next/server';
import { blogFetchPosts } from '@/lib/blog/fetchBlog';

export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  try {
    const data = await blogFetchPosts(Object.fromEntries(searchParams));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 502 });
  }
}
