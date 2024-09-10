import { WTMG_BLOG_REST_BASE } from '$lib/constants';

type Post = {
  id: string;
  title: { rendered: string };
  date: string;
  /** author id */
  author: string;
  slug: string;
  _embedded: {
    author: {
      name: string;
    }[];
  };
};
export const load = async () => {
  const posts = (await fetch(
    `${WTMG_BLOG_REST_BASE}/posts?${new URLSearchParams({
      // all en categories
      categories: '11,23,30',
      // embeds require link info
      _fields: 'title,slug,date,_embedded,_links.author',
      _embed: 'author'
    })}`
  ).then((r) => r.json())) as Post[];
  return { posts };
};
