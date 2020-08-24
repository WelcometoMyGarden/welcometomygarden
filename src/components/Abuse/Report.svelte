<script>
  import { Modal, Button, Textarea, LabeledRadio } from '../UI/index';
  import Thanks from './Thanks.svelte';

  export let show;
  export let type = 'Garden'; // one of 'Garden' (default), 'Chat'
  export let objectId;
  export let by = null;

  let next = false;
  let choice;
  let problem;

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

  const handleSubmit = (e) => {
    e.preventDefault();
    problem = problem.trim();
    if (choice === choices.length && !problem) {
      return;
    }

    const report = {
      reason: choices[choice] ? choices[choice].code : 'other',
      comment: problem || null,
      object: { type, id: objectId },
      by
    };

    console.log(report);

    next = true;
    show = false;

    reset();
  };

  const reset = () => {
    choice = undefined;
    problem = undefined;
  };
</script>

<Modal bind:show ariaLabelledBy="title" let:ariaLabelledBy maxWidth="500px" on:close={reset}>
  <h2 slot="title" class="title" id={ariaLabelledBy}>Why did you report this garden?</h2>
  <form slot="body" class="container" id="report-garden" on:submit={handleSubmit}>
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
          required={choice === choices.length} />
      </div>
    </div>
  </form>
  <span slot="controls">
    <Button type="submit" uppercase form="report-garden">Next</Button>
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
</style>
