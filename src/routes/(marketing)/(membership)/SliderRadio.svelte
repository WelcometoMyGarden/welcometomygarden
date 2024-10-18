<script lang="ts">
  /**
   * Starts from 0
   */
  export let selectedOption = 2;
  export let optionIdPrefix = 'button';

  // In percentages
  // only works for 3 options
  const sliderPositions = [15, 50, 83];

  // array is more difficult to type.

  let innerWidth: number;
  // TODO: refactor to a `use` svelte expression?
  $: isMobile = innerWidth <= 850;

  $: sliderPosition = sliderPositions[selectedOption];

  $: borderColorOfIndex = (index: number) => {
    return selectedOption > index ? 'var(--color-green)' : 'var(--color-green-light)';
  };
</script>

<div class="slider-bar">
  <!-- 1.5 rem: half of the slider knob -->
  <div
    class="slider-bar-filled"
    style:width={!isMobile ? `calc(${sliderPosition}% + 1.5rem)` : null}
    style:height={isMobile ? `calc(${sliderPosition}% + 1.5rem)` : null}
  />
  {#each sliderPositions as position, index (position)}
    <input
      type="radio"
      id={optionIdPrefix + index}
      name="pricing"
      class="slider-position"
      bind:group={selectedOption}
      value={index}
      style:left={!isMobile ? `${position}%` : null}
      style:top={isMobile ? `${position}%` : null}
      style:border-color={borderColorOfIndex(index)}
    />
  {/each}
  <div
    class="slider"
    style:left={!isMobile ? `${sliderPosition}%` : null}
    style:top={isMobile ? `${sliderPosition}%` : null}
  />
</div>

<style>
  input {
    /* Strip browser styles */
    appearance: none;
    cursor: pointer;
    margin: 0;
  }

  .slider-bar,
  .slider-bar-filled {
    height: 1rem;
    border-radius: 0.5rem;
  }
  .slider-bar {
    margin: 3rem 0;
    width: 100%;
    background-color: var(--color-green-light);
    position: relative;
  }

  .slider-bar-filled {
    background-color: var(--color-green);
    position: absolute;
    left: 0;
    transition:
      height 0.3s,
      width 0.3s;
  }

  .slider,
  .slider-position {
    width: 3rem;
    height: 3rem;
    position: absolute;
    border-radius: 50%;
    top: -100%;
    transition: border-color 0.15s;
  }

  .slider {
    transition:
      left 0.3s,
      top 0.3s;
    background-color: var(--color-green);
  }

  .slider-position {
    border: 2px solid var(--color-green-light);
    background-color: white;
  }

  @media screen and (max-width: 850px) {
    .slider-bar,
    .slider-bar-filled {
      width: 1rem;
    }

    .slider-bar {
      /* 1.5rem: full knob away */
      margin: 0 0 0 1.5rem;
      grid-column: 1;
      grid-row: 1;
      height: 100%;
    }

    .slider,
    .slider-position {
      position: absolute;
      border-radius: 50%;
      left: -100%;
    }

    .superfan-levels {
      grid-column: 2;
    }
  }
</style>
