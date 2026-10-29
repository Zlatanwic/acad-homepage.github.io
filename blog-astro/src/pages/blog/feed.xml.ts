import { publishedPosts, postDate, postPath, href } from '../../lib/posts';

const escape = (value: unknown) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
export async function GET() {
  const origin = 'https://zlatanwic.github.io';
  const posts = (await publishedPosts()).slice(0, 20);
  const updated = posts.reduce((latest, post) => Math.max(latest, (post.data.last_modified_at || post.data.updatedDate || postDate(post)).getTime()), 0);
  const entries = posts.map(post => {
    const url = origin + href(postPath(post));
    const published = postDate(post).toISOString();
    const modified = (post.data.last_modified_at || post.data.updatedDate || postDate(post)).toISOString();
    const body = post.rendered?.html;
    return `<entry xml:lang="${escape(post.data.lang)}" xml:base="${escape(url)}"><title>${escape(post.data.title)}</title><link href="${escape(url)}"/><id>${escape(url)}</id><published>${published}</published><updated>${modified}</updated><summary>${escape(post.data.description || '')}</summary>${body ? `<content type="html">${escape(body)}</content>` : ''}${post.data.tags.map(tag => `<category term="${escape(tag)}"/>`).join('')}</entry>`;
  }).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Kuo Li — Blog</title><id>${origin}${href('/blog/')}</id><link href="${origin}${href('/blog/feed.xml')}" rel="self"/><link href="${origin}${href('/blog/')}"/><updated>${new Date(updated || Date.now()).toISOString()}</updated><author><name>Kuo Li</name></author>${entries}</feed>`, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } });
}
