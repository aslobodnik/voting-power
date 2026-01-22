# Voting Power Dashboard

## Overview

A Next.js web application that displays ENS token voting power data, delegate rankings, and recent activity. The app queries a PostgreSQL database (`voting_power`) that is populated by the ENS ERC-20 Indexer.

## Related Projects

### ens-erc20-indexer (~/ens-erc20-indexer)
**GitHub:** `aslobodnik/ens-erc20-indexer`

The indexer that populates the database this app queries. Any database schema changes must be coordinated between both projects.

See `~/ens-erc20-indexer/CLAUDE.md` for:
- Database schema documentation
- Materialized view definitions
- Performance optimization details
- Cron job schedules

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL (via `pg` package)
- **Deployment:** Vercel (assumed)

## Project Structure

```
src/app/
├── api/                    # API routes (database queries)
│   ├── get-top-delegates/
│   ├── get-top-holders/
│   ├── get-delegators/
│   ├── get-delegate-rank/
│   ├── get-delegate-power-history/
│   ├── get-recent-activity/      # ← Optimized with recent_activity view
│   ├── get-delegated-token-count/
│   ├── get-votable-supply/
│   ├── get-updated-at/
│   └── get-voting-history/
├── lib/
│   ├── db.ts              # Database connection pools
│   ├── client-api.ts      # Client-side API helpers
│   └── helpers.ts         # Utility functions
├── hooks/                 # React hooks for data fetching
├── components/            # UI components
└── types/                 # TypeScript types
```

## Database Tables/Views Used

| Endpoint | Tables/Views Queried |
|----------|---------------------|
| get-top-delegates | `top_100_delegates` |
| get-top-holders | `top_1000_holders` |
| get-delegators | `current_delegations` |
| get-delegate-rank | `current_delegations` |
| get-delegate-power-history | `delegate_power` |
| get-recent-activity | `recent_activity` (optimized) or `delegate_power`, `events`, `current_delegations` |
| get-delegated-token-count | `current_delegate_power` |
| get-votable-supply | `current_delegate_power` |
| get-updated-at | `events` |
| get-voting-history | `votes` (governor database) |

## Recent Activity Optimization (January 2026)

The `/api/get-recent-activity` endpoint was slow (~1+ second). A pre-computed `recent_activity` materialized view was added to the indexer database.

### Before (slow - 1000ms+)
```typescript
// Complex query with LAG window function, CTEs, and correlated subqueries
const q = `
WITH with_lag AS (
  SELECT ..., LAG(voting_power) OVER (...) AS previous_power
  FROM delegate_power
),
...
`;
```

### After (fast - 2ms)
```typescript
const q = `
  SELECT
    block_number,
    block_timestamp,
    activity_type,
    delegator_address,
    amount,
    from_delegate,
    to_delegate,
    delegate_address
  FROM recent_activity
  WHERE amount >= $1
  ORDER BY block_number DESC, log_index DESC;
`;
```

## Environment Variables

```env
DB_USER=
DB_HOST=
DB_NAME=voting_power
DB_PORT=5432
DB_PASSWORD=
GOVERNOR_DB_NAME=   # For voting history
```

## Local Development

```bash
npm install
npm run dev
```

Requires access to the PostgreSQL database with the `voting_power` schema.

## Deployment Notes

- Database connection uses connection pooling via `pg.Pool`
- API routes use `unstable_noStore()` to prevent caching
- Some routes use `force-dynamic` for always-fresh data
