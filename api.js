/**
 * Google Apps Script Web App endpoint. Leave empty during local UI development.
 * Set this value before connecting the deployed Apps Script API.
 */
export const API_ENDPOINT = "https://script.google.com/macros/s/AKfycbw9B1xayxaij-vdX6hnUCQF_MfS0zmqpy69V2Bo4_fqAucqkt72vwtz3nIOzc4ZKy6E/exec";

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function postApi(action, payload = {}) {
  if (!API_ENDPOINT) {
    throw new ApiError("尚未設定 Google Apps Script API 網址。", 0);
  }

  let response;
  try {
    response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload })
    });
  } catch {
    throw new ApiError("無法連線至伺服器，請確認網路後再試。", 0);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError("伺服器回傳了無法辨識的資料。", response.status);
  }

  if (!response.ok || result.success === false) {
    throw new ApiError(result.message || "操作失敗，請稍後再試。", response.status);
  }

  return result.data ?? result;
}
