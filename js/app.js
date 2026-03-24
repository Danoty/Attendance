const STORAGE_KEY = "jooust_attendance_data_v3";

/* BASE DATA */
function baseData(){
  return {
    admins:[{ username:"admin", password:"admin123" }],
    lecturers:[],
    facultyConfig:[],
    classes:[],
    attendance:[]
  };
}

function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    const d = baseData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    return d;
  }
  return JSON.parse(raw);
}

function saveData(d){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

/* HELPERS */
function uuid(){
  return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
}

function setAlert(el,msg,type="info"){
  el.className = "alert alert-"+type;
  el.textContent = msg;
}

function clearAlert(el){
  el.classList.add("hidden");
}

function formatDateTime(dt){
  const d = new Date(dt);
  return d.toLocaleDateString()+" "+d.toLocaleTimeString();
}

function unique(arr){
  return [...new Set(arr)];
}

function setOptions(select, values, placeholder){
  select.innerHTML = `<option value="">${placeholder}</option>`;
  values.forEach(v=>{
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    select.appendChild(o);
  });
}

function getMapping(){
  return loadData().facultyConfig || [];
}

/* SIGNATURE PAD */
function setupSignaturePad(canvas){
  const ctx = canvas.getContext("2d");
  let drawing = false;

  canvas.addEventListener("mousedown", ()=> drawing=true);
  canvas.addEventListener("mouseup", ()=> drawing=false);
  canvas.addEventListener("mousemove", e=>{
    if(!drawing) return;
    ctx.lineTo(e.offsetX,e.offsetY);
    ctx.stroke();
  });

  return {
    clear:()=>ctx.clearRect(0,0,canvas.width,canvas.height),
    toDataUrl:()=>canvas.toDataURL()
  };
}

/* EXPORTS */
function downloadBlob(content, filename, type){
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

function exportJsonToExcel(data, filename){
  if(!window.XLSX){
    alert("Excel library not loaded");
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

function exportHtmlToWord(title, html, filename){
  const content = `
    <html>
      <head><meta charset="utf-8"><title>${title}</title></head>
      <body>${html}</body>
    </html>
  `;
  downloadBlob(content, filename, "application/msword");
}

function exportTableToPdf(title, tableId, filename){
  if(!window.jspdf){
    alert("PDF library not loaded");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text(title, 14, 10);
  doc.autoTable({ html: "#"+tableId, startY: 20 });
  doc.save(filename);
}
