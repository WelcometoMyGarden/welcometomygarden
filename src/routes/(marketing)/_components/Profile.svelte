<script lang="ts">
  export let name: string;
  export let role: string;
  export let imageSrc: string;
  import Text from '$lib/components/UI/Text.svelte';
  import ResponsiveSquare from '@/lib/components/UI/ResponsiveSquare.svelte';
</script>

<div class="profile">
  <div class="image-wrapper">
    <ResponsiveSquare>
      <img src={imageSrc} alt="Picture of {name}" />
    </ResponsiveSquare>
  </div>
  <Text is="span" size="l" class="name" weight="bold">{name}</Text>
  <Text is="span" size="l" class="role">{role}</Text>
  <Text is="p" class="intro"><slot /></Text>
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
    max-width: 9rem;
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

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    border: 0.5rem solid var(--color-green-light);
  }
</style>
