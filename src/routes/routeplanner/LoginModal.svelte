<script lang="ts">
  import { t } from 'svelte-i18n';
  import { Button, Modal } from '$lib/components/UI';
  import createUrl from '$lib/util/create-url';
  import { anchorText } from '$lib/util/translation-helpers';
  import staticAssetUrl from '$lib/util/staticAssetUrl';

  export let show: boolean;

  function createSignInURL() {
    // window.location should be used, since it looks like
    // Svelte $page does not track history.replaceState() changes
    const { hash } = window.location;
    const searchParams = new URLSearchParams(window.location.search);
    // Designates a "member check"
    searchParams.append('m', '1');
    return createUrl('/sign-in', {
      // Retain hash, but add a "member check" parameter
      continueUrl: `/routeplanner?${searchParams.toString()}${hash}`
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
          signIn: anchorText({
            linkText: $t('routeplanner.modal.sign-in-label'),
            href: createSignInURL(),
            class: 'link',
            style: 'color: var(--color-green);',
            newtab: false
          })
        }
      })}
    </p>
    <video src={staticAssetUrl('/routeplanner/routeplanner-gardens-demo.mp4')} autoplay muted loop
    ></video>
    <Button medium href={createSignInURL()}>{$t('routeplanner.modal.button-label')}</Button>
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
</style>
