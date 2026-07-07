import { APP_NAME, STORAGE_KEY } from "./config.js";

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatTime(timestamp) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function formatDateLabel(timestamp) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function clampText(text = "", length = 42) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean;
}

export function safeParseJSON(value, fallbackValue) {
  try {
    return JSON.parse(value);
  } catch {
    return fallbackValue;
  }
}

export function loadStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = safeParseJSON(raw, null);
  if (!parsed || typeof parsed !== "object") {
    return {
      sessions: [],
      activeSessionId: null,
    };
  }

  return {
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    activeSessionId: typeof parsed.activeSessionId === "string" ? parsed.activeSessionId : null,
  };
}

export function saveStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildSessionTitle(firstPrompt) {
  const trimmed = String(firstPrompt).trim();
  if (!trimmed) return `${APP_NAME}`;
  return clampText(trimmed, 28);
}

export function scrollToBottom(container) {
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

export function normalizeText(value = "") {
  return String(value).replace(/\r\n/g, "\n").trim();
}
