<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { lockIcon } from '$lib/images/icons';
  import ShowPasswordIcon from './ShowPasswordIcon.svelte';
  import TextInput from './TextInput.svelte';
  import type { LocalizedMessage } from '$lib/util/translation-helpers';

  let isPasswordVisible = $state(false);

  let {
    value = $bindable(),
    autocomplete = 'current-password',
    showIcon = true,
    onblur,
    inset,
    error
  }: {
    value: string | undefined;
    autocomplete: AutoFill;
    showIcon?: boolean;
    onblur?: () => void;
    /**
     * See TextInput
     */
    inset?: boolean;
    error?: LocalizedMessage | null | undefined;
  } = $props();
</script>

<label for="password">{$_('generics.password')}</label>
<TextInput
  icon={showIcon ? lockIcon : undefined}
  type={isPasswordVisible ? 'text' : 'password'}
  name="password"
  id="password"
  {inset}
  {autocomplete}
  {onblur}
  {error}
  bind:value
>
  {#snippet actionIcon()}
    <ShowPasswordIcon bind:isPasswordVisible />
  {/snippet}
</TextInput>

<style>
  label {
    display: block;
  }
</style>
