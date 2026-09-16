import { postApi, ApiError } from "./api.js";
import {
  setupShell,
  regionState,
  session,
  showError,
  escapeHtml,
  restoreInputFocus,
  hidePageLoader,
} from "./common.js";
const auth = setupShell("shopping", { publicPage: true });
if (!auth)
  document
    .querySelectorAll(
      '.region-select, [data-logout], .desktop-nav a:not([href="shopping.html"])',
    )
    .forEach((element) => {
      element.hidden = true;
    });
const state = {
  items: [],
  category: "all",
  search: "",
  checked: {},
  loading: true,
};
const formatOtherArea = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "object" || Array.isArray(value)) return String(value);
  const entries = Object.entries(value).filter(([, quantity]) => quantity !== null && quantity !== undefined && quantity !== "");
  return entries.map(([area, quantity]) => `${area} ${quantity}`).join(" · ");
};
const normalize = (x) => ({
  product: String(x.商品 ?? x.product ?? x.name ?? "未命名商品"),
  category: String(x.類別 ?? x.category ?? ""),
  quantity: String(x.庫存 ?? x.quantity ?? 0),
  safety: String(x.安全存量 ?? x.safetyStock ?? x.安全庫存 ?? 0),
  purchaseMethod: String(x.購買途徑 ?? x.purchaseMethod ?? "").trim(),
  other: formatOtherArea(
    x.其他區域 ??
      x.otherAreaQuantity ??
      x.另一區庫存 ??
      x.otherAreaStock ??
      x.otherQuantity,
  ),
  note: String(x.備註 ?? x.note ?? ""),
  key: `${x.商品 ?? x.product ?? x.name}::${x.類別 ?? x.category ?? ""}`,
});
function render() {
  const q = state.search.toLocaleLowerCase(),
    items = state.items.filter(
      (x) =>
        (state.category === "all" || x.category === state.category) &&
        (!q ||
          [x.product, x.category, x.note]
            .join(" ")
            .toLocaleLowerCase()
            .includes(q)),
    ),
    cats = [
      ...new Set(state.items.map((x) => x.category).filter(Boolean)),
    ].sort();
  const rows = items
    .map(
      (x) =>
        `<article class="shopping-row${x.other ? " shopping-row--has-other" : ""}${x.purchaseMethod ? " shopping-row--has-purchase" : ""}"><label class="shopping-check"><input type="checkbox" data-check="${escapeHtml(x.key)}"${state.checked[x.key] ? " checked" : ""} /><span class="sr-only">標記 ${escapeHtml(x.product)} 為已購買</span></label><div class="shopping-main"><p>${escapeHtml(x.category || "未分類")}</p><h3>${escapeHtml(x.product)}</h3></div><div class="shopping-quantity"><span>數量/庫存</span><strong>${escapeHtml(x.quantity) || '--'}  / ${escapeHtml(x.safety)}</strong></div>${x.purchaseMethod ? `<div class="shopping-purchase"><span class="material-icons" aria-hidden="true">shopping_cart</span><strong>${escapeHtml(x.purchaseMethod)}</strong></div>` : ""}${x.other ? `<div class="shopping-other"><strong>${escapeHtml(x.other)}</strong></div>` : ""}</article>`,
    )
    .join("");
  document.querySelector("#main-content").innerHTML =
    `<div class="page-heading"><h1>購買清單</h1><p>依${regionState().value}顯示低於安全庫存的待補貨商品。</p></div><section class="shopping-toolbar shopping-toolbar--shopping"><label class="filter-field">類別<select id="shopping-category"><option value="all">全部類別</option>${cats.map((c) => `<option${state.category === c ? " selected" : ""}>${escapeHtml(c)}</option>`).join("")}</select></label><label class="search-field"><span class="material-icons">search</span><input id="shopping-search" type="search" value="${escapeHtml(state.search)}" placeholder="搜尋商品" /></label><div class="shopping-summary-text">待補貨 ${items.length} 項</div></section><section class="shopping-list card"><div class="shopping-list-head"><h2>${regionState().value} 待補貨清單</h2></div><div class="shopping-grid">${state.loading ? `<div class="inventory-state">載入購買清單中…</div>` : rows || `<div class="inventory-state">目前沒有需要補貨的商品。</div>`}</div></section>`;
  const search = document.querySelector("#shopping-search");
  search?.addEventListener("compositionstart", () => {
    state.composing = true;
  });
  search?.addEventListener("compositionend", (e) => {
    state.composing = false;
    state.search = e.target.value;
    render();
    restoreInputFocus("#shopping-search", state.search.length);
  });
  search?.addEventListener("input", (e) => {
    state.search = e.target.value;
    if (state.composing) return;
    render();
    restoreInputFocus("#shopping-search", state.search.length);
  });
  document
    .querySelector("#shopping-category")
    ?.addEventListener("change", (e) => {
      state.category = e.target.value;
      render();
    });
  document.querySelectorAll("[data-check]").forEach((x) =>
    x.addEventListener("change", (e) => {
      state.checked[e.target.dataset.check] = e.target.checked;
      render();
    }),
  );
}
async function load() {
  try {
    const payload = { area: regionState().value };
    if (session()?.token) payload.token = session().token;
    const data = await postApi("getShoppingList", payload);
    const raw = Array.isArray(data)
      ? data
      : (data?.items ?? data?.shoppingList ?? data?.list ?? []);
    state.items = raw.map(normalize);
  } catch (error) {
    showError(
      error instanceof ApiError ? error : new Error("無法載入購買清單。"),
    );
  } finally {
    state.loading = false;
    render();
    hidePageLoader();
  }
}
render();
load();
