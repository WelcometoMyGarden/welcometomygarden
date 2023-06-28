<script lang="ts">
  import { SUPPORT_EMAIL, mailToSupportHref } from '$lib/constants';
  import { Modal } from '.';
  import Anchor from './Anchor.svelte';
  export let show: boolean;
  export let details: string | undefined = undefined;
  export let error: unknown;
</script>

<!-- @component
Modal to show a chat-sending error.
 -->

<Modal radius maxWidth="648px" ariaLabel="Error Modal" bind:show closeOnOuterClick={false} center>
  <div slot="title" class="title">
    <h2 id="Title">Something went wrong</h2>
  </div>
  <div slot="body" class="body">
    <p>Something went wrong while sending your chat.</p>
    <p>
      <span>If this keeps happening, please copy what you see below</span><span
        >, and paste it in an email to
        <Anchor href={mailToSupportHref}>{SUPPORT_EMAIL}</Anchor>.
      </span>
    </p>
    <p>We'll try to help you as fast as we can!</p>
    <p />
    {#if error}
      <pre>
Error:
            <code>
                {typeof error === 'object' && error !== null ? error.toString() : ''}
            </code>
Context:

{#if details}{details}{/if}
        </pre>
    {/if}
  </div>
</Modal>

<style>
  pre {
    background-color: #eee;
    border-radius: 0.5rem;
    padding: 2rem;
    margin-top: 1rem;
    font-size: 1.4rem;
  }

  .body > p {
    margin-bottom: 1rem;
  }
</style>
