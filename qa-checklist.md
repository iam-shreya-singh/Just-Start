# Just Start — Final QA Checklist (Phase 5)

## Pre-Build Verification

- [ ] **TypeScript compiles without errors**: `npx tsc --noEmit` passes cleanly
- [ ] **ESLint passes**: `npm run lint` completes with zero errors (warnings OK)
- [ ] **Build succeeds**: `npm run build` completes without errors
- [ ] **No console errors in development**: `npm run dev` starts and loads without errors
- [ ] **Environment variables validated**: `.env` contains all required values per `.env.example`

## Frontend — Screen Flow

- [ ] **Entry Screen**: Task input accepts text, "Just Start" button triggers deconstruction
- [ ] **Micro-Action Screen**: AI-generated action displays, "I'll Try" and "Too Big" buttons work
- [ ] **Commitment Screen**: "Ready? Can you give this 5 minutes?" displays correctly
- [ ] **Momentum Screen**: 5-minute countdown timer works, progress bar animates
- [ ] **Unstick Screen**: Regulation action appears, "Try Again" and "Not Today" work
- [ ] **Recovery Screen**: Shows after 24h+ inactivity, "Start Fresh" clears session
- [ ] **Screen transitions**: Framer Motion animations are smooth, no flicker
- [ ] **State machine**: All 8 events produce correct state transitions per spec

## Frontend — Accessibility (WCAG AA)

- [ ] **Skip link**: "Skip to main content" link is focusable and works
- [ ] **Keyboard navigation**: All interactive elements reachable via Tab
- [ ] **Focus visible**: Custom focus styles appear on all interactive elements
- [ ] **Touch targets**: All buttons and interactive elements are at least 48x48px
- [ ] **ARIA live regions**: Screen changes are announced to screen readers
- [ ] **Reduced motion**: Animations are suppressed when `prefers-reduced-motion: reduce`
- [ ] **Color contrast**: Text contrast ratios meet WCAG AA (4.5:1 for normal text, 3:1 for large)
- [ ] **Maximum scale**: Viewport allows zoom up to 5x (not capped at 1)
- [ ] **Semantic HTML**: Proper heading hierarchy, landmark regions, form labels
- [ ] **Screen reader**: App is usable with VoiceOver/TalkBack/NVDA

## Frontend — Error Handling

- [ ] **Error boundary**: Runtime errors display the recovery screen, not a white crash
- [ ] **Error boundary "Try Again"**: Soft reset works (keeps state)
- [ ] **Error boundary "Start Fresh"**: Hard reset clears localStorage and reloads
- [ ] **Toast notifications**: Success/error messages appear for key actions
- [ ] **Offline detection**: Online indicator shows when disconnected
- [ ] **Offline queue**: API calls are queued when offline and sync when back online

## Frontend — Timer & Hyperfocus

- [ ] **Momentum timer**: Counts down from 5:00 to 0:00
- [ ] **Timer completion**: Timer reaching 0 triggers completion state
- [ ] **Hyperfocus alert**: Appears at 25 minutes of active session
- [ ] **Hyperfocus dismiss**: Dismissing shows re-alert after 10 minutes
- [ ] **Hyperfocus finish**: "Finish session" option works from alert

## Backend — API Routes

- [ ] **POST /api/engine/deconstruct**: Returns micro-action for valid input
- [ ] **POST /api/engine/deconstruct**: Returns 400 for empty input
- [ ] **POST /api/engine/deconstruct**: Returns 429 when rate limited
- [ ] **POST /api/session/start**: Creates session and returns sessionId
- [ ] **PATCH /api/session/update**: Updates session status
- [ ] **POST /api/session/complete**: Marks session as completed/abandoned
- [ ] **POST /api/events**: Records batch analytics events
- [ ] **POST /api/cron/expire-sessions**: Expires stale sessions (requires CRON_SECRET)
- [ ] **Rate limit headers**: X-RateLimit-Limit, X-RateLimit-Remaining present in responses
- [ ] **Error responses**: All errors follow the standardized `{ success: false, error: { code, message } }` format

## Backend — Security

