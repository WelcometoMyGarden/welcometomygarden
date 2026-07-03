<script lang="ts">
  import routes from '$lib/routes';
  import { lr } from '$lib/util/translation-helpers';
</script>

<h2>Cookiepolicy</h2>
<h3>1. Vad är cookies</h3>
<p>
  Som är vanlig praxis på nästan alla professionella webbplatser använder den här sidan cookies och
  andra tekniker för lagring av webbplatsdata, till exempel Web Storage och IndexedDB, hädanefter
  även kallade enbart ”cookies”.
</p>
<p>
  Cookies lagrar små informationsbitar på din enhet, så att vår webbplats kan komma ihåg dem nästa
  gång du besöker den. Den här sidan beskriver vilken information våra cookies lagrar, varför vi
  behöver dem och hur vi använder dem.
</p>
<p>Vi kommer också att förklara hur du kan förhindra att dessa cookies lagras.</p>
<h3>2. Inaktivera cookies</h3>
<p>
  Du kan förhindra att cookies laddas ner genom att justera dina webbläsarinställningar (se
  hjälpmenyn i din webbläsare för att ta reda på hur du gör det här). Tänk på att inaktivering av
  cookies kan påverka funktionaliteten hos den här och många andra webbplatser som du besöker. Att
  inaktivera cookies för vår webbplats i synnerhet kommer till exempel att inaktivera möjligheten
  att logga in.
</p>
<p>
  Om du är orolig för din integritet online rekommenderar vi att du använder ett webbläsartillägg
  som <a href="https://addons.mozilla.org/en-US/firefox/addon/privacy-badger17/">Privacy Badger</a>
  (Firefox), <a href="https://www.ghostery.com/ghostery-ad-blocker">Ghostery</a> (många webbläsare)
  eller <a href="https://ublockorigin.com/">uBlock Origin</a> (många webbläsare).
</p>
<h3>3. De cookies vi sätter</h3>
<p>
  När du är en ny besökare på vår webbplats försöker vi bara sätta de cookies som är absolut
  nödvändiga för att tillhandahålla tjänsterna från <span class="notranslate"
    >Welcome To My Garden</span
  >. När det är möjligt använder vi sessionscookies: cookies som upphör att gälla automatiskt när du
  stänger din webbläsare.
</p>
<p>
  <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies">HTTP-cookies</a>
  är den huvudsakliga lagringsmekanismen för cookies. Vi sätter följande HTTP-cookies som svar på vissa
  åtgärder du vidtar:
</p>
<table>
  <thead>
    <tr>
      <th>Cookie-namn</th>
      <th>När sätts den?</th>
      <th>Syfte</th>
      <th>Varaktighet</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>car-notice-dismissed</td>
      <td>När du klickar bort varningen mot bilresor på vår karta.</td>
      <td>För att förhindra att meddelandet visas igen.</td>
      <td>1 år</td>
    </tr>
    <tr>
      <td>superfan-dismissed</td>
      <td>När du klickar bort meddelandet om Superfan-programmet på vår karta.</td>
      <td>För att förhindra att meddelandet visas igen.</td>
      <td>1 månad</td>
    </tr>
    <tr>
      <td>lang</td>
      <td>När du anger att du vill ha ett annat webbplatsspråk än ditt webbläsarspråk.</td>
      <td>För att tillhandahålla webbplatsen på det språk du begärt.</td>
      <td>Obestämd tid</td>
    </tr>
  </tbody>
</table>
<p>
  <a
    href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API"
    >Web storage</a
  >
  är en alternativ teknik för att lagra information i din webbläsare. Vi sätter dessa informationsbitar
  automatiskt:
