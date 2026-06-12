<script lang="ts">
  /**
   * An animated on/off switch (toggle).
   *
   * Controlled component: `checked` reflects the current state and `onToggle` fires the user's
   * intent — the parent decides what happens (e.g. opening a modal vs. relisting immediately), so
   * this component never flips `checked` on its own.
   */
  interface Props {
    checked?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
    onToggle?: () => void;
  }

  let { checked = false, disabled = false, ariaLabel, onToggle }: Props = $props();
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={ariaLabel}
  class="switch"
  class:on={checked}
  {disabled}
  onclick={() => onToggle?.()}
>
  <span class="knob"></span>
</button>

<style>
  .switch {
    position: relative;
    width: 54px;
    height: 31px;
    border-radius: 16px;
    background: #cfcdc7;
    border: none;
    padding: 0;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 220ms ease;
  }

  .switch:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .switch.on {
    background: #59c29d;
  }

  .knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 25px;
    height: 25px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: transform 220ms cubic-bezier(0.3, 1.3, 0.6, 1);
  }

  .switch.on .knob {
    transform: translateX(23px);
  }

  /* Respect users who prefer reduced motion. */
  @media (prefers-reduced-motion: reduce) {
    .switch,
    .knob {
      transition: none;
    }
  }
</style>
