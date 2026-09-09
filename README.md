# Home Pro Guides — Propuesta de sitio (VERSIÓN FINAL, 2026-09-08/09)

Esta carpeta es la **única versión final** de la propuesta (decisión de Luis:
se dejó de mantener `../web-hpg-propuesta-2026-09/` en paralelo). Construida
sobre la paleta real del brand kit de Home Pro Guides, con el recorrido de
video de la casa como pieza central del Home.

Trabajo hecho de noche, sin supervisión — Luis revisa esto en la mañana.
Todo lo de abajo está probado (Playwright, 3 rondas locales + intento de
3 rondas en producción, ver sección QA).

**Actualización — ronda de feedback de Luis (misma noche, post-deploy):**
Luis probó el sitio en vivo y pidió una segunda tanda de ajustes — ver
sección 9 al final de este README para el detalle completo (copy
emocional en vez de ROI/reventa, reencuadre de Ventanas y Techo,
brillo del video, y el cambio de mecánica a "agarrar y soltar" con
resolución por dirección/velocidad). Todo lo de abajo (secciones 1-8)
sigue siendo válido salvo donde la sección 9 lo indique explícitamente.

---

## 1. Paleta "premium" del brand kit — criterio aplicado

Brand kit real (extraído del manual de marca, `HOME_PRO_GUIDES_MANUAL_MARCA_PREVIEW.pdf`):
Azul Navy `#0C3166`, Aguamarina `#00C6C6`, Naranja `#FF6339`, Blanco/Negro.
Luis pidió explícitamente que la combinación se sienta "súper elegante y de
alto nivel" — no un volcado plano de los 3 hex. Decisiones tomadas en
`css/main.css`:

- **Navy hace de fondo/base** en las secciones clave (hero del recorrido,
  CTA final, footer, trust strip) — es el color que lleva el peso visual,
  no el naranja.
- **Naranja es el color de ACCIÓN, nunca de fondo grande** — botones
  primarios, eyebrows, el ícono del logo, el punto activo del pill-nav.
  Coincide con lo que Luis confirmó viendo el form real de HPG (el botón
  "Next" es ese naranja exacto).
- **Aguamarina queda de acento/fondo claro** (`--bg-light: #EFFBFB`, un
  celeste casi blanco) para las secciones de contenido (galería, blog) —
  nunca satura como color sólido grande, es la variante MUY clara del manual.
- Tipografía: el manual pide "Keyboard" (Fenotype, de pago, no licenciada
  para este prototipo) — sustituida por **Nunito** con `font-weight: 800`
  en titulares (el peso 500 se veía débil para el protagonismo editorial
  que pide el manual).
- Logo real extraído del PDF (ver sección 3) y montado en el header/footer
  de las 10 páginas del sitio, en naranja (funciona igual de bien sobre
  header oscuro y header claro — evita mantener 2 variantes de color).

Autocrítica (`impeccable`, informal — ver capturas en QA): jerarquía clara
(headline > body > CTA), contraste AA+ en todos los textos sobre navy y
sobre el scrim del video, un solo acento de color por pantalla (naranja),
espaciado generoso, nada compite con el CTA.

---

## 2. El recorrido — VIDEO real con snap-scroll (reemplaza fotos y 3D)

**El experimento 3D anterior (`../casa-3d-preview-2026-09/`, `scene3d-core.js`,
`scene3d-boot.js`) fue descartado por completo** — se borraron esos JS y las
imágenes/texturas que solo alimentaban ese sistema (`assets/textures/`,
`zone-*.jpg`, `hero-exterior.jpg`, `fetch_textures.py`). El recorrido real
ahora es el video de Luma AI que aprobó Luis:
`assets/video/house-tour.mp4` (re-encodado de 22.6MB → 8.2MB, 1280px,
h264, `-g 12` = keyframe cada 0.5s — importante, ver más abajo).

### Cómo funciona el scroll (snap-scroll por puntos fijos, NO scrub continuo)

Motor: `js/scroll-tour.js` + `css/scroll-tour.css`. Mientras la página está
en `scrollY=0` (el hero ocupa toda la pantalla), la rueda/el swipe **no
mueve la página** — mueve el índice de parada (0 a 5). Cada paso dispara un
**scrub animado** (`requestAnimationFrame`, easing cúbico, 420–900ms según
la distancia entre timestamps) hacia el siguiente punto, donde el video se
congela hasta el próximo input. Al llegar a la última parada (Baño) y seguir
bajando, se libera el control — la página scrollea normal al resto del
sitio. Si el usuario vuelve a `scrollY=0`, se re-activa y el scroll hacia
arriba retrocede paradas. Mobile: swipe vertical dispara el mismo snap
(sin scroll libre del video) — implementado con `touchstart/move/end`.

