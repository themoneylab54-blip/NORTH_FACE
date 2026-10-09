// Meta Conversions API relay for colandcie.com, to deploy as a Cloudflare Worker (see README.md next to this file).
// The theme (snippets/meta-pixel.liquid) posts each event here with the same event ID as the browser pixel; this
// Worker adds the visitor's IP and user agent plus the access token, and forwards the event to Meta.
//
// Worker variables (Settings > Variables and Secrets):
// - META_ACCESS_TOKEN (type Secret): the Conversions API access token. Never in this file, never in the theme.
// - META_TEST_EVENT_CODE (optional, type Text): code from Events Manager > Test events, while testing only.

const PIXEL_ID = '1636632014598583';
const API_VERSION = 'v26.0';
const ALLOWED_ORIGINS = ['https://colandcie.com', 'https://www.colandcie.com', 'https://27vmem-y1.myshopify.com'];
const ALLOWED_EVENTS = ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout'];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function isStoreUrl(url) {
  return ALLOWED_ORIGINS.some((origin) => url === origin || url.startsWith(origin + '/') || url.startsWith(origin + '?'));
}

function text(value, max) {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, max) : undefined;
}

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

// Keeps only the standard e-commerce fields the theme sends, with sane types and sizes.
function customData(data) {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const clean = {
    content_type: text(data.content_type, 20),
    content_name: text(data.content_name, 200),
    currency: /^[A-Z]{3}$/.test(data.currency) ? data.currency : undefined,
    value: number(data.value),
    num_items: Number.isInteger(data.num_items) && data.num_items >= 0 ? data.num_items : undefined,
  };

  if (Array.isArray(data.content_ids)) {
    clean.content_ids = data.content_ids.slice(0, 50).map((id) => text(String(id), 50)).filter(Boolean);
  }

  if (Array.isArray(data.contents)) {
    clean.contents = data.contents.slice(0, 50)
      .filter((content) => content && content.id != null)
      .map((content) => ({ id: text(String(content.id), 50), quantity: Number.isInteger(content.quantity) && content.quantity > 0 ? content.quantity : 1 }));
  }

  Object.keys(clean).forEach((key) => clean[key] === undefined && delete clean[key]);
  return clean;
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST' || !ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden', { status: 403, headers });
    }

    if (!env.META_ACCESS_TOKEN) {
      return new Response('META_ACCESS_TOKEN is not set', { status: 500, headers });
    }

    let event;

    try {
      const body = await request.text();

      if (body.length > 10000) {
        throw new Error('Body too large');
      }

      event = JSON.parse(body);
    } catch (error) {
      return new Response('Bad request', { status: 400, headers });
    }

    const sourceUrl = text(event && event.event_source_url, 2000);

    if (!ALLOWED_EVENTS.includes(event && event.event_name) || !text(event.event_id, 100) || !sourceUrl || !isStoreUrl(sourceUrl)) {
      return new Response('Bad request', { status: 400, headers });
    }

    // The theme sends the time the event happened; a time in the future or older than a day is replaced by now.
    const now = Math.floor(Date.now() / 1000);
    const eventTime = Number.isInteger(event.event_time) && event.event_time <= now && event.event_time > now - 86400 ? event.event_time : now;

    const userData = {
      client_ip_address: request.headers.get('CF-Connecting-IP') || undefined,
      client_user_agent: request.headers.get('User-Agent') || undefined,
      fbp: text(event.fbp, 200),
      fbc: text(event.fbc, 500),
    };

    Object.keys(userData).forEach((key) => userData[key] === undefined && delete userData[key]);

    const payload = {
      data: [{
        event_name: event.event_name,
        event_time: eventTime,
        event_id: event.event_id.slice(0, 100),
        event_source_url: sourceUrl,
        action_source: 'website',
        user_data: userData,
        custom_data: customData(event.custom_data),
      }],
      access_token: env.META_ACCESS_TOKEN,
    };

    if (env.META_TEST_EVENT_CODE) {
      payload.test_event_code = env.META_TEST_EVENT_CODE;
    }

    const forward = fetch(`https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(async (response) => {
      if (!response.ok) {
        console.log('Meta Conversions API error', response.status, await response.text());
      }

      return response;
    });

    // While testing, wait for Meta's answer and return it, so errors show up in the browser's network tab.
    if (env.META_TEST_EVENT_CODE) {
      const response = await forward;
      return new Response(await response.text(), { status: response.status, headers });
    }

    ctx.waitUntil(forward.catch((error) => console.log('Meta Conversions API unreachable', String(error))));
    return new Response('ok', { headers });
  },
};
