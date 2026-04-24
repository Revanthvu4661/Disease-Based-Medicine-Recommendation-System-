// ===== FLOATING PARTICLES =====
(function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const symbols = ['✚', '♥', '⊕', '◌', '○'];
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 14 + 4;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 20 + 12}s;
      animation-delay: ${Math.random() * 10}s;
      opacity: ${Math.random() * 0.12 + 0.04};
    `;
    // Every 4th particle is a cross symbol
    if (i % 4 === 0) {
      p.style.borderRadius = '0';
      p.style.background = 'transparent';
      p.style.color = 'var(--primary)';
      p.style.fontSize = `${size + 4}px`;
      p.style.width = 'auto';
      p.style.height = 'auto';
      p.textContent = '+';
    }
    container.appendChild(p);
  }
})();
