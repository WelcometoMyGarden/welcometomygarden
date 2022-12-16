<script>
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import { SHOP_URL } from '$lib/constants';
  import Socials from './Socials.svelte';
  import LanguageSelector from './LanguageSelector.svelte';
</script>

<footer>
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
    <li>
      <a href={SHOP_URL} target="_blank">{$_('generics.shop')}</a>
    </li>
  </ul>
  <LanguageSelector />
</footer>

<style>
  /* Use CSS specificity to override the height */
  :global(div.app.active-explore) {
    --height-footer: 4.5rem;
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
    font-weight: 600;
    border-right: 1px solid var(--color-green);
  }

  .terms li:last-child {
    border-right: 0;
  }

  .socials {
    width: 25rem;
  }

  @media screen and (max-width: 700px) {
    footer {
      display: none;
    }
  }
</style>
