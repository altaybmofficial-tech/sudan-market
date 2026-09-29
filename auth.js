let session = null;
let profile = null;

function authUI(){
  const box = document.getElementById("authBox");
  if (!session) { box.innerHTML = `<button onclick="showLogin()">تسجيل الدخول</button>`; return; }
  const label = profile ? (profile.role=="owner" ? "👑 المالك" : profile.role=="seller" ? "🏪 "+(sellers[profile.seller_id]||{}).name : "👤 "+(profile.name||"مشتري")) : "...";
  box.innerHTML = `<span class="small" style="color:#fff">${esc(label)}</span> <button onclick="doLogout()">خروج</button>`;
}

function showLogin(){ document.getElementById("app").innerHTML = loginForm("in"); window.scrollTo(0,0); }
function showLoginUp(){ document.getElementById("app").innerHTML = loginForm("up"); window.scrollTo(0,0); }

function loginForm(mode){
  return `<div class="box">
    <h2>${mode=="in"?"تسجيل الدخول":"حساب جديد"}</h2>
    <input id="au_email" type="email" placeholder="البريد الإلكتروني">
    <input id="au_pass" type="password" placeholder="كلمة السر (6 أحرف فأكثر)">
    ${mode=="up"?`
    <select id="au_role"><option value="buyer">👤 مشتري</option><option value="seller">🏪 بائع</option></select>
    <input id="au_name" placeholder="اسمك">
    <input id="au_phone" placeholder="رقم الهاتف">`:""}
    <button class="wide" onclick="${mode=="in"?"doLogin()":"doSignup()"}">${mode=="in"?"دخول":"إنشاء الحساب"}</button>
    <p class="small link" style="margin-top:8px" onclick="${mode=="in"?"showLoginUp()":"showLogin()"}">
      ${mode=="in"?"ما عندك حساب؟ إنشاء حساب جديد":"عندك حساب؟ تسجيل الدخول"}
    </p>
  </div>`;
}

async function doLogin(){
  const email=document.getElementById("au_email").value.trim();
  const pass=document.getElementById("au_pass").value;
  if(!email||!pass){alert("اكتب البريد وكلمة السر");return}
  const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
  if(error){alert("خطأ: "+error.message);return}
  await onAuthed(data.session);
}

async function doSignup(){
  const email=document.getElementById("au_email").value.trim();
  const pass=document.getElementById("au_pass").value;
  const roleChoice=document.getElementById("au_role").value;
  const name=document.getElementById("au_name").value.trim();
  const phone=document.getElementById("au_phone").value.trim();
  if(!email||!pass||pass.length<6){alert("اكتب بريدًا صحيحًا وكلمة سر 6 أحرف فأكثر");return}
  if(!name||!phone){alert("اكتب اسمك ورقم هاتفك");return}
  const {data,error}=await sb.auth.signUp({email,password:pass});
  if(error){alert("خطأ: "+error.message);return}
  const uid=data.user.id;
  let sellerId=null;
  if(roleChoice=="seller"){
    sellerId="s_"+uid.slice(0,8);
    await sb.from("sellers").insert({id:sellerId,name,area:"",status:"active"});
  }
  await sb.from("profiles").insert({id:uid,role:roleChoice,name,phone,seller_id:sellerId});
  if(data.session){ await onAuthed(data.session); }
  else{ alert("تم إنشاء الحساب ✅ سجّل الدخول الآن"); showLogin(); }
}

async function doLogout(){
  await sb.auth.signOut();
  session=null; profile=null; role="buyer";
  authUI();
  document.getElementById("app").innerHTML=`<div class="box"><h2>سجّل الدخول لمتابعة</h2><button class="wide" onclick="showLogin()">تسجيل الدخول</button></div>`;
}

async function onAuthed(s){
  session=s;
  const {data}=await sb.from("profiles").select("*").eq("id",s.user.id).single();
  profile=data;
  if(!profile) role="buyer";
  else if(profile.role=="owner") role="owner";
  else if(profile.role=="seller") role=profile.seller_id;
  else role="buyer";
  if(profile){ user.name=profile.name||""; user.phone=profile.phone||""; }
  authUI();
  await loadAll();
}

(async function initAuth(){
  const {data:{session:s}}=await sb.auth.getSession();
  if(s){ await onAuthed(s); }
  else{
    authUI();
    await loadAll();
    document.getElementById("app").innerHTML=`<div class="box"><h2>مرحبًا بك 👋</h2><p class="small">سجّل الدخول أو أنشئ حسابًا لتبدأ.</p><button class="wide" onclick="showLogin()">تسجيل الدخول / حساب جديد</button></div>`;
  }
})();
