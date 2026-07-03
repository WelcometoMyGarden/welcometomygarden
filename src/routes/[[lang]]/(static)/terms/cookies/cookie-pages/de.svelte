<script lang="ts">
  import routes from '$lib/routes';
  import { lr } from '$lib/util/translation-helpers';
</script>

<h2>Cookie-Richtlinie</h2>
<h3>1. Was sind Cookies</h3>
<p>
  Wie es bei fast allen professionellen Websites üblich ist, verwendet diese Seite Cookies und
  andere Technologien zur Speicherung von Website-Daten, wie Web Storage und IndexedDB, im Folgenden
  auch einfach als „Cookies“ bezeichnet.
</p>
<p>
  Cookies speichern kleine Informationsstücke auf deinem Gerät, sodass unsere Website sie beim
  nächsten Besuch wiedererkennen kann. Diese Seite beschreibt, welche Informationen unsere Cookies
  speichern, warum wir sie benötigen und wie wir sie verwenden.
</p>
<p>Wir werden auch erläutern, wie du verhindern kannst, dass diese Cookies gespeichert werden.</p>
<h3>2. Cookies deaktivieren</h3>
<p>
  Du kannst verhindern, dass Cookies heruntergeladen werden, indem du deine Browsereinstellungen
  anpasst (sieh im Hilfemenü deines Browsers nach, um herauszufinden, wie das geht). Bitte beachte,
  dass das Deaktivieren von Cookies die Funktionalität dieser und vieler anderer Websites, die du
  besuchst, beeinträchtigen kann. Das Deaktivieren von Cookies auf unserer Website wird zum Beispiel
  die Möglichkeit deaktivieren, dich anzumelden.
</p>
<p>
  Wenn du dir Sorgen um deine Online-Privatsphäre machst, empfehlen wir die Verwendung einer
  Browsererweiterung wie
  <a href="https://addons.mozilla.org/en-US/firefox/addon/privacy-badger17/">Privacy Badger</a>
  (Firefox), <a href="https://www.ghostery.com/ghostery-ad-blocker">Ghostery</a> (viele Browser)
  oder
  <a href="https://ublockorigin.com/">uBlock Origin</a> (viele Browser).
</p>
<h3>3. Die von uns gesetzten Cookies</h3>
<p>
  Wenn du ein neuer Besucher auf unserer Website bist, versuchen wir, nur die Cookies zu setzen, die
  unbedingt erforderlich sind, um die Dienste von <span class="notranslate"
    >Welcome To My Garden</span
  > bereitzustellen. Wenn möglich, verwenden wir Sitzungscookies: Cookies, die automatisch ablaufen, nachdem
  du deinen Browser geschlossen hast.
</p>
<p>
  <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies">HTTP-Cookies</a>
  sind der Hauptspeichermechanismus für Cookies. Wir setzen die folgenden HTTP-Cookies als Reaktion auf
  bestimmte Aktionen, die du ausführst:
</p>
<table>
  <thead>
    <tr>
      <th>Cookie-Name</th>
      <th>Wann wird es gesetzt?</th>
      <th>Zweck</th>
      <th>Dauer</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>car-notice-dismissed</td>
      <td>Wenn du die Warnung gegen Autofahrten auf unserer Karte wegklickst.</td>
      <td>Um zu verhindern, dass die Benachrichtigung erneut angezeigt wird.</td>
      <td>1 Jahr</td>
    </tr>
    <tr>
      <td>superfan-dismissed</td>
      <td>Wenn du die Benachrichtigung des Superfan-Programms auf unserer Karte wegklickst.</td>
      <td>Um zu verhindern, dass die Benachrichtigung erneut angezeigt wird.</td>
      <td>1 Monat</td>
    </tr>
    <tr>
      <td>lang</td>
      <td>Wenn du angibst, dass du eine andere Sprache als die deines Browsers möchtest.</td>
      <td>Um die Website in der gewünschten Sprache bereitzustellen.</td>
      <td>Unbefristet</td>
    </tr>
  </tbody>
</table>
<p>
  <a
    href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API"
    >Web Storage</a
  >
  ist eine alternative Technologie, um Informationen in deinem Browser zu speichern. Wir setzen diese
  Informationen automatisch:
