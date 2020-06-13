<script>
  export let name = '';

  const icons = [
    { name: 'tint', src: 'images/icons/ic-tint.svg' },
    { name: 'facebook', src: 'images/icons/facebook.svg' },
    { name: 'bolt', src: 'images/icons/ic-bolt.svg' },
    { name: 'campfire', src: 'images/icons/ic-campfire.svg' }
  ];

  if (!name) throw new Error('Name props is required');
  const availableIcons = icons.map(icon => icon.name);
  if (!availableIcons.includes(name))
    throw Error('Name props is invalid, should be one of ' + JSON.stringify(availableIcons));

  const icon = icons.find(icon => icon.name === name);
</script>

<img src={icon.src} alt={`icon-${icon.name}`} />

<style>
  img {
    width: var(--text-font-size-m);
    height: var(--text-font-size-m);
  }
</style>
