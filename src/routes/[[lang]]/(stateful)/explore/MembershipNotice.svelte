<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Modal, Button } from '$lib/components/UI';
  import { MOBILE_BREAKPOINT } from '$lib/constants';
  import MemberFeatureIcons from '$lib/components/LayersAndTools/MemberFeatureIcons.svelte';

  interface Props {
    show?: boolean;
    onBecomeMember?: () => void;
  }

  let { show = $bindable(false), onBecomeMember = () => {} }: Props = $props();

  const handleBecomeMember = () => {
    show = false;
    onBecomeMember();
  };
</script>

<Modal
  bind:show
  maxWidth="{MOBILE_BREAKPOINT}px"
  center
  ariaLabel={$_('map.superfan-notice.title')}
  className="membership-notice"
>
  {#snippet title()}
    <div class="title-section">
      <h2>{$_('map.superfan-notice.title')}</h2>
    </div>
  {/snippet}
  {#snippet body()}
    <div class="content">
      <MemberFeatureIcons direction="horizontal" size={2.4} />
      <p>
        {@html $_('map.superfan-notice.description', {
          values: { linkText: $_('map.superfan-notice.linkText') }
        })}
      </p>
      <Button onclick={handleBecomeMember} medium uppercase orange>
        {$_('map.superfan-notice.linkText')}
      </Button>
    </div>
  {/snippet}
</Modal>

<style>
  .title-section {
    width: 100%;
    /* Compensate for close button on the right to still center the text */
    margin-left: 30px;
  }

  h2 {
    font-weight: 600;
    font-size: 2rem;
    text-align: center;
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding: 1rem 2rem;
    text-align: center;
  }

  .content p {
    font-size: 1.4rem;
  }

  :global(.membership-notice .modal-header) {
    margin-bottom: 0rem;
  }

  @media screen and (max-width: 700px) {
    h2 {
      font-size: initial;
    }
  }
</style>
