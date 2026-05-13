// Layout: sidebar nav + top bar, injected on every page.
// Hides sidebar on public pages (home) for a cleaner landing feel.

const PUBLIC_PAGES = new Set(['index.html', '']);

const layoutHTML = `
<div class="sidebar" id="sidebar">
  <div class="logo-area">
    <div class="logo-icon"></div>
    <span id="nav-site-name">AI My Bio</span>
  </div>
  <nav class="nav-links">
    <a href="index.html"     class="nav-item">Home</a>
    <a href="dashboard.html" class="nav-item">My Bios</a>
    <a href="pricing.html"   class="nav-item">Pricing</a>
    <a href="settings.html"  class="nav-item">Settings</a>
    <a href="help.html"      class="nav-item">Help</a>
  </nav>
  <div class="user-section">
    <div class="user-profile" id="user-profile-btn">
      <div class="avatar" id="user-avatar"></div>
      <div style="flex:1; min-width:0">
        <div id="user-name"   style="font-size:0.9rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">Guest</div>
        <div id="user-status" style="font-size:0.75rem; color:#666">Sign In</div>
      </div>
    </div>
  </div>
</div>`;

const topBarHTML = `
<div class="top-bar">
  <div style="display:flex; align-items:center">
    <button class="mobile-toggle" id="menu-toggle" aria-label="Menu">\u2630</button>
    <div id="page-title" style="font-weight:600"></div>
  </div>
</div>`;

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  const main = document.getElementById('main-content');
  if (!app || !main) return;

  let page = (window.location.pathname.split('/').pop() || '').toLowerCase();
  if (!page) page = 'index.html';
  else if (!page.includes('.')) page += '.html';

  // Inject sidebar
  const side = document.createElement('div');
  side.innerHTML = layoutHTML;
  app.insertBefore(side.firstElementChild, app.firstChild);

  // Inject top bar
  const top = document.createElement('div');
  top.innerHTML = topBarHTML;
  main.insertBefore(top.firstElementChild, main.firstChild);

  // Active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.getAttribute('href') === page) el.classList.add('active');
  });

  // Mobile toggle
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  // Site name
  if (window.SITE_CONFIG) {
    const el = document.getElementById('nav-site-name');
    if (el) el.innerText = window.SITE_CONFIG.siteName;
  }

  // Auth UI updater — called by supabase.js on auth changes
  window.updateAuthUI = (user, profile) => {
    const nameEl   = document.getElementById('user-name');
    const statusEl = document.getElementById('user-status');
    const avEl     = document.getElementById('user-avatar');
    const btn      = document.getElementById('user-profile-btn');
    if (!nameEl) return;

    if (user) {
      const display = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account';
      nameEl.innerText   = display;
      const plan = profile?.plan || 'free';
      statusEl.innerText = plan === 'free' ? 'Free plan' : plan.charAt(0).toUpperCase() + plan.slice(1);
      statusEl.style.color = plan === 'free' ? '#666' : 'green';
      const avatar = user.user_metadata?.avatar_url || profile?.avatar_url;
      if (avatar) avEl.style.cssText = `background-image:url(${avatar}); background-size:cover; background-position:center`;
      btn.onclick = () => window.location.href = 'settings.html';
    } else {
      nameEl.innerText   = 'Guest';
      statusEl.innerText = 'Sign in';
      statusEl.style.color = '#666';
      avEl.style.backgroundImage = '';
      btn.onclick = () => window.location.href = 'login.html';
    }
  };
});
