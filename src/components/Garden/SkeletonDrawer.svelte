<script>
  import { Badge } from '../UI';
</script>

<section class="main">
  <header>
    <div class="skeleton mb-l skeleton-name" />
    <div class="skeleton skeleton-photo" />
  </header>
  <div>
    <div class="description">
      <div class="skeleton skeleton-description" />
      <div class="skeleton skeleton-description" />
      <div class="skeleton skeleton-description" />
    </div>
    <div class="badges-container skeleton-badges">
      <Badge isSkeleton />
      <Badge isSkeleton />
      <Badge isSkeleton />
      <Badge isSkeleton />
      <Badge isSkeleton />
      <Badge isSkeleton />
    </div>
  </div>
  <footer class="skeleton footer mt-ms skeleton-cta" />
</section>

<style>
  .main {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    position: relative;
    overflow: hidden;
    height: 40rem;
  }

  header {
    display: flex;
    flex-direction: column;
    margin-bottom: 1.5rem;
  }

  .skeleton-photo {
    width: 6rem;
    height: 6rem;
  }

  @media screen and (max-width: 700px) {
    .main {
      height: 35rem;
    }

    header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
    }
  }

  .skeleton-name {
    width: 75%;
    height: 3rem;
  }
  .skeleton-description {
    height: 2rem;
    width: 100%;
    margin-bottom: 0.8rem;
  }
  .skeleton-badges {
    margin-top: 1rem;
    margin-bottom: 2rem;
    padding: 0 1rem;
  }
  .skeleton-cta {
    height: 5rem;
    width: 12rem;
    align-self: center;
  }

  .description {
    max-width: 45rem;
    word-wrap: break-word;
  }

  .badges-container {
    display: flex;
    flex-wrap: wrap;
    /* Negative margin compensate the Badge components margins */
    margin-left: calc(0.8rem * -1);
  }
</style>
