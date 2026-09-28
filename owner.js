// ===== البلاغات + لوحة المالك الكاملة =====
const REPORT_REASONS = ["احتيال أو طلب تحويل خارج المنصة","إساءة أو ألفاظ مسيئة","تهديد أو ابتزاز","مشاركة بيانات دفع","محتوى مخالف","سبب آخر"]; // مؤقتة
const RST = {
  INVESTIGATION_QUEUE:["قيد المراجعة 🟡","y"],
  DISMISSED:["لا مخالفة 🟢",""],
  ACTION_TAKEN:["تم اتخاذ إجراء 🔴","r"]
};
let reports = load("reports", []);
let audit = load("audit", []);
let ownerFilter = "all";
function saveReports(){
  localStorage.setItem("reports", JSON.stringify(reports));
  localStorage.setItem("audit", JSON.stringify(audit));
}
function logAudit(a){
  audit.unshift([new Date().toLocaleString("ar"), a]);
  audit = audit.slice(0, 50);
  saveReports();
}

// ---- إرسال بلاغ من داخل أي محادثة ----
function sendReport(t){
  if (role == "owner") return;
  if (reports.some(r => r.thread == t && r.by == myKind() && r.status == "INVESTIGATION_QUEUE")) {
    alert("أرسلت بلاغًا على هذه المحادثة وهو قيد المراجعة"); return;
  }
  const reason = document.getElementById("rr_" + t).value;
  const text = document.getElementById("rt_" + t).value.trim();
  reports.push({
    id: "RPT-" + String(reports.length + 1).padStart(6, "0"),
    thread: t, by: myKind(), byName: myName(), reason, text,
    status: "INVESTIGATION_QUEUE", note: "", time: new Date().toLocaleString("ar")
  });
  saveReports(); openT[t] = true;
  alert("تم إرسال البلاغ للإدارة ✅\nالبلاغ لا يعني أن أحدًا مذنب، سيتم التحقق.");
  const y = window.scrollY; render(); window.scrollTo(0, y);
}
function reportForm(t){
  if (role == "owner") return "";
  return `<details style="margin-top:6px"><summary class="small">🚩 إبلاغ عن مشكلة في هذه المحادثة</summary>
    <select id="rr_${t}">${REPORT_REASONS.map(r => `<option>${r}</option>`).join("")}</select>
    <textarea id="rt_${t}" rows="2" placeholder="تفاصيل (اختياري)"></textarea>
    <button class="wide" style="background:#fca5a5" onclick="sendReport('${t}')">إرسال البلاغ للإدارة</button></details>`;
}

// نضيف زر البلاغ داخل كل محادثة + علامة 🚩 على المحادثات المبلغ عنها
const _chatBoxR = chatBox;
chatBox = function (t) { return _chatBoxR(t) + reportForm(t); };
const _chatDetailsR = chatDetails;
chatDetails = function (t, label) {
  const f = reports.some(r => r.thread == t && r.status == "INVESTIGATION_QUEUE");
  return _chatDetailsR(t, label + (f ? " 🚩" : ""));
};

// ---- المالك ----
function decideReport(id, act){
  const r = reports.find(x => x.id == id);
  const note = document.getElementById("rn_" + id).value.trim();
  if (!note) { alert("اكتب ملاحظتك (مطلوبة)"); return; }
  r.status = act == "ok" ? "DISMISSED" : "ACTION_TAKEN"; r.note = note;
  logAudit("بلاغ " + id + ": " + (act == "ok" ? "لا مخالفة" : "تم اتخاذ إجراء") + " - " + note);
  render();
}
function reviewDecision(id, act){
  const p = products.find(x => x.id == id);
  p.status = act == "ok" ? "published" : "blocked";
  logAudit("منتج «" + p.name + "»: " + (act == "ok" ? "نُشر بعد المراجعة" : "تم رفضه"));
  save(); render();
}
function setOF(v){ ownerFilter = v; render(); }

function threadLabel(t){
  if (t.startsWith("pre:")) { const p = P(t.slice(4)); return "سؤال قبل الشراء: " + (p ? p.name : ""); }
  if (t.startsWith("ord:")) { const o = orders.find(x => x.no == t.slice(4)); return "طلب " + t.slice(4) + (o ? " | " + o.buyer + " ↔ " + sellers[o.seller].name : ""); }
  return "نزاع " + t.slice(4);
}
function readChat(t, label){
  const ms = chats.filter(m => m.thread == t).slice().reverse();
  const f = reports.some(r => r.thread == t && r.status == "INVESTIGATION_QUEUE") ? " 🚩" : "";
  const body = ms.map(m => `<div class="msg ${m.kind == "owner" ? "me" : ""}"><small>${esc(m.name)} • ${esc(m.time)}</small>${esc(m.text)}</div>`).join("") || "<p class='small'>لا رسائل</p>";
  return `<details><summary>💬 ${esc(label)} (${ms.length})${f}</summary><div class="chat"><div class="msgs">${body}</div>${t.startsWith("dsp:") ? `<p class="small">للرد على العميل استخدم قسم النزاعات بالأسفل</p>` : `<p class="small">👁️ قراءة فقط</p>`}</div></details>`;
}

