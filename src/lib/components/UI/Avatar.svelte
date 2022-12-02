<script lang="ts">
  export let name = '';
  export let large = false;
  export let border = false;

  const colors = ['#EC9570', '#F6C4B7', '#F4E27E', '#59C29D', '#A2D0D3', '#2E5F63'];

  const getHashCode = (str: string) => {
    let h;
    // don't worry about it
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return h;
  };

  const colorOf = (value: string) => {
    return colors[Math.abs(getHashCode(value) % colors.length)];
  };
</script>

<div class="avatarContainer">
  <div class="avatar" class:large class:border style="--chat-color: {colorOf(name)}">
    {name ? name.charAt(0).toUpperCase() : '...'}
  </div>
</div>

<style>
  :root {
    --avatar-border-size: 3.5px;
  }

  .avatarContainer {
    display: inline-block;
    position: relative;
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
    font-weight: 900;

    position: relative;
    /* TODO: fix z-index */
    /* z-index: 15; */
  }

  .large {
    width: 10rem;
    height: 10rem;
    font-size: 3rem;
  }

  .border::before {
    box-sizing: border-box;

    content: '';
    position: absolute;
    z-index: -1;
    left: calc(-1 * var(--avatar-border-size));
    top: calc(-1 * var(--avatar-border-size));
    width: calc(100% + var(--avatar-border-size) * 2);
    height: calc(100% + var(--avatar-border-size) * 2);
    border-radius: 50%;

    background-color: var(--color-white);
  }

  .border::after {
    --color-extra-0: '#EC9570';
    --color-extra-1: '#F6C4B7';
    --color-extra-2: '#F4E27E';
    --color-extra-3: '#59C29D';
    --color-extra-4: '#A2D0D3';
    --color-extra-5: '#2E5F63';

    box-sizing: border-box;

    content: '';
    position: absolute;
    z-index: -2;
    left: calc(-1 * var(--avatar-border-size) * 2);
    top: calc(-1 * var(--avatar-border-size) * 2);
    width: calc(100% + var(--avatar-border-size) * 4);
    height: calc(100% + var(--avatar-border-size) * 4);
    border-radius: 50%;

    background-color: var(--color-white);
    background-repeat: no-repeat;
    background-size: 50% 50%, 50% 50%;
    background-size: 100%;
    background-position: 0 0, 100% 0, 100% 100%, 0 100%;
    background-image: conic-gradient(
      #ec9570 60deg,
      #a2d0d3 60deg 120deg,
      #2e5f63 120deg 180deg,
      #f6c4b7 180deg 240deg,
      #59c29d 240deg 300deg,
      #f4e27e 300deg 360deg
    );
  }

  .border:hover::after {
    animation: rotate 4s linear infinite;
  }

  @keyframes rotate {
    100% {
      transform: rotate(1turn);
    }
  }

  @media (min-width: 700px) and (max-width: 850px) {
    .avatar:not(.large) {
      width: 4rem;
      height: 4rem;
    }
  }
</style>
