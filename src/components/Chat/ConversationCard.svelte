<script>
  export let selected = false;
  export let recipient;
  export let lastMessage;

  const colors = ['#EC9570', '#F6C4B7', '#F4E27E', '#59C29D', '#A2D0D3', '#2E5F63'];

  const getHashCode = str => {
    let h;
    // don't worry about it
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return h;
  };

  const colorIndex = getHashCode(recipient) % colors.length;
  const color = colors[Math.abs(colorIndex)];
</script>

<article>
  <button class="button-container conversation" class:selected on:click>
    <div class="avatar" style="--chat-color: {color}">{recipient.charAt(0).toUpperCase()}</div>
    <div class="details">
      <span class="name">{recipient}</span>
      <p class="last-message">{lastMessage}</p>
    </div>
  </button>
</article>

<style>
  article {
    width: 100%;
  }

  .conversation {
    padding: 2rem 2.4rem;
    display: flex;
    align-items: center;
    background-color: var(--color-white);
    border-left: 0.3rem solid var(--color-white);
    transition: all 0.3s ease-in-out;
  }

  .conversation:hover,
  .conversation.selected {
    background-color: var(--color-green-light);
  }

  .conversation:hover {
    border-left: 0.3rem solid var(--color-green-light);
  }

  .conversation.selected {
    border-left: 0.3rem solid var(--color-green);
  }

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

  .details {
    width: 80%;
  }

  .name {
    font-weight: 700;
  }

  /* truncate on overflow */
  .last-message {
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 1.4rem;
    margin-top: 0.4rem;
  }
</style>