const _ownerBase = ownerPage;
ownerPage = function () {
  const sales = orders.reduce((a, o) => a + o.total, 0);
  const fees = orders.reduce((a, o) => a + o.fee, 0);
  const done = orders.filter(o => o.status == "SETTLED").length;
  const rate = orders.length ? Math.round(done * 100 / orders.length) : 0;
  const pend = products.filter(p => p.status == "pending");
  const openR = reports.filter(r => r.status == "INVESTIGATION_QUEUE").length;

  const stats = `<div class="stats">
    <div class="stat"><b>${orders.length}</b>الطلبات</div>
    <div class="stat"><b>${fmt(sales)}</b>المبيعات</div>
    <div class="stat"><b>${fmt(fees)}</b>العمولات</div>
    <div class="stat"><b>${rate}%</b>نسبة الإكمال</div>
    <div class="stat"><b>${pend.length}</b>منتجات للمراجعة</div>
    <div class="stat"><b>${openR}</b>بلاغات جديدة</div></div>`;

  const pendHtml = `<h3>📦 منتجات تحتاج مراجعتك</h3><br>` + (pend.map(p => `<div class="box">
    <div class="row"><b>${p.icon} ${esc(p.name)}</b><span>${fmt(p.price)}</span></div>
    <p class="small">${esc((sellers[p.seller] || {}).name)} | ${esc(p.cat)}</p><p>${esc(p.desc)}</p>
    <p class="small">ملاحظات الفحص الآلي: ${(p.notes || []).map(esc).join(" - ")}</p>
    <div class="row"><button onclick="reviewDecision(${p.id},'ok')">✅ نشر</button><button style="background:#fca5a5" onclick="reviewDecision(${p.id},'no')">❌ رفض</button></div></div>`).join("")
    || "<div class='box'><p class='small'>لا توجد منتجات معلقة</p></div>");

  const rs = reports.slice().sort((a, b) => (a.status == "INVESTIGATION_QUEUE" ? 0 : 1) - (b.status == "INVESTIGATION_QUEUE" ? 0 : 1)).reverse().sort((a, b) => (a.status == "INVESTIGATION_QUEUE" ? 0 : 1) - (b.status == "INVESTIGATION_QUEUE" ? 0 : 1));
  const repHtml = `<h3>🚩 البلاغات (طابور التحقيق)</h3><br>` + (rs.map(r => {
    const st = RST[r.status];
    const acts = r.status == "INVESTIGATION_QUEUE"
      ? `<textarea id="rn_${r.id}" rows="2" placeholder="ملاحظتك / سبب القرار (مطلوبة)"></textarea>
         <div class="row"><button onclick="decideReport('${r.id}','ok')">🟢 لا مخالفة</button><button style="background:#fca5a5" onclick="decideReport('${r.id}','act')">🔴 تم اتخاذ إجراء</button></div>`
      : `<p class="small">قرارك: ${esc(r.note)}</p>`;
    return `<div class="box"><div class="row"><b>${r.id}</b><span class="tag ${st[1]}">${st[0]}</span></div>
      <p class="small">من: ${esc(r.byName)} | ${esc(r.time)}</p>
      <p><b>السبب:</b> ${esc(r.reason)}</p>${r.text ? `<p>${esc(r.text)}</p>` : ""}
      ${readChat(r.thread, threadLabel(r.thread))}${acts}</div>`;
  }).join("") || "<div class='box'><p class='small'>لا توجد بلاغات</p></div>");

  const flagged = t => reports.some(r => r.thread == t);
  let ths = Array.from(new Set(chats.map(m => m.thread)));
  if (ownerFilter == "rep") ths = ths.filter(flagged);
  if (ownerFilter == "norm") ths = ths.filter(t => !flagged(t));
  ths.sort((a, b) => (flagged(b) ? 1 : 0) - (flagged(a) ? 1 : 0));
  const filt = [["all", "الكل"], ["rep", "🚩 الشكاوى"], ["norm", "العادية"]]
    .map(f => `<button style="${ownerFilter == f[0] ? "" : "background:#e5e7eb"}" onclick="setOF('${f[0]}')">${f[1]}</button>`).join(" ");
  const allChats = `<h3>💬 كل المحادثات</h3><br><div class="row" style="justify-content:flex-start">${filt}</div>` +
    (ths.map(t => `<div class="box">${readChat(t, threadLabel(t))}</div>`).join("") || "<div class='box'><p class='small'>لا توجد محادثات</p></div>");

  const auditHtml = `<details><summary>📜 سجل العمليات (${audit.length})</summary>${audit.slice(0, 15).map(a => `<p class="small">${esc(a[0])} - ${esc(a[1])}</p>`).join("") || "<p class='small'>لا يوجد</p>"}</details><br>`;

  return `<h2>👑 لوحة المالك</h2>${stats}${pendHtml}${repHtml}${allChats}${auditHtml}` +
    _ownerBase().replace("<h2>👑 لوحة المالك</h2>", "<h2>⚖️ النزاعات والاسترجاع</h2>");
};
