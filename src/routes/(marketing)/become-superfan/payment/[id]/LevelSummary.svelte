<script lang="ts">
  import { _ } from 'svelte-i18n';
  import MarketingBlock from '$routes/(marketing)/_components/MarketingBlock.svelte';
  import type { SuperfanLevelData } from '$routes/(marketing)/_static/superfan-levels';

  export let level: SuperfanLevelData;

  // TODO: base this on actual Stripe data, not self-calculated
  const now = new Date();
  const oneYearMs = 365 * 24 * 3600 * 1000;
  const periodEnd = new Date(now.getTime() + oneYearMs);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date);
</script>

<MarketingBlock backgroundColor="var(--color-beige-light)"
  ><div class="wrapper">
    <div class="icon">
      <!-- TODO: localize alt -->
      <img src="images/logo-emblem.svg" alt="The WTMG Logo" />
    </div>
    <div class="summary-wrapper">
      <h1 class="mh2">
        {$_('generics.wtmg.acronym')}
        {$_('generics.superfan')} · {$_('payment-superfan.overview-section.duration')}
      </h1>
      <div class="price mh3">€{level.value * 12}</div>
      <div class="period">
        <span class="from">{formatDate(now)}</span>
        <span class="to"><span class="arrow">→</span> {formatDate(periodEnd)}</span>
      </div>
      <div class="summary">
        <div class="features">
          <strong class="title"
            >{$_('payment-superfan.overview-section.feature-overview.title')}</strong
          >
          <ol>
            <li>
              {$_('payment-superfan.overview-section.feature-overview.features.0.feature-one')}
            </li>
            <li>
              {$_('payment-superfan.overview-section.feature-overview.features.1.feature-two')}
            </li>
            <li>
              {$_('payment-superfan.overview-section.feature-overview.features.2.feature-three')}
            </li>
          </ol>
        </div>
        <div class="features">
          <strong class="title">
            {$_('payment-superfan.overview-section.support-us-overview.title')}
          </strong>
          <ol>
            <li>
              {$_(
                'payment-superfan.overview-section.support-us-overview.support-reasons.0.support-one'
              )}
            </li>
            <li>
              {$_(
                'payment-superfan.overview-section.support-us-overview.support-reasons.1.support-two'
              )}
            </li>
            <li>
              {$_(
                'payment-superfan.overview-section.support-us-overview.support-reasons.2.support-three'
              )}
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</MarketingBlock>

<style>
  .wrapper {
    width: 100%;
    display: flex;
    gap: 2rem;
  }

  .summary-wrapper {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
    max-width: 560px;
  }

  .period {
    margin-bottom: 2rem;
  }

  .summary {
    display: flex;
    justify-content: space-between;
  }

  .from,
  .arrow {
    margin-right: 0.5rem;
  }

  .title {
    display: inline-block;
    margin-bottom: 0.5rem;
    line-height: 1.3;
  }

  ol {
    list-style-type: decimal;
    list-style-position: inside;
  }

  @media screen and (max-width: 900px) {
    .icon {
      display: none;
    }
  }

  @media screen and (min-width: 501px) {
    .features:not(:first-child) {
      margin-left: 1rem;
    }
  }
  @media screen and (max-width: 500px) {
    .summary {
      flex-direction: column;
      gap: 2rem;
    }

    /* Collapse onto a new line */
    .to {
      display: block;
    }

    .arrow {
      margin-left: 0;
    }
  }
</style>
