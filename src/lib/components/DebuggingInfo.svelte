<script lang="ts">
  import { clickOutside } from '$lib/attachments';
  import { Capacitor } from '@capacitor/core';
  import Button from './UI/Button.svelte';
  import { Device } from '@capacitor/device';
  import { deviceId } from '$lib/stores/pushRegistrations';
  import { App } from '@capacitor/app';
  import { dev } from '$app/environment';
  import { onMount } from 'svelte';
  import { isEmpty } from 'lodash-es';
  import * as Sentry from '@sentry/sveltekit';
  const { onclose }: { onclose: () => void } = $props();

  const canvas = document.createElement('canvas');
  let webGLDiagnostics: string | undefined = $state();
  let tileFetchResult: string | undefined = $state();
  onMount(() => {
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const webGLRenderer = gl ? gl.getParameter(gl.RENDERER) : null;
      const webGLCoreDiagnostics = [
        // 1. WebGL available
        !!gl,
        // 2. renderer
        webGLRenderer,
        // 3. vendor
        gl ? gl.getParameter(gl.VENDOR) : null
      ];
      // Optional 4. unmasked renderer, if different
      const unmaskedRenderer = gl
        ? (() => {
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
          })()
        : null;
      webGLDiagnostics = [
        ...webGLCoreDiagnostics,
        ...(unmaskedRenderer !== webGLRenderer ? [unmaskedRenderer] : [])
      ] as any;
    } catch (e) {
      webGLDiagnostics = "Couldn't parse WebGL data" as any;
      Sentry.captureException(e, { level: 'info', extra: { context: 'Debug WebGL info' } });
    }
    // Mapbox fetch check
    fetch(
      `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2,mapbox.mapbox-streets-v7/12/2112/1374.vector.pbf?sku=101fnAAZvT4UF&access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`,
      {
        credentials: 'omit',
        headers: {
          Accept: '*/*'
        },
        method: 'GET',
        mode: 'cors'
      }
    )
      .then((r) => {
        const setResult = (txt: string) =>
          (tileFetchResult = `${r.status}${r.statusText.trim() ? ` ${r.statusText}` : ''}: ${txt}`);
        return r
          .text()
          .then((t: string) => setResult(`len ${t.length}`))
          .catch(() => setResult('Failed to parse text'));
      })
      .catch((e) => {
        tileFetchResult = `Error: ${e.toString()}`;
        Sentry.captureException(e, { level: 'info', extra: { context: 'Debug WebGL info' } });
      });
  });
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
        <td>Build date</td>
        <td>{__BUILD_DATE__}</td>
      </tr>
      <tr>
        <td>Host</td>
        <td>{window.location.host}{dev ? ` (dev server)` : ''}</td>
      </tr>
      {#if Capacitor.isNativePlatform()}
        {#await App.getInfo()}
          <tr>
            <td>Loading native app info...</td>
          </tr>
        {:then info}
          <tr>
            <td>App version</td>
            <td>{info.version} ({info.build})</td>
          </tr>
        {/await}
        {#await Device.getInfo()}
          <tr>
            <td>Loading native device info...</td><td></td>
          </tr>
        {:then info}
          <tr>
            <td>Device</td>
            <td>{info.manufacturer} {info.model}</td>
          </tr>
          <tr><td>Device ID</td><td>{$deviceId}</td></tr>
          <tr>
            <td>OS version</td>
            <td
              >{info.operatingSystem}
              {info.osVersion}
              {Capacitor.getPlatform() === 'android' ? `(sdk: ${info.androidSDKVersion})` : ''}
            </td>
          </tr>
          {#if Capacitor.getPlatform() === 'android'}
            <!-- On iOS, the webview version just equals the OS version, so it doesn't add anything -->
            <tr>
              <td>Webview version</td>
              <td>{info.webViewVersion}</td>
            </tr>
          {/if}
          <tr>
            <td>Memory used</td>
            <td>{Math.round((info.memUsed ?? 0) / 1048576)} MB</td>
          </tr>
        {/await}
      {/if}
      {#if !isEmpty(webGLDiagnostics)}
        <tr>
          <td>WebGL</td>
          <td>{JSON.stringify(webGLDiagnostics)}</td>
        </tr>
      {/if}
      {#if tileFetchResult}
        <tr>
          <td>Tile fetch</td>
          <td>{tileFetchResult}</td>
        </tr>
      {/if}
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
