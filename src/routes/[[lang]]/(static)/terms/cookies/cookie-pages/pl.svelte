<script lang="ts">
  import routes from '$lib/routes';
  import { lr } from '$lib/util/translation-helpers';
</script>

<h2>Polityka plików cookie</h2>
<h3>1. Czym są pliki cookie</h3>
<p>
  Podobnie jak niemal wszystkie profesjonalne strony internetowe, ta strona korzysta z plików cookie
  i innych technologii przechowywania danych, takich jak Web Storage i IndexedDB, zwanych dalej po
  prostu „plikami cookie”.
</p>
<p>
  Pliki cookie przechowują niewielkie informacje na twoim urządzeniu, dzięki czemu nasza strona może
  je zapamiętać podczas twojej następnej wizyty. Ta strona opisuje, jakie informacje przechowują
  nasze pliki cookie, dlaczego ich potrzebujemy i jak je wykorzystujemy.
</p>
<p>Wyjaśnimy również, jak możesz zapobiec zapisywaniu tych plików cookie.</p>
<h3>2. Wyłączanie plików cookie</h3>
<p>
  Możesz zapobiec pobieraniu plików cookie, dostosowując ustawienia swojej przeglądarki (sprawdź w
  menu Pomoc swojej przeglądarki, jak to zrobić). Pamiętaj, że wyłączenie plików cookie może wpłynąć
  na funkcjonowanie tej i wielu innych odwiedzanych przez ciebie stron internetowych. Wyłączenie
  plików cookie na naszej stronie w szczególności uniemożliwi na przykład zalogowanie się.
</p>
<p>
  Jeśli zależy ci na prywatności w internecie, zalecamy korzystanie z rozszerzenia przeglądarki,
  takiego jak
  <a href="https://addons.mozilla.org/en-US/firefox/addon/privacy-badger17/">Privacy Badger</a>
  (Firefox), <a href="https://www.ghostery.com/ghostery-ad-blocker">Ghostery</a> (wiele
  przeglądarek) lub <a href="https://ublockorigin.com/">uBlock Origin</a> (wiele przeglądarek).
</p>
<h3>3. Pliki cookie, które ustawiamy</h3>
<p>
  Gdy jesteś nowym użytkownikiem naszej strony, staramy się ustawiać wyłącznie pliki cookie ściśle
  niezbędne do świadczenia usług <span class="notranslate">Welcome To My Garden</span>. Kiedy to
  możliwe, korzystamy z sesyjnych plików cookie: plików, które wygasają automatycznie po zamknięciu
  przeglądarki.
</p>
<p>
  <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies">Pliki cookie HTTP</a>
  są głównym mechanizmem przechowywania plików cookie. Ustawiamy następujące pliki cookie HTTP w odpowiedzi
  na określone działania, które podejmujesz:
</p>
<table>
  <thead>
    <tr>
      <th>Nazwa pliku cookie</th>
      <th>Kiedy jest ustawiany?</th>
      <th>Cel</th>
      <th>Czas trwania</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>car-notice-dismissed</td>
      <td>Gdy klikniesz, aby zamknąć ostrzeżenie przed podróżowaniem samochodem na naszej mapie.</td
      >
      <td>Aby uniknąć ponownego wyświetlania tego powiadomienia.</td>
      <td>1 rok</td>
    </tr>
    <tr>
      <td>superfan-dismissed</td>
      <td>Gdy klikniesz, aby zamknąć powiadomienie o programie Superfan na naszej mapie.</td>
      <td>Aby uniknąć ponownego wyświetlania tego powiadomienia.</td>
      <td>1 miesiąc</td>
    </tr>
    <tr>
      <td>lang</td>
      <td>Gdy wskażesz, że chcesz inny język strony niż język twojej przeglądarki.</td>
      <td>Aby udostępnić stronę w żądanym przez ciebie języku.</td>
      <td>Bezterminowo</td>
    </tr>
  </tbody>
</table>
<p>
  <a
    href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API"
    >Web storage</a
  >
  to alternatywna technologia przechowywania informacji w twojej przeglądarce; automatycznie ustawiamy
  następujące informacje:
