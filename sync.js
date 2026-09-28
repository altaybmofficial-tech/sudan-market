// ===== الاتصال بقاعدة البيانات (Supabase) =====
const SUPABASE_URL = "https://nutavxmulmtdsxykpbrs.supabase.co";
const SUPABASE_KEY = "sb_publishable_8neVPp5oxUDOSVVs8F-g6A_BkdH_UD8";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function pushProduct(p){
  return sb.from("products").upsert({
    id:p.id, seller_id:p.seller, name:p.name, icon:p.icon, cat:p.cat, cond:p.cond,
    price:p.price, ship:p.ship, stock:stock[p.id], prep:p.prep, description:p.desc,
    status:p.status, notes:p.notes||[]
  });
}
function pushOrder(o){
  return sb.from("orders").upsert({
    no:o.no, seller_id:o.seller, buyer_name:o.buyer, buyer_phone:o.phone, addr:o.addr,
    items:o.items, sub:o.sub, ship:o.ship, total:o.total, fee:o.fee, net:o.net,
    status:o.status, code:o.code, tries:o.tries,
    delivered_at:o.deliveredAt?new Date(o.deliveredAt).toISOString():null, log:o.log
  });
}

// ===== تحميل كل البيانات من قاعدة البيانات عند فتح الموقع =====
async function loadAll(){
  try{
    const [se,pr,or,rv,ds,ch,rp,au] = await Promise.all([
      sb.from("sellers").select("*"),
      sb.from("products").select("*"),
      sb.from("orders").select("*"),
      sb.from("reviews").select("*"),
      sb.from("disputes").select("*"),
      sb.from("chats").select("*").order("created_at"),
      sb.from("reports").select("*"),
      sb.from("audit_log").select("*").order("created_at",{ascending:false})
    ]);

    (se.data||[]).forEach(s=>{
      Object.assign(sellers[s.id]||(sellers[s.id]={}),{name:s.name,badge:s.badge,rating:Number(s.rating),done:s.done,area:s.area});
      sellerStatus[s.id]=s.status||"active";
    });

    products.length=0;
    for(const k in stock) delete stock[k];
    (pr.data||[]).forEach(p=>{
      products.push({id:p.id,seller:p.seller_id,name:p.name,icon:p.icon,cat:p.cat,cond:p.cond,price:Number(p.price),ship:Number(p.ship),prep:p.prep,desc:p.description,status:p.status,notes:p.notes||[]});
      stock[p.id]=p.stock;
    });

    orders.length=0;
    (or.data||[]).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).forEach(o=>{
      orders.push({no:o.no,seller:o.seller_id,items:o.items||[],sub:Number(o.sub),ship:Number(o.ship),total:Number(o.total),fee:Number(o.fee),net:Number(o.net),status:o.status,code:o.code,tries:o.tries,buyer:o.buyer_name,phone:o.buyer_phone,addr:o.addr,log:o.log||[],deliveredAt:o.delivered_at?new Date(o.delivered_at).getTime():null});
    });
    counter=orders.length;

    reviews.length=0;
    (rv.data||[]).forEach(r=>{
      reviews.push({order:r.order_no,seller:r.seller_id,prodIds:r.prod_ids||[],product:Number(r.product),match:Number(r.match),sellerStars:Number(r.seller_stars),delivery:Number(r.delivery),comment:r.comment||"",who:r.who,time:new Date(r.created_at).toLocaleDateString("ar")});
    });

    disputes.length=0;
    (ds.data||[]).forEach(d=>{
      disputes.push({id:d.id,order:d.order_no,seller:d.seller_id,reason:d.reason,text:d.text,status:d.status,note:d.note||"",info:d.info||[],refund:d.refund||null});
    });

    chats.length=0;
    (ch.data||[]).forEach(m=>{
      chats.push({thread:m.thread,kind:m.kind,name:m.name,text:m.text,time:new Date(m.created_at).toLocaleString("ar",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})});
    });

    reports.length=0;
    (rp.data||[]).forEach(r=>{
      reports.push({id:r.id,thread:r.thread,by:r.by_kind,byName:r.by_name,reason:r.reason,text:r.text,status:r.status,note:r.note||"",time:new Date(r.created_at).toLocaleString("ar")});
    });

    audit.length=0;
    (au.data||[]).forEach(a=>audit.push([new Date(a.created_at).toLocaleString("ar"),a.action]));

  }catch(e){ console.error("خطأ في تحميل البيانات:",e); }
  render();
}

