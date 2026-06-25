const STORAGE_KEY = "jooust_attendance_data_v3";

/* =========================
   BASE DATA
========================= */
function baseData(){
  return {
    admins: [{ username: "admin", password: "admin123" }],
    lecturers: [],
    facultyConfig: [],
    classes: [],
    attendance: [],
    fraudReviewed: []
  };
}

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){
      const d = baseData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
      return d;
    }

    const parsed = JSON.parse(raw);

    return {
      admins: Array.isArray(parsed.admins) ? parsed.admins : [{ username: "admin", password: "admin123" }],
      lecturers: Array.isArray(parsed.lecturers) ? parsed.lecturers : [],
      facultyConfig: Array.isArray(parsed.facultyConfig) ? parsed.facultyConfig : [],
      classes: Array.isArray(parsed.classes) ? parsed.classes : [],
      attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
      fraudReviewed: Array.isArray(parsed.fraudReviewed) ? parsed.fraudReviewed : []
    };
  } catch (error){
    console.error("Failed to load local data:", error);
    const d = baseData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    return d;
  }
}

function saveData(data){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error){
    console.error("Failed to save local data:", error);
    alert("Unable to save data in this browser. Please check storage permissions.");
    return false;
  }
}

/* =========================
   HELPERS
========================= */
function uuid(){
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function setAlert(el, msg, type = "info"){
  if(!el) return;
  el.className = "alert alert-" + type;
  el.textContent = msg;
  el.classList.remove("hidden");
}

function clearAlert(el){
  if(!el) return;
  el.classList.add("hidden");
  el.textContent = "";
}

function formatDateTime(dt){
  if(!dt) return "";
  const d = new Date(dt);
  if(Number.isNaN(d.getTime())) return dt;

  return d.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric"
  }) + " " + d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function unique(arr){
  return [...new Set(arr)].sort((a, b) => String(a).localeCompare(String(b)));
}

function setOptions(select, values, placeholder = "Select option"){
  if(!select) return;

  const currentValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;

  values.forEach(v => {
    const option = document.createElement("option");
    option.value = v;
    option.textContent = v;
    select.appendChild(option);
  });

  if(currentValue && values.includes(currentValue)){
    select.value = currentValue;
  }
}

function getMapping(){
  return loadData().facultyConfig || [];
}

/* =========================
   DEVICE FINGERPRINT
========================= */
function getDeviceFingerprint(){
  const raw = [
    navigator.userAgent || "",
    navigator.language || "",
    screen.width || "",
    screen.height || "",
    new Date().getTimezoneOffset()
  ].join("|");

  let hash = 0;
  for(let i = 0; i < raw.length; i++){
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return "dev_" + Math.abs(hash);
}

/* =========================
   SIGNATURE PAD
========================= */
function setupSignaturePad(canvas){
  const ctx = canvas.getContext("2d");
  let drawing = false;
  let hasDrawn = false;

  function resizeCanvas(){
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();

    const tempData = hasDrawn ? canvas.toDataURL("image/png") : null;

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f2933";

    if(tempData){
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = tempData;
    }
  }

  function getPoint(event){
    const rect = canvas.getBoundingClientRect();

    if(event.touches && event.touches.length){
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top
      };
    }

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function start(event){
    event.preventDefault();
    drawing = true;
    const point = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function move(event){
    if(!drawing) return;
    event.preventDefault();
    const point = getPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    hasDrawn = true;
  }

  function end(event){
    if(event) event.preventDefault();
    drawing = false;
  }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);

  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("touchend", end, { passive: false });

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  return {
    clear: () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      hasDrawn = false;
    },
    toDataUrl: () => canvas.toDataURL("image/png"),
    isEmpty: () => !hasDrawn
  };
}

/* =========================
   DOWNLOADS / EXPORTS
========================= */
function downloadBlob(content, filename, type){
  try{
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error){
    console.error("Download failed:", error);
    alert("Download failed. Please try again.");
  }
}

function exportJsonToExcel(data, filename = "export.xlsx", sheetName = "Sheet1"){
  if(!window.XLSX){
    alert("Excel export library is not loaded.");
    return;
  }

  try{
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  } catch (error){
    console.error("Excel export failed:", error);
    alert("Excel export failed. Please try again.");
  }
}

function exportHtmlToWord(title, html, filename = "document.doc"){
  try{
    const content = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body{font-family:Arial,sans-serif;padding:20px;}
            h1{font-size:22px;margin-bottom:12px;}
            table{border-collapse:collapse;width:100%;}
            th,td{border:1px solid #ccc;padding:8px;text-align:left;}
            th{background:#f5f5f5;}
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          ${html}
        </body>
      </html>
    `;
    downloadBlob(content, filename, "application/msword");
  } catch (error){
    console.error("Word export failed:", error);
    alert("Word export failed. Please try again.");
  }
}

function exportTableToPdf(title, tableId, filename = "report.pdf"){
  if(!window.jspdf || !window.jspdf.jsPDF){
    alert("PDF export library is not loaded.");
    return;
  }

  try{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(title, 14, 14);

    if(typeof doc.autoTable === "function"){
      doc.autoTable({
        html: "#" + tableId,
        startY: 22,
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [15, 82, 186] }
      });
    } else {
      doc.text("Table export plugin not available.", 14, 24);
    }

    doc.save(filename);
  } catch (error){
    console.error("PDF export failed:", error);
    alert("PDF export failed. Please try again.");
  }
}

/* =========================
   OPTIONAL LIBRARY CHECK
========================= */
function libsStatus(){
  return {
    xlsxLoaded: !!window.XLSX,
    pdfLoaded: !!(window.jspdf && window.jspdf.jsPDF)
  };
}
