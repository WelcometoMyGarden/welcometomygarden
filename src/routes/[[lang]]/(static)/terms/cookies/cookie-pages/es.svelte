<script lang="ts">
  import routes from '$lib/routes';
  import { lr } from '$lib/util/translation-helpers';
</script>

<h2>Política de cookies</h2>
<h3>1. Qué son las cookies</h3>
<p>
  Como es práctica común en casi todos los sitios web profesionales, este sitio utiliza cookies y
  otras tecnologías de almacenamiento de datos del sitio web, como el almacenamiento web y
  IndexedDB, en adelante también denominadas simplemente "cookies".
</p>
<p>
  Las cookies almacenan pequeñas piezas de información en su dispositivo, para que nuestro sitio web
  pueda recordarlas la próxima vez que lo visite. Esta página describe qué información almacenan
  nuestras cookies, por qué las necesitamos y cómo las usamos.
</p>
<p>También compartiremos cómo puede evitar que estas cookies se almacenen.</p>
<h3>2. Deshabilitar las cookies</h3>
<p>
  Puede evitar que las cookies se descarguen ajustando la configuración de su navegador (consulte el
  menú de ayuda de su navegador para saber cómo hacerlo). Tenga en cuenta que deshabilitar las
  cookies podría afectar la funcionalidad de este y muchos otros sitios web que visita. Deshabilitar
  las cookies en nuestro sitio en particular desactivará, por ejemplo, la capacidad de iniciar
  sesión.
</p>
<p>
  Si le preocupa su privacidad en línea, le recomendamos usar una extensión del navegador como
  <a href="https://addons.mozilla.org/en-US/firefox/addon/privacy-badger17/">Privacy Badger</a>
  (Firefox), <a href="https://www.ghostery.com/ghostery-ad-blocker">Ghostery</a> (muchos
  navegadores) o
  <a href="https://ublockorigin.com/">uBlock Origin</a> (muchos navegadores).
</p>
<h3>3. Las cookies que establecemos</h3>
<p>
  Cuando es un nuevo visitante en nuestro sitio web, tratamos de establecer solo las cookies
  estrictamente necesarias para proporcionar los servicios de <span class="notranslate"
    >Welcome To My Garden</span
  >. Cuando es posible, utilizamos cookies de sesión: cookies que expiran automáticamente después de
  cerrar su navegador.
</p>
<p>
  <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies">Las cookies HTTP</a>
  son el principal mecanismo de almacenamiento para las cookies. Establecemos las siguientes cookies
  HTTP en respuesta a ciertas acciones que realiza:
</p>
<table>
  <thead>
    <tr>
      <th>Nombre de la cookie</th>
      <th>When is it set?</th>
      <th>Propósito</th>
      <th>Duration</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>car-notice-dismissed</td>
      <td>Cuando descartas el aviso contra los viajes en coche en nuestro mapa.</td>
      <td>Para evitar mostrarte el aviso nuevamente.</td>
      <td>1 año</td>
    </tr>
    <tr>
      <td>superfan-dismissed</td>
      <td>Cuando descartas el aviso del programa Superfan en nuestro mapa.</td>
      <td>Para evitar mostrarte el aviso nuevamente.</td>
      <td>1 mes</td>
    </tr>
    <tr>
      <td>lang</td>
      <td>Cuando indicas que quieres un idioma del sitio diferente al idioma de tu navegador.</td>
      <td>Para proporcionar el sitio web en el idioma solicitado.</td>
      <td>Indefinidamente</td>
    </tr>
  </tbody>
</table>
<p>
  <a
    href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API"
    >El almacenamiento web</a
  >
  es una tecnología alternativa para almacenar información en su navegador. Establecemos estas piezas
  de información automáticamente:
