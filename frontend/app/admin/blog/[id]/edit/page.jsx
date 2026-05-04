'use client';
import BlogPostEditor from '@/features/blog/components/BlogPostEditor';
export default function EditBlogPostPage({ params }) {
  return <BlogPostEditor postId={params.id} />;
}
