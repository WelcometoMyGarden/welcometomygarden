<script>
  import { Modal, Button, Textarea } from '../UI/index';
  import Thanks from './Thanks.svelte';
  export let show;
  export let garden;

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
      <label for="ask-money">
        <input type="radio" name="abuse" id="ask-money" required bind:group={choice} value={1} />
        <span class="text">The host asks money</span>
      </label>
    </div>
    <div class="choice">
      <label for="misplaced">
        <input type="radio" name="abuse" id="misplaced" required bind:group={choice} value={2} />
        <span class="text">The garden is in the wrong place</span>
      </label>
    </div>
    <div class="choice">
      <label for="other">
        <input type="radio" name="abuse" id="other" required bind:group={choice} value={3} />
        <span class="text">Other</span>
      </label>
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

  label {
    display: flex;
    align-items: center;
    padding: 10px 0;
  }

  .text {
    display: block;
    padding-left: 10px;
    padding-top: 5px;
  }

  .textarea {
    margin-top: 5px;
    margin-left: 30px;
  }

  input:required {
    box-shadow: none !important;
  }

  input:invalid {
    box-shadow: none !important;
  }
</style>
