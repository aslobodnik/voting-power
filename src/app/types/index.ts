type Delegate = {
  delegate_address: string;
  voting_power: bigint;
  rank: number;
  delegations: number;
  block_timestamp: bigint;
  non_zero_delegations: number;
  latest_vote_timestamp?: bigint;
  on_chain_votes?: number;
  votes_for?: number;
  votes_against?: number;
  votes_abstain?: number;
  voting_power_30d_ago: bigint;
};

type Delegator = {
  delegator: string;
  delegator_tokens: bigint;
  block_delegated: bigint;
  delegated_timestamp: bigint;
};

type Holder = {
  address: string;
  balance: bigint;
  rank: number;
  balance_30d_ago: bigint;
};

type DelegatePowerHistory = {
  block_timestamp: number;
  block_number: number;
  log_index: number;
  voting_power: bigint;
};

type Vote = {
  id: string;
  proposalId: string;
  support: boolean;
  reason: string;
  voter: string;
  weight: bigint;
  timestamp: number;
};

type VoteData = {
  voter: string;
  uniqueProposalCount: number;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  latestTimestamp: string;
};