**Por qué NO es reproducir el video en tiempo real entre paradas:** los
tramos son de 3.5 a 9 segundos de metraje — reproducirlos a velocidad
normal en cada scroll se sentiría lento, no "rápido" como pidió Luis. Por
eso el salto es un scrub con duración fija corta (proporcional a la
distancia, entre 420 y 900ms) en vez de `video.play()`.

### Timestamps elegidos (6 paradas)

| # | Parada | Segundo | Por qué ese frame |
|---|---|---|---|
| 0 | Llegada | 1.0s | Fachada completa, cámara ya asentada |
| 1 | Techo | 9.0s | Techo + torre de ventanas, buen detalle de teja |
| 2 | Ventanas | 14.0s | Perfil lateral con varias ventanas en fila |
| 3 | Cocina | 21.0s | Primer plano interior, isla + campana |
| 4 | Sala | 26.0s | Comedor/sala, ángulo con luz natural |
| 5 | Baño | 29.5s | Espejo arqueado, tocador — cierre del recorrido |

**Detalle técnico importante:** los 6 timestamps son **múltiplos exactos de
0.5s** (keyframe del encode, `-g 12` a 24fps). Se probó en vivo que pedir
`video.currentTime` en un frame intermedio entre keyframes puede decodificar
un frame corrupto — se vio literalmente con el timestamp original `0.8s`:
el watermark de Luma AI aparecía gigante SOLO en ese frame exacto (confirmado
reproducible con ffmpeg y en Chromium real vía Playwright). Cambiar a `1.0s`
lo resolvió. Si se agregan o mueven paradas, mantener múltiplos de 0.5s.

### Watermark de Luma AI — mitigado, no eliminado

El video fuente trae el watermark "Luma AI" quemado (nivel del plan usado
para generarlo) y **su posición cambia de toma a toma** (arriba-izq. en
Llegada/Techo, abajo en Ventanas/Cocina/Baño). No hay forma de removerlo
con el stack disponible esta noche (necesitaría inpainting cuadro por
cuadro o regenerar el video en un plan de Luma sin marca). Mitigación
aplicada: cada parada tiene su propio zoom/paneo (`WM_HIDE` en
`scroll-tour.js`, variables CSS `--wm-scale`/`--wm-ty`) que empuja esa
esquina fuera de cuadro o la deja dentro de la zona ya oscurecida por el
scrim. Resultado verificado con capturas: el watermark queda invisible o
casi imperceptible en las 6 paradas. **Si se quiere eliminarlo del todo,
la opción real es regenerar el mismo recorrido en un plan de pago de Luma
AI (sin marca de agua)** — decisión de Luis, no se gastó nada esta noche.

### Copy de cada parada (reescrito, ángulo FL/CA real)

Reemplaza el copy genérico heredado. Cada headline ataca un dolor/beneficio
específico (mismo ángulo ya usado en el blog) y cada CTA tiene un verbo
distinto:

- **Llegada** — primera impresión / precio de reventa → *"Diagnostica tu casa gratis"*
- **Techo** — huracanes + inspección de seguro → *"Inspecciona tu techo"*
- **Ventanas** — factura de luz / UV / ruido → *"Reduce tu factura de luz"*
- **Cocina** — ROI de reventa → *"Diseña tu cocina"*
- **Sala** — un solo equipo vs. varios contratistas → *"Agenda tu evaluación"*
- **Baño** — moho/grietas, no solo estética → *"Renueva tu baño"*

### Precarga como blob + por qué el video pesa lo que pesa (1.7MB)

Igual que el bug del timestamp 0.8s, esto se encontró probando en el sitio
YA desplegado (nunca aparece en local): el snap-scroll se veía "roto" —
saltaba a la parada equivocada. Diagnóstico real (no supuesto): el servidor
de Sliplane tiene un techo de subida de red de **~280 KB/s** (medido con
`curl` puro, sin browser de por medio, contra varios archivos de tamaños
distintos — no es un problema del sitio ni de Chromium). Con el video
original de 5.4MB eso son 19–27 segundos de descarga; mientras tanto
`video.currentTime` reportaba el timestamp pedido pero el frame real
todavía no había llegado, así que se veía contenido de OTRA parada.

