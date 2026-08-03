# fishinglog.ai

Your Fishing Intelligence Co-Pilot — AI-powered marine logging platform built on Dynamic Cognition Amplification technology.

## Structure

```
fishinglog-ai-site/
├── index.html              # Landing page
├── styles.css              # All styling (no external deps except Google Fonts)
├── app.js                  # Nav, scroll animations, beta form handler
├── wrangler.toml           # Cloudflare Pages config
├── functions/
│   └── api/
│       └── signup.js       # Serverless beta signup handler (Pages Function)
└── README.md
```

## Deploy

```bash
# Initial setup (one-time)
npx wrangler pages project create fishinglog-ai-site

# Deploy
npx wrangler pages deploy . --project-name fishinglog-ai-site

# Or with the wrangler.toml
npx wrangler pages deploy
```

## Beta Signups

The signup form POSTs to `/api/signup`, handled by the Cloudflare Pages Function at `functions/api/signup.js`.

To store signups persistently, create a KV namespace and uncomment the KV binding in `wrangler.toml`:

```bash
npx wrangler kv namespace create SIGNUPS
# Copy the ID into wrangler.toml
```

## Design

- **Aesthetic:** Clean marine — deep ocean blues, sky accents, white space
- **Typography:** Inter (Google Fonts)
- **Responsive:** Mobile-first, breakpoints at 960px, 700px, 600px, 400px
- **No external dependencies** beyond Google Fonts CDN
- **Animations:** CSS-based fade-up via IntersectionObserver, respects `prefers-reduced-motion`

## Tech

- Static HTML/CSS/JS — no build step
- Cloudflare Pages Functions for serverless API
- Privacy-first: location data processed locally (conceptual)
