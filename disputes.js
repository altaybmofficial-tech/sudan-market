// ===== الاسترجاع والنزاعات =====
const RETURN_WINDOW_HOURS = 24; // مؤقت للتجربة، يعدل لاحقًا لكل فئة
const REASONS = ["المنتج مختلف عن الوصف","وصل منتج آخر","نقص في المنتج","تلف عند الوصول","عيب موجود عند الاستلام","مشكلة أخرى"];
const DST = {
  OPEN:["بانتظار قرار الإدارة 🟡","y"],
  NEED_INFO:["مطلوب معلومات إضافية 🟠","y"],
  REFUND_APPROVED:["تمت الموافقة على الاسترداد 🟢",""],
  REJECTED:["تم رفض الطلب 🔴","r"]
};
let disputes = load("disputes", []);
function saveDisputes(){ localStorage.setItem("disputes", JSON.stringify(disputes)); }

// نسجل وقت التسليم عند نجاح رمز التسليم
const _verifyBase = verify;
verify = function (no) {
  _verifyBase(no);
  const o = orders.find(x => x.no == no);
  if (o && o.status == "SETTLED" && !o.deliveredAt) { o.deliveredAt = Date.now(); save(); }
};

function hoursLeft(o){
  if (!o.deliveredAt) { o.deliveredAt = Date.now(); save(); }
  return RETURN_WINDOW_HOURS - (Date.now() - o.deliveredAt) / 3600000;
}
function timeTxt(h){ return h >= 1 ? Math.floor(h) + " ساعة" : Math.max(1, Math.ceil(h * 60)) + " دقيقة"; }

// ===== المشتري: فتح نزاع =====
function openDispute(no){
  const o = orders.find(x => x.no == no);
  if (!o || o.status != "SETTLED") { alert("متاح فقط بعد التسليم"); return; }
  if (disputes.some(d => d.order == no)) { alert("يوجد نزاع لهذا الطلب بالفعل"); return; }
  if (hoursLeft(o) <= 0) { alert("انتهت مدة الاسترجاع"); return; }
  const reason = document.getElementById("d_reason_" + no).value;
  const text = document.getElementById("d_text_" + no).value.trim();
  if (text.length < 10) { alert("اشرح المشكلة (10 أحرف على الأقل)"); return; }
  const id = "DSP-" + String(disputes.length + 1).padStart(6, "0");
  disputes.push({ id, order: no, seller: o.seller, reason, text, status: "OPEN", note: "", info: [], refund: null });
  o.log.push([now(), "فتح العميل نزاعًا: " + reason]);
  saveDisputes(); save();
  alert("تم إرسال طلبك ✅ رقم النزاع: " + id);
  render();
}
function addInfo(id){
  const d = disputes.find(x => x.id == id);
  const t = document.getElementById("i_" + id).value.trim();
  if (!t) { alert("اكتب المعلومات"); return; }
  d.info.push(t); d.status = "OPEN";
  const o = orders.find(x => x.no == d.order); o.log.push([now(), "أرسل العميل معلومات إضافية"]);
  saveDisputes(); save(); render();
}

// ===== المالك: القرار =====
function decide(id, act){
  const d = disputes.find(x => x.id == id);
  const o = orders.find(x => x.no == d.order);
  if (d.status != "OPEN") { alert("تم البت في هذا النزاع"); return; }
  const note = document.getElementById("n_" + id).value.trim();
  if (!note) { alert("اكتب سبب القرار أو ملاحظتك"); return; }
  d.note = note;
  if (act == "refund") {
    const amt = Number(document.getElementById("a_" + id).value);
    if (!(amt > 0) || amt > o.total) { alert("اكتب مبلغًا صحيحًا لا يزيد عن " + fmt(o.total)); return; }
    d.status = "REFUND_APPROVED";
    d.refund = { orig: o.no, amount: amt, reason: d.reason, time: new Date().toLocaleString("ar"), approver: "المالك", state: "تم (تجريبي)" };
    o.net = Math.max(0, o.net - amt);
    o.log.push([now(), "وافق المالك على استرداد " + fmt(amt) + " (تجريبي)"]);
  } else if (act == "reject") {
    d.status = "REJECTED";
    o.log.push([now(), "رفض المالك طلب الاسترجاع"]);
  } else {
    d.status = "NEED_INFO";
    o.log.push([now(), "طلب المالك معلومات إضافية"]);
  }
  saveDisputes(); save(); render();
}

