import { postApi, ApiError } from "./api.js";
import { setupShell, showToast, showError, escapeHtml, restoreInputFocus, showActionLoader, hideActionLoader, hidePageLoader } from "./common.js";
const auth = setupShell("safety-stock");
if (auth) {
  const main = document.querySelector("#main-content"),
    state = {
      items: [],
      category: "all",
      status: "all",
      search: "",
      dirty: {},
      loading: true,
    };
  const normalize = (x) => ({
    product: String(x.product ?? x.商品 ?? x.name ?? "未命名商品"),
    category: String(x.category ?? x.類別 ?? "未分類"),
    safety: String(
      x.safetyStock ?? x.安全庫存 ?? x.安全存量 ?? x.minStock ?? 0,
    ),
    status: String(x.status ?? x.managementStatus ?? x.管理狀態 ?? ""),
  });
  function render() {
    const q = state.search.toLocaleLowerCase(),
      items = state.items.filter(
        (x) =>
          (state.category === "all" || x.category === state.category) &&
          (state.status === "all" || x.status === state.status) &&
          (!q ||
            [x.product, x.category].join(" ").toLocaleLowerCase().includes(q)),
      ),
      cats = [
        ...new Set(state.items.map((x) => x.category).filter(Boolean)),
      ].sort();
    const rows = items
      .map(
        (x) =>
          `<article class="safety-stock-row${x.status === "暫停" ? " safety-stock-row--paused" : x.status === "封存" ? " safety-stock-row--archived" : ""}${state.dirty[x.product] ? " safety-stock-row--modified" : ""}"><div class="safety-stock-title"><h3>${escapeHtml(x.product)}</h3></div><label class="safety-stock-field">安全庫存<input type="number" min="0" step="1" value="${escapeHtml(x.safety)}" data-safety="${escapeHtml(x.product)}" /></label><label class="safety-stock-field">管理狀態<select data-status="${escapeHtml(x.product)}"><option value="">未設定</option>${["列管", "暫停", "封存"].map((v) => `<option${x.status === v ? " selected" : ""}>${v}</option>`).join("")}</select></label></article>`,
      )
      .join("");
    main.innerHTML = `<div class="page-heading"><div class="page-heading-row"><div><h1>安全庫存設定</h1><p>設定商品的安全庫存與管理狀態。</p></div><a class="outline-button" href="shopping.html"><span class="material-icons">arrow_back</span>返回購買清單</a></div></div><section class="inventory-toolbar inventory-toolbar--audit safety-stock-toolbar"><label class="filter-field">類別<select id="settings-category"><option value="all">全部類別</option>${cats.map((c) => `<option${state.category === c ? " selected" : ""}>${escapeHtml(c)}</option>`).join("")}</select></label><label class="filter-field">狀態<select id="settings-status"><option value="all">全部狀態</option>${["列管", "暫停", "封存"].map((v) => `<option${state.status === v ? " selected" : ""}>${v}</option>`).join("")}</select></label><label class="search-field"><span class="material-icons">search</span><input id="settings-search" type="search" value="${escapeHtml(state.search)}" placeholder="文字搜尋" /></label><button class="primary-button" id="save-settings">儲存設定</button></section>${state.loading ? `<div class="inventory-state">載入安全庫存設定中…</div>` : `<section class="safety-stock-list card"><div class="safety-stock-list-head"><h2>商品設定</h2><span>${items.length} 項</span></div><div class="safety-stock-grid">${rows || `<div class="inventory-state">尚無安全庫存設定。</div>`}</div></section>`}`;
    document.querySelector('.page-heading-row > a[href="shopping.html"]')?.remove();
    document
      .querySelector("#settings-category")
      ?.addEventListener("change", (e) => {
        state.category = e.target.value;
        render();
      });
    document
      .querySelector("#settings-status")
      ?.addEventListener("change", (e) => {
        state.status = e.target.value;
        render();
      });
    const search = document.querySelector("#settings-search");
    search?.addEventListener("compositionstart", () => {
      state.composing = true;
    });
    search?.addEventListener("compositionend", (e) => {
      state.composing = false;
      state.search = e.target.value;
      render();
      restoreInputFocus("#settings-search", state.search.length);
    });
    search?.addEventListener("input", (e) => {
      state.search = e.target.value;
      if (state.composing) return;
      render();
      restoreInputFocus("#settings-search", state.search.length);
    });
    document.querySelectorAll("[data-safety]").forEach((x) =>
      x.addEventListener("input", (e) => {
        const item = state.items.find(
          (i) => i.product === e.target.dataset.safety,
        );
        item.safety = e.target.value;
        state.dirty[item.product] = true;
        e.target.closest("article").classList.add("safety-stock-row--modified");
      }),
    );
    document.querySelectorAll("[data-status]").forEach((x) =>
      x.addEventListener("change", (e) => {
        const item = state.items.find(
          (i) => i.product === e.target.dataset.status,
        );
        item.status = e.target.value;
        state.dirty[item.product] = true;
        render();
      }),
    );
    document.querySelector("#save-settings")?.addEventListener("click", save);
  }
  async function load() {
    try {
      const data = await postApi("getSafetyStock", { token: auth.token });
      const raw = Array.isArray(data)
        ? data
        : (data?.items ??
          data?.safetyStock ??
          data?.safetyStocks ??
          data?.settings ??
          []);
      state.items = raw.map(normalize);
    } catch (error) {
      showError(
        error instanceof ApiError ? error : new Error("無法載入安全庫存設定。"),
      );
    } finally {
      state.loading = false;
      render();
      hidePageLoader();
    }
  }
  async function save() {
    const items = state.items.filter((x) => state.dirty[x.product]);
    if (!items.length) return showToast("沒有尚未儲存的設定。", "info");
    if (
      items.some(
        (x) =>
          x.safety.trim() !== "" &&
          (!Number.isInteger(Number(x.safety)) || Number(x.safety) < 0),
      )
    )
      return showToast("安全庫存需為空值，或 0 以上的整數。", "error");
    try {
      showActionLoader();
      await postApi("updateSafetyStock", {
        token: auth.token,
        items: JSON.stringify(
          items.map((x) => ({
            product: x.product,
            safetyStock: x.safety.trim() === "" ? "" : Number(x.safety),
            managementStatus: x.status,
          })),
        ),
      });
      state.dirty = {};
      showToast("安全庫存設定已儲存。", "success");
      await load();
    } catch (error) {
      showError(error);
    } finally {
      hideActionLoader();
    }
  }
  load();
}
