<script>
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
</script>

<div class="card">
  <div class="languageAbbreviation">
    <div class="badge">{languageAbbreviation}</div>
  </div>
  <div class="image">
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
  <div class="registerHere">
    <a {href}>
      <Text weight="bold">Register here</Text>
      <div class="icon">
        <Icon icon={arrowIcon} />
      </div>
    </a>
  </div>
</div>

<style>
  .card {
    background-color: var(--color-white);
    padding: 1rem 2rem;
    margin-bottom: 2rem;
  }
  .icon {
    width: 2rem;
    height: 1.5rem;
  }
  .languageAbbreviation {
    padding-bottom: 1rem;
    display: flex;
    justify-content: flex-end;
  }
  .badge {
    background-color: var(--color-orange);
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
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
  .date,
  .time {
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
  }
  .title {
    padding: 1.5rem 0;
    text-align: left;
  }
  .registerHere a {
    display: flex;
    align-items: center;
    padding-top: 0.5rem;
    text-decoration: underline;
  }
</style>
