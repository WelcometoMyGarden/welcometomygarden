<script lang="ts">
  interface Props {
    medium?: boolean;
    small?: boolean;
  }

  let { medium = true, small = false }: Props = $props();

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
      name: 'LinkedIn',
      link: 'https://www.linkedin.com/company/welcometomygarden/',
      iconFileName: 'linkedin.svg'
    },
    {
      name: 'Instagram',
      link: 'https://www.instagram.com/welcometomygarden_org/',
      iconFileName: 'instagram.svg'
    }
  ];
</script>

<ul class="socials" class:medium class:small>
  {#each socials as { name, link, iconFileName }}
    <li>
      <a href={link} target="_blank" rel="noopener">
        <img src="/images/icons/{iconFileName}" alt={name} />
      </a>
    </li>
  {/each}
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
