<script lang="ts">
  import { clickOutside } from '$lib/attachments';
  import Button from './UI/Button.svelte';
  const { onclose }: { onclose: () => void } = $props();
</script>

<div class="debugging-info" {@attach clickOutside} onclickoutside={onclose}>
  <table>
    <tbody>
      <tr>
        <td>WTMG version</td>
        <td>{__COMMIT_HASH__}</td>
      </tr>
      <tr>
        <td>Commit message</td>
        <td>{__COMMIT_MESSAGE__}</td>
      </tr>
      <tr>
        <td>Commit date</td>
        <td>{__COMMIT_DATE__}</td>
      </tr>
      <tr>
        <td>Build date</td>
        <td>{__BUILD_DATE__}</td>
      </tr>
      <tr>
        <td>Host</td>
        <td>{window.location.host}</td>
      </tr>
    </tbody>
  </table>
  <p>You have shown debugging information by tapping the WTMG logo 3 times.</p>
  <Button
    xxsmall
    onclick={async () => {
      await fetch(window.location.toString(), {
        headers: {
          pragma: 'no-cache',
          'cache-control': 'no-cache'
        }
      });
      window.location.reload();
    }}>Bust cache</Button
  >
</div>

<style>
  div {
    background-color: white;
    z-index: 1;
    position: relative;
    margin: calc(env(safe-area-inset-top, 0px) + 1rem) auto 1rem auto;
    border-radius: 1rem;
    border: 1px solid #eee;
    padding: 1rem;
    width: 100%;
  }

  div.debugging-info p {
    line-height: 1.4;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
  }

  tr:not(:last-child) {
    border-bottom: 1px solid #f0f0f0;
  }

  td {
    padding: 0.5rem 0;
  }

  td:first-child {
    padding-right: 1rem;
    font-weight: 500;
  }
</style>
