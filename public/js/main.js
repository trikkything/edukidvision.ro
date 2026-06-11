const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const contactForm = document.getElementById('contactForm');
const toast = document.getElementById('toast');

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Close nav when clicking outside
  document.addEventListener('click', (e) => {
    if (!siteNav.contains(e.target) && !menuToggle.contains(e.target)) {
      siteNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
}


/* -- Cursuri dropdown --------------------------------------------------- */
(function () {
  const dropdown = document.getElementById('navDropdownCursuri');
  if (!dropdown) return;

  const trigger = dropdown.querySelector('.nav-dropdown-trigger');

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', function (e) {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      dropdown.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
})();



const showToast = (message) => {
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 3000);
};

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const hasEmptyField = [...formData.values()].some((value) => !String(value).trim());
    if (hasEmptyField) {
      showToast('Te rugăm să completezi toate câmpurile înainte de a trimite solicitarea.');
      return;
    }

    const submitBtn = contactForm.querySelector('[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Se trimite…';
    submitBtn.disabled = true;

    fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData)),
    })
      .then((res) => {
        if (res.ok) {
          contactForm.reset();
          contactForm.style.display = 'none';
          const thanks = document.getElementById('contactThanks');
          if (thanks) {
            thanks.style.display = 'block';
            thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          showToast('Ceva nu a mers. Încearcă din nou sau scrie-ne direct.');
        }
      })
      .catch(() => {
        showToast('Eroare de rețea. Verifică conexiunea și încearcă din nou.');
      })
      .finally(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      });
  });
}

(function () {
  function setupCountAnimation(itemSelector, numberSelector) {
    const items = document.querySelectorAll(itemSelector);
    const numbers = document.querySelectorAll(`${numberSelector}[data-count-to]`);
    if (!items.length || !numbers.length) return;

    let hasAnimated = false;

    function animateValue(el) {
      const target = Number(el.dataset.countTo);
      const suffix = el.dataset.countSuffix || '';
      const duration = 1560;
      const start = performance.now();

      function frame(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);

        el.textContent = `${value}${suffix}`;

        if (progress < 1) {
          window.requestAnimationFrame(frame);
        }
      }

      el.textContent = `0${suffix}`;
      window.requestAnimationFrame(frame);
    }

    function startStatsAnimation() {
      if (hasAnimated) return;
      hasAnimated = true;
      numbers.forEach(animateValue);
    }

    const observer = new IntersectionObserver((entries) => {
      const hasVisibleEntry = entries.some((entry) => entry.isIntersecting);
      if (!hasVisibleEntry) return;

      startStatsAnimation();
      observer.disconnect();
    }, {
      threshold: 0.25,
    });

    items.forEach((item) => {
      observer.observe(item);
    });
  }

  setupCountAnimation('.about-stat', '.about-stat-num');
  setupCountAnimation('.stat-cell', '.stat-num');
})();
