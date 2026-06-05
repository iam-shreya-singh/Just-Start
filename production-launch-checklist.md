# Just Start — Production Launch Checklist (Phase 5)

## 1. Supabase Setup

- [ ] **Create Supabase project**: Note the project URL and anon key
- [ ] **Run migrations**: Apply `supabase/migrations/001_initial_schema.sql` to the project
- [ ] **Verify RLS policies**: Row-level security is enabled on all tables
- [ ] **Get database URL**: From Supabase Dashboard → Settings → Database → Connection string (URI, pooler mode)
- [ ] **Test connection**: `psql` or Prisma can connect using the connection string

## 2. Vercel Project Setup

- [ ] **Create Vercel project**: Import the Git repository
- [ ] **Set framework preset**: Next.js (auto-detected)
- [ ] **Set root directory**: Leave default (project root)
- [ ] **Configure build command**: `bun run build` (or leave auto-detected)
- [ ] **Configure output directory**: `.next` (auto-detected)
- [ ] **Select region**: Choose the closest region to your users (e.g., `iad1` for US East)

## 3. Environment Variables (Vercel Dashboard)

Set all of the following in **Settings → Environment Variables** for **Production**:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | YES | Supabase PostgreSQL connection string (pooler mode, port 6543) |
| `NEXT_PUBLIC_SUPABASE_URL` | YES | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | YES | Supabase anonymous key (JWT) |
| `OPENAI_API_KEY` | Rec. | `sk-...` — without this, only static fallbacks are used |
| `NEXT_PUBLIC_APP_URL` | YES | `https://just-start.vercel.app` (your production URL) |
| `CRON_SECRET` | YES | Generate with: `openssl rand -hex 32` |

Also set the same variables for **Preview** and **Development** environments as needed.

## 4. Cron Job Configuration

- [ ] **Vercel Cron is configured**: `vercel.json` includes the cron schedule for `/api/cron/expire-sessions`
- [ ] **CRON_SECRET is set**: Both in Vercel env vars AND configured in Vercel Cron settings
- [ ] **Test cron endpoint**: `curl -H "x-cron-secret: YOUR_SECRET" https://just-start.vercel.app/api/cron/expire-sessions`
- [ ] **Verify cron runs**: Check Vercel Functions logs after the first scheduled run

## 5. DNS & Domain (Optional)

- [ ] **Custom domain configured**: Add domain in Vercel Dashboard → Settings → Domains
- [ ] **DNS records set**: Add CNAME record pointing to `cname.vercel-dns.com`
- [ ] **SSL certificate**: Vercel provisions automatically; verify HTTPS works
- [ ] **Update NEXT_PUBLIC_APP_URL**: Set to the custom domain URL
- [ ] **Update Supabase allowed URLs**: Add the custom domain to Supabase auth redirect URLs

## 6. Pre-Deployment Verification

- [ ] **Build succeeds locally**: `npm run build` completes without errors
- [ ] **TypeScript is clean**: `npx tsc --noEmit` passes (now with `ignoreBuildErrors: false`)
- [ ] **All QA checklist items pass**: See `docs/qa-checklist.md`
- [ ] **No hardcoded localhost URLs**: Search codebase for `localhost:3000` and replace with env vars
- [ ] **No console.log in production code**: Remove or replace with structured logging
- [ ] **No test data in database**: Clear development data before connecting production DB

## 7. First Deployment

- [ ] **Deploy to Vercel**: Push to main branch or trigger manual deploy
- [ ] **Deployment succeeds**: Check Vercel Dashboard for successful build
- [ ] **App loads**: Visit the production URL and verify the entry screen loads
- [ ] **No console errors**: Open browser DevTools and check for errors
- [ ] **Fonts load correctly**: Plus Jakarta Sans renders properly
- [ ] **CSS is correct**: All design tokens are applied, no visual regressions

## 8. Smoke Tests (Production)

