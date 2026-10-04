// ===== سياسة الإرجاع حسب الفئة + قائمة المنتجات الممنوعة =====
let returnPolicies = {};
let bannedPolicyText = "";

async function loadPolicies(){
  try{
    const [rp, bp] = await Promise.all([
      sb.from("return_policies").select("*"),
      sb.from("platform_settings").select("*").eq("key","banned_products_policy").single()
    ]);
    returnPolicies = {};
    (rp.data||[]).forEach(r=>{ returnPolicies[r.category] = {days:Number(r.days), note:r.note||""}; });
    bannedPolicyText = bp.data ? bp.data.value : "";
  }catch(e){ console.error(e); }
}
const _loadAll4 = loadAll;
loadAll = async function(){ await _loadAll4(); await loadPolicies(); render(); };

function returnText(cat){
  const r = returnPolicies[cat];
  if(!r) return "تُحدَّد حسب سياسة المنصة";
  if(r.days <= 0) return "غير قابل للإرجاع";
  if(r.days < 1) return "خلال 24 ساعة من الاستلام";
  return "خلال "+r.days+" يوم من الاستلام";
}

// عرض سياسة الإرجاع في صفحة المنتج
const _productPolicy = product;
product = function(id){
  const html=_productPolicy(id);
  const p=P(id);
  if(!p) return html;
  return html.replace("🔁 سياسة الإرجاع: تظهر هنا حسب الفئة (تحدد لاحقًا)", "🔁 سياسة الإرجاع: "+returnText(p.cat));
};

// لوحة المالك: تعديل سياسات الإرجاع والمنتجات الممنوعة
async function saveReturnDays(cat){
  const id="rd_"+cat.replace(/[^a-zA-Z0-9]/g,"_");
  let raw=document.getElementById(id).value.trim().replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d));
  const v=Number(raw);
  if(isNaN(v)||v<0){alert("اكتب رقم أيام صحيح (0 = غير قابل للإرجاع)");return}
  const {error}=await sb.from("return_policies").upsert({category:cat, days:v, note:returnPolicies[cat]?.note||""});
  if(error){alert("خطأ: "+error.message);return}
  returnPolicies[cat]={days:v, note:returnPolicies[cat]?.note||""};
  logAudit("غيّر المالك مدة إرجاع «"+cat+"» إلى "+v+" يوم");
  alert("تم الحفظ ✅");
}

async function saveBannedPolicy(){
  const text=document.getElementById("st_banned").value.trim();
  const {error}=await sb.from("platform_settings").upsert({key:"banned_products_policy",value:text});
  if(error){alert("خطأ: "+error.message);return}
  bannedPolicyText=text;
  logAudit("عدّل المالك قائمة المنتجات الممنوعة");
  alert("تم الحفظ ✅");
}

const _ownerPage4 = ownerPage;
ownerPage = function(){
  const rpRows = CATS.slice(1).map(c=>{
    const r=returnPolicies[c]||{days:7};
    const id="rd_"+c.replace(/[^a-zA-Z0-9]/g,"_");
    return `<div class="row"><span>${c}</span>
      <input id="${id}" type="text" inputmode="decimal" style="width:80px;margin:0" value="${r.days}">
      <button onclick="saveReturnDays('${c}')">حفظ</button></div>`;
  }).join("");
  const box=`<h3>↩️ سياسة الإرجاع حسب الفئة (بالأيام، 0 = غير قابل للإرجاع)</h3><br>
    <div class="box">${rpRows}</div>
    <h3>🚫 قائمة المنتجات الممنوعة (نص يظهر للعامة)</h3><br>
    <div class="box">
      <textarea id="st_banned" rows="5">${esc(bannedPolicyText)}</textarea>
      <button class="wide" onclick="saveBannedPolicy()">حفظ القائمة</button>
    </div>`;
  return _ownerPage4()+box;
};
