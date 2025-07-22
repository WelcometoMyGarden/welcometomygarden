<script>
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import Socials from './Socials.svelte';
  import LanguageSelector from './LanguageSelector.svelte';
</script>

<footer class="minimal-footer">
  <div class="socials">
    <Socials small />
  </div>
  <ul class="terms">
    <li>
      <a href={routes.COOKIE_POLICY}>{$_('generics.cookie-policy')}</a>
    </li>
    <li>
      <a href={routes.PRIVACY_POLICY}>{$_('generics.privacy-policy')}</a>
    </li>
    <li>
      <a href={routes.TERMS_OF_USE}>{$_('generics.terms-of-use')}</a>
    </li>
  </ul>
  <LanguageSelector />
</footer>

<style>
  /* Use CSS specificity to override the height */
  :global(div.app.active-explore) {
    --height-footer: 4.5rem;
  }

  /* Hide the footer on a fullscreen desktop map, too */
  :global(div.app.active-explore.fullscreen footer.minimal-footer) {
    display: none;
  }

  footer {
    height: var(--height-footer);
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0 1rem;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
  }

  .terms {
    display: flex;
    align-items: center;
  }

  .terms li {
    padding: 0 1rem;
    line-height: 1.4;
    font-size: 1.4rem;
    font-weight: 500;
    border-right: 1px solid var(--color-green);
  }

  .terms li:last-child {
    border-right: 0;
  }

  .socials {
    width: 20rem;
  }

  @media screen and (max-width: 850px) {
    .terms li {
      line-height: 1;
      text-align: center;
    }
  }

  @media screen and (max-width: 700px) {
    footer {
      display: none;
    }
  }
</style>
