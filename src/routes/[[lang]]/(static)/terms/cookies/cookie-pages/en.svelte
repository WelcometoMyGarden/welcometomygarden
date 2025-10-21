<script lang="ts">
  import routes from '$lib/routes';
  import { lr } from '$lib/util/translation-helpers';
</script>

<h2>Cookie policy</h2>
<h3>1. What Are Cookies</h3>
<p>
  As is common practice with almost all professional websites, this site uses cookies and other
  website data storage technologies, such as Web Storage and IndexedDB, hereafter also referred to
  as just “cookies”.
</p>
<p>
  Cookies store tiny pieces of information on your device, so our website can remember them the next
  time you visit. This page describes what information our cookies store, why we need them, and how
  we use them.
</p>
<p>We will also share how you can prevent these cookies from being stored.</p>
<h3>2. Disabling Cookies</h3>
<p>
  You can prevent cookies being downloaded by adjusting your browser settings (see the Help menu of
  your browser to find out how to do this). Please be aware that disabling cookies might affect the
  functionality of this and many other websites that you visit. Disabling cookies for our site in
  particular will for example disable the ability to log in.
</p>
<p>
  If you are concerned about your online privacy, we recommend using a browser extension like <a
    href="https://addons.mozilla.org/en-US/firefox/addon/privacy-badger17/">Privacy Badger</a
  >
  (Firefox), <a href="https://www.ghostery.com/ghostery-ad-blocker">Ghostery</a> (many browsers) or
  <a href="https://ublockorigin.com/">uBlock Origin</a> (many browsers).
</p>
<h3>3. The Cookies We Set</h3>
<p>
  When you are a new visitor to our website, we try to only set the cookies strictly necessary to
  provide the services of <span class="notranslate">Welcome To My Garden</span>. When possible, we
  make use of session cookies: cookies that expire automatically after you close your browser.
</p>
<p>
  <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies">HTTP Cookies</a>
  are the main storage mechanism for cookies. We set the following HTTP cookies in response to certain
  actions you take:
</p>
<table>
  <thead>
    <tr>
      <th>Cookie name</th>
      <th>When is it set?</th>
      <th>Purpose</th>
      <th>Duration</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>car-notice-dismissed</td>
      <td>When you click away the warning against car travel on our map.</td>
      <td>To prevent showing you the notice again.</td>
      <td>1 year</td>
    </tr>
    <tr>
      <td>superfan-dismissed</td>
      <td>When you click away the notice of the Superfan program on our map.</td>
      <td>To prevent showing you the notice again.</td>
      <td>1 month</td>
    </tr>
    <tr>
      <td>lang</td>
      <td>When you indicate you want to a site language other than your browser language.</td>
      <td>To provide the website in your requested language.</td>
      <td>Indefinitely</td>
    </tr>
  </tbody>
</table>
<p>
  <a
    href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API"
    >Web storage</a
  >
  is an alternative technology to store information in your browser, we set these pieces of information
  automatically:
</p>
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>When is it set?</th>
      <th>How long does it stay?</th>
      <th>Purpose</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>mapbox.eventData.uuid</td>
      <td>When you load the WTMG map with gardens.</td>
      <td>Session</td>
      <td>
        Our essential map service provider https://www.mapbox.com/ stores this anonymous browser
        user identifier, and sends it to Mapbox servers when you load a map on our website. Our own
        web application code clears any remaining identifiers of this type when you load our
        website, which essentially makes it a session cookie. We have inquired Mapbox for the
        purpose of this identifier.
      </td>
    </tr>
    <tr>
      <td>sveltekit:scroll</td>
      <td>When you navigate to a different page.</td>
      <td>Session</td>
      <td>
        Used to remember the old scroll position of the page if you navigate to the previous page in
        your browser. This is never sent to any web server.
        <a
          href="https://github.com/sveltejs/kit/blob/36b0168dfa487ad27c223090345e7d8d0ddaefff/packages/kit/src/runtime/client/client.js#L37-L40."
          >More info on this web page.</a
        >
      </td>
    </tr>
  </tbody>
</table>
<p>
  If you create an account with us, or access our map, then our service provider Firebase will use
  website data such as local storage or IndexedDB for the management of the signup process, to keep
  you logged in, and for ensuring the application can function properly. Firebase has a page
  detailing
  <a
    href="https://firebase.google.com/support/privacy/#examples-end-user-data-processed-by-firebase"
    >what kind of data it stores</a
  >. Keep in mind that from Firebase, we only use the services “Cloud Functions for Firebase”,
  “Firebase Authentication” and the “Cloud Firestore”. We have disabled, or are not using, all other
  services.
</p>
<p>
  To learn more about the information we gather when you make an account, read our
  <a href={$lr(routes.PRIVACY_POLICY)}>privacy policy</a>.
</p>
<h3>4. Privacy-friendly analytics</h3>
<p>
  We use <a href="https://plausible.io/">Plausible</a>, a privacy-focused analytics tool, to
  anonymously understand how our visitors are using
  <span class="notranslate">Welcome To My Garden</span>. Plausible allows us to count the number of
  visitors on our website, understand what pages are being visited most, where they come from, and
  what actions people take on our site.
</p>
<p>
  Contrary to many other analytics solutions, Plausible
  <a href="https://plausible.io/privacy-focused-web-analytics"
    >does not store <em>any</em> cookies</a
  >
  or site data in your browser. This means we, or our analytics service provider, can
  <strong><em>not</em>:</strong>
</p>
<ul>
  <li>track you across different websites</li>
  <li>track you across different devices</li>
  <li>track you across multiple days in time (we don’t know if you come back tomorrow!).</li>
</ul>
<p>
  To learn more about the privacy-friendly way that Plausible gathers statistics, read
  <a href="https://plausible.io/data-policy">their data policy</a>.
</p>
<h3>5. More information</h3>
<p>
  Hopefully this page has clarified things for you. As previously mentioned, if there is anything
  that you aren't sure you need or not, it's usually safer to leave cookies enabled - just in case
  it does interact with one of the features you use on our site. If you are still looking for more
  information, you can contact us at <a href="mailto:support@welcometomygarden.org"
    >support@welcometomygarden.org</a
  >.
</p>

<style src="../style.css"></style>
