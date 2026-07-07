import { API_KEY, API_URL, MAX_CONTEXT_MESSAGES } from "./config.js";

function buildContextPayload(messages) {
  const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);

  return recentMessages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.text }],
  }));
}

export async function askGemini(prompt, messages = []) {
  if (!API_KEY || API_KEY === "PASTE_API_KEY_DI_SINI") {
    throw new Error("API key belum diisi. Buka config.js lalu ganti PASTE_API_KEY_DI_SINI.");
  }

  const contents = [
    ...buildContextPayload(messages),
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

  const response = await fetch(`${API_URL}?key=${encodeURIComponent(API_KEY)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `Request gagal (${response.status})`;
    throw new Error(message);
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("")
      .trim() || "";

  if (!text) {
    throw new Error("Balasan AI kosong.");
  }

  return text;
}
