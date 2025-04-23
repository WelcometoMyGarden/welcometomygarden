<script lang="ts">
  import type { DisplayResponseRateTime } from '$lib/api/garden';
  import { questionMarkIcon } from '$lib/images/icons';
  import { Icon } from '../UI';

  export let data: DisplayResponseRateTime;
  $: ({ has_requests, requests_count } = data);
  // TODO: temporary, use ICU
  const formatPlural = (str: string, num: number) => `${str}${num > 1 || num === 0 ? 's' : ''}`;
</script>

{#if data != null}
  <div class="response-rate-time">
    <div aria-describedby={has_requests ? 'response-rate-info' : ''}>
      Response rate: {(!data.has_requests ? 1 : data.response_rate).toLocaleString('en-US', {
        style: 'percent'
      })}
      <!-- Whether to show the question mark overlay -->
      {#if data.has_requests}
        <span class="question-mark-icon"><Icon greenStroke inline icon={questionMarkIcon} /></span>
        <div role="tooltip" id="response-rate-info">
          {data.last_10_responded_count}
          {formatPlural('response', data.last_10_responded_count)} to {data.more_than_10_requests
            ? ' the last '
            : ''}
          {requests_count}
          {formatPlural('request', requests_count)}
        </div>
      {/if}
    </div>
    <!-- When to show the response time -->
    {#if data.has_requests && data.response_time_key}
      <div>
        Response time: typically
        {#if data.response_time_key === 'few_hours'}
          within a few hours
        {:else if data.response_time_key === 'days' && data.response_time_days === 0}
          <!-- May happen with a round-down above 4 hours -->
          within 1 day
        {:else if data.response_time_key === 'days'}
          within {data.response_time_days} {formatPlural('day', data.response_time_days)}
        {:else if data.response_time_key === 'within_week'}
          within a week
        {:else if data.response_time_key === 'over_week'}
          within a week or more
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .response-rate-time {
    font-size: 1.4rem;
    line-height: 1.6;
  }
  .question-mark-icon :global(i) {
    vertical-align: middle;
  }

  /* TODO: hide tooltip with JS on esc button press
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tooltip_role*/
  [role='tooltip'],
  .hide-tooltip + [role='tooltip'] {
    visibility: hidden;
    position: absolute;
    top: -2.8rem;
    left: 3rem;
    padding: 0.3rem 0.6rem;
    border-radius: 0.6rem;
    background: black;
    color: white;
  }
  [aria-describedby]:hover,
  [aria-describedby]:focus {
    position: relative;
  }
  .question-mark-icon:hover + [role='tooltip'],
  .question-mark-icon:focus + [role='tooltip'] {
    visibility: visible;
  }
</style>
