// public/script.js
const API = '/api'; // relative; served by same host

// helper
const getToken = () => localStorage.getItem('token');
const headers = () => getToken()? { 'Content-Type':'application/json', 'Authorization': `Bearer ${getToken()}` } : { 'Content-Type': 'application/json' };

function show(el){ document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden')); document.getElementById(el).classList.remove('hidden'); }
function showModal(id){ document.getElementById(id).classList.remove('hidden'); }
function hideModal(id){ document.getElementById(id).classList.add('hidden'); }
function showDashboardUI(){ document.getElementById('landing').classList.add('hidden'); document.getElementById('dashboard').classList.remove('hidden'); document.getElementById('btnLogin').classList.add('hidden'); document.getElementById('btnRegister').classList.add('hidden'); document.getElementById('btnLogout').classList.remove('hidden'); }
function showLandingUI(){ document.getElementById('landing').classList.remove('hidden'); document.getElementById('dashboard').classList.add('hidden'); document.getElementById('btnLogin').classList.remove('hidden'); document.getElementById('btnRegister').classList.remove('hidden'); document.getElementById('btnLogout').classList.add('hidden'); }

// init
document.addEventListener('DOMContentLoaded', () => {
  // nav buttons
  document.getElementById('btnLogin').addEventListener('click', ()=>showModal('loginModal'));
  document.getElementById('btnRegister').addEventListener('click', ()=>showModal('registerModal'));
  document.getElementById('loginCancel').addEventListener('click', ()=>hideModal('loginModal'));
  document.getElementById('registerCancel')?.addEventListener('click', ()=>hideModal('registerModal'));
  document.getElementById('btnLogout').addEventListener('click', logout);

  // dashboard nav
  document.getElementById('navProfile').addEventListener('click', ()=>show('profileView'));
  document.getElementById('navDirectory').addEventListener('click', ()=>{ show('directoryView'); loadDirectory(); });
  document.getElementById('navPostOpp').addEventListener('click', ()=>show('postOppView'));
  document.getElementById('navOppList').addEventListener('click', ()=>{ show('oppListView'); loadOpportunities(); });

  // forms
  document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
  document.getElementById('registerForm').addEventListener('submit', handleRegisterSubmit);
  document.getElementById('profileForm').addEventListener('submit', handleProfileSave);
  document.getElementById('postOppForm').addEventListener('submit', handlePostOpportunity);

  // initial state
  if (getToken()) {
    showDashboardUI();
    // load profile and default view
    loadMyProfile();
    show('dashboard'); // not used; we use show('dashBox') below
    show('dashBox');
    loadOpportunities();
    // show profile view by default
    show('profileView');
  } else {
    showLandingUI();
  }
});

// ---------- Auth handlers ----------
async function handleRegisterSubmit(e){
  e.preventDefault();
  const f=new FormData(e.target);
  const data = { name: f.get('name'), email: f.get('email'), password: f.get('password'), role: f.get('role') };
  try{
    const res = await fetch(`${API}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    if (!res.ok) { const err = await res.json().catch(()=>({})); alert(err.error || 'Register failed'); return; }
    alert('Registered successfully. Please login.');
    hideModal('registerModal');
    showModal('loginModal');
  }catch(err){ console.error(err); alert('Network error'); }
}

async function handleLoginSubmit(e){
  e.preventDefault();
  const f=new FormData(e.target);
  const payload={ email: f.get('email'), password: f.get('password') };
  try{
    const res = await fetch(`${API}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) { alert(data.error || 'Login failed'); return; }
    if (data.token) {
      localStorage.setItem('token', data.token);
      hideModal('loginModal');
      showDashboardUI();
      // load profile and default view
      loadMyProfile();
      show('profileView');
    } else {
      alert('No token received');
    }
  }catch(err){ console.error(err); alert('Network error'); }
}

function logout(){
  localStorage.removeItem('token');
  showLandingUI();
  // hide any view
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
}

// ---------- Profile ----------
async function loadMyProfile(){
  try{
    const res = await fetch(`${API}/users/me`, { headers: headers() });
    if (!res.ok) { console.log('No profile'); return; }
    const u = await res.json();
    const form = document.getElementById('profileForm');
    form.name.value = u.name || '';
    form.phone.value = u.phone || '';
    form.status.value = u.status || '';
  }catch(err){ console.error(err); }
}

async function handleProfileSave(e){
  e.preventDefault();
  const f=new FormData(e.target);
  const payload = Object.fromEntries(f.entries());
  try{
    const res = await fetch(`${API}/users/me`, { method:'PUT', headers: headers(), body: JSON.stringify(payload) });
    if (!res.ok) { alert('Save failed'); return; }
    alert('Profile saved');
    loadMyProfile();
  }catch(err){ console.error(err); alert('Network issue'); }
}

// ---------- Directory ----------
let lastDirectory = [];
async function loadDirectory(){
  try{
    const res = await fetch(`${API}/users/all`, { headers: headers() });
    if (!res.ok) { alert('Failed to load directory'); return; }
    const users = await res.json();
    lastDirectory = users;
    renderDirectory(users);
  }catch(err){ console.error(err); alert('Network error'); }
}

function renderDirectory(users) {
  const container = document.getElementById('directoryList');
  if (!container) return;

  if (!users || users.length === 0) {
    container.innerHTML = '<p class="card">No users found.</p>';
    return;
  }
// in loadDirectory or after renderDirectory, attach input handler
document.getElementById('dirSearch').oninput = function(){
  const term = this.value.trim().toLowerCase();
  const filtered = lastDirectory.filter(u => (u.name||'').toLowerCase().includes(term) || (u.email||'').toLowerCase().includes(term));
  renderDirectory(filtered);
};
  // Group users
  const groups = {
    student: users.filter(u => (u.role||'').toLowerCase() === 'student'),
    alumni: users.filter(u => (u.role||'').toLowerCase() === 'alumni'),
    faculty: users.filter(u => (u.role||'').toLowerCase() === 'faculty')
  };

  // Build HTML
  let html = '';

  function renderGroup(title, arr) {
    if (!arr || arr.length === 0) return '';
    return `
      <div class="group-section card">
        <h3 style="margin-top:0">${title} (${arr.length})</h3>
        <div class="group-grid">
          ${arr.map(u => `
            <div class="person-card">
              <h4>${escapeHtml(u.name)}</h4>
              <p class="muted">${escapeHtml(u.email)}</p>
              <p>${u.status ? escapeHtml(u.status) : ''}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  html += renderGroup('Students', groups.student);
  html += renderGroup('Alumni', groups.alumni);
  html += renderGroup('Faculty', groups.faculty);

  container.innerHTML = html;

  // Add some CSS for group-grid via JS if not in CSS:
  // This will create a responsive grid inside each group
  document.querySelectorAll('.group-grid').forEach(g => {
    g.style.display = 'grid';
    g.style.gridTemplateColumns = 'repeat(auto-fill,minmax(220px,1fr))';
    g.style.gap = '10px';
  });
}

// simple escape helper to avoid XSS
function escapeHtml(str){
  if(!str) return '';
  return String(str).replace(/[&<>"'`=\/]/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;','`':'&#96;','=':'&#61;' }[s]));
}

// ---------- Opportunities ----------
async function handlePostOpportunity(e){
  e.preventDefault();
  const f=new FormData(e.target);
  const payload = Object.fromEntries(f.entries());
  try{
    const res = await fetch(`${API}/opportunities`, { method:'POST', headers: headers(), body: JSON.stringify(payload) });
    if (!res.ok) { const err = await res.json().catch(()=>({})); alert(err.error || 'Failed to post'); return; }
    alert('Posted');
    document.getElementById('postOppForm').reset();
    show('oppListView');
    loadOpportunities();
  }catch(err){ console.error(err); alert('Network error'); }
}

async function loadOpportunities(){
  try{
    const res = await fetch(`${API}/opportunities`, { headers: headers() });
    if (!res.ok) { document.getElementById('opportunityList').innerHTML = '<p>Could not load</p>'; return; }
    const ops = await res.json();
    document.getElementById('opportunityList').innerHTML = ops.map(op => {
      const postedBy = op.User ? `Posted by ${op.User.name}` : '';
      const deadline = op.deadline ? ` — deadline ${new Date(op.deadline).toLocaleDateString()}` : '';
      const deleteBtn = (getToken() && op.User && op.User.id && getToken()) ? `<button class="btn" onclick="deleteOpportunity(${op.id})">Delete</button>` : '';
      return `<div class="card"><h4>${op.title}</h4><div>${op.description}</div><p>${op.type || ''}${deadline}</p><p>${postedBy}</p>${deleteBtn}</div>`;
    }).join('');
  }catch(err){ console.error(err); document.getElementById('opportunityList').innerHTML = '<p>Error</p>'; }
}

async function deleteOpportunity(id){
  if (!confirm('Delete?')) return;
  try{
    const res = await fetch(`${API}/opportunities/${id}`, { method:'DELETE', headers: headers() });
    if (!res.ok) { alert('Delete failed'); return; }
    alert('Deleted');
    loadOpportunities();
  }catch(err){ console.error(err); alert('Network error'); }
}
// focus title when opening Post Opportunity view
function focusPostOpp() {
  const title = document.getElementById('opp-title');
  if (title) {
    setTimeout(()=> title.focus(), 150); // slight delay after view toggle
  }
}
// ---------- Drawer toggle (hamburger) ----------
function openDrawer() {
  document.body.classList.add('drawer-open');
  // ensure overlay visible
  document.getElementById('drawerOverlay')?.classList.remove('hidden');
}
function closeDrawer() {
  document.body.classList.remove('drawer-open');
  document.getElementById('drawerOverlay')?.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  // hamburger toggles drawer
  document.getElementById('hamburger')?.addEventListener('click', (e) => {
    const isOpen = document.body.classList.contains('drawer-open');
    if (isOpen) closeDrawer(); else openDrawer();
  });

  // click on overlay closes drawer
  document.getElementById('drawerOverlay')?.addEventListener('click', closeDrawer);

  // when a sidebar nav button is clicked, close the drawer (improves UX)
  document.querySelectorAll('.sidebar .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // allow handlers to run; close drawer shortly after
      setTimeout(() => closeDrawer(), 120);
    });
  });
});

// call focusPostOpp() when you show the post view
// in your existing click handler for Post Opportunity, replace:
//   show('postOppView');
// with:
show('postOppView'); focusPostOpp();