<script lang="ts">
  import routes from '$lib/routes';
  import { lr } from '$lib/util/translation-helpers';
</script>

<h2>Politica de cookie-uri</h2>
<h3>1. Ce sunt cookie-urile</h3>
<p>
  Așa cum este o practică obișnuită pentru aproape toate site-urile profesionale, acest site
  folosește cookie-uri și alte tehnologii de stocare a datelor, precum Web Storage și IndexedDB,
  denumite în continuare, pentru simplitate, „cookie-uri”.
</p>
<p>
  Cookie-urile stochează informații mici pe dispozitivul tău, astfel încât site-ul nostru să și le
  poată aminti la următoarea ta vizită. Această pagină descrie ce informații stochează cookie-urile
  noastre, de ce avem nevoie de ele și cum le folosim.
</p>
<p>Îți vom explica, de asemenea, cum poți împiedica stocarea acestor cookie-uri.</p>
<h3>2. Dezactivarea cookie-urilor</h3>
<p>
  Poți împiedica descărcarea cookie-urilor ajustând setările browserului tău (consultă meniul de
  ajutor al browserului tău pentru a afla cum să faci asta). Te rugăm să ții cont că dezactivarea
  cookie-urilor ar putea afecta funcționalitatea acestui site și a multor altor site-uri pe care le
  vizitezi. Dezactivarea cookie-urilor pentru site-ul nostru, în particular, va dezactiva, de
  exemplu, posibilitatea de a te autentifica.
</p>
<p>
  Dacă ești preocupat de confidențialitatea ta online, îți recomandăm să folosești o extensie de
  browser precum
  <a href="https://addons.mozilla.org/en-US/firefox/addon/privacy-badger17/">Privacy Badger</a>
  (Firefox), <a href="https://www.ghostery.com/ghostery-ad-blocker">Ghostery</a> (multe browsere)
  sau <a href="https://ublockorigin.com/">uBlock Origin</a> (multe browsere).
</p>
<h3>3. Cookie-urile pe care le setăm</h3>
<p>
  Când ești un vizitator nou pe site-ul nostru, încercăm să setăm doar cookie-urile strict necesare
  pentru a furniza serviciile <span class="notranslate">Welcome To My Garden</span>. Când este
  posibil, folosim cookie-uri de sesiune: cookie-uri care expiră automat după ce închizi browserul.
</p>
<p>
  <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies">Cookie-urile HTTP</a>
  sunt principalul mecanism de stocare pentru cookie-uri. Setăm următoarele cookie-uri HTTP ca răspuns
  la anumite acțiuni pe care le întreprinzi:
</p>
<table>
  <thead>
    <tr>
      <th>Numele cookie-ului</th>
      <th>Când este setat?</th>
      <th>Scop</th>
      <th>Durată</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>car-notice-dismissed</td>
      <td>Când închizi avertismentul împotriva călătoriilor cu mașina de pe harta noastră.</td>
      <td>Pentru a evita să îți mai arătăm din nou avertismentul.</td>
      <td>1 an</td>
    </tr>
    <tr>
      <td>superfan-dismissed</td>
      <td>Când închizi notificarea despre programul Superfan de pe harta noastră.</td>
      <td>Pentru a evita să îți mai arătăm din nou notificarea.</td>
      <td>1 lună</td>
    </tr>
    <tr>
      <td>lang</td>
      <td>Când indici că dorești o altă limbă a site-ului decât cea a browserului tău.</td>
      <td>Pentru a-ți oferi site-ul în limba solicitată.</td>
      <td>Nedefinit</td>
    </tr>
  </tbody>
</table>
<p>
  <a
    href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API"
    >Web storage</a
  >
  este o tehnologie alternativă pentru stocarea informațiilor în browserul tău; setăm automat aceste informații:
