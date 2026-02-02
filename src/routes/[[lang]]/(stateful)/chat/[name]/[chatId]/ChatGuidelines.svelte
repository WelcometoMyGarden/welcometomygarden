<script lang="ts">
  import { json, t } from 'svelte-i18n';
  // We need CSS pixel widths 20 (mobile, small) and 68 (desktop)
  // At DPR 2 that's 40 and 136
  // At DPR 3 that's 60 and 204
  import chatIcon from '$lib/assets/chat-guidelines/chat.png?w=40;68;136;204&as=run:0';
  import handIcon from '$lib/assets/chat-guidelines/hand.png?w=40;68;136;204&as=run:0';
  import plantIcon from '$lib/assets/chat-guidelines/plant.png?w=40;68;136;204&as=run:0';
  import Img from '@zerodevx/svelte-img';
  import { zip } from 'lodash-es';

  interface Props {
    hostName: string;
  }

  let { hostName }: Props = $props();

  // Combine the 3 points with 3 images
  let guidelineData = $derived(zip(Object.values($json('chat.guidelines.points')), [
    handIcon,
    chatIcon,
    plantIcon
  ]).map(([a, b]) => ({ ...a, img: b })));
</script>

<div class="chat-guidelines">
  <h3>{$t('chat.guidelines.title')}</h3>
  {#each guidelineData as { title, img }, i}
    <div class="guideline">
      <Img src={img} alt="" sizes="(max-width: 699px) 20px, 68px" class="icon-img" />
      <div class="title">{title}</div>
      <div class="description">
        {$t(`chat.guidelines.points.${i}.description`, {
          values: { hostName }
        })}
      </div>
    </div>
  {/each}
</div>

<style>
  .chat-guidelines {
    display: flex;
    flex-direction: column;
    gap: 1.8rem;
    padding: 2rem;
    border-radius: 10px;
    max-width: 524px;
    background-color: var(--color-green-light-2);
    margin: auto auto 0.75rem auto;
  }

  h3,
  .title {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-green-dark);
  }

  .guideline {
    display: grid;
    grid-template-columns: 20px auto;
    column-gap: 0.5rem;
  }

  .guideline :global(picture) {
    grid-column: 1;
    grid-row: 1;
  }

  .guideline :global(.icon-img) {
    width: 20px;
    height: auto;
  }

  .title {
    grid-column: 2;
    grid-row: 1;
    margin-bottom: 0.5rem;
  }

  .description {
    grid-column: 1 / span 2;
    grid-row: 2;
    line-height: 143.4%;
    color: var(--color-green-3);
  }

  @media screen and (min-width: 700px) {
    .chat-guidelines {
      gap: 2.8rem;
      border-radius: 2rem;
      margin: auto;
      margin-bottom: auto;
    }

    .guideline {
      grid-template-columns: 68px auto;
      row-gap: 0.4rem;
      column-gap: 1.7rem;
    }

    .description {
      grid-column: 2;
    }

    .guideline :global(picture) {
      grid-row: 1 / span 2;
    }

    .guideline :global(.icon-img) {
      width: 100%;
    }
  }
</style>
