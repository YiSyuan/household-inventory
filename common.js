import "./theme.js";
if (!document.querySelector("#page-loader")) {
  const loader = document.createElement("div");
  loader.id = "page-loader";
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-live", "polite");
  loader.innerHTML = `<span class="page-loader-mark">日</span><span>載入中…</span>`;
  document.body.prepend(loader);
}
const pageLoader = document.querySelector("#page-loader");
if (!document.querySelector("#action-loader")) {
  const loader = document.createElement("div");
  loader.id = "action-loader";
  loader.hidden = true;
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-live", "polite");
  loader.innerHTML = `<span class="action-loader-spinner" aria-hidden="true"></span><span>處理中…</span>`;
  document.body.append(loader);
}
const actionLoader = document.querySelector("#action-loader");
export function showActionLoader() {
  if (!actionLoader) return;
  actionLoader.hidden = false;
  document.body.setAttribute("aria-busy", "true");
}
export function hideActionLoader() {
  if (!actionLoader) return;
  actionLoader.hidden = true;
  document.body.removeAttribute("aria-busy");
}
export function hidePageLoader() {
  if (!pageLoader || pageLoader.classList.contains("page-loader--hidden")) return;
  pageLoader.classList.add("page-loader--hidden");
  window.setTimeout(() => pageLoader.remove(), 220);
}
export const themes = [
  { id: "light-cream", name: "奶油暖陽・淺色" },
  { id: "ocean-blue", name: "海洋湛藍・淺色" },
  { id: "calm-gray", name: "冷靜灰色・淺色" },
  { id: "midnight-blue", name: "午夜藍・深色" },
  { id: "deep-black", name: "深闇黑・深色" },
];
export function currentTheme() {
  const value = localStorage.getItem("inventory-theme");
  return themes.some((theme) => theme.id === value) ? value : "light-cream";
}
export function saveTheme(value) {
  if (themes.some((theme) => theme.id === value))
    localStorage.setItem("inventory-theme", value);
  document.documentElement.dataset.theme = currentTheme();
}
export function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ],
  );
}
document.documentElement.dataset.theme = currentTheme();
export function session() {
  const token = sessionStorage.getItem("inventory-token");
  const name = sessionStorage.getItem("inventory-user");
  return token && name ? { token, name } : null;
}
export function requireSession() {
  if (!session()) {
    location.replace("index.html");
    return null;
  }
  return session();
}
export function regionState() {
  return {
    get value() {
      return localStorage.getItem("inventory-region") || "台北";
    },
    set value(value) {
      localStorage.setItem("inventory-region", value);
    },
  };
}
export function showToast(message, variant = "info") {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.dataset.variant = variant;
  toast.hidden = false;
  window.setTimeout(() => {
    toast.hidden = true;
  }, 4000);
}
export function showError(error) {
  showToast(error?.message || "發生未預期的錯誤，請稍後再試。", "error");
}
export function restoreInputFocus(selector, position) {
  const input = document.querySelector(selector);
  if (!input) return;
  input.focus();
  const end = position ?? input.value.length;
  input.setSelectionRange(end, end);
}
export function setupShell(active, { publicPage = false } = {}) {
  const auth = session();
  if (!publicPage && !auth) {
    location.replace("index.html");
    return null;
  }
  document.body.dataset.authenticated = auth ? "true" : "false";
  if (!document.querySelector(".mobile-nav")) {
    const nav = document.createElement("nav");
    nav.className = "mobile-nav";
    nav.setAttribute("aria-label", "手機主要導覽");
    nav.innerHTML = `<a href="inventory.html" data-route-link="inventory"><span class="material-icons">inventory_2</span><span>庫存</span></a><a href="audit.html" data-route-link="audit"><span class="material-icons">fact_check</span><span>盤點</span></a><a href="home.html" data-route-link="home"><span class="material-icons">home</span><span>首頁</span></a><a href="shopping.html" data-route-link="shopping"><span class="material-icons">shopping_cart</span><span>購物清單</span></a><a href="settings.html" data-route-link="settings"><span class="material-icons">settings</span><span>設定</span></a>`;
    document.querySelector(".app-shell")?.append(nav);
  }
  if (["audit", "shopping", "safety-stock"].includes(active) && !document.querySelector(".go-to-top")) {
    const button = document.createElement("button");
    button.className = "go-to-top";
    button.type = "button";
    button.setAttribute("aria-label", "回到頁面頂端");
    button.title = "回到頂端";
    button.innerHTML = `<span class="material-icons">arrow_upward</span>`;
    button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.body.append(button);
  }
  const desktopIcons = { home: "home", inventory: "inventory_2", audit: "fact_check", shopping: "shopping_cart" };
  document.querySelectorAll(".desktop-nav a[data-route-link]").forEach((link) => {
    const icon = desktopIcons[link.dataset.routeLink];
    if (icon && !link.querySelector(".material-icons")) link.insertAdjacentHTML("afterbegin", `<span class="material-icons">${icon}</span>`);
  });
  document.querySelectorAll("[data-route-link]").forEach((link) => {
    if (link.dataset.routeLink === active || (active === "safety-stock" && link.dataset.routeLink === "settings"))
      link.setAttribute("aria-current", "page");
  });
  if (auth) {
    const logout = document.querySelector("[data-logout]"),
      actions = logout?.parentElement;
    if (logout && actions) {
      if (!actions.querySelector('[href="safety-stock.html"]')) {
        const safety = document.createElement("a");
        safety.className = "icon-button";
        safety.href = "safety-stock.html";
        safety.setAttribute("aria-label", "安全庫存設定");
        safety.title = "安全庫存設定";
        safety.innerHTML = `<span class="material-icons">tune</span>`;
        actions.insertBefore(safety, logout);
      }
      if (!actions.querySelector('[href="settings.html"]')) {
        const settings = document.createElement("a");
        settings.className = "icon-button";
        settings.href = "settings.html";
        settings.setAttribute("aria-label", "開啟設定");
        settings.title = "設定";
        settings.innerHTML = `<span class="material-icons">settings</span>`;
        actions.insertBefore(settings, logout);
      }
    }
  }
  const select = document.querySelector("#region-select");
  if (select) {
    select.value = regionState().value;
    select.addEventListener("change", (event) => {
      regionState().value = event.target.value;
      location.reload();
    });
  }
  document.querySelector("[data-logout]")?.addEventListener("click", () => {
    sessionStorage.removeItem("inventory-token");
    sessionStorage.removeItem("inventory-user");
    location.replace("index.html");
  });
  return auth;
}