- [ ] **Submit a task**: Enter "Clean my room" and get a micro-action
- [ ] **"Too Big" works**: Click "Too Big" and get a deeper action
- [ ] **Commit to 5 minutes**: Click "I'll Try" → "Yes, I'm ready" → timer starts
- [ ] **Timer works**: Counts UP from 0:00 (elapsed focus time)
- [ ] **Hit wall**: Click "I'm stuck" and get an unstick action
- [ ] **Finish session**: Click "I Finished!" and return to entry screen
- [ ] **Offline queue**: Disconnect network → submit task → reconnect → sync
- [ ] **Recovery mode**: (Test by modifying `lastActiveTimestamp` in localStorage to 25h ago)
- [ ] **Error boundary**: Trigger a runtime error and verify the fallback screen
- [ ] **Rate limiting**: Send >20 requests to `/api/engine/deconstruct` in 1 minute and verify 429 response

## 9. Security Verification (Production)

- [ ] **Security headers present**: `curl -I https://just-start.vercel.app` shows all headers
- [ ] **CSP is active**: No mixed content or script violations in DevTools console
- [ ] **HSTS is active**: `Strict-Transport-Security` header is present
- [ ] **X-Frame-Options is DENY**: Page cannot be iframed
- [ ] **X-Powered-By is absent**: Next.js version not exposed
- [ ] **CORS blocks unknown origins**: Cross-origin API request returns 403
- [ ] **Rate limiting works**: Excessive requests get 429 with Retry-After header
- [ ] **Cron endpoint is protected**: Request without CRON_SECRET returns 401
- [ ] **No sensitive data in responses**: API errors don't leak stack traces
- [ ] **OpenAI key not exposed**: Search page source and network tab for `sk-` — not found

## 10. Performance Verification (Production)

- [ ] **Run Lighthouse**: Score >= 85 Performance, >= 90 Accessibility
- [ ] **Check Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] **First Contentful Paint**: < 1.8 seconds
- [ ] **Time to Interactive**: < 5 seconds
- [ ] **Bundle size**: Check Network tab — initial JS < 200KB gzipped
- [ ] **Static assets cached**: 1-year cache on JS/CSS/font files
- [ ] **API responses not cached**: No-store headers on API routes
- [ ] **Image optimization**: Logo.svg is small and has cache headers

## 11. Monitoring Setup (Post-Launch)

- [ ] **Vercel Analytics enabled**: In Vercel Dashboard → Analytics tab
- [ ] **Vercel Speed Insights enabled**: Monitor Core Web Vitals
- [ ] **Function logs accessible**: Vercel Dashboard → Functions tab shows API logs
- [ ] **Error tracking**: Set up Sentry/Datadog (optional but recommended)
- [ ] **Uptime monitoring**: Set up UptimeRobot/Checkly for the production URL
- [ ] **Alert on 5xx errors**: Configure Vercel alert for elevated error rates

## 12. Post-Launch Validation

- [ ] **Real device testing**: Test on at least one iOS and one Android device
- [ ] **Real network conditions**: Test on 3G throttle in DevTools
- [ ] **Screen reader testing**: Navigate the full flow with VoiceOver or TalkBack
- [ ] **Analytics data flows**: Submit a task and verify events appear in the database
- [ ] **Cron job runs**: Wait for the hourly cron and verify stale sessions are expired
- [ ] **OpenAI integration**: Submit a task and verify GPT-4o-mini generates an action (if key is set)
- [ ] **Fallback mode**: Temporarily unset OPENAI_API_KEY and verify static fallbacks work

## 13. Rollback Plan

- [ ] **Previous deployment is available**: Vercel keeps deployment history
- [ ] **Know the rollback command**: Vercel Dashboard → Deployments → "Promote to Production" on previous deploy
- [ ] **Database migration rollback**: Keep a copy of the previous schema
- [ ] **Feature flag strategy**: Consider using Vercel Preview Deployments for risky changes
- [ ] **Communication plan**: Know how to notify users if there's downtime

## 14. Documentation

- [ ] **README is up to date**: Contains setup instructions, tech stack, and deployment guide
- [ ] **API documentation**: All endpoints are documented with request/response examples
- [ ] **Environment variables documented**: `.env.example` is complete and current
- [ ] **Architecture decision records**: Key decisions are documented (state machine, offline queue, etc.)
- [ ] **Incident response plan**: Know the steps for common failure scenarios

## 15. Go-Live

- [ ] **All checklist items above are passing**
- [ ] **Team has reviewed and approved**
- [ ] **DNS is propagated** (if custom domain)
- [ ] **Monitoring is active**
- [ ] **Announce the launch** 🎉
