import { renderLayout } from './layout'

export function renderLogin(error?: string) {
  const content = `
  <div class="auth-container">
    <div class="auth-card interactive-card">
      <div class="brand">
        <i class="fa-solid fa-circle-nodes brand-logo"></i>
        <h1>Task Constellation</h1>
      </div>
      <h2>Welcome Back</h2>
      <p class="subtitle">Access your 3D interactive workspace</p>
      
      ${error ? `<div class="error-msg"><i class="fa-solid fa-circle-exclamation"></i> ${error}</div>` : ''}

      <form method="POST" action="/login">
        <div class="input-group">
          <label for="email"><i class="fa-regular fa-envelope"></i> Email Address</label>
          <input type="email" id="email" name="email" placeholder="you@example.com" required />
        </div>

        <div class="input-group">
          <label for="password"><i class="fa-solid fa-lock"></i> Password</label>
          <input type="password" id="password" name="password" placeholder="••••••••" required />
        </div>

        <button class="btn btn-primary" type="submit">
          <span>Login Workspace</span>
          <i class="fa-solid fa-arrow-right-to-bracket"></i>
        </button>
      </form>

      <div class="auth-footer">
        <span>Don't have an account?</span>
        <a href="/signup">Create account <i class="fa-solid fa-arrow-right"></i></a>
      </div>
    </div>
  </div>

  <style>
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      width: 100%;
      padding: 20px;
    }

    .auth-card {
      background: var(--panel-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--panel-border);
      border-radius: 20px;
      padding: 40px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 
                  0 0 50px rgba(59, 130, 246, 0.1);
      animation: fadeIn 0.6s ease-out;
    }

    .brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 25px;
    }

    .brand-logo {
      font-size: 3rem;
      color: var(--primary);
      text-shadow: 0 0 20px var(--primary-glow);
      margin-bottom: 10px;
      animation: pulseLogo 3s infinite ease-in-out;
    }

    .brand h1 {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.5px;
      background: linear-gradient(to right, #fff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    h2 {
      font-family: var(--font-display);
      font-size: 1.8rem;
      text-align: center;
      margin-bottom: 5px;
      font-weight: 600;
    }

    .subtitle {
      color: var(--text-secondary);
      font-size: 0.9rem;
      text-align: center;
      margin-bottom: 30px;
    }

    .error-msg {
      background: var(--danger-glow);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      padding: 12px 15px;
      border-radius: 10px;
      font-size: 0.85rem;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .input-group {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .input-group label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .input-group input {
      background: rgba(10, 15, 30, 0.8);
      border: 1px solid var(--panel-border);
      border-radius: 10px;
      padding: 12px 16px;
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 0.95rem;
      transition: all 0.3s ease;
      outline: none;
    }

    .input-group input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 12px var(--primary-glow);
      background: rgba(10, 15, 30, 0.95);
    }

    .btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 10px;
      font-family: var(--font-sans);
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: white;
      box-shadow: 0 4px 14px var(--primary-glow);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px var(--primary-glow);
      background: linear-gradient(135deg, #1d4ed8, #2563eb);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .auth-footer {
      margin-top: 25px;
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .auth-footer a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
      margin-left: 5px;
      transition: color 0.3s ease;
    }

    .auth-footer a:hover {
      color: #60a5fa;
      text-decoration: underline;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulseLogo {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px var(--primary-glow)); }
      50% { transform: scale(1.05); filter: drop-shadow(0 0 25px var(--primary-glow)); }
    }
  </style>
  `
  return renderLayout('Login', content, true)
}

export function renderSignup(error?: string) {
  const content = `
  <div class="auth-container">
    <div class="auth-card interactive-card">
      <div class="brand">
        <i class="fa-solid fa-circle-nodes brand-logo"></i>
        <h1>Task Constellation</h1>
      </div>
      <h2>Get Started</h2>
      <p class="subtitle">Create an isolated developer workspace</p>
      
      ${error ? `<div class="error-msg"><i class="fa-solid fa-circle-exclamation"></i> ${error}</div>` : ''}

      <form method="POST" action="/signup">
        <div class="input-group">
          <label for="email"><i class="fa-regular fa-envelope"></i> Email Address</label>
          <input type="email" id="email" name="email" placeholder="you@example.com" required />
        </div>

        <div class="input-group">
          <label for="password"><i class="fa-solid fa-lock"></i> Create Password</label>
          <input type="password" id="password" name="password" placeholder="Min. 8 characters" minlength="8" required />
        </div>

        <div class="input-group">
          <label for="passwordConfirm"><i class="fa-solid fa-shield-halved"></i> Confirm Password</label>
          <input type="password" id="passwordConfirm" name="passwordConfirm" placeholder="Repeat your password" minlength="8" required />
        </div>

        <button class="btn btn-primary" type="submit">
          <span>Create Account</span>
          <i class="fa-solid fa-user-plus"></i>
        </button>
      </form>

      <div class="auth-footer">
        <span>Already have an account?</span>
        <a href="/login">Log in <i class="fa-solid fa-arrow-right"></i></a>
      </div>
    </div>
  </div>

  <style>
    /* Styling shares login container/card classes */
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      width: 100%;
      padding: 20px;
    }

    .auth-card {
      background: var(--panel-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--panel-border);
      border-radius: 20px;
      padding: 40px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 
                  0 0 50px rgba(59, 130, 246, 0.1);
      animation: fadeIn 0.6s ease-out;
    }

    .brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 25px;
    }

    .brand-logo {
      font-size: 3rem;
      color: var(--primary);
      text-shadow: 0 0 20px var(--primary-glow);
      margin-bottom: 10px;
      animation: pulseLogo 3s infinite ease-in-out;
    }

    .brand h1 {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.5px;
      background: linear-gradient(to right, #fff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    h2 {
      font-family: var(--font-display);
      font-size: 1.8rem;
      text-align: center;
      margin-bottom: 5px;
      font-weight: 600;
    }

    .subtitle {
      color: var(--text-secondary);
      font-size: 0.9rem;
      text-align: center;
      margin-bottom: 30px;
    }

    .error-msg {
      background: var(--danger-glow);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      padding: 12px 15px;
      border-radius: 10px;
      font-size: 0.85rem;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .input-group {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .input-group label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .input-group input {
      background: rgba(10, 15, 30, 0.8);
      border: 1px solid var(--panel-border);
      border-radius: 10px;
      padding: 12px 16px;
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 0.95rem;
      transition: all 0.3s ease;
      outline: none;
    }

    .input-group input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 12px var(--primary-glow);
      background: rgba(10, 15, 30, 0.95);
    }

    .btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 10px;
      font-family: var(--font-sans);
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: white;
      box-shadow: 0 4px 14px var(--primary-glow);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px var(--primary-glow);
      background: linear-gradient(135deg, #1d4ed8, #2563eb);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .auth-footer {
      margin-top: 25px;
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .auth-footer a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
      margin-left: 5px;
      transition: color 0.3s ease;
    }

    .auth-footer a:hover {
      color: #60a5fa;
      text-decoration: underline;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulseLogo {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px var(--primary-glow)); }
      50% { transform: scale(1.05); filter: drop-shadow(0 0 25px var(--primary-glow)); }
    }
  </style>
  `
  return renderLayout('Signup', content, true)
}