- [ ] **Input sanitization**: HTML tags stripped, control chars removed, Unicode normalized
- [ ] **Zod validation**: All API inputs validated and auto-sanitized
- [ ] **Rate limiting**: Per-IP sliding window enforced on all routes
- [ ] **CORS**: API routes reject cross-origin requests from unknown domains
- [ ] **Request size**: Payloads over 1MB are rejected (413)
- [ ] **Cron secret**: `/api/cron/expire-sessions` requires valid CRON_SECRET in production
- [ ] **Suspicious input detection**: SQL injection and XSS patterns are logged
- [ ] **JSON depth validation**: Deeply nested payloads are rejected
- [ ] **Content-Type validation**: POST/PATCH routes require `application/json`
- [ ] **No sensitive data in responses**: Error messages don't leak stack traces or internals

## Backend — Security Headers

- [ ] **Content-Security-Policy**: Present and restrictive on all pages
- [ ] **X-Content-Type-Options**: Set to `nosniff`
- [ ] **X-Frame-Options**: Set to `DENY`
- [ ] **X-XSS-Protection**: Set to `1; mode=block`
- [ ] **Referrer-Policy**: Set to `strict-origin-when-cross-origin`
- [ ] **Permissions-Policy**: Camera, microphone, geolocation disabled
- [ ] **Strict-Transport-Security**: Present in production (max-age=31536000)
- [ ] **Cross-Origin-Opener-Policy**: Set to `same-origin`
- [ ] **X-Powered-By**: Not present (removed via `poweredBy: false`)

## Backend — Database

- [ ] **Prisma schema**: `prisma generate` succeeds
- [ ] **Database push**: `prisma db push` succeeds
- [ ] **Session CRUD**: Create, read, update, delete operations work
- [ ] **Event recording**: Analytics events are persisted correctly
- [ ] **Session expiry**: Stale sessions (24h+) are marked as expired
- [ ] **Graceful shutdown**: Database disconnects cleanly on SIGINT/SIGTERM

## Performance

- [ ] **Initial page load**: < 3 seconds on 3G connection
- [ ] **Time to Interactive**: < 5 seconds on 3G connection
- [ ] **Lighthouse Performance**: Score >= 85
- [ ] **Lighthouse Accessibility**: Score >= 90
- [ ] **Lighthouse Best Practices**: Score >= 90
- [ ] **Lighthouse SEO**: Score >= 80
- [ ] **Bundle size**: Initial JS < 200KB (gzipped)
- [ ] **Font loading**: No FOIT (Flash of Invisible Text), fonts swap correctly
- [ ] **Image optimization**: Logo.svg is small and cached
- [ ] **Static assets**: Cache-Control headers set for immutable assets (1 year)
- [ ] **API responses**: No-store cache headers on API routes

## Cross-Browser Testing

- [ ] **Chrome (latest)**: All features work
- [ ] **Firefox (latest)**: All features work
- [ ] **Safari (latest)**: All features work
- [ ] **Mobile Safari (iOS)**: Touch interactions, viewport, and layout correct
- [ ] **Mobile Chrome (Android)**: Touch interactions, viewport, and layout correct
- [ ] **Screen readers**: VoiceOver (iOS/macOS) and TalkBack (Android) navigation works

## Offline & Network Resilience

- [ ] **Offline detection**: App detects network loss and shows indicator
- [ ] **Offline task submission**: Tasks are queued when offline
- [ ] **Online recovery**: Queued items sync when back online
- [ ] **API failure**: Fallback actions display when API is unreachable
- [ ] **Static fallbacks**: Micro-actions display correctly when OpenAI is unavailable
- [ ] **Session persistence**: Zustand state survives page refresh
- [ ] **Recovery mode**: 24h+ inactivity triggers recovery screen on next load

## Analytics

- [ ] **Event tracking**: Key actions (SUBMIT_TASK, COMMIT_5_MIN, FINISHED) are tracked
- [ ] **Screen views**: Each screen transition records a SCREEN_VIEW event
- [ ] **Timing events**: Submit-to-action and open-to-commit timings are recorded
- [ ] **Web Vitals**: FCP, LCP, CLS, FID, INP, TTFB are tracked
- [ ] **Buffer flush**: Events are batched and sent periodically (every 10s)
- [ ] **Visibility change**: Events flush on page hide
- [ ] **Beforeunload**: Events flush on page close
- [ ] **Offline resilience**: Events buffer during offline and flush on reconnect
