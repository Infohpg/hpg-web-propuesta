/* ============================================================
   Home Pro Guides — scroll-tour.js (v4, VIDEO snap-scroll)

   Reemplaza el motor de fotos con crossfade / la escena 3D. Ahora
   maneja UN <video> real con 6 paradas fijas (timestamps reales,
   sacados con ffprobe/ffmpeg del video aprobado por Luis).

   Comportamiento pedido explícitamente (no es scroll continuo):
   - Mientras el hero está "pineado" (scrollY de la página en 0, el
     hero ocupa toda la pantalla), la rueda/el swipe NO mueve la
     página — mueve el índice de parada.
   - Cada paso adelante/atrás dispara un scrub ANIMADO del video
     (rAF, easing, 450-900ms según la distancia entre timestamps)
     hacia el siguiente punto, donde el video se congela hasta el
     próximo input. No es 1:1 con el scroll — es un salto rápido
     pero visible, nunca instantáneo.
   - Al llegar a la última parada (Baño) y seguir scrolleando hacia
     abajo, se libera el control: la página scrollea normal hacia
     el resto del sitio. Si el usuario vuelve a scrollY=0, el hero
     se vuelve a "pinear" y el scroll hacia arriba retrocede paradas.
   - Mobile: swipe vertical dispara el mismo snap (no scroll libre
     del video).
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
    { time: 9.0,  label: 'Techo'     },
    { time: 14.0, label: 'Ventanas'  },
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
    { scale: 1.14, ty: '-3%'  }, /* 0 Llegada:   marca arriba-izq. */
    { scale: 1.14, ty: '-3%'  }, /* 1 Techo:     marca arriba-izq. */
    { scale: 1.16, ty: '4%'   }, /* 2 Ventanas:  marca abajo-izq.  */
    { scale: 1.16, ty: '4%'   }, /* 3 Cocina:    marca abajo-der.  */
    { scale: 1.14, ty: '-2%'  }, /* 4 Sala:      marca arriba-der. */
    { scale: 1.16, ty: '4%'   }  /* 5 Baño:      marca abajo-der.  */
  ];
  function applyWmHide(index){
    if(!videoFrame) return;
    var w = WM_HIDE[index] || WM_HIDE[0];
    videoFrame.style.setProperty('--wm-scale', String(w.scale));
    videoFrame.style.setProperty('--wm-ty', w.ty);
  }

  /* state.ready=false hasta que el video esté DESCARGADO COMPLETO en
     memoria (blob local, ver loadFullVideo() más abajo). Streameado
     por red, cada scrub dispara varias micro-peticiones Range durante
     los ~450-900ms de la animación — en producción (Sliplane, latencia
     real) eso hace que currentTime reporte el target pero el frame
     decodificado se quede atrás (verificado en vivo: currentTime=21
     con video.buffered todavía en ~14 → se veía el frame de otra
     parada). El archivo pesa ~5MB, así que precargarlo entero antes de
     habilitar la interacción es la solución robusta: una sola descarga,
     cero latencia de red por scrub. Mientras carga, el wheel/touch
     sigue "pineando" la sección (no se ve raro) pero goTo() no hace
     nada hasta que ready=true. */
  var state = { index: 0, animating: false, ready: false };
  var rafId = null;

  function loadFullVideo(){
    var sourceEl = video.querySelector('source');
    var src = (sourceEl && sourceEl.getAttribute('src')) || video.currentSrc;
    if(!src || typeof fetch !== 'function'){ state.ready = true; return; }
    fetch(src).then(function(res){ return res.blob(); }).then(function(blob){
      var blobUrl = URL.createObjectURL(blob);
      video.addEventListener('loadedmetadata', function(){ state.ready = true; }, { once: true });
      video.src = blobUrl;
      video.load();
    }).catch(function(){
      /* Si el fetch falla (CORS, offline, etc.) seguimos con el <source>
         normal que ya está streameando — se habilita igual, en el peor
         caso un scrub muy rápido podría verse levemente atrasado. */
      state.ready = true;
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

  function scrubTo(targetTime, onDone){
    if(rafId) cancelAnimationFrame(rafId);
    var start = video.currentTime || 0;
    var delta = targetTime - start;
    if(Math.abs(delta) < 0.02){ onDone(); return; }
    var dur = clamp(Math.abs(delta) * 90, 420, 900);
    var t0 = performance.now();
    function step(now){
      var p = clamp((now - t0) / dur, 0, 1);
      var eased = easeInOutCubic(p);
      var v = start + delta * eased;
      try{ video.currentTime = v; }catch(e){}
      if(p < 1){
        rafId = requestAnimationFrame(step);
      } else {
        try{ video.currentTime = targetTime; }catch(e){}
        rafId = null;
        onDone();
      }
    }
    rafId = requestAnimationFrame(step);
  }

  function goTo(newIndex){
    if(!state.ready) return; /* video aún descargando entero — ignorar el input, no romper nada visualmente */
    newIndex = clamp(newIndex, 0, last);
    if(newIndex === state.index || state.animating) return;
    state.index = newIndex;
    state.animating = true;
    updateUI(newIndex);
    scrubTo(STOPS[newIndex].time, function(){ state.animating = false; });
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
    if(state.animating || wheelCooldown) return;
    wheelCooldown = true;
    setTimeout(function(){ wheelCooldown = false; }, 140);
    goTo(state.index + dir);
  }
  window.addEventListener('wheel', onWheel, { passive: false });

  /* -------- Touch (mobile swipe) -------- */
  var touchStartY = 0, touchLastY = 0, touchActive = false;
  root.addEventListener('touchstart', function(e){
    touchStartY = touchLastY = e.touches[0].clientY;
    touchActive = atPageTop();
  }, { passive: true });

  root.addEventListener('touchmove', function(e){
    if(!touchActive) return;
    touchLastY = e.touches[0].clientY;
    var dy = touchLastY - touchStartY; /* >0 = dedo baja = intención de subir */
    var intentForward = dy < 0;
    var canConsume = intentForward ? (state.index < last) : (state.index > 0);
    if(canConsume) e.preventDefault();
  }, { passive: false });

  root.addEventListener('touchend', function(){
    if(!touchActive) return;
    touchActive = false;
    var dy = touchLastY - touchStartY;
    if(Math.abs(dy) < 26) return; /* toque, no swipe */
    if(dy < 0) goTo(state.index + 1);
    else goTo(state.index - 1);
  }, { passive: true });

  /* -------- Pill-nav / hint: salto directo (scrub también, no teletransporte) -------- */
  navBtns.forEach(function(btn, i){
    btn.addEventListener('click', function(){ goTo(i); });
  });
  if(hint){
    hint.addEventListener('click', function(){ goTo(1); });
  }

  /* -------- Boot: dejar el video pausado exactamente en la parada 0 -------- */
  function boot(){
    try{ video.currentTime = STOPS[0].time; }catch(e){}
    video.pause();
    updateUI(0);
  }
  if(video.readyState >= 1){ boot(); }
  else { video.addEventListener('loadedmetadata', boot, { once: true }); }
  loadFullVideo();

  /* Si por lo que sea el usuario llega con scrollY>0 pero el hero
     vuelve a quedar pineado (scrollY vuelve a 0), no hace falta nada
     especial: onWheel ya vuelve a tomar el control automáticamente
     apenas atPageTop() es true otra vez. */
})();
