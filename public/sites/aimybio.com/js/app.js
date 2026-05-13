// Page router + views for aimybio.com
// Wait for supabase.js (module) to load and fire initial auth-change before rendering auth-gated pages.

const AUTH_GATED = new Set(['dashboard.html', 'settings.html']);

function currentPage() {
  let raw = (window.location.pathname.split('/').pop() || '').toLowerCase();
  if (!raw) return 'index.html';
  if (!raw.includes('.')) raw += '.html'; // handle extensionless URLs (e.g. static hosts stripping .html)
  return raw;
}

function waitForAuth() {
  return new Promise(resolve => {
    // If supabase.js has already fired once, Auth.user may already be set; but we still
    // want to wait for the first auth-change event to be sure.
    const t = setTimeout(() => resolve(window.Auth?.user || null), 2000);
    window.addEventListener('auth-change', (e) => {
      clearTimeout(t);
      resolve(e.detail || null);
    }, { once: true });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const main = document.getElementById('main-content');
  if (!main) return;

  const page = currentPage();

  if (AUTH_GATED.has(page)) {
    main.insertAdjacentHTML('beforeend', loadingHTML());
    const user = await waitForAuth();
    const loader = document.getElementById('app-loader'); if (loader) loader.remove();
    if (!user) { window.location.href = 'login.html'; return; }
  }

  if (page === 'index.html' || page === '')   return renderHome(main);
  if (page === 'login.html')                   return renderLogin(main);
  if (page === 'pricing.html')                 return renderPricing(main);
  if (page === 'dashboard.html')               return routeDashboard(main);
  if (page === 'settings.html')                return renderSettings(main);
  if (page === 'help.html')                    return renderHelp(main);
  if (page === 'privacy.html')                 return renderPrivacy(main);
  if (page === 'terms.html')                   return renderTerms(main);
  main.insertAdjacentHTML('beforeend', `<div class="container"><h1>Page not found</h1><p><a href="index.html">Back home</a></p></div>`);
});

function loadingHTML() {
  return `<div id="app-loader" style="padding:4rem; text-align:center; color:#666">Loading\u2026</div>`;
}
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

// ── HOME ────────────────────────────────────────────────────────────────────
function renderHome(container) {
  const c = window.SITE_CONFIG;
  container.insertAdjacentHTML('beforeend', `
    <section class="hero-section container">
      <h1 class="hero-title">${esc(c.oneLineValueProp)}</h1>
      <p class="hero-subtitle">${esc(c.subtitle)}</p>
      <div style="display:flex; gap:.6rem; justify-content:center; flex-wrap:wrap; margin-bottom:.75rem">
        <a href="login.html" class="btn-cta">${esc(c.primaryCTA)}</a>
        <a href="pricing.html" class="btn-outline">See pricing</a>
      </div>

      <form id="signup-form" style="max-width:400px; margin:0 auto; display:flex; gap:.4rem">
        <input type="email" name="email" required placeholder="you@company.com"
          style="flex:1; padding:.5rem .85rem; border:1px solid #ccc; border-radius:30px; font-size:.9rem">
        <button class="btn-cta" type="submit" style="margin:0; padding:.5rem 1.1rem; font-size:.9rem">Join the list</button>
      </form>
      <div id="signup-msg" style="margin-top:.35rem; min-height:1em; font-size:.8rem; color:#666"></div>
    </section>

    <section class="container" style="max-width:1100px; margin-top:.75rem">
      <h2 style="text-align:center; margin-bottom:.1rem; font-size:1.35rem">What your bio will finally do</h2>
      <p style="text-align:center; color:#666; margin-bottom:.9rem; font-size:.9rem">Every feature below is live. No vapor, no waitlist.</p>
      <div class="card-grid">
        ${c.cards.map((card, i) => {
          const hue = (i * 45) % 360;
          return `
            <div class="card">
              <div class="card-thumb" style="background:linear-gradient(135deg, hsl(${hue},80%,95%) 0%, hsl(${hue},60%,88%) 100%)">
                <div style="font-size:1.75rem; opacity:.55; font-weight:700; letter-spacing:-0.03em">${esc(card.title.slice(0,2))}</div>
              </div>
              <div class="card-content">
                <div class="card-title">${esc(card.title)}</div>
                <div class="card-desc">${esc(card.desc)}</div>
                <div class="card-footer">
                  <span class="badge">${esc(card.tag)}</span>
                  <span>${esc(card.stats)}</span>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </section>

    <section class="steps-section container">
      <h2 style="text-align:center">How it works</h2>
      <div class="steps-grid">
        ${c.howItWorks.map((s, i) => `
          <div class="step-item">
            <div class="step-num">0${i+1}</div>
            <h3>${esc(s.title)}</h3>
            <p style="color:#666; font-size:.9rem">${esc(s.desc)}</p>
          </div>`).join('')}
      </div>
    </section>

    <section class="container" style="text-align:center; padding:1.5rem 0 2rem">
      <h2 style="margin-bottom:.75rem">Ready?</h2>
      <a href="login.html" class="btn-cta">${esc(c.primaryCTA)}</a>
    </section>
  `);

  const form = document.getElementById('signup-form');
  const msg  = document.getElementById('signup-msg');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.elements.email.value.trim();
    if (!email) return;
    msg.style.color = '#666'; msg.innerText = 'Signing you up\u2026';
    try {
      await window.EmailSignup.submit(email);
      msg.style.color = 'green';
      msg.innerText = 'You\u2019re on the list. Check your inbox.';
      form.reset();
    } catch (err) {
      msg.style.color = '#ef4444';
      msg.innerText = err.message || 'Something went wrong. Try again.';
    }
  });
}

// ── LOGIN ───────────────────────────────────────────────────────────────────
function renderLogin(container) {
  // Redirect if already logged in
  window.addEventListener('auth-change', (e) => {
    if (e.detail) window.location.href = 'dashboard.html';
  });
  if (window.Auth?.user) { window.location.href = 'dashboard.html'; return; }

  container.insertAdjacentHTML('beforeend', `
    <div style="max-width:420px; margin:3rem auto; padding:0 1rem">
      <h1 style="text-align:center; margin-bottom:.5rem">Welcome</h1>
      <p style="text-align:center; color:#666; margin-bottom:2rem">Sign in to create your bios.</p>

      <button id="btn-google" class="btn-outline" style="width:100%; display:flex; align-items:center; justify-content:center; gap:.5rem">
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 5.8 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 7 29.4 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.3 0 10-2 13.6-5.2l-6.3-5.2C29.2 35.4 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-8l-6.5 5C9.4 39.6 16.1 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.5l6.3 5.2C40.3 35.2 44 30.1 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
        Continue with Google
      </button>

      <div style="display:flex; align-items:center; gap:1rem; margin:1.5rem 0; color:#aaa; font-size:.85rem">
        <div style="flex:1; height:1px; background:#eee"></div>or<div style="flex:1; height:1px; background:#eee"></div>
      </div>

      <form id="email-form">
        <label style="display:block; font-size:.85rem; color:#666; margin-bottom:.25rem">Email</label>
        <input type="email" name="email" required autocomplete="email"
          style="width:100%; padding:.75rem; border:1px solid #ccc; border-radius:8px; margin-bottom:1rem">
        <label style="display:block; font-size:.85rem; color:#666; margin-bottom:.25rem">Password</label>
        <input type="password" name="password" required minlength="6" autocomplete="current-password"
          style="width:100%; padding:.75rem; border:1px solid #ccc; border-radius:8px; margin-bottom:1rem">
        <button class="btn-cta" type="submit" style="width:100%">Sign in</button>
      </form>

      <p style="margin-top:1rem; text-align:center; font-size:.9rem">
        New here? <a href="#" id="link-signup">Create an account</a>
      </p>
      <div id="login-msg" style="margin-top:1rem; min-height:1.2em; font-size:.9rem; text-align:center"></div>
    </div>
  `);

  let mode = 'signin'; // or 'signup'
  const form  = document.getElementById('email-form');
  const btn   = form.querySelector('button[type=submit]');
  const link  = document.getElementById('link-signup');
  const msg   = document.getElementById('login-msg');

  link.addEventListener('click', (e) => {
    e.preventDefault();
    mode = mode === 'signin' ? 'signup' : 'signin';
    btn.innerText = mode === 'signin' ? 'Sign in' : 'Create account';
    link.innerText = mode === 'signin' ? 'Create an account' : 'Already have an account? Sign in';
    msg.innerText = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.elements.email.value.trim();
    const pass  = form.elements.password.value;
    msg.style.color = '#666'; msg.innerText = mode === 'signin' ? 'Signing in\u2026' : 'Creating account\u2026';
    if (mode === 'signin') await window.Auth.signInEmail(email, pass);
    else                    await window.Auth.signUpEmail(email, pass);
  });

  document.getElementById('btn-google').addEventListener('click', () => window.Auth.signInGoogle());
}

// ── PRICING ─────────────────────────────────────────────────────────────────
function renderPricing(container) {
  const c = window.SITE_CONFIG;
  container.insertAdjacentHTML('beforeend', `
    <div class="container" style="max-width:1200px">
      <div style="text-align:center; padding:2rem 0 3rem">
        <h1 style="margin-bottom:.5rem">Simple pricing</h1>
        <p style="color:#666">Start free. Upgrade when you\u2019re ready.</p>
      </div>
      <div class="pricing-grid">
        ${c.plans.map(p => `
          <div class="pricing-card ${p.highlight ? 'highlight' : ''}">
            ${p.highlight ? '<div class="pricing-badge">Best value</div>' : ''}
            <h2>${esc(p.name)}</h2>
            <div class="price"><span class="price-big">${esc(p.price)}</span><span class="price-sub">${esc(p.sub)}</span></div>
            <ul class="pricing-features">
              ${p.bullets.map(b => `<li>\u2713 ${esc(b)}</li>`).join('')}
            </ul>
            <button class="btn-cta pricing-cta" data-plan="${esc(p.key)}" ${p.signupOnly ? 'data-signup="1"' : ''}>${esc(p.cta)}</button>
          </div>`).join('')}
      </div>
      <p style="text-align:center; color:#666; font-size:.85rem; margin-top:2rem">
        Cancel anytime. Secure checkout via Stripe.
      </p>
    </div>
  `);

  container.querySelectorAll('.pricing-cta').forEach(btn => {
    btn.addEventListener('click', async () => {
      const plan = btn.dataset.plan;
      if (btn.dataset.signup) { window.location.href = 'login.html'; return; }
      if (!window.Auth?.user) { window.location.href = 'login.html'; return; }
      btn.disabled = true; const orig = btn.innerText; btn.innerText = 'Redirecting\u2026';
      try {
        const res = await window.BioAPI.checkout(plan);
        if (res?.url) window.location.href = res.url;
        else throw new Error('No checkout URL returned');
      } catch (err) {
        alert(err.message || 'Could not start checkout.');
        btn.disabled = false; btn.innerText = orig;
      }
    });
  });
}

// ── DASHBOARD ROUTER (my bios / new / results) ─────────────────────────────
function routeDashboard(container) {
  const render = () => {
    const hash = window.location.hash || '';
    if (hash.startsWith('#new'))     return renderNewBio(container);
    if (hash.startsWith('#session=')) return renderBioResults(container, hash.slice('#session='.length));
    return renderMyBios(container);
  };
  render();
  window.addEventListener('hashchange', render);
}

async function renderMyBios(container) {
  container.innerHTML = `<div class="top-bar"></div>` + `
    <div class="container" style="max-width:1000px">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem">
        <h1 style="margin:0">My Bios</h1>
        <a href="#new" class="btn-cta">+ New bio</a>
      </div>
      <div id="sessions-list" style="color:#666">Loading\u2026</div>
    </div>`;

  try {
    const { sessions } = await window.BioAPI.listSessions();
    const list = document.getElementById('sessions-list');
    if (!sessions || sessions.length === 0) {
      list.innerHTML = `
        <div style="text-align:center; padding:3rem; border:1px dashed #ddd; border-radius:12px">
          <h3 style="margin-bottom:.5rem">No bios yet</h3>
          <p style="color:#666; margin-bottom:1.5rem">Answer 5 questions and get 6 bios in under a minute.</p>
          <a href="#new" class="btn-cta">Create your first bio</a>
        </div>`;
      return;
    }
    list.innerHTML = sessions.map(s => `
      <a href="#session=${esc(s.id)}" class="session-row">
        <div style="flex:1">
          <div style="font-weight:600">${esc(s.industry || 'Bio set')} <span style="color:#999; font-weight:400; font-size:.85rem">\u2022 ${new Date(s.created_at).toLocaleDateString()}</span></div>
          <div style="font-size:.85rem; color:${s.status === 'completed' ? 'green' : '#999'}">${esc(s.status)}</div>
        </div>
        <div style="color:#999">\u203A</div>
      </a>`).join('');
  } catch (err) {
    document.getElementById('sessions-list').innerHTML = `<div style="color:#ef4444">${esc(err.message)}</div>`;
  }
}

function renderNewBio(container) {
  const tpl = `
    <div class="container" style="max-width:720px">
      <a href="#" style="color:#666; text-decoration:none; font-size:.9rem">\u2190 Back</a>
      <h1 style="margin:1rem 0">Tell us about you</h1>
      <p style="color:#666; margin-bottom:2rem">Five questions. Be specific \u2014 the more concrete, the better the bios.</p>
      <form id="bio-form" class="bio-form">
        <label>Industry <span class="req">*</span>
          <input name="industry" required placeholder="e.g. SaaS, coaching, publishing">
        </label>
        <label>Years of experience
          <input name="years_experience" type="number" min="0" max="80" placeholder="12">
        </label>
        <label>1. What do you do? <span class="req">*</span>
          <textarea name="q1_what_you_do" required rows="3" placeholder="Describe the actual work \u2014 who you do it for, how, and the result."></textarea>
        </label>
        <label>2. What are you proud of?
          <textarea name="q2_proud_of" rows="3" placeholder="Specific wins, numbers, recognitions, moments."></textarea>
        </label>
        <label>3. What do people get wrong about you or your field?
          <textarea name="q3_wrong_about" rows="2" placeholder="The misconception you keep having to correct."></textarea>
        </label>
        <label>4. Your work in one sentence
          <textarea name="q4_one_sentence" rows="2" placeholder="If you only had 140 characters\u2026"></textarea>
        </label>
        <label>5. What are you building toward?
          <textarea name="q5_building_toward" rows="2" placeholder="The bigger goal, the next year, the direction."></textarea>
        </label>
        <label>Notable clients or companies (optional)
          <input name="notable_clients" placeholder="Comma-separated">
        </label>
        <label>Top achievement (optional)
          <input name="top_achievement" placeholder="One line">
        </label>
        <label>Keywords for recruiters / SEO (optional)
          <input name="keywords" placeholder="Comma-separated">
        </label>
        <label>Tone
          <select name="tone">
            <option value="professional">Professional</option>
            <option value="warm">Warm</option>
            <option value="bold">Bold</option>
            <option value="humble">Humble</option>
            <option value="creative">Creative</option>
            <option value="executive">Executive</option>
          </select>
        </label>
        <button class="btn-cta" type="submit" id="bio-submit" style="margin-top:1rem">Generate my 6 bios</button>
        <div id="bio-msg" style="margin-top:1rem; min-height:1.5em; font-size:.9rem; color:#666"></div>
      </form>
    </div>`;
  container.innerHTML = `<div class="top-bar"></div>` + tpl;

  const form = document.getElementById('bio-form');
  const btn  = document.getElementById('bio-submit');
  const msg  = document.getElementById('bio-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    msg.style.color = '#666'; msg.innerText = 'Starting session\u2026';

    const fd = new FormData(form);
    const industry = fd.get('industry');
    const tone = fd.get('tone') || 'professional';

    const answers = {
      q1_what_you_do: fd.get('q1_what_you_do') || null,
      q2_proud_of:    fd.get('q2_proud_of')    || null,
      q3_wrong_about: fd.get('q3_wrong_about') || null,
      q4_one_sentence:fd.get('q4_one_sentence')|| null,
      q5_building_toward: fd.get('q5_building_toward') || null,
      industry:       industry || null,
      years_experience: fd.get('years_experience') ? Number(fd.get('years_experience')) : null,
      notable_clients:  fd.get('notable_clients') || null,
      top_achievement:  fd.get('top_achievement') || null,
      keywords: (fd.get('keywords') || '').split(',').map(s => s.trim()).filter(Boolean),
    };

    try {
      const start = await window.BioAPI.startSession({ industry, plan: window.Auth?.profile?.plan });
      const sessionId = start.session.id;

      msg.innerText = 'Saving your answers\u2026';
      await window.BioAPI.updateSession(sessionId, answers);

      msg.innerText = 'Claude is writing 6 bios\u2026 (this takes ~30 seconds)';
      await window.BioAPI.generate(sessionId, tone);

      window.location.hash = 'session=' + sessionId;
    } catch (err) {
      msg.style.color = '#ef4444';
      msg.innerText = err.message || 'Generation failed.';
      btn.disabled = false;
    }
  });
}

async function renderBioResults(container, sessionId) {
  container.innerHTML = `<div class="top-bar"></div>` + `
    <div class="container" style="max-width:900px">
      <a href="#" style="color:#666; text-decoration:none; font-size:.9rem">\u2190 All bios</a>
      <h1 style="margin:1rem 0">Your bios</h1>
      <div id="results">Loading\u2026</div>
    </div>`;

  try {
    const { session, outputs } = await window.BioAPI.getSession(sessionId);
    const root = document.getElementById('results');
    if (!outputs || outputs.length === 0) {
      root.innerHTML = `<div style="color:#666">No bios generated yet for this session.</div>`;
      return;
    }
    root.innerHTML = outputs.map(o => {
      const fmt = (window.SITE_CONFIG.formats.find(f => f.key === o.format) || { title: o.format });
      return `
        <div class="bio-card">
          <div class="bio-card-head">
            <div>
              <div class="bio-card-title">${esc(fmt.title)}</div>
              <div style="font-size:.8rem; color:#666">${o.word_count || 0} words \u2022 ${o.char_count || 0} chars ${o.is_watermarked ? '\u2022 watermarked (free plan)' : ''}</div>
            </div>
            <div class="score-badge" title="Overall score">${o.score_overall ?? '\u2013'}</div>
          </div>
          <pre class="bio-card-body">${esc(o.content || '')}</pre>
          ${o.score_feedback ? `<div class="bio-feedback">${esc(o.score_feedback)}</div>` : ''}
          <div class="bio-card-actions">
            <button class="btn-outline btn-copy" data-content="${esc(o.content || '')}">Copy</button>
          </div>
        </div>`;
    }).join('');

    root.querySelectorAll('.btn-copy').forEach(b => {
      b.addEventListener('click', async () => {
        await navigator.clipboard.writeText(b.dataset.content);
        const prev = b.innerText; b.innerText = 'Copied!';
        setTimeout(() => b.innerText = prev, 1200);
      });
    });
  } catch (err) {
    document.getElementById('results').innerHTML = `<div style="color:#ef4444">${esc(err.message)}</div>`;
  }
}

// ── SETTINGS ────────────────────────────────────────────────────────────────
async function renderSettings(container) {
  const u = window.Auth?.user;
  const p = window.Auth?.profile || {};
  container.insertAdjacentHTML('beforeend', `
    <div class="container" style="max-width:700px">
      <h1 style="margin-bottom:2rem">Settings</h1>

      <section class="settings-card">
        <h3>Account</h3>
        <div class="kv"><span>Email</span><span>${esc(u?.email || '')}</span></div>
        <div class="kv"><span>Plan</span><span style="font-weight:600">${esc((p.plan || 'free').toUpperCase())}</span></div>
        <div class="kv"><span>Credits</span><span>${p.plan && p.plan !== 'free' ? 'Unlimited' : esc(String(p.bio_credits ?? 0))}</span></div>
        <div class="kv"><span>Status</span><span>${esc(p.plan_status || 'active')}</span></div>
      </section>

      <section class="settings-card">
        <h3>Billing</h3>
        <p style="color:#666; margin-bottom:1rem">Manage your subscription via Stripe.</p>
        <a href="pricing.html" class="btn-outline">See plans</a>
      </section>

      <section class="settings-card">
        <h3>Sign out</h3>
        <button id="btn-signout" class="btn-danger">Sign out</button>
      </section>
    </div>
  `);
  document.getElementById('btn-signout').addEventListener('click', () => window.Auth.signOut());
}

// ── STATIC PAGES ────────────────────────────────────────────────────────────
function renderHelp(container) {
  container.insertAdjacentHTML('beforeend', `
    <div class="container" style="max-width:720px">
      <h1>Help &amp; FAQ</h1>
      <h3>How it works</h3>
      <p>Answer five questions about your work. Claude writes six bio formats in parallel: LinkedIn About, speaker intro, website About, Twitter bio, email signature tagline, and press kit. Each is scored on clarity, credibility, memorability, keywords, and call-to-action.</p>
      <h3>Free vs Pro</h3>
      <p>Free gives you one bio set with a light watermark. Pro unlocks unlimited bio sets, all six formats, no watermark, and multiple tone variants.</p>
      <h3>Who owns the output?</h3>
      <p>You do. Copy it anywhere.</p>
      <h3>Who built this?</h3>
      <p>AI My Bio is part of the AI My Service Network.</p>
      <p style="margin-top:2rem"><a href="mailto:hello@aimybio.com">hello@aimybio.com</a></p>
    </div>
  `);
}
function renderPrivacy(container) {
  container.insertAdjacentHTML('beforeend', `
    <div class="container" style="max-width:720px">
      <h1>Privacy Policy</h1>
      <p style="color:#666">Last updated: April 2026</p>
      <p>We store your email, your answers to the bio questionnaire, and the generated bios. Your answers are sent to Anthropic to generate your bios and are not used to train models. We do not sell your data.</p>
      <p>Questions? <a href="mailto:privacy@aimybio.com">privacy@aimybio.com</a></p>
    </div>`);
}
function renderTerms(container) {
  container.insertAdjacentHTML('beforeend', `
    <div class="container" style="max-width:720px">
      <h1>Terms of Service</h1>
      <p style="color:#666">Last updated: April 2026</p>
      <p>By using AI My Bio you agree to use the service lawfully, not to attempt to misuse the API, and to take responsibility for the content you publish based on our output. The service is provided as-is, with no warranty.</p>
      <p>Questions? <a href="mailto:legal@aimybio.com">legal@aimybio.com</a></p>
    </div>`);
}
