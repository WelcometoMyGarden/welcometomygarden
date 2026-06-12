<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { Switch } from '$lib/components/UI';
  import { formatLongDate, formatRelativeDate } from '$lib/util/format-date';
  import { coercedLocale } from '$lib/stores/app';

  /**
   * Presentational "Your garden" visibility card: a switch with a contextual label/subtext and,
   * when the garden is unlisted, inline actions to change the return date or relist now.
   *
   * Two visual states (listed / unlisted). The card grows vertically to reveal the inline actions
   * using the CSS `grid-template-rows: 0fr → 1fr` trick (no JS transition), and its background +
   * border animate via a plain CSS transition. All state is driven by props; intents are emitted up.
   */
  interface Props {
    listed: boolean;
    /** The scheduled relist date (from `relistGardenAt`), or null when unlisted indefinitely. */
    returnDate: Date | null;
    disabled?: boolean;
    /** Switch was toggled (parent decides: open modal when listed, relist when unlisted). */
    onToggle: () => void;
    /** "Change date" / "Set a return date" inline action. */
    onEditReturnDate: () => void;
    /** "Relist now" inline action. */
    onRelistNow: () => void;
  }

  let {
    listed,
    returnDate,
    disabled = false,
    onToggle,
    onEditReturnDate,
    onRelistNow
  }: Props = $props();

  const title = $derived(
    listed ? $_('account.garden.visibility.on-label') : $_('account.garden.visibility.off-label')
  );

  const subLineHtml = $derived.by(() => {
    if (listed) return $_('account.garden.visibility.on-subtext');
    if (returnDate) {
      return $_('account.garden.visibility.returns-on', {
        values: {
          // returnDate is a type-check string through Firestore rules
          date: `<strong>${formatLongDate(returnDate, $coercedLocale)}</strong>`,
          relative: formatRelativeDate(returnDate, $coercedLocale)
        }
      });
    }
    return $_('account.garden.visibility.off-indefinite');
  });

  const editLabel = $derived(
    returnDate
      ? $_('account.garden.visibility.change-date')
      : $_('account.garden.visibility.set-return-date')
  );
</script>

<div class="card" class:on={listed} class:off={!listed}>
  <div class="main">
    <div class="copy">
      <div class="title">{title}</div>
      <div class="sub">{@html subLineHtml}</div>
    </div>
    <Switch checked={listed} {disabled} onToggle={() => onToggle()} ariaLabel={title} />
  </div>

  <!-- Inline actions, revealed by growing the grid row when unlisted.
   `inert` removes them from a11y tree while collapsed.
    https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert
  -->
  <div class="status-wrap" inert={listed}>
    <div class="status-inner">
      <div class="actions">
        <button type="button" class="link-action" {disabled} onclick={() => onEditReturnDate()}>
          {editLabel}
        </button>
        <span class="dot">·</span>
        <button type="button" class="link-action" {disabled} onclick={() => onRelistNow()}>
          {$_('account.garden.visibility.relist-now')}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .card {
    border-radius: 10px;
    border: 1.5px solid var(--color-gray);
    background: #fff;
    overflow: hidden;
    transition:
      border-color 250ms,
      background-color 250ms,
      box-shadow 250ms;
  }

  .card.on {
    border-color: rgba(89, 194, 157, 0.5);
    background-color: #f4faf5;
  }

  .card.off {
    border-color: transparent;
    background-color: var(--color-beige-light);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .main {
    display: flex;
    align-items: center;
    gap: 1.8rem;
    padding: 2rem 2.2rem;
  }

  .copy {
    flex: 1;
    min-width: 0;
  }

  .title {
    font-family: var(--fonts-copy);
    font-weight: 600;
    font-size: 1.6rem;
    color: var(--color-green);
    line-height: 1.3;
  }

  .sub {
    font-size: 1.4rem;
    color: var(--color-green-2);
    line-height: 1.5;
    margin-top: 0.3rem;
  }

  .sub :global(strong) {
    color: var(--color-green);
    font-weight: 600;
  }

  /* Vertical grow/shrink without a JS transition. */
  .status-wrap {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 250ms ease;
  }

  .card.off .status-wrap {
    grid-template-rows: 1fr;
  }

  .status-inner {
    overflow: hidden;
    min-height: 0;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    padding: 0 2.2rem 1.8rem;
  }

  .dot {
    color: var(--color-darker-gray);
  }

  /* Incl. button style resets
  TODO: we might be able to reuse the <Button link> component? */
  .link-action {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 1.4rem;
    font-family: var(--fonts-copy);
    font-weight: 600;
    color: var(--color-orange);
    text-decoration: underline;
  }

  .link-action:hover {
    text-decoration: none;
  }

  .link-action:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media screen and (max-width: 700px) {
    .main {
      padding: 1.6rem;
      gap: 1.2rem;
    }
    .actions {
      padding: 0 1.6rem 1.6rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card,
    .status-wrap {
      transition: none;
    }
  }
</style>
