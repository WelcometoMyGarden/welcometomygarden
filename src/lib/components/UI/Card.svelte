<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Text from './Text.svelte';
  import Icon from './Icon.svelte';
  import Image from './Image.svelte';
  import { calendarIcon, clockIcon, arrowIcon } from '$lib/images/icons';

  interface Props {
    languageAbbreviation?: string;
    title?: string;
    src?: string;
    date?: string;
    time?: string;
    href?: string;
    group?: any;
  }

  let {
    languageAbbreviation = 'EN',
    title = '',
    src = '',
    date = '',
    time = '',
    href = '',
    group = null
  }: Props = $props();

  const openLinkInNewTab = () => {
    window.open(href, '_blank');
  };
</script>

<button class="button-container card-container fixed-height" onclick={openLinkInNewTab}>
  <article class="card fixed-height">
    <div class="badges">
      <div class="badge">{languageAbbreviation}</div>
      {#if group}
        <div class="badge">{group}</div>
      {/if}
    </div>
    <div class="images">
      <Image {src} alt={title} rounded={false} />
    </div>
    <div class="when">
      <div class="date">
        <div class="icon">
          <Icon icon={calendarIcon} />
        </div>
        <Text size="m">{date}</Text>
      </div>
      <div class="time">
        <div class="icon">
          <Icon icon={clockIcon} />
        </div>
        <Text size="m">{time}</Text>
      </div>
    </div>
    <div class="content">
      <div class="title">
        <h4>{title}</h4>
      </div>
      <div class="register-here">
        <a {href} target="_blank">
          <span class="register-here-text">{$_('ui.card.register-here')}</span>
          <div class="icon">
            <Icon icon={arrowIcon} />
          </div>
        </a>
      </div>
    </div>
  </article>
</button>

<style>
  .card-container {
    display: block;
    margin-bottom: 2rem;
    background-color: var(--color-white);
  }

  .card {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    color: var(--color-green);
  }

  .icon {
    width: 2rem;
    height: 1.5rem;
  }

  .badges {
    padding-bottom: 1rem;
    display: flex;
    flex-direction: row-reverse;
    justify-content: space-between;
  }

  .badge {
    background-color: var(--color-orange-light);
    color: var(--color-white);
    border-radius: 4rem;
    padding: 0.5rem 1rem;
    font-size: 1.4rem;
    line-height: 1.5rem;
    font-family: var(--fonts-titles);
  }

  .when {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding-right: 0.5rem;
  }

  .date,
  .time {
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
  }

  .content {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .title {
    padding-top: 1.5rem;
    text-align: left;
  }

  h4 {
    font-weight: bold;
    font-size: 1.8rem;
    line-height: 2.6rem;
  }

  .register-here a {
    display: flex;
    align-items: center;
    padding-top: 1rem;
    text-decoration: underline;
  }

  .register-here-text {
    font-weight: bold;
    font-size: 1.5rem;
  }

  .fixed-height {
    height: 43rem;
  }

  @media only screen and (max-width: 1400px) {
    .fixed-height {
      height: 47rem;
    }
  }

  @media only screen and (max-width: 1000px) {
    .fixed-height {
      height: auto;
    }
  }

  @media only screen and (max-width: 500px) {
    h4 {
      font-weight: bold;
      font-size: 1.6rem;
      line-height: 2.3rem;
    }

    .register-here-text {
      font-size: 1.4rem;
    }
  }
</style>
