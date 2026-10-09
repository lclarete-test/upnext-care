(() => {
  const endpoint = window.UPNEXT_FORMS_ENDPOINT || '';
  const language = () => window.DPPLanguage?.language || document.documentElement.lang?.slice(0, 2) || 'en';
  document.querySelectorAll('[data-upnext-newsletter]').forEach(form => {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const email = form.querySelector('input[type="email"]');
      const button = form.querySelector('button');
      const note = form.parentElement.querySelector('[data-newsletter-note]');
      const copy = {
        en: ['Saving…', 'You are on the list.', 'We could not save your email. Please try again.'],
        es: ['Guardando…', 'Ya estás en la lista.', 'No pudimos guardar tu correo. Inténtalo de nuevo.'],
        pt: ['Salvando…', 'Você entrou na lista.', 'Não foi possível salvar seu e-mail. Tente novamente.']
      }[language()] || ['Saving…', 'You are on the list.', 'We could not save your email. Please try again.'];
      if (!email.reportValidity()) return;
      button.disabled = true;
      const previous = button.textContent;
      button.textContent = copy[0];
      try {
        if (!endpoint) throw new Error('Forms endpoint is not configured');
        await fetch(endpoint, {
          method: 'POST',
          mode: 'no-cors',
          headers: {'Content-Type': 'text/plain;charset=utf-8'},
          body: JSON.stringify({
            type: 'newsletter',
            newsletter: {
              data_hora: new Date().toISOString(),
              email: email.value.trim().toLowerCase(),
              idioma: language(),
              origem: location.pathname,
              consentimento: 'Sim',
              status: 'Ativo'
            },
            website: ''
          })
        });
        form.reset();
        note.textContent = copy[1];
        window.gtag?.('event', 'newsletter_signup', {language: language()});
      } catch (_) {
        note.textContent = copy[2];
      } finally {
        button.disabled = false;
        button.textContent = previous;
      }
    });
  });
  window.UpNextForms = {
    async mirrorEnrollment(screener, registration) {
      if (!endpoint) return false;
      try {
        await fetch(endpoint, {
          method: 'POST',
          mode: 'no-cors',
          headers: {'Content-Type': 'text/plain;charset=utf-8'},
          body: JSON.stringify({type: 'program', screener, registration, website: ''})
        });
        return true;
      } catch (_) {
        return false;
      }
    }
  };
})();
