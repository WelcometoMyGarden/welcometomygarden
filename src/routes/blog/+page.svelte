<script lang="ts">
  import { WTMG_BLOG_REST_BASE } from '$lib/constants';
  import { onMount } from 'svelte';

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

  let posts: Post[] = [];

  onMount(async () => {
    posts = (await fetch(
      `${WTMG_BLOG_REST_BASE}/posts?${new URLSearchParams({
        // all en categories
        categories: '11,23,30',
        // embeds require link info
        _fields: 'title,slug,date,_embedded,_links.author',
        _embed: 'author'
      })}`
    ).then((r) => r.json())) as Post[];
  });
</script>

<div class="wrapper">
  <h1>Blog posts</h1>
  <ul>
    {#each posts as { title, slug, date, _embedded }}
      <li>
        <a href="/blog/{slug}"><h2>{title.rendered}</h2></a>
        <div class="subline">
          {new Date(date).toLocaleString('en-GB', { dateStyle: 'medium' })} · by {(
            _embedded?.author || []
          )
            .map((a) => a.name)
            .join(', ')}
        </div>
      </li>
    {/each}
  </ul>
</div>

<style>
  .wrapper {
    max-width: 600px;
    margin: 4rem auto 2rem auto;
  }

  h1 {
    margin-bottom: 2rem;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  a {
    font-size: 2rem;
    font-weight: 500;
  }

  a:hover {
    text-decoration: underline;
  }

  .subline {
    font-size: 1.6rem;
  }
</style>
