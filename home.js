import { postApi } from "./api.js";
import { setupShell, regionState, session, escapeHtml, hidePageLoader } from "./common.js";
const auth = setupShell("home");
if (auth) {
  const main = document.querySelector("#main-content");
  main.innerHTML = `<div class="page-heading"><h1>你好，${escapeHtml(auth.name)}</h1><p>${regionState().value}的日用品庫存概況。</p></div><section class="dashboard-grid"><article class="dashboard-card dashboard-card-primary"><span class="material-icons dashboard-icon">location_on</span><p>目前區域</p><strong>${regionState().value}</strong><span>可從右上角切換區域</span></article><article class="dashboard-card"><span class="material-icons dashboard-icon">shopping_cart</span><p>待補貨</p><strong id="shopping-count">—</strong><span>目前區域的待補貨品項</span></article></section><p class="notice"><span class="material-icons">info</span>請使用上方導覽進行庫存異動、盤點或查看購買清單。</p>`;
  hidePageLoader();
  postApi("getShoppingList", { area: regionState().value, token: session().token }).then((data) => { const items = Array.isArray(data) ? data : (data?.items ?? data?.shoppingList ?? data?.list ?? []); document.querySelector("#shopping-count").textContent = items.length; }).catch(() => {});
}
