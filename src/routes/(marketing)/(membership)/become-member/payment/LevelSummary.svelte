<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import MarketingBlock from '$routes/(marketing)/_components/MarketingBlock.svelte';
  import type { SuperfanLevelData } from '$routes/(marketing)/_static/superfan-levels';
  import { checkIcon } from '$lib/images/icons';
  import { getNodeArray } from '$lib/util/get-node-children';
  import { Icon } from '$lib/components/UI';

  export let level: SuperfanLevelData;

  // TODO: base this on actual Stripe data, not self-calculated
  const now = new Date();
  const oneYearMs = 365 * 24 * 3600 * 1000;
  const periodEnd = new Date(now.getTime() + oneYearMs);

  const formatDate = (locale: string, date: Date) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date);
</script>

<MarketingBlock backgroundColor="var(--color-beige-light)"
  ><div class="wrapper">
    <div class="icon">
      <!-- TODO: localize alt -->
      <img src="images/logo-emblem.svg" alt="The WTMG Logo" />
    </div>
    <div class="summary-wrapper">
      <h1 class="mh3">
        {$_(`payment-superfan.overview-section.product.${level.slug}`)} · {$_(
          'payment-superfan.overview-section.duration'
        )}
      </h1>
      <p class="price">€{level.value * 12}</p>
      <div class="period">
        <span class="from">{formatDate($locale ?? 'en', now)}</span>
        <span class="to"><span class="arrow">→</span> {formatDate($locale ?? 'en', periodEnd)}</span
        >
      </div>
      <ul class="features checklist">
        <!-- TODO TEST INSERT $LOCALE not hardcoded 'en' -->
        {#each getNodeArray('payment-superfan.overview-section.features', 'en') as feature}
          <li><Icon icon={checkIcon} /><span>{feature}</span></li>
        {/each}
      </ul>
    </div>
  </div>
</MarketingBlock>

<style>
  .wrapper {
    width: 100%;
    display: flex;
    gap: 2rem;
  }

  h1,
  .features {
    margin-bottom: 0;
    line-height: 1.6;
  }

  .summary-wrapper > .price {
    font-family: var(--fonts-copy);
    font-size: 3rem;
    font-weight: 500;
    margin: 2rem 0;
  }

  .summary-wrapper {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
  }

  .period {
    margin-bottom: 2rem;
  }

  .from,
  .arrow {
    margin-right: 0.5rem;
    line-height: 1.6;
  }

  .checklist {
    display: grid;
    grid-template-columns: auto auto;
    gap: 1rem;
    max-width: 530px;
  }

  .checklist > li :global(i svg g path) {
    fill: #19ae13;
  }

  .checklist > li {
    display: flex;
    align-items: center;
    gap: 1.2rem;
  }

  .checklist > li :global(i) {
    display: block;
    width: 2rem;
    height: 2rem;
  }

  @media screen and (max-width: 900px) {
    .icon {
      display: none;
    }
  }

  @media screen and (max-width: 700px) {
    .summary-wrapper {
      text-align: center;
    }

    .checklist {
      margin: auto;
    }
  }

  @media screen and (max-width: 500px) {
    /* Collapse onto a new line */
    .to {
      display: block;
    }

    .arrow {
      margin-left: 0;
    }

    .checklist {
      grid-template-columns: auto;
      gap: 0.5rem;
    }
  }
</style>
