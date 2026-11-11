export function renderLayout(title: string, bodyContent: string, showThreeCanvas: boolean = true) {
  return `
  <!DOCTYPE html>
  <html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | 3D Task Constellation</title>
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- CDNs -->
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    
    <!-- FontAwesome for Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <link rel="stylesheet" href="/dashboard.css">
    
    <style>
      :root {
        --bg-gradient: linear-gradient(135deg, #090d16, #0e1726, #080c14);
        --panel-bg: rgba(13, 20, 35, 0.6);
        --panel-border: rgba(255, 255, 255, 0.08);
        --text-primary: #f8fafc;
        --text-secondary: #94a3b8;
        --primary: #3b82f6;
        --primary-glow: rgba(59, 130, 246, 0.3);
        --success: #10b981;
        --success-glow: rgba(16, 185, 129, 0.2);
        --warning: #f59e0b;
        --warning-glow: rgba(245, 158, 11, 0.2);
        --danger: #ef4444;
        --danger-glow: rgba(239, 68, 68, 0.2);
        --font-sans: 'Plus Jakarta Sans', sans-serif;
        --font-display: 'Space Grotesk', sans-serif;
      }

      /* Light Theme Variables */
      [data-theme="light"] {
        --bg-gradient: linear-gradient(135deg, #f8fafc, #f1f5f9, #e2e8f0);
        --panel-bg: rgba(255, 255, 255, 0.7);
        --panel-border: rgba(15, 23, 42, 0.08);
        --text-primary: #0f172a;
        --text-secondary: #475569;
        --primary-glow: rgba(59, 130, 246, 0.15);
        --success-glow: rgba(16, 185, 129, 0.1);
        --warning-glow: rgba(245, 158, 11, 0.1);
        --danger-glow: rgba(239, 68, 68, 0.1);
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        margin: 0;
        font-family: var(--font-sans);
        background: var(--bg-gradient);
        color: var(--text-primary);
        min-height: 100vh;
        overflow-x: hidden;
        transition: background 0.5s ease, color 0.3s ease;
      }

      /* 3D Canvas Background */
      #bg-canvas {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 1;
        pointer-events: auto;
      }

      /* Layout shell */
      .app-wrapper {
        position: relative;
        z-index: 10;
        width: 100%;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        pointer-events: none;
      }

      /* Enable pointer events on active interactive containers */
      .interactive-card, .btn, input, select, button, a, form, .task-list-container, .navbar, .workspace-sidebar {
        pointer-events: auto;
      }

      /* Modern Scrollbars */
      ::-webkit-scrollbar {
        width: 6px;
      }
      ::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.05);
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(100, 116, 139, 0.2);
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(100, 116, 139, 0.4);
      }
    </style>
    
    <script>
      // Load saved theme preference immediately to prevent flash of wrong theme
      const savedTheme = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
    </script>
  </head>
  <body>
    ${showThreeCanvas ? '<canvas id="bg-canvas"></canvas>' : ''}
    
    <div class="app-wrapper">
      ${bodyContent}
    </div>

    ${showThreeCanvas ? '<script type="module" src="/three-app.js"></script>' : ''}
    <script>
      // Configure HTMX timeout to 120s for slow Ollama requests
      if (window.htmx) {
        htmx.config.timeout = 120000;
      }
      document.body.addEventListener('aiError', function(evt) {
        alert("AI Assistant Error:\\n" + evt.detail.value);
      });

      // AI Voice Copilot (Web Speech API)
      let recognition = null;
      function toggleVoiceRecognition(inputId) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          alert("Web Speech API is not supported in your browser. Please use Chrome, Edge, or Safari.");
          return;
        }

        const inputEl = document.getElementById(inputId);
        const micBtn = event.currentTarget;

        if (recognition && recognition.isListening) {
          recognition.stop();
          recognition.isListening = false;
          micBtn.classList.remove('recording');
          return;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = function() {
          recognition.isListening = true;
          micBtn.classList.add('recording');
        };

        recognition.onresult = function(e) {
          let transcript = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            transcript += e.results[i][0].transcript;
          }
          if (inputEl) {
            inputEl.value = transcript;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('keyup', { bubbles: true }));
          }
        };

        recognition.onerror = function(e) {
          console.warn('Voice recognition error:', e.error);
          micBtn.classList.remove('recording');
          recognition.isListening = false;
        };

        recognition.onend = function() {
          micBtn.classList.remove('recording');
          recognition.isListening = false;
        };

        recognition.start();
      }
    </script>
  </body>
  </html>
  `
}
