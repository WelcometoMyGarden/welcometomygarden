<script>
  import { Badge } from '../UI';
</script>

<section class="main">
  <div class="skeleton mb-l skeleton-name" />
  <div class="skeleton skeleton-photo" />
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
  <div class="skeleton footer mt-ms skeleton-cta" />
</section>

<style>
  .main {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  @media screen and (min-width: 700px) {
    .main {
      min-height: 30rem;
    }
  }
  .skeleton-name {
    width: 100%;
    height: 3rem;
  }
  .skeleton-photo {
    width: 6rem;
    height: 6rem;
    margin-bottom: 2rem;
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
    margin-top: auto;
  }
</style>
