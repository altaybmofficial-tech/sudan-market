// ===== نظام تحقق هوية البائع (KYC/KYB) =====
const VST = {
  PENDING_REVIEW: ["قيد المراجعة 🟡","y"],
  VERIFIED: ["موثّق ✅",""],
  REJECTED: ["مرفوض 🔴","r"],
  MORE_INFO: ["مطلوب معلومات إضافية 🟠","y"]
};

async function loadVerificationExtra(){
  try{
    const {data}=await sb.from("sellers").select(
      "id,verification_status,verification_reason,verification_submitted,seller_type,legal_name,phone,email,city,address,id_type,id_number,id_image_url,biz_name,biz_rep,biz_doc_number,biz_address,biz_phone,biz_doc_url"
    );
    (data||[]).forEach(s=>{
      const sel=sellers[s.id]; if(!sel) return;
      sel.verifStatus=s.verification_status||"PENDING_REVIEW";
      sel.verifReason=s.verification_reason||"";
      sel.verifSubmitted=!!s.verification_submitted;
      sel.sellerType=s.seller_type||"individual";
      sel.legalName=s.legal_name||""; sel.phone=s.phone||""; sel.email=s.email||"";
      sel.city=s.city||""; sel.address=s.address||"";
      sel.idType=s.id_type||""; sel.idNumber=s.id_number||""; sel.idImageUrl=s.id_image_url||"";
      sel.bizName=s.biz_name||""; sel.bizRep=s.biz_rep||""; sel.bizDocNumber=s.biz_doc_number||"";
      sel.bizAddress=s.biz_address||""; sel.bizPhone=s.biz_phone||""; sel.bizDocUrl=s.biz_doc_url||"";
    });
  }catch(e){ console.error(e); }
}
const _loadAll5 = loadAll;
loadAll = async function(){ await _loadAll5(); await loadVerificationExtra(); render(); };

// منع نشر منتج قبل اكتمال التحقق
const _submitProductV = submitProduct;
submitProduct = function(){
  const s=sellers[role];
  if(s && s.verifStatus!=="VERIFIED"){ alert("لا يمكنك إضافة منتجات قبل اكتمال توثيق حسابك. أكمل استمارة التحقق في الأسفل."); return; }
  _submitProductV();
};

function toggleVerifType(){
  const t=document.getElementById("vf_type").value;
  document.getElementById("vf_individual").style.display = t=="individual"?"block":"none";
  document.getElementById("vf_business").style.display = t=="business"?"block":"none";
}

