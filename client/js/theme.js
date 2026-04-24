// ===== THEME TOGGLE =====
function initTheme() {
  const saved = localStorage.getItem('medirec_theme') || 'dark';
  document.body.classList.toggle('light', saved === 'light');
  updateThemeIcon();
}

function toggleTheme() {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  localStorage.setItem('medirec_theme', isLight ? 'light' : 'dark');
  updateThemeIcon();
}

function updateThemeIcon() {
  const icons = document.querySelectorAll('#themeIcon');
  const isLight = document.body.classList.contains('light');
  icons.forEach(icon => {
    icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
  });
}

initTheme();
