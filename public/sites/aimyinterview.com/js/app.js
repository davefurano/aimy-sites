
document.addEventListener('DOMContentLoaded', () => {
    const main = document.getElementById('main-content');
    const path = window.location.pathname.split('/').pop() || 'index.html';

    // ROUTER
    if (path === 'index.html' || path === '') {
        renderHome(main);
    } else if (path === 'pricing.html') {
        renderPricing(main);
    } else if (path === 'login.html') {
        renderLogin(main);
    } else if (path === 'dashboard.html') {
        // Simple hash router for tools
        handleDashboardRoute(main);
        window.addEventListener('hashchange', () => handleDashboardRoute(main));
    } else if (path === 'settings.html') {
        renderSettings(main);
    } else {
        renderGeneric(main, path);
    }
});

function handleDashboardRoute(container) {
    const hash = window.location.hash.slice(1); // remove #
    if (!hash) {
        renderDashboard(container);
    } else {
        // Render specific tool based on hash name
        // Decode URI component updates spaces to %20 etc
        const toolName = decodeURIComponent(hash);
        renderTool(container, toolName);
    }
}

function renderHome(container) {
    const config = window.SITE_CONFIG;
    if(!config) return;

    // Hero
    const hero = document.createElement('div');
    hero.className = 'hero-section';
    hero.innerHTML = `
        <h1 class="hero-title">${config.oneLineValueProp}</h1>
        <p class="hero-subtitle">Optimize your workflow with our AI-driven solutions.</p>
        <a href="dashboard.html" class="btn-cta">${config.primaryCTA}</a>
    `;
    container.appendChild(hero);

    // Cards
    const grid = document.createElement('div');
    grid.className = 'card-grid';
    
    config.cards.forEach((card, idx) => {
        const c = document.createElement('div');
        c.className = 'card';
        const hue = (idx * 45) % 360;
        const bg = `linear-gradient(135deg, hsl(${hue}, 80%, 95%) 0%, hsl(${hue}, 60%, 90%) 100%)`;
        
        c.innerHTML = `
            <div class="card-thumb" style="background:${bg}">
                <div style="font-size:2rem; opacity:0.5">${card.tag.substring(0,2)}</div>
            </div>
            <div class="card-content">
                <div class="card-title">${card.title}</div>
                <div class="card-desc">${card.desc}</div>
                <div class="card-footer">
                    <span class="badge">${card.tag}</span>
                    <span>${card.stats}</span>
                </div>
            </div>
        `;
        grid.appendChild(c);
    });
    container.appendChild(grid);

    // How it works
    const steps = document.createElement('div');
    steps.className = 'steps-section';
    steps.innerHTML = `
        <h2 style="text-align:center; margin-bottom:2rem">How it works</h2>
        <div class="steps-grid">
            ${config.howItWorks.map((step, i) => `
                <div class="step-item">
                    <div class="step-num">0${i+1}</div>
                    <h3>${step.title}</h3>
                    <p style="color:#666; font-size:0.9rem">${step.desc}</p>
                </div>
            `).join('')}
        </div>
    `;
    container.appendChild(steps);
}

function renderPricing(container) {
    container.innerHTML = `
        <div style="text-align:center; padding: 4rem 0;">
            <h1>Simple Pricing</h1>
            <p style="color:#666; margin-bottom:3rem">Start for free, upgrade as you grow.</p>
            <div style="display:flex; gap:2rem; justify-content:center; flex-wrap:wrap">
                <div style="border:1px solid #ccc; padding:2rem; border-radius:8px; width:300px; text-align:left">
                    <h2>Free</h2>
                    <div style="font-size:2rem; font-weight:bold; margin:1rem 0">$0<span style="font-size:1rem; font-weight:normal">/mo</span></div>
                    <ul style="list-style:none; line-height:2"><li>✓ Basic Access</li><li>✓ Limited Usage</li></ul>
                    <a href="login.html" class="btn-cta" style="background:#eee; color:black">Get Started</a>
                </div>
                <div style="border:2px solid #000; padding:2rem; border-radius:8px; width:300px; text-align:left; position:relative">
                    <div style="position:absolute; top:-10px; right:20px; background:black; color:white; padding:2px 10px; font-size:0.8rem; border-radius:10px">PRO</div>
                    <h2>Pro</h2>
                    <div style="font-size:2rem; font-weight:bold; margin:1rem 0">$29<span style="font-size:1rem; font-weight:normal">/mo</span></div>
                    <ul style="list-style:none; line-height:2"><li>✓ All AI Tools</li><li>✓ Priority Support</li><li>✓ No Limits</li></ul>
                    <a href="https://example.com/checkout" target="_blank" class="btn-cta">Upgrade</a>
                </div>
            </div>
        </div>
    `;
}