</p>
<table>
  <thead>
    <tr>
      <th>Namn</th>
      <th>När sätts den?</th>
      <th>Hur länge finns den kvar?</th>
      <th>Syfte</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>mapbox.eventData.uuid</td>
      <td>När du laddar WTMG-kartan med trädgårdar.</td>
      <td>Session</td>
      <td>
        Vår viktiga kartleverantör https://www.mapbox.com/ lagrar denna anonyma
        webbläsaridentifierare och skickar den till Mapbox-servrar när du laddar en karta på vår
        webbplats. Vår egen webbapplikationskod rensar alla återstående identifierare av den här
        typen när du laddar vår webbplats, vilket i praktiken gör den till en sessionscookie. Vi har
        frågat Mapbox om syftet med denna identifierare.
      </td>
    </tr>
    <tr>
      <td>sveltekit:scroll</td>
      <td>När du navigerar till en annan sida.</td>
      <td>Session</td>
      <td>
        Används för att komma ihåg sidans tidigare rullningsposition om du navigerar till föregående
        sida i din webbläsare. Detta skickas aldrig till någon webbserver.
        <a
          href="https://github.com/sveltejs/kit/blob/36b0168dfa487ad27c223090345e7d8d0ddaefff/packages/kit/src/runtime/client/client.js#L37-L40."
          >Mer information på den här webbsidan.</a
        >
      </td>
    </tr>
  </tbody>
</table>
<p>
  Om du skapar ett konto hos oss, eller använder vår karta, kommer vår tjänsteleverantör Firebase
  att använda webbplatsdata som lokal lagring eller IndexedDB för hanteringen av
  registreringsprocessen, för att hålla dig inloggad och för att säkerställa att applikationen
  fungerar korrekt. Firebase har en sida som beskriver
  <a
    href="https://firebase.google.com/support/privacy/#examples-end-user-data-processed-by-firebase"
    >vilken typ av data den lagrar</a
  >. Tänk på att vi från Firebase endast använder tjänsterna &quot;Cloud Functions for
  Firebase&quot;, &quot;Firebase Authentication&quot; och &quot;Cloud Firestore&quot;. Vi har
  inaktiverat, eller använder inte, alla andra tjänster.
</p>
<p>
  För att lära dig mer om den information vi samlar in när du skapar ett konto, läs vår
  <a href={$lr(routes.PRIVACY_POLICY)}>integritetspolicy</a>.
</p>
<h3>4. Integritetsvänlig analys</h3>
<p>
  Vi använder <a href="https://plausible.io/">Plausible</a>, ett integritetsfokuserat analysverktyg,
  för att anonymt förstå hur våra besökare använder
  <span class="notranslate">Welcome To My Garden</span>. Plausible låter oss räkna antalet besökare
  på vår webbplats, förstå vilka sidor som besöks mest, varifrån de kommer och vilka åtgärder
  människor vidtar på vår webbplats.
</p>
<p>
  Till skillnad från många andra analyslösningar lagrar Plausible
  <a href="https://plausible.io/privacy-focused-web-analytics">inga <em>som helst</em> cookies</a>
  eller webbplatsdata i din webbläsare. Det betyder att vi, eller vår analystjänsteleverantör,
  <strong>inte <em>kan</em>:</strong>
</p>
<ul>
  <li>spåra dig på olika webbplatser</li>
  <li>spåra dig på olika enheter</li>
  <li>spåra dig över flera dagar (vi vet inte om du kommer tillbaka imorgon!).</li>
</ul>
<p>
  För att lära dig mer om det integritetsvänliga sätt som Plausible samlar in statistik på, läs
  <a href="https://plausible.io/data-policy">deras datapolicy</a>.
</p>
<h3>5. Mer information</h3>
<p>
  Förhoppningsvis har den här sidan klargjort saker för dig. Som tidigare nämnts, om det är något du
  är osäker på om du behöver eller inte, är det oftast säkrare att lämna cookies aktiverade - ifall
  det skulle interagera med någon av funktionerna du använder på vår webbplats. Om du fortfarande
  letar efter mer information kan du kontakta oss på <a href="mailto:support@welcometomygarden.org"
    >support@welcometomygarden.org</a
  >.
</p>

<style src="../style.css"></style>
