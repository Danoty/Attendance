/* ===========================
   STORAGE + BASE DATA
=========================== */
const STORAGE_KEY = "jooust_attendance_data_v6_merged";

/* Fallback center (only used if a legacy session lacks geoCenter) */
const JOOUST_CENTER = { lat: -0.0936, lon: 34.2809 };

/* ✅ 30m radius */
const GEOFENCE_RADIUS_KM = 0.03;

/* Session timeout (frontend-only) */
const SESSION_TIMEOUT_MIN = 20;
let lastActivityTs = Date.now();

function touchActivity(){ lastActivityTs = Date.now(); }
["click","keydown","mousemove","touchstart"].forEach(ev => window.addEventListener(ev, touchActivity, {passive:true}));
setInterval(()=>{
  if(!currentUser) return;
  const mins = (Date.now() - lastActivityTs) / 60000;
  if(mins >= SESSION_TIMEOUT_MIN){
    currentUser = null;
    updateTopBar();
    showSection("loginSection");
    alert("Session timed out for security. Please login again.");
  }
}, 15000);

function getDefaultAcademicYear(){
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth()+1;
  const start = (m >= 9) ? y : (y-1);
  return `${start}/${start+1}`;
}

function baseData(){
  return {
    version: 6,
    admins: [{ username:"admin", password:"admin123" }],
    lecturers: [],
    facultyConfig: [],
    classes: [],
    attendance: []
  };
}

function migrateData(d){
  d.admins = d.admins || [{ username:"admin", password:"admin123" }];
  d.lecturers = d.lecturers || [];
  d.facultyConfig = d.facultyConfig || [];
  d.classes = d.classes || [];
  d.attendance = d.attendance || [];

  const defAY = getDefaultAcademicYear();

  d.facultyConfig = d.facultyConfig.map(r=>({
    faculty: r.faculty || "",
    course: r.course || "",
    unit: r.unit || "",
    year: r.year || "",
    semester: r.semester || "",
    academicYear: r.academicYear || r.academic_year || defAY
  }));

  d.classes = d.classes.map(c=>({
    id: c.id || (Date.now().toString(36)+Math.random().toString(36).slice(2,8)),
    type: c.type || "class",
    meetingMode: c.meetingMode || (c.type==="meeting" ? "online" : "physical"),
    academicYear: c.academicYear || c.academic_year || (c.type==="meeting" ? "" : defAY),
    unitCode: c.unitCode || c.unit_code || "",
    lecturerId: c.lecturerId || "",
    faculty: c.faculty || "",
    course: c.course || "",
    unit: c.unit || (c.type==="meeting" ? "Staff Meeting" : ""),
    year: c.year || "",
    semester: c.semester || "",
    venue: c.venue || "",
    dateTime: c.dateTime || c.date_time || "",
    status: c.status || "open",
    lecturerName: c.lecturerName || c.lecturer_name || "",
    lecturerSignature: c.lecturerSignature || null,
    hodName: c.hodName || "",
    hodSignature: c.hodSignature || null,
    createdAt: c.createdAt || Date.now(),

    /* ✅ NEW: per-session geofence center + radius */
    geoCenter: c.geoCenter || null,
    geoRadiusKm: (typeof c.geoRadiusKm === "number") ? c.geoRadiusKm : GEOFENCE_RADIUS_KM
  }));

  d.attendance = d.attendance.map(a=>({
    id: a.id || (Date.now().toString(36)+Math.random().toString(36).slice(2,8)),
    classId: a.classId || a.class_id || "",
    surname: a.surname || "",
    middle: a.middle || "",
    first: a.first || "",
    admission: a.admission || "",
    staffNo: a.staffNo || "",
    signature: a.signature || "",
    createdAt: a.createdAt || Date.now(),
    geo: a.geo || null,
    deviceId: a.deviceId || ""
  }));

  d.version = 6;
  return d;
}

function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    const b = baseData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
    return b;
  }
  try{
    return migrateData(JSON.parse(raw));
  } catch(e){
    const b = baseData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
    return b;
  }
}
function saveData(d){ localStorage.setItem(STORAGE_KEY, JSON.stringify(migrateData(d))); }
let DATA = loadData();

let currentUser = null;
let jooustLogoDataUrl = null;

function $(id){ return document.getElementById(id); }
function showSection(id){
  ["loginSection","lecturerRegistrationSection","adminDashboard","lecturerDashboard","studentSection"].forEach(sid=>{
    const el = $(sid); if(!el) return;
    el.classList.toggle("hidden", sid !== id);
  });
}

function uuid(){ return Date.now().toString(36) + "-" + Math.random().toString(36).substring(2,10); }
function setAlert(el, msg, type="info"){
  el.textContent = msg;
  el.classList.remove("hidden","alert-info","alert-danger","alert-success");
  if(type==="danger") el.classList.add("alert-danger");
  else if(type==="success") el.classList.add("alert-success");
  else el.classList.add("alert-info");
}
function clearAlert(el){ el.classList.add("hidden"); }

function formatDateTime(dt){
  if(!dt) return "";
  const d = new Date(dt);
  if(isNaN(d)) return dt;
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}
function getQueryParam(name){
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}
function unique(arr){ return [...new Set(arr)].filter(x=>x!=null && x!=="").sort((a,b)=>a.localeCompare(b)); }

function setOptions(selectEl, values, placeholder="All / Select"){
  if(!selectEl) return;
  const cur = selectEl.value;
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);

  values.forEach(v=>{
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    selectEl.appendChild(o);
  });
  if(cur && values.includes(cur)) selectEl.value = cur;
}

function loadLogoAsDataUrl(){
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = "logo.jpg";
  img.onload = ()=>{
    try{
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img,0,0);
      jooustLogoDataUrl = canvas.toDataURL("image/jpeg");
    }catch(e){ jooustLogoDataUrl = null; }
  };
}
loadLogoAsDataUrl();

/* ===========================
   ✅ Signature pads (ALL DEVICES FIX)
=========================== */
function setupSignaturePad(canvas, opts = {}) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const state = {
    drawing: false,
    strokes: [],
    currentStroke: [],
  };

  const lineWidth = opts.lineWidth ?? 2.4;
  const strokeStyle = opts.strokeStyle ?? "#0f172a";

  canvas.style.touchAction = "none";

  function getCanvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left), y: (e.clientY - rect.top) };
  }

  function redraw() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeStyle;

    for (const stroke of state.strokes) {
      if (!stroke.length) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
    }
  }

  function resizeCanvasPreserve() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    redraw();
  }

  function beginDraw(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);

    state.drawing = true;
    state.currentStroke = [];

    const p = getCanvasPoint(e);
    state.currentStroke.push(p);
    state.strokes.push(state.currentStroke);
    redraw();
  }

  function moveDraw(e) {
    if (!state.drawing) return;
    e.preventDefault();
    const p = getCanvasPoint(e);
    state.currentStroke.push(p);
    redraw();
  }

  function endDraw(e) {
    if (!state.drawing) return;
    e.preventDefault();
    state.drawing = false;
    redraw();
  }

  canvas.addEventListener("pointerdown", beginDraw);
  canvas.addEventListener("pointermove", moveDraw);
  canvas.addEventListener("pointerup", endDraw);
  canvas.addEventListener("pointercancel", endDraw);
  canvas.addEventListener("pointerleave", endDraw);

  window.addEventListener("resize", resizeCanvasPreserve);
  window.addEventListener("orientationchange", () => setTimeout(resizeCanvasPreserve, 200));
  setTimeout(resizeCanvasPreserve, 0);

  function isBlank() {
    return state.strokes.length === 0 || state.strokes.every(s => s.length === 0);
  }

  function clear() {
    state.strokes = [];
    state.currentStroke = [];
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
  }

  /* ✅ (small improvement) JPEG is smaller than PNG, helps localStorage */
  function toDataUrl() {
    return canvas.toDataURL("image/jpeg", 0.65);
  }

  return { clear, toDataUrl, isBlank, _resize: resizeCanvasPreserve };
}

