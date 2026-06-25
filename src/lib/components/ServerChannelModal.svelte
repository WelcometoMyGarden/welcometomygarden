<script lang="ts">
  import { onMount } from 'svelte';
  import { Modal, LabeledRadioButton, TextInput } from './UI';
  import Button from './UI/Button.svelte';
  import { close } from '$lib/stores/app';
  import {
    WtmgServer,
    CHANNEL_PRESETS,
    isValidServerUrl,
    normalizeServerUrl,
    type WtmgServerConfig,
    type ServerChannelPreset
  } from '$lib/api/serverChannel';

  /** Radio value representing the "custom URL" option. */
  const CUSTOM = '__custom__';
  /** Marker shown next to the channel embedded into the app at build time. */
  const BAKED_MARKER = '★';

  let loading = $state(true);
  let error = $state<string | null>(null);
  let submitting = $state(false);
  let config = $state<WtmgServerConfig | null>(null);

  /** Selectable channels: the presets, plus the build-default URL when it isn't already a preset. */
  let options = $state<ServerChannelPreset[]>([]);
  let selected = $state('');
  let customUrl = $state('');

  onMount(async () => {
    try {
      const loaded = await WtmgServer.getConfig();
      config = loaded;

      // Always offer the channel embedded at build time (`baseline`) as an option — it may be a
      // preview/staging URL that isn't one of the fixed presets — so it's easy to switch back to.
      const list = [...CHANNEL_PRESETS];
      if (
        loaded.baseline &&
        !list.some((o) => normalizeServerUrl(o.url) === normalizeServerUrl(loaded.baseline))
      ) {
        list.push({ label: 'Build default', url: loaded.baseline });
      }
      options = list;

      const match = list.find(
        (o) => normalizeServerUrl(o.url) === normalizeServerUrl(loaded.current)
      );
      if (match) {
        selected = match.url;
      } else {
        selected = CUSTOM;
        customUrl = loaded.current;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  });

  /** The URL that confirming would switch to. */
  let targetUrl = $derived(selected === CUSTOM ? customUrl.trim() : selected);
  let targetValid = $derived(selected === CUSTOM ? isValidServerUrl(customUrl.trim()) : !!selected);
  let hasChange = $derived(
    !!config && targetValid && normalizeServerUrl(targetUrl) !== normalizeServerUrl(config.current)
  );

  const isCurrent = (url: string): boolean =>
    !!config && normalizeServerUrl(url) === normalizeServerUrl(config.current);

  const isBaked = (url: string): boolean =>
    !!config && normalizeServerUrl(url) === normalizeServerUrl(config.baseline);

  const confirm = async () => {
    if (!config || !hasChange || submitting) return;
    submitting = true;
    error = null;
    try {
      // Switching back to the baked default clears the override (so future launches follow the
      // build's default); any other target is persisted as an explicit override.
      if (normalizeServerUrl(targetUrl) === normalizeServerUrl(config.baseline)) {
        await WtmgServer.reset();
      } else {
        await WtmgServer.setUrl({ url: targetUrl });
      }
      // The native side rebuilds the webview, tearing down this JS context. Close defensively
      // in case the reload is deferred.
      close();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      submitting = false;
    }
  };
</script>

<Modal center={true} maxWidth="520px" onclose={close}>
  {#snippet title()}
    <h2>Frontend channel</h2>
  {/snippet}
  {#snippet body()}
    {#if loading}
      <p>Loading…</p>
    {:else if !config}
      <p class="error">{error ?? 'Could not load the current configuration.'}</p>
    {:else}
      <p class="current">
        Currently loaded from <strong>{config.current}</strong>{config.isPersisted
          ? ' (override)'
          : ' (build default)'}.
      </p>

      <fieldset>
        {#each options as option (option.url)}
          <LabeledRadioButton
            id="channel-{option.url}"
            name="server-channel"
            value={option.url}
            label={`${option.label}${isBaked(option.url) ? ` ${BAKED_MARKER}` : ''}${isCurrent(option.url) ? ' — current' : ''}`}
            disabled={isCurrent(option.url)}
            bind:group={selected}
          />
          <span class="url">{option.url}</span>
        {/each}
        <LabeledRadioButton
          id="channel-custom"
          name="server-channel"
          value={CUSTOM}
          label="Custom URL"
          bind:group={selected}
        />
      </fieldset>

      {#if selected === CUSTOM}
        <TextInput
          name="custom-server-url"
          type="url"
          placeholder="https://example.com"
          bind:value={customUrl}
          isValid={customUrl.trim() === '' || isValidServerUrl(customUrl.trim())}
          autocomplete="off"
        />
      {/if}

      <p class="legend">{BAKED_MARKER} = embedded at build time (the default)</p>

      {#if error}
        <p class="error">{error}</p>
      {/if}
    {/if}
  {/snippet}
  {#snippet controls()}
    <div class="actions">
      <Button medium uppercase inverse onclick={close}>Cancel</Button>
      <Button medium uppercase onclick={confirm} disabled={!hasChange || submitting}>
        Switch &amp; reload
      </Button>
    </div>
  {/snippet}
</Modal>

<style>
  h2 {
    font-size: 1.8rem;
    font-weight: 700;
  }

  .current {
    line-height: 1.5;
    margin-bottom: 1.5rem;
    word-break: break-all;
  }

  .current :global(strong) {
    font-weight: 700;
  }

  fieldset {
    border: none;
    padding: 0;
    margin: 0;
  }

  .url {
    display: block;
    margin: -0.4rem 0 0.8rem 3rem;
    font-size: 1.3rem;
    color: var(--color-text-light, #666);
    word-break: break-all;
  }

  .legend {
    margin-top: 1rem;
    font-size: 1.3rem;
    color: var(--color-text-light, #666);
  }

  .error {
    color: var(--color-danger);
    margin-top: 1rem;
    line-height: 1.4;
  }

  .actions {
    display: flex;
    gap: 1.2rem;
    justify-content: flex-end;
  }
</style>
