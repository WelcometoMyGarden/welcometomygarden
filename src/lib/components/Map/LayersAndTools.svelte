<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { LabeledCheckbox } from '@/lib/components/UI';
  import { cyclistIcon, hikerIcon } from '@/lib/images/icons';
  export let showHiking = false;
  export let showCycling = false;
</script>

<div class="layers-and-tools">
  <div>
    <LabeledCheckbox
      name="hiking"
      icon={hikerIcon}
      label={$_('map.trails.hiking')}
      bind:checked={showHiking}
    />
  </div>
  <div>
    <LabeledCheckbox
      name="cycling"
      icon={cyclistIcon}
      label={$_('map.trails.cycling')}
      bind:checked={showCycling}
    />
  </div>
  <span class="attribution">
    {@html $_('map.trails.attribution', {
      values: {
        link: `<a href="https://waymarkedtrails.org/" target="_blank"  rel="noreferrer" >Waymarked Trails</a>`
      }
    })}
  </span>
</div>

<style>
  .layers-and-tools {
    background-color: rgba(255, 255, 255, 0.8);
    bottom: 0;
    left: 0;
    position: absolute;
    width: 26rem;
    height: 9rem;
    padding: 1rem;
  }

  .attribution {
    font-size: 1.2rem;
    margin-top: 1rem;
    display: inline-block;
  }

  .attribution :global(a) {
    text-decoration: underline;
  }
</style>
