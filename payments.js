// ===== الدفع اليدوي (تحويل بنكي + صورة إشعار) وتسوية البائعين =====
let paymentMethods = [];
Object.assign(ST, { AWAITING_PAYMENT_CONFIRM: "بانتظار تأكيد الدفع من الإدارة" });

async function loadPaymentExtras(){
  try{
    const [pm, se, or] = await Promise.all([
      sb.from("payment_methods").select("*").order("id"),
      sb.from("sellers").select("id,bank_name,bank_account"),
      sb.from("orders").select("no,pay_method,pay_note,payout_done,receipt_url")
    ]);
    paymentMethods = (pm.data||[]).filter(m=>m.active);
    (se.data||[]).forEach(s=>{ if(sellers[s.id]){ sellers[s.id].bankName=s.bank_name||""; sellers[s.id].bankAccount=s.bank_account||""; } });
    (or.data||[]).forEach(o=>{
      const ord=orders.find(x=>x.no==o.no);
      if(ord){ ord.payMethod=o.pay_method||""; ord.payNote=o.pay_note||""; ord.payoutDone=!!o.payout_done; ord.receiptUrl=o.receipt_url||""; }
    });
  }catch(e){ console.error(e); }
}

const _loadAll = loadAll;
loadAll = async function(){ await _loadAll(); await loadPaymentExtras(); render(); };

// ---- خطوة الدفع للمشتري ----
const _checkout = checkout;
checkout = function(){
  const base = _checkout();
  if(!cart.length) return base;
  const methods = paymentMethods.length
    ? paymentMethods.map(m=>`<option value="${m.id}">${esc(m.name)} - ${esc(m.account)}</option>`).join("")
    : `<option value="">لا توجد وسيلة دفع مفعّلة، تواصل مع الإدارة</option>`;
  return base.replace(
    /<select><option>دفع تجريبي[\s\S]*?<\/button>/,
    `<p class="small">اختر وسيلة التحويل، وحوّل المبلغ الإجمالي، ثم ارفع صورة الإشعار:</p>
     <select id="pm_choice">${methods}</select>
     <input id="pm_file" type="file" accept="image/*" capture="environment">
     <p id="pm_status" class="small"></p>
     <textarea id="pm_note" rows="2" placeholder="رقم مرجع التحويل أو ملاحظة (اختياري)"></textarea>
     <div class="warn">⚠️ سيبقى طلبك بانتظار تأكيد الإدارة لاستلام المبلغ قبل أن يبدأ البائع بالتجهيز.</div>
     <button class="wide" onclick="paySubmit()">📤 تأكيد إرسال التحويل</button>`
  );
};

async function paySubmit(){
  const pmId=document.getElementById("pm_choice").value;
  const note=document.getElementById("pm_note").value.trim();
  const fileInput=document.getElementById("pm_file");
  const file=fileInput.files[0];
  const statusEl=document.getElementById("pm_status");
  if(!pmId){alert("اختر وسيلة الدفع");return}
  if(!file){alert("ارفع صورة إشعار التحويل");return}
  if(file.size>5*1024*1024){alert("الصورة كبيرة جدًا (الحد 5MB)");return}

  statusEl.textContent="⏳ جاري رفع الصورة...";
  const path=(session?session.user.id:"anon")+"/"+Date.now()+"-"+file.name.replace(/[^a-zA-Z0-9.]/g,"_");
  const {error:upErr}=await sb.storage.from("receipts").upload(path,file);
  if(upErr){alert("فشل رفع الصورة: "+upErr.message);statusEl.textContent="";return}
  const {data:urlData}=sb.storage.from("receipts").getPublicUrl(path);

  statusEl.textContent="";
  window._pendingPay={pmId,note,receiptUrl:urlData.publicUrl};
  pay();
}

const _pay2 = pay;
pay = function(){
  const before=orders.length;
  _pay2();
  const added=orders.length-before;
  if(added>0){
    const info=window._pendingPay||{};
    const pmObj=paymentMethods.find(m=>m.id==info.pmId);
    orders.slice(0,added).forEach(o=>{
      o.status="AWAITING_PAYMENT_CONFIRM";
      o.payMethod=pmObj?pmObj.name:"";
      o.payNote=info.note||"";
      o.receiptUrl=info.receiptUrl||"";
      o.log.push([now(),"أرسل العميل إشعار تحويل عبر: "+(pmObj?pmObj.name:"")+" - "+(info.note||"")]);
      pushOrder(o).catch(e=>console.error(e));
      sb.from("orders").update({pay_method:o.payMethod,pay_note:o.payNote,payout_done:false,receipt_url:o.receiptUrl}).eq("no",o.no).catch(e=>console.error(e));
    });
    window._pendingPay=null;
  }
};

// ---- المالك: تأكيد استلام الدفع ----
function confirmPayment(no){
  const o=orders.find(x=>x.no==no);
  if(!o||o.status!="AWAITING_PAYMENT_CONFIRM"){alert("لا يوجد ما يُؤكد");return}
  o.status="PAID";
  o.log.push([now(),"أكدت الإدارة استلام مبلغ التحويل يدويًا"]);
  logAudit("تأكيد دفع الطلب "+no);
  pushOrder(o).catch(e=>console.error(e));
  save(); render();
}

