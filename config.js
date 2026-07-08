// Pastikan tidak ada spasi di dalam tanda kutip API_KEY ini
export const API_KEY = "AQ.Ab8RN6Is_lFiQRg8jGIVLgXIHakbaW5e2c8cu2bEkLFk6SlPdw"; 
export const MODEL = "gemini-2.0-flash";

// Mengubah v1beta menjadi v1 agar otentikasi API Key murni diterima dengan lancar
export const API_URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent`;

export const APP_NAME = "NovaAI";
export const STORAGE_KEY = "novaai-v1-storage";
export const MAX_CONTEXT_MESSAGES = 16;
export const TYPE_SPEED = 14;
export const INITIAL_LOADING_MS = 850;
