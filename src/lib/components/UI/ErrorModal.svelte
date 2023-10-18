<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { close } from '$lib/stores/app';
  import { SUPPORT_EMAIL, mailToSupportHref } from '$lib/constants';
  import { Modal } from '.';
  import Anchor from './Anchor.svelte';

  /**
   * Extra info to print in the user copy. Can include HTML, is already included in a <p>.
   *
   * Include a period, don't start with a space.
   */
  export let specifier: string = '';
  /**
   * Additional context to print.
   */
  export let contextLog: string | undefined = undefined;
  /**
   * The caught error variable
   */
  export let error: unknown;
</script>

<!-- @component
Modal to show a generic error.
 -->

<Modal maxWidth="648px" ariaLabel="Error Modal" center on:close={() => close()}>
  <div slot="title" class="title">
    <h2 id="Title">{$_('generics.error.start')}</h2>
  </div>
  <div slot="body" class="body">
    {#if specifier}
      <p>{@html specifier}</p>
    {/if}
    <p />
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

  .error-log > p.section {
    margin: 1rem 0;
  }

  .error-log > p.section:first-child {
    margin-top: 0;
  }

  .body > p {
    margin-bottom: 1rem;
  }
</style>
