<script lang="ts">
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import { mailToSupportHref, SHOP_URL } from '$lib/constants';
  import Socials from './Socials.svelte';
  import LanguageSelector from './LanguageSelector.svelte';
  import WtmgLogo from './UI/WTMGLogo.svelte';
  import PaddedSection from '@/routes/(marketing)/_components/PaddedSection.svelte';

  type Link = {
    title: string;
    link: string;
    target?: '_blank';
  };

  type Category = {
    title: string;
    links: Link[];
  };

  const categories: Category[] = [
    {
      title: 'Welcome To My Garen',
      links: [
        {
          title: 'Map',
          link: routes.MAP
        },
        {
          title: 'About us',
          link: routes.ABOUT_US
        },
        {
          title: 'Superfans',
          link: routes.ABOUT_SUPERFAN
        }
      ]
    },
    {
      title: 'Our projects',
      links: [
        {
          title: 'Secret Trips',
          // TODO: language specific redirect based on current language?
          link: 'https://slowby.travel',
          target: '_blank'
        },
        {
          title: 'Velotour Festival',
          link: 'https://velotourfestival.be/',
          target: '_blank'
        },
        {
          title: "Women Don't Cycle - The Film",
          // TODO extract url to constant? It's also in Manon's profile.
          link: 'https://womendontcycle.com/',
          target: '_blank'
        },
        {
          title: $_('generics.shop'),
          link: SHOP_URL,
          target: '_blank'
        }
      ]
    },
    {
      title: 'Learn more',
      links: [
        {
          title: 'Rules',
          link: routes.RULES
        },
        {
          title: 'FAQ',
          link: routes.FAQ
        },
        {
          title: 'Get in touch',
          link: mailToSupportHref
        }
      ]
    }
  ];
</script>

<PaddedSection is="footer" vertical backgroundColor="var(--color-beige-light)">
  <div class="wrapper">
    <div class="top">
      <div class="left">
        <WtmgLogo is="span" />
        <LanguageSelector />
        <div class="socials">
          <Socials small />
        </div>
      </div>
      <div class="right">
        {#each categories as { title: categoryTitle, links }}
          <ul class="category">
            <span class="title">
              {categoryTitle}
            </span>
            <ul class="links">
              {#each links as { title: linkTitle, link }}
                <li>
                  <a href={link} rel="noopener">{linkTitle}</a>
                </li>
              {/each}
            </ul>
          </ul>
        {/each}
      </div>
    </div>
    <div class="bottom">
      <p class="copyright">© Made with 💚 by Welcome To My Garden 2022. All rights reserved.</p>
      <ul class="terms">
        <li>
          <a href={routes.PRIVACY_POLICY}>{$_('generics.privacy-policy')}</a>
        </li>
        <li>
          <a href={routes.TERMS_OF_USE}>{$_('generics.terms-of-use')}</a>
        </li>
        <li>
          <a href={routes.COOKIE_POLICY}>{$_('generics.cookie-policy')}</a>
        </li>
      </ul>
    </div>
  </div>

  <!-- TODO move lang selector somewhere -->
  <!-- <LanguageSelector /> -->
</PaddedSection>

<style>
  :global(body) {
    --height-footer: 18rem;
  }
  .wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    /* box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1); */
  }

  .top {
    width: 100%;
    display: flex;
    justify-content: space-between;
    /* TODO better, reusable color variable */
    border-bottom: 1px solid grey;
    padding-bottom: 4rem;
  }

  .bottom {
    padding-top: 4rem;
    width: 100%;
    display: flex;
    justify-content: space-between;
  }

  .left {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
  }

  /* Override WTMG logo height */
  .left :global(.title) {
    height: 4rem;
  }

  .terms {
    display: flex;
    align-items: center;
  }

  .terms li {
    padding: 0 1rem;
    line-height: 1.4;
    font-size: 1.3rem;
    font-weight: 600;
    border-right: 1px solid var(--color-green);
  }

  .terms li:last-child {
    border-right: 0;
  }

  .copyright {
    font-weight: bold;
  }

  .socials {
    width: 25rem;
  }

  .right {
    display: flex;
    gap: 7rem;
  }

  .category > .title {
    display: inline-block;
    font-weight: bold;
    margin-bottom: 1rem;
  }

  .links {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  @media screen and (max-width: 700px) {
    /* Disable the footer on the map */
    :global(body footer) {
      display: none;
    }
    :global(body) {
      --footer-height: 0px;
    }
  }
</style>