</p>
<table>
  <thead>
    <tr>
      <th>Nazwa</th>
      <th>Kiedy jest ustawiany?</th>
      <th>Jak długo pozostaje?</th>
      <th>Cel</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>mapbox.eventData.uuid</td>
      <td>Gdy wczytujesz mapę WTMG z ogrodami.</td>
      <td>Sesja</td>
      <td>
        Nasz kluczowy dostawca usług mapowych https://www.mapbox.com/ przechowuje ten anonimowy
        identyfikator użytkownika przeglądarki i wysyła go do serwerów Mapbox, gdy wczytujesz mapę
        na naszej stronie. Nasz własny kod aplikacji webowej usuwa wszelkie pozostałe identyfikatory
        tego typu podczas wczytywania naszej strony, co zasadniczo czyni go plikiem cookie sesyjnym.
        Zapytaliśmy Mapbox o cel tego identyfikatora.
      </td>
    </tr>
    <tr>
      <td>sveltekit:scroll</td>
      <td>Gdy przechodzisz na inną stronę.</td>
      <td>Sesja</td>
      <td>
        Służy do zapamiętania poprzedniej pozycji przewijania strony, jeśli wrócisz do poprzedniej
        strony w swojej przeglądarce. Nigdy nie jest to wysyłane na żaden serwer.
        <a
          href="https://github.com/sveltejs/kit/blob/36b0168dfa487ad27c223090345e7d8d0ddaefff/packages/kit/src/runtime/client/client.js#L37-L40."
          >Więcej informacji na tej stronie internetowej.</a
        >
      </td>
    </tr>
  </tbody>
</table>
<p>
  Jeśli założysz u nas konto lub uzyskasz dostęp do naszej mapy, nasz dostawca usług Firebase będzie
  wykorzystywał dane strony, takie jak pamięć lokalna lub IndexedDB, do zarządzania procesem
  rejestracji, utrzymywania cię zalogowanym oraz zapewnienia prawidłowego działania aplikacji.
  Firebase posiada stronę opisującą,
  <a
    href="https://firebase.google.com/support/privacy/#examples-end-user-data-processed-by-firebase"
    >jakiego rodzaju dane przechowuje</a
  >. Pamiętaj, że z Firebase korzystamy wyłącznie z usług &quot;Cloud Functions for Firebase&quot;,
  &quot;Firebase Authentication&quot; oraz &quot;Cloud Firestore&quot;. Wszystkie inne usługi
  wyłączyliśmy lub z nich nie korzystamy.
</p>
<p>
  Aby dowiedzieć się więcej o informacjach, które gromadzimy podczas zakładania konta, przeczytaj
  naszą <a href={$lr(routes.PRIVACY_POLICY)}>politykę prywatności</a>.
</p>
<h3>4. Analityka przyjazna prywatności</h3>
<p>
  Korzystamy z <a href="https://plausible.io/">Plausible</a>, narzędzia analitycznego
  skoncentrowanego na prywatności, aby anonimowo zrozumieć, w jaki sposób nasi odwiedzający
  korzystają z <span class="notranslate">Welcome To My Garden</span>. Plausible pozwala nam liczyć
  liczbę odwiedzających naszą stronę, rozumieć, które strony są odwiedzane najczęściej, skąd
  pochodzą odwiedzający oraz jakie działania podejmują na naszej stronie.
</p>
<p>
  W przeciwieństwie do wielu innych rozwiązań analitycznych, Plausible
  <a href="https://plausible.io/privacy-focused-web-analytics"
    >nie przechowuje <em>żadnych</em> plików cookie</a
  >
  ani danych witryny w twojej przeglądarce. Oznacza to, że my, ani nasz dostawca usług analitycznych,
  <strong>nie <em>możemy</em>:</strong>
</p>
<ul>
  <li>śledzić cię na różnych stronach internetowych</li>
  <li>śledzić cię na różnych urządzeniach</li>
  <li>śledzić cię przez wiele dni (nie wiemy, czy wrócisz jutro!).</li>
</ul>
<p>
  Aby dowiedzieć się więcej o przyjaznym dla prywatności sposobie, w jaki Plausible zbiera
  statystyki, przeczytaj <a href="https://plausible.io/data-policy">ich politykę dotyczącą danych</a
  >.
</p>
<h3>5. Więcej informacji</h3>
<p>
  Mamy nadzieję, że ta strona wyjaśniła ci wszystko. Jak wspomniano wcześniej, jeśli nie jesteś
  pewien, czy czegoś potrzebujesz, czy nie, zazwyczaj bezpieczniej jest pozostawić pliki cookie
  włączone - na wypadek, gdyby miały wpływ na jedną z funkcji, z których korzystasz na naszej
  stronie. Jeśli nadal szukasz więcej informacji, możesz skontaktować się z nami pod adresem <a
    href="mailto:support@welcometomygarden.org">support@welcometomygarden.org</a
  >.
</p>

<style src="../style.css"></style>
