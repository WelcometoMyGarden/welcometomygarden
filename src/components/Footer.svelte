<script>
  import routes from '@/routes';
  import Socials from './Socials.svelte';
</script>

<footer>
  <div class="socials">
    <Socials />
  </div>
  <ul class="terms">
    <li>
      <a href={routes.COOKIE_POLICY}>Cookie policy</a>
    </li>
    <li>
      <a href={routes.PRIVACY_POLICY}>Privacy policy</a>
    </li>
    <li>
      <a href={routes.TERMS_OF_USE}>Terms of use</a>
    </li>
  </ul>
</footer>

<style>
  footer {
    height: var(--height-footer);
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
    padding: 4rem 0;
  }

  .terms {
    margin-top: 3rem;
    display: flex;
    align-items: center;
  }

  .terms li {
    padding: 0 1rem;
    line-height: 1.4;
    font-size: 1.4rem;
    font-weight: 600;
    border-right: 1px solid var(--color-green);
  }

  .terms li:last-child {
    border-right: 0;
  }

  @media screen and (max-width: 700px) {
    footer {
      display: none;
    }
  }
</style>
