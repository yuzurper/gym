// Cloud backup for the gym app.
// GET /backup returns the latest backup. PUT /backup stores a new one.
// Every PUT also keeps a daily snapshot for 60 days, in case a bad save
// overwrites the latest copy.
const ORIGIN = 'https://yuzurper.github.io';
const MAX_BYTES = 1000000;

const cors = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Key',
  'Access-Control-Max-Age': '86400'
};

function reply(body, status = 200, type = 'text/plain') {
  return new Response(body, { status, headers: { ...cors, 'Content-Type': type } });
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (new URL(req.url).pathname !== '/backup') return reply('Not found', 404);
    if (!env.BACKUP_KEY || req.headers.get('X-Key') !== env.BACKUP_KEY) return reply('Forbidden', 403);

    if (req.method === 'GET') {
      return reply((await env.GYM.get('latest')) || 'null', 200, 'application/json');
    }
    if (req.method === 'PUT') {
      const body = await req.text();
      if (body.length > MAX_BYTES) return reply('Too large', 413);
      try { JSON.parse(body); } catch (e) { return reply('Bad JSON', 400); }
      await env.GYM.put('latest', body);
      const day = new Date().toISOString().slice(0, 10);
      await env.GYM.put('snap:' + day, body, { expirationTtl: 60 * 86400 });
      return reply('ok');
    }
    return reply('Method not allowed', 405);
  }
};
