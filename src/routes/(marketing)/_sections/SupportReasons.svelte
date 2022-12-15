<script lang="ts">
  import TileList from '../_components/TileList.svelte';
  export let features = [
    {
      icon: '💚',
      title: 'Keep the WTMG spirit alive',
      description:
        'We are committed to keeping WTMG ad-free, safe and user friendly. This requires hard work!'
    },
    {
      icon: '🤩',
      title: 'Improve the WTMG experience',
      description:
        'We’re moving beyond the volunteer stage: WTMG needs our full-time attention to stay alive and kicking!'
    },
    {
      icon: '👋',
      title: 'Bring the community together',
      description:
        'We want to create a community space where people can meet and talk, both online and offline.'
    }
  ];
</script>

<TileList tiles={features} />
