<script>
  import { _ } from 'svelte-i18n';
  import { auth } from '../api/firebase';

  // Mitigates https://github.com/WelcometoMyGarden/welcometomygarden/issues/297
  // NOTE: Might perform an unnecessary double reload when being redirected by
  // checkAndHandleUnverified
  auth().currentUser?.reload();
</script>

<p class="reload-suggestion">
  {@html $_('account.verify.reload-suggestion', {
    values: {
      reloading: `<a onclick="window.location.reload()">${$_('account.verify.reloading-text')}</a>`
    }
  })}
</p>

<style>
  .reload-suggestion {
    margin-top: 1rem;
    font-style: italic;
  }
  .reload-suggestion :global(a),
  .reload-suggestion :global(a:link),
  .reload-suggestion :global(a:visited),
  .reload-suggestion :global(a:active) {
    cursor: pointer;
    color: var(--color-orange);
    text-decoration: underline;
  }
  .reload-suggestion :global(a:hover) {
    text-decoration: none;
  }
</style>
