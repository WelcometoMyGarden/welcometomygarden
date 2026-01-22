<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { close } from '$lib/stores/app';
  import { Modal } from '.';

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
        <p>{navigator.userAgent}</p>
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