// ===== صندوق النزاع في صفحة الطلبات (المشتري) =====
function disputeBox(o){
  const d = disputes.find(x => x.order == o.no);
  if (d) {
    const st = DST[d.status];
    let extra = "";
    if (d.status == "NEED_INFO") extra = `<textarea id="i_${d.id}" rows="2" placeholder="اكتب المعلومات المطلوبة"></textarea><button class="wide" onclick="addInfo('${d.id}')">إرسال المعلومات</button>`;
    if (d.refund) extra = `<div class="warn">💰 استرداد ${fmt(d.refund.amount)} (تجريبي). وصول المبلغ الفعلي يعتمد على مزود الدفع.</div>`;
    return `<div class="box"><div class="row"><b>${o.no}</b><span class="tag ${st[1]}">${st[0]}</span></div>
      <p class="small">رقم النزاع: ${d.id} | السبب: ${esc(d.reason)}</p>
      ${d.note ? `<p class="small">ملاحظة الإدارة: ${esc(d.note)}</p>` : ""}${extra}</div>`;
  }
  const h = hoursLeft(o);
  if (h <= 0) return `<div class="box"><b>${o.no}</b><p class="small">انتهت مدة الاسترجاع (${RETURN_WINDOW_HOURS} ساعة)</p></div>`;
  return `<div class="box"><b>${o.no}</b> <span class="tag y">متبقي ${timeTxt(h)}</span>
    <select id="d_reason_${o.no}">${REASONS.map(r => `<option>${r}</option>`).join("")}</select>
    <textarea id="d_text_${o.no}" rows="3" placeholder="اشرح المشكلة بالتفصيل"></textarea>
    <button class="wide" onclick="openDispute('${o.no}')">🔁 طلب استرجاع / فتح نزاع</button></div>`;
}

const _ordersBase2 = ordersPage;
ordersPage = function () {
  const base = _ordersBase2();
  const done = orders.filter(o => o.status == "SETTLED");
  if (!done.length) return base;
  return base + `<h2>🔁 الاسترجاع والنزاعات</h2><p class="small">يمكنك طلب الاسترجاع خلال ${RETURN_WINDOW_HOURS} ساعة من التسليم.</p><br>` + done.map(disputeBox).join("");
};

// ===== البائع: يشوف النزاعات على طلباته (قراءة فقط) =====
const _dashBase = dash;
dash = function () {
  const mine = disputes.filter(d => d.seller == role);
  if (!mine.length) return _dashBase();
  return _dashBase() + `<h3>🚨 النزاعات على طلباتي</h3><br>` + mine.map(d => `<div class="box">
    <div class="row"><b>${d.order}</b><span class="tag ${DST[d.status][1]}">${DST[d.status][0]}</span></div>
    <p class="small">السبب: ${esc(d.reason)}</p><p class="small">${esc(d.text)}</p>
    ${d.note ? `<p class="small">قرار الإدارة: ${esc(d.note)}</p>` : ""}</div>`).join("");
};

// ===== صفحة المالك =====
function ownerPage(){
  const open = disputes.filter(d => d.status == "OPEN").length;
  const cards = disputes.slice().reverse().map(d => {
    const o = orders.find(x => x.no == d.order) || { total: 0, buyer: "", phone: "" };
    const st = DST[d.status];
    let acts = "";
    if (d.status == "OPEN") {
      acts = `<input id="a_${d.id}" type="number" inputmode="numeric" value="${o.total}" placeholder="مبلغ الاسترداد">
        <textarea id="n_${d.id}" rows="2" placeholder="سبب القرار / ملاحظة (مطلوبة)"></textarea>
        <button class="wide" onclick="decide('${d.id}','refund')">✅ موافقة على الاسترداد</button><br><br>
        <button class="wide" style="background:#fca5a5" onclick="decide('${d.id}','reject')">❌ رفض</button><br><br>
        <button class="wide" style="background:#e5e7eb" onclick="decide('${d.id}','info')">❓ طلب معلومات إضافية</button>`;
    } else if (d.status == "NEED_INFO") {
      acts = `<p class="small">بانتظار رد العميل...</p>`;
    } else {
      acts = `<p class="small">القرار: ${esc(d.note)}</p>` + (d.refund ? `<p class="small">💰 ${fmt(d.refund.amount)} | ${d.refund.time} | الموافق: ${d.refund.approver} | الحالة: ${d.refund.state}</p>` : "");
    }
    return `<div class="box">
      <div class="row"><b>${d.id}</b><span class="tag ${st[1]}">${st[0]}</span></div>
      <p class="small">الطلب: ${d.order} | ${esc(o.buyer)} 📞 ${esc(o.phone)}</p>
      <p class="small">البائع: ${esc((sellers[d.seller] || {}).name)} | إجمالي الطلب: ${fmt(o.total)}</p>
      <p><b>السبب:</b> ${esc(d.reason)}</p><p>${esc(d.text)}</p>
      ${(d.info || []).map(t => `<p class="small">📩 رد العميل: ${esc(t)}</p>`).join("")}
      <details><summary>سجل الطلب</summary>${(o.log || []).map(l => `<p class="small">${l[0]} - ${l[1]}</p>`).join("")}</details>
      <br>${acts}</div>`;
  }).join("");
  return `<h2>👑 لوحة المالك</h2>
    <div class="stats"><div class="stat"><b>${open}</b>نزاعات تنتظر قرارك</div><div class="stat"><b>${disputes.length}</b>إجمالي النزاعات</div></div>
    <h3>🚨 النزاعات</h3><br>${cards || "<div class='box'><p class='small'>لا توجد نزاعات</p></div>"}`;
         }
