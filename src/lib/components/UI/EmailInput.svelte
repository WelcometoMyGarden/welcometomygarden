<script lang="ts">
  import { emailIcon } from '$lib/images/icons';
  import { _ } from 'svelte-i18n';
  import type { LocalizedMessage } from '$lib/util/translation-helpers';
  import TextInput from './TextInput.svelte';
  import type { MailSuggestion } from '@zootools/email-spell-checker/dist/lib/types';
  import suggestEmailFix from '$lib/util/suggest-email-fix';
  import Button from './Button.svelte';

  let emailSuggestion: MailSuggestion | undefined = $state();

  let {
    name = 'email',
    id = 'email',
    placeholder,
    value = $bindable(),
    autocomplete = 'email',
    required = false,
    onblur,
    suggestFix = true,
    inset,
    error,
    labelKey
  }: {
    name?: string;
    id?: string;
    placeholder?: string;
    value: string | undefined;
    autocomplete?: AutoFill;
    showIcon?: boolean;
    suggestFix?: boolean;
    required?: boolean;
    onblur?: (e: FocusEvent) => void;
    /**
     * See TextInput
     */
    inset?: boolean;
    error?: LocalizedMessage | null | undefined;
    labelKey?: string;
  } = $props();

  $effect(() => {
    // Clear the email suggestion if the user typed it themselves
    if (suggestFix && emailSuggestion && value === emailSuggestion.full) {
      emailSuggestion = undefined;
    }
  });
</script>

{#snippet customError()}
  {#if emailSuggestion?.full}
    {$_('register.validate.email-suggestion')}
    <Button
      link
      inverse
      type="button"
      onclick={() => {
        value = emailSuggestion!.full;
        emailSuggestion = undefined;
      }}>{emailSuggestion.full}</Button
    >{$_('generics.question-mark')}
  {/if}
{/snippet}

<label for="email">{$_(labelKey ?? 'generics.email')}</label>
<TextInput
  icon={emailIcon}
  {autocomplete}
  {required}
  {placeholder}
  autotrim
  onblur={(e) => {
    if (suggestFix && typeof value === 'string') {
      emailSuggestion = suggestEmailFix(value);
      error = null;
    }
    onblur?.(e);
  }}
  type="email"
  {name}
  {id}
  customError={suggestFix && !!emailSuggestion?.full ? customError : undefined}
  {inset}
  {error}
  bind:value
></TextInput>
