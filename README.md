# Voting Power

A web application for tracking ENS (Ethereum Name Service) delegate voting power and governance participation. Users can search for delegates, view their voting power, delegators, and voting history.

## API Routes

The application provides the following API endpoints:

### `/api/get-top-delegates`

Returns the top 100 ENS delegates ranked by voting power, including their rank, address, voting power, and delegation count.

### `/api/get-delegate-rank`

Returns the rank and total balance for a specific delegate address. Accepts a `delegate` query parameter.

### `/api/get-recent-activity`

Returns recent voting power activity from the last 90 days. Accepts optional `threshold` query parameter (default: 5000 ENS). Activity types include: `delegation_initiated`, `delegation_removed`, `delegation_changed`, `delegation_to_self`, `self_delegation_initiated`, `tokens_received`, `tokens_sent`, `tokens_received_and_delegated`, `self_tokens_received`, `self_tokens_sent`.

### `/api/get-delegated-token-count`

Returns the total number of delegated tokens across all delegates.

### `/api/get-votable-supply`

Returns the total votable supply (sum of all voting power across delegates).

### `/api/get-delegators`

Returns all delegators for a given delegate address. Accepts a `delegate` query parameter and returns delegator information including balance and delegation timestamp.

### `/api/get-top-holders`

Returns the top 1000 ENS token holders ordered by balance.

### `/api/get-updated-at`

Returns the timestamp of the latest event in the database, indicating when the data was last updated.

### `/api/get-delegate-power-history`

Returns the complete voting power history for a specific delegate. Accepts a `delegate` query parameter and returns historical voting power records.

### `/api/get-voting-history`

Returns voting activity for a list of addresses. Accepts a POST request with an array of addresses and returns the number of unique proposals voted on and latest vote timestamp for each address.
