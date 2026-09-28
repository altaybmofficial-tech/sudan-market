// ===== المحادثات: قبل الشراء + على الطلب + داخل النزاع =====
// pre:<رقم المنتج>  = مشتري <-> بائع (قبل الشراء)
// ord:<رقم الطلب>   = مشتري <-> بائع (والمالك يقرأ فقط)
// dsp:<رقم النزاع>  = مشتري <-> مالك
let chats = load("chats", []);
const openT = {};
function saveChats(){ localStorage.setItem("chats", JSON.stringify(chats)); }

// تنسيق المحادثة (بدون تعديل style.css)
(function(){
  const s = document.createElement("style");
  s.textContent = `
  .chat{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin:8px 0}
  .msgs{max-height:240px;overflow-y:auto;display:flex;flex-direction:column-reverse;gap:6px;margin-bottom:8px}
  .msg{max-width:80%;padding:6px 10px;border-radius:10px;font-size:14px;background:#e5e7eb;align-self:flex-start;word-break:break-word}
  .msg.me{background:#dcfce7;align-self:flex-end}
  .msg small{display:block;font-size:11px;color:#6b7280}
  details summary{cursor:pointer;padding:6px 0}`;
  document.head.appendChild(s);
})();

const myKind = () => role == "buyer" ? "buyer" : role == "owner" ? "owner" : "seller";
const myName = () => role == "buyer" ? (user.name || "المشتري") : role == "owner" ? "إدارة المنصة" : sellers[role].name;

function canWrite(t){
  const k = myKind();
  if (t.startsWith("pre:")) { const p = P(t.slice(4)); return k == "buyer" || (k == "seller" && p && p.seller == role); }
  if (t.startsWith("ord:")) { const o = orders.find(x => x.no == t.slice(4)); return k == "buyer" || (k == "seller" && o && o.seller == role); }
  if (t.startsWith("dsp:")) return k == "buyer" || k == "owner";
  return false;
}

function sendMsg(t){
  if (!canWrite(t)) { alert("لا تملك صلاحية الكتابة هنا"); return; }
  const text = document.getElementById("m_" + t).value.trim();
  if (!text) return;
  if (text.length > 500) { alert("الرسالة طويلة (الحد 500 حرف)"); return; }
  chats.push({
    thread: t, kind: myKind(), name: myName(), text,
    time: new Date().toLocaleString("ar", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })
  });
  saveChats(); openT[t] = true;
  const y = window.scrollY; render(); window.scrollTo(0, y);
}

function chatBox(t){
  const msgs = chats.filter(m => m.thread == t).slice().reverse();
  const list = msgs.map(m => `<div class="msg ${m.kind == myKind() ? "me" : ""}"><small>${esc(m.name)} • ${esc(m.time)}</small>${esc(m.text)}</div>`).join("")
    || `<p class="small">لا توجد رسائل بعد</p>`;
  const note = t.startsWith("ord:") ? "⚠️ الإدارة قد تطلع على هذه المحادثة عند وجود نزاع."
    : t.startsWith("pre:") ? "⚠️ لا تحوّل أموالًا خارج المنصة ولا تشارك بيانات الدفع هنا."
    : "";
  const write = canWrite(t)
    ? `<div class="row"><input id="m_${t}" placeholder="اكتب رسالتك..." style="flex:1;margin:0" onkeydown="if(event.key=='Enter')sendMsg('${t}')"><button onclick="sendMsg('${t}')">إرسال</button></div>`
    : `<p class="small">👁️ للقراءة فقط</p>`;
  return `<div class="chat"><div class="msgs">${list}</div>${write}${note ? `<p class="small">${note}</p>` : ""}</div>`;
}

function chatDetails(t, label){
  const n = chats.filter(m => m.thread == t).length;
  return `<details ${openT[t] ? "open" : ""} ontoggle="openT['${t}']=this.open"><summary>💬 ${label} (${n})</summary>${chatBox(t)}</details>`;
}

// ---- 3) صفحة المنتج: قبل الشراء ----
const _productChat = product;
product = function (id) {
  const html = _productChat(id);
  const p = P(id);
  if (!p || p.status != "published") return html;
  const k = myKind();
  if (k == "owner" || (k == "seller" && p.seller != role)) return html;
  return html + `<div class="box"><h2>💬 ${k == "buyer" ? "اسأل البائع قبل الشراء" : "رسائل العملاء على هذا المنتج"}</h2>${chatBox("pre:" + p.id)}</div>`;
};

// ---- 1) المشتري: محادثة كل طلب ----
const _ordersChat = ordersPage;
ordersPage = function () {
  const base = _ordersChat();
  if (!orders.length) return base;
  return base + `<h2>💬 محادثات طلباتي مع البائعين</h2>` +
    orders.map(o => `<div class="box"><b>${o.no}</b> <span class="small">${esc(sellers[o.seller].name)}</span>${chatDetails("ord:" + o.no, "محادثة الطلب")}</div>`).join("");
};

// ---- 2) المشتري: محادثة النزاع مع الإدارة ----
const _disputeBoxChat = disputeBox;
disputeBox = function (o) {
  const d = disputes.find(x => x.order == o.no);
  return _disputeBoxChat(o) + (d ? `<div class="box">${chatDetails("dsp:" + d.id, "محادثة النزاع مع الإدارة " + d.id)}</div>` : "");
};

// ---- البائع: أسئلة العملاء ومحادثات الطلبات ----
const _dashChat = dash;
dash = function () {
  const my = orders.filter(o => o.seller == role);
  const pres = products.filter(p => p.seller == role && chats.some(m => m.thread == "pre:" + p.id));
  let h = "";
  if (pres.length) h += `<h3>💬 أسئلة العملاء قبل الشراء</h3><br>` +
    pres.map(p => `<div class="box"><b>${p.icon} ${esc(p.name)}</b>${chatDetails("pre:" + p.id, "الرسائل")}</div>`).join("");
  if (my.length) h += `<h3>💬 محادثات الطلبات</h3><br>` +
    my.map(o => `<div class="box"><b>${o.no}</b> <span class="small">${esc(o.buyer)}</span>${chatDetails("ord:" + o.no, "محادثة الطلب")}</div>`).join("");
  return _dashChat() + h;
};

// ---- المالك: يرد في النزاع ويقرأ محادثة الطلب ----
const _ownerChat = ownerPage;
ownerPage = function () {
  const h = disputes.slice().reverse().map(d => `<div class="box">
    <b>${d.id}</b> <span class="small">الطلب ${d.order}</span>
    ${chatDetails("dsp:" + d.id, "محادثة النزاع مع العميل")}
    ${chatDetails("ord:" + d.order, "محادثة العميل والبائع (قراءة فقط)")}</div>`).join("");
  return _ownerChat() + `<h3>💬 محادثات النزاعات</h3><br>` + (h || "<div class='box'><p class='small'>لا توجد نزاعات</p></div>");
};
