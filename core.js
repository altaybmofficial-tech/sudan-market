// ===== الحفظ والتحميل =====
function load(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v===null?d:v}catch(e){return d}}
let cart=load("cart",[]);
let orders=load("orders",[]);
let stock=load("stock",{});
let counter=load("counter",0);
let extra=load("extra",[]);      // المنتجات التي أضافها البائعون
let role=load("role","buyer");   // buyer أو رقم البائع
let user=load("user",{name:"",phone:"",city:"الخرطوم",area:"",desc:""});
const products=baseProducts.concat(extra);
products.forEach(p=>{if(stock[p.id]===undefined)stock[p.id]=p.stock});

function save(){
  localStorage.setItem("cart",JSON.stringify(cart));
  localStorage.setItem("orders",JSON.stringify(orders));
  localStorage.setItem("stock",JSON.stringify(stock));
  localStorage.setItem("counter",JSON.stringify(counter));
  localStorage.setItem("extra",JSON.stringify(extra));
  localStorage.setItem("role",JSON.stringify(role));
  localStorage.setItem("user",JSON.stringify(user));
}

// ===== أدوات مشتركة =====
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>Number(n).toLocaleString("en-US")+" SDG";
const P=id=>products.find(p=>p.id==id);
const go=h=>{location.hash=h};
const now=()=>new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"});
const ST={PAID:"مدفوع",SELLER_PROCESSING:"البائع يجهز الطلب",READY_FOR_DELIVERY:"جاهز للتوصيل",OUT_FOR_DELIVERY:"خرج للتوصيل",DELIVERED:"تم التسليم",SETTLED:"تمت تسوية البائع"};
const NEXT={PAID:"SELLER_PROCESSING",SELLER_PROCESSING:"READY_FOR_DELIVERY",READY_FOR_DELIVERY:"OUT_FOR_DELIVERY"};

function groupCart(){
  const g={};
  cart.forEach(c=>{const p=P(c.id);(g[p.seller]=g[p.seller]||[]).push(c)});
  return g;
}
function resetAll(){
  if(confirm("مسح كل البيانات التجريبية؟")){localStorage.clear();location.hash="/";location.reload()}
}
