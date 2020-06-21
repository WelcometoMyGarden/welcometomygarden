<script>
  import { goto } from '@sveltech/routify';

  const partner = 'HuyU6xp5MFdDZf9PCFIag5HJxu22';

  const initiate = () => {
    $goto(`/chat?with=${partner}`);
  };
</script>

<!--
  This is a temporary placeholder. To initiate a chat beween users
  Won't be necessary when stuff is on the map and you contact people from there
-->
<button on:click={initiate}>Initiate chat</button>
