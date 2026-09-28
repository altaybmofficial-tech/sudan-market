const ICONS=["📱","💻","🏠","👕","👗","🔧","📚","🚗","🏗️","🌱","📦"];
const PST={published:["منشور 🟢",""],pending:["قيد المراجعة 🟡","y"],blocked:["ممنوع 🔴","r"]};

function switchRole(v){
  role=v; save();
  go(v=="buyer"?"/":"/dash"); render();
}

// ===== الفحص الآلي للمنتج: PASS / REVIEW / BLOCK =====
function reviewProduct(p){
  if(BANNED.some(w=>(p.name+" "+p.desc).includes(w)))return{result:"BLOCK",notes:["يحتوي على كلمة ممنوعة"]};
  const notes=[];
  if(p.desc.length<15)notes.push("الوصف قصير جدًا");
  const sim=products.filter(x=>x.cat==p.cat&&x.status=="published");
  if(sim.length){
    const avg=sim.reduce((a,x)=>a+x.price,0)/sim.length;
    if(p.price>avg*3)notes.push("⚠️ السعر أعلى من المعتاد");
    if(p.price<avg*0.2)notes.push("⚠️ السعر منخفض بشكل غير معتاد");
  }
  return{result:notes.length?"REVIEW":"PASS",notes};
}

function submitProduct(){
  const g=id=>document.getElementById(id).value.trim();
  const p={
    id:Date.now(),seller:role,name:g("p_name"),cat:g("p_cat"),cond:g("p_cond"),icon:g("p_icon"),
    desc:g("p_desc"),price:Number(g("p_price")),stock:Number(g("p_stock")),ship:Number(g("p_ship")),prep:g("p_prep")
  };
  if(!p.name||!p.desc||!p.prep||!(p.price>0)||!(p.stock>0)||p.ship<0||isNaN(p.ship)){
    alert("أكمل كل الحقول (السعر والكمية أكبر من صفر)");return;
  }
  const r=reviewProduct(p);
  p.status=r.result=="PASS"?"published":r.result=="REVIEW"?"pending":"blocked";
  p.notes=r.notes;
  extra.push(p); products.push(p); stock[p.id]=p.stock;
  save();
  alert(r.result=="PASS"?"🟢 تم نشر المنتج تلقائيًا":r.result=="REVIEW"?"🟡 المنتج يحتاج مراجعة بشرية:\n"+r.notes.join("\n"):"🔴 تم منع المنتج:\n"+r.notes.join("\n"));
  go("/dash");
}

// ===== إجراءات الطلب (من طرف البائع) =====
function step(no){
  const o=orders.find(x=>x.no==no); const n=NEXT[o.status];
  if(!n)return; o.status=n; o.log.push([now(),ST[n]]); save(); render();
}
function verify(no){
  const o=orders.find(x=>x.no==no);
  if(o.tries>=3){alert("تم إيقاف المحاولات. تواصل مع الإدارة.");return}
  const v=document.getElementById("c_"+no).value.trim();
  if(v===o.code){
    o.status="SETTLED";
    o.log.push([now(),"تم إدخال رمز التسليم: تم التسليم"]);
    o.log.push([now(),"بدأت تسوية البائع: "+fmt(o.net)]);
  }else{o.tries++;alert("الرمز غير صحيح. المحاولات المتبقية: "+(3-o.tries))}
  save(); render();
}

// ===== الصفحات =====
function dash(){
  const s=sellers[role];
  const mine=products.filter(p=>p.seller==role);
  const my=orders.filter(o=>o.seller==role);
  const earned=my.filter(o=>o.status=="SETTLED").reduce((a,o)=>a+o.net,0);
  const open=my.filter(o=>o.status!="SETTLED").length;

  const prodRows=mine.map(p=>`<div class="row">
      <span>${p.icon} ${esc(p.name)}</span>
      <span>${fmt(p.price)} | كمية: ${stock[p.id]}</span>
      <span class="tag ${PST[p.status][1]}">${PST[p.status][0]}</span>
    </div>${p.notes&&p.notes.length?`<p class="small">${p.notes.map(esc).join(" - ")}</p>`:""}`).join("");

  const orderRows=my.map(o=>{
    let action="";
    if(NEXT[o.status]){
      const label=o.status=="PAID"?"قبول الطلب":o.status=="SELLER_PROCESSING"?"الطلب جاهز":"خروج للتوصيل";
      action=`<button class="wide" onclick="step('${o.no}')">${label}</button>`;
    }else if(o.status=="OUT_FOR_DELIVERY"){
      action=`<div class="warn">اكتب الرمز الذي يعطيه العميل عند الاستلام</div>
      <input id="c_${o.no}" placeholder="رمز التسليم" inputmode="numeric">
      <button class="wide" onclick="verify('${o.no}')">تأكيد التسليم</button>`;
    }
    return `<div class="box">
      <div class="row"><b>${o.no}</b><span class="tag">${ST[o.status]}</span></div>
      <p class="small">👤 ${esc(o.buyer)} | 📞 ${esc(o.phone)}</p>
      <p class="small">📍 ${esc(o.addr)}</p>
      ${o.items.map(i=>`<div class="row"><span>${i.icon} ${esc(i.name)} × ${i.qty}</span><span>${fmt(i.price*i.qty)}</span></div>`).join("")}
      <div class="row small"><span>عمولة المنصة</span><span>${fmt(o.fee)}</span></div>
      <div class="row"><b>صافيك</b><b>${fmt(o.net)}</b></div>
      ${action}
      <details><summary>سجل الطلب</summary>${o.log.map(l=>`<p class="small">${l[0]} - ${l[1]}</p>`).join("")}</details>
    </div>`}).join("");

  return `<h2>🏪 لوحة البائع: ${s.name}</h2>
  <div class="stats">
    <div class="stat"><b>${mine.length}</b>منتجاتي</div>
    <div class="stat"><b>${open}</b>طلبات مفتوحة</div>
    <div class="stat"><b>${fmt(earned)}</b>مستحقات مسواة</div>
  </div>
  <div class="box"><div class="row"><h3>منتجاتي</h3><button onclick="go('/add')">+ إضافة منتج</button></div>
    ${prodRows||"<p class='small'>لا توجد منتجات</p>"}</div>
  <h3>طلباتي</h3><br>
  ${orderRows||"<div class='box'><p class='small'>لا توجد طلبات بعد</p></div>"}`;
}

function addProductPage(){
  return `<div class="box"><h2>+ إضافة منتج</h2>
    <input id="p_name" placeholder="اسم المنتج">
    <select id="p_cat">${CATS.slice(1).map(c=>`<option>${c}</option>`).join("")}</select>
    <select id="p_cond"><option>جديد</option><option>مستعمل</option></select>
    <select id="p_icon">${ICONS.map(i=>`<option>${i}</option>`).join("")}</select>
    <textarea id="p_desc" rows="3" placeholder="الوصف والمواصفات"></textarea>
    <input id="p_price" type="number" inputmode="numeric" placeholder="السعر (SDG)">
    <input id="p_stock" type="number" inputmode="numeric" placeholder="الكمية المتوفرة">
    <input id="p_ship" type="number" inputmode="numeric" placeholder="تكلفة التوصيل (SDG)">
    <input id="p_prep" placeholder="مدة التجهيز (مثال: يوم واحد)">
    <div class="warn">سيفحص النظام المنتج تلقائيًا قبل النشر.</div>
    <button class="wide" onclick="submitProduct()">نشر المنتج</button></div>`;
     }
