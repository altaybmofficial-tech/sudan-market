let search="", cat="الكل";

function doSearch(){search=document.getElementById("q").value.trim();cat="الكل";go("/");render()}
function setCat(c){cat=c;search="";render()}

function addCart(id,buy){
  if(stock[id]<=0){alert("نفد المخزون");return}
  const it=cart.find(c=>c.id==id);
  if(it){if(it.qty<stock[id])it.qty++;else alert("لا توجد كمية أكثر")}else cart.push({id,qty:1});
  save(); if(buy)go("/cart");else render();
}
function qty(id,d){
  const it=cart.find(c=>c.id==id); it.qty+=d;
  if(it.qty>stock[id])it.qty=stock[id];
  if(it.qty<=0)cart=cart.filter(c=>c.id!=id);
  save(); render();
}
function readUser(){["name","phone","city","area","desc"].forEach(k=>user[k]=document.getElementById("u_"+k).value)}
function saveUser(){readUser();save();alert("تم الحفظ ✅")}

function pay(){
  readUser();
  if(!user.name||!user.phone||!user.area){alert("اكتب الاسم ورقم الهاتف والمنطقة");return}
  const groups=groupCart();
  for(const s in groups){for(const c of groups[s]){if(stock[c.id]<c.qty){alert("نفد جزء من المخزون: "+P(c.id).name);return}}}
  for(const s in groups){
    let sub=0,ship=0;
    const items=groups[s].map(c=>{const p=P(c.id);sub+=p.price*c.qty;ship=Math.max(ship,p.ship);stock[c.id]-=c.qty;return{name:p.name,icon:p.icon,price:p.price,qty:c.qty}});
    counter++;
    const total=sub+ship, fee=Math.round(sub*PLATFORM_FEE);
    orders.unshift({
      no:"SD-2026-"+String(counter).padStart(6,"0"),seller:s,items,sub,ship,total,fee,net:total-fee,
      status:"PAID",code:String(Math.floor(1000+Math.random()*9000)),tries:0,
      buyer:user.name,phone:user.phone,
      addr:user.city+" - "+user.area+(user.desc?" ("+user.desc+")":""),
      log:[[now(),"تم إنشاء الطلب"],[now(),"تم تأكيد الدفع (تجريبي) والمبلغ محجوز للطلب"]]
    });
  }
  cart=[]; save(); go("/orders");
}

