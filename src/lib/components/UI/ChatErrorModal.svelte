<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { SUPPORT_EMAIL, mailToSupportHref } from '$lib/constants';
  import { Modal } from '.';
  import Anchor from './Anchor.svelte';
  interface Props {
    show: boolean;
    details?: string | undefined;
    error: unknown;
  }

  let { show = $bindable(), details = undefined, error }: Props = $props();
</script>

<!-- @component
Modal to show a chat-sending error.
 -->

<Modal maxWidth="648px" ariaLabel="Error Modal" bind:show closeOnOuterClick={false} center>
  {#snippet title()}
    <div  class="title">
      <h2 id="Title">{$_('chat.error-modal.title')}</h2>
    </div>
  {/snippet}
  {#snippet body()}
    <div  class="body">
      <p>{$_('chat.error-modal.description')}</p>
      <p>
        <span>
          {$_('chat.error-modal.instruction')}
          <Anchor href={mailToSupportHref}>{SUPPORT_EMAIL}</Anchor>.
        </span>
      </p>
      <p>{$_('chat.error-modal.closing-line')}</p>
      <p></p>
      {#if error}
        <div class="error-log">
          <p class="section">Error:</p>
          <code>
            {typeof error === 'object' && error !== null ? error.toString() : 'Unknown'}
          </code>
          <p class="section">Context:</p>
          {#if details}<p>{details}</p>{/if}
        </div>
      {/if}
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
