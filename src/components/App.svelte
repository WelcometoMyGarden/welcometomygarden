<script>
  import { Router } from '@sveltech/routify';
  import { routes } from '@sveltech/routify/tmp/routes';
</script>

<Router {routes} />

<style type="text/scss">
  @import '../style/variables';

  @each $size in map-keys($spacers) {
    @each $direction in 't', 'b', 'l', 'r', 'x', 'y', '' {
      $value: map-get($spacers, $size);

      @if $direction == 'x' {
        :global(.m#{$direction}-#{$size}) {
          margin-left: $value;
          margin-right: $value;
        }
      } @else if $direction == 'y' {
        :global(.m#{$direction}-#{$size}) {
          margin-top: $value;
          margin-bottom: $value;
        }
      } @else if $direction == 't' {
        :global(.m#{$direction}-#{$size}) {
          margin-top: $value;
        }
      } @else if $direction == 'b' {
        :global(.m#{$direction}-#{$size}) {
          margin-bottom: $value;
        }
      } @else if $direction == 'l' {
        :global(.m#{$direction}-#{$size}) {
          margin-left: $value;
        }
      } @else if $direction == 'r' {
        :global(.m#{$direction}-#{$size}) {
          margin-right: $value;
        }
      } @else if $direction == '' {
        :global(.m-#{$size}) {
          margin: $value;
        }
      }
    }
  }
</style>
