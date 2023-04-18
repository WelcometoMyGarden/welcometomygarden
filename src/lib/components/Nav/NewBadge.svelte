<script>
  import { t } from 'svelte-i18n';
</script>

<!-- @component
Badge (chip) to indicate in a menu item that it refers to a new feature.
 -->
<div>
  {$t('generics.new')}
</div>

<style>
  div {
    display: inline-flex;
    justify-content: center;
    border-radius: 0.5rem;
    background-color: var(--color-orange-light);
    padding: 0 0.8rem;
    margin-right: 0.8rem;
    color: var(--color-white);
    height: min-content;
  }
</style>
