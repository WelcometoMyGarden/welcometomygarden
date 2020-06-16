<script>
  /* Reworked version of https://github.com/beyonk-adventures/svelte-notifications */
  import { notification } from '@/stores/notification';
  import { onDestroy } from 'svelte';

  export let timeout = 3000;

  let count = 0;
  let toasts = [];
  let unsubscribe;

  const animateOut = (node, { delay = 0, duration = 300 }) => ({
    delay,
    duration,
    css: t =>
      `opacity: ${(t - 0.5) * 1}; transform-origin: top right; transform: scaleX(${(t - 0.5) * 1});`
  });

  const createToast = (msg, intent, to) => {
    toasts = [
      {
        id: count,
        msg,
        intent,
        timeout: to || timeout,
        width: '100%'
      },
      ...toasts
    ];
    count = count + 1;
  };

  unsubscribe = notification.subscribe(value => {
    if (!value) return;
    createToast(value.message, value.type, value.timeout);
    notification.set();
  });

  onDestroy(unsubscribe);

  const removeToast = id => {
    toasts = toasts.filter(t => t.id != id);
  };
</script>

<ul class="toasts">
  {#each toasts as toast (toast.id)}
    <li class="toast {toast.intent}" out:animateOut on:click={() => removeToast(toast.id)}>
      <div class="content">{toast.msg}</div>
      <div
        class="time"
        style="animation-duration: {toast.timeout}ms;"
        on:animationend={() => removeToast(toast.id)} />
    </li>
  {/each}
</ul>

<style>
  .toasts {
    list-style: none;
    position: fixed;
    top: calc(var(--height-nav));
    right: 0;
    padding: 0;
    margin: 0;
    z-index: 200;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  @media screen and (max-width: 700px) {
    .toasts {
      top: 0;
    }
  }

  .toast {
    position: relative;
    margin: 0.5rem 1rem;
    font-weight: bold;
    font-size: 1.5rem;
    min-width: 15rem;
    max-width: 80vw;
    position: relative;
    animation: animate-in 350ms forwards;
    color: #fff;
  }

  .toast.info {
    background: var(--color-info);
  }
  .toast.warning {
    background: var(--color-warning);
  }
  .toast.danger {
    background: var(--color-danger);
  }
  .toast.success {
    background: var(--color-success);
  }

  .toast > .content {
    padding: 1rem;
    display: block;
    font-weight: bold;
  }

  .toast > .time {
    position: absolute;
    bottom: 0;
    background-color: rgb(0, 0, 0, 0.3);
    height: 0.6rem;
    width: 100%;
    animation-name: shrink;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
  }

  .toast:before,
  .toast:after {
    content: '';
    position: absolute;
    z-index: -1;
    top: 50%;
    bottom: 0;
    left: 1rem;
    right: 1rem;
    border-radius: 10rem / 1rem;
  }

  .toast:after {
    right: 1rem;
    left: auto;
    transform: skew(8deg) rotate(3deg);
  }

  @keyframes animate-in {
    0% {
      max-width: 0;
      opacity: 0;
      transform: scale(1.15) translateY(2rem);
    }
    100% {
      max-width: 80vw;
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes shrink {
    0% {
      width: 100%;
    }
    100% {
      width: 0;
    }
  }
</style>
