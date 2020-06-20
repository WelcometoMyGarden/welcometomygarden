<script>
  export let name = '';
  export let large = false;

  const colors = ['#EC9570', '#F6C4B7', '#F4E27E', '#59C29D', '#A2D0D3', '#2E5F63'];

  const getHashCode = str => {
    let h;
    // don't worry about it
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return h;
  };

  const colorIndex = getHashCode(name) % colors.length;
  const color = colors[Math.abs(colorIndex)];
</script>

<div class="avatar" class:large style="--chat-color: {color}">{name.charAt(0).toUpperCase()}</div>

<style>
  .avatar {
    width: 5rem;
    height: 5rem;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--color-white);
    background-color: var(--chat-color);
    border-radius: 50%;
    font-weight: 900;
  }

  .large {
    width: 10rem;
    height: 10rem;
    font-size: 3rem;
  }

  @media (min-width: 700px) and (max-width: 850px) {
    .avatar {
      width: 4rem;
      height: 4rem;
    }
  }
</style>
