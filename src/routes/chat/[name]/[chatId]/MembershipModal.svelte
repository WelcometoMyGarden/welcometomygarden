<script lang="ts">
  import { Button, Modal } from '$lib/components/UI';
  import { onMount } from 'svelte';
  import MembershipPricing from './MembershipPricing.svelte';
  export let show = false;
  let showSurvey = false;
  let surveyFilled = false;

  onMount(() => {
    // Undocumented, but Tally sends a MessageEvent from within the iframe
    // https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent
    // https://tallyforms.slack.com/archives/C01A5DUTXS6/p1684473467300459
    window.addEventListener('message', (e) => {
      if (e && e.data && e.data.includes('Tally.FormSubmitted')) {
        surveyFilled = true;
      }
    });
  });

  $: if (surveyFilled) {
    // Hide modal
    show = false;
  }
</script>

<Modal
  bind:show
  closeButton={false}
  closeOnEsc={false}
  closeOnOuterClick={false}
  maxWidth="700px"
  radius={true}
  center={true}
  stickToBottom={false}
  nopadding={false}
  ariaLabelledBy="title"
>
  <div slot="title">WTMG Membership</div>
  <div slot="body">
    {#if showSurvey}
      <div class="free-survey">
        <iframe
          data-tally-src="https://tally.so/embed/w54zbd?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
          loading="lazy"
          width="100%"
          height="173"
          frameborder="0"
          marginheight="0"
          marginwidth="0"
          title="[test] Why don't you want to contribute?"
        /><script>
          var d = document,
            w = 'https://tally.so/widgets/embed.js',
            v = function () {
              'undefined' != typeof Tally
                ? Tally.loadEmbeds()
                : d.querySelectorAll('iframe[data-tally-src]:not([src])').forEach(function (e) {
                    e.src = e.dataset.tallySrc;
                  });
            };
          if ('undefined' != typeof Tally) v();
          else if (d.querySelector('script[src="' + w + '"]') == null) {
            var s = d.createElement('script');
            (s.src = w), (s.onload = v), (s.onerror = v), d.body.appendChild(s);
          }
        </script>
      </div>
    {:else}
      <div class="superfan-presentation">
        <p>We ask travellers to become a member to make WTMG possible</p>
        <h3>What's included in a membership?</h3>
        <ul>
          <li>Full access to our network</li>
          <li>Full access to our community space</li>
          <li>A future for WTMG</li>
        </ul>
        <h3>Choose the pricing level that fits you best</h3>
        <MembershipPricing />
        <hr />
        <Button
          inverse
          link
          on:click={() => {
            showSurvey = true;
          }}>I don't want to contribute</Button
        >
      </div>
    {/if}
  </div>
</Modal>

<style>
  ul {
    list-style-type: initial;
    list-style-position: inside;
  }

  h3 {
    font-size: 1.4rem;
    font-weight: 600;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
</style>