const stSig = setupSignaturePad($("stSignaturePad"));
$("stClearSignature").addEventListener("click", ()=> stSig.clear());

/* ===========================
   Top bar + logout + change pwd
=========================== */
function updateTopBar(){
  const summary = $("userSummary");
  const logoutBtn = $("logoutBtn");
  const changeBtn = $("openChangePwdBtn");

  if(!currentUser){
    summary.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    changeBtn.classList.add("hidden");
    summary.textContent = "";
    return;
  }
  summary.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  changeBtn.classList.remove("hidden");

  if(currentUser.role==="admin"){
    summary.innerHTML = `Logged in as <b>Admin</b>`;
  } else {
    const lec = DATA.lecturers.find(l=>l.id===currentUser.id);
    const name = lec ? `${lec.salutation} ${lec.fullName}` : currentUser.username;
    summary.innerHTML = `Logged in as <b>Lecturer</b> · <b>${name}</b>`;
  }
}
$("logoutBtn").addEventListener("click", ()=>{
  currentUser = null;
  updateTopBar();
  showSection("loginSection");
  $("loginUsername").value = "";
  $("loginPassword").value = "";
  clearAlert($("loginMessage"));
});

$("openChangePwdBtn").addEventListener("click", ()=>{
  clearAlert($("pwdMsg"));
  $("pwdOld").value = "";
  $("pwdNew").value = "";
  $("pwdNew2").value = "";
  $("pwdModal").classList.remove("hidden");
});
$("pwdCloseBtn").addEventListener("click", ()=> $("pwdModal").classList.add("hidden"));

$("pwdSaveBtn").addEventListener("click", ()=>{
  const oldP = $("pwdOld").value;
  const newP = $("pwdNew").value;
  const newP2 = $("pwdNew2").value;
  const msgEl = $("pwdMsg");

  if(!currentUser){ setAlert(msgEl,"Not logged in.","danger"); return; }
  if(!oldP || !newP || !newP2){ setAlert(msgEl,"Fill all fields.","danger"); return; }
  if(newP.length < 4){ setAlert(msgEl,"New password too short (min 4).","danger"); return; }
  if(newP !== newP2){ setAlert(msgEl,"New passwords do not match.","danger"); return; }

  DATA = loadData();

  if(currentUser.role==="admin"){
    const adm = DATA.admins.find(a=>a.username===currentUser.username);
    if(!adm || adm.password !== oldP){ setAlert(msgEl,"Current password is wrong.","danger"); return; }
    adm.password = newP;
    saveData(DATA);
    setAlert(msgEl,"Password updated successfully.","success");
  } else {
    const lec = DATA.lecturers.find(l=>l.id===currentUser.id);
    if(!lec || lec.password !== oldP){ setAlert(msgEl,"Current password is wrong.","danger"); return; }
    lec.password = newP;
    saveData(DATA);
    setAlert(msgEl,"Password updated successfully.","success");
  }
});

/* ===========================
   Admin tab switching
=========================== */
document.querySelectorAll("[data-admin-tab]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll("[data-admin-tab]").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.getAttribute("data-admin-tab");
    document.querySelectorAll(".admin-tab").forEach(sec=>{
      sec.classList.toggle("hidden", sec.id !== tab);
    });
  });
});

/* ===========================
   Lecturer Registration + Login
=========================== */
$("showLecturerRegistration").addEventListener("click", ()=>{
  showSection("lecturerRegistrationSection");
  clearAlert($("loginMessage"));
});
$("backToLogin").addEventListener("click", ()=>{
  showSection("loginSection");
  clearAlert($("lecturerRegMessage"));
});

$("submitLecturerRegistration").addEventListener("click", ()=>{
  const salutation = $("regSalutation").value;
  const fullName = $("regFullName").value.trim();
  const pf = $("regPF").value.trim();
  const username = $("regUsername").value.trim();
  const password = $("regPassword").value;
  const msgEl = $("lecturerRegMessage");

  if(!fullName || !pf || !username || !password){
    setAlert(msgEl,"Please fill all required fields.","danger");
    return;
  }

  DATA = loadData();
  if(DATA.lecturers.some(l=>l.username===username) || DATA.admins.some(a=>a.username===username)){
    setAlert(msgEl,"Username already exists.","danger");
    return;
  }

  const lecturer = { id: uuid(), salutation, fullName, pf, username, password, approved:false };
  DATA.lecturers.push(lecturer);
  saveData(DATA);

  setAlert(msgEl,"Registration submitted. Wait for Admin approval.","success");
  $("regFullName").value = $("regPF").value = $("regUsername").value = $("regPassword").value = "";
});

$("loginBtn").addEventListener("click", ()=>{
  const username = $("loginUsername").value.trim();
  const password = $("loginPassword").value;
  const role = document.querySelector('input[name="loginRole"]:checked').value;
  const msgEl = $("loginMessage");

  if(!username || !password){
    setAlert(msgEl,"Please enter username and password.","danger");
    return;
  }

  DATA = loadData();

  if(role==="admin"){
    const found = DATA.admins.find(a=>a.username===username && a.password===password);
    if(!found){ setAlert(msgEl,"Invalid admin credentials.","danger"); return; }
    currentUser = { role:"admin", username };
    clearAlert(msgEl);
    updateTopBar();
    showSection("adminDashboard");
    renderAdminLecturers();
    renderFacultySummary();
    refreshAllDropdowns();
    renderAdminClasses();
    refreshClassPickers();
  } else {
    const lec = DATA.lecturers.find(l=>l.username===username && l.password===password);
    if(!lec){ setAlert(msgEl,"Lecturer not found or wrong password.","danger"); return; }
    if(!lec.approved){ setAlert(msgEl,"Your account is pending approval by Admin.","danger"); return; }

    currentUser = { role:"lecturer", id: lec.id, username: lec.username };
    clearAlert(msgEl);
    updateTopBar();
    showSection("lecturerDashboard");
    refreshAllDropdowns();
    renderLecturerClasses();
    refreshClassPickers();
    updateCreateSessionUI();
  }
});

