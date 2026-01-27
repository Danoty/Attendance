console.log("🔌 Supabase object:", window.supabase);

const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_PUBLIC_KEY";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("✅ Supabase client created:", !!supabase);
/* ===========================
   Supabase Backend Starter - app.js
=========================== */

const sb = window.supabase;
if (!sb) alert("Supabase not loaded. Check index.html module script.");

function $(id){ return document.getElementById(id); }
function showSection(id){
  ["loginSection","lecturerRegistrationSection","adminDashboard","lecturerDashboard","studentSection"].forEach(sid=>{
    const el = $(sid); if(!el) return;
    el.classList.toggle("hidden", sid !== id);
  });
}
function setAlert(el, msg, type="info"){
  el.textContent = msg;
  el.classList.remove("hidden","alert-info","alert-danger","alert-success");
  if(type==="danger") el.classList.add("alert-danger");
  else if(type==="success") el.classList.add("alert-success");
  else el.classList.add("alert-info");
}
function clearAlert(el){ el.classList.add("hidden"); }

let currentProfile = null; // {id, role, approved, full_name ...}

async function ensureProfile(user){
  // Create profile if missing
  const { data: prof, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (prof) return prof;

  // Create default profile
  const { data: created, error: insErr } = await sb
    .from("profiles")
    .insert([{
      id: user.id,
      role: "lecturer",
      approved: false,
      username: user.email
    }])
    .select("*")
    .single();

  if (insErr) throw insErr;
  return created;
}

function updateTopBar(){
  const summary = $("userSummary");
  const logoutBtn = $("logoutBtn");
  const changeBtn = $("openChangePwdBtn");

  if(!currentProfile){
    summary.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    changeBtn.classList.add("hidden");
    summary.textContent = "";
    return;
  }
  summary.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  changeBtn.classList.add("hidden"); // password change can be added later

  if(currentProfile.role==="admin"){
    summary.innerHTML = `Logged in as <b>Admin</b>`;
  } else {
    summary.innerHTML = `Logged in as <b>Lecturer</b> · <b>${currentProfile.full_name || currentProfile.username || "User"}</b>`;
  }
}

async function loadSession(){
  const { data } = await sb.auth.getSession();
  const user = data?.session?.user;
  if(!user){
    currentProfile = null;
    updateTopBar();
    showSection("loginSection");
    return;
  }
  currentProfile = await ensureProfile(user);

  // Block unapproved lecturers
  if(currentProfile.role==="lecturer" && !currentProfile.approved){
    await sb.auth.signOut();
    currentProfile = null;
    updateTopBar();
    showSection("loginSection");
    setAlert($("loginMessage"), "Your account is pending admin approval.", "danger");
    return;
  }

  updateTopBar();

  if(currentProfile.role==="admin"){
    showSection("adminDashboard");
    // (Next we’ll wire admin pages: approve lecturers, sessions, reports)
  } else {
    showSection("lecturerDashboard");
    // (Next we’ll wire lecturer pages: create session, view sessions)
  }
}

/* ===========================
   Login (Email/Password)
=========================== */
$("loginBtn").addEventListener("click", async ()=>{
  const email = $("loginUsername").value.trim();  // treat as email
  const password = $("loginPassword").value;
  const rolePick = document.querySelector('input[name="loginRole"]:checked')?.value || "lecturer";
  const msgEl = $("loginMessage");

  if(!email || !password){
    setAlert(msgEl, "Enter email and password.", "danger");
    return;
  }

  try{
    clearAlert(msgEl);

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if(error) throw error;

    const prof = await ensureProfile(data.user);

    // If user tries to log in as admin but isn't admin
    if(rolePick==="admin" && prof.role !== "admin"){
      await sb.auth.signOut();
      setAlert(msgEl, "This account is not an Admin.", "danger");
      return;
    }

    // Block unapproved lecturers
    if(prof.role==="lecturer" && !prof.approved){
      await sb.auth.signOut();
      setAlert(msgEl, "Your account is pending admin approval.", "danger");
      return;
    }

    currentProfile = prof;
    updateTopBar();

    if(prof.role==="admin") showSection("adminDashboard");
    else showSection("lecturerDashboard");

  }catch(e){
    setAlert(msgEl, e.message || "Login failed.", "danger");
  }
});

/* ===========================
   Lecturer registration (creates Auth user + profile)
=========================== */
$("showLecturerRegistration").addEventListener("click", ()=>{
  showSection("lecturerRegistrationSection");
  clearAlert($("loginMessage"));
});
$("backToLogin").addEventListener("click", ()=>{
  showSection("loginSection");
  clearAlert($("lecturerRegMessage"));
});

$("submitLecturerRegistration").addEventListener("click", async ()=>{
  const salutation = $("regSalutation").value;
  const fullName = $("regFullName").value.trim();
  const pf = $("regPF").value.trim();
  const email = $("regUsername").value.trim(); // treat as email
  const password = $("regPassword").value;
  const msgEl = $("lecturerRegMessage");

  if(!fullName || !pf || !email || !password){
    setAlert(msgEl, "Fill all fields. Use email as username.", "danger");
    return;
  }

  try{
    clearAlert(msgEl);

    const { data, error } = await sb.auth.signUp({ email, password });
    if(error) throw error;

    // Create/update profile
    const user = data.user;
    if(!user) throw new Error("Signup succeeded but no user returned.");

    const { error: upErr } = await sb.from("profiles").upsert([{
      id: user.id,
      role: "lecturer",
      approved: false,
      salutation,
      full_name: fullName,
      pf,
      username: email
    }]);

    if(upErr) throw upErr;

    // Sign out so they can't proceed before approval
    await sb.auth.signOut();

    setAlert(msgEl, "Registration submitted. Wait for Admin approval.", "success");
    $("regFullName").value = "";
    $("regPF").value = "";
    $("regUsername").value = "";
    $("regPassword").value = "";

  }catch(e){
    setAlert(msgEl, e.message || "Registration failed.", "danger");
  }
});

/* ===========================
   Logout
=========================== */
$("logoutBtn").addEventListener("click", async ()=>{
  await sb.auth.signOut();
  currentProfile = null;
  updateTopBar();
  showSection("loginSection");
});

/* ===========================
   Startup
=========================== */
loadSession();
sb.auth.onAuthStateChange((_event,_session)=> loadSession());
