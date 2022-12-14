<script lang="ts">
  import { SUPPORT_EMAIL } from '../constants';

  export let medium = true;
  export let small = false;

  type SocialLink = {
    name: string;
    link: string;
    iconFileName: string;
  };

  const socials: SocialLink[] = [
    {
      name: 'Facebook',
      link: 'https://www.facebook.com/Welcome2mygarden/',
      iconFileName: 'facebook.svg'
    },
    {
      name: 'Instagram',
      link: 'https://www.instagram.com/welcometomygarden_org/',
      // TODO replace icon
      iconFileName: 'facebook.svg'
    },
    {
      name: 'Twitter',
      // TODO do we even have a twitter for?
      link: 'https://twitter.com/slowbytravel',
      // TODO replace icon
      iconFileName: 'facebook.svg'
    },
    {
      name: 'LinkedIn',
      // TODO do we even have a twitter handle for WTMG?
      link: 'https://www.linkedin.com/company/welcometomygarden/',
      // TODO replace icon
      iconFileName: 'facebook.svg'
    }
  ];
</script>

<ul class="socials" class:medium class:small>
  {#each socials as { name, link, iconFileName }}
    <li>
      <a href={link} target="_blank" rel="noopener noreferrer">
        <img src="/images/icons/{iconFileName}" alt={name} />
      </a>
    </li>
  {/each}
  <!-- TODO: totally remove these? -->
  <!-- <li>
    <a href="https://github.com/welcometomygarden" target="_blank" rel="noreferrer">
      <img src="/images/icons/github.svg" alt="GitHub" />
    </a>
  </li> -->
  <!-- <li>
    <a
      href="https://join.slack.com/t/welcometomygarden/shared_invite/zt-f31i37dj-_zFgnfe40B6EexJuB2f_~w"
      target="_blank"
      rel="noreferrer"
    >
      <img src="/images/icons/slack.svg" alt="Slack" />
    </a>
  </li> -->
  <!-- Todo: remove mail icon? -->
</ul>

<style>
  .socials {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    width: 100%;
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