// ===== ربط كل الأزرار: بعد كل عملية نرسلها لقاعدة البيانات =====
const _logAudit = logAudit;
logAudit = function(a){ _logAudit(a); sb.from("audit_log").insert({action:a}).catch(e=>console.error(e)); };

const _submitProduct = submitProduct;
submitProduct = function(){
  const before = extra.length;
  _submitProduct();
  if(extra.length>before) pushProduct(extra[extra.length-1]).catch(e=>console.error(e));
};

const _pay = pay;
pay = function(){
  const before = orders.length;
  const beforeStock = Object.assign({}, stock);
  _pay();
  const added = orders.length - before;
  if(added>0) Promise.all(orders.slice(0,added).map(pushOrder)).catch(e=>console.error(e));
  Promise.all(products.filter(p=>stock[p.id]!==beforeStock[p.id]).map(pushProduct)).catch(e=>console.error(e));
};

const _step = step;
step = function(no){ _step(no); const o=orders.find(x=>x.no==no); if(o) pushOrder(o).catch(e=>console.error(e)); };

const _verify = verify;
verify = function(no){ _verify(no); const o=orders.find(x=>x.no==no); if(o) pushOrder(o).catch(e=>console.error(e)); };

const _submitReview = submitReview;
submitReview = function(no){
  const before = reviews.length;
  _submitReview(no);
  if(reviews.length>before){
    const r = reviews[reviews.length-1];
    sb.from("reviews").upsert({order_no:r.order,seller_id:r.seller,prod_ids:r.prodIds,product:r.product,match:r.match,seller_stars:r.sellerStars,delivery:r.delivery,comment:r.comment,who:r.who},{onConflict:"order_no"}).catch(e=>console.error(e));
  }
};

const _openDispute = openDispute;
openDispute = function(no){
  const before = disputes.length;
  _openDispute(no);
  if(disputes.length>before){
    const d = disputes[disputes.length-1];
    sb.from("disputes").insert({id:d.id,order_no:d.order,seller_id:d.seller,reason:d.reason,text:d.text,status:d.status,note:d.note,info:d.info,refund:d.refund}).catch(e=>console.error(e));
  }
};
const _addInfo = addInfo;
addInfo = function(id){ _addInfo(id); const d=disputes.find(x=>x.id==id); if(d) sb.from("disputes").update({info:d.info,status:d.status}).eq("id",id).catch(e=>console.error(e)); };
const _decide = decide;
decide = function(id,act){
  _decide(id,act);
  const d = disputes.find(x=>x.id==id);
  if(d) sb.from("disputes").update({status:d.status,note:d.note,refund:d.refund}).eq("id",id).catch(e=>console.error(e));
  const o = orders.find(x=>x.no==(d&&d.order));
  if(o) pushOrder(o).catch(e=>console.error(e));
};

const _sendMsg = sendMsg;
sendMsg = function(t){
  const before = chats.length;
  _sendMsg(t);
  if(chats.length>before){
    const m = chats[chats.length-1];
    sb.from("chats").insert({thread:m.thread,kind:m.kind,name:m.name,text:m.text}).catch(e=>console.error(e));
  }
};

const _sendReport = sendReport;
sendReport = function(t){
  const before = reports.length;
  _sendReport(t);
  if(reports.length>before){
    const r = reports[reports.length-1];
    sb.from("reports").insert({id:r.id,thread:r.thread,by_kind:r.by,by_name:r.byName,reason:r.reason,text:r.text,status:r.status,note:r.note}).catch(e=>console.error(e));
  }
};
const _decideReport = decideReport;
decideReport = function(id,act){
  _decideReport(id,act);
  const r = reports.find(x=>x.id==id);
  if(r) sb.from("reports").update({status:r.status,note:r.note}).eq("id",id).catch(e=>console.error(e));
};

const _reviewDecision = reviewDecision;
reviewDecision = function(id,act){
  _reviewDecision(id,act);
  const p = products.find(x=>x.id==id);
  if(p) sb.from("products").update({status:p.status}).eq("id",id).catch(e=>console.error(e));
};

const _sellerAction = sellerAction;
sellerAction = function(id,act){ _sellerAction(id,act); sb.from("sellers").update({status:act}).eq("id",id).catch(e=>console.error(e)); };

// ===== ابدأ: حمّل كل البيانات من قاعدة البيانات =====
loadAll();