function renderLogin(container) {
    if(window.Auth && window.Auth.user) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Listen for late auth updates
    const onAuth = () => {
        if(window.Auth.user) window.location.href = 'dashboard.html';
    };
    window.addEventListener('auth-change', onAuth);

    container.innerHTML = `
        <div style="max-width:400px; margin: 4rem auto; text-align:center;">
             <h1 style="margin-bottom:2rem">Welcome Back</h1>
             <button onclick="window.Auth.signInGoogle()" style="width:100%; padding:1rem; margin-bottom:1rem; background:white; border:1px solid #ccc; border-radius:8px; cursor:pointer">
                Google Sign In
             </button>
             <form onsubmit="event.preventDefault(); window.Auth.signInEmail(this.elements.email.value, this.elements.password.value)">
                <input type="email" name="email" placeholder="Email" style="width:100%; padding:0.8rem; margin-bottom:1rem; border:1px solid #ccc; border-radius:8px">
                <input type="password" name="password" placeholder="Password" style="width:100%; padding:0.8rem; margin-bottom:1rem; border:1px solid #ccc; border-radius:8px">
                <button class="btn-cta" style="width:100%">Sign In</button>
             </form>
             <p style="margin-top:1rem"><a href="#" onclick="event.preventDefault(); window.Auth.signUpEmail(document.querySelector('input[name=email]').value, document.querySelector('input[name=password]').value)">Sign Up</a></p>
        </div>
    `;
}

// --- DASHBOARD & TOOLS ---

function renderDashboard(container) {
    // 1. If we have a user, render immediately
    if(window.Auth && window.Auth.user) {
        renderDashboardContent(container);
        return;
    }

    // 2. If no user yet, show loader and wait for event
    container.innerHTML = `<div style="text-align:center; padding:4rem; color:#666">Loading AI Workspace...</div>`;

    const onAuth = (e) => {
        if(e.detail) {
            renderDashboardContent(container);
        } else {
             container.innerHTML = `<div style="text-align:center; padding:4rem"><h1>Please Log In</h1><p>Access your AI tools.</p><a href="login.html" class="btn-cta">Sign In</a></div>`;
        }
    };
    window.addEventListener('auth-change', onAuth);

    // 3. Fallback timeout (if user is truly logged out and event fired before listener attached)
    setTimeout(() => {
        if(!window.Auth.user && container.innerText.includes('Loading')) {
             container.innerHTML = `<div style="text-align:center; padding:4rem"><h1>Please Log In</h1><p>Access your AI tools.</p><a href="login.html" class="btn-cta">Sign In</a></div>`;
        }
    }, 2000);
}

function renderDashboardContent(container) {
    const config = window.SITE_CONFIG;
    // Tools Grid
    const toolsHtml = config.cards.map((card, idx) => {
        const hue = (idx * 45) % 360;
        return `
            <a href="#${encodeURIComponent(card.title)}" style="text-decoration:none; color:inherit">
                <div class="card" style="cursor:pointer; transition:transform 0.2s">
                    <div class="card-thumb" style="background:hsl(${hue}, 80%, 95%); height:100px; display:flex; align-items:center; justify-content:center; font-size:2rem">
                        ${card.tag.substring(0,2)}
                    </div>
                    <div class="card-content">
                        <div class="card-title">${card.title}</div>
                        <div class="card-desc" style="font-size:0.85rem">${card.desc}</div>
                    </div>
                </div>
            </a>
        `;
    }).join('');

    container.innerHTML = `
        <div style="max-width:1000px; margin: 0 auto;">
             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem">
                <h1>AI Workspace</h1>
                <div style="font-size:0.9rem; padding:0.5rem; background:#f0f0f0; border-radius:4px">
                    Credits: <span style="font-weight:bold">Unlimited</span> (Pro)
                </div>
             </div>
             
             <h3 style="margin-bottom:1rem">Available Tools</h3>
             <div class="card-grid" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))">
                ${toolsHtml}
             </div>

             <div style="margin-top:4rem">
                <h3>Saved Workflows</h3>
                <div id="project-list" style="margin-top:1rem; border-top:1px solid #eee; padding-top:1rem">
                    Loading history...
                </div>
             </div>
        </div>
    `;
    loadProjects();
}

function renderTool(container, toolName) {
    // Find tool desc
    const tool = window.SITE_CONFIG.cards.find(c => c.title === toolName) || { desc: "AI Assistant" };
    
    container.innerHTML = `
        <div style="max-width:800px; margin: 0 auto; height:80vh; display:flex; flex-direction:column;">
            <div style="margin-bottom:1rem; display:flex; align-items:center; gap:1rem">
                <a href="#" style="text-decoration:none; font-size:1.5rem">←</a>
                <div>
                    <h1 style="margin:0; font-size:1.5rem">${toolName}</h1>
                    <div style="font-size:0.9rem; color:#666">${tool.desc}</div>
                </div>
            </div>

            <div id="chat-history" style="flex:1; background:#f9f9f9; border-radius:8px; padding:1.5rem; overflow-y:auto; margin-bottom:1rem; border:1px solid #eee">
                <div style="background:#fff; padding:1rem; border-radius:8px; margin-bottom:1rem; border:1px solid #eee; align-self:flex-start; max-width:80%">
                    <strong>AI:</strong> Ready to help with ${toolName}. What do you need?
                </div>
            </div>

            <form onsubmit="handleToolSubmit(event, '${toolName}')" style="display:flex; gap:0.5rem">
                <input type="text" id="user-input" placeholder="Type your request..." style="flex:1; padding:1rem; border:1px solid #ccc; border-radius:8px" autocomplete="off">
                <button type="submit" class="btn-cta" style="margin:0">Send</button>
            </form>
        </div>
    `;
}