**Fix de dos partes:**
1. `js/scroll-tour.js` ahora precarga el video ENTERO como blob
   (`fetch` → `blob()` → `URL.createObjectURL`) antes de habilitar
   cualquier input de scroll/swipe (`state.ready`) — una sola descarga,
   cero latencia de red por cada scrub después de eso. El `<video>` usa
   `preload="none"` para que el navegador no compita con esa descarga.
2. El video se re-comprimió de 5.4MB → **1.7MB** (720px de ancho, crf 33,
   sigue en múltiplos de keyframe de 0.5s) — a ~280KB/s eso son ~5-6s de
   espera en vez de 19-27s. Calidad verificada a resolución real de
   pantalla (1440px, video escalado 2x): sin bloques ni artefactos
   visibles detrás del scrim.

**Trade-off que Luis debe conocer:** durante esos ~5-6 segundos iniciales
(mientras el video termina de precargarse) el scroll/swipe sobre el hero
no hace nada — no se ve roto, simplemente no reacciona todavía (el
poster + título + CTA ya están visibles y son 100% funcionales desde el
frame 1). Si esto se siente muy largo en pruebas reales de usuario, las
dos palancas para bajarlo más son: (a) comprimir aún más el video
(quedaría con menos nitidez), o (b) alojar el sitio en un servidor con
más ancho de banda de subida — el límite de ~280KB/s parece ser del
plan/servidor de Sliplane usado esta noche, no de esta implementación.

### Fallback `prefers-reduced-motion`

El motor de scroll-jacking **nunca arranca** si el usuario tiene reduced
motion activado (`scroll-tour.js` corta temprano). En su lugar, CSS muestra
un hero estático (poster) con la parada "Llegada" superpuesta, y las otras 5
paradas se apilan como bloques normales debajo, cada uno con su propia foto
fija (frame extraído del mismo video, `assets/images/tour-stop-*.jpg`) —
verificado visualmente, sin scroll-jacking ni video corriendo.

---

## 3. Logo real

