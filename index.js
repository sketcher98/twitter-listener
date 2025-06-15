// index.js
const express = require('express');
const fetch = require('node-fetch');
const needle = require('needle');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const BEARER_TOKEN = process.env.BEARER_TOKEN;
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;

const streamURL = 'https://api.twitter.com/2/tweets/search/stream';
const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';

const trackedUsers = ['elonmusk', 'naval'];

async function setRules() {
  const rules = trackedUsers.map(user => ({
    value: `from:${user}`,
    tag: `${user}'s tweets`,
  }));
  await needle('post', rulesURL, { add: rules }, {
    headers: { authorization: `Bearer ${BEARER_TOKEN}` },
  });
}

async function clearRules() {
  const response = await needle('get', rulesURL, {
    headers: { authorization: `Bearer ${BEARER_TOKEN}` },
  });
  const rules = response.body.data;
  if (rules?.length) {
    const ids = rules.map(rule => rule.id);
    await needle('post', rulesURL, { delete: { ids } }, {
      headers: { authorization: `Bearer ${BEARER_TOKEN}` },
    });
  }
}

function streamConnect() {
  const options = {
    headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
    timeout: 20000,
  };

  const stream = needle.get(streamURL, options);

  stream.on('data', async (data) => {
    try {
      const json = JSON.parse(data);
      console.log('🚨 New Tweet:', json);
      await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
    } catch (e) {
      console.error('❌ Error parsing stream data', e);
    }
  });

  stream.on('err', (error) => {
    console.error('🧨 Stream error', error);
  });
}

(async () => {
  await clearRules();
  await setRules();
  streamConnect();
})();

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
