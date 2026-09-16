import { postApi, ApiError } from "./api.js";
import { showError, showActionLoader, hideActionLoader, hidePageLoader } from "./common.js";

if (sessionStorage.getItem("inventory-token") && sessionStorage.getItem("inventory-user")) location.replace("home.html");
hidePageLoader();
const pinInput = document.querySelector("#pin-input");
const passwordToggle = document.querySelector("[data-password-toggle]");
passwordToggle.addEventListener("click", () => {
  const visible = pinInput.type === "text";
  pinInput.type = visible ? "password" : "text";
  passwordToggle.setAttribute("aria-label", visible ? "顯示 PIN" : "隱藏 PIN");
  passwordToggle.setAttribute("aria-pressed", String(!visible));
  passwordToggle.querySelector(".material-icons").textContent = visible ? "visibility" : "visibility_off";
});
document.querySelector("[data-login-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const pin = new FormData(form).get("pin")?.trim();
  const button = form.querySelector("button[type=submit]");
  if (!pin) return;
  button.disabled = true; button.textContent = "登入中…"; showActionLoader();
  try { const { token, name } = await postApi("login", { pin }); if (!token || !name) throw new ApiError("登入回應缺少必要資料。", 0); sessionStorage.setItem("inventory-token", token); sessionStorage.setItem("inventory-user", name); location.replace("home.html"); }
  catch (error) { showError(error); }
  finally { hideActionLoader(); button.disabled = false; button.textContent = "登入"; }
});