// ---- المالك: تأكيد تحويل مستحقات البائع ----
function confirmPayout(no){
  const o=orders.find(x=>x.no==no);
  if(!o||o.status!="SETTLED"){alert("متاح فقط بعد تمام التسليم");return}
  if(o.payoutDone){alert("تم التحويل مسبقًا");return}
  o.payoutDone=true;
  o.log.push([now(),"حوّلت الإدارة صافي المستحقات "+fmt(o.net)+" لحساب البائع يدويًا"]);
  logAudit("تحويل مستحقات البائع للطلب "+no+" - "+fmt(o.net));
  pushOrder(o).catch(e=>console.error(e));
  sb.from("orders").update({payout_done:true}).eq("no",no).catch(e=>console.error(e));
  save(); render();
}

// ---- لوحة المالك: الطلبات المعلقة والتحويلات ووسائل الدفع ----
const _ownerPage2 = ownerPage;
ownerPage = function(){
  const awaiting=orders.filter(o=>o.status=="AWAITING_PAYMENT_CONFIRM");
  const payHtml=`<h3>💳 طلبات بانتظار تأكيد الدفع</h3><br>`+(awaiting.map(o=>`<div class="box">
    <div class="row"><b>${o.no}</b><span class="tag y">بانتظار التأكيد</span></div>
    <p class="small">${esc(o.buyer)} | ${fmt(o.total)} | وسيلة: ${esc(o.payMethod||"")}</p>
    <p class="small">مرجع التحويل: ${esc(o.payNote||"لا يوجد")}</p>
    ${o.receiptUrl?`<a href="${o.receiptUrl}" target="_blank"><img src="${o.receiptUrl}" style="max-width:100%;border-radius:8px;margin:8px 0"></a>`:"<p class='small'>لا توجد صورة</p>"}
    <button class="wide" onclick="confirmPayment('${o.no}')">✅ تأكيد استلام المبلغ</button>
  </div>`).join("")||"<div class='box'><p class='small'>لا توجد طلبات معلّقة</p></div>");

  const toPay=orders.filter(o=>o.status=="SETTLED"&&!o.payoutDone);
  const payoutHtml=`<h3>💸 تحويلات مستحقة للبائعين</h3><br>`+(toPay.map(o=>{
    const s=sellers[o.seller]||{};
    return `<div class="box">
      <div class="row"><b>${o.no}</b><b class="price">${fmt(o.net)}</b></div>
      <p class="small">البائع: ${esc(s.name)}</p>
      <p class="small">حساب البائع: ${esc(s.bankName||"غير مسجل")} - ${esc(s.bankAccount||"—")}</p>
      <button class="wide" onclick="confirmPayout('${o.no}')">✅ تم التحويل للبائع</button>
    </div>`;
  }).join("")||"<div class='box'><p class='small'>لا توجد تحويلات معلّقة</p></div>");

  const pmHtml=`<h3>⚙️ وسائل الدفع (حسابات المنصة)</h3><br>
    ${paymentMethods.map(m=>`<div class="box"><b>${esc(m.name)}</b><p class="small">${esc(m.account)}</p></div>`).join("")}
    <div class="box"><h4>إضافة وسيلة جديدة</h4>
      <input id="pmn_name" placeholder="اسم الوسيلة (مثال: بنكك)">
      <input id="pmn_acc" placeholder="رقم الحساب">
      <button class="wide" onclick="addPaymentMethod()">إضافة</button></div>`;

  return _ownerPage2()+payHtml+payoutHtml+pmHtml;
};

async function addPaymentMethod(){
  const name=document.getElementById("pmn_name").value.trim();
  const acc=document.getElementById("pmn_acc").value.trim();
  if(!name||!acc){alert("اكتب الاسم ورقم الحساب");return}
  const {data,error}=await sb.from("payment_methods").insert({name,account:acc,active:true}).select().single();
  if(error){alert("خطأ: "+error.message);return}
  paymentMethods.push(data);
  logAudit("أضاف المالك وسيلة دفع: "+name);
  render();
}

// ---- البائع: يسجل حسابه البنكي من لوحته ----
const _dash2 = dash;
dash = function(){
  const s=sellers[role]||{};
  const bankBox=`<div class="box"><h3>🏦 حسابك البنكي (لاستلام المستحقات)</h3>
    <input id="sb_bankname" placeholder="اسم البنك/الوسيلة" value="${esc(s.bankName||"")}">
    <input id="sb_bankacc" placeholder="رقم الحساب" value="${esc(s.bankAccount||"")}">
    <button class="wide" onclick="saveSellerBank()">حفظ</button></div>`;
  return bankBox+_dash2();
};
function saveSellerBank(){
  const name=document.getElementById("sb_bankname").value.trim();
  const acc=document.getElementById("sb_bankacc").value.trim();
  sellers[role].bankName=name; sellers[role].bankAccount=acc;
  sb.from("sellers").update({bank_name:name,bank_account:acc}).eq("id",role).catch(e=>console.error(e));
  alert("تم الحفظ ✅"); render();
}
