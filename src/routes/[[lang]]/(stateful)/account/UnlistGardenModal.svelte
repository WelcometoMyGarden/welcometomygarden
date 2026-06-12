<script module lang="ts">
  export type UnlistMode = 'until-date' | 'indefinite';
  export type UnlistResult = { mode: UnlistMode; returnDate: Date | null };
</script>

<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Modal, Button, RadioCard } from '$lib/components/UI';
  import { calendarIcon, hideIcon } from '$lib/images/icons';
  import {
    addDays,
    toDateInputValue,
    parseInputDate,
    formatLongDate,
    formatShortDate,
    formatRelativeDate,
    startOfToday
  } from '$lib/util/format-date';
  import { brusselsTimeOnDate } from './util';
  import { coercedLocale } from '$lib/stores/app';

  interface Props {
    show?: boolean;
    /** Pre-select a mode when opening (e.g. 'until-date' when adding a return date to a hidden garden). */
    forceMode?: UnlistMode | null;
    /** Existing relist date to pre-fill the picker with, if any. */
    initialReturnDate?: Date | null;
    onConfirm: (result: UnlistResult) => void;
    onCancel?: () => void;
  }

  let {
    show = $bindable(false),
    forceMode = null,
    initialReturnDate = null,
    onConfirm,
    onCancel
  }: Props = $props();

  const PRESETS = [
    { id: '1w', days: 7, count: 1 },
    { id: '2w', days: 14, count: 2 }
  ] as const;
  type PresetId = (typeof PRESETS)[number]['id'] | 'custom';

  let unlistMode = $state<UnlistMode | null>(null);
  let relistTimePresetId = $state<PresetId>('1w');

  /**
   * The yyyy-mm-dd draft date for the custom option
   */
  let draftCustomReturnDate = $state(toDateInputValue(addDays(startOfToday(), 14)));

  /**
   * This is the final yyyy-mm-dd that will be confirmed, and can be edited
   * by choosing the preset or custom options
   */
  let draftDateStr = $derived(
    relistTimePresetId === 'custom'
      ? draftCustomReturnDate
      : toDateInputValue(
          addDays(startOfToday(), PRESETS.find((p) => p.id === relistTimePresetId)?.days ?? 7)
        )
  );

  let initialized = $state(false);

  function initialize() {
    unlistMode = forceMode ?? (initialReturnDate ? 'until-date' : null);

    if (initialReturnDate) {
      const days = Math.round(
        (initialReturnDate.getTime() - startOfToday().getTime()) / 86_400_000
      );
      const match = PRESETS.find((p) => p.days === days);
      relistTimePresetId = match ? match.id : 'custom';
      draftCustomReturnDate = toDateInputValue(initialReturnDate);
    } else {
      relistTimePresetId = '1w';
      draftCustomReturnDate = toDateInputValue(addDays(startOfToday(), 14));
    }
  }

  // Initialize the drafts from the props each time the modal opens.
  $effect(() => {
    if (show && !initialized) {
      initialize();
      initialized = true;
    } else if (!show) {
      initialized = false;
    }
  });

  const minDate = $derived(toDateInputValue(addDays(startOfToday(), 1)));

  const draftDate = $derived(parseInputDate(draftDateStr));

  const returnMessage = $derived(
    $_('account.garden.unlist-modal.return', {
      values: {
        date: `<strong>${formatLongDate(draftDate, $coercedLocale)}</strong>`,
        relative: formatRelativeDate(draftDate, $coercedLocale)
      }
    })
  );

  const confirmLabel = $derived(
    unlistMode === 'until-date'
      ? $_('account.garden.unlist-modal.unlist-until', {
          values: { date: formatShortDate(draftDate, $coercedLocale).toUpperCase() }
        })
      : $_('account.garden.unlist-modal.unlist-garden')
  );

  const cancel = () => {
    show = false;
    onCancel?.();
  };

  const confirm = () => {
    if (!unlistMode) return;
    onConfirm({
      mode: unlistMode,
      returnDate: unlistMode === 'until-date' ? brusselsTimeOnDate(draftDateStr) : null
    });
    show = false;
  };
</script>

