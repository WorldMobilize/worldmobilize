## BrandArena Roadmap

### 1) Current MVP (today)
- **Nation-only gameplay**: countries are the only playable territories.
- **Core loop**: claim capital → fill support to cap → declare war on neighbors → capture countries.
- **Anti-pay-to-win**: no payments, no boosts for victory.
- **Demos**:
  - **Nation War Demo** (regional)
  - **World War Demo** (large-scale)

### 2) Next prototype improvements
- **Geography hardening**
  - Verify all playable country polygons map correctly.
  - Mainland-only handling for multi-part countries (overseas territories).
  - Add/keep dev-only geography debug overlay.
- **Simulation reliability**
  - Deterministic mode (seeded RNG) for repeatable demos.
  - Better war pacing + fewer “stall” states.
  - Smarter AI target selection (frontlines, priorities, defense).
- **UI polish**
  - Clear “war room” layout with premium glass panels.
  - Better onboarding and tutorial hints.

### 3) Real product requirements (non-demo)
- **Scalable realtime state** (server-authoritative)
- **Spectator mode** + shareable match links
- **Rate limiting** + abuse protection
- **Analytics**: retention, participation, war outcomes

### 4) Payments / Stripe (future)
- **Philosophy**: payment buys **creation/status**, not victory.
- Examples:
  - Paid faction creation (verified badge, cosmetics)
  - Cosmetic theming, banners, emblems
  - Never sell combat power, war progress, or capture probability

### 5) Auth / database (future)
- Auth (email/social), profile, sessions
- Database for:
  - factions (ownership, cosmetics)
  - match history
  - moderation logs
  - audit trails for disputes

### 6) Moderation requirements
- Block:
  - hate speech
  - extremist symbols
  - harassment / bullying
  - offensive or sexual content
- Enforce on:
  - faction names
  - logos/initials
  - chat/feed content (if added)
- Admin tools:
  - rename/remove factions
  - ban/timeout users
  - content review queue

### 7) Faction archetypes (creator / brand / community)
- **Creator-style**: audience spikes, high engagement, volatile morale
- **Brand-style**: steady support growth, lower volatility, strong defense
- **Community-style**: coalition bonuses, strong defense when threatened

### 8) War system improvements
- Better rules for:
  - defense actions and reinforcement
  - multi-front wars and priority queues
  - stalemates and ceasefires
  - morale impacts (wins/losses)
- UI:
  - clear contested outlines
  - war timeline + outcome predictions (non-binding)

### 9) Launch checklist
- **Gameplay**: nation loop stable and understandable in 60s
- **Geography**: no wrong landmass highlights
- **UI**: premium, readable, non-debug
- **Safety**: moderation baseline ready
- **Performance**: smooth globe interaction on mid-tier devices
- **Observability**: basic logging + error reporting

---

**Rule of thumb**: stay **nations-only** until this loop is fun and reliable. Add sub-regions only after the nation-level loop is proven.

