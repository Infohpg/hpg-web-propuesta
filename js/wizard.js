/* ============================================================
   Home Pro Guides — wizard.js
   Motor genérico de formulario stepper: una pregunta por pantalla.
   Lee los pasos desde <script type="application/json" data-wizard-steps>
   dentro de [data-component="wizard"]. Reemplaza SOLO el contenido
   interno de .form-card — el contenedor en sí (posición, tamaño,
   layout junto a la galería) no se toca.

   Patrón (referencia real revisada por Luis en homeproguides.com):
   - single-select → clic en una tarjeta AVANZA SOLO, sin botón Next.
   - multi-select  → tarjetas con check circular, requiere botón Next.
   - text/textarea → campos normales, requiere botón Next.
   - "Go back" siempre disponible salvo en el primer paso.
   - Progreso implícito: barra fina, sin "paso 3 de 8".
   ============================================================ */
(function(){
  "use strict";

  var ICONS = {
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7z"/>',
    swap: '<path d="M4 7h13M17 7l-3-3M17 7l-3 3M20 17H7M7 17l3 3M7 17l3-3"/>',
    hammer: '<path d="M15 4l5 5-3 3-5-5 3-3z"/><path d="M13.5 7.5L4 17v3h3l9.5-9.5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2-2.4 3.5"/><path d="M12 17.2v.1"/>',
    roof: '<path d="M3 12L12 4l9 8"/><path d="M6 11v8h12v-8"/>',
    cloudRain: '<path d="M7 15a4 4 0 1 1 1-7.9A5.5 5.5 0 0 1 18.5 9 3.5 3.5 0 0 1 18 16H7z"/><path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2"/>',
    shieldCheck: '<path d="M12 3l7 3v6c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
    window: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M12 4v16M4 12h16"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
    move: '<path d="M12 3v18M3 12h18M5 8l-2 4 2 4M19 8l2 4-2 4M8 5l4-2 4 2M8 19l4 2 4-2"/>',
    clockFast: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
    dollar: '<path d="M12 2v20M17 6.5c0-2-2.2-3.5-5-3.5s-5 1.5-5 3.5S9.5 10 12 10s5 1.5 5 3.5-2.2 3.5-5 3.5-5-1.5-5-3.5"/>',
    star: '<path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.5l6.4-.6L12 3z"/>',
    zap: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
    palette: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="8" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="10.5" r="1.3" fill="currentColor" stroke="none"/><path d="M8 15c1 1.3 2.4 2 4 2 3 0 5-2 5-4.5 0-.5-.1-1-.3-1.5"/>',
    tag: '<path d="M12.6 3H4v8.6L14.4 22 21 15.4 12.6 3z"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/>',
    bath: '<path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3z"/><path d="M4 12V6a2 2 0 0 1 3.5-1.3M8 6v2"/><path d="M6 20v1M16 20v1"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17.5" cy="9" r="2.3"/><path d="M15.5 12.5c2.3.4 3.9 2 3.9 4"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    mapPin: '<path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.3"/>',
    message: '<path d="M4 5h16v11H8l-4 4V5z"/>',
    ruler: '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v3M15 8v3"/>'
  };
  function iconSvg(name){
    var d = ICONS[name] || ICONS.help;
    return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  }

  function validateInput(input){
    var value = (input.value || '').trim();
    if(input.hasAttribute('required') && !value) return 'Este campo es obligatorio.';
    if(input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Escribe un correo válido.';
    if(input.type === 'tel' && value && value.replace(/[^0-9]/g,'').length < 10) return 'Escribe un teléfono válido (10 dígitos).';
    if(input.name === 'zip' && value && !/^\d{5}$/.test(value)) return 'Código postal de 5 dígitos.';
    return '';
  }

  function initWizard(root){
    var dataEl = root.querySelector('[data-wizard-steps]');
    if(!dataEl) return;
    var config;
    try{ config = JSON.parse(dataEl.textContent); } catch(e){ console.error('wizard: invalid step JSON', e); return; }

    var steps = config.steps;
    var answers = {}; /* id -> value (string) or array (multi) */
    var textValues = {}; /* field name -> value, kept across steps */
    var current = 0;

    var progressBar = root.querySelector('.wizard-progress-bar');
    var body = root.querySelector('.wizard-body');

    function goTo(i){
      current = Math.max(0, Math.min(steps.length, i));
      render();
    }
    function goNext(){ goTo(current + 1); }
    function goBack(){ goTo(current - 1); }

    function renderProgress(){
      var pct = Math.min(100, Math.round(((current) / steps.length) * 100));
      if(progressBar) progressBar.style.width = pct + '%';
    }

    function renderSingle(step){
      var wrap = document.createElement('div');
      wrap.className = 'wizard-options' + (step.narrow ? ' is-narrow' : '');
      step.options.forEach(function(opt){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wizard-option';
        if(answers[step.id] === opt.value) btn.classList.add('is-selected');
        btn.innerHTML =
          '<span class="wizard-option-icon">' + iconSvg(opt.icon) + '</span>' +
          '<span class="wizard-option-label">' + opt.label + '</span>';
        btn.addEventListener('click', function(){
          answers[step.id] = opt.value;
          Array.prototype.forEach.call(wrap.children, function(c){ c.classList.remove('is-selected'); });
          btn.classList.add('is-selected');
          window.setTimeout(goNext, 240); /* deja ver la selección antes de avanzar */
        });
        wrap.appendChild(btn);
      });
      return wrap;
    }

    function renderMulti(step){
      var wrap = document.createElement('div');
      wrap.className = 'wizard-options' + (step.narrow ? ' is-narrow' : '');
      var selected = answers[step.id] || [];
      step.options.forEach(function(opt){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wizard-option';
        if(selected.indexOf(opt.value) > -1) btn.classList.add('is-selected');
        btn.innerHTML =
          '<span class="wizard-option-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>' +
          '<span class="wizard-option-icon">' + iconSvg(opt.icon) + '</span>' +
          '<span class="wizard-option-label">' + opt.label + '</span>';
        btn.addEventListener('click', function(){
          var idx = selected.indexOf(opt.value);
          if(idx > -1) selected.splice(idx, 1); else selected.push(opt.value);
          answers[step.id] = selected;
          btn.classList.toggle('is-selected');
        });
        wrap.appendChild(btn);
      });
      return wrap;
    }

    function renderFields(step){
      var wrap = document.createElement('div');
      wrap.className = 'wizard-fields';
      step.fields.forEach(function(f){
        var field = document.createElement('div');
        field.className = 'field' + (f.full ? ' full' : '');
        var label = document.createElement('label');
        label.textContent = f.label + (f.required ? ' *' : '');
        label.setAttribute('for', 'wz-' + f.name);
        field.appendChild(label);
        var input;
        if(f.type === 'textarea'){
          input = document.createElement('textarea');
        } else {
          input = document.createElement('input');
          input.type = f.type || 'text';
        }
        input.id = 'wz-' + f.name;
        input.name = f.name;
        if(f.placeholder) input.placeholder = f.placeholder;
        if(f.required) input.required = true;
        if(textValues[f.name]) input.value = textValues[f.name];
        input.addEventListener('input', function(){ textValues[f.name] = input.value; if(field.classList.contains('has-error')) checkField(); });
        function checkField(){
          var msg = validateInput(input);
          field.classList.toggle('has-error', !!msg);
          var err = field.querySelector('.error-msg');
          if(err) err.textContent = msg;
        }
        input.addEventListener('blur', checkField);
        field.appendChild(input);
        var err = document.createElement('span');
        err.className = 'error-msg';
        field.appendChild(err);
        field._checkField = checkField;
        wrap.appendChild(field);
      });
      wrap._fields = step.fields;
      return wrap;
    }

    function renderSuccess(){
      body.innerHTML = '';
      var box = document.createElement('div');
      box.className = 'wizard-success';
      box.innerHTML =
        '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>' +
        '<h3>¡Listo, recibimos tu solicitud!</h3>' +
        '<p>Esto es una propuesta de sitio — en producción, esta solicitud llegaría directo a nuestro equipo y te contactaríamos en menos de 24h.</p>';
      body.appendChild(box);
      if(progressBar) progressBar.style.width = '100%';
      root.setAttribute('tabindex', '-1');
      root.focus();
    }

    function render(){
      if(current >= steps.length){ renderSuccess(); return; }
      var step = steps[current];
      renderProgress();
      body.innerHTML = '';

      var stepEl = document.createElement('div');
      stepEl.className = 'wizard-step';

      var head = document.createElement('div');
      head.className = 'wizard-step-head';
      head.innerHTML = '<h3>' + step.title + '</h3>' + (step.subtitle ? '<p>' + step.subtitle + '</p>' : '');
      stepEl.appendChild(head);

      var contentEl;
      if(step.type === 'single') contentEl = renderSingle(step);
      else if(step.type === 'multi') contentEl = renderMulti(step);
      else contentEl = renderFields(step);
      stepEl.appendChild(contentEl);

      var nav = document.createElement('div');
      nav.className = 'wizard-nav';
      var backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'wizard-back';
      backBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg> Volver';
      if(current === 0) backBtn.hidden = true;
      backBtn.addEventListener('click', goBack);
      nav.appendChild(backBtn);

      if(step.type !== 'single'){
        var nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'btn btn-dark wizard-next';
        nextBtn.textContent = step.isLast ? 'Enviar solicitud' : 'Siguiente';
        nextBtn.addEventListener('click', function(){
          if(step.type === 'text' && contentEl._fields){
            var allValid = true;
            Array.prototype.forEach.call(contentEl.children, function(fieldEl){
              if(fieldEl._checkField){ fieldEl._checkField(); if(fieldEl.classList.contains('has-error')) allValid = false; }
            });
            if(!allValid) return;
          }
          if(step.isLast){
            nextBtn.disabled = true;
            var original = nextBtn.textContent;
            nextBtn.textContent = 'Enviando…';
            window.setTimeout(function(){ goNext(); }, 650);
            return;
          }
          goNext();
        });
        nav.appendChild(nextBtn);
      }
      stepEl.appendChild(nav);

      body.appendChild(stepEl);
    }

    render();
  }

  document.querySelectorAll('[data-component="wizard"]').forEach(initWizard);
})();
