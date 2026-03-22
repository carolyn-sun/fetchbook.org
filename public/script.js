document.addEventListener("DOMContentLoaded", () => {
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

    copyBtn.addEventListener('click', function() {
      navigator.clipboard.writeText(linkInput.innerText);
      const old = this.innerText;
      this.innerText = 'Copied';
      setTimeout(() => this.innerText = old, 1500);
    });
  }
});
