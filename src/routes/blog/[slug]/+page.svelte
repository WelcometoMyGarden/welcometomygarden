<script lang="ts">
  export let data;
  import './post.scss';
  const { title, content } = data;
</script>

<div class="post">
  <h1>{title.rendered}</h1>
  {@html content.rendered}
</div>

<style lang="scss">
  h1 {
    margin-bottom: 3rem;
  }
  .post {
    max-width: 800px;
    margin: 4rem auto 2rem auto;
  }

  .post :global(img) {
    margin: 1rem auto;
  }
</style>
