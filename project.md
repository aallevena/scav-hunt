# Scavenger Hunt App

## Overview

A web app for browsing, playing, and creating location-based scavenger hunts.
A hunt is an ordered or unordered collection of clues, each tied to a
location and a verification method (password, geolocation, QR/barcode scan,
photo match, etc.). Users log in with Google, track their progress across
hunts, race friends in live shared events, collect badges, and discover
popular hunts via search/filter and upvotes.

## Tech Stack

- **Framework**: Next.js (App Router) + TypeScript
- **Database**: Postgres (Neon or Supabase), accessed via an ORM (Prisma)
- **Auth**: NextAuth.js (Auth.js) with Google identity provider
- **Hosting**: Vercel
- **Clue verification**: server-side only — the client submits an answer/
  location/scan payload to an API route, which checks it against the stored
  solution. Solutions are never sent to the client.

## Core Concepts / Data Model (draft)

- **User**: id, Google identity, display name, avatar, profile bio
- **Hunt**: id, title, description, creator (User), tags/traits, ordered vs
  unordered, published/draft, upvote count (derived)
- **Clue**: id, hunt (FK), order index (used when ordered), title/prompt,
  location (lat/lng + optional address/name), input type, verification
  config (see below), hint text (optional)
- **ClueInputType** (extensible enum): `TEXT_PASSWORD`, `GEOLOCATION`,
  `QR_BARCODE`, `PHOTO_MATCH` (phase 2), designed so new types can be added
  without schema rewrites (e.g. a `verificationConfig` JSON column per clue)
- **HuntProgress**: user, hunt, status (not started/in progress/completed),
  current clue index (for ordered hunts), started_at, completed_at
- **ClueCompletion**: user, clue, completed_at, attempt data (for
  auditing/anti-cheat, not shown to user)
- **Event**: hunt (FK), name, start/end time, list of participant users,
  status (upcoming/live/finished)
- **EventParticipant**: event, user, joined_at, finished_at, rank
- **Upvote**: user, hunt, created_at (unique per user+hunt, toggleable)
- **Badge**: id, name, description, icon, criteria (e.g. "completed N
  hunts", "created a hunt", "won an event")
- **UserBadge**: user, badge, earned_at
- **Tag**: id, name (for filtering hunts — e.g. difficulty, location type,
  indoor/outdoor, theme)

## Features — MVP (Phase 1)

1. **Browse/search hunts**: public list of hunts, filterable by tags/traits,
   sortable by upvotes/recency, search by title.
2. **Hunt detail page**: description, tags, clue count, ordered/unordered
   indicator, creator, upvote button/count.
3. **Play a hunt**:
   - Ordered hunts: only the current clue is visible; solving it unlocks
     the next.
   - Unordered hunts: all clues visible from the start, solve in any order.
   - Supported clue input types at launch: `TEXT_PASSWORD` and
     `GEOLOCATION` (browser geolocation API, distance-radius check).
   - `QR_BARCODE` and `PHOTO_MATCH` are reserved in the data model but not
     required to ship in MVP (stretch goal if time allows in phase 1).
4. **Auth**: Google login via NextAuth; session-aware nav.
5. **Profile page (basic)**: user's completed hunts, in-progress hunts,
   hunts they've created.
6. **Hunt creation**: any logged-in user can create/edit/publish a hunt and
   its clues.
7. **Upvotes**: one toggleable upvote per user per hunt, no minimum plays
   required; search/sort by upvote count.

## Features — Phase 2 (explicitly deferred)

- **Live events**: shared race-to-finish instances of a hunt among multiple
  users; live leaderboard; winner = first to complete all clues.
- **QR/barcode scanning** clue input (camera-based scan, likely via a
  browser barcode-detection library).
- **Photo match** clue input, using AI vision (e.g. Claude) to judge whether
  an uploaded photo matches the expected scene — deferred until core play
  loop is solid.
- **Badges**: award badges for milestones (hunts completed, hunts created,
  events won) and display them on the profile page.
- **Richer profile / public profile pages**: showcase completed/created
  hunts and badges to other users.
- **Anti-cheat hardening**: rate limiting on verification attempts,
  geolocation spoofing mitigation, attempt logging/review for photo/QR
  clues.

## Open Design Questions (to revisit)

- Event scoring beyond "first to finish" (e.g. partial-completion
  leaderboards, hints costing time penalties) — noted as a possible future
  enhancement, not in MVP.
- Whether hunt creation should later be gated (e.g. reporting/moderation
  for low-quality or inappropriate hunts) as the platform grows.
- Exact geolocation radius/accuracy tolerance for `GEOLOCATION` clues.
- Badge criteria details once badges are implemented in phase 2.

## Non-goals (for now)

- Native mobile apps (web app should be mobile-responsive, but no
  React Native/iOS/Android build in this phase).
- Payments/monetization.
- Public API for third-party integrations.
