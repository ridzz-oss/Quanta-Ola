const axios = require('axios');

async function txt2video(prompt) {
  try {
    const { data: k } = await axios.post('https://soli.aritek.app/txt2videov3', {
      deviceID: Math.random().toString(16).substr(2, 8) + Math.random().toString(16).substr(2, 8),
      prompt: prompt,
      used: [],
      versionCode: 51
    }, {
      headers: {
        authorization: 'eyJzdWIiwsdeOiIyMzQyZmczNHJ0MzR0weMzQiLCJuYW1lIjorwiSm9objMdf0NTM0NT',
        'content-type': 'application/json; charset=utf-8',
        'accept-encoding': 'gzip',
        'user-agent': 'okhttp/4.11.0'
      }
    });

    const { data } = await axios.post('https://soli.aritek.app/video', {
      keys: [k.key]
    }, {
      headers: {
        authorization: 'eyJzdWIiwsdeOiIyMzQyZmczNHJ0MzR0weMzQiLCJuYW1lIjorwiSm9objMdf0NTM0NT',
        'content-type': 'application/json; charset=utf-8',
        'accept-encoding': 'gzip',
        'user-agent': 'okhttp/4.11.0'
      }
    });

    return data.datas[0].url;
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const prompt = String(body.prompt || '').trim();

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt tidak boleh kosong' });
    }

    const url = await txt2video(prompt);
    return res.status(200).json({ ok: true, url });
  } catch (error) {
    console.error(error.response?.status);
    console.error(error.response?.data);

    return res.status(500).json({
        ok: false,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
    });
        }
};
