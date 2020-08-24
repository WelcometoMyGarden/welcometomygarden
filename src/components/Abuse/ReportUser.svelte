<script>
  import { Modal, Button, Textarea, LabeledRadio } from '../UI/index';
  import Thanks from './Thanks.svelte';

  export let show;
  export let reported;
  export let reporter;

  let next = false;
  let choice;
  let problem;

  show = !next && show;

  const handleSubmit = (e) => {
    e.preventDefault();
    problem = problem.trim();
    if (choice === 3 && !problem) {
      return;
    }
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
    <div class="choice">
      <LabeledRadio
        name="abuse"
        id="misbehaved"
        bind:group={choice}
        value={1}
        label="User misbehaved" />
    </div>
    <div class="choice">
      <LabeledRadio
        name="abuse"
        id="fast-traveller"
        bind:group={choice}
        value={2}
        label="Not a slow traveller" />
    </div>
    <div class="choice">
      <LabeledRadio name="abuse" id="other" bind:group={choice} value={3} label="Other" />
      <div class="textarea">
        <Textarea
          grow
          placeholder="Tell us the problem"
          name="problem"
          bind:value={problem}
          required={choice === 3} />
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
