import { APP_NAME, INITIAL_LOADING_MS, TYPE_SPEED } from "./config.js";
import { askGemini } from "./api.js";
import {
  $,
  clampText,
  formatDateLabel,
  formatTime,
  loadStorage,
  normalizeText,
  saveStorage,
  scrollToBottom,
  sleep,
  uid,
  buildSessionTitle,
} from "./utils.js";

const pageLoading = $("#pageLoading");
const appShell = $("#appShell");
const sidebar = $("#sidebar");
const openSidebarButton = $("#openSidebar");
const closeSidebarButton = $("#closeSidebar");
const newChatButton = $("#newChatButton");
const historyList = $("#historyList");
const messagesEl = $("#messages");
const emptyState = $("#emptyState");
const composer = $("#composer");
const promptInput = $("#promptInput");
const sendButton = $("#sendButton");
const connectionStatus = $("#connectionStatus");
const messageTemplate = $("#messageTemplate");

const state = {
  sessions: [],
  activeSessionId: null,
  loading: false,
  typingRunId: 0,
};

function createSession(firstPrompt = "") {
  const timestamp = Date.now();
  return {
    id: uid(),
    title: buildSessionTitle(firstPrompt || APP_NAME),
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
  };
}

function ensureActiveSession() {
  let activeSession = state.sessions.find((session) => session.id === state.activeSessionId);

  if (!activeSession) {
    activeSession = createSession();
    state.sessions.unshift(activeSession);
    state.activeSessionId = activeSession.id;
  }

  return activeSession;
}

function persist() {
  saveStorage({
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
  });
}

function loadAppState() {
  const stored = loadStorage();
  state.sessions = stored.sessions;
  state.activeSessionId = stored.activeSessionId;

  if (state.sessions.length === 0) {
    state.sessions = [];
    state.activeSessionId = null;
  } else if (!state.sessions.some((session) => session.id === state.activeSessionId)) {
    state.activeSessionId = state.sessions[0].id;
  }
}

function setLoading(isLoading) {
  state.loading = isLoading;
  promptInput.disabled = isLoading;
  sendButton.disabled = isLoading;
  sendButton.classList.toggle("is-busy", isLoading);
  connectionStatus.textContent = isLoading ? "Memproses..." : "Siap";
}

function setEmptyStateVisibility() {
  const activeSession = state.sessions.find((session) => session.id === state.activeSessionId);
  const hasMessages = Boolean(activeSession && activeSession.messages.length > 0);
  emptyState.classList.toggle("is-hidden", hasMessages);
  messagesEl.classList.toggle("has-content", hasMessages);
}

function getActiveSession() {
  return state.sessions.find((session) => session.id === state.activeSessionId) || null;
}

