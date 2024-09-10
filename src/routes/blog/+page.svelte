<script lang="ts">
  export let data;
  const { posts } = data;
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
