<script lang="ts">
  import routes from '$lib/routes';
  import { lr } from '$lib/util/translation-helpers';
</script>

<h2>Informativa sui cookie</h2>
<h3>1. Cosa sono i cookie</h3>
<p>
  Come è prassi comune per quasi tutti i siti web professionali, questo sito utilizza cookie e altre
  tecnologie di archiviazione dei dati del sito web, come Web Storage e IndexedDB, di seguito
  denominati semplicemente “cookie”.
</p>
<p>
  I cookie memorizzano piccole informazioni sul tuo dispositivo, in modo che il nostro sito web
  possa ricordarle la prossima volta che lo visiti. Questa pagina descrive quali informazioni
  memorizzano i nostri cookie, perché ne abbiamo bisogno e come li utilizziamo.
</p>
<p>Ti spiegheremo anche come puoi evitare che questi cookie vengano memorizzati.</p>
<h3>2. Disattivare i cookie</h3>
<p>
  Puoi impedire il download dei cookie modificando le impostazioni del tuo browser (consulta il menu
  di aiuto del tuo browser per scoprire come farlo). Tieni presente che disattivare i cookie
  potrebbe influire sulla funzionalità di questo e di molti altri siti web che visiti. Disattivare i
  cookie per il nostro sito, in particolare, disabiliterà ad esempio la possibilità di accedere.
</p>
<p>
  Se sei preoccupato per la tua privacy online, ti consigliamo di utilizzare un'estensione del
  browser come <a href="https://addons.mozilla.org/en-US/firefox/addon/privacy-badger17/"
    >Privacy Badger</a
  >
  (Firefox), <a href="https://www.ghostery.com/ghostery-ad-blocker">Ghostery</a> (molti browser) o
  <a href="https://ublockorigin.com/">uBlock Origin</a> (molti browser).
</p>
<h3>3. I cookie che impostiamo</h3>
<p>
  Quando sei un nuovo visitatore del nostro sito web, cerchiamo di impostare solo i cookie
  strettamente necessari per fornire i servizi di <span class="notranslate"
    >Welcome To My Garden</span
  >. Quando possibile, utilizziamo cookie di sessione: cookie che scadono automaticamente dopo la
  chiusura del browser.
</p>
<p>
  <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies">I cookie HTTP</a>
  sono il principale meccanismo di archiviazione dei cookie. Impostiamo i seguenti cookie HTTP in risposta
  a determinate azioni che compi:
</p>
<table>
  <thead>
    <tr>
      <th>Nome del cookie</th>
      <th>Quando viene impostato?</th>
      <th>Scopo</th>
      <th>Durata</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>car-notice-dismissed</td>
      <td>Quando chiudi l'avviso contro i viaggi in auto sulla nostra mappa.</td>
      <td>Per evitare di mostrarti nuovamente l'avviso.</td>
      <td>1 anno</td>
    </tr>
    <tr>
      <td>superfan-dismissed</td>
      <td>Quando chiudi la notifica del programma Superfan sulla nostra mappa.</td>
      <td>Per evitare di mostrarti nuovamente la notifica.</td>
      <td>1 mese</td>
    </tr>
    <tr>
      <td>lang</td>
      <td
        >Quando indichi di voler utilizzare una lingua del sito diversa da quella del tuo browser.</td
      >
      <td>Per fornire il sito web nella lingua richiesta.</td>
      <td>A tempo indeterminato</td>
    </tr>
  </tbody>
</table>
<p>
  <a
    href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API"
    >Il Web storage</a
  >
  è una tecnologia alternativa per memorizzare informazioni nel tuo browser; impostiamo automaticamente
  questi elementi di informazione:
</p>
<table>
  <thead>
    <tr>
      <th>Nome</th>
      <th>Quando viene impostato?</th>
      <th>Per quanto tempo rimane?</th>
      <th>Scopo</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>mapbox.eventData.uuid</td>
      <td>Quando carichi la mappa WTMG con i giardini.</td>
      <td>Sessione</td>
      <td>
        Il nostro fornitore essenziale di servizi di mappe https://www.mapbox.com/ memorizza questo
        identificatore anonimo dell'utente del browser e lo invia ai server di Mapbox quando carichi
        una mappa sul nostro sito web. Il nostro codice dell'applicazione web elimina eventuali
        identificatori residui di questo tipo quando carichi il nostro sito web, il che lo rende
        essenzialmente un cookie di sessione. Abbiamo chiesto a Mapbox quale sia lo scopo di questo
        identificatore.
      </td>
    </tr>
    <tr>
      <td>sveltekit:scroll</td>
      <td>Quando navighi verso una pagina diversa.</td>
      <td>Sessione</td>
      <td>
        Viene utilizzato per ricordare la vecchia posizione di scorrimento della pagina se torni
        alla pagina precedente nel tuo browser. Questo non viene mai inviato ad alcun server web.
        <a
          href="https://github.com/sveltejs/kit/blob/36b0168dfa487ad27c223090345e7d8d0ddaefff/packages/kit/src/runtime/client/client.js#L37-L40."
          >Maggiori informazioni su questa pagina web.</a
        >
      </td>
    </tr>
  </tbody>
</table>
<p>
  Se crei un account con noi, o accedi alla nostra mappa, il nostro fornitore di servizi Firebase
  utilizzerà dati del sito web come l'archiviazione locale o IndexedDB per la gestione del processo
  di registrazione, per mantenerti connesso e per garantire che l'applicazione funzioni
  correttamente. Firebase ha una pagina che descrive nel dettaglio
  <a
    href="https://firebase.google.com/support/privacy/#examples-end-user-data-processed-by-firebase"
    >quali tipi di dati memorizza</a
  >. Tieni presente che di Firebase utilizziamo solo i servizi &quot;Cloud Functions for
  Firebase&quot;, &quot;Firebase Authentication&quot; e &quot;Cloud Firestore&quot;. Abbiamo
  disattivato, o non utilizziamo, tutti gli altri servizi.
</p>
<p>
  Per saperne di più sulle informazioni che raccogliamo quando crei un account, leggi la nostra
  <a href={$lr(routes.PRIVACY_POLICY)}>informativa sulla privacy</a>.
</p>
<h3>4. Analisi rispettose della privacy</h3>
<p>
  Utilizziamo <a href="https://plausible.io/">Plausible</a>, uno strumento di analisi incentrato
  sulla privacy, per capire in modo anonimo come i nostri visitatori utilizzano
  <span class="notranslate">Welcome To My Garden</span>. Plausible ci permette di contare il numero
  di visitatori sul nostro sito web, capire quali pagine vengono visitate di più, da dove provengono
  e quali azioni le persone compiono sul nostro sito.
</p>
<p>
  A differenza di molte altre soluzioni di analisi, Plausible
  <a href="https://plausible.io/privacy-focused-web-analytics"
    >non memorizza <em>alcun</em> cookie</a
  >
  né dati del sito nel tuo browser. Questo significa che noi, o il nostro fornitore di servizi di analisi,
  <strong><em>non</em> possiamo:</strong>
</p>
<ul>
  <li>tracciarti su siti web diversi</li>
  <li>tracciarti su dispositivi diversi</li>
  <li>tracciarti nel corso di più giorni (non sappiamo se tornerai domani!).</li>
</ul>
<p>
  Per saperne di più sul modo rispettoso della privacy in cui Plausible raccoglie le statistiche,
  leggi <a href="https://plausible.io/data-policy">la loro informativa sui dati</a>.
</p>
<h3>5. Ulteriori informazioni</h3>
<p>
  Speriamo che questa pagina ti abbia chiarito le idee. Come accennato in precedenza, se c'è
  qualcosa di cui non sei sicuro se hai bisogno o meno, di solito è più sicuro lasciare i cookie
  attivati, nel caso in cui interagiscano con una delle funzionalità che utilizzi sul nostro sito.
  Se sei ancora alla ricerca di maggiori informazioni, puoi contattarci all'indirizzo <a
    href="mailto:support@welcometomygarden.org">support@welcometomygarden.org</a
  >.
</p>

<style src="../style.css"></style>
