<script>
  import { _ } from 'svelte-i18n';
</script>

<svelte:head>
  <title>{$_('generics.map')} | {$_('generics.wtmg.explicit')}</title>
  <script
    src="https://tally.so/widgets/embed.js"
    on:load={() => {
      document.dispatchEvent(new CustomEvent('tally-loaded'));
    }}
  ></script>
</svelte:head>
