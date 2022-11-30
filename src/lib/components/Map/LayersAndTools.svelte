<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { LabeledCheckbox, Text } from '@/lib/components/UI';
  import { bookmarkIcon, cyclistIcon, hikerIcon, tentIcon } from '@/lib/images/icons';
  import { user } from '@/lib/stores/auth';
  export let showHiking = false;
  export let showCycling = false;
  export let showGardens: boolean;
  export let showSavedGardens: boolean;

  $: superfan = $user?.superfan;
</script>

<div class="layers-and-tools">
  {#if superfan}
    <!-- content here -->
    <div>
      <Text>LAYERS & TOOLS</Text>
    </div>

    <div class="toggleTitle">
      <Text>GARDENS</Text>
    </div>
    <div>
      <div>
        <LabeledCheckbox
          name="gardens"
          icon={tentIcon}
          label={'Gardens'}
          bind:checked={showGardens}
        />
      </div>
      <div>
        <LabeledCheckbox
          name="savedGardens"
          icon={bookmarkIcon}
          label={'Saved ardens'}
          bind:checked={showSavedGardens}
        />
      </div>
    </div>

    <div class="toggleTitle">
      <Text>WAYMARKED TRAILS</Text>
    </div>
    <div class="waymarked-checks">
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
  {:else}
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
  {/if}
</div>

<style>
  .toggleTitle {
    display: flex;
    align-items: center;
    margin-top: 1rem;
  }
  :root {
    --layers-and-tools-height: 9rem;
  }
  /* The bottom left mapbox controls should be above the layersAndTools component */
  :global(.mapboxgl-ctrl-bottom-left) {
    bottom: var(--layers-and-tools-height);
  }
  .layers-and-tools {
    background-color: rgba(255, 255, 255, 0.8);
    bottom: 0;
    left: 0;
    position: absolute;
    width: 26rem;
    height: var(--layers-and-tools-height);
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
