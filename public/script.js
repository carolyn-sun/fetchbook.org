// Prevent SSR flash for dates
document.documentElement.classList.add('js-enabled');

document.addEventListener("DOMContentLoaded", () => {
  // Format local times
  document.querySelectorAll("time.local-time").forEach(el => {
    const dt = el.getAttribute("datetime");
    if (dt) {
      const utcDate = new Date(dt);
      if (!isNaN(utcDate.getTime())) {
        el.textContent = utcDate.toLocaleString(undefined, {
          year: "numeric", month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
      }
    }
    el.classList.add("loaded");
  });

  // CLI upload copy token buttons
  document.querySelectorAll('.copy-token-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const cmd = this.getAttribute('data-cmd');
      if (cmd) {
        navigator.clipboard.writeText(cmd);
        const old = this.innerText;
        this.innerText = 'Copied';
        setTimeout(() => this.innerText = old, 1500);
      }
    });
  });

  // Share link initialization & copy button
  const linkInput = document.getElementById('share-link');
  const copyBtn = document.getElementById('copy-btn');
  if (linkInput && copyBtn) {
    linkInput.innerText = window.location.href;
    copyBtn.addEventListener('click', function() {
      navigator.clipboard.writeText(linkInput.innerText);
      const old = this.innerText;
      this.innerText = 'Copied';
      setTimeout(() => this.innerText = old, 1500);
    });
  }
});
