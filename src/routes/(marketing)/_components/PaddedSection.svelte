<script lang="ts">
  export let desktopOnly: boolean | undefined = undefined;
  export let vertical: boolean | undefined = undefined;
  export let backgroundColor: string | undefined = undefined;
</script>

<section class:desktopOnly class:vertical style:background-color={backgroundColor}><slot /></section>

<style>
  section {
    padding-left: 6rem;
    padding-right: 6rem;
  }

  section.vertical {
    padding-top: 6rem;
    padding-bottom: 6rem;
  }

  @media only screen and (max-width: 600px) {
    section {
      padding: 0 2rem;
    }
    section.desktopOnly {
      padding: 0;
    }
  }
</style>
