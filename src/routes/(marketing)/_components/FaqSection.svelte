<script lang="ts">
  import { _ } from 'svelte-i18n';
  import routes from '@/lib/routes';
  import CollapsibleGroup from '@/lib/components/CollapsibleGroup.svelte';

  export let dictionaryPath: string;
</script>

<section class="faq" id="faq">
  <div class="card faq-intro">
    <h2 class="oh1 heading-underline-center">{$_('index.faq.title')}</h2>
    <p>
      {@html $_('index.faq.copy', {
        values: {
          faqLink: `<a href=${routes.FAQ}>${$_(`index.faq.faq-link-text`)}</a>`
        }
      })}
    </p>
  </div>
  <div class="faq-questions">
    <CollapsibleGroup collapsibleKey={dictionaryPath} />
  </div>
</section>
