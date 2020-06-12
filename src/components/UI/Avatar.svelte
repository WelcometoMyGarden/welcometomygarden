<script>
  export let name = '';

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

<div class="avatar" style="--chat-color: {color}">{name.charAt(0).toUpperCase()}</div>

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
    margin-right: 1rem;
    font-weight: 900;
    margin-right: 1.2rem;
  }
</style>
