<script lang="ts">
  interface Props {
    name?: string;
    large?: boolean;
    border?: boolean; // Adds a multi-color border around the avatar.
    animate?: boolean; // Enable the avatar to animate on hover.
  }

  let {
    name = '',
    large = false,
    border = false,
    animate = true
  }: Props = $props();
  let animating = false; // Whether the avatar is currently animating.

  const colors = ['#EC9570', '#F6C4B7', '#F4E27E', '#59C29D', '#A2D0D3', '#2E5F63'];

  const getHashCode = (str: string): number => {
    let h = 0;
    // don't worry about it
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return h;
  };

  const colorOf = (value: string) => {
    return colors[Math.abs(getHashCode(value) % colors.length)];
  };
</script>

<div
  class="avatar"
  class:large
  class:border
  class:animate
  class:animating
  style="--chat-color: {colorOf(name)}"
>
  <div class="avatar-border-multi">
    <div class="avatar-border-white"></div>
  </div>
  <span class="avatar-text notranslate">
    {name ? name.charAt(0).toUpperCase() : '...'}
  </span>
</div>

<style>
  :root {
    --avatar-border-size: 0.2rem;
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
    font-weight: 700;

    position: relative;
  }

  .large {
    --avatar-border-size: 0.4rem;
    width: 10rem;
    height: 10rem;
    font-size: 3rem;
  }

  .avatar:not(.border) .avatar-border-multi {
    visibility: hidden;
  }

  .avatar-border-multi {
    position: absolute;
    left: calc(-1 * var(--avatar-border-size) * 2);
    top: calc(-1 * var(--avatar-border-size) * 2);
    width: calc(100% + var(--avatar-border-size) * 4);
    height: calc(100% + var(--avatar-border-size) * 4);
    border-radius: 50%;

    background-color: var(--color-white);
    background-repeat: no-repeat;
    background-size:
      50% 50%,
      50% 50%;
    background-size: 100%;
    background-position:
      0 0,
      100% 0,
      100% 100%,
      0 100%;
    background-image: conic-gradient(
      #ec9570 0deg 60deg,
      #a2d0d3 60deg 120deg,
      #2e5f63 120deg 180deg,
      #f6c4b7 180deg 240deg,
      #59c29d 240deg 300deg,
      #f4e27e 300deg 360deg
    );
    animation: rotate 4s linear 0ms infinite forwards;
    animation-play-state: paused;
  }

  .avatar-border-white {
    position: absolute;
    left: calc(1 * var(--avatar-border-size));
    top: calc(1 * var(--avatar-border-size));
    width: calc(100% - 2 * var(--avatar-border-size));
    height: calc(100% - 2 * var(--avatar-border-size));
    border-radius: 50%;

    background-color: var(--color-white);
  }

  .avatar-text {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    color: var(--color-white);
    background-color: var(--chat-color);
    border-radius: 50%;
  }

  .avatar.border.animate.animating .avatar-border-multi {
    animation-play-state: running;
  }

  .avatar.border.animate:hover .avatar-border-multi {
    animation-play-state: running;
  }

  @keyframes rotate {
    100% {
      transform: rotate(1turn);
    }
  }

  @media (min-width: 701px) and (max-width: 850px) {
    .avatar:not(.large) {
      width: 4rem;
      height: 4rem;
    }
  }
</style>
