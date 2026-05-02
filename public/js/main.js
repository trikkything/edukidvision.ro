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
      showToast('Please complete all fields before sending your inquiry.');
      return;
    }

    contactForm.reset();
    showToast('Thanks. Your inquiry has been received. We will be in touch soon.');
  });
}

updateCourses('kids');
