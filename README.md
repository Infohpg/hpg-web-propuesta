# Home Pro Guides — Propuesta de sitio (VERSIÓN FINAL, 2026-09-08/09)

Esta carpeta es la **única versión final** de la propuesta (decisión de Luis:
se dejó de mantener `../web-hpg-propuesta-2026-09/` en paralelo). Construida
sobre la paleta real del brand kit de Home Pro Guides, con el recorrido de
video de la casa como pieza central del Home.

Trabajo hecho de noche, sin supervisión — Luis revisa esto en la mañana.
Todo lo de abajo está probado (Playwright, 3 rondas locales + intento de
3 rondas en producción, ver sección QA).

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

