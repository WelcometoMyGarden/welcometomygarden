<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { LabeledCheckbox, Text } from '@/lib/components/UI';
  import { bookmarkIcon, cyclistIcon, flagIcon, hikerIcon, tentIcon } from '@/lib/images/icons';
  import { user } from '@/lib/stores/auth';
  export let showHiking = false;
  export let showCycling = false;
  export let showGardens: boolean;
  export let showSavedGardens: boolean;
  export let showTrainsAndRails: boolean;

  $: superfan = $user?.superfan;
</script>

<div class="layers-and-tools">
  {#if superfan}
    <!-- content here -->
    <div class="uppercase">
      <Text>Layers & Tools</Text>
    </div>

    <div class="toggle-title uppercase">
      <Text>Gardens</Text>
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
          label={'Saved gardens'}
          bind:checked={showSavedGardens}
        />
      </div>
    </div>

    <div class="toggle-title uppercase">
      <Text>Waymarked Trails</Text>
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

    <div class="toggle-title uppercase">
      <Text>Trains</Text>
    </div>
    <div>
      <div>
        <LabeledCheckbox
          name="rails"
          icon={flagIcon}
          label={'Railway'}
          bind:checked={showTrainsAndRails}
        />
      </div>
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
  .uppercase {
    text-transform: uppercase;
  }

  .toggle-title {
    display: flex;
    align-items: center;
    margin-top: 1rem;
  }
  :root {
    --layers-and-tools-height: 21rem;
  }
  /*
    The bottom left mapbox controls should be above the layersAndTools component
    TODO: Can we render this scale control ourselves in a flex-box ruled component?
    Then it will scale dynamically.
  */
  :global(.mapboxgl-ctrl-bottom-left) {
    bottom: var(--layers-and-tools-height);
  }
  .layers-and-tools {
    background-color: rgba(255, 255, 255, 0.8);
    bottom: 0;
    left: 0;
    position: absolute;
    width: 26rem;
    /* height: var(--layers-and-tools-height); */
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
