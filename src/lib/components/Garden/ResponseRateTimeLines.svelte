<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import type { DisplayResponseRateTime } from '$lib/api/garden';
  import { questionMarkIcon } from '$lib/images/icons';
  import { Icon } from '../UI';

  interface Props {
    data: DisplayResponseRateTime;
  }

  let { data }: Props = $props();
  let { has_requests, requests_count } = $derived(data);
</script>

{#if data != null}
  <div class="response-rate-time">
    <div aria-describedby={has_requests ? 'response-rate-info' : ''}>
      {$_('garden.drawer.response-rate-time.response-rate')}: {(!data.has_requests
        ? 1
        : data.response_rate
      ).toLocaleString('en-US', {
        style: 'percent'
      })}
      <!-- Whether to show the question mark overlay -->
      {#if data.has_requests}
        <button class="question-mark-icon">
          <Icon greenStroke inline icon={questionMarkIcon} />
          <div role="tooltip" id="response-rate-info">
            {data.last_10_responded_count}
            {$_('garden.drawer.response-rate-time.response', {
              values: { responses: data.last_10_responded_count }
            })}
            {$_('garden.drawer.response-rate-time.to')}
            <!-- Copy in between in case of > 10 requests.
                 In the special case of French, the count (10) is inserted here too.
              -->
            {data.more_than_10_requests
              ? $_('garden.drawer.response-rate-time.the-last', {
                  // for French
                  values: { requests: requests_count }
                })
              : ''}
            {#if !($locale === 'fr' && data.more_than_10_requests)}
              <!--
              Only for French in the case of > 10 requests, it was already inserted in between "the last" as a string {values: ... } interpolation, see above.
               For other languages we are inserting it here. -->
              {data.requests_count}
            {/if}
            {$_('garden.drawer.response-rate-time.request', {
              values: { requests: requests_count }
            })}
          </div>
        </button>
      {/if}
    </div>
    <!-- When to show the response time -->
    {#if data.has_requests && data.response_time_key}
      <div>
        {$_('garden.drawer.response-rate-time.typically-responds')}
        {#if data.response_time_key === 'few_hours'}
          {$_('garden.drawer.response-rate-time.within')}
          {$_('garden.drawer.response-rate-time.a-few-hours')}
        {:else if data.response_time_key === 'days'}
          <!-- May happen with a round-down above 4 hours -->
          {$_('garden.drawer.response-rate-time.within')}
          {Math.max(1, data.response_time_days)}
          {$_('garden.drawer.response-rate-time.day', {
            values: { days: Math.max(1, data.response_time_days) }
          })}
        {:else if data.response_time_key === 'within_week'}
          {$_('garden.drawer.response-rate-time.within')}
          {$_('garden.drawer.response-rate-time.a-week')}
        {:else if data.response_time_key === 'over_week'}
          {$_('garden.drawer.response-rate-time.in')}
          {$_('garden.drawer.response-rate-time.a-week')}
          {$_('garden.drawer.response-rate-time.or-more')}
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
  .response-rate-time::before {
    content: '';
    display: block;
    margin: 0.8rem 0 1.2rem 0;
    border-bottom: 1px solid var(--color-gray);
  }
  .question-mark-icon {
    /* block helps with centering */
    display: inline-block;
    position: relative;
    margin-left: 0.1rem;

    /* reset button styles */
    border: none;
    background: none;
    padding: 0;
    transform: translateY(-1.5px);
  }
  .question-mark-icon :global(i) {
    vertical-align: middle;
    width: 1.7rem;
    height: 1.7rem;
  }
  .question-mark-icon :global(i svg) {
    fill: var(--color-green);
  }

  /* TODO: hide tooltip with JS on esc button press
  https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tooltip_role*/
  /* button is only used to reliably capture the 'focus' state */
  [role='tooltip'],
  .hide-tooltip + [role='tooltip'] {
    visibility: hidden;
    position: absolute;
    bottom: 3.1rem;
    left: 50%;
    transform: translate(-50%);
    padding: 0.9rem 1.3rem;
    border-radius: 8px;
    background: var(--color-black);
    color: white;
    width: max-content;
    /* TODO: this a quick and partial fix for a horizontal scroll bar appearing on popular gardens when using Dutch.
        "Antwoordpercentage" is a long name
        "5 antwoorden op de laatste 10 aanvragen" is long, and is attached to the (?) after the long name
        -> the result extends the padded frame, and extends the padded .drawer-content-area container.

        Currently, we use "width: max-content" to ensure the content is displayed on one line,
        and a max-width for this specific case, to put the long string on two lines if needed,
        but it also affects other languages that have a less long "name".

        One solution would be to perform language-dependent styling
        of that.
        - like changing the max-width depending on lang
        - or applying another left: prop, but then the triangle should be decoupled from
          the tooltip and coupled to the question mark separately somehow, so that it hovers over it
        - or some JS solution?
        See also .drawer-content-area styles
     */
    max-width: 250px;
  }
  @supports (clip-path: inset(50%)) {
    /* Triangle with rounded edge */
    /* https://codyhouse.co/blog/post/css-rounded-triangles-with-clip-path */
    [role='tooltip']::after {
      visibility: hidden;
      content: '';
      position: absolute;
      top: 66%;
      display: block;
      height: 20px;
      width: 20px;
      background-color: inherit;
      left: calc(50% - 10px);
      clip-path: polygon(0% 0%, 100% 100%, 0% 100%);
      transform: rotate(-45deg);
      border-radius: 0 0 0 0.25em;
    }
  }
  @supports not (clip-path: inset(50%)) {
    /* Triangle with the "border hack" */
    [role='tooltip']::after {
      visibility: hidden;
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translate(-50%);
      border-left: 0.7rem solid transparent;
      border-right: 0.7rem solid transparent;
      border-top: 0.7rem solid var(--color-black);
    }
  }

  [aria-describedby]:hover,
  [aria-describedby]:focus {
    position: relative;
  }
  .question-mark-icon:hover > [role='tooltip'],
  .question-mark-icon:focus > [role='tooltip'] {
    visibility: visible;
  }
  .question-mark-icon:hover > [role='tooltip']::after,
  .question-mark-icon:focus > [role='tooltip']::after {
    visibility: visible;
  }

  @media screen and (max-width: 700px) {
    #response-rate-info {
      /*
        Hardcoded, because rem sizes don't seem to work well in Safari .
        May be related to the mess of the responsive scaling of root font sizes.
      */
      font-size: 14.55px;
      bottom: 3.3rem;
    }

    .question-mark-icon {
      margin-left: 0.2rem;
    }
    .question-mark-icon :global(i) {
      width: 2.1rem;
      height: 2.1rem;
    }
  }
</style>
