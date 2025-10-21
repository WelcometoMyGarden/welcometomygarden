<script lang="ts">
  import { t } from 'svelte-i18n';
  import { Button, Modal } from '$lib/components/UI';
  import createUrl from '$lib/util/create-url';
  import { anchorText, lr } from '$lib/util/translation-helpers';
  import staticAssetUrl from '$lib/util/staticAssetUrl';
  import { user } from '$lib/stores/auth';
  import { trackEvent } from '$lib/util';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import { page } from '$app/stores';
  import routes from '$lib/routes';

  export let show: boolean;
  export let showMembershipModal: boolean;

  function createSignInURL() {
    const { hash, search } = $page.url;
    const searchParams = new URLSearchParams(search);
    // Designates a "member check"
    searchParams.append('m', '1');
    return createUrl($lr(routes.SIGN_IN), {
      // Retain hash, but add a "member check" parameter
      continueUrl: createUrl($lr(routes.ROUTE_PLANNER), searchParams, hash)
    });
  }
</script>

<Modal maxWidth="560px" ariaLabel="" bind:show center>
  <div slot="title" class="title">
    <h2 id="Title">{$t('routeplanner.modal.title')}</h2>
  </div>
  <div slot="body" class="body">
    <p>
      {@html $t('routeplanner.modal.description', {
        values: {
          signIn: !!$user
            ? $t('routeplanner.modal.sign-in-label')
            : anchorText({
                linkText: $t('routeplanner.modal.sign-in-label'),
                href: createSignInURL(),
                class: 'link',
                style: 'color: var(--color-green);',
                newtab: false
              })
        }
      })}
    </p>
    <video
      src={staticAssetUrl('/routeplanner/routeplanner-gardens-demo.mp4')}
      autoplay
      muted
      loop
      playsinline
    ></video>
    <!-- If already logged in, show the membership modal -->
    <div class="btn-container">
      {#if !!$user}
        <Button
          medium
          centered
          on:click={() => {
            show = false;
            showMembershipModal = true;
            trackEvent(PlausibleEvent.OPEN_MEMBERSHIP_MODAL, {
              source: 'routeplanner'
            });
          }}>{$t('routeplanner.modal.button-label')}</Button
        >
      {:else}
        <Button medium centered href={createSignInURL()}
          >{$t('routeplanner.modal.button-label')}</Button
        >
      {/if}
    </div>
  </div>
</Modal>

<style>
  p {
    margin-bottom: 1rem;
  }
  video {
    width: 100%;
    margin: 1rem auto 2rem auto;
  }

  .btn-container {
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
