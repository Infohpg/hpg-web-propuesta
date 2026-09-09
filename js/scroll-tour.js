/* ============================================================
   Home Pro Guides — scroll-tour.js (v4, VIDEO snap-scroll)

   Reemplaza el motor de fotos con crossfade / la escena 3D. Ahora
   maneja UN <video> real con 6 paradas fijas (timestamps reales,
   sacados con ffprobe/ffmpeg del video aprobado por Luis).

   Comportamiento pedido explícitamente (no es scroll continuo):
   - Mientras el hero está "pineado" (scrollY de la página en 0, el
     hero ocupa toda la pantalla), la rueda/el swipe/el drag NO mueven
     la página — mueven el índice de parada.
   - Wheel (mouse/trackpad): snap simple por tick, scrub animado
     (rAF-like con setTimeout, easing, 420-900ms) hacia la parada
     siguiente/anterior.
   - Touch Y mouse-drag (v6, pedido explícito): mecánica de "agarrar y
     soltar", NO snap-on-a-bit-of-movement. Mientras el dedo/click está
     presionado, el video se scrubea LIBREMENTE (1:1) hacia la parada
     vecina según hacia dónde se mueva — se puede jugar a mitad de
     camino. Al soltar, resuelve por DIRECCIÓN/VELOCIDAD reciente del
     gesto (paging tipo iOS), no por posición más cercana: si el
     arrastre iba hacia la próxima parada, termina ahí aunque no haya
     llegado a mitad del recorrido físico. Nunca queda a mitad de
     camino — siempre resuelve hacia una de las dos paradas vecinas
     (o vuelve al origen si el gesto fue mínimo/ambiguo).
   - Al llegar a la última parada (Baño) y seguir hacia abajo, se
     libera el control: la página scrollea normal hacia el resto del
     sitio. Si el usuario vuelve a scrollY=0, el hero se vuelve a
     "pinear" y retrocede paradas.
   - prefers-reduced-motion: nunca arranca este motor — ver el
     fallback estático en el propio HTML/CSS (bloques apilados).
   ============================================================ */
