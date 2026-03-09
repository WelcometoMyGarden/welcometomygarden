<script lang="ts">
  import ResponsiveSquare from '$lib/components/UI/ResponsiveSquare.svelte';
  import Img from '@zerodevx/svelte-img';
  interface Props {
    imageSrc: string | Object[];
    name: string;
  }

  let { imageSrc, name }: Props = $props();
</script>

<ResponsiveSquare>
  <Img class="profile-picture-img" src={imageSrc} alt="Picture of {name}" />
</ResponsiveSquare>

<style>
  :global(.profile-picture-img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    border: 0.5rem solid var(--color-green-light);
  }
</style>
