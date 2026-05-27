const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const toggleButtons = document.querySelectorAll('.toggle-btn');
const courseCards = document.querySelectorAll('[data-course-card]');
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

const updateCourses = (audience) => {
  toggleButtons.forEach((button) => {
    const active = button.dataset.audience === audience;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });

  courseCards.forEach((card) => {
    const description = card.querySelector('.course-description');
    const age = card.querySelector('.course-age');
    if (!description || !age) {
      return;
    }

    description.textContent = description.dataset[audience];
    age.textContent = card.querySelector('.course-meta').dataset[`${audience}Age`];
  });
};

toggleButtons.forEach((button) => {
  button.addEventListener('click', () => updateCourses(button.dataset.audience));
});

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
          showToast('Mulțumim! Te vom contacta în curând.');
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

updateCourses('kids');
