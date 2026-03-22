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

  // Generate iOS JSON
  const generateIosBtn = document.getElementById('generate-ios-json-btn');
  const deviceInfo = document.querySelector('textarea[name="device_info"]');
  if (generateIosBtn && deviceInfo) {
    generateIosBtn.addEventListener('click', function() {
      const val = (id, def) => {
        const el = document.getElementById(id);
        return el && el.value.trim() !== '' ? el.value.trim() : def;
      };
      
      const width = Math.max(1, parseInt(val('ios-width', '1206'), 10) || 1206);
      const height = Math.max(1, parseInt(val('ios-height', '2622'), 10) || 2622);
      const refresh = Math.max(1, parseInt(val('ios-refresh', '120'), 10) || 120);
      const cores = Math.max(1, parseInt(val('ios-cores', '6'), 10) || 6);
      const soc = val('ios-soc', 'Apple A19');

      const json = [
        {
          "type": "Title",
          "result": {
            "userName": "[Apple Account]",
            "hostName": "[Device Name]"
          }
        },
        {
          "type": "OS",
          "result": {
            "prettyName": val('ios-os', 'iOS 26.3.1 (23D8133)')
          }
        },
        {
          "type": "Host",
          "result": {
            "name": val('ios-model', 'iPhone 17')
          }
        },
        {
          "type": "Display",
          "result": [
            {
              "name": val('ios-display-name', 'Super Retina XDR OLED display'),
              "output": {
                "width": width,
                "height": height,
                "refreshRate": refresh
              }
            }
          ]
        },
        {
          "type": "CPU",
          "result": {
            "cpu": soc,
            "packages": 1,
            "cores": {
              "physical": cores,
              "logical": cores,
              "online": cores
            }
          }
        },
        {
          "type": "GPU",
          "result": [
            {
              "name": soc,
              "type": "Integrated"
            }
          ]
        }
      ];
      
      deviceInfo.value = JSON.stringify(json, null, 2);
      deviceInfo.scrollIntoView({ behavior: 'smooth' });
    });
  }
});