// ===== الصفحات =====
function card(p){
  const s=sellers[p.seller];
  return `<div class="card">
    <div class="icon" onclick="go('/product/${p.id}')">${p.icon}</div>
    <h3 style="font-size:16px">${esc(p.name)}</h3>
    <p class="small">${s.name} ⭐ ${s.rating}</p>
    <p class="price">${fmt(p.price)}</p>
    ${stock[p.id]>0?`<button onclick="addCart(${p.id})">🛒 إضافة للسلة</button>`:`<p class="warn">نفد المخزون</p>`}
  </div>`;
}
function home(){
  const list=products.filter(p=>p.status=="published"&&(cat=="الكل"||p.cat==cat)&&(!search||(p.name+p.desc+p.cat).includes(search)));
  return `<div class="cats">${CATS.map(c=>`<div class="cat ${c==cat?"on":""}" onclick="setCat('${c}')">${c}</div>`).join("")}</div>
  <h2>${search?"نتائج البحث: "+esc(search):"منتجات مختارة"}</h2>
  <div class="grid">${list.map(card).join("")||"<p>لا توجد نتائج</p>"}</div>`;
}
function product(id){
  const p=P(id);
  if(!p||p.status!="published")return home();
  const s=sellers[p.seller];
  return `<div class="box">
    <div class="big">${p.icon}</div>
    <h2>${esc(p.name)}</h2>
    <p class="price">${fmt(p.price)}</p>
    <p>الحالة: ${esc(p.cond)}</p>
    <p>${esc(p.desc)}</p><br>
    <p>🚚 التوصيل: ${fmt(p.ship)} - داخل ${s.area}</p>
    <p>⏱️ مدة التجهيز: ${esc(p.prep)}</p>
    <p>📦 المتوفر: ${stock[p.id]} قطعة</p>
    <p>🔁 سياسة الإرجاع: تظهر هنا حسب الفئة (تحدد لاحقًا)</p><br>
    <p>البائع: <span class="link" onclick="go('/store/${p.seller}')">${s.name}</span> <span class="tag">${s.badge}</span></p><br>
    ${stock[p.id]>0?`<button class="wide" onclick="addCart(${p.id})">🛒 إضافة للسلة</button><br><br>
    <button class="wide" style="background:#fb923c" onclick="addCart(${p.id},true)">⚡ شراء الآن</button>`:`<p class="warn">نفد المخزون</p>`}
  </div>
  <h2>منتجات مشابهة</h2>
  <div class="grid">${products.filter(x=>x.status=="published"&&x.cat==p.cat&&x.id!=p.id).map(card).join("")||"<p class='small'>لا يوجد</p>"}</div>`;
}
function storePage(id){
  const s=sellers[id];
  if(!s)return home();
  return `<div class="box"><h2>🏪 ${s.name}</h2>
    <p><span class="tag">${s.badge}</span></p><br>
    <p>⭐ التقييم: ${s.rating}</p><p>✅ طلبات مكتملة: ${s.done}</p><p>📍 الموقع: ${s.area}</p></div>
  <h2>منتجات المتجر</h2>
  <div class="grid">${products.filter(p=>p.seller==id&&p.status=="published").map(card).join("")}</div>`;
}
function cartPage(){
  if(!cart.length)return `<div class="box"><h2>🛒 السلة فارغة</h2><button onclick="go('/')">تصفح المنتجات</button></div>`;
  const groups=groupCart(); let grand=0, html="";
  for(const s in groups){
    let sub=0,ship=0;
    const rows=groups[s].map(c=>{const p=P(c.id);sub+=p.price*c.qty;ship=Math.max(ship,p.ship);
      return `<div class="row"><span>${p.icon} ${esc(p.name)}</span>
      <span><button onclick="qty(${p.id},-1)">-</button> ${c.qty} <button onclick="qty(${p.id},1)">+</button></span>
      <b>${fmt(p.price*c.qty)}</b></div>`}).join("");
    grand+=sub+ship;
    html+=`<div class="box"><h3>🏪 ${sellers[s].name}</h3>${rows}
      <div class="row"><span class="small">التوصيل</span><span>${fmt(ship)}</span></div></div>`;
  }
  return `<h2>🛒 السلة</h2>${html}
  <div class="box"><div class="row"><b>الإجمالي</b><b class="price">${fmt(grand)}</b></div>
  <button class="wide" onclick="go('/checkout')">متابعة للدفع</button></div>`;
}
function userForm(){
  return `<input id="u_name" placeholder="الاسم" value="${esc(user.name)}">
    <input id="u_phone" placeholder="رقم الهاتف" value="${esc(user.phone)}">
    <input id="u_city" placeholder="المدينة" value="${esc(user.city)}">
    <input id="u_area" placeholder="المنطقة / الحي" value="${esc(user.area)}">
    <input id="u_desc" placeholder="وصف العنوان / علامة مميزة" value="${esc(user.desc)}">`;
}
function checkout(){
  if(!cart.length)return cartPage();
  const groups=groupCart(); let grand=0, lines="";
  for(const s in groups){
    let sub=0,ship=0; groups[s].forEach(c=>{const p=P(c.id);sub+=p.price*c.qty;ship=Math.max(ship,p.ship)});
    grand+=sub+ship;
    lines+=`<div class="row"><span>${sellers[s].name}</span><span>المنتجات ${fmt(sub)} + توصيل ${fmt(ship)}</span></div>`;
  }
  return `<h2>إتمام الطلب</h2>
  <div class="box"><h3>عنوان التوصيل</h3>${userForm()}</div>
  <div class="box"><h3>ملخص الطلب</h3>${lines}
    <div class="row"><b>الإجمالي النهائي</b><b class="price">${fmt(grand)}</b></div>
    <p class="small">لا توجد تكاليف مخفية. سياسة الإرجاع تظهر حسب فئة المنتج.</p></div>
  <div class="box"><h3>طريقة الدفع</h3>
    <select><option>دفع تجريبي (لا أموال حقيقية)</option></select>
    <div class="warn">⚠️ هذا دفع تجريبي فقط. لا يتم خصم أي مبلغ.</div>
    <button class="wide" onclick="pay()">✅ تأكيد الدفع التجريبي</button></div>`;
}
function ordersPage(){
  if(!orders.length)return `<div class="box"><h2>لا توجد طلبات بعد</h2></div><button onclick="resetAll()" style="background:#fca5a5">🗑️ مسح كل البيانات التجريبية</button>`;
  return `<h2>طلباتي</h2>`+orders.map(o=>`<div class="box">
      <div class="row"><b>${o.no}</b><span class="tag">${ST[o.status]}</span></div>
      <p class="small">${sellers[o.seller].name} | ${esc(o.addr)}</p>
      ${o.items.map(i=>`<div class="row"><span>${i.icon} ${esc(i.name)} × ${i.qty}</span><span>${fmt(i.price*i.qty)}</span></div>`).join("")}
      <div class="row"><span>التوصيل</span><span>${fmt(o.ship)}</span></div>
      <div class="row"><b>الإجمالي</b><b>${fmt(o.total)}</b></div>
      ${o.status!="SETTLED"?`<p class="small">رمز التسليم الخاص بك (لا تعطه إلا عند الاستلام):</p><div class="code">${o.code}</div>`:`<p class="tag">✅ تم التسليم</p>`}
      <details><summary>سجل الطلب</summary>${o.log.map(l=>`<p class="small">${l[0]} - ${l[1]}</p>`).join("")}</details>
    </div>`).join("")+`<button onclick="resetAll()" style="background:#fca5a5">🗑️ مسح كل البيانات التجريبية</button>`;
}
function account(){
  return `<div class="box"><h2>حسابي</h2>${userForm()}<button class="wide" onclick="saveUser()">حفظ</button></div>`;
      }
