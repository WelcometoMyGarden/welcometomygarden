<script>
  import { onMount } from 'svelte';
  import Collapsible from '../components/Collapsible.svelte';

  let activeCollapsible = null;
  const setActiveCollapsible = e => {
    const id = Number(e.target.id);
    id === activeCollapsible ? (activeCollapsible = null) : (activeCollapsible = id);
  };
</script>

<div class="content">
  <h2>Rules</h2>
  <div class="title-line-break" />
  <p>
    Here’s how Welcome to My Garden works. Make sure to read the rules before starting your
    adventure! After all, this platform will only work well if we all play by the rules.
  </p>
  <div class="rules">
    <Collapsible id={0} onClick={setActiveCollapsible} open={activeCollapsible === 0}>
      <h3 slot="title">Who is Welcome To My Garden for?</h3>
      <p slot="content">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Similique eaque obcaecati laborum
        rerum beatae culpa itaque voluptate corrupti repudiandae ea esse quas harum nam, sunt non
        iure minima modi blanditiis?
      </p>
    </Collapsible>
    <Collapsible id={1} onClick={setActiveCollapsible} open={activeCollapsible === 1}>
      <h3 slot="title">Who is Welcome To My Garden for?</h3>
      <p slot="content">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Similique eaque obcaecati laborum
        rerum beatae culpa itaque voluptate corrupti repudiandae ea esse quas harum nam, sunt non
        iure minima modi blanditiis?
      </p>
    </Collapsible>
  </div>
</div>

<style>
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 60rem;
    margin: 0 auto;
  }
  h2 {
    font-size: 2.4rem;
    margin: 1.6rem 0;
  }
  .title-line-break {
    border-bottom: 0.3rem solid var(--color-orange);
    max-width: 12rem;
    margin: 0.4rem 0 2.4rem 0;
  }
  .rules {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
  }
</style>
