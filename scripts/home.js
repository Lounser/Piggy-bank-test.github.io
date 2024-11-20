// scripts/home.js
const themeSwitchCheckbox = document.getElementById('theme-switch-checkbox');
const body = document.body;
const header = document.querySelector('header');

// Загрузка настроек темной темы из локального хранилища при загрузке страницы
const darkMode = localStorage.getItem('darkMode') === 'true';
if (darkMode) {
  themeSwitchCheckbox.checked = true;
  body.classList.add('dark');
  header.classList.add('dark');
}

themeSwitchCheckbox.addEventListener('change', function() {
  if (this.checked) {
    body.classList.add('dark');
    header.classList.add('dark');
  } else {
    body.classList.remove('dark');
    header.classList.remove('dark');
  }
  localStorage.setItem('darkMode', this.checked);
});