import { postApi, ApiError } from "./api.js";
import {
  setupShell,
  requireSession,
  regionState,
  showToast,
  showError,
  escapeHtml,
  restoreInputFocus,
  showActionLoader,
  hideActionLoader,
  hidePageLoader,
} from "./common.js";
const auth = setupShell("inventory");
if (auth) {
  const main = document.querySelector("#main-content"),
    state = {
      items: [],
      search: "",
      category: "all",
      selected: "",
      quantity: "1",
      loading: true,
    };
  const key = (item) => `${item.category}::${item.product}`;
  const normalize = (item) => ({
    product: String(item.product ?? item.商品 ?? item.name ?? "未命名商品"),
    category: String(item.category ?? item.類別 ?? ""),
    quantity: String(item.quantity ?? item.庫存 ?? 0),
    unit: String(item.unit ?? item.單位 ?? ""),
    note: String(item.note ?? item.備註 ?? ""),
  });
  const filtered = () => {
    const q = state.search.toLocaleLowerCase();
    return state.items.filter(
      (item) =>
        (state.category === "all" || item.category === state.category) &&
        (!q ||
          [item.product, item.category, item.note]
            .join(" ")
            .toLocaleLowerCase()
            .includes(q)),
    );
  };
  function render() {
    const items = filtered();
    if (!items.some((item) => key(item) === state.selected))
      state.selected = key(items[0] || { category: "", product: "" });
    const item = items.find((entry) => key(entry) === state.selected);
    const categories = [
      ...new Set(state.items.map((entry) => entry.category).filter(Boolean)),
    ].sort();
    const body = state.loading
      ? `<div class="inventory-state">載入庫存資料中…</div>`
      : state.error
        ? `<div class="inventory-state inventory-state-error">${escapeHtml(state.error)}</div>`
        : !item
          ? `<div class="inventory-state">沒有符合條件的庫存資料。</div>`
          : `<section class="inventory-adjustment"><div class="selected-product"><span class="material-icons">inventory_2</span><div><p>${escapeHtml(item.category || "未分類")}</p><h2>${escapeHtml(item.product)}</h2>${item.note ? `<small>${escapeHtml(item.note)}</small>` : ""}</div></div><div class="current-stock"><span>目前庫存</span><strong>${escapeHtml(item.quantity) || '--'}</strong><span>${escapeHtml(item.unit)}</span></div><label class="adjustment-field" for="adjustment-quantity">異動數量<input id="adjustment-quantity" type="number" min="1" step="1" value="${escapeHtml(state.quantity)}" /></label><div class="adjustment-actions"><button class="decrease-button" data-action="decrease">減少</button><button class="primary-button" data-action="increase">增加</button></div></section>`;
    main.innerHTML = `<div class="page-heading"><h1>庫存模式</h1><p>選擇${regionState().value}的商品後，調整庫存數量。</p></div><section class="inventory-toolbar inventory-toolbar--inventory"><label class="search-field" for="inventory-search"><span class="material-icons">search</span><input id="inventory-search" type="search" value="${escapeHtml(state.search)}" placeholder="搜尋商品或備註" /></label><label class="filter-field">類別<select id="inventory-category"><option value="all">全部類別</option>${categories.map((c) => `<option${state.category === c ? " selected" : ""}>${escapeHtml(c)}</option>`).join("")}</select></label><label class="filter-field inventory-product-field">商品<select id="inventory-product">${items.map((entry) => `<option value="${escapeHtml(key(entry))}"${state.selected === key(entry) ? " selected" : ""}>${escapeHtml(entry.product)}</option>`).join("")}</select></label></section>${body}`;
    bind();
  }
  function bind() {
    const search = document.querySelector("#inventory-search");
    search?.addEventListener("compositionstart", () => {
      state.composing = true;
    });
    search?.addEventListener("compositionend", (e) => {
      state.composing = false;
      state.search = e.target.value;
      state.selected = "";
      state.quantity = "1";
      render();
      restoreInputFocus("#inventory-search", state.search.length);
    });
    search?.addEventListener("input", (e) => {
      state.search = e.target.value;
      if (state.composing) return;
      state.selected = "";
      state.quantity = "1";
      render();
      restoreInputFocus("#inventory-search", state.search.length);
    });
    document
      .querySelector("#inventory-category")
      ?.addEventListener("change", (e) => {
        state.category = e.target.value;
        state.selected = "";
        render();
      });
    document
      .querySelector("#inventory-product")
      ?.addEventListener("change", (e) => {
        state.selected = e.target.value;
        render();
      });
    document
      .querySelector("#adjustment-quantity")
      ?.addEventListener("input", (e) => {
        state.quantity = e.target.value;
      });
    document
      .querySelectorAll("[data-action]")
      .forEach((button) =>
        button.addEventListener("click", () => adjust(button.dataset.action)),
      );
  }
  async function adjust(type) {
    const item = state.items.find((entry) => key(entry) === state.selected),
      quantity = Number(state.quantity),
      current = Number(item?.quantity);
    if (!item || !Number.isInteger(quantity) || quantity <= 0)
      return showToast("異動數量需為大於 0 的整數。", "error");
    if (
      type === "decrease" &&
      (!Number.isInteger(current) || quantity > current)
    )
      return showToast(
        Number.isInteger(current)
          ? `減少數量不可大於目前庫存（目前庫存：${current}）。`
          : "目前庫存不是有效數字，無法減少。",
        "error",
      );
    try {
      showActionLoader();
      await postApi("updateInventory", {
        token: auth.token,
        area: regionState().value,
        product: item.product,
        category: item.category,
        quantity,
        changeType: type,
      });
      showToast(
        type === "increase" ? "庫存已增加。" : "庫存已減少。",
        "success",
      );
      await load();
    } catch (error) {
      showError(error);
    } finally {
      hideActionLoader();
    }
  }
  async function load() {
    state.loading = true;
    render();
    try {
      const data = await postApi("getInventory", {
        token: auth.token,
        area: regionState().value,
      });
      const raw = Array.isArray(data)
        ? data
        : (data?.items ?? data?.inventory ?? []);
      state.items = raw.map(normalize);
      state.error = "";
    } catch (error) {
      state.error =
        error instanceof ApiError ? error.message : "無法載入庫存資料。";
    } finally {
      state.loading = false;
      render();
      hidePageLoader();
    }
  }
  requireSession();
  load();
}
