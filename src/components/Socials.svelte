<script>
  export let medium = true;
  export let small = false;
</script>

<ul class="socials" class:medium class:small>
  <li>
    <a href="https://www.facebook.com/Welcome2mygarden/" target="_blank">
      <img src="/images/icons/facebook.svg" alt="Facebook" />
    </a>
  </li>
  <li>
    <a href="https://opencollective.com/welcometomygarden" target="_blank">
      <img src="/images/icons/open-collective.svg" alt="Open Collective" />
    </a>
  </li>
  <li>
    <a href="https://github.com/welcometomygarden" target="_blank">
      <img src="/images/icons/github.svg" alt="GitHub" />
    </a>
  </li>
  <li>
    <a
      href="https://join.slack.com/t/welcometomygarden/shared_invite/zt-f31i37dj-_zFgnfe40B6EexJuB2f_~w"
      target="_blank"
    >
      <img src="/images/icons/slack.svg" alt="Slack" />
    </a>
  </li>
  <li>
    <a href="mailto:support@welcometomygarden.org" target="_blank">
      <img src="/images/icons/email.svg" alt="Mail" />
    </a>
  </li>
</ul>

<style>
  .socials {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    width: 100%;
    z-index: -1;
  }

  .socials li {
    display: flex;
  }

  .socials.medium li a {
    height: 2.5rem;
    width: 2.5rem;
  }

  .socials.small li a {
    height: 2rem;
    width: 2rem;
  }

  .socials li img {
    width: 100%;
    height: 100%;
  }

  .socials li:last-child {
    margin-right: 0;
  }
</style>