<Modal bind:show maxWidth="500px" closeOnOuterClick center onclose={onCancel}>
  {#snippet title({ ariaLabelledBy })}
    <h2 id={ariaLabelledBy} class="title">{$_('account.garden.unlist-modal.title')}</h2>
  {/snippet}

  {#snippet body()}
    <p class="subtitle">{$_('account.garden.unlist-modal.subtitle')}</p>

    <div class="modes">
      <RadioCard
        name="unlist-mode"
        value="until-date"
        bind:group={unlistMode}
        icon={calendarIcon}
        title={$_('account.garden.unlist-modal.mode-date-title')}
        description={$_('account.garden.unlist-modal.mode-date-desc')}
      />
      <RadioCard
        name="unlist-mode"
        value="indefinite"
        bind:group={unlistMode}
        icon={hideIcon}
        title={$_('account.garden.unlist-modal.mode-indef-title')}
        description={$_('account.garden.unlist-modal.mode-indef-desc')}
      />
    </div>

    {#if unlistMode === 'until-date'}
      <div class="date-block">
        <div class="date-label">{$_('account.garden.unlist-modal.date-label')}</div>
        <div class="presets">
          {#each PRESETS as preset (preset.id)}
            <button
              type="button"
              class="chip"
              class:on={relistTimePresetId === preset.id}
              onclick={() => (relistTimePresetId = preset.id)}
            >
              {$_('account.garden.unlist-modal.preset-weeks', { values: { count: preset.count } })}
            </button>
          {/each}
          <button
            type="button"
            class="chip"
            class:on={relistTimePresetId === 'custom'}
            onclick={() => (relistTimePresetId = 'custom')}
          >
            {$_('account.garden.unlist-modal.pick-date')}
          </button>
        </div>

        {#if relistTimePresetId === 'custom'}
          <div class="custom-row">
            <input
              type="date"
              class="date-input"
              min={minDate}
              bind:value={draftCustomReturnDate}
            />
          </div>
        {/if}

        <p class="return">{@html returnMessage}</p>
      </div>
    {/if}
    <hr />
  {/snippet}

  {#snippet controls()}
    <div class="buttons">
      <Button medium type="button" uppercase inverse onclick={cancel}>
        {$_('account.garden.unlist-modal.cancel')}
      </Button>
      <Button medium type="button" uppercase disabled={!unlistMode} onclick={confirm}>
        {confirmLabel}
      </Button>
    </div>
  {/snippet}
</Modal>

<style>
  .subtitle {
    margin: 0 0 2.2rem;
  }

  .modes {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.8rem;
  }

  .date-block {
    padding: 1.6rem;
    background: var(--color-beige-light);
    border-radius: 8px;
    margin-bottom: 1.8rem;
  }

  .date-label {
    font-weight: 600;
    font-size: 1.2rem;
    color: var(--color-green);
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  .presets {
    display: flex;
    gap: 0.8rem;
    flex-wrap: wrap;
    margin-bottom: 1.2rem;
  }

  .chip {
    background: #fff;
    border: 1.5px solid var(--color-gray);
    border-radius: 30px;
    padding: 0.7rem 1.4rem;
    font-family: var(--fonts-copy);
    font-size: 1.3rem;
    font-weight: 500;
    color: var(--color-green);
    cursor: pointer;
    transition: all 200ms;
  }

  .chip:hover {
    border-color: var(--color-green);
  }

  .chip.on {
    background: var(--color-green);
    color: #fff;
    border-color: var(--color-green);
  }

  .custom-row {
    display: inline-flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.4rem;
    background: #fff;
    border: 1px solid var(--color-gray);
    border-radius: 6px;
    color: var(--color-green);
    margin-bottom: 1.2rem;
  }

  .date-input {
    border: none;
    outline: none;
    font-family: var(--fonts-copy);
    font-size: 1.4rem;
    color: var(--color-green);
    background: transparent;
  }

  .return {
    font-size: 1.3rem;
    color: var(--color-green-2);
    line-height: 1.5;
    margin: 0;
  }

  .return :global(strong) {
    color: var(--color-green);
    font-weight: 600;
  }

  .buttons {
    display: flex;
    gap: 1.2rem;
    justify-content: flex-end;
  }

  hr {
    border: none;
    height: 2px;
    background-color: var(--color-gray);
  }

  @media (prefers-reduced-motion: reduce) {
    .chip {
      transition: none;
    }
  }

  @media (max-width: 500px) {
    .buttons {
      flex-direction: column-reverse;
    }

    .buttons :global(.button) {
      width: 100%;
    }
  }
</style>