function renderHistory() {
  const sorted = [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  historyList.innerHTML = "";

  if (sorted.length === 0) {
    const emptyButton = document.createElement("button");
    emptyButton.className = "history-item is-active";
    emptyButton.type = "button";
    emptyButton.innerHTML = `
      <div class="history-item__title">Belum ada riwayat</div>
      <div class="history-item__meta">Mulai chat pertama sekarang</div>
    `;
    historyList.appendChild(emptyButton);
    return;
  }

  for (const session of sorted) {
    const item = document.createElement("button");
    item.className = `history-item ${session.id === state.activeSessionId ? "is-active" : ""}`;
    item.type = "button";
    item.dataset.sessionId = session.id;

    const preview = session.messages.find((message) => message.role === "user")?.text || APP_NAME;
    item.innerHTML = `
      <div class="history-item__title">${clampText(preview, 42)}</div>
      <div class="history-item__meta">${formatDateLabel(session.updatedAt)} · ${session.messages.length} pesan</div>
    `;

    item.addEventListener("click", () => switchSession(session.id));
    historyList.appendChild(item);
  }
}

function createMessageElement(message) {
  const template = messageTemplate.content.firstElementChild.cloneNode(true);
  template.classList.add(`message--${message.role}`);

  const roleEl = $(".message__role", template);
  const timeEl = $(".message__time", template);
  const contentEl = $(".message__content", template);

  roleEl.textContent = message.role === "user" ? "Anda" : message.role === "assistant" ? APP_NAME : "Sistem";
  timeEl.textContent = formatTime(message.createdAt);
  contentEl.textContent = message.text;
  contentEl.dataset.messageId = message.id;

  if (message.status === "typing") {
    contentEl.classList.add("is-typing");
  }

  return template;
}

function renderMessages() {
  const activeSession = getActiveSession();
  messagesEl.innerHTML = "";

  if (!activeSession) {
    setEmptyStateVisibility();
    renderHistory();
    return;
  }

  for (const message of activeSession.messages) {
    messagesEl.appendChild(createMessageElement(message));
  }

  setEmptyStateVisibility();
  renderHistory();
  scrollToBottom(messagesEl);
}

function syncSessionTitle(session) {
  const userMessage = session.messages.find((message) => message.role === "user");
  if (userMessage && (!session.title || session.title === APP_NAME)) {
    session.title = buildSessionTitle(userMessage.text);
  }
}

function touchSession(session) {
  session.updatedAt = Date.now();
  syncSessionTitle(session);
  state.sessions = [...state.sessions.filter((item) => item.id !== session.id), session];
  persist();
}

function switchSession(sessionId) {
  state.activeSessionId = sessionId;
  persist();
  renderMessages();
  renderHistory();
  closeSidebar();
}

function closeSidebar() {
  sidebar.classList.remove("is-open");
}

function openSidebar() {
  sidebar.classList.add("is-open");
}

function addMessage(role, text, extra = {}) {
  const session = ensureActiveSession();
  const message = {
    id: uid(),
    role,
    text: normalizeText(text),
    createdAt: Date.now(),
    ...extra,
  };

  session.messages.push(message);
  touchSession(session);
  renderMessages();
  return message;
}

function updateMessage(messageId, patch) {
  const session = getActiveSession();
  if (!session) return null;

  const message = session.messages.find((item) => item.id === messageId);
  if (!message) return null;

  Object.assign(message, patch);
  touchSession(session);
  renderMessages();
  return message;
}

async function typeAssistantResponse(messageId, fullText) {
  const session = getActiveSession();
  if (!session) return;

  const targetMessage = session.messages.find((message) => message.id === messageId);
  if (!targetMessage) return;

  targetMessage.text = "";
  targetMessage.status = "typing";
  state.typingRunId += 1;
  const runId = state.typingRunId;
  renderMessages();

  const source = normalizeText(fullText);
  const totalLength = source.length;

  for (let index = 0; index <= totalLength; index += 1) {
    if (runId !== state.typingRunId) {
      return;
    }

    targetMessage.text = source.slice(0, index);
    renderMessages();

    if (index < totalLength) {
      const nextChar = source.charAt(index);
      const speed = nextChar === "\n" ? TYPE_SPEED + 10 : TYPE_SPEED;
      await sleep(speed);
    }
  }

  targetMessage.status = "done";
  touchSession(session);
  renderMessages();
}

async function handleSubmit(event) {
  event.preventDefault();

  if (state.loading) {
    return;
  }

  const prompt = normalizeText(promptInput.value);
  if (!prompt) {
    connectionStatus.textContent = "Prompt masih kosong";
    promptInput.focus();
    return;
  }

  if (!getActiveSession()) {
    const session = createSession(prompt);
    state.sessions.unshift(session);
    state.activeSessionId = session.id;
    persist();
  }

  const session = ensureActiveSession();
  if (session.messages.length === 0) {
    session.title = buildSessionTitle(prompt);
  }

  addMessage("user", prompt);
  promptInput.value = "";
  autoResizeInput();

  const placeholder = addMessage("assistant", "", { status: "typing" });
  const assistantMessageId = placeholder.id;

  setLoading(true);

  try {
    const relevantMessages = session.messages
      .filter((message) => message.role !== "system" && message.status !== "typing")
      .slice(-10)
      .map((message) => ({
        role: message.role,
        text: message.text,
      }));

    const reply = await askGemini(prompt, relevantMessages);
    await typeAssistantResponse(assistantMessageId, reply);
  } catch (error) {
    updateMessage(assistantMessageId, {
      role: "error",
      text: error?.message || "Terjadi kesalahan.",
      status: "error",
    });
    connectionStatus.textContent = "Gagal mengirim";
  } finally {
    setLoading(false);
    promptInput.focus();
    renderHistory();
  }
}

function autoResizeInput() {
  promptInput.style.height = "auto";
  const maxHeight = 180;
  promptInput.style.height = `${Math.min(promptInput.scrollHeight, maxHeight)}px`;
}

function handleInputKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    composer.requestSubmit();
  }
}

function seedDefaultSession() {
  if (state.sessions.length > 0) {
    return;
  }

  const session = createSession();
  state.sessions = [];
  state.activeSessionId = null;
  persist();
  renderMessages();
  renderHistory();
  return session;
}

function wireEvents() {
  composer.addEventListener("submit", handleSubmit);
  promptInput.addEventListener("input", autoResizeInput);
  promptInput.addEventListener("keydown", handleInputKeydown);
  newChatButton.addEventListener("click", () => {
    const session = createSession();
    state.sessions.unshift(session);
    state.activeSessionId = session.id;
    persist();
    renderMessages();
    renderHistory();
    promptInput.value = "";
    autoResizeInput();
    promptInput.focus();
    closeSidebar();
  });

  openSidebarButton.addEventListener("click", openSidebar);
  closeSidebarButton.addEventListener("click", closeSidebar);

  document.addEventListener("click", (event) => {
    if (!sidebar.classList.contains("is-open")) return;
    const clickedInsideSidebar = sidebar.contains(event.target);
    const clickedMenuButton = openSidebarButton.contains(event.target);
    if (!clickedInsideSidebar && !clickedMenuButton) {
      closeSidebar();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });

  window.addEventListener("resize", () => {
    autoResizeInput();
    scrollToBottom(messagesEl);
  });
}

async function boot() {
  loadAppState();
  wireEvents();
  renderHistory();
  renderMessages();
  autoResizeInput();

  const splashDelay = new Promise((resolve) => setTimeout(resolve, INITIAL_LOADING_MS));
  await splashDelay;

  appShell.hidden = false;
  document.body.classList.add("is-ready");
  pageLoading.classList.add("is-hidden");

  if (!getActiveSession() && state.sessions.length === 0) {
    seedDefaultSession();
  }

  promptInput.focus();
}

boot();