/* ===========================
   ADMIN: Lecturers approve + reset password
=========================== */
function renderAdminLecturers(){
  const wrapper = $("lecturersTableWrapper");
  DATA = loadData();

  if(!DATA.lecturers.length){
    wrapper.textContent = "No lecturers registered yet.";
    return;
  }

  let html = `<table><thead><tr>
    <th>Lecturer</th><th>PF/ID</th><th>Username</th><th>Status</th><th>Actions</th>
  </tr></thead><tbody>`;

  DATA.lecturers.forEach(lec=>{
    const status = lec.approved ? `<span class="chip green">Approved</span>` : `<span class="chip red">Pending</span>`;
    html += `<tr>
      <td><b>${lec.salutation} ${lec.fullName}</b></td>
      <td>${lec.pf}</td>
      <td>${lec.username}</td>
      <td>${status}</td>
      <td style="display:flex;gap:.4rem;flex-wrap:wrap;">
        <button class="btn ${lec.approved ? "btn-secondary":"btn-success"}" data-action="toggle" data-id="${lec.id}">
          ${lec.approved ? "Revoke":"Approve"}
        </button>
        <button class="btn btn-danger" data-action="resetpwd" data-id="${lec.id}">
          Reset Password
        </button>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  wrapper.innerHTML = html;

  wrapper.querySelectorAll("button[data-action]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      DATA = loadData();
      const lec = DATA.lecturers.find(l=>l.id===id);
      if(!lec) return;

      if(action==="toggle"){
        lec.approved = !lec.approved;
        saveData(DATA);
        renderAdminLecturers();
      }
      if(action==="resetpwd"){
        const np = prompt("Enter new password for lecturer:", "1234");
        if(!np) return;
        lec.password = np;
        saveData(DATA);
        alert("Lecturer password reset successfully.");
      }
    });
  });
}

/* ===========================
   FACULTY CSV upload + summary
=========================== */
$("uploadFacultyCsvBtn").addEventListener("click", ()=>{
  const file = $("facultyCsvInput").files[0];
  const msgEl = $("facultyUploadMsg");
  if(!file){ setAlert(msgEl,"Select a CSV file first.","danger"); return; }

  const reader = new FileReader();
  reader.onload = (e)=>{
    const text = e.target.result || "";
    const lines = text.split(/\r?\n/).filter(l=>l.trim());
    const records = [];
    const defAY = getDefaultAcademicYear();

    for(let i=0;i<lines.length;i++){
      const line = lines[i].trim();
      if(i===0 && line.toLowerCase().includes("faculty") && line.toLowerCase().includes("course") && line.toLowerCase().includes("unit")) continue;

      const parts = line.split(",").map(p=>p.trim());
      if(parts.length < 5) continue;

      const faculty = parts[0] || "";
      const course  = parts[1] || "";
      const unit    = parts[2] || "";
      const year    = parts[3] || "";
      const semester= parts[4] || "";
      const academicYear = (parts[5] && parts[5].trim()) ? parts[5].trim() : defAY;

      if(!faculty || !course || !unit || !year || !semester) continue;
      records.push({ faculty, course, unit, year, semester, academicYear });
    }

    DATA = loadData();
    DATA.facultyConfig = records;
    saveData(DATA);

    setAlert(msgEl, `Uploaded ${records.length} entries successfully.`, "success");
    renderFacultySummary();
    refreshAllDropdowns();
  };
  reader.readAsText(file);
});

$("clearFacultyDataBtn").addEventListener("click", ()=>{
  const msgEl = $("facultyUploadMsg");
  if(!confirm("Clear all existing faculty/course/unit mappings?")) return;
  DATA = loadData();
  DATA.facultyConfig = [];
  saveData(DATA);
  setAlert(msgEl,"All mappings cleared.","success");
  renderFacultySummary();
  refreshAllDropdowns();
});

function renderFacultySummary(){
  const wrap = $("facultySummary");
  DATA = loadData();
  if(!DATA.facultyConfig.length){
    wrap.textContent = "No mappings uploaded yet.";
    return;
  }
  const total = DATA.facultyConfig.length;
  const faculties = unique(DATA.facultyConfig.map(r=>r.faculty));
  const acYears = unique(DATA.facultyConfig.map(r=>r.academicYear || ""));
  wrap.innerHTML = `<p class="muted" style="margin:.2rem 0 0;">
    Total entries: <b>${total}</b><br/>
    Academic Years: <b>${acYears.join(", ") || "N/A"}</b><br/>
    Faculties: ${faculties.join(", ")}
  </p>`;
}

function getMapping(){ DATA = loadData(); return DATA.facultyConfig || []; }

function refreshAllDropdowns(){
  const m = getMapping();

  // Admin report filters
  setOptions($("repAcademicYear"), unique(m.map(x=>x.academicYear)), "All Academic Years");
  setOptions($("repFaculty"), unique(m.map(x=>x.faculty)), "All Faculties");
  setOptions($("repCourse"), unique(m.map(x=>x.course)), "All Courses");
  setOptions($("repUnit"), unique(m.map(x=>x.unit)), "All Units");
  setOptions($("repYear"), unique(m.map(x=>x.year)), "All Study Years");
  setOptions($("repSemester"), unique(m.map(x=>x.semester)), "All Semesters");

  // Lecturer create session
  const ayList = unique(m.map(x=>x.academicYear));
  setOptions($("lcAcademicYear"), ayList.length ? ayList : [getDefaultAcademicYear()], "Select Academic Year");
  setOptions($("lcFaculty"), unique(m.map(x=>x.faculty)), "Select Faculty");
  setOptions($("lcCourse"), unique(m.map(x=>x.course)), "Select Course");
  setOptions($("lcUnit"), unique(m.map(x=>x.unit)), "Select Unit");
  setOptions($("lcYear"), unique(m.map(x=>x.year)), "Select Study Year");
  setOptions($("lcSemester"), unique(m.map(x=>x.semester)), "Select Semester");

  // Lecturer report filters
  setOptions($("repAcademicYearL"), unique(m.map(x=>x.academicYear)), "All Academic Years");
  setOptions($("repFacultyL"), unique(m.map(x=>x.faculty)), "All Faculties");
  setOptions($("repCourseL"), unique(m.map(x=>x.course)), "All Courses");
  setOptions($("repUnitL"), unique(m.map(x=>x.unit)), "All Units");
  setOptions($("repYearL"), unique(m.map(x=>x.year)), "All Study Years");
  setOptions($("repSemesterL"), unique(m.map(x=>x.semester)), "All Semesters");

  hookupCascadingCreateClass();
  updateCreateSessionUI();
}

function hookupCascadingCreateClass(){
  const m = getMapping();
  const ay = $("lcAcademicYear"), f = $("lcFaculty"), c = $("lcCourse"), u = $("lcUnit"), y = $("lcYear"), s = $("lcSemester");
  if(!ay || !f || !c || !u || !y || !s) return;

  function apply(){
    const ayv = ay.value, fv = f.value, cv = c.value, uv = u.value, yv = y.value, sv = s.value;

    const m0 = ayv ? m.filter(r=>r.academicYear===ayv) : m;
    setOptions(f, unique(m0.map(r=>r.faculty)), "Select Faculty");

    const m1 = (ay.value && f.value) ? m.filter(r=>r.academicYear===ay.value && r.faculty===f.value) : (f.value ? m0.filter(r=>r.faculty===f.value) : m0);
    setOptions(c, unique(m1.map(r=>r.course)), "Select Course");

    const m2 = (ay.value && f.value && c.value)
      ? m.filter(r=>r.academicYear===ay.value && r.faculty===f.value && r.course===c.value)
      : (c.value ? m1.filter(r=>r.course===c.value) : m1);
    setOptions(u, unique(m2.map(r=>r.unit)), "Select Unit");

    const m3 = (ay.value && f.value && c.value && u.value)
      ? m.filter(r=>r.academicYear===ay.value && r.faculty===f.value && r.course===c.value && r.unit===u.value)
      : (u.value ? m2.filter(r=>r.unit===u.value) : m2);
    setOptions(y, unique(m3.map(r=>r.year)), "Select Study Year");

    const m4 = (ay.value && f.value && c.value && u.value && y.value)
      ? m.filter(r=>r.academicYear===ay.value && r.faculty===f.value && r.course===c.value && r.unit===u.value && r.year===y.value)
      : (y.value ? m3.filter(r=>r.year===y.value) : m3);
    setOptions(s, unique(m4.map(r=>r.semester)), "Select Semester");

    if(ayv && [...ay.options].some(o=>o.value===ayv)) ay.value = ayv;
    if(fv && [...f.options].some(o=>o.value===fv)) f.value = fv;
    if(cv && [...c.options].some(o=>o.value===cv)) c.value = cv;
    if(uv && [...u.options].some(o=>o.value===uv)) u.value = uv;
    if(yv && [...y.options].some(o=>o.value===yv)) y.value = yv;
    if(sv && [...s.options].some(o=>o.value===sv)) s.value = sv;
  }

  ay.onchange = apply;
  f.onchange = apply;
  c.onchange = apply;
  u.onchange = apply;
  y.onchange = apply;
  apply();
}

/* ===========================
   Session type UI (includes geo picker)
=========================== */
function updateCreateSessionUI(){
  const type = $("lcType")?.value || "class";
  const meetingWrap = $("meetingModeWrap");
  if(meetingWrap) meetingWrap.classList.toggle("hidden", type !== "meeting");

  // ✅ Show geo picker only if session is PHYSICAL
  const geoWrap = $("geoPickWrap");
  const mode = (type==="meeting") ? ($("lcMeetingMode")?.value || "online") : "physical";
  const isPhysical = (type==="class") || (type==="meeting" && mode==="physical");
  if(geoWrap) geoWrap.classList.toggle("hidden", !isPhysical);
}
$("lcType").addEventListener("change", updateCreateSessionUI);
$("lcMeetingMode")?.addEventListener("change", updateCreateSessionUI);

/* ===========================
   GEO helpers + session geo picker
=========================== */
function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371;
  const toRad = (d)=> d * Math.PI/180;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function getGeo(){
  return new Promise((resolve, reject)=>{
    if(!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos)=> resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy }),
      (err)=> reject(err),
      { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
    );
  });
}

function setSessionGeoInputs(g){
  $("lcGeoLat").value = g ? g.lat.toFixed(6) : "";
  $("lcGeoLon").value = g ? g.lon.toFixed(6) : "";
  $("lcGeoAcc").value = g ? Math.round(g.acc) : "";
}
function getSessionGeoFromInputs(){
  const lat = parseFloat(($("lcGeoLat").value || "").trim());
  const lon = parseFloat(($("lcGeoLon").value || "").trim());
  const acc = parseFloat(($("lcGeoAcc").value || "").trim());
  if(!isFinite(lat) || !isFinite(lon)) return null;
  return { lat, lon, acc: isFinite(acc) ? acc : null };
}

$("pickSessionGeoBtn")?.addEventListener("click", async ()=>{
  const msgEl = $("geoPickMsg");
  try{
    const g = await getGeo();
    setSessionGeoInputs(g);
    setAlert(msgEl, `Geofence center set.\nLat: ${g.lat.toFixed(6)}\nLon: ${g.lon.toFixed(6)}\nAccuracy: ${Math.round(g.acc)} m`, "success");
  }catch(e){
    setAlert(msgEl, "Failed to get location. Please enable GPS/location permission and try again.", "danger");
  }
});
$("clearSessionGeoBtn")?.addEventListener("click", ()=>{
  setSessionGeoInputs(null);
  const msgEl = $("geoPickMsg");
  if(msgEl) msgEl.classList.add("hidden");
});

/* ===========================
   ✅ Student/Staff Attendance % + Chart
=========================== */
function parseDateInput(v){
  if(!v) return null;
  const d = new Date(v + "T00:00:00");
  return isNaN(d) ? null : d.getTime();
}
function classInDateRange(cls, fromTs, toTs){
  if(!fromTs && !toTs) return true;
  const t = new Date(cls.dateTime || "").getTime();
  if(isNaN(t)) return false;
  if(fromTs && t < fromTs) return false;
  if(toTs){
    const end = toTs + (24*60*60*1000) - 1;
    if(t > end) return false;
  }
  return true;
}
function getAttendanceKeyByClass(cls){
  return (cls.type === "meeting") ? "staffNo" : "admission";
}
function computePersonStats({ personId, classesScope, fromTs, toTs }){
  const d = loadData();
  const pid = (personId || "").trim();
  if(!pid) return null;

  const scoped = (classesScope || []).filter(c=> classInDateRange(c, fromTs, toTs));
  const total = scoped.length;

  const att = d.attendance || [];
  let attended = 0;

  const timeline = scoped
    .slice()
    .sort((a,b)=> new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .map(cls=>{
      const key = getAttendanceKeyByClass(cls);
      const present = att.some(a => a.classId === cls.id && String(a[key]||"").trim() === pid);
      if(present) attended++;
      return { date: formatDateTime(cls.dateTime), present };
    });

  const missed = Math.max(0, total - attended);
  const pct = total > 0 ? Math.round((attended / total) * 1000) / 10 : 0;

  return { total, attended, missed, pct, timeline };
}
function showPersonStats(boxId, stats, personId){
  const box = $(boxId);
  if(!box) return;
  const pid = (personId || "").trim();

  if(!pid){
    box.classList.add("hidden");
    return;
  }
  if(!stats){
    setAlert(box, "Enter a Student/Staff ID to compute attendance %.", "info");
    return;
  }
  if(stats.total === 0){
    setAlert(box, `No sessions match your filters for ID: ${pid}`, "danger");
    return;
  }
  setAlert(
    box,
    `ID: ${pid}\nSessions in scope: ${stats.total}\nAttended: ${stats.attended}\nMissed: ${stats.missed}\nAttendance %: ${stats.pct}%`,
    "success"
  );
}
function chartRef(){
  let ref = null;
  return { get: ()=>ref, set: (v)=>{ ref=v; } };
}
const chartA = chartRef();
const chartL = chartRef();

function renderPersonChart(canvasId, stats, chartRefSetter){
  const canvas = $(canvasId);
  if(!canvas) return;

  const old = chartRefSetter.get();
  if(old){ old.destroy(); chartRefSetter.set(null); }

  if(!stats || !stats.timeline.length || !window.Chart) return;

  const labels = stats.timeline.map(x=>x.date);
  const presentData = stats.timeline.map(x=> x.present ? 1 : 0);
  const missedData  = stats.timeline.map(x=> x.present ? 0 : 1);

  const ch = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Present", data: presentData, stack: "s" },
        { label: "Absent", data: missedData, stack: "s" }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      },
      plugins: { legend: { display: true } }
    }
  });

  chartRefSetter.set(ch);
}

$("clearPersonChartBtn")?.addEventListener("click", ()=>{
  const old = chartA.get();
  if(old){ old.destroy(); chartA.set(null); }
  $("personStatsBox")?.classList.add("hidden");
  $("repPersonId").value = "";
  $("repDateFrom").value = "";
  $("repDateTo").value = "";
});

$("clearPersonChartBtnL")?.addEventListener("click", ()=>{
  const old = chartL.get();
  if(old){ old.destroy(); chartL.set(null); }
  $("personStatsBoxL")?.classList.add("hidden");
  $("repPersonIdL").value = "";
  $("repDateFromL").value = "";
  $("repDateToL").value = "";
});

/* ===========================
   Filters + pickers
=========================== */
function classFilterMatch(cls, filterValue){
  const v = (filterValue||"").toLowerCase();
  if(!v) return true;
  return (
    (cls.unit||"").toLowerCase().includes(v) ||
    (cls.unitCode||"").toLowerCase().includes(v) ||
    (cls.course||"").toLowerCase().includes(v) ||
    (cls.faculty||"").toLowerCase().includes(v) ||
    (cls.academicYear||"").toLowerCase().includes(v) ||
    (cls.status||"").toLowerCase().includes(v) ||
    (cls.lecturerName||"").toLowerCase().includes(v) ||
    (cls.type||"").toLowerCase().includes(v) ||
    (cls.meetingMode||"").toLowerCase().includes(v)
  );
}

function setClassFilterOptions(selectId, classes, includeStatusHint){
  const sel = $(selectId);
  if(!sel) return;
  const old = sel.value;

  const items = [];
  unique(classes.map(c=>c.type)).forEach(t=> items.push({label:`TYPE: ${t.toUpperCase()}`, value:t}));
  unique(classes.map(c=>c.academicYear).filter(Boolean)).forEach(a=> items.push({label:`AY: ${a}`, value:a}));
  unique(classes.map(c=>c.unitCode).filter(Boolean)).forEach(c=> items.push({label:`CODE: ${c}`, value:c}));
  unique(classes.map(c=>c.unit).filter(Boolean)).forEach(u=> items.push({label:`UNIT: ${u}`, value:u}));
  unique(classes.map(c=>c.course).filter(Boolean)).forEach(x=> items.push({label:`COURSE: ${x}`, value:x}));
  if(includeStatusHint) unique(classes.map(c=>c.status)).forEach(s=> items.push({label:`STATUS: ${s.toUpperCase()}`, value:s}));

  sel.innerHTML = "";
  const o0 = document.createElement("option");
  o0.value = "";
  o0.textContent = "All Sessions";
  sel.appendChild(o0);

  items.forEach(it=>{
    const o = document.createElement("option");
    o.value = it.value;
    o.textContent = it.label;
    sel.appendChild(o);
  });

  if(old && [...sel.options].some(x=>x.value===old)) sel.value = old;

  sel.onchange = ()=>{
    if(selectId==="lecClassFilter") renderLecturerClasses();
    if(selectId==="adminClassFilter") renderAdminClasses();
  };
}

function refreshClassPickers(){
  DATA = loadData();
  const classes = DATA.classes.slice().sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));

  setClassFilterOptions("lecClassFilter", currentUser?.role==="lecturer" ? classes.filter(c=>c.lecturerId===currentUser.id) : [], true);
  setClassFilterOptions("adminClassFilter", classes, true);

  const rawPick = $("rawClassPick");
  if(rawPick){
    rawPick.innerHTML = "";
    const o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = "Select Session";
    rawPick.appendChild(o0);

    classes.forEach(cls=>{
      const o = document.createElement("option");
      o.value = cls.id;
      o.textContent = `${(cls.type==="meeting" ? "MEETING" : "CLASS")} · ${cls.academicYear||""} · ${cls.unitCode||""} · ${cls.unit||""} · ${formatDateTime(cls.dateTime)} · ${cls.status.toUpperCase()}`;
      rawPick.appendChild(o);
    });
  }
}

/* ===========================
   CLASSES/MEETINGS: Lecturer create
=========================== */
$("createClassBtn").addEventListener("click", ()=>{
  const type = $("lcType").value;
  const meetingMode = $("lcMeetingMode").value;

  const academicYear = $("lcAcademicYear").value.trim();
  const f = $("lcFaculty").value.trim();
  const c = $("lcCourse").value.trim();
  const u = $("lcUnit").value.trim();
  const unitCode = $("lcUnitCode").value.trim();
  const y = $("lcYear").value.trim();
  const s = $("lcSemester").value.trim();

  const v = $("lcVenue").value.trim();
  const dt = $("lcDateTime").value;
  const msgEl = $("createClassMsg");

  if(!currentUser || currentUser.role!=="lecturer"){
    setAlert(msgEl,"You must be logged in as lecturer to create sessions.","danger");
    return;
  }
  if(!v || !dt){
    setAlert(msgEl,"Please fill Venue/Platform and Date & Time.","danger");
    return;
  }

  if(type==="class"){
    if(!academicYear){ setAlert(msgEl,"Please select Academic Year.","danger"); return; }
    if(!f || !c || !u || !y || !s){
      setAlert(msgEl,"Please select Faculty/Course/Unit/Study Year/Semester for classes.","danger");
      return;
    }
    if(!unitCode){
      setAlert(msgEl,"Unit Code is required for classes.","danger");
      return;
    }
  }

  const isPhysical = (type==="class") || (type==="meeting" && meetingMode==="physical");
  const geoCenter = isPhysical ? getSessionGeoFromInputs() : null;
  if(isPhysical && !geoCenter){
    setAlert(msgEl,"Physical sessions require a geofence center. Click 'Use My Current Location'.","danger");
    return;
  }

  DATA = loadData();
  const lec = DATA.lecturers.find(l=>l.id===currentUser.id);
  if(!lec){ setAlert(msgEl,"Lecturer not found.","danger"); return; }

  const classId = uuid();
  const cls = {
    id: classId,
    type,
    meetingMode: type==="meeting" ? meetingMode : "physical",
    academicYear: type==="meeting" ? (academicYear || "") : academicYear,
    unitCode: unitCode || "",
    lecturerId: lec.id,
    faculty: f || "",
    course: c || "",
    unit: type==="meeting" ? "Staff Meeting" : (u || ""),
    year: y || "",
    semester: s || "",
    venue: v,
    dateTime: dt,
    status: "open",
    lecturerName: lec.salutation + " " + lec.fullName,
    lecturerSignature: null,
    hodName: "",
    hodSignature: null,
    createdAt: Date.now(),

    /* ✅ NEW */
    geoCenter: geoCenter,
    geoRadiusKm: GEOFENCE_RADIUS_KM
  };

  DATA.classes.push(cls);
  saveData(DATA);

  renderLecturerClasses();
  refreshClassPickers();

  const link = window.location.origin + window.location.pathname + "?mode=student&classId=" + encodeURIComponent(classId);
  setAlert(msgEl, "Session created. Share this sign-in link:\n" + link, "success");
});

/* ===========================
   Lecturer sessions table
=========================== */
function renderLecturerClasses(){
  const wrapper = $("lecturerClassesTableWrapper");
  DATA = loadData();
  const lecId = currentUser?.id;
  const filter = $("lecClassFilter")?.value || "";

  const list = DATA.classes
    .filter(c=>c.lecturerId===lecId)
    .filter(c=>classFilterMatch(c, filter))
    .sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));

  if(!list.length){
    wrapper.textContent = "No sessions yet.";
    return;
  }

  let html = `<table><thead><tr>
    <th>Type</th><th>Academic Year</th><th>Unit Code</th><th>Unit/Meeting</th><th>Venue</th><th>Date/Time</th><th>Status</th><th>Actions</th>
  </tr></thead><tbody>`;

  list.forEach(cls=>{
    const badge = `<span class="badge ${cls.status}">${cls.status.toUpperCase()}</span>`;
    html += `<tr>
      <td>${cls.type==="meeting" ? `MEETING <span class="chip ${cls.meetingMode==="online"?"green":"red"}">${cls.meetingMode.toUpperCase()}</span>` : "CLASS"}</td>
      <td>${cls.academicYear || ""}</td>
      <td>${cls.unitCode || ""}</td>
      <td><b>${cls.unit || ""}</b><div class="small">${cls.course || ""} ${cls.faculty ? "· "+cls.faculty : ""}</div></td>
      <td>${cls.venue || ""}</td>
      <td>${formatDateTime(cls.dateTime)}</td>
      <td>${badge}</td>
      <td style="display:flex;gap:.4rem;flex-wrap:wrap;">
        <button class="btn btn-primary" data-act="view" data-id="${cls.id}">View</button>
        <button class="btn btn-secondary" data-act="toggle" data-id="${cls.id}">${cls.status==="open"?"Close":"Open"}</button>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  wrapper.innerHTML = html;

  wrapper.querySelectorAll("button[data-act]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-id");
      const act = btn.getAttribute("data-act");
      if(act==="view") openSessionModal(id);
      if(act==="toggle") toggleSessionStatus(id);
    });
  });
}

