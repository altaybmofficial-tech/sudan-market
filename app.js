function switchRole(v){
  role=v; save();
  go(v=="buyer"?"/":v=="owner"?"/owner":"/dash"); render();
}

function render(){
  const [,page,id]=location.hash.slice(1).split("/");
  const isOwner=role=="owner";
  const isSeller=role!="buyer"&&!isOwner;
  let html;
  if(page=="product")html=product(id);
  else if(page=="store")html=storePage(id);
  else if(page=="cart")html=cartPage();
  else if(page=="checkout")html=checkout();
  else if(page=="orders")html=ordersPage();
  else if(page=="account")html=account();
  else if(page=="dash"&&isSeller)html=dash();
  else if(page=="add"&&isSeller)html=addProductPage();
  else if(page=="owner"&&isOwner)html=ownerPage();
  else html=home();
  document.getElementById("app").innerHTML=html;
  document.getElementById("cnt").textContent=cart.reduce((a,c)=>a+c.qty,0);
  const dl=document.getElementById("dashlink");
  dl.style.display=(isSeller||isOwner)?"inline":"none";
  dl.textContent=isOwner?"👑 لوحة المالك":"🏪 لوحتي";
  dl.href=isOwner?"#/owner":"#/dash";
  document.getElementById("roleSel").value=role;
  window.scrollTo(0,0);
}

document.getElementById("roleSel").innerHTML=
  `<option value="buyer">👤 مشتري</option>`+
  Object.keys(sellers).map(k=>`<option value="${k}">🏪 ${sellers[k].name}</option>`).join("")+
  `<option value="owner">👑 المالك</option>`;

window.onhashchange=render;
render();
