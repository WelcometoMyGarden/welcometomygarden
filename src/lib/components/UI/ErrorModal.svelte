<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { close } from '$lib/stores/app';
  import { Modal } from '.';
  import { isNative } from '$lib/util/uaInfo';
  import { deviceId } from '$lib/stores/pushRegistrations';
  import { Device, type DeviceInfo } from '@capacitor/device';
  import { omit } from 'lodash-es';

  export interface Props {
    /**
     * Extra info to print in the user copy. Can include HTML, is already included in a <p>.
     *
     * Include a period, don't start with a space.
     */
    specifier?: string;
    /**
     * Additional context to print.
     */
    contextLog?: string | undefined;
    /**
     * The caught error variable
     */
    error: unknown;
  }

  let { specifier = '', contextLog = undefined, error }: Props = $props();

  let nativeInfo: undefined | DeviceInfo;

  let nativeInfoString = $derived(
    nativeInfo
      ? JSON.stringify(
          omit(nativeInfo, ['name', 'operatingSystem', 'iOSVersion'] satisfies Array<
            DeviceInfo[keyof DeviceInfo]
          >)
        )
      : ''
  );
  $effect(() => {
    if (isNative) {
      Device.getInfo().then((info) => (nativeInfo = info));
    }
  });
</script>

<!-- @component
Modal to show a generic error.
 -->

<Modal maxWidth="648px" ariaLabel="Error Modal" center onclose={close}>
  {#snippet title()}
    <div class="title">
      <h2 id="Title">{$_('generics.error.start')}</h2>
    </div>
  {/snippet}
  {#snippet body()}
    <div class="body">
      {#if specifier}
        <p>{@html specifier}</p>
      {/if}
      <p></p>
      <!-- This is printed as a box with -->
      <div class="error-log">
        {#if error}
          <code>
            {typeof error === 'object' && error !== null
              ? error.toString()
              : typeof error === 'string'
                ? error
                : 'Unknown'}
          </code>
        {/if}
        {#if contextLog}<p>{contextLog}</p>{/if}
        <p>
          {#if isNative}
            Device ID: {$deviceId}
            {#if nativeInfoString}
              <br />
              {nativeInfoString}
            {/if}
          {:else}
            {navigator.userAgent}
          {/if}
        </p>
      </div>
    </div>
  {/snippet}
</Modal>

<style>
  .error-log {
    background-color: #eee;
    border-radius: 0.5rem;
    padding: 2rem;
    margin-top: 1rem;
    font-size: 1.4rem;
  }

  .error-log > * {
    font-size: 1.4rem;
  }

  .body > p {
    margin-bottom: 1rem;
  }
</style>