</p>
<table>
  <thead>
    <tr>
      <th>Nombre</th>
      <th>¿Cuándo se establece?</th>
      <th>¿Cuánto tiempo permanece?</th>
      <th>Propósito</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>mapbox.eventData.uuid</td>
      <td>Cuando cargas el mapa de WTMG con jardines.</td>
      <td>Sesión</td>
      <td>
        Nuestro proveedor esencial de servicios de mapas, https://www.mapbox.com/, almacena este
        identificador de usuario del navegador anónimo y lo envía a los servidores de Mapbox cuando
        cargas un mapa en nuestro sitio web. Nuestro propio código de aplicación web elimina
        cualquier identificador restante de este tipo cuando cargas nuestro sitio web, lo que
        esencialmente lo convierte en una cookie de sesión. Hemos consultado a Mapbox sobre el
        propósito de este identificador.
      </td>
    </tr>
    <tr>
      <td>sveltekit:scroll</td>
      <td>Cuando navegas a una página diferente.</td>
      <td>Sesión</td>
      <td>
        Se utiliza para recordar la posición de desplazamiento anterior de la página si navegas a la
        página anterior en tu navegador. Esto nunca se envía a ningún servidor web.
        <a
          href="https://github.com/sveltejs/kit/blob/36b0168dfa487ad27c223090345e7d8d0ddaefff/packages/kit/src/runtime/client/client.js#L37-L40."
          >Más información en esta página web.</a
        >
      </td>
    </tr>
  </tbody>
</table>
<p>
  Si creas una cuenta con nosotros o accedes a nuestro mapa, nuestro proveedor de servicios Firebase
  utilizará datos del sitio web como almacenamiento local o IndexedDB para la gestión del proceso de
  registro, para mantenerte conectado y para garantizar que la aplicación funcione correctamente.
  Firebase tiene una página que detalla
  <a
    href="https://firebase.google.com/support/privacy/#examples-end-user-data-processed-by-firebase"
    >qué tipo de datos almacena</a
  >. Ten en cuenta que de Firebase, solo utilizamos los servicios "Cloud Functions for Firebase",
  "Firebase Authentication" y "Cloud Firestore". Hemos deshabilitado, o no estamos utilizando, todos
  los demás servicios.
</p>
<p>
  Para obtener más información sobre la información que recopilamos cuando creas una cuenta, lee
  nuestra
  <a href={$lr(routes.PRIVACY_POLICY)}>política de privacidad</a>.
</p>
<h3>4. Análisis amigable con la privacidad</h3>
<p>
  Utilizamos <a href="https://plausible.io/">Plausible</a>, una herramienta de análisis enfocada en
  la privacidad, para entender de manera anónima cómo nuestros visitantes están utilizando Welcome
  To My Garden. Plausible nos permite contar el número de visitantes en nuestro sitio web, entender
  qué páginas son las más visitadas, de dónde vienen y qué acciones realizan en nuestro sitio.
</p>
<p>
  A diferencia de muchas otras soluciones de análisis, Plausible
  <a href="https://plausible.io/privacy-focused-web-analytics"
    >no almacena <em>ninguna</em> cookie</a
  >
  ni datos del sitio en su navegador. Esto significa que nosotros, o nuestro proveedor de servicios de
  análisis,
  <strong><em>no podemos</em>:</strong>
</p>
<ul>
  <li>rastrearlo en diferentes sitios web</li>
  <li>rastrearlo en diferentes dispositivos</li>
  <li>rastrearlo en múltiples días en el tiempo (¡no sabemos si vuelve mañana!).</li>
</ul>
<p>
  Para obtener más información sobre la forma amigable con la privacidad en que Plausible recopila
  estadísticas, lea
  <a href="https://plausible.io/data-policy">su política de datos</a>.
</p>
<h3>5. Más información</h3>
<p>
  Esperamos que esta página le haya aclarado las cosas. Como se mencionó anteriormente, si hay algo
  de lo que no está seguro de necesitar o no, generalmente es más seguro dejar las cookies
  habilitadas, por si acaso interactúan con una de las características que utiliza en nuestro sitio.
  Si todavía está buscando más información, puede contactarnos en <a
    href="mailto:support@welcometomygarden.org">support@welcometomygarden.org</a
  >.
</p>

<style src="../style.css"></style>
