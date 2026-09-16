import { postApi, ApiError } from "./api.js";
import {
  setupShell,
  regionState,
  showToast,
  showError,
  escapeHtml,
  restoreInputFocus,
  showActionLoader,
  hideActionLoader,
  hidePageLoader,
} from "./common.js";
const auth = setupShell("audit");
if (auth) {
  const main = document.querySelector("#main-content"),
    state = {
      items: [],
      category: "all",
      search: "",
      actual: {},
      loading: true,
      saving: false,
    };
  const key = (item) => `${item.category}::${item.product}`;
  const normalize = (item) => ({
    product: String(item.product ?? item.商品 ?? item.name ?? "未命名商品"),
    category: String(item.category ?? item.類別 ?? ""),
    quantity: String(item.quantity ?? item.庫存 ?? 0),
    unit: String(item.unit ?? item.單位 ?? ""),
    note: String(item.note ?? item.備註 ?? ""),
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
      categories = [
        ...new Set(state.items.map((x) => x.category).filter(Boolean)),
      ].sort();
    const rows = items
      .map(
        (x) =>
          `<article class="audit-row"><div class="audit-row-main"><p>${escapeHtml(x.category || "未分類")}</p><h3>${escapeHtml(x.product)}</h3>${x.note ? `<small>${escapeHtml(x.note)}</small>` : ""}</div><div class="audit-row-input"><label class="adjustment-field">實際盤點<input type="number" min="0" step="1" value="${escapeHtml(state.actual[key(x)] ?? "")}" data-quantity="${escapeHtml(key(x))}" /></label><div class="audit-stock"><span>目前庫存</span><strong>${escapeHtml(x.quantity) || '--'}</strong><small>${escapeHtml(x.unit)}</small></div></div></article>`,
      )
      .join("");
    main.innerHTML = `<div class="page-heading"><h1>盤點模式</h1><p>依${regionState().value}的區域與類別批次輸入實際庫存。</p></div><section class="inventory-toolbar inventory-toolbar--audit"><label class="filter-field">類別<select id="audit-category"><option value="all">全部類別</option>${categories.map((c) => `<option${state.category === c ? " selected" : ""}>${escapeHtml(c)}</option>`).join("")}</select></label><label class="search-field"><span class="material-icons">search</span><input id="audit-search" type="search" value="${escapeHtml(state.search)}" placeholder="搜尋商品" /></label><button class="primary-button audit-save-button" id="save-audit">儲存盤點</button></section>${state.loading ? `<div class="inventory-state">載入盤點資料中…</div>` : `<section class="audit-list card"><div class="audit-list-head"><h2>盤點清單</h2><span>${items.length} 項</span></div><div class="audit-grid">${rows || `<div class="inventory-state">沒有符合條件的盤點資料。</div>`}</div></section>`}`;
    const search = document.querySelector("#audit-search");
    search?.addEventListener("compositionstart", () => {
      state.composing = true;
    });
    search?.addEventListener("compositionend", (e) => {
      state.composing = false;
      state.search = e.target.value;
      render();
      restoreInputFocus("#audit-search", state.search.length);
    });
    search?.addEventListener("input", (e) => {
      state.search = e.target.value;
      if (state.composing) return;
      render();
      restoreInputFocus("#audit-search", state.search.length);
    });
    document
      .querySelector("#audit-category")
      ?.addEventListener("change", (e) => {
        state.category = e.target.value;
        render();
      });
    document.querySelectorAll("[data-quantity]").forEach((input) =>
      input.addEventListener("input", (e) => {
        state.actual[e.target.dataset.quantity] = e.target.value;
      }),
    );
    document.querySelector("#save-audit")?.addEventListener("click", save);
  }
  async function load() {
    try {
      const data = await postApi("getInventory", {
        token: auth.token,
        area: regionState().value,
      });
      const raw = Array.isArray(data)
        ? data
        : (data?.items ?? data?.inventory ?? []);
      state.items = raw.map(normalize);
    } catch (error) {
      state.error =
        error instanceof ApiError ? error.message : "無法載入盤點資料。";
    } finally {
    state.loading = false;
    render();
    hidePageLoader();
    }
  }
  async function save() {
    const items = state.items
      .map((x) => ({
        product: x.product,
        quantity: Number.parseInt(state.actual[key(x)] ?? x.quantity, 10),
      }))
      .filter((x) => Number.isInteger(x.quantity) && x.quantity >= 0);
    if (!items.length)
      return showToast("盤點數量需為 0 或以上的整數。", "error");
    try {
      showActionLoader();
      await postApi("auditInventory", {
        token: auth.token,
        area: regionState().value,
        items: JSON.stringify(items),
      });
      showToast("盤點已儲存。", "success");
      await load();
    } catch (error) {
      showError(error);
    } finally {
      hideActionLoader();
    }
  }
  load();
}