(function(){
  "use strict";

  var root = document.querySelector('[data-component="video-tour"]');
  if(!root) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion){
    root.classList.add('is-reduced-motion');
    return; /* el HTML ya trae el fallback apilado con fotos fijas */
  }

  var video = root.querySelector('.tour-video');
  var videoFrame = root.querySelector('.tour-video-frame');
  var panels = Array.prototype.slice.call(root.querySelectorAll('.tour-panel'));
  var navBtns = Array.prototype.slice.call(root.querySelectorAll('.tour-pillnav button'));
  var progressBar = root.querySelector('.tour-progress-bar');
  var hint = root.querySelector('.tour-scroll-hint');
  var hintText = root.querySelector('.tour-scroll-hint-text');

  /* Timestamps reales (segundos) — sacados revisando el video con
     ffprobe/ffmpeg, no estimados. Cada uno es el frame donde la
     parada "se lee" mejor (no el fotograma exacto del corte).
     A PROPÓSITO todos caen en un keyframe exacto (el encode usa
     -g 12 @ 24fps = keyframe cada 0.5s, por eso son múltiplos de
     0.5): se probó que pedir currentTime en un frame intermedio
     puede decodificar un frame corrupto/con artefacto visible
     (se vio en vivo con el timestamp 0.8 original — el watermark
     de Luma AI aparecía gigante solo ahí). Si se agregan o mueven
     paradas, mantener los timestamps en múltiplos de 0.5s. */
  var STOPS = [
    { time: 1.0,  label: 'Llegada'   },
    { time: 7.5,  label: 'Techo'     },
    { time: 16.5, label: 'Ventanas'  },
    { time: 21.0, label: 'Cocina'    },
    { time: 26.0, label: 'Sala'      },
    { time: 29.5, label: 'Baño'      }
  ];
  var last = STOPS.length - 1;

  /* El watermark de Luma AI cae en una esquina distinta según la
     toma (no es fijo en pantalla). En vez de vivir con eso, cada
     parada trae su propio zoom/paneo (variables CSS --wm-scale/
     --wm-ty en .tour-video-frame) para empujar esa esquina fuera
     del cuadro visible o dentro de la zona ya oscurecida por el
     scrim. Ajustado a ojo contra capturas reales de cada parada. */
  var WM_HIDE = [
    { scale: 1.06, ty: '-1%'  }, /* 0 Llegada:  marca chica arriba-izq. */
    { scale: 1.12, ty: '-5%'  }, /* 1 Techo (7.5s): marca chica abajo, se ve al bajar el punto Y del encuadre */
    { scale: 1.10, ty: '-3%'  }, /* 2 Ventanas (16.5s): marca grande arriba-izq. */
    { scale: 1.08, ty: '2%'   }, /* 3 Cocina:   marca abajo-der. */
    { scale: 1.08, ty: '-2%'  }, /* 4 Sala:     marca arriba-der. */
    { scale: 1.08, ty: '2%'   }  /* 5 Baño:     marca abajo-der. */
  ];
  /* Override SOLO para mobile — el porqué: con object-fit:cover, en un
     contenedor angosto y muy alto (mobile) el video llena el alto
     completo SIN recortar nada verticalmente (el ancho es lo que se
     recorta ahí), así que `object-position` en Y es un no-op — no hay
     "de dónde" tomar más techo y menos cielo solo cambiando ese valor.
     La única forma real de reencuadrar en Y en mobile es agregar zoom
     de verdad (que sí crea margen para recortar) + paneo — el mismo
     mecanismo que ya usa WM_HIDE, así que se reusa aquí con valores
     más fuertes SOLO donde hace falta (Techo: se veía casi todo cielo,
     confirmado con captura real en 390×844). */
  var WM_HIDE_MOBILE = {
    1: { scale: 1.55, ty: '-19%' } /* Techo: empuja fuerte hacia abajo — más techo, menos cielo */
  };
  function applyWmHide(index){
    if(!videoFrame) return;
    var w = (mqMobile.matches && WM_HIDE_MOBILE[index]) || WM_HIDE[index] || WM_HIDE[0];
    videoFrame.style.setProperty('--wm-scale', String(w.scale));
    videoFrame.style.setProperty('--wm-ty', w.ty);
  }

  /* Encuadre por parada — SEPARADO del hide del watermark (ver arriba).
     El video es 4:3 (1024x768) apaisado; en desktop (contenedor más
     ancho que el video) object-fit:cover recorta LOS LADOS, así que el
     eje Y importa para encuadrar (ej. techo: bajar el punto Y muestra
     más techo y menos cielo). En mobile (contenedor angosto y muy alto)
     pasa lo contrario: casi no se recorta en Y (se ve el alto completo
     del frame), pero se recorta MUCHÍSIMO en X — ahí lo que importa es
     elegir el X correcto para que el elemento protagonista (ventana,
     isla de cocina, mesa) caiga dentro de la franja angosta visible,
     no que quede fuera de cuadro. Verificado a mano con capturas reales
     en los dos breakpoints — no es una fórmula, es lo que se ve bien. */
  var FRAME_FOCUS = [
    { desktop: '50% 42%', mobile: '50% 42%' }, /* 0 Llegada */
    { desktop: '50% 52%', mobile: '50% 40%' }, /* 1 Techo — desktop: más techo, menos cielo (sin bajar tanto que se vea el watermark) */
    { desktop: '50% 45%', mobile: '62% 42%' }, /* 2 Ventanas — mobile: las 2 ventanas grandes de la derecha */
    { desktop: '45% 45%', mobile: '38% 40%' }, /* 3 Cocina — mobile: isla + campana */
    { desktop: '50% 45%', mobile: '55% 40%' }, /* 4 Sala */
    { desktop: '55% 50%', mobile: '60% 40%' }  /* 5 Baño — mobile: lavamanos + espejo */
  ];
  var mqMobile = window.matchMedia('(max-width: 720px)');
  function applyFrameFocus(index){
    var f = FRAME_FOCUS[index] || FRAME_FOCUS[0];
    video.style.setProperty('--tour-pos', mqMobile.matches ? f.mobile : f.desktop);
  }

  /* v7: vuelta a blob-preload FORZADO (se probó nativo con preload="auto"
     primero, como pedía el protocolo — nginx en Sliplane sí sirve Range
     bien, confirmado con curl, y localmente/con red rápida funcionaba
     perfecto). Pero en producción real (servidor con ~280KB/s medido)
     seguía reapareciendo el desfase para SALTOS a zonas del archivo
     todavía no bufferadas: el evento 'seeked' puede disparar antes de
     que el frame esté realmente pintado cuando la red es lenta —
     confirmado en vivo: currentTime ya marcaba 16.5 (Ventanas) pero el
     video seguía mostrando el frame de Techo varios segundos después.
     Con blob-preload, una vez cargado el archivo entero NO hay más
     dependencia de red por scrub — cero riesgo de este bug. El video
     se recomprimió a ~5MB (crf 27) para que la espera inicial sea
     razonable (~15-18s a 280KB/s) sin perder nitidez notable. */
  var state = { index: 0, animating: false, ready: false, animatingSince: 0 };
  var rafId = null;

  /* Candado anti-atasco: state.animating puede quedar pegado en `true`
     para siempre si un gesto se interrumpe de forma anómala (ej.
     touchcancel real de iOS a mitad de drag, o el navegador perdiendo
     el mouseup si el usuario suelta fuera de la ventana) — y como TODO
     entra por goTo()/dragStart(), que chequean `state.animating`, un
     candado pegado deja el recorrido MUERTO para siempre (encontrado en
     vivo: "no reacciona a nada" en producción, reproducible). Nunca
     debería tardar más de ~1.8s en resolver (900ms de scrub + 900ms de
     margen esperando 'seeked'), así que 3s de sobra es un atasco real,
     no una animación legítima en curso — se libera solo. */
  var ANIMATING_SAFETY_MS = 3000;
  function setAnimating(v){
    state.animating = v;
    state.animatingSince = v ? Date.now() : 0;
  }
  function clearStuckLock(){
    if(state.animating && state.animatingSince && (Date.now() - state.animatingSince) > ANIMATING_SAFETY_MS){
      state.animating = false;
      state.animatingSince = 0;
      drag = null;
      mouseDragging = false;
    }
  }

  /* Estado de carga visible — SIN esto el hero se ve "roto" durante los
     varios segundos (a veces bastantes más, el ancho de banda del
     server midió entre 5 y 37s en la misma noche) que tarda la
     precarga completa del blob: probado en vivo, clickear un pill-nav
     o scrollear en ese lapso no hacía NADA y no había ninguna señal de
     que la página seguía viva — se sentía roto, no "cargando". */
  function setLoadingUI(isLoading){
    root.classList.toggle('is-tour-loading', isLoading);
    if(hintText){
      hintText.innerHTML = isLoading
        ? '<span class="tour-loading-dot"></span> Cargando el recorrido…'
        : 'Scroll para recorrer la casa';
    }
  }

  function markReady(){
    state.ready = true;
    setLoadingUI(false);
  }

  function loadFullVideo(){
    var sourceEl = video.querySelector('source');
    var src = (sourceEl && sourceEl.getAttribute('src')) || video.currentSrc;
    if(!src || typeof fetch !== 'function'){ markReady(); return; }
    fetch(src).then(function(res){ return res.blob(); }).then(function(blob){
      var blobUrl = URL.createObjectURL(blob);
      video.addEventListener('loadedmetadata', markReady, { once: true });
      video.src = blobUrl;
      video.load();
    }).catch(function(){
      /* Si el fetch falla seguimos con el <source> normal streameando —
         se habilita igual; en el peor caso un scrub muy rápido podría
         verse levemente atrasado, mejor eso que dejar el tour muerto. */
      markReady();
    });
  }

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
  function easeInOutCubic(t){ return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

  function updateUI(index){
    panels.forEach(function(p, i){ p.classList.toggle('is-focused', i === index); });
    navBtns.forEach(function(b, i){ b.classList.toggle('is-active', i === index); });
    if(progressBar) progressBar.style.width = ((index/last) * 100).toFixed(2) + '%';
    root.classList.toggle('is-mid-tour', index > 0);
    applyWmHide(index);
    applyFrameFocus(index);
    /* Autoscroll del pill-nav en mobile (el único donde tiene overflow-x).
       A PROPÓSITO no usamos `btn.scrollIntoView()`: Chromium considera
       `.tour-pin` (que tiene `overflow:hidden`, NO pensado como scroll
       container) un ancestro "scrollable" válido para ese método, y
       termina moviendo su scrollLeft — eso desalinea todo el hero
       (video + panel de texto) horizontalmente. Se vio en vivo. En vez
       de eso, movemos SOLO `.tour-pillnav.scrollLeft` a mano. */
    var pillnav = navBtns[0] && navBtns[0].parentElement;
    var activeBtn = navBtns[index];
    if(pillnav && activeBtn && pillnav.scrollWidth > pillnav.clientWidth){
      var target = activeBtn.offsetLeft - (pillnav.clientWidth - activeBtn.offsetWidth) / 2;
      pillnav.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
  }

  var STEP_MS = 90; /* separación entre seeks intermedios — pocos pedidos Range, no uno por rAF */

  function scrubTo(targetTime, onDone){
    if(rafId) clearTimeout(rafId);
    var start = video.currentTime || 0;
    var delta = targetTime - start;
    if(Math.abs(delta) < 0.02){ onDone(); return; }
    var dur = clamp(Math.abs(delta) * 90, 420, 900);
    var steps = clamp(Math.round(dur / STEP_MS), 5, 9);
    var i = 0;

    function landFinal(){
      try{ video.currentTime = targetTime; }catch(e){}
      /* No soltar el candado hasta confirmar que el navegador ya
         decodificó/pintó ese frame — 'seeked' es la señal real, no
         un timer optimista. Timeout de seguridad por si el evento
         no llega (ej. red muy lenta o falla momentánea). */
      var settled = false;
      function onSeeked(){
        if(settled) return;
        settled = true;
        video.removeEventListener('seeked', onSeeked);
        clearTimeout(safety);
        rafId = null;
        onDone();
      }
      var safety = setTimeout(onSeeked, 900);
      video.addEventListener('seeked', onSeeked);
    }

    function step(){
      i++;
      if(i >= steps){ landFinal(); return; }
      var eased = easeInOutCubic(i / steps);
      try{ video.currentTime = start + delta * eased; }catch(e){}
      rafId = setTimeout(step, dur / steps);
    }
    rafId = setTimeout(step, dur / steps);
  }

  function goTo(newIndex){
    if(!state.ready) return; /* metadata del video aún no cargó — ignorar el input, no romper nada visualmente */
    clearStuckLock();
    newIndex = clamp(newIndex, 0, last);
    if(newIndex === state.index || state.animating) return;
    state.index = newIndex;
    setAnimating(true);
    updateUI(newIndex);
    scrubTo(STOPS[newIndex].time, function(){ setAnimating(false); });
  }

  function atPageTop(){ return window.scrollY <= 1; }

  /* -------- Wheel (desktop trackpad/mouse) -------- */
  var wheelCooldown = false;
  function onWheel(e){
    if(!atPageTop()) return; /* el hero no está pineado: scroll normal de la página */
    var dir = e.deltaY > 0 ? 1 : (e.deltaY < 0 ? -1 : 0);
    if(dir === 0) return;

    if(dir === 1 && state.index >= last) return; /* última parada: deja pasar el scroll a la siguiente sección */
    if(dir === -1 && state.index <= 0) return;   /* primera parada: nada que retroceder, no-op */

    e.preventDefault();
    clearStuckLock();
    if(state.animating || wheelCooldown) return;
    wheelCooldown = true;
    setTimeout(function(){ wheelCooldown = false; }, 140);
    goTo(state.index + dir);
  }
  window.addEventListener('wheel', onWheel, { passive: false });

  /* -------- Drag "agarrar y soltar" (touch + mouse) --------
     Pedido explícito de Luis, no es el snap simple del wheel: mientras
     el dedo/click está presionado, el video se scrubea LIBREMENTE
     (drag directo, 1:1, hacia la parada siguiente O la anterior según
     hacia dónde se mueva) — se puede "jugar" a mitad de camino entre
     dos paradas. Al soltar, NO resuelve por posición más cercana —
     resuelve por la DIRECCIÓN/velocidad del gesto en el momento de
     soltar (igual que el paging con velocidad de un carrusel nativo
     tipo iOS): si el arrastre iba claramente hacia la próxima parada,
     termina en la próxima aunque no haya llegado a mitad del camino
     físico. Solo si el gesto fue mínimo/ambiguo (casi sin movimiento
     ni velocidad) vuelve a la parada de origen — nunca queda a mitad
     de camino congelado entre dos paradas. */
  var DRAG_RANGE_PX = 220;     /* px de arrastre para cubrir el tramo completo hacia la parada vecina */
  var FLICK_VELOCITY = 0.35;   /* px/ms — un flick rápido resuelve por dirección aunque el arrastre haya sido corto */
  var MIN_INTENT_PX = 18;      /* por debajo de esto, se considera "no hubo intención", vuelve al origen */

  var drag = null; /* { originIndex, originTime, startY, lastY, history:[{y,t}] } */

  function isInteractive(target){
    return !!(target && target.closest && target.closest('button, a, input, textarea, select'));
  }

  function dragTargetIndex(){
    /* dir: hacia dónde permite moverse el drag actual (+1 = hacia la
       próxima parada, -1 = hacia la anterior) según el signo del
       desplazamiento acumulado ahora mismo. */
    var dy = drag.lastY - drag.startY; /* >0 = dedo/mouse bajó = intención de avanzar (igual criterio que el swipe de antes) */
    return dy < 0 ? drag.originIndex + 1 : drag.originIndex - 1;
  }

  var DRAG_SEEK_MIN_MS = 70; /* throttle de los seeks durante el drag — no uno por pointermove */

  function dragStart(clientY, target){
    clearStuckLock();
    if(!state.ready || state.animating || !atPageTop() || isInteractive(target)) return false;
    drag = {
      originIndex: state.index,
      originTime: video.currentTime,
      startY: clientY,
      lastY: clientY,
      history: [{ y: clientY, t: performance.now() }],
      lastSeekT: 0
    };
    setAnimating(true); /* bloquea wheel/goTo mientras se arrastra */
    try{ video.pause(); }catch(e){}
    return true;
  }

  function dragMove(clientY){
    if(!drag) return false;
    drag.lastY = clientY;
    var now = performance.now();
    drag.history.push({ y: clientY, t: now });
    /* solo hace falta ~150ms de historial para calcular velocidad al soltar */
    while(drag.history.length > 2 && now - drag.history[0].t > 150) drag.history.shift();

    var dy = drag.lastY - drag.startY;
    var targetIdx = dragTargetIndex();
    var neighborExists = targetIdx >= 0 && targetIdx <= last;
    if(!neighborExists) return false; /* en el borde (Llegada/Baño): no hay hacia dónde arrastrar en esa dirección */

    if(now - drag.lastSeekT < DRAG_SEEK_MIN_MS) return true; /* consumimos el evento (preventDefault) sin pedir otro seek todavía */
    drag.lastSeekT = now;

    var progress = clamp(Math.abs(dy) / DRAG_RANGE_PX, 0, 1);
    var neighborTime = STOPS[targetIdx].time;
    var v = drag.originTime + (neighborTime - drag.originTime) * progress;
    try{ video.currentTime = v; }catch(e){}
    return true;
  }

  function dragRelease(){
    if(!drag) return;
    var d = drag; drag = null;

    var dy = d.lastY - d.startY;
    var totalPx = Math.abs(dy);

    /* velocidad reciente (últimos ~150ms de historial), no la velocidad
       promedio de todo el gesto — así un cambio de dirección justo
       antes de soltar pesa lo que tiene que pesar. */
    var h = d.history;
    var vpx = 0;
    if(h.length >= 2){
      var first = h[0], lastPt = h[h.length - 1];
      var dt = lastPt.t - first.t;
      if(dt > 0) vpx = (lastPt.y - first.y) / dt; /* px/ms, mismo signo que dy */
    }

    var hasIntent = totalPx >= MIN_INTENT_PX || Math.abs(vpx) >= FLICK_VELOCITY;
    var dir = (dy < 0 || vpx < 0) ? 1 : -1; /* prioriza la dirección de la velocidad reciente sobre el desplazamiento bruto total */
    /* Si el desplazamiento bruto y la velocidad reciente apuntan en
       direcciones distintas (el usuario revirtió el gesto), manda la
       velocidad reciente — es la señal de hacia dónde iba AL SOLTAR. */
    if(Math.abs(vpx) >= 0.02){ dir = vpx < 0 ? 1 : -1; }
    else { dir = dy < 0 ? 1 : -1; }

    var targetIdx = hasIntent ? clamp(d.originIndex + dir, 0, last) : d.originIndex;

    if(targetIdx === state.index && video.currentTime === STOPS[state.index].time){
      setAnimating(false); /* ya está exactamente en su lugar, nada que animar */
      return;
    }
    state.index = targetIdx;
    updateUI(targetIdx);
    scrubTo(STOPS[targetIdx].time, function(){ setAnimating(false); });
  }

  /* Touch */
  root.addEventListener('touchstart', function(e){
    dragStart(e.touches[0].clientY, e.target);
  }, { passive: true });

  root.addEventListener('touchmove', function(e){
    if(!drag) return;
    var moved = dragMove(e.touches[0].clientY);
    if(moved) e.preventDefault();
  }, { passive: false });

  root.addEventListener('touchend', function(){ dragRelease(); }, { passive: true });
  /* touchcancel (llamada real entrante, gesto del sistema, etc.) — BUG
     encontrado en vivo: esto limpiaba `drag` pero nunca soltaba
     `state.animating`, que dragStart() había dejado en `true`. Como
     wheel/goTo/dragStart chequean ese candado, quedaba TODO el
     recorrido muerto para siempre tras un solo touchcancel. */
  root.addEventListener('touchcancel', function(){
    if(drag){ drag = null; setAnimating(false); }
  }, { passive: true });

  /* Mouse (desktop) — mismo gesto de agarrar/soltar, pedido explícito
     para que el drag sea consistente entre mouse y touch. El wheel de
     arriba sigue funcionando aparte (snap simple por tick). */
  var mouseDragging = false;
  root.addEventListener('mousedown', function(e){
    if(e.button !== 0 || isInteractive(e.target)) return;
    if(dragStart(e.clientY, e.target)){
      mouseDragging = true;
      e.preventDefault(); /* evita selección de texto mientras se arrastra */
    }
  });
  window.addEventListener('mousemove', function(e){
    if(!mouseDragging || !drag) return;
    dragMove(e.clientY);
  });
  window.addEventListener('mouseup', function(){
    if(!mouseDragging) return;
    mouseDragging = false;
    dragRelease();
  });
  /* Seguro extra: si la ventana pierde el foco a mitad de un drag con
     mouse (alt-tab, devtools, etc.) puede que 'mouseup' nunca llegue —
     mismo riesgo de candado pegado que el touchcancel de arriba. */
  window.addEventListener('blur', function(){
    if(mouseDragging){ mouseDragging = false; drag = null; setAnimating(false); }
  });

  /* -------- Pill-nav / hint: salto directo (scrub también, no teletransporte) -------- */
  navBtns.forEach(function(btn, i){
    btn.addEventListener('click', function(){ goTo(i); });
  });
  if(hint){
    hint.addEventListener('click', function(){ goTo(1); });
  }

  /* -------- Boot: dejar el video pausado exactamente en la parada 0 --------
     Con preload="none" el <video> no descarga nada solo — recién hay
     'loadedmetadata' cuando loadFullVideo() termina de bajar el blob y
     lo asigna. Mientras tanto se ve el `poster` (JPG estático) — estado
     de carga perfectamente válido, título/CTA ya son 100% funcionales.
     state.ready lo pone en true el propio listener de loadFullVideo(),
     no acá — así el wheel/drag quedan bloqueados hasta que el archivo
     completo esté en memoria (cero dependencia de red en cada scrub). */
  function boot(){
    try{ video.currentTime = STOPS[0].time; }catch(e){}
    video.pause();
    updateUI(0);
  }
  setLoadingUI(true);
  if(video.readyState >= 1){ boot(); }
  else { video.addEventListener('loadedmetadata', boot, { once: true }); }
  loadFullVideo();

  /* Reaplicar el encuadre si cambia el breakpoint (rotar el teléfono, etc.) */
  var mqChangeHandler = function(){ applyFrameFocus(state.index); };
  if(mqMobile.addEventListener) mqMobile.addEventListener('change', mqChangeHandler);
  else if(mqMobile.addListener) mqMobile.addListener(mqChangeHandler);

  /* Si por lo que sea el usuario llega con scrollY>0 pero el hero
     vuelve a quedar pineado (scrollY vuelve a 0), no hace falta nada
     especial: onWheel ya vuelve a tomar el control automáticamente
     apenas atPageTop() es true otra vez. */
})();
