<script>
  import Button from '@/lib/components/UI/Button.svelte';

  import routes from '@/lib/routes';
  import Heading from '../_components/Heading.svelte';
  import MarketingBlock from '../_components/MarketingBlock.svelte';
  import PaddedSection from '../_components/PaddedSection.svelte';
  import Features from '../_sections/Features.svelte';
  import InnerVideoSection from '../_sections/VideoSection.svelte';
  import SupportReasons from '../_sections/SupportReasons.svelte';
</script>

<PaddedSection>
  <MarketingBlock backgroundColor="var(--color-green-light)" centered>
    <h1>Superfans keep us going</h1>
    <p>
      We want to create a community space where people can meet and talk, both online and offline.
    </p>
  </MarketingBlock>
</PaddedSection>
<PaddedSection>
  <InnerVideoSection>
    <h1>Why become a Superfan</h1>
    <p>
      If you are truly passionate about slow travel and you want to support WTMG’s mission, then
      perhaps you should become a Superfan! With your financial support, we can make WTMG
      financially stable and keep it free for everyone to use! You pay only what you can afford.
    </p>
    <p>
      We’re a small team of five and have invested a lot of our personal time, energy and money in
      this initiative. We started off as a small citizen initiative in Belgium, but we are growing
      into something bigger. It’s clear that WTMG is here to stay, and we want to make sure we can
      survive as well as thrive. And that’s where you come in!
    </p>
    <Button href={routes.BECOME_SUPERFAN}>Become a Superfan</Button>
  </InnerVideoSection>
</PaddedSection>
<PaddedSection backgroundColor="var(--color-beige-light)" vertical>
  <Heading caption="What’s in it for you?">Our Superfans deserve a massive thank you</Heading>
  <p>
    We can’t do without your support! As a Superfan, you will get access to some great new slow
    travel tools! These will make planning your slow travel adventures even easier. This is our way
    to say thank you for believing in us.
  </p>
  <Features />
  <Heading caption="WTMG for everyone">Thanks to your support, we can...</Heading>
  <!-- TODO: change content -->
  <SupportReasons />
  <Button href={routes.BECOME_SUPERFAN}>Become a Superfan</Button>
</PaddedSection>
<PaddedSection desktopOnly>
  <MarketingBlock centered>
    <h1>Meet the team</h1>
    <p>
      So, who’s behind WTMG? We’re a small team of five slow travel enthusiasts and we want to help
      others embark on their slow travel adventures too!Í
    </p>
    <Button href={routes.ABOUT_US}>Meet the Team</Button>
  </MarketingBlock>
</PaddedSection>
<PaddedSection desktopOnly backgroundColor="var(--color-green-light)">
  <MarketingBlock centered>
    <h1>Testimonials</h1>
  </MarketingBlock>
</PaddedSection>
<PaddedSection>
  <h1>FAQ: todo</h1>
</PaddedSection>
<PaddedSection>
  <div class="more-questions">
    <h1>Still have a question?</h1>
    <Button>Contact Us TODO</Button>
  </div>
</PaddedSection>

<style>
  div.more-questions {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>
