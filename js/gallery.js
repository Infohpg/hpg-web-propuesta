/* ============================================================
   Home Pro Guides — gallery.js
   Carrusel "Échale un ojo a nuestro trabajo" — reusado en
   Home y en /contacto/*. Avanza solo, pero se puede controlar
   con flechas, dots o arrastrando (drag/swipe).
   ============================================================ */
(function(){
  "use strict";
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initGallery(root){
    var track = root.querySelector('.gallery-track');
    if(!track) return;
    var cards = Array.prototype.slice.call(track.children);
    var dotsWrap = root.querySelector('.gallery-dots');
    var prevBtn = root.querySelector('[data-gallery-prev]');
    var nextBtn = root.querySelector('[data-gallery-next]');
    var autoplayMs = parseInt(root.getAttribute('data-autoplay') || '4200', 10);
    var timer = null;
    var isDown = false, dragged = false, startX = 0, startScroll = 0;

    /* build dots */
    var dots = [];
    if(dotsWrap){
      cards.forEach(function(_, i){
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'gallery-dot';
        d.setAttribute('aria-label', 'Ir a la foto ' + (i + 1));
        d.addEventListener('click', function(){ goTo(i); restartAutoplay(); });
        dotsWrap.appendChild(d);
        dots.push(d);
      });
    }

    function cardWidth(){
      var c = cards[0];
      if(!c) return 0;
      var style = getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap || 18);
      return c.getBoundingClientRect().width + gap;
    }

    function currentIndex(){
      var w = cardWidth();
      if(!w) return 0;
      return Math.round(track.scrollLeft / w);
    }

    function updateDots(){
      var idx = Math.max(0, Math.min(cards.length - 1, currentIndex()));
      dots.forEach(function(d, i){ d.classList.toggle('is-active', i === idx); });
    }

    function goTo(i){
      var idx = (i + cards.length) % cards.length;
      track.scrollTo({ left: idx * cardWidth(), behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    function next(){
      var idx = currentIndex();
      if(idx >= cards.length - 1){ track.scrollTo({ left: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); }
      else { goTo(idx + 1); }
    }
    function prev(){ goTo(currentIndex() - 1); }

    function startAutoplay(){
      if(reduceMotion) return;
      stopAutoplay();
      timer = setInterval(next, autoplayMs);
    }
    function stopAutoplay(){ if(timer){ clearInterval(timer); timer = null; } }
    function restartAutoplay(){ stopAutoplay(); startAutoplay(); }

    if(nextBtn) nextBtn.addEventListener('click', function(){ next(); restartAutoplay(); });
    if(prevBtn) prevBtn.addEventListener('click', function(){ prev(); restartAutoplay(); });

    root.addEventListener('mouseenter', stopAutoplay);
    root.addEventListener('mouseleave', startAutoplay);
    root.addEventListener('focusin', stopAutoplay);
    root.addEventListener('focusout', startAutoplay);

    /* scroll -> dots sync (throttled via rAF) */
    var ticking = false;
    track.addEventListener('scroll', function(){
      if(!ticking){
        window.requestAnimationFrame(function(){ updateDots(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });

    /* drag to scroll (desktop mouse) — touch already works natively via scroll-snap */
    track.addEventListener('pointerdown', function(e){
      if(e.pointerType === 'touch') return; /* let native touch scrolling handle it */
      isDown = true; dragged = false;
      startX = e.clientX; startScroll = track.scrollLeft;
      track.classList.add('is-dragging');
      track.setPointerCapture(e.pointerId);
      stopAutoplay();
    });
    track.addEventListener('pointermove', function(e){
      if(!isDown) return;
      var dx = e.clientX - startX;
      if(Math.abs(dx) > 4) dragged = true;
      track.scrollLeft = startScroll - dx;
    });
    function endDrag(){
      if(!isDown) return;
      isDown = false;
      track.classList.remove('is-dragging');
      /* snap to nearest card */
      goTo(currentIndex());
      restartAutoplay();
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointerleave', function(){ if(isDown) endDrag(); });
    track.addEventListener('click', function(e){ if(dragged){ e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);

    updateDots();
    startAutoplay();
  }

  document.querySelectorAll('[data-component="gallery"]').forEach(initGallery);
})();
