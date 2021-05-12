<script>
  import { _ } from 'svelte-i18n';
  import Text from './Text.svelte';
  import Icon from './Icon.svelte';
  import Image from './Image.svelte';
  import { calendarIcon, clockIcon, arrowIcon } from '@/images/icons';

  export let languageAbbreviation = 'EN';
  export let title = '';
  export let src = '';
  export let date = '';
  export let time = '';
  export let href = '';
  export let group = null;

  const openLinkInNewTab = () => {
    window.open(href, '_blank');
  };
</script>

<div class="card" on:click={openLinkInNewTab}>
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
  <div class="title">
    <Text size="l" weight="bold">{title}</Text>
  </div>
  <span class="filler" />
  <div class="register-here">
    <a {href} target="_blank">
      <Text size="l" weight="bold">{$_('ui.card.register-here')}</Text>
      <div class="icon">
        <Icon icon={arrowIcon} />
      </div>
    </a>
  </div>
</div>

<style>
  .card {
    height: 44rem;
    background-color: var(--color-white);
    padding: 1rem 2rem;
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
    cursor: pointer;
  }
  .filler {
    flex-grow: 1;
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
  .title {
    padding-top: 1.5rem;
    text-align: left;
  }
  .register-here a {
    display: flex;
    align-items: center;
    padding-top: 0.5rem;
    text-decoration: underline;
  }

  @media only screen and (max-width: 1400px) {
    .card {
      height: 47rem;
    }
  }

  @media only screen and (max-width: 1000px) {
    .card {
      height: auto;
    }
  }
</style>