async function submitVerification(){
  const s=sellers[role];
  const type=document.getElementById("vf_type").value;
  const g=id=>document.getElementById(id).value.trim();
  const file=document.getElementById("vf_file").files[0];
  const payload={seller_type:type, verification_submitted:true, verification_status:"PENDING_REVIEW", verification_reason:null};

  if(type=="individual"){
    const legalName=g("vf_name"), phone=g("vf_phone"), city=g("vf_city"), address=g("vf_address"), idNumber=g("vf_idnum");
    if(!legalName||!phone||!city||!address||!idNumber){alert("أكمل كل الحقول المطلوبة");return}
    let imageUrl=s.idImageUrl||"";
    if(!file && !imageUrl){alert("ارفع صورة وثيقة الهوية");return}
    if(file){
      const path=role+"/"+Date.now()+"-"+file.name.replace(/[^a-zA-Z0-9.]/g,"_");
      const {error:upErr}=await sb.storage.from("verifications").upload(path,file);
      if(upErr){alert("فشل رفع الصورة: "+upErr.message);return}
      imageUrl=sb.storage.from("verifications").getPublicUrl(path).data.publicUrl;
    }
    Object.assign(payload,{legal_name:legalName,phone,email:g("vf_email"),city,address,id_type:g("vf_idtype"),id_number:idNumber,id_image_url:imageUrl});
  }else{
    const bizName=g("vf_bizname"), rep=g("vf_bizrep"), docNum=g("vf_bizdoc"), bizAddress=g("vf_bizaddr"), bizPhone=g("vf_bizphone");
    if(!bizName||!rep||!docNum||!bizAddress||!bizPhone){alert("أكمل كل حقول النشاط");return}
    let imageUrl=s.bizDocUrl||"";
    if(!file && !imageUrl){alert("ارفع صورة مستند النشاط");return}
    if(file){
      const path=role+"/"+Date.now()+"-"+file.name.replace(/[^a-zA-Z0-9.]/g,"_");
      const {error:upErr}=await sb.storage.from("verifications").upload(path,file);
      if(upErr){alert("فشل رفع الصورة: "+upErr.message);return}
      imageUrl=sb.storage.from("verifications").getPublicUrl(path).data.publicUrl;
    }
    Object.assign(payload,{biz_name:bizName,biz_rep:rep,biz_doc_number:docNum,biz_address:bizAddress,biz_phone:bizPhone,biz_doc_url:imageUrl});
  }

  const {error}=await sb.from("sellers").update(payload).eq("id",role);
  if(error){alert("خطأ: "+error.message);return}
  Object.assign(s,{
    sellerType:type, verifSubmitted:true, verifStatus:"PENDING_REVIEW", verifReason:"",
    legalName:payload.legal_name??s.legalName, phone:payload.phone??s.phone, email:payload.email??s.email,
    city:payload.city??s.city, address:payload.address??s.address, idType:payload.id_type??s.idType,
    idNumber:payload.id_number??s.idNumber, idImageUrl:payload.id_image_url??s.idImageUrl,
    bizName:payload.biz_name??s.bizName, bizRep:payload.biz_rep??s.bizRep, bizDocNumber:payload.biz_doc_number??s.bizDocNumber,
    bizAddress:payload.biz_address??s.bizAddress, bizPhone:payload.biz_phone??s.bizPhone, bizDocUrl:payload.biz_doc_url??s.bizDocUrl
  });
  alert("تم إرسال طلب التحقق ✅ بانتظار مراجعة الإدارة");
  render();
}

function verificationBox(){
  const s=sellers[role]; if(!s) return "";
  const st=s.verifStatus||"PENDING_REVIEW";
  if(st==="VERIFIED") return `<div class="box"><div class="row"><h3>التحقق من الهوية</h3><span class="tag">✅ موثّق</span></div></div>`;
  const reasonBox = s.verifReason ? `<div class="warn">📩 ملاحظة الإدارة: ${esc(s.verifReason)}</div>` : "";
  const statusTag = s.verifSubmitted ? `<span class="tag ${VST[st][1]}">${VST[st][0]}</span>` : `<span class="tag y">لم تُرسل بعد</span>`;
  return `<div class="box"><div class="row"><h3>🪪 التحقق من الهوية (مطلوب قبل البيع)</h3>${statusTag}</div>
    ${reasonBox}
    <select id="vf_type" onchange="toggleVerifType()">
      <option value="individual" ${s.sellerType!="business"?"selected":""}>فرد</option>
      <option value="business" ${s.sellerType=="business"?"selected":""}>متجر / شركة</option>
    </select>
    <div id="vf_individual" style="display:${s.sellerType!="business"?"block":"none"}">
      <input id="vf_name" placeholder="الاسم الكامل" value="${esc(s.legalName||"")}">
      <input id="vf_phone" placeholder="رقم الهاتف" value="${esc(s.phone||"")}">
      <input id="vf_email" placeholder="البريد الإلكتروني (اختياري)" value="${esc(s.email||"")}">
      <input id="vf_city" placeholder="المدينة" value="${esc(s.city||"")}">
      <input id="vf_address" placeholder="العنوان / موقع الاستلام" value="${esc(s.address||"")}">
      <select id="vf_idtype"><option ${s.idType=="بطاقة وطنية"?"selected":""}>بطاقة وطنية</option><option ${s.idType=="جواز سفر"?"selected":""}>جواز سفر</option><option ${s.idType=="رخصة قيادة"?"selected":""}>رخصة قيادة</option></select>
      <input id="vf_idnum" placeholder="رقم الوثيقة" value="${esc(s.idNumber||"")}">
    </div>
    <div id="vf_business" style="display:${s.sellerType=="business"?"block":"none"}">
      <input id="vf_bizname" placeholder="اسم النشاط" value="${esc(s.bizName||"")}">
      <input id="vf_bizrep" placeholder="اسم الشخص المسؤول" value="${esc(s.bizRep||"")}">
      <input id="vf_bizdoc" placeholder="رقم تسجيل النشاط" value="${esc(s.bizDocNumber||"")}">
      <input id="vf_bizaddr" placeholder="عنوان النشاط" value="${esc(s.bizAddress||"")}">
      <input id="vf_bizphone" placeholder="هاتف النشاط" value="${esc(s.bizPhone||"")}">
    </div>
    <p class="small">صورة الوثيقة / مستند النشاط ${(s.idImageUrl||s.bizDocUrl)?"(تم الرفع، اختر ملفًا جديدًا لاستبدالها)":""}:</p>
    <input id="vf_file" type="file" accept="image/*">
    <button class="wide" onclick="submitVerification()">📤 إرسال طلب التحقق</button>
  </div>`;
}
const _dashV = dash;
dash = function(){ return verificationBox() + _dashV(); };

