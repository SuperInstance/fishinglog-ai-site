/**
 * Tests for the beta signup API endpoint.
 *
 * These tests exercise the Cloudflare Pages Function by calling it with
 * mocked Request/Env objects. They verify:
 * - Input validation (name, email, format)
 * - KV storage interaction
 * - CORS headers
 * - Error handling
 * - OPTIONS preflight handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onRequestGet, onRequestPost, onRequestOptions } from '../functions/api/signup.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body) {
  return {
    method: 'POST',
    json: async () => body,
  };
}

function makeEnv(kvAvailable = true) {
  const kv = {
    put: vi.fn().mockResolvedValue(undefined),
  };
  return {
    SIGNUPS: kvAvailable ? kv : undefined,
  };
}

function parseBody(response) {
  return response.json();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/signup', () => {
  let env;

  beforeEach(() => {
    env = makeEnv(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('successful signup', () => {
    it('returns 200 with success message for valid input', async () => {
      const req = makeRequest({
        name: 'Alice',
        email: 'alice@example.com',
        anglerType: 'fly',
        source: 'fishinglog.ai',
        timestamp: '2024-01-01T00:00:00Z',
      });

      const res = await onRequestPost({ request: req, env });
      const body = await parseBody(res);

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Welcome aboard!');
    });

    it('stores signup in KV when available', async () => {
      const req = makeRequest({
        name: 'Bob',
        email: 'bob@fish.com',
        anglerType: 'bass',
        source: 'landing-page',
      });

      await onRequestPost({ request: req, env });

      expect(env.SIGNUPS.put).toHaveBeenCalledTimes(1);
      const [key, value] = env.SIGNUPS.put.mock.calls[0];
      expect(key).toMatch(/^signup:[0-9a-f-]+$/);
      const stored = JSON.parse(value);
      expect(stored.name).toBe('Bob');
      expect(stored.email).toBe('bob@fish.com');
      expect(stored.created).toBeDefined();
    });

    it('includes CORS header in response', async () => {
      const req = makeRequest({ name: 'A', email: 'a@b.com' });
      const res = await onRequestPost({ request: req, env });
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('sets Content-Type to application/json', async () => {
      const req = makeRequest({ name: 'A', email: 'a@b.com' });
      const res = await onRequestPost({ request: req, env });
      expect(res.headers.get('Content-Type')).toBe('application/json');
    });

    it('works without KV binding (no crash)', async () => {
      env = makeEnv(false);
      const req = makeRequest({ name: 'Carol', email: 'carol@example.com' });
      const res = await onRequestPost({ request: req, env });
      const body = await parseBody(res);

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('preserves anglerType and source in KV', async () => {
      const req = makeRequest({
        name: 'Dave',
        email: 'dave@example.com',
        anglerType: 'deep-sea',
        source: 'newsletter',
      });

      await onRequestPost({ request: req, env });

      const value = env.SIGNUPS.put.mock.calls[0][1];
      const stored = JSON.parse(value);
      expect(stored.anglerType).toBe('deep-sea');
      expect(stored.source).toBe('newsletter');
    });
  });

  describe('validation: missing fields', () => {
    it('returns 400 when name is missing', async () => {
      const req = makeRequest({ email: 'alice@example.com' });
      const res = await onRequestPost({ request: req, env });
      const body = await parseBody(res);

      expect(res.status).toBe(400);
      expect(body.error).toBe('Name and email are required');
    });

    it('returns 400 when email is missing', async () => {
      const req = makeRequest({ name: 'Alice' });
      const res = await onRequestPost({ request: req, env });
      const body = await parseBody(res);

      expect(res.status).toBe(400);
      expect(body.error).toBe('Name and email are required');
    });

    it('returns 400 when both are missing', async () => {
      const req = makeRequest({});
      const res = await onRequestPost({ request: req, env });

      expect(res.status).toBe(400);
    });

    it('returns 400 when name is empty string', async () => {
      const req = makeRequest({ name: '', email: 'a@b.com' });
      const res = await onRequestPost({ request: req, env });

      expect(res.status).toBe(400);
    });

    it('returns 400 when name is null', async () => {
      const req = makeRequest({ name: null, email: 'a@b.com' });
      const res = await onRequestPost({ request: req, env });

      expect(res.status).toBe(400);
    });

    it('returns 400 when name is undefined', async () => {
      const req = makeRequest({ name: undefined, email: 'a@b.com' });
      const res = await onRequestPost({ request: req, env });

      expect(res.status).toBe(400);
    });

    it('does not store in KV when validation fails', async () => {
      const req = makeRequest({ name: '', email: 'invalid' });
      await onRequestPost({ request: req, env });
      expect(env.SIGNUPS.put).not.toHaveBeenCalled();
    });
  });

  describe('validation: email format', () => {
    it('rejects email without @', async () => {
      const req = makeRequest({ name: 'Alice', email: 'aliceatexample.com' });
      const res = await onRequestPost({ request: req, env });
      expect(res.status).toBe(400);
      expect((await parseBody(res)).error).toBe('Invalid email address');
    });

    it('rejects email without domain', async () => {
      const req = makeRequest({ name: 'Alice', email: 'alice@' });
      const res = await onRequestPost({ request: req, env });
      expect(res.status).toBe(400);
    });

    it('rejects email without TLD', async () => {
      const req = makeRequest({ name: 'Alice', email: 'alice@example' });
      const res = await onRequestPost({ request: req, env });
      expect(res.status).toBe(400);
    });

    it('rejects email with spaces', async () => {
      const req = makeRequest({ name: 'Alice', email: 'alice @example.com' });
      const res = await onRequestPost({ request: req, env });
      expect(res.status).toBe(400);
    });

    it('rejects email with multiple @ symbols', async () => {
      const req = makeRequest({ name: 'Alice', email: 'alice@@example.com' });
      const res = await onRequestPost({ request: req, env });
      // The regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ would reject "alice@@"
      // because the first character class excludes @
      expect(res.status).toBe(400);
    });

    it('accepts standard valid emails', async () => {
      const emails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@example.org',
        'user123@example.io',
      ];
      for (const email of emails) {
        const req = makeRequest({ name: 'Test', email });
        const res = await onRequestPost({ request: req, env });
        expect(res.status).toBe(200);
      }
    });
  });

  describe('error handling', () => {
    it('returns 500 when request.json() throws', async () => {
      const req = {
        json: async () => { throw new Error('Invalid JSON'); },
      };
      const res = await onRequestPost({ request: req, env });
      const body = await parseBody(res);

      expect(res.status).toBe(500);
      expect(body.error).toBe('Internal server error');
    });

    it('returns 500 when KV put() throws', async () => {
      env.SIGNUPS.put = vi.fn().mockRejectedValue(new Error('KV write failed'));
      const req = makeRequest({ name: 'Alice', email: 'alice@example.com' });
      const res = await onRequestPost({ request: req, env });

      expect(res.status).toBe(500);
    });
  });
});

// ─── OPTIONS (CORS preflight) ────────────────────────────────────────────────

describe('OPTIONS /api/signup (CORS preflight)', () => {
  it('returns 204 No Content', async () => {
    const res = await onRequestOptions();
    expect(res.status).toBe(204);
  });

  it('returns Allow-Origin header', async () => {
    const res = await onRequestOptions();
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('returns Allow-Methods header', async () => {
    const res = await onRequestOptions();
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
  });

  it('returns Allow-Headers header', async () => {
    const res = await onRequestOptions();
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
  });
});

// ─── GET (health check / API info) ───────────────────────────────────────────

describe('GET /api/signup (API info)', () => {
  it('returns 200', async () => {
    const res = await onRequestGet();
    expect(res.status).toBe(200);
  });

  it('returns JSON with endpoint info', async () => {
    const res = await onRequestGet();
    const body = await parseBody(res);
    expect(body.endpoint).toBe('/api/signup');
    expect(body.method).toBe('POST');
    expect(body.description).toBeDefined();
  });

  it('includes CORS header', async () => {
    const res = await onRequestGet();
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

// ─── Additional edge cases ───────────────────────────────────────────────────

describe('POST /api/signup — additional edge cases', () => {
  let env;

  beforeEach(() => {
    env = makeEnv(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('handles very long names gracefully', async () => {
    const longName = 'A'.repeat(1000);
    const req = makeRequest({ name: longName, email: 'a@b.com' });
    const res = await onRequestPost({ request: req, env });
    expect(res.status).toBe(200);
  });

  it('handles unicode/special characters in name', async () => {
    const req = makeRequest({ name: 'José María Müller-Ärne', email: 'a@b.com' });
    const res = await onRequestPost({ request: req, env });
    expect(res.status).toBe(200);
    const value = env.SIGNUPS.put.mock.calls[0][1];
    const stored = JSON.parse(value);
    expect(stored.name).toBe('José María Müller-Ärne');
  });

  it('preserves timestamp from client in KV', async () => {
    const ts = '2026-01-15T10:30:00Z';
    const req = makeRequest({
      name: 'Time',
      email: 'time@test.com',
      timestamp: ts,
    });
    await onRequestPost({ request: req, env });
    const value = env.SIGNUPS.put.mock.calls[0][1];
    const stored = JSON.parse(value);
    expect(stored.timestamp).toBe(ts);
  });

  it('KV key uses crypto.randomUUID format', async () => {
    const req = makeRequest({ name: 'UUID', email: 'uuid@test.com' });
    await onRequestPost({ request: req, env });
    const key = env.SIGNUPS.put.mock.calls[0][0];
    // UUID v4 format: 8-4-4-4-12 hex digits
    expect(key).toMatch(/^signup:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('stores all fields from request body', async () => {
    const req = makeRequest({
      name: 'Full',
      email: 'full@test.com',
      anglerType: 'fly',
      source: 'newsletter',
      timestamp: '2026-01-01T00:00:00Z',
    });
    await onRequestPost({ request: req, env });
    const stored = JSON.parse(env.SIGNUPS.put.mock.calls[0][1]);
    expect(stored).toMatchObject({
      name: 'Full',
      email: 'full@test.com',
      anglerType: 'fly',
      source: 'newsletter',
    });
  });
});
