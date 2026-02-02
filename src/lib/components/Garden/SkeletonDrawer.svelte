<script>
  import { Chip } from '../UI';
</script>

<section class="main">
  <header>
    <div class="skeleton mb-l skeleton-name"></div>
    <div class="skeleton skeleton-photo"></div>
  </header>
  <div>
    <div class="description">
      <div class="skeleton skeleton-description"></div>
      <div class="skeleton skeleton-description"></div>
      <div class="skeleton skeleton-description"></div>
    </div>
    <div class="chips-container skeleton-chips">
      <Chip isSkeleton />
      <Chip isSkeleton />
      <Chip isSkeleton />
      <Chip isSkeleton />
      <Chip isSkeleton />
      <Chip isSkeleton />
    </div>
  </div>
  <footer class="skeleton footer mt-ms skeleton-cta"></footer>
</section>

<style>
  .main {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    position: relative;
    overflow: hidden;
    height: 40rem;
    /* Compensate for the parent drawer not having a bottom padding */
    padding-bottom: 3rem;
  }

  header {
    display: flex;
    flex-direction: column;
    margin-bottom: 1.5rem;
  }

  .skeleton-photo {
    width: 7.5rem;
    height: 7.5rem;
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
  .skeleton-chips {
    margin-top: 1rem;
    margin-bottom: 2rem;
    padding: 0 1rem;
  }
  .skeleton-cta {
    height: 5rem;
    width: 100%;
    align-self: center;
  }

  .description {
    max-width: 45rem;
    word-wrap: break-word;
  }

  .chips-container {
    display: flex;
    flex-wrap: wrap;
    gap: 1.1rem;
    row-gap: 1.1rem;
  }

  @media screen and (max-width: 700px) {
    .main {
      height: 35rem;
    }

    header {
      flex-direction: column;
      align-items: flex-start;
      justify-content: space-between;
      gap: 2rem;
      margin-bottom: 2rem;
    }
  }
</style>