// ---- لوحة المالك: مراجعة طلبات التحقق ----
async function decideVerification(id,action){
  const noteEl=document.getElementById("vn_"+id);
  const note=noteEl?noteEl.value.trim():"";
  if(action!="verify" && !note){alert("اكتب سبب القرار / الملاحظة");return}
  const payload = action=="verify" ? {verification_status:"VERIFIED", verification_reason:null}
    : action=="reject" ? {verification_status:"REJECTED", verification_reason:note}
    : {verification_status:"MORE_INFO", verification_reason:note};
  const {error}=await sb.from("sellers").update(payload).eq("id",id);
  if(error){alert("خطأ: "+error.message);return}
  const s=sellers[id]; if(s){ s.verifStatus=payload.verification_status; s.verifReason=payload.verification_reason||""; }
  logAudit("قرار توثيق البائع «"+(s?s.name:id)+"»: "+VST[payload.verification_status][0]);
  render();
}

const _ownerPage5 = ownerPage;
ownerPage = function(){
  const pending = Object.keys(sellers).filter(id=>sellers[id].verifSubmitted && sellers[id].verifStatus!=="VERIFIED" && sellers[id].verifStatus!=="REJECTED");
  const cards = pending.map(id=>{
    const s=sellers[id];
    const fileUrl = s.sellerType=="business" ? s.bizDocUrl : s.idImageUrl;
    const details = s.sellerType=="business"
      ? `<p class="small">النشاط: ${esc(s.bizName)} | المسؤول: ${esc(s.bizRep)}</p><p class="small">رقم التسجيل: ${esc(s.bizDocNumber)} | العنوان: ${esc(s.bizAddress)} | الهاتف: ${esc(s.bizPhone)}</p>`
      : `<p class="small">${esc(s.legalName)} | ${esc(s.phone)} | ${esc(s.city)}</p><p class="small">${esc(s.idType)}: ${esc(s.idNumber)} | ${esc(s.address)}</p>`;
    return `<div class="box">
      <div class="row"><b>${esc(s.name)}</b><span class="tag ${VST[s.verifStatus][1]}">${VST[s.verifStatus][0]}</span></div>
      ${details}
      ${fileUrl?`<a href="${fileUrl}" target="_blank"><img src="${fileUrl}" style="max-width:100%;border-radius:8px;margin:8px 0"></a>`:"<p class='small'>لا يوجد مستند مرفوع</p>"}
      <textarea id="vn_${id}" rows="2" placeholder="سبب القرار (مطلوب للرفض أو طلب المعلومات)"></textarea>
      <div class="row">
        <button onclick="decideVerification('${id}','verify')">✅ توثيق</button>
        <button style="background:#fca5a5" onclick="decideVerification('${id}','reject')">❌ رفض</button>
      </div><br>
      <button class="wide" style="background:#e5e7eb" onclick="decideVerification('${id}','more')">❓ طلب معلومات إضافية</button>
    </div>`;
  }).join("");
  return `<h3>🪪 طلبات توثيق البائعين</h3><br>${cards||"<div class='box'><p class='small'>لا توجد طلبات</p></div>"}`+_ownerPage5();
};
