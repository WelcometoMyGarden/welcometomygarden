<script>
  import { Button, Icon } from '../UI';
  import { flagIcon } from '@/images/icons';
</script>

<span class="report-button">
  <Button styled={false} on:click>
    <Icon icon={flagIcon} />
    <slot />
  </Button>
</span>

<style>
  .report-button :global(.underline) {
    text-decoration: underline;
  }

  .report-button :global(button span) {
    display: flex;
    align-items: center;
  }

  .report-button :global(button i) {
    margin-right: 5px;
    width: 2rem;
    height: 1.4rem;
    display: inline-block;
    transform: rotate(-25deg);
  }

  .report-button :global(button i svg) {
    fill: var(--color-green);
  }
</style>