</p>
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Wann wird es gesetzt?</th>
      <th>Wie lange bleibt es?</th>
      <th>Zweck</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>mapbox.eventData.uuid</td>
      <td>Wenn du die WTMG-Karte mit Gärten lädst.</td>
      <td>Sitzung</td>
      <td>
        Unser wesentlicher Kartenservice-Anbieter https://www.mapbox.com/ speichert diese anonyme
        Benutzerkennung des Browsers und sendet sie an die Mapbox-Server, wenn du eine Karte auf
        unserer Website lädst. Unser eigener Webanwendungscode löscht alle verbleibenden Kennungen
        dieser Art, wenn du unsere Website lädst, was sie im Wesentlichen zu einem Sitzungscookie
        macht. Wir haben bei Mapbox nach dem Zweck dieser Kennung gefragt.
      </td>
    </tr>
    <tr>
      <td>sveltekit:scroll</td>
      <td>Wenn du zu einer anderen Seite navigierst.</td>
      <td>Sitzung</td>
      <td>
        Wird verwendet, um die alte Scroll-Position der Seite zu speichern, wenn du zur vorherigen
        Seite in deinem Browser zurückkehrst. Dies wird niemals an einen Webserver gesendet.
        <a
          href="https://github.com/sveltejs/kit/blob/36b0168dfa487ad27c223090345e7d8d0ddaefff/packages/kit/src/runtime/client/client.js#L37-L40."
          >Mehr Informationen auf dieser Webseite.</a
        >
      </td>
    </tr>
  </tbody>
</table>
<p>
  Wenn du ein Konto bei uns erstellst oder Zugriff auf unsere Karte erhältst, verwendet unser
  Dienstanbieter Firebase Websitedaten wie lokalen Speicher oder IndexedDB, um den
  Registrierungsprozess zu verwalten, dich angemeldet zu halten und sicherzustellen, dass die
  Anwendung ordnungsgemäß funktioniert. Firebase hat eine Seite, auf der
  <a
    href="https://firebase.google.com/support/privacy/#examples-end-user-data-processed-by-firebase"
    >beschrieben wird, welche Arten von Daten gespeichert werden</a
  >. Bitte beachte, dass wir von Firebase nur die Dienste &quot;Cloud Functions for Firebase&quot;,
  &quot;Firebase Authentication&quot; und &quot;Cloud Firestore&quot; verwenden. Alle anderen
  Dienste haben wir deaktiviert oder nutzen sie nicht.
</p>
<p>
  Lies unsere <a href={$lr(routes.PRIVACY_POLICY)}>Datenschutzerklärung</a>, um mehr darüber zu
  erfahren, welche Informationen wir erfassen, wenn du ein Konto erstellst.
</p>
<h3>4. Datenschutzfreundliche Analysen</h3>
<p>
  Wir verwenden <a href="https://plausible.io/">Plausible</a>, ein datenschutzorientiertes
  Analysetool, um anonym zu verstehen, wie unsere Besucher
  <span class="notranslate">Welcome To My Garden</span> nutzen. Plausible ermöglicht es uns, die Anzahl
  der Besucher auf unserer Website zu zählen, zu verstehen, welche Seiten am meisten besucht werden, woher
  sie kommen und welche Aktionen die Benutzer auf unserer Seite ausführen.
</p>
<p>
  Im Gegensatz zu vielen anderen Analyselösungen speichert Plausible
  <a href="https://plausible.io/privacy-focused-web-analytics">keine <em>einzigen</em> Cookies</a>
  oder Website-Daten in deinem Browser. Das bedeutet, dass wir oder unser Analysedienstleister
  <strong><em>nicht</em>:</strong>
</p>
<ul>
  <li>dich über verschiedene Websites hinweg verfolgen können</li>
  <li>dich über verschiedene Geräte hinweg verfolgen können</li>
  <li>
    dich über mehrere Tage hinweg verfolgen können (wir wissen nicht, ob du morgen zurückkehrst!).
  </li>
</ul>
<p>
  Um mehr über die datenschutzfreundliche Art und Weise zu erfahren, wie Plausible Statistiken
  sammelt, lies
  <a href="https://plausible.io/data-policy">deren Datenrichtlinie</a>.
</p>
<h3>5. Weitere Informationen</h3>
<p>
  Hoffentlich hat diese Seite dir die Dinge klargestellt. Wie bereits erwähnt: Wenn du dir bei etwas
  nicht sicher bist, ob du es brauchst oder nicht, ist es in der Regel sicherer, Cookies aktiviert
  zu lassen - nur für den Fall, dass sie mit einer der Funktionen interagieren, die du auf unserer
  Website verwendest. Wenn du weiterhin nach weiteren Informationen suchst, kannst du uns unter <a
    href="mailto:support@welcometomygarden.org">support@welcometomygarden.org</a
  >
  kontaktieren.
</p>

<style src="../style.css"></style>
