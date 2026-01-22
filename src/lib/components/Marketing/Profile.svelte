<script lang="ts">
  import Text from '$lib/components/UI/Text.svelte';
  import ProfilePicture from './ProfilePicture.svelte';
  interface Props {
    name: string;
    role: string;
    imageSrc: string;
    children?: import('svelte').Snippet;
  }

  let { name, role, imageSrc, children }: Props = $props();
</script>

<div class="profile">
  <div class="image-wrapper">
    <ProfilePicture {imageSrc} {name} />
  </div>
  <Text is="span" size="l" class="name" weight="bold">{name}</Text>
  <!-- TODO: how to do this less hacky? -->
  <Text is="span" size="l" class="role"
    >{role === 'Cofondateur' && name == 'Manon' ? 'Cofondatrice' : role}</Text
  >
  <Text is="p" class="intro">{@render children?.()}</Text>
</div>

<style>
  div.profile {
    max-width: 32rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  div.image-wrapper {
    width: 100%;
    max-width: 12rem;
    margin-bottom: 1rem;
  }

  div.profile :global(.name) {
    font-family: var(--fonts-titles);
    margin-bottom: 0.5rem;
  }

  div.profile :global(p.intro) {
    margin-top: 1rem;
    text-align: center;
    line-height: 160%;
  }

  .profile :global(.intro a:link),
  .profile :global(.intro a:visited),
  .profile :global(.intro a:active) {
    color: var(--color-orange);
    text-decoration: underline;
  }
  .profile :global(.intro a:hover) {
    text-decoration: none;
  }
</style>
