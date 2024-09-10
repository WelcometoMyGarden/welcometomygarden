import { WTMG_BLOG_REST_BASE } from '$lib/constants';

export const load = async ({ params: { slug } }) => {
  const [post] = (await fetch(
    `${WTMG_BLOG_REST_BASE}/posts?${new URLSearchParams({
      slug
    })}`
  ).then((r) => r.json())) as { title: { rendered: string }; content: { rendered: string } }[];
  return post;
};

export const entries = async () => {
  const posts = (await fetch(
    `${WTMG_BLOG_REST_BASE}/posts?${new URLSearchParams({
      _fields: 'slug'
    })}`
  ).then((r) => r.json())) as { slug: string; content: { rendered: string; protected: boolean } }[];

  return posts;
};