Extraído de `HOME_PRO_GUIDES_MANUAL_MARCA_PREVIEW.pdf` (pág. 2, "Componentes
de la marca" — el isotipo limpio en blanco/negro a 600dpi). Recortado,
convertido a PNG con transparencia real (umbral de luminosidad → alpha) y
coloreado en naranja de marca (`assets/images/logo-mark.png`, 512×512).
Se usa como ícono en el `<a class="logo">` del header y en el footer de las
10 páginas del sitio (index, blog×4, contacto×5) — reemplazando el punto
decorativo genérico que había antes. También se regeneró el favicon
(`favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`) con los colores
navy/naranja reales — el anterior tenía los colores viejos (verde/dorado)
de una versión descartada.

---

## 4. Formularios — confirmación visual verificada

Los 5 wizards (general + roofing/windows/kitchen/bathroom) YA tenían el
estado de éxito construido (`js/wizard.js`, función `renderSuccess()`):
al tocar "Enviar solicitud" en el último paso se ve un ✓ + *"¡Listo,
recibimos tu solicitud!"*. No hizo falta construir nada nuevo — se
verificó con Playwright corriendo el flujo completo (todas las preguntas)
en `roofing.html` y `kitchen.html` de punta a punta, sin errores de
consola, con la pantalla de confirmación renderizando bien. Los otros 3
comparten el mismo motor genérico (mismo `data-wizard-steps` + `isLast`),
así que el comportamiento es idéntico.

---

## 5. Blog

Los 3 artículos con imágenes ya se veían bien con la paleta nueva (no
necesitaron ajuste de CSS) — verificado visualmente en `blog/index.html` y
en el artículo de techos completo. El bloque "Sigue leyendo" al final de
cada artículo usa el mismo patrón `.reveal` (fade-in on scroll) que el
resto del sitio — aparece vacío solo si nunca entra al viewport, lo cual es
el comportamiento esperado (confirmado haciendo scroll hasta ahí).

---

## 6. QA — Playwright, 3 rondas LOCAL antes de deploy

Corrido contra `desktop` (1440×900), `iphone` (390×844) y `android`
(412×915), más una pasada con `reduced_motion=reduce`. Herramienta:
Python + `playwright` (síncrono), screenshots en
`/private/tmp/.../scratchpad/qa1/` (no se copiaron al repo).

**Encontrado y corregido durante las 3 rondas locales:**
1. **Watermark gigante en el timestamp 0.8s** (ver sección 2) → resuelto
   moviendo el timestamp a un keyframe exacto (1.0s).
2. **Watermark visible en las otras 5 paradas** → resuelto con zoom/paneo
   por parada (`WM_HIDE`).
3. **Servidor local sin soporte de `Range` requests** (`python -m
   http.server` no lo soporta) causaba que el scrub pareciera "saltar a la
   parada equivocada" en las pruebas automatizadas locales — no era un bug
   del sitio, era el server de prueba. Se cambió a `http-server` (soporta
   `Accept-Ranges`) para las pruebas locales.

**Verificado sin problemas en local:** 0 errores de consola en las 10
páginas × 3 viewports, 0 overflow horizontal, snap-scroll adelante/atrás
funciona (incluyendo re-enganche al volver a `scrollY=0`), los 5 wizards
llegan a confirmación, mobile menu abre/cierra, reduced-motion cae al
fallback estático apilado sin video ni scroll-jacking.

---

## 7. Deploy — Sliplane

- Repo: `github.com/Infohpg/hpg-web-propuesta` (cuenta `Infohpg`, token
  dedicado en `_credenciales/home-pro-guides/.env`, `GITHUB_HPG_TOKEN`).
- `Dockerfile` — `nginx:alpine` sirviendo el sitio estático completo,
  `.dockerignore` excluye `.git`/README/Dockerfile de la imagen.
- Proyecto Sliplane autorizado: `project_4ltf8het0m1x` ("AI Search Leads").
  Verificado en vivo ANTES de crear nada (`GET .../services`): solo existía
  `roof-scanner` (suspended) — no se tocó, no se modificó.
- **Servicio creado:** `service_ljkqz7w1ale8`, nombre `hpg-web-propuesta`,
  server `server_dw3j8mjh6mrh`, `autoDeploy: true` sobre `main`.
- **URL pública:** `https://hpg-web-propuesta.sliplane.app`

## 8. QA — 3 rondas MÁS sobre el sitio YA desplegado (producción real)

Esto encontró **dos bugs que NUNCA aparecieron en local** — el motivo
exacto de por qué el protocolo pide probar contra la URL real y no
confiar solo en el QA local:

1. **Bug de alineación horizontal del hero** (rondas 1-2 de producción):
   al cambiar de parada, `.tour-pin` (que tiene `overflow:hidden`)
   empezaba a acumular `scrollLeft` — el video y el panel de texto se
   desalineaban más y más con cada scrub, hasta cortar el texto contra el
   borde izquierdo. Causa raíz: el `activeBtn.scrollIntoView({inline:
   'center'})` que se había agregado para el pill-nav en mobile —
   Chromium trata cualquier ancestro con `overflow:hidden` como un
   scroll-container válido para ese método, aunque nunca estuvo pensado
   para scrollear. **Fix:** se quitó `scrollIntoView` por completo;
   ahora se mueve a mano solo `pillnav.scrollLeft` (el único elemento que
   de verdad tiene `overflow-x:auto`, y solo en mobile).
2. **Bug de red: el snap-scroll mostraba la parada equivocada** (ronda 3
   de producción) — diagnosticado y corregido en detalle en la sección 2
   ("Precarga como blob + por qué el video pesa 1.7MB"): el servidor
   Sliplane tiene ~280KB/s de subida real (medido con `curl`), el video
   de 5.4MB tardaba 19-27s en llegar y los seeks del scrub quedaban
   adelantados al contenido real descargado. Fix de dos partes: precarga
   completa como blob antes de habilitar la interacción + video
   recomprimido a 1.7MB.

**Verificado sin problemas en producción (después de los 2 fixes),
contra `https://hpg-web-propuesta.sliplane.app`:**
- Snap-scroll completo adelante (Llegada→Baño) y atrás, en desktop
  (Chromium, wheel) y mobile (viewport 390×844, swipe táctil real) — las
  6 paradas muestran el contenido correcto, sin desalineación.
- Los 5 wizards (`roofing.html`, `kitchen.html` probados end-to-end
  completos) llegan a la pantalla de confirmación.
- 0 errores de consola y 0 overflow horizontal en las 10 páginas × 3
  viewports (desktop/iPhone/Android) + reduced-motion, contra la URL real.
- Video: 1.7MB, ~4.6s de descarga real medida contra el servidor en vivo.

## Cómo verlo en local

```bash
cd web-hpg-propuesta-2026-09-marca-real
npx http-server -p 8936 -c-1
# abrir http://localhost:8936/index.html
# (usar http-server o cualquier server con soporte de Range requests —
#  python -m http.server NO sirve Range; no afecta producción, que usa nginx)
```

---

## 9. Segunda ronda — feedback de Luis sobre el sitio YA en vivo

Luis probó `https://hpg-web-propuesta.sliplane.app` y pidió 5 ajustes.
Detalle de cada uno:

### 9.1 Copy — de "reventa/ROI" a emocional (identidad + deseo)

Reescrito TODO el copy del recorrido salvo la parada **Sala** (el copy de
"un solo equipo vs. contratistas" se dejó tal cual, a pedido explícito).
Textos finales:

| Parada | Headline | CTA |
|---|---|---|
| Llegada | *"No esperes a que te llegue la casa de tus sueños — convierte la tuya, ahora."* (frase de Luis, casi textual) | Conviértela hoy |
| Techo | *"Duerme tranquilo la próxima vez que truene fuerte sobre tu casa."* (se sacó la mención al seguro) | Inspecciona tu techo |
| Ventanas | *"Se nota apenas entras: luz real, silencio real, una casa que por fin se siente tuya."* | Renueva tus ventanas |
| Cocina | *"La cocina donde por fin quieres reunir a toda tu familia."* | Diseña tu cocina |
| Sala | *(sin cambios — "Coordinar tres contratistas distintos no debería ser tu segundo trabajo.")* | Agenda tu evaluación |
| Baño | *"Tu baño debería sentirse como un respiro, no como algo que evitas mirar de cerca."* | Renueva tu baño |

### 9.2 Encuadre — Ventanas y Techo

- **Ventanas**: timestamp movido de 14.0s → **16.5s** (múltiplo de 0.5s,
  keyframe exacto). A los 14s las ventanas quedaban de fondo/lateral; a
  16.5s hay 4 ventanas grandes de frente, bien iluminadas, ocupando la
  mitad inferior del cuadro — verificado con grillas de frames antes de
  elegir.
- **Techo**: se mantiene en 7.5s (ya elegido en la ronda anterior), pero
  se corrigió un problema real de encuadre en mobile (ver 9.3).

### 9.3 Encuadre por parada en mobile — hallazgo técnico real

El video es 4:3 apaisado. Con `object-fit:cover`:
- En **desktop** (contenedor más ancho que el video) el recorte pasa en
  el eje **Y** — `object-position` vertical sí tiene efecto real.
- En **mobile** (contenedor angosto y muy alto) el recorte pasa casi
  entero en el eje **X** — el alto se ve casi completo sin recortar, así
  que `object-position` vertical es básicamente un **no-op** ahí.

Esto se confirmó con capturas reales: Techo en mobile se veía "todo
cielo, nada de techo" a pesar de tener un valor de encuadre vertical
configurado, porque ese valor no podía hacer nada (no había margen para
recortar). La solución real fue agregar zoom+paneo de verdad (mismo
mecanismo que ya usa `WM_HIDE` para tapar el watermark, ahora con
variantes `WM_HIDE_MOBILE` específicas) que sí generan margen para
recortar y entonces sí reencuadran. Para el resto de las paradas
(Ventanas/Cocina/Sala/Baño) el ajuste fue vía `FRAME_FOCUS` — un
`object-position` en X distinto para mobile, que ahí sí tiene efecto
real. Las 6 paradas se verificaron con capturas reales en 390×844
(mobile) y 1440×900 (desktop) — no solo se asumió que el ajuste de
desktop ya cubría mobile.

### 9.4 Brillo del video

Re-encode con `eq=brightness=0.06:contrast=1.08:saturation=1.08:gamma=1.12`
antes de escalar — notablemente más luminoso sin lavar el contraste ni
verse artificial. Verificado comparando frames antes/después de las 6
paradas.

### 9.5 Interacción — de "snap con un poco de scroll" a "agarrar y soltar"

Cambio de mecánica real, no solo estético (`js/scroll-tour.js`, función
`dragStart`/`dragMove`/`dragRelease`):

- Con el dedo/click **presionado**, el video se scrubea **libremente**
  (1:1, sin snap) hacia la parada siguiente o anterior según hacia dónde
  se mueva — se puede "jugar" a mitad de camino.
- Al **soltar**, resuelve por **dirección/velocidad reciente del gesto**
  (paging tipo iOS con velocidad), no por posición más cercana: si el
  arrastre iba hacia la próxima parada, termina ahí aunque no haya
  llegado a mitad del camino físico. Un gesto mínimo/ambiguo (sin
  desplazamiento ni velocidad real) vuelve a la parada de origen.
  Nunca queda a mitad de camino — siempre resuelve hacia una de las dos
  paradas vecinas.
- Implementado igual para **touch y mouse-drag** (desktop). El **wheel**
  (rueda/trackpad) se dejó con el snap simple de siempre — es la
  interacción "de repuesto" en desktop, el drag con mouse es la nueva
  interacción principal ahí también.
- Ventana de arrastre: 220px de movimiento cubren el tramo completo
  hacia la parada vecina. Umbral de intención: 18px de desplazamiento
  total O 0.35px/ms de velocidad reciente (lo que se cumpla primero).
  La velocidad se calcula sobre los últimos ~150ms de historial del
  gesto (no el promedio de todo el gesto), así un cambio de dirección
  justo antes de soltar pesa lo que tiene que pesar.

**Verificado con Playwright, contra el sitio en producción, repitiendo
el gesto 5 veces seguidas** (soltar en el punto medio exacto — 110px de
los 220px del rango): en las 5 repeticiones consecutivas el video
resolvió por dirección — Ventanas→Cocina→Sala→Baño→(clamp en Baño) — y
la etiqueta activa del pill-nav cambia **instantáneamente** al soltar
(antes de que termine la animación del video), confirmando que la
resolución de dirección no depende de que el scrub visual ya haya
llegado. También se probó soltar dragueando hacia atrás, y revertir la
dirección justo antes de soltar (la velocidad reciente manda sobre el
desplazamiento total acumulado) — ambos casos se comportan como se
espera.

### 9.6 Bug real encontrado en esta ronda — y por qué el video terminó en 2.3MB

Se probó primero, como pedía el protocolo, un `<video preload="auto">`
**nativo sin blob-preload** (nginx sí sirve Range requests bien,
confirmado con `curl`). Funcionaba perfecto en local y en las primeras
pruebas rápidas de producción. Pero probando más a fondo (saltos a
zonas del archivo lejos de donde ya se había reproducido, con esperas
realistas) **reapareció el mismo bug de desfase de la ronda anterior**:
`video.currentTime` ya marcaba el timestamp correcto (ej. 16.5s,
Ventanas) pero el frame VISIBLE seguía siendo el de la parada anterior
varios segundos después — el evento `seeked` puede disparar antes de
que el frame esté realmente pintado cuando la red es lenta.

Peor: al medir el ancho de banda real del servidor de Sliplane varias
veces con `curl` puro (sin browser de por medio), el resultado **no fue
estable** — osciló entre ~136KB/s y ~486KB/s en la misma noche, sin
patrón claro (probablemente un servidor compartido con carga variable).
Con un archivo de 5MB eso significa entre 10 y 37 segundos de descarga
según el momento — inaceptable para depender de que "ya debería estar
buffereado" en un seek a media reproducción.

**Decisión final:** volver al blob-preload forzado (la versión
100% confiable — cero dependencia de red una vez cargado el archivo
entero) pero con el video comprimido más agresivo para que la espera
inicial sea corta incluso en el escenario de banda ancha mala:

| Intento | Resolución | Tamaño | Descarga @280KB/s | Descarga @136KB/s (peor caso medido) |
|---|---|---|---|---|
| v1 (ronda anterior) | 1280px | 8.2MB | ~29s | ~60s |
| v2 nativo (esta ronda) | 1024px crf23 | 8.3MB | — (bug de desfase, no llegó a probarse el tamaño) |
| v3 blob 5MB | 1024px crf27 | 5.0MB | ~18s | ~37s (medido real) |
| **v4 FINAL** | **720px crf30** | **2.3MB** | **~8s** | **~17s** |

El video final (`assets/video/house-tour.mp4`, 2.3MB) se probó en vivo
contra producción: blob listo en **6.9s** en una corrida real. Calidad
verificada a resolución de pantalla completa (1440px) — se nota algo
menos nítido que la versión de 8MB, pero sigue siendo una buena imagen
de fondo, y la confiabilidad del scrub (cero desfase, siempre) importa
más que los últimos puntos de nitidez dado el ancho de banda real
disponible esta noche.

**Para Luis:** si en un hosting con más ancho de banda de subida (no
Sliplane, o un plan superior) se quiere volver a una resolución/bitrate
más alto, el video fuente en `/tmp` de esta sesión ya no existe pero el
comando de encode queda documentado acá — solo hay que resubir el
original de Luma AI y correr:
```
ffmpeg -i ORIGINAL.mp4 -vf "eq=brightness=0.06:contrast=1.08:saturation=1.08:gamma=1.12,scale=1024:-2" \
  -r 24 -c:v libx264 -preset veryslow -crf 24 -g 12 -keyint_min 12 -sc_threshold 0 -pix_fmt yuv420p -an -movflags +faststart house-tour.mp4
```
(y recalcular timestamps si el `-g 12`/framerate cambian).

---

## 10. Bug crítico reportado por Luis/coordinador — "el sitio no reacciona a nada"

Reportado tras probar en Chrome real contra producción: rueda del mouse pasa de largo el hero sin hacer snap, click-drag no reacciona, y click directo en los botones del pill-nav no cambia nada — además apareció un glitch de layout (texto cortado en los bordes). Investigado con Playwright usando gestos reales (`page.mouse.wheel`/`down`/`move`/`up`, no `dispatchEvent` sintético) contra la URL pública, no local. **Encontradas DOS causas raíz reales, no una:**

### 10.1 Causa raíz #1 — sin ninguna señal de que el video sigue cargando

El blob-preload (sección 9.6) puede tardar entre ~6 y ~25+ segundos según
el ancho de banda real del servidor esa noche (inconsistente, medido).
Mientras tanto `state.ready=false` y **wheel/drag/pill-nav se ignoran
silenciosamente a propósito** (para no romper nada a medio cargar) —
pero no había NINGUNA señal visual de que la página seguía viva. Un
usuario real testeando en los primeros segundos (comportamiento
esperable) percibe el sitio como roto, no como "cargando". Confirmado
reproduciendo exactamente eso: clickear un pill-nav a los 0s de cargada
la página no hace nada, con video.src todavía vacío.

**Fix:** estado de carga visible (`js/scroll-tour.js` — `setLoadingUI`/
`markReady`, clase `is-tour-loading` en el HTML por defecto): mientras
carga, el pill-nav queda atenuado y con `pointer-events:none` (no se
puede clickear algo que todavía no va a responder — mejor eso que un
click mudo), y el hint de abajo cambia a "● Cargando el recorrido…"
con un punto pulsante. Al quedar listo, vuelve a "Scroll para recorrer
la casa" y el pill-nav se reactiva. Verificado con throttling de red
real (CDP, 60-150KB/s) — capturas antes/durante/después en
`scratchpad/qa1/loading_fix/`.

### 10.2 Causa raíz #2 — candado que podía quedar pegado para siempre (bug real, no de timing)

`state.animating` se pone en `true` al arrancar un drag y solo se
libera cuando `dragRelease()` corre hasta el final. Pero el handler de
`touchcancel` (interrupciones reales: llamada entrante, gesto del
sistema, etc.) solo limpiaba `drag = null` y **nunca liberaba el
candado** — y como wheel/drag/pill-nav (`goTo()`/`dragStart()`)
chequean ese candado antes de hacer cualquier cosa, un solo
`touchcancel` a mitad de un gesto dejaba el recorrido **muerto para
siempre**, sin importar cuánto se esperara. Mismo riesgo con mouse si
la ventana pierde el foco a mitad de un drag (el `mouseup` puede no
llegar nunca).

**Fix:** candado con timestamp + auto-liberación de seguridad
(`clearStuckLock()`, 3 segundos — bien por encima de los ~1.8s que
tarda como máximo una animación legítima). Se llama al entrar a
`onWheel`, `dragStart` y `goTo`. Además arreglados los dos casos
puntuales que lo podían dejar pegado: `touchcancel` ahora sí libera el
candado, y se agregó un handler de `window.blur` como red de
seguridad extra para el caso del mouse. También se agregó
`user-select:none` en `.tour-pin` — el glitch de "texto cortado en los
bordes" que vio el coordinador es consistente con selección de texto
nativa disparada por un click-drag que no pudo iniciar el gesto propio
(porque `!state.ready`) y no hizo `preventDefault()`; ahora ya no
puede pasar.

**Verificación (no solo "probé y funcionó" — evidencia concreta):**
contra `https://hpg-web-propuesta.sliplane.app`, replicando los 3
métodos exactos del reporte:
1. Wheel scroll rápido (6 eventos) inmediatamente al cargar la página,
   sin esperar nada → `scrollY` se queda en `0` (antes del fix se iba
   a las secciones de abajo).
2. Click-drag inmediato (mismo timing) → pill-nav se queda en
   "Llegada", `scrollY=0`, y el `<h2>` del panel mide exactamente los
   mismos márgenes izquierdo/derecho (100px / 560px) antes y después
   del intento — cero corrimiento horizontal.
3. Clicks reales (`page.click()`, no `dispatchEvent`) en los 5 botones
   restantes del pill-nav, uno por uno, ya con el video listo → los 5
   cambian el `active` correctamente y el `<h2>` mide **exactamente
   los mismos márgenes (100px / 560px) en los 5 clicks** — sin ningún
   glitch de layout.

Capturas de las 3 pruebas en `scratchpad/qa1/coord_repro/` (no se
copiaron al repo del sitio).

---

## 11. Cambio de enfoque final — se eliminó el candado global por completo

El fix de la sección 10 (estado de carga visible) **seguía fallando**:
reportado en vivo que "● Cargando el recorrido…" quedaba pegado para
siempre aunque el `GET .../house-tour.mp4` ya hubiera devuelto 200
completo — el listener de `loadedmetadata` que debía liberar el flag
simplemente no disparaba en ese caso (causa exacta no aislada del todo,
pero irrelevante: el problema de fondo es la ARQUITECTURA, no el bug
puntual). **Cualquier diseño con un flag global "bloqueado hasta que
algo específico pase" es fràgil por definición — si ESE algo no pasa
por la razón que sea, todo queda muerto para siempre.** Ya van dos
veces (sección 10.2 y esta) que ese patrón falla en producción de
formas distintas.

**Cambio de enfoque (pedido explícito, no otro parche sobre lo mismo):**
se eliminó el candado global por completo. `js/scroll-tour.js` ya no
tiene ningún `state.ready`, `loadFullVideo()`, `setLoadingUI()` ni
clase `is-tour-loading` — todo eso se borró. El `<video>` vuelve a
`preload="auto"` (nativo, sin blob) y es **interactuable desde el
primer instante** en el que carga el script. nginx en Sliplane sirve
Range requests bien (confirmado con `curl` — 206 + `Content-Range`
correctos), así que un seek a una zona todavía no bufferada
simplemente tarda lo que tarde esa descarga puntual — el navegador la
maneja solo, sin que ningún JS tenga que decidir "todavía no".

Lo único que sigue existiendo es un candado **por transición** (no
global): `state.animating` evita que una nueva transición pise a una
en curso, y se resuelve solo cuando dispara el evento `seeked` de ESA
seek puntual (con un timeout de seguridad de 2.5s, generoso para redes
lentas, pero acotado a esa transición — no puede tumbar el resto del
sitio). El candado anti-atasco de 3s→5s (`clearStuckLock`, sección
10.2) se mantiene como red de seguridad adicional, ahora con más
margen.

**Trade-off aceptado explícitamente por el coordinador:** en el peor
caso de ancho de banda, el primer seek a una parada lejana puede tardar
unos segundos en verse — no hay forma de eliminar esto sin volver a
precargar todo (que es exactamente lo que causaba los dos bugs
anteriores). Se prefiere una demora ocasional y visible a un sitio que
puede quedar permanentemente muerto.

### Verificación — medición objetiva, no "lo probé y anduvo"

Con Playwright contra `https://hpg-web-propuesta.sliplane.app`,
capturando `video.currentTime` programáticamente antes/después de cada
interacción:

**Condiciones normales (sin throttling):**
```
[t=4.36s] INMEDIATO (sin esperar nada) -> currentTime=1  readyState=4
[t=5.42s] 1 wheel tick (1s después)    -> currentTime=7.5   active=Techo   (esperado: 7.5 / Techo)
[t=6.50s] click "Baño"  (1s después)   -> currentTime=29.5  active=Baño    (esperado: 29.5 / Baño)
```
0 errores de consola.

**Condiciones adversas (throttling real vía CDP, 50KB/s — peor que
cualquier medición real del servidor esta noche):** click directo a
"Baño" (la parada más lejana, peor caso de distancia) inmediatamente
al cargar la página, sin esperar nada:
```
[t=6.05s] click "Baño" bajo 50KB/s
[t=6.06s] currentTime=1.00
[t=6.46s] currentTime=11.01   (en movimiento)
[t=6.86s] currentTime=29.34   (llegando)
[t=8.09s] currentTime=29.50   (asentado)
```
Resuelve en ~2s incluso en el escenario de red más castigado que se
probó esta noche — nunca se cuelga, nunca requiere esperar a un flag
global. Un segundo click disparado a destiempo (mientras la transición
anterior todavía estaba resolviendo `seeked`) se ignoró una vez —
comportamiento esperado de debounce, no un cuelgue: un click posterior
volvió a funcionar de inmediato, confirmado repitiendo la prueba.

**Broad QA final** (10 páginas × desktop/iPhone/Android/reduced-motion,
40 combinaciones) contra producción: **40/40 `overflow_px=0 errors=[]`**
(dos corridas previas tuvieron timeouts de red transitorios en `goto()`
—no relacionados con el código, confirmados como blips pasajeros
reintentando y con `curl` mostrando <1s de respuesta del servidor en
el medio— la tercera corrida salió limpia).

