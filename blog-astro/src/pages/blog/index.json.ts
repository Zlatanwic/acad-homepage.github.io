import { publishedPosts, postDate, postPath } from '../../lib/posts';

export async function GET() {
  const posts = await publishedPosts();
  return new Response(JSON.stringify(posts.map(post => ({
    title: post.data.title,
    description: post.data.description || '',
    date: postDate(post).toISOString(),
    url: postPath(post)
  }))), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
