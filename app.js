/* ===========================
   ✅ Security helpers
=========================== */

// Escape HTML to prevent XSS when using innerHTML
function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* Optional: Password hashing (use later if you want) */
async function pbkdf2Hash(password, saltB64=null){
  const enc = new TextEncoder();
  const salt = saltB64
    ? Uint8Array.from(atob(saltB64), c=>c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMat = await crypto.subtle.importKey(
    "raw", enc.encode(password), {name:"PBKDF2"}, false, ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {name:"PBKDF2", salt, iterations: 120000, hash:"SHA-256"},
    keyMat,
    256
  );

  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
  const saltOut = btoa(String.fromCharCode(...salt));
  return { saltB64: saltOut, hashB64 };
}
async function verifyPassword(password, saltB64, hashB64){
  const computed = await pbkdf2Hash(password, saltB64);
  return computed.hashB64 === hashB64;
}

/* ===========================
   ✅ PASTE YOUR ORIGINAL <script>...</script> CODE BELOW
=========================== */

/* Start paste */
/* Paste ALL your original JS here (everything from your <script> block) */
/* End paste */


/* ===========================
   ✅ Required small edits in your pasted code
===========================

1) In setupSignaturePad(), change toDataUrl() to JPEG:

   function toDataUrl() {
     return canvas.toDataURL("image/jpeg", 0.65);
   }

2) When you use innerHTML with dynamic data, wrap values with esc():
   Example:
     <td><b>${esc(lec.salutation)} ${esc(lec.fullName)}</b></td>

   Apply esc() to: fullName, pf, username, unit, venue, course, faculty, lecturerName, etc.

*/
