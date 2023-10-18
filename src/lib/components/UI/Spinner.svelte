<div class="lds-ellipsis">
  <div />
  <div />
  <div />
  <div />
</div>

<!--
   Based on a spinner from https://loading.io/css/ License: CC0
   All px sizes adjusted to em, based on a 14px font-size.
   Top level element styles heavily changed to center the spinner into its parent.
-->

<style>
  .lds-ellipsis {
    font-size: 0.8em;
    display: inline-block;
    position: absolute;
    width: 5.7em;
    height: 1.7em;
    /* center with absolute positioning */
    bottom: 0;
    top: 0;
    left: 0;
    right: 0;
    margin: auto;
  }
  .lds-ellipsis div {
    position: absolute;
    top: 24%;
    width: 0.92em;
    height: 0.92em;
    border-radius: 50%;
    background: #fff;
    animation-timing-function: cubic-bezier(0, 1, 1, 0);
  }
  .lds-ellipsis div:nth-child(1) {
    left: 0.57em;
    animation: lds-ellipsis1 0.6s infinite;
  }
  .lds-ellipsis div:nth-child(2) {
    left: 0.57em;
    animation: lds-ellipsis2 0.6s infinite;
  }
  .lds-ellipsis div:nth-child(3) {
    left: 2.28em;
    animation: lds-ellipsis2 0.6s infinite;
  }
  .lds-ellipsis div:nth-child(4) {
    left: 4em;
    animation: lds-ellipsis3 0.6s infinite;
  }
  @keyframes lds-ellipsis1 {
    0% {
      transform: scale(0);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes lds-ellipsis3 {
    0% {
      transform: scale(1);
    }
    100% {
      transform: scale(0);
    }
  }
  @keyframes lds-ellipsis2 {
    0% {
      transform: translate(0, 0);
    }
    100% {
      transform: translate(1.71em, 0);
    }
  }
</style>
