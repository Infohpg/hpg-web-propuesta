/* ============================================================
   Home Pro Guides — forms.js
   Validación básica en el front. SIN submit real — es un
   prototipo de propuesta, no hay backend ni HubSpot conectado.
   ============================================================ */
(function(){
  "use strict";

  function showError(field, msg){
    field.classList.add('has-error');
    var err = field.querySelector('.error-msg');
    if(err) err.textContent = msg;
  }
  function clearError(field){
    field.classList.remove('has-error');
    var err = field.querySelector('.error-msg');
    if(err) err.textContent = '';
  }

  function validateField(field){
    var input = field.querySelector('input, select, textarea');
    if(!input) return true;
    var value = (input.value || '').trim();

    if(input.hasAttribute('required') && !value){
      showError(field, 'Este campo es obligatorio.');
      return false;
    }
    if(input.type === 'email' && value){
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if(!ok){ showError(field, 'Escribe un correo válido.'); return false; }
    }
    if(input.type === 'tel' && value){
      var digits = value.replace(/[^0-9]/g, '');
      if(digits.length < 10){ showError(field, 'Escribe un teléfono válido (10 dígitos).'); return false; }
    }
    if(input.name === 'zip' && value){
      if(!/^\d{5}$/.test(value)){ showError(field, 'Código postal de 5 dígitos.'); return false; }
    }
    clearError(field);
    return true;
  }

  document.querySelectorAll('[data-component="lead-form"]').forEach(function(form){
    var fields = Array.prototype.slice.call(form.querySelectorAll('.field'));
    var successBox = form.parentElement.querySelector('.form-success');

    fields.forEach(function(field){
      var input = field.querySelector('input, select, textarea');
      if(!input) return;
      input.addEventListener('blur', function(){ validateField(field); });
      input.addEventListener('input', function(){ if(field.classList.contains('has-error')) validateField(field); });
    });

    form.addEventListener('submit', function(e){
      e.preventDefault(); /* prototipo: nunca se envía a ningún backend */
      var allValid = true;
      fields.forEach(function(field){ if(!validateField(field)) allValid = false; });

      if(!allValid){
        var firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
        if(firstError) firstError.focus();
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      if(submitBtn){
        submitBtn.disabled = true;
        var original = submitBtn.textContent;
        submitBtn.textContent = 'Enviando…';
        setTimeout(function(){
          submitBtn.disabled = false;
          submitBtn.textContent = original;
          form.reset();
          if(successBox){
            successBox.classList.add('is-visible');
            successBox.setAttribute('tabindex', '-1');
            successBox.focus();
          }
        }, 700);
      }
    });
  });
})();
