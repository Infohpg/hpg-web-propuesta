/* ============================================================
   Home Pro Guides — site.js
   Header toggle, reveal-on-scroll, header light/dark swap.
   Shared across every page.
   ============================================================ */
(function(){
  "use strict";

  /* Mobile nav toggle */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if(toggle && nav){
    toggle.addEventListener('click', function(){
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); });
    });
  }

  /* Header goes "light" (cream bg) once we're clearly past any dark hero,
     driven by a marker element with [data-header-watch] if present;
     otherwise header stays in its default state per data-header attr on <body>. */
  var header = document.querySelector('.site-header');
  if(header){
    var mode = document.body.getAttribute('data-header') || 'auto-dark';
    if(mode === 'light'){ header.classList.add('is-light'); }
    if(mode === 'auto'){
      var flip = document.querySelector('[data-header-watch]');
      if(flip){
        var io = new IntersectionObserver(function(entries){
          entries.forEach(function(e){
            header.classList.toggle('is-light', e.isIntersecting);
          });
        }, { rootMargin: '-60% 0px -38% 0px' });
        io.observe(flip);
      }
    }
  }

  /* Generic reveal-on-scroll for anything with .reveal */
  var revealEls = document.querySelectorAll('.reveal');
  if(revealEls.length){
    var ro = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          ro.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function(el){ ro.observe(el); });
  }

  /* Stagger children marked [data-stagger] by index (30-80ms rule) */
  document.querySelectorAll('[data-stagger]').forEach(function(group){
    Array.prototype.forEach.call(group.children, function(child, i){
      child.style.transitionDelay = (i * 60) + 'ms';
    });
  });
})();