/* ===========================
   Admin sessions table
=========================== */
function renderAdminClasses(){
  const wrapper = $("adminClassesTableWrapper");
  DATA = loadData();
  const filter = $("adminClassFilter")?.value || "";

  const list = DATA.classes
    .filter(c=>classFilterMatch(c, filter))
    .sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));

  if(!list.length){
    wrapper.textContent = "No sessions created yet.";
    return;
  }

  let html = `<table><thead><tr>
    <th>Type</th><th>Academic Year</th><th>Unit Code</th><th>Unit/Meeting</th><th>Lecturer</th><th>Venue</th><th>Date/Time</th><th>Status</th><th>Actions</th>
  </tr></thead><tbody>`;

  list.forEach(cls=>{
    const badge = `<span class="badge ${cls.status}">${cls.status.toUpperCase()}</span>`;
    html += `<tr>
      <td>${cls.type==="meeting" ? `MEETING <span class="chip ${cls.meetingMode==="online"?"green":"red"}">${cls.meetingMode.toUpperCase()}</span>` : "CLASS"}</td>
      <td>${cls.academicYear || ""}</td>
      <td>${cls.unitCode || ""}</td>
      <td><b>${cls.unit || ""}</b><div class="small">${cls.course || ""} ${cls.faculty ? "· "+cls.faculty : ""}</div></td>
      <td>${cls.lecturerName || ""}</td>
      <td>${cls.venue || ""}</td>
      <td>${formatDateTime(cls.dateTime)}</td>
      <td>${badge}</td>
      <td style="display:flex;gap:.4rem;flex-wrap:wrap;">
        <button class="btn btn-primary" data-act="view" data-id="${cls.id}">View</button>
        <button class="btn btn-secondary" data-act="toggle" data-id="${cls.id}">${cls.status==="open"?"Close":"Open"}</button>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  wrapper.innerHTML = html;

  wrapper.querySelectorAll("button[data-act]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-id");
      const act = btn.getAttribute("data-act");
      if(act==="view") openSessionModal(id);
      if(act==="toggle") toggleSessionStatus(id);
    });
  });
}

function toggleSessionStatus(classId){
  DATA = loadData();
  const cls = DATA.classes.find(c=>c.id===classId);
  if(!cls) return;
  cls.status = (cls.status==="open") ? "closed" : "open";
  saveData(DATA);
  renderLecturerClasses();
  renderAdminClasses();
  refreshClassPickers();

  if($("sessionModal") && !$("sessionModal").classList.contains("hidden")) openSessionModal(classId, true);
}

/* ===========================
   Session modal (QR + attendance + export + signatures)
=========================== */
let currentModalClassId = null;
let sigPad = setupSignaturePad($("sigPad"));

$("sessionModalCloseBtn").addEventListener("click", ()=>{
  $("sessionModal").classList.add("hidden");
  $("qrTarget").innerHTML = "";
  currentModalClassId = null;
});
$("sessionModalPrintBtn").addEventListener("click", ()=> window.print());

$("copyLinkBtn").addEventListener("click", async ()=>{
  const link = $("sessionLinkText").textContent.trim();
  try{
    await navigator.clipboard.writeText(link);
    alert("Link copied.");
  }catch(e){
    alert("Copy failed. Please manually copy the link.");
  }
});
$("openLinkBtn").addEventListener("click", ()=>{
  const link = $("sessionLinkText").textContent.trim();
  window.open(link, "_blank");
});

$("toggleStatusBtn").addEventListener("click", ()=>{
  if(!currentModalClassId) return;
  toggleSessionStatus(currentModalClassId);
});

$("exportSessionPdfBtn").addEventListener("click", async ()=>{
  if(!currentModalClassId) return;
  const { cls, rows } = getClassAndRows(currentModalClassId);
  await exportClassAttendancePdf(cls, rows);
});
$("exportSessionWordBtn").addEventListener("click", async ()=>{
  if(!currentModalClassId) return;
  const { cls, rows } = getClassAndRows(currentModalClassId);
  await exportClassAttendanceWord(cls, rows);
});
$("exportSessionExcelBtn").addEventListener("click", async ()=>{
  if(!currentModalClassId) return;
  const { cls, rows } = getClassAndRows(currentModalClassId);
  await exportClassAttendanceExcel(cls, rows);
});
$("exportSessionCsvBtn").addEventListener("click", ()=>{
  if(!currentModalClassId) return;
  const { cls, rows } = getClassAndRows(currentModalClassId);
  exportRawAttendanceCsv(cls, rowsToRawRows(rows));
});

$("lecturerSignBtn").addEventListener("click", ()=>{ if(currentModalClassId) openSigModal("lecturer"); });
$("hodSignBtn").addEventListener("click", ()=>{ if(currentModalClassId) openSigModal("hod"); });

$("sigClearBtn").addEventListener("click", ()=> sigPad.clear());
$("sigCancelBtn").addEventListener("click", ()=>{
  $("sigModal").classList.add("hidden");
  clearAlert($("sigMsg"));
});

let sigMode = "lecturer";
function openSigModal(mode){
  sigMode = mode;
  sigPad.clear();
  clearAlert($("sigMsg"));

  $("hodNameWrap").classList.toggle("hidden", mode !== "hod");
  $("sigModalTitle").textContent = (mode==="hod" ? "HOD Signature" : "Lecturer Signature");
  if(mode==="hod"){
    const cls = loadData().classes.find(c=>c.id===currentModalClassId);
    $("hodNameInput").value = cls?.hodName || "";
  }
  $("sigModal").classList.remove("hidden");
  setTimeout(()=> sigPad._resize(), 50);
}

$("sigSaveBtn").addEventListener("click", ()=>{
  if(!currentModalClassId) return;
  DATA = loadData();
  const cls = DATA.classes.find(c=>c.id===currentModalClassId);
  if(!cls) return;

  if(sigPad.isBlank()){
    setAlert($("sigMsg"), "Please draw the signature first.", "danger");
    return;
  }
  const dataUrl = sigPad.toDataUrl();

  if(sigMode==="lecturer"){
    cls.lecturerSignature = dataUrl;
  } else {
    const hodName = $("hodNameInput").value.trim();
    if(!hodName){
      setAlert($("sigMsg"), "Please enter HOD name.", "danger");
      return;
    }
    cls.hodName = hodName;
    cls.hodSignature = dataUrl;
  }
  saveData(DATA);
  $("sigModal").classList.add("hidden");
  openSessionModal(currentModalClassId, true);
});

function openSessionModal(classId){
  DATA = loadData();
  const cls = DATA.classes.find(c=>c.id===classId);
  if(!cls) return;

  currentModalClassId = classId;

  $("hodSignBtn").classList.toggle("hidden", !(currentUser && currentUser.role==="admin"));

  $("sessionModalTitle").textContent = `${cls.type==="meeting" ? "Staff Meeting" : "Class"} · ${cls.academicYear || ""} · ${cls.unitCode || ""} · ${cls.unit || ""}`;
  $("sessionModalMeta").textContent = `${cls.lecturerName || ""} · ${cls.venue || ""} · ${formatDateTime(cls.dateTime)} · Status: ${cls.status.toUpperCase()}`;

  const link = window.location.origin + window.location.pathname + "?mode=student&classId=" + encodeURIComponent(cls.id);
  $("sessionLinkText").textContent = link;

  $("qrTarget").innerHTML = "";
  try{
    new QRCode($("qrTarget"), { text: link, width: 130, height: 130 });
  }catch(e){
    $("qrTarget").innerHTML = "<div class='small'>QR failed to load</div>";
  }

  $("toggleStatusBtn").textContent = (cls.status==="open") ? "Close Session" : "Open Session";

  const rows = buildAttendanceRowsForClass(cls.id);
  $("sessionAttendanceMeta").textContent = `Total attendance: ${rows.length}. Signatures are embedded in exports (PDF/Word/Excel).`;

  renderAttendanceTable("sessionAttendanceTable", rows, true);

  $("sessionModal").classList.remove("hidden");
}

/* ===========================
   Attendance table renderer
=========================== */
function renderAttendanceTable(tableId, rows, includeSigThumb){
  const table = $(tableId);
  if(!table) return;

  if(!rows.length){
    table.innerHTML = `<thead><tr><th>No data</th></tr></thead><tbody><tr><td>No attendance yet.</td></tr></tbody>`;
    return;
  }

  let head = `<thead><tr>
    <th>#</th><th>ID</th><th>Surname</th><th>Middle</th><th>First</th>${includeSigThumb? "<th>Signature</th>": ""}<th>Timestamp</th>
  </tr></thead>`;

  let body = "<tbody>";
  rows.forEach(r=>{
    const sigCell = includeSigThumb
      ? `<td>${r.SignatureDataURL ? `<img class="miniSig" src="${r.SignatureDataURL}" alt="sig">` : ""}</td>`
      : "";
    body += `<tr>
      <td>${r["#"]}</td>
      <td>${r.ID}</td>
      <td>${r.Surname}</td>
      <td>${r.Middle}</td>
      <td>${r.First}</td>
      ${sigCell}
      <td>${r.Timestamp}</td>
    </tr>`;
  });
  body += "</tbody>";
  table.innerHTML = head + body;
}

function buildAttendanceRowsForClass(classId){
  DATA = loadData();
  const cls = DATA.classes.find(c=>c.id===classId) || {};
  const items = DATA.attendance
    .filter(a=>a.classId===classId)
    .sort((a,b)=> (a.createdAt||0)-(a.createdAt||0))
    .map((a,i)=>({
      "#": i+1,
      ID: (cls.type==="meeting") ? (a.staffNo||"") : (a.admission||""),
      Surname: a.surname || "",
      Middle: a.middle || "",
      First: a.first || "",
      Timestamp: formatDateTime(a.createdAt),
      SignatureDataURL: a.signature || ""
    }));
  return items;
}
function getClassAndRows(classId){
  DATA = loadData();
  const cls = DATA.classes.find(c=>c.id===classId);
  const rows = buildAttendanceRowsForClass(classId);
  return { cls, rows };
}
function rowsToRawRows(rows){
  return rows.map(r=>({
    "#": r["#"],
    ID: r.ID,
    Surname: r.Surname,
    Middle: r.Middle,
    First: r.First,
    Timestamp: r.Timestamp,
    SignatureDataURL: r.SignatureDataURL
  }));
}

/* ===========================
   PARTICIPANT view (mode=student)
=========================== */
function getOrCreateDeviceId(){
  const k = "jooust_device_id";
  let v = localStorage.getItem(k);
  if(!v){
    v = uuid();
    localStorage.setItem(k, v);
  }
  return v;
}

async function loadStudentMode(){
  const classId = getQueryParam("classId");
  if(!classId) return false;

  DATA = loadData();
  const cls = DATA.classes.find(c=>c.id===classId);
  if(!cls){
    showSection("studentSection");
    setAlert($("studentClassInfo"), "Invalid session link (classId not found).", "danger");
    $("studentFormWrapper").classList.add("hidden");
    return true;
  }

  showSection("studentSection");
  $("participantTitle").textContent = (cls.type==="meeting") ? "Staff Meeting Sign-In" : "Class Attendance Sign-In";

  const isMeeting = cls.type === "meeting";
  $("staffNoRow").classList.toggle("hidden", !isMeeting);
  $("idRow").classList.toggle("hidden", isMeeting);
  $("idLabel").textContent = "Admission Number";
  $("stAdmission").placeholder = "Enter Admission Number";

  const meta = isMeeting
    ? `Meeting Mode: ${cls.meetingMode.toUpperCase()}
Venue/Platform: ${cls.venue}
Date/Time: ${formatDateTime(cls.dateTime)}
Organizer: ${cls.lecturerName}
Status: ${cls.status.toUpperCase()}`
    : `Academic Year: ${cls.academicYear}
Unit Code: ${cls.unitCode}
Unit Name: ${cls.unit}
Course: ${cls.course}
Faculty: ${cls.faculty}
Study Year/Semester: ${cls.year} / ${cls.semester}
Venue: ${cls.venue}
Date/Time: ${formatDateTime(cls.dateTime)}
Lecturer: ${cls.lecturerName}
Status: ${cls.status.toUpperCase()}`;

  $("studentClassInfo").textContent = meta;
  $("studentFormWrapper").classList.remove("hidden");

  if(cls.status !== "open"){
    setAlert($("studentSubmitMsg"), "This session is CLOSED. Please contact the organizer/lecturer.", "danger");
    $("stSubmit").disabled = true;
  }else{
    $("stSubmit").disabled = false;
    clearAlert($("studentSubmitMsg"));
  }

  const deviceId = getOrCreateDeviceId();
  const devKey = `submitted_${classId}_${deviceId}`;
  if(localStorage.getItem(devKey)==="1"){
    $("studentAlreadySubmitted").classList.remove("hidden");
    $("studentFormWrapper").classList.add("hidden");
  } else {
    $("studentAlreadySubmitted").classList.add("hidden");
  }

  const requireGeo = (cls.type==="class") || (cls.type==="meeting" && cls.meetingMode==="physical");
  if(requireGeo){
    const center = cls.geoCenter || JOOUST_CENTER;
    const radiusKm = (typeof cls.geoRadiusKm === "number") ? cls.geoRadiusKm : GEOFENCE_RADIUS_KM;
    $("studentGeoInfo").classList.remove("hidden");
    $("studentGeoInfo").textContent =
      `This is a PHYSICAL session. Location verification is required within ${(radiusKm*1000).toFixed(0)}m.\n`+
      `Session Center: ${center.lat.toFixed(6)}, ${center.lon.toFixed(6)}\n`+
      `Tip: Turn on GPS for best accuracy.`;
  }else{
    $("studentGeoInfo").classList.add("hidden");
  }

  setTimeout(()=> stSig._resize(), 50);
  return true;
}

$("stSubmit").addEventListener("click", async ()=>{
  const classId = getQueryParam("classId");
  if(!classId) return;
  DATA = loadData();
  const cls = DATA.classes.find(c=>c.id===classId);
  if(!cls) return;

  if(cls.status!=="open"){
    setAlert($("studentSubmitMsg"), "Session is CLOSED.", "danger");
    return;
  }

  const surname = $("stSurname").value.trim();
  const middle = $("stMiddleName").value.trim();
  const first = $("stFirstName").value.trim();

  const isMeeting = cls.type==="meeting";
  const idValue = isMeeting ? $("stStaffNo").value.trim() : $("stAdmission").value.trim();

  if(!surname || !first || !idValue){
    setAlert($("studentSubmitMsg"), "Please fill required fields (Surname, First Name, ID).", "danger");
    return;
  }
  if(stSig.isBlank()){
    setAlert($("studentSubmitMsg"), "Please add your signature.", "danger");
    return;
  }

  const exists = DATA.attendance.some(a=>a.classId===classId && ((isMeeting && (a.staffNo||"")===idValue) || (!isMeeting && (a.admission||"")===idValue)));
  if(exists){
    setAlert($("studentSubmitMsg"), "This ID has already submitted attendance for this session.", "danger");
    return;
  }

  const requireGeo = (cls.type==="class") || (cls.type==="meeting" && cls.meetingMode==="physical");
  let geoObj = null;

  if(requireGeo){
    try{
      const g = await getGeo();
      const center = cls.geoCenter || JOOUST_CENTER;
      const radiusKm = (typeof cls.geoRadiusKm === "number") ? cls.geoRadiusKm : GEOFENCE_RADIUS_KM;

      const distKm = haversineKm(g.lat, g.lon, center.lat, center.lon);
      geoObj = { lat:g.lat, lon:g.lon, acc:g.acc, distKm: +distKm.toFixed(3) };

      if(distKm > radiusKm){
        setAlert(
          $("studentSubmitMsg"),
          `Location check failed. You are ${(distKm*1000).toFixed(0)} m away. Required within ${(radiusKm*1000).toFixed(0)} m of the session location.`,
          "danger"
        );
        return;
      }
    }catch(e){
      setAlert($("studentSubmitMsg"), "Location permission is required for physical sessions. Please enable GPS and try again.", "danger");
      return;
    }
  }

  const deviceId = getOrCreateDeviceId();
  const record = {
    id: uuid(),
    classId,
    surname, middle, first,
    admission: isMeeting ? "" : idValue,
    staffNo: isMeeting ? idValue : "",
    signature: stSig.toDataUrl(),
    createdAt: Date.now(),
    geo: geoObj,
    deviceId
  };

  DATA.attendance.push(record);
  saveData(DATA);

  localStorage.setItem(`submitted_${classId}_${deviceId}`, "1");

  setAlert($("studentSubmitMsg"), "Attendance submitted successfully. Thank you.", "success");
  $("studentAlreadySubmitted").classList.remove("hidden");
  $("studentFormWrapper").classList.add("hidden");
});

/* ===========================
   RAW export (CSV/Excel)
=========================== */
function exportRawAttendanceCsv(cls, rows){
  if(!rows.length){
    alert("No attendance to export.");
    return;
  }
  const header = Object.keys(rows[0]);
  const csv = [
    ["JOOUST Attendance (Raw)", `${cls.type||""}`, `${cls.academicYear||""}`, `${cls.unitCode||""}`, `${cls.unit||""}`, `${cls.course||""}`, `${cls.faculty||""}`].join(","),
    "",
    header.join(","),
    ...rows.map(r=> header.map(h=>{
      const val = (r[h] ?? "").toString().replaceAll('"','""');
      return `"${val}"`;
    }).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jooust-raw-attendance-${(cls.unitCode||cls.unit||"session").replace(/\s+/g,"_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

$("rawExportCsvBtn").addEventListener("click", ()=>{
  const id = $("rawClassPick").value;
  if(!id){ setAlert($("rawExportMsg"), "Pick a session first.", "danger"); return; }
  const { cls, rows } = getClassAndRows(id);
  exportRawAttendanceCsv(cls, rowsToRawRows(rows));
  setAlert($("rawExportMsg"), "CSV exported successfully.", "success");
});

$("rawExportExcelBtn").addEventListener("click", ()=>{
  const id = $("rawClassPick").value;
  if(!id){ setAlert($("rawExportMsg"), "Pick a session first.", "danger"); return; }
  const { cls, rows } = getClassAndRows(id);
  exportClassAttendanceExcel(cls, rows);
  setAlert($("rawExportMsg"), "Excel exported successfully.", "success");
});

/* ===========================
   OFFICIAL exports (PDF/Word/Excel)
=========================== */
async function exportClassAttendanceExcel(cls, rows){
  if(!window.XLSX){
    alert("Excel library not loaded. Ensure internet is available, then refresh.");
    return;
  }
  const wb = XLSX.utils.book_new();
  wb.Props = { Title:"JOOUST Session Attendance", Subject:"Attendance", Author:"JOOUST Attendance System" };

  const summary = [
    ["Jaramogi Oginga Odinga University of Science & Technology"],
    ["Session Attendance Export"],
    [""],
    ["Type", (cls.type||"").toUpperCase()],
    ["Meeting Mode", cls.type==="meeting" ? (cls.meetingMode||"") : ""],
    ["Academic Year", cls.academicYear || ""],
    ["Unit Code", cls.unitCode || ""],
    ["Unit/Meeting", cls.unit || ""],
    ["Course", cls.course || ""],
    ["Faculty", cls.faculty || ""],
    ["Study Year", cls.year || ""],
    ["Semester", cls.semester || ""],
    ["Venue/Platform", cls.venue || ""],
    ["Date/Time", formatDateTime(cls.dateTime)],
    ["Lecturer", cls.lecturerName || ""],
    ["Status", cls.status || ""],
    ["Geofence Radius (m)", Math.round(((cls.geoRadiusKm ?? GEOFENCE_RADIUS_KM) * 1000))],
    ["Geofence Center", (cls.geoCenter ? `${cls.geoCenter.lat.toFixed(6)}, ${cls.geoCenter.lon.toFixed(6)}` : "N/A")],
    [""],
    ["System created by Gerotech — Dan Otieno."]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");

  const header = ["#","ID","Surname","Middle","First","Timestamp","SignatureDataURL"];
  const wsData = [header];
  rows.forEach(r=>{
    wsData.push([r["#"], r.ID, r.Surname, r.Middle, r.First, r.Timestamp, r.SignatureDataURL]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), "Attendance");

  XLSX.writeFile(wb, `jooust-session-attendance-${(cls.unitCode||cls.unit||"session").replace(/\s+/g,"_")}.xlsx`);
}
