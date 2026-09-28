// ===== التقييمات: فقط للطلبات المكتملة، مرة واحدة لكل طلب =====
let reviews = load("reviews", []);
function saveReviews(){ localStorage.setItem("reviews", JSON.stringify(reviews)); }

const avg = (arr, k) => arr.length ? (arr.reduce((a, r) => a + r[k], 0) / arr.length) : 0;
const starsTxt = n => "⭐".repeat(Math.round(n)) + " (" + n.toFixed(1) + ")";
const starOpts = `<option value="5">⭐⭐⭐⭐⭐ ممتاز</option><option value="4">⭐⭐⭐⭐ جيد</option><option value="3">⭐⭐⭐ متوسط</option><option value="2">⭐⭐ سيئ</option><option value="1">⭐ سيئ جدًا</option>`;

function submitReview(no){
  const o = orders.find(x => x.no == no);
  if (!o || o.status != "SETTLED") { alert("التقييم متاح فقط بعد التسليم"); return; }
  if (reviews.some(r => r.order == no)) { alert("تم تقييم هذا الطلب سابقًا"); return; }
  const v = id => Number(document.getElementById(id + "_" + no).value);
  const prodIds = o.items.map(i => (products.find(p => p.name == i.name) || {}).id).filter(Boolean);
  reviews.push({
    order: no, seller: o.seller, prodIds,
    product: v("r_prod"), match: v("r_match"), sellerStars: v("r_sel"), delivery: v("r_del"),
    comment: document.getElementById("r_txt_" + no).value.trim(),
    who: (o.buyer || "عميل").split(" ")[0],
    time: new Date().toLocaleDateString("ar")
  });
  saveReviews();
  alert("شكرًا لتقييمك ✅");
  render();
}

// ---- قسم التقييم أسفل صفحة الطلبات ----
const _ordersPage = ordersPage;
ordersPage = function () {
  const base = _ordersPage();
  const done = orders.filter(o => o.status == "SETTLED");
  if (!done.length) return base;
  const list = done.map(o => {
    const rv = reviews.find(r => r.order == o.no);
    if (rv) return `<div class="box"><b>${o.no}</b> <span class="tag">تم تقييمك ✅</span>
      <p class="small">المنتج ${starsTxt(rv.product)} | الوصف ${starsTxt(rv.match)}</p>
      <p class="small">البائع ${starsTxt(rv.sellerStars)} | التوصيل ${starsTxt(rv.delivery)}</p></div>`;
    return `<div class="box"><b>${o.no}</b> - ${esc(sellers[o.seller].name)}
      <p class="small">المنتج</p><select id="r_prod_${o.no}">${starOpts}</select>
      <p class="small">مطابقة الوصف</p><select id="r_match_${o.no}">${starOpts}</select>
      <p class="small">البائع</p><select id="r_sel_${o.no}">${starOpts}</select>
      <p class="small">تجربة التوصيل</p><select id="r_del_${o.no}">${starOpts}</select>
      <textarea id="r_txt_${o.no}" rows="2" placeholder="تعليقك (اختياري)"></textarea>
      <button class="wide" onclick="submitReview('${o.no}')">إرسال التقييم</button></div>`;
  }).join("");
  return base + `<h2>⭐ قيّم طلباتك المكتملة</h2>` + list;
};

// ---- تقييمات صفحة المنتج ----
const _product = product;
product = function (id) {
  const html = _product(id);
  const p = P(id);
  if (!p || p.status != "published") return html;
  const rs = reviews.filter(r => r.prodIds.includes(p.id));
  const body = rs.length
    ? `<p>المنتج: ${starsTxt(avg(rs, "product"))}</p>
       <p>مطابقة الوصف: ${starsTxt(avg(rs, "match"))}</p>
       <p class="small">عدد التقييمات: ${rs.length}</p><br>` +
      rs.filter(r => r.comment).slice(-5).reverse().map(r =>
        `<div class="row"><span>${esc(r.who)}: ${esc(r.comment)}</span><span class="small">${r.time}</span></div>`).join("")
    : `<p class="small">لا توجد تقييمات بعد</p>`;
  return html + `<div class="box"><h2>التقييمات</h2>${body}</div>`;
};

// ---- تقييمات صفحة المتجر ----
const _storePage = storePage;
storePage = function (id) {
  const html = _storePage(id);
  if (!sellers[id]) return html;
  const rs = reviews.filter(r => r.seller == id);
  const body = rs.length
    ? `<p>البائع: ${starsTxt(avg(rs, "sellerStars"))}</p>
       <p>التوصيل: ${starsTxt(avg(rs, "delivery"))}</p>
       <p class="small">عدد التقييمات: ${rs.length}</p>`
    : `<p class="small">لا توجد تقييمات من العملاء بعد</p>`;
  return `<div class="box"><h3>تقييمات العملاء</h3>${body}</div>` + html;
};
