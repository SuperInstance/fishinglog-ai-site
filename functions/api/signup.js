// Cloudflare Pages Function — /api/signup
// Handles beta signup form POST requests

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { name, email, anglerType, source, timestamp } = body;

    // Basic validation
    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store in KV if available
    if (env.SIGNUPS) {
      const id = crypto.randomUUID();
      await env.SIGNUPS.put(
        `signup:${id}`,
        JSON.stringify({ name, email, anglerType, source, timestamp, created: Date.now() }),
        { expirationTtl: 0 } // permanent
      );
    }

    // Log for monitoring
    console.log(`Beta signup: ${name} <${email}> [${anglerType}] from ${source}`);

    return new Response(JSON.stringify({ success: true, message: 'Welcome aboard!' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
