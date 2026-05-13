
const layoutHTML = `
<div class="sidebar" id="sidebar">
    <div class="logo-area">
        <div class="logo-icon"></div>
        <span id="nav-site-name">App</span>
    </div>
    <nav class="nav-links">
        <a href="index.html" class="nav-item">
            <span>Home</span>
        </a>
        <a href="dashboard.html" class="nav-item">
            <span>Dashboard</span>
        </a>
        <a href="pricing.html" class="nav-item">
            <span>Pricing</span>
        </a>
        <a href="settings.html" class="nav-item">
            <span>Settings</span>
        </a>
         <a href="help.html" class="nav-item">
            <span>Help</span>
        </a>
    </nav>
    <div class="user-section">
        <div class="user-profile" id="user-profile-btn">
            <div class="avatar" id="user-avatar" style="background-size:cover; background-position:center"></div>
            <div style="flex:1">
                 <div style="font-size:0.9rem; font-weight:600" id="user-name">Guest</div>
                 <div style="font-size:0.75rem; color: #666" id="user-status">Sign In</div>
            </div>
        </div>
    </div>
</div>
`;

const topBarHTML = `
<div class="top-bar">
    <div style="display:flex; align-items:center">
        <button class="mobile-toggle" id="menu-toggle">☰</button>
        <div class="search-bar">Search...</div>
    </div>
    <div>
        <!-- Notification or specific CTA could go here -->
    </div>
</div>
`;

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    // Prepend sidebar
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = layoutHTML;
    app.insertBefore(tempDiv.firstElementChild, app.firstChild);

    // Prepend topbar to main content
    const main = document.getElementById('main-content');
    const tempTop = document.createElement('div');
    tempTop.innerHTML = topBarHTML;
    main.insertBefore(tempTop.firstElementChild, main.firstChild);

    // Initial Active State
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-item').forEach(el => {
        if(el.getAttribute('href') === currentPath) el.classList.add('active');
    });

    // Mobile Toggle
    document.getElementById('menu-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    // Populate Site Name in Nav
    if(window.SITE_CONFIG) {
        document.getElementById('nav-site-name').innerText = window.SITE_CONFIG.siteName || 'App';
    }

    // Auth Handler UI
    window.updateAuthUI = function(user) {
        const nameEl = document.getElementById('user-name');
        const statusEl = document.getElementById('user-status');
        const avatarEl = document.getElementById('user-avatar');
        const profileBtn = document.getElementById('user-profile-btn');

        if (user) {
            nameEl.innerText = user.displayName || user.email.split('@')[0];
            statusEl.innerText = 'Pro Member';
            statusEl.style.color = 'green';
            if(user.photoURL) {
                avatarEl.style.backgroundImage = `url(${user.photoURL})`;
            }
            
            // Allow clicking to go to settings or logout
            profileBtn.onclick = () => window.location.href = 'settings.html';
        } else {
            nameEl.innerText = 'Guest';
            statusEl.innerText = 'Sign In';
            statusEl.style.color = '#666';
            avatarEl.style.backgroundImage = '';
            
            profileBtn.onclick = () => window.location.href = 'login.html';
        }
    }
});