window.handleToolSubmit = async (e, toolName) => {
    e.preventDefault();
    const input = document.getElementById('user-input');
    const history = document.getElementById('chat-history');
    const txt = input.value.trim();
    if(!txt) return;

    // Append User Msg
    history.innerHTML += `
        <div style="background:#000; color:white; padding:1rem; border-radius:8px; margin-bottom:1rem; align-self:flex-end; max-width:80%; margin-left:auto">
            ${txt}
        </div>
    `;
    input.value = '';
    history.scrollTop = history.scrollHeight;

    // Simulate AI Loading
    const loadingId = 'loading-' + Date.now();
    history.innerHTML += `<div id="${loadingId}" style="color:#999; font-style:italic; margin-bottom:1rem">AI is thinking...</div>`;
    history.scrollTop = history.scrollHeight;

    // Call AI
    const response = await simulateAI(toolName, txt);

    // Remove loading
    const loader = document.getElementById(loadingId);
    if(loader) loader.remove();

    // Append AI Msg
    history.innerHTML += `
        <div style="background:#fff; padding:1rem; border-radius:8px; margin-bottom:1rem; border:1px solid #eee; align-self:flex-start; max-width:80%">
            <strong>AI:</strong> ${formatText(response)}
        </div>
    `;
    history.scrollTop = history.scrollHeight;
    
    // Save to Firestore (optional, simplified)
    if(window.DB) {
        window.DB.addProject(`${toolName}: ${txt.substring(0,20)}...`);
    }
};

async function simulateAI(toolName, userPrompt) {
    const key = localStorage.getItem('openai_key') || "";
    
    if (!key) {
        return "I am in DEMO MODE. Please provided an API Key in Settings.";
    }

    // Call OpenAI
    try {
        const sysPrompt = `You are a specialized AI Agent for the tool "${toolName}". Your goal is: ${window.SITE_CONFIG.cards.find(c=>c.title===toolName)?.desc || 'Help the user'}. Be professional, concise, and helpful.`;
        
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {role: "system", content: sysPrompt},
                    {role: "user", content: userPrompt}
                ]
            })
        });
        const data = await res.json();
        if(data.error) return "Error from OpenAI: " + data.error.message;
        return data.choices[0].message.content;

    } catch(e) {
        return "Network Error: " + e.message;
    }
}

function formatText(text) {
    // Simple newline to br
    return text.replace(/\n/g, '<br>');
}

function renderSettings(container) {
    const currentKey = localStorage.getItem('openai_key') || '';
    container.innerHTML = `
        <div style="max-width:600px; margin: 0 auto;">
             <h1>Settings</h1>
             
             <div style="margin-top:2rem; padding:2rem; border:1px solid #eee; border-radius:8px">
                <h3>API Configuration</h3>
                <p style="color:#666; font-size:0.9rem; margin-bottom:1rem">
                    To enable real AI features, please provide your OpenAI API Key. 
                    It is stored locally on your device.
                </p>
                <input type="password" id="api-key-input" value="${currentKey}" placeholder="sk-..." style="width:100%; padding:0.8rem; margin-bottom:1rem; border:1px solid #ccc; border-radius:4px">
                <button onclick="saveKey()" class="btn-cta" style="padding:0.5rem 1rem">Save Key</button>
             </div>

             <div style="margin-top:2rem; padding:2rem; border:1px solid #eee; border-radius:8px">
                <h3>Account</h3>
                <button onclick="window.Auth.signOut()" style="border:1px solid #ef4444; color:#ef4444; background:white; padding:0.5rem 1rem; border-radius:4px; cursor:pointer">Sign Out</button>
             </div>
        </div>
    `;
}

window.saveKey = () => {
    const k = document.getElementById('api-key-input').value.trim();
    if(k) {
        localStorage.setItem('openai_key', k);
        alert('Key saved! basic AI features are now active.');
    } else {
        localStorage.removeItem('openai_key');
        alert('Key removed.');
    }
};

function renderGeneric(container, path) {
    container.innerHTML = `<h1>${path}</h1><p>Content not found.</p>`;
}
// HELPERS
async function loadProjects() {
    if(!window.DB) return;
    const list = document.getElementById('project-list');
    if(!list) return;
    try {
        const projects = await window.DB.getProjects();
        if(projects.length === 0) list.innerHTML = '<div style="color:#666">No history yet.</div>';
        else list.innerHTML = projects.map(p => `<div>• ${p.name} <span style="color:#ccc; font-size:0.8rem">(${new Date(p.createdAt?.seconds*1000).toLocaleDateString()})</span></div>`).join('');
    } catch(e) { console.error(e); }
}
