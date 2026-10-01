function render(){
  const [,page,id]=location.hash.slice(1).split("/");
  const isOwner=role=="owner";
  const isSeller=role!="buyer"&&!isOwner;
  const needsLogin=["dash","add","owner","checkout","orders","account"].includes(page);
  if(needsLogin&&!session){ document.getElementById("app").innerHTML=loginForm("in"); window.scrollTo(0,0); return; }
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
  const back=(typeof BACK_PAGES!=="undefined"&&BACK_PAGES.includes(page))?backBtn():"";
  document.getElementById("app").innerHTML=back+html;
  document.getElementById("cnt").textContent=cart.reduce((a,c)=>a+c.qty,0);
  const dl=document.getElementById("dashlink");
  dl.style.display=(isSeller||isOwner)?"inline":"none";
  dl.textContent=isOwner?"👑 لوحة المالك":"🏪 لوحتي";
  dl.href=isOwner?"#/owner":"#/dash";
  window.scrollTo(0,0);
}
window.onhashchange=render;
