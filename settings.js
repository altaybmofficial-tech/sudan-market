// ===== إعدادات المنصة القابلة للتعديل من لوحة المالك =====
async function loadSettings(){
  try{
    const {data}=await sb.from("platform_settings").select("*");
    (data||[]).forEach(s=>{ if(s.key=="platform_fee") PLATFORM_FEE=Number(s.value); });
  }catch(e){ console.error(e); }
}
const _loadAll3 = loadAll;
loadAll = async function(){ await _loadAll3(); await loadSettings(); render(); };

async function saveCommission(){
  const v=Number(document.getElementById("st_fee").value);
  if(!(v>=0&&v<=1)){alert("اكتب رقم بين 0 و 1 (مثال: 0.05 يعني 5%)");return}
  const {error}=await sb.from("platform_settings").upsert({key:"platform_fee",value:String(v)});
  if(error){alert("خطأ: "+error.message);return}
  PLATFORM_FEE=v;
  logAudit("غيّر المالك عمولة المنصة إلى "+(v*100)+"%");
  alert("تم الحفظ ✅");
  render();
}

const _ownerPage3 = ownerPage;
ownerPage = function(){
  const box=`<h3>⚙️ إعدادات المنصة</h3><br>
    <div class="box"><h4>عمولة المنصة</h4>
      <p class="small">القيمة الحالية: ${(PLATFORM_FEE*100).toFixed(1)}%</p>
      <input id="st_fee" type="number" step="0.01" min="0" max="1" value="${PLATFORM_FEE}" placeholder="مثال: 0.05 = 5%">
      <button class="wide" onclick="saveCommission()">حفظ العمولة</button>
    </div>`;
  return _ownerPage3()+box;
};

// ===== زر الرجوع في أعلى كل صفحة فرعية =====
function goBack(){ if(history.length>1) history.back(); else go("/"); }
const BACK_PAGES = ["product","store","dash","add","owner","cart","checkout","orders","account"];
function backBtn(){ return `<div class="box" style="padding:10px"><span class="link" onclick="goBack()">→ رجوع</span></div>`; }
