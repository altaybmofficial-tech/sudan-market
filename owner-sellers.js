// ===== إدارة البائعين =====
let sellerStatus = load("sellerStatus", {});
function saveSS(){ localStorage.setItem("sellerStatus", JSON.stringify(sellerStatus)); }
const SST = { active:["نشط 🟢",""], restricted:["مقيّد 🟡","y"], suspended:["موقوف 🔴","r"] };
function sst(id){ return sellerStatus[id] || "active"; }

function threadSeller(t){
  if (t.startsWith("pre:")) { const p = P(t.slice(4)); return p ? p.seller : null; }
  if (t.startsWith("ord:")) { const o = orders.find(x => x.no == t.slice(4)); return o ? o.seller : null; }
  if (t.startsWith("dsp:")) { const d = disputes.find(x => x.id == t.slice(4)); return d ? d.seller : null; }
}

function sellerAction(id, act){
  sellerStatus[id] = act; saveSS();
  logAudit("البائع «" + sellers[id].name + "»: " + SST[act][0]);
  render();
}

// منع البائع الموقوف من إضافة منتج أو متابعة طلب
const _submitProductSS = submitProduct;
submitProduct = function(){
  if (sst(role) == "suspended") { alert("حسابك موقوف، لا يمكنك إضافة منتجات. تواصل مع الإدارة."); return; }
  _submitProductSS();
};
const _stepSS = step;
step = function(no){
  const o = orders.find(x => x.no == no);
  if (o && sst(o.seller) == "suspended") { alert("حسابك موقوف، تواصل مع الإدارة."); return; }
  _stepSS(no);
};
const _verifySS = verify;
verify = function(no){
  const o = orders.find(x => x.no == no);
  if (o && sst(o.seller) == "suspended") { alert("حسابك موقوف، تواصل مع الإدارة."); return; }
  _verifySS(no);
};

// تنبيه للبائع بحالة حسابه في لوحته
const _dashSS = dash;
dash = function(){
  const st = sst(role);
  const banner = st != "active" ? `<div class="warn">⚠️ حالة حسابك: ${SST[st][0]}. تواصل مع الإدارة لمزيد من التفاصيل.</div>` : "";
  return banner + _dashSS();
};

// إخفاء منتجات البائع الموقوف عن المشترين
const _homeSS = home;
home = function(){
  const html = _homeSS();
  return html; // الإخفاء الفعلي يحتاج تعديل قائمة المنتجات مباشرة، انظر ملاحظة أسفل الرد
};

// ---- بطاقة بائع في لوحة المالك ----
function sellerCard(id){
  const s = sellers[id];
  const prods = products.filter(p => p.seller == id);
  const ords = orders.filter(o => o.seller == id);
  const revenue = ords.filter(o => o.status == "SETTLED").reduce((a, o) => a + o.net, 0);
  const rs = reviews.filter(r => r.seller == id);
  const rating = rs.length ? (rs.reduce((a, r) => a + r.sellerStars, 0) / rs.length).toFixed(1) : "-";
  const disp = disputes.filter(d => d.seller == id).length;
  const reps = reports.filter(r => threadSeller(r.thread) == id).length;
  const st = sst(id);
  return `<div class="box">
    <div class="row"><b>🏪 ${esc(s.name)}</b><span class="tag ${SST[st][1]}">${SST[st][0]}</span></div>
    <p class="small">التوثيق: <span class="tag">${s.badge}</span> | الموقع: ${esc(s.area)}</p>
    <div class="stats">
      <div class="stat"><b>${prods.length}</b>منتجات</div>
      <div class="stat"><b>${ords.length}</b>طلبات</div>
      <div class="stat"><b>${fmt(revenue)}</b>إيراد مسوّى</div>
      <div class="stat"><b>${rating}</b>التقييم</div>
      <div class="stat"><b>${disp}</b>نزاعات</div>
      <div class="stat"><b>${reps}</b>بلاغات</div>
    </div>
    <div class="row">
      <button onclick="sellerAction('${id}','active')">🟢 تفعيل</button>
      <button style="background:#fef3c7" onclick="sellerAction('${id}','restricted')">🟡 تقييد</button>
      <button style="background:#fca5a5" onclick="sellerAction('${id}','suspended')">🔴 إيقاف</button>
    </div>
    <details><summary>عرض المنتجات والطلبات</summary>
      ${prods.map(p => `<p class="small">${p.icon} ${esc(p.name)} - ${fmt(p.price)} - ${PST[p.status][0]}</p>`).join("") || "<p class='small'>لا توجد منتجات</p>"}
      <br>${ords.map(o => `<p class="small">${o.no} - ${ST[o.status]} - ${fmt(o.total)}</p>`).join("") || "<p class='small'>لا توجد طلبات</p>"}
    </details>
  </div>`;
}

const _ownerBase3 = ownerPage;
ownerPage = function(){
  const list = Object.keys(sellers).map(sellerCard).join("");
  return _ownerBase3() + `<h3>👥 إدارة البائعين</h3><br>${list}`;
};
