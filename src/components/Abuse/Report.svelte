<script>
  import report, { findAll } from '@/api/report.js';
  import { Modal, Button, Textarea, LabeledRadio } from '../UI/index';
  import Thanks from './Thanks.svelte';

  export let show;
  export let type = 'Garden'; // one of 'Garden' (default), 'Chat'
  export let object;
  export let offender;
  export let claimant;

  let next = false;
  let choice;
  let problem;
  let reporting = false;
  let formError = '';
  let textareaError;
  let textareaValid = true;

  show = !next && show;

  const gardenChoices = [
    {
      code: 'ask-money',
      label: 'The host asks money'
    },
    { code: 'misplaced', label: 'The garden is in the wrong place' }
  ];

  const chatChoices = [
    { code: 'misbehaved', label: 'User misbehaved' },
    { code: 'fast-traveller', label: 'Not a slow traveller' }
  ];

  let choices = null;
  if (type === 'Garden') {
    choices = gardenChoices;
  } else if (type === 'Chat') {
    choices = chatChoices;
  }

  const validateTextarea = () => {
    problem = problem.trim();

    if (choice === choices.length && !problem) {
      textareaError = 'Please give us more info';
      textareaValid = false;
    }

    return textareaValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!choice && choice !== 0) {
      formError = 'You need to make a choice';
      return;
    }

    if (!validateTextarea()) return;

    reporting = true;

    await report({
      reason: choices[choice] ? choices[choice].code : 'other',
      comment: problem || null,
      type,
      object,
      claimant,
      offender: type === 'Garden' && !offender ? object : null
    });

    next = true;
    show = false;
    reporting = false;

    reset();
  };

  const reset = () => {
    choice = undefined;
    problem = undefined;
    formError = undefined;
    textareaError = undefined;
  };
</script>

<Modal bind:show ariaLabelledBy="title" let:ariaLabelledBy maxWidth="500px" on:close={reset}>
  <h2 slot="title" class="title" id={ariaLabelledBy}>Why did you report this garden?</h2>
  <form
    slot="body"
    class="container"
    id="report-garden"
    on:submit={(e) => e.preventDefault()}
    on:change={() => (formError = undefined)}
    novalidate>
    {#each choices as { code, label }, i}
      <div class="choice">
        <LabeledRadio name="abuse" id={code} bind:group={choice} value={i} {label} />
      </div>
    {/each}
    <div class="choice">
      <LabeledRadio
        name="abuse"
        id="other"
        bind:group={choice}
        value={choices.length}
        label="Other" />
      <div class="textarea">
        <Textarea
          grow
          placeholder="Tell us the problem"
          name="problem"
          bind:value={problem}
          required={choice === choices.length}
          bind:error={textareaError}
          bind:valid={textareaValid}
          on:blur={validateTextarea}
          minLength={10}
          maxLength={300} />
      </div>
      <p class="hint" class:invalid={true}>{formError || ''}</p>
    </div>
  </form>
  <span slot="controls">
    <Button
      type="submit"
      uppercase
      form="report-garden"
      disabled={reporting}
      on:click={handleSubmit}>
      Next
    </Button>
  </span>
</Modal>
<Thanks bind:show={next} />

<style>
  .container {
    margin-left: -4rem;
    margin-right: -4rem;
  }

  .choice {
    padding: 10px 4rem;
  }

  .choice:not(:first-of-type) {
    border-top: 1px solid rgba(229, 229, 229, 0.6);
  }

  .textarea {
    margin-top: 5px;
    margin-left: 30px;
  }

  .hint.invalid {
    color: var(--color-danger);
  }
</style>
