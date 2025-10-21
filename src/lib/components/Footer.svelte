<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import routes from '$lib/routes';
  import {
    SHOP_URL,
    STP_TITLE,
    STP_URL,
    WTMG_BLOG_BASE_URL,
    WTMG_UTM_SOURCE,
    mailToSupportHref
  } from '$lib/constants';
  import Socials from './Socials.svelte';
  import LanguageSelector from './LanguageSelector.svelte';
  import WtmgLogo from './UI/WTMGLogo.svelte';
  import { user } from '$lib/stores/auth';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import createUrl from '$lib/util/create-url';
  import { coerceToMainLanguage, coerceToMainLanguageENBlank } from '$lib/util/get-browser-lang';
  import PaddedSection from './Marketing/PaddedSection.svelte';
  import { lr } from '$lib/util/translation-helpers';

  const wtmgSignURLParams = new URLSearchParams({
    ...($user
      ? {
          // More fields could be prefilled too https://tally.so/help/pre-populate-form-fields#d145bec3bde2446b8ae17a4357494950
          wtmg: $user.id
        }
      : {}),
    ref: 'wtmg_footer'
  });

  type Link = {
    title: string;
    link: string;
    target?: '_blank';
    track?: Parameters<typeof trackEvent>;
  };

  type Category = {
    title: string;
    links: Link[];
  };

  let categories: Category[];
  $: categories = [
    {
      title: $_('generics.wtmg.acronym'),
      links: [
        {
          title: $_('generics.map'),
          link: $lr(routes.MAP)
        },
        {
          title: $_('generics.about-us'),
          link: $lr(routes.ABOUT_US)
        },
        {
          title: $_('generics.membership'),
          link: $lr(routes.ABOUT_MEMBERSHIP),
          track: [PlausibleEvent.VISIT_ABOUT_MEMBERSHIP, { source: 'footer' }]
        },
        {
          title: $_('footer.links.wtmg-sign.title'),
          link: `${SHOP_URL}${coerceToMainLanguageENBlank(
            $locale ?? undefined
          )}?${wtmgSignURLParams.toString()}`,
          target: '_blank'
        }
      ]
    },
    {
      title: $_('footer.link-category-titles.our-projects'),
      links: [
        {
          title: $_('footer.links.route-planner.title'),
          link: $lr(routes.ROUTE_PLANNER),
          target: '_blank'
        },
        {
          title: STP_TITLE,
          link: createUrl(`${STP_URL}/${coerceToMainLanguage($locale ?? undefined)}`, {
            utm_source: WTMG_UTM_SOURCE,
            utm_medium: 'web',
            utm_content: 'footer'
          }),
          target: '_blank'
        },
        {
          title: $_('footer.links.velotour.title'),
          link: $_('footer.links.velotour.url'),
          target: '_blank'
        },
        {
          title: $_('footer.links.women-dont-cycle.title'),
          link: $_('footer.links.women-dont-cycle.url'),
          target: '_blank'
        }
      ]
    },
    {
      title: $_('footer.link-category-titles.learn-more'),
      links: [
        {
          title: $_('generics.rules'),
          link: $lr(routes.RULES),
          track: [PlausibleEvent.VISIT_RULES, { source: 'footer' }]
        },
        {
          title: $_('generics.faq.acronym'),
          link: $lr(routes.FAQ)
        },
        {
          title: 'Updates',
          // Note: there is also /category/updates; but for now all blog posts can be considered updates.
          // And we don't want to give it the empty name "Blog".
          link: createUrl(WTMG_BLOG_BASE_URL, {
            utm_source: 'welcometomygarden.org',
            utm_medium: 'web',
            utm_content: 'footer'
          }),
          target: '_blank'
        },
        {
          title: $_('footer.links.get-in-touch'),
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
        <div class="language-selector"><LanguageSelector /></div>
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
              {#each links as { title: linkTitle, link, target, track: trackParams }}
                <li>
                  <a
                    href={link}
                    on:click={() => (trackParams ? trackEvent.apply(null, trackParams) : undefined)}
                    rel="noopener"
                    {target}>{linkTitle}</a
                  >
                </li>
              {/each}
            </ul>
          </ul>
        {/each}
      </div>
    </div>
    <div class="bottom">
      <p class="copyright">
        {@html $_('footer.copyright', {
          values: {
            year: new Date().getFullYear().toString()
          }
        })}
      </p>
      <ul class="terms">
        <li>
          <a href={$lr(routes.PRIVACY_POLICY)}>{$_('generics.privacy-policy')}</a>
        </li>
        <li>
          <a href={$lr(routes.TERMS_OF_USE)}>{$_('generics.terms-of-use')}</a>
        </li>
        <li>
          <a href={$lr(routes.COOKIE_POLICY)}>{$_('generics.cookie-policy')}</a>
        </li>
      </ul>
    </div>
  </div>
</PaddedSection>

<style>
  :global(body) {
    --height-footer: 18rem;
  }

  :global(footer) {
    /* Grows the footer in case the <main> content is smaller than the viewport height,
      dependent on the .app wrapper having `display: flexbox` */
    flex-grow: 1;
  }
  .wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    overflow: hidden;
    /* box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1); */
  }

  .top {
    width: 100%;
    display: flex;
    justify-content: space-between;
    /* TODO better, reusable color variable */
    border-bottom: 1px solid grey;
    padding-bottom: 4rem;
    gap: 2rem;
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
    flex: 1 2;
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
    font-weight: 500;
    border-right: 1px solid var(--color-green);
  }

  .terms li:last-child {
    border-right: 0;
  }

  .copyright {
    font-size: 1.3rem;
    font-weight: 500;
  }

  .socials {
    width: 12rem;
  }

  .socials :global(ul.socials) {
    justify-content: space-between;
  }

  .right {
    display: flex;
    flex: 1 1;
    gap: 7rem;
  }

  .category > .title {
    display: inline-block;
    font-weight: 600;
    line-height: 130%;
    margin-bottom: 1rem;
    min-width: 14rem;
  }

  .links {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .links > li {
    line-height: 1.3;
  }

  @media screen and (max-width: 1050px) {
    .copyright {
      max-width: 42vw;
    }
  }

  @media screen and (max-width: 900px) {
    .category > .title {
      min-width: 10rem;
    }

    .top {
      gap: 0.5rem;
    }

    .socials {
      width: 16rem;
    }
  }

  @media screen and (max-width: 767px) {
    .right {
      gap: 5rem;
    }
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
