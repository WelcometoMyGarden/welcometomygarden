<script lang="ts">
  import ResponsiveSquare from '@/lib/components/UI/ResponsiveSquare.svelte';
  export let imageSrc: string;
  export let name: string;
</script>

<ResponsiveSquare>
  <img src={imageSrc} alt="Picture of {name}" />
</ResponsiveSquare>

<style>
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    border: 0.5rem solid var(--color-green-light);
  }
</style>