</p>
<table>
  <thead>
    <tr>
      <th>Nume</th>
      <th>Când este setat?</th>
      <th>Cât timp rămâne?</th>
      <th>Scop</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>mapbox.eventData.uuid</td>
      <td>Când încarci harta WTMG cu grădini.</td>
      <td>Sesiune</td>
      <td>
        Furnizorul nostru esențial de servicii de hărți https://www.mapbox.com/ stochează acest
        identificator anonim al utilizatorului browserului și îl trimite către serverele Mapbox
        atunci când încarci o hartă pe site-ul nostru. Codul propriu al aplicației noastre web
        șterge orice identificator rămas de acest tip atunci când încarci site-ul nostru, ceea ce îl
        transformă practic într-un cookie de sesiune. Am întrebat Mapbox despre scopul acestui
        identificator.
      </td>
    </tr>
    <tr>
      <td>sveltekit:scroll</td>
      <td>Când navighezi către o altă pagină.</td>
      <td>Sesiune</td>
      <td>
        Este folosit pentru a reține poziția anterioară de derulare a paginii dacă navighezi înapoi
        la pagina anterioară din browserul tău. Acesta nu este niciodată trimis către vreun server
        web.
        <a
          href="https://github.com/sveltejs/kit/blob/36b0168dfa487ad27c223090345e7d8d0ddaefff/packages/kit/src/runtime/client/client.js#L37-L40."
          >Mai multe informații pe această pagină web.</a
        >
      </td>
    </tr>
  </tbody>
</table>
<p>
  Dacă îți creezi un cont la noi sau accesezi harta noastră, furnizorul nostru de servicii Firebase
  va folosi date ale site-ului, precum stocarea locală sau IndexedDB, pentru gestionarea procesului
  de înregistrare, pentru a te menține autentificat și pentru a garanta funcționarea corectă a
  aplicației. Firebase are o pagină care detaliază
  <a
    href="https://firebase.google.com/support/privacy/#examples-end-user-data-processed-by-firebase"
    >ce tip de date stochează</a
  >. Ține cont că, din Firebase, folosim doar serviciile &quot;Cloud Functions for Firebase&quot;,
  &quot;Firebase Authentication&quot; și &quot;Cloud Firestore&quot;. Am dezactivat, sau nu folosim,
  toate celelalte servicii.
</p>
<p>
  Pentru a afla mai multe despre informațiile pe care le colectăm atunci când îți creezi un cont,
  citește <a href={$lr(routes.PRIVACY_POLICY)}>politica noastră de confidențialitate</a>.
</p>
<h3>4. Analiză care respectă confidențialitatea</h3>
<p>
  Folosim <a href="https://plausible.io/">Plausible</a>, un instrument de analiză axat pe
  confidențialitate, pentru a înțelege în mod anonim modul în care vizitatorii noștri folosesc
  <span class="notranslate">Welcome To My Garden</span>. Plausible ne permite să numărăm vizitatorii
  site-ului nostru, să înțelegem ce pagini sunt vizitate cel mai mult, de unde provin și ce acțiuni
  întreprind oamenii pe site-ul nostru.
</p>
<p>
  Spre deosebire de multe alte soluții de analiză, Plausible
  <a href="https://plausible.io/privacy-focused-web-analytics"
    >nu stochează <em>niciun</em> cookie</a
  >
  sau date ale site-ului în browserul tău. Aceasta înseamnă că noi, sau furnizorul nostru de servicii
  de analiză, <strong>nu <em>putem</em>:</strong>
</p>
<ul>
  <li>să te urmărim pe diferite site-uri web</li>
  <li>să te urmărim pe diferite dispozitive</li>
  <li>să te urmărim de-a lungul mai multor zile (nu știm dacă te vei întoarce mâine!).</li>
</ul>
<p>
  Pentru a afla mai multe despre modul în care Plausible respectă confidențialitatea atunci când
  colectează statistici, citește <a href="https://plausible.io/data-policy"
    >politica lor privind datele</a
  >.
</p>
<h3>5. Mai multe informații</h3>
<p>
  Sperăm că această pagină ți-a lămurit lucrurile. Așa cum am menționat anterior, dacă există ceva
  despre care nu ești sigur dacă ai nevoie sau nu, de obicei este mai sigur să lași cookie-urile
  activate - doar în cazul în care interacționează cu una dintre funcțiile pe care le folosești pe
  site-ul nostru. Dacă mai cauți informații suplimentare, ne poți contacta la <a
    href="mailto:support@welcometomygarden.org">support@welcometomygarden.org</a
  >.
</p>

<style src="../style.css"></style>
