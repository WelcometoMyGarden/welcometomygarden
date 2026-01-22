<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<!--
  @component

  This element needs its parent to have a concrete width.
  Remember to scale
-->
<div class="outer">
  <div class="inner">
    {@render children?.()}
  </div>
</div>

<style>
  /* How this works
  ------------------

    This aspect ratio hack works because
    padding values are based on the container's width

    The outer class can't hold content because its height is 0.
  */
  div.outer {
    height: 0;
    width: 100%;
    padding-bottom: 100%;
    position: relative;
  }

  /* You can't set `height: 100%` here,
    because that would be relative to the outer height (= 0)
  */
  div.inner {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  /* Consider switching to aspect-ratio, maybe removing this component
    https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio
    https://chromereleases.googleblog.com/2021/01/stable-channel-update-for-desktop_19.html

    But that might remove support for browsers (e.g. old phones) that did not get updates
    since 2021.
    */
</style>
