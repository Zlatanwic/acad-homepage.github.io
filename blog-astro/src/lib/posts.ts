import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');

// Keep the dated URLs already documented for the Jekyll blog.
export function postDate(post: Post): Date {
  const fromName = post.id.match(/^(\d{4})-(\d{2})-(\d{2})-/);
  const date = post.data.date || post.data.pubDate || (fromName ? new Date(`${fromName[1]}-${fromName[2]}-${fromName[3]}T00:00:00+08:00`) : undefined);
  if (!date || Number.isNaN(date.valueOf())) throw new Error(`Post ${post.id} needs a date in its filename or front matter.`);
  return date;
}

export function postPath(post: Post): string {
  const match = post.id.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
  const slug = match ? match[1] : post.id;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(postDate(post));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `/blog/${get('year')}/${get('month')}/${get('day')}/${slug}/`;
}

export function href(path: string): string { return `${base}${path}`; }
export function displayDate(date: Date, options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', ...options }).format(date);
}
export function readingTime(body = ''): number {
  const text = body.replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]+>/g, ' ');
  const words = (text.match(/[\p{Script=Han}]/gu) || []).length / 400 + (text.match(/[\p{L}\p{N}]+/gu) || []).filter(word => !/[\p{Script=Han}]/u.test(word)).length / 220;
  return Math.max(1, Math.ceil(words));
}
export async function publishedPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => data.published !== false);
  return posts.filter(post => postDate(post).getTime() <= Date.now()).sort((a, b) => postDate(b).getTime() - postDate(a).getTime());
}
