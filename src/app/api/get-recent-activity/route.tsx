import { unstable_noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/app/lib/db";

export async function GET(request: NextRequest) {
  unstable_noStore();
  try {
    const thresholdParam = request.nextUrl.searchParams.get("threshold");
    const threshold = thresholdParam ? Number(thresholdParam) : 10e20;
    const q = `
-- ============================================================================
-- RECENT ACTIVITY QUERY
-- ============================================================================
-- Classifies voting power changes into semantic activity types.
-- Returns ready-to-display data for the frontend.
--
-- DELEGATION EVENTS (5 types):
--   delegation_initiated, delegation_removed, delegation_changed,
--   delegation_to_self, self_delegation_initiated
--
-- TOKEN MOVEMENT EVENTS (5 types):
--   tokens_received_and_delegated, tokens_received, tokens_sent,
--   self_tokens_received, self_tokens_sent
-- ============================================================================

WITH 
-- Constants for special addresses
constants AS (
  SELECT '0x0000000000000000000000000000000000000000' AS zero_address
),

with_lag AS (
  -- Step 1: Calculate previous voting power for each delegate
  -- IMPORTANT: We run LAG over ALL historical data, not just recent 90 days.
  -- This ensures accurate previous_power even if the last change was >90 days ago.
  -- Example: If delegate had 50k power 91 days ago and now has 45k, we need that 50k baseline.
  SELECT
    p.delegate_address,
    p.block_number,
    p.block_timestamp,
    p.log_index,
    p.voting_power,
    LAG(p.voting_power, 1, 0)
      OVER (PARTITION BY p.delegate_address ORDER BY p.block_number, p.log_index)
      AS previous_power
  FROM delegate_power p
),
with_change AS (
  -- Step 2: Calculate voting power changes and filter to recent + significant changes
  -- Filter AFTER calculating LAG to ensure previous_power is accurate
  SELECT
    *,
    COALESCE(voting_power - previous_power, voting_power) AS voting_power_change
  FROM with_lag
  WHERE block_timestamp >= EXTRACT(EPOCH FROM NOW() - INTERVAL '90 days')
    AND ABS(COALESCE(voting_power - previous_power, voting_power)) >= $1
),
-- Delegation changes: DelegateChanged events with classification
delegation_changes_raw AS (
  SELECT DISTINCT ON (dc.transaction_hash, dc.log_index)
    dc.block_number,
    dc.block_timestamp,
    dc.log_index,
    dc.args->>'delegator' AS delegator_address,
    dc.args->>'fromDelegate' AS from_delegate,
    dc.args->>'toDelegate' AS to_delegate,
    -- Classify delegation type (order matters - most specific first)
    CASE
      -- From 0x0000 to self → first time self-delegating
      WHEN LOWER(dc.args->>'fromDelegate') = c.zero_address 
       AND LOWER(dc.args->>'toDelegate') = LOWER(dc.args->>'delegator')
        THEN 'self_delegation_initiated'
      
      -- From 0x0000 to someone else → first time delegating
      WHEN LOWER(dc.args->>'fromDelegate') = c.zero_address
        THEN 'delegation_initiated'
      
      -- To 0x0000 → removing delegation
      WHEN LOWER(dc.args->>'toDelegate') = c.zero_address
        THEN 'delegation_removed'
      
      -- To self (not from 0x0000) → switching to self-delegation
      WHEN LOWER(dc.args->>'toDelegate') = LOWER(dc.args->>'delegator')
        THEN 'delegation_to_self'
      
      -- Otherwise → normal redelegation
      ELSE 'delegation_changed'
    END AS activity_type,
    -- Get amount from appropriate delegate
    CASE 
      WHEN LOWER(dc.args->>'toDelegate') = c.zero_address 
        THEN (SELECT ABS(voting_power_change) FROM with_change 
              WHERE delegate_address = dc.args->>'fromDelegate' 
                AND block_number = dc.block_number AND log_index = dc.log_index + 1 LIMIT 1)
      ELSE (SELECT ABS(voting_power_change) FROM with_change 
            WHERE delegate_address = dc.args->>'toDelegate' 
              AND block_number = dc.block_number AND log_index = dc.log_index + 1 LIMIT 1)
    END AS amount
  FROM events dc
  CROSS JOIN constants c
  WHERE dc.event_type = 'DelegateChanged'
    AND dc.block_timestamp >= EXTRACT(EPOCH FROM NOW() - INTERVAL '90 days')
),
-- Filter delegation changes by threshold
delegation_changes AS (
  SELECT *
  FROM delegation_changes_raw
  WHERE amount >= $1  -- Apply threshold filter
),
-- Token movements: Transfer events that cause voting power changes
other_activities AS (
  SELECT
    c.delegate_address,
    c.block_number,
    c.block_timestamp,
    c.log_index,
    c.voting_power,
    c.voting_power_change,
    cd.delegator AS delegator_address,
    NULL::text AS from_delegate,
    NULL::text AS to_delegate,
    -- Classify token movement type (order matters)
    CASE 
      -- Received tokens AND initiated delegation in same tx
      WHEN delegator_init.event_type IS NOT NULL AND c.voting_power_change > 0 
        THEN 'tokens_received_and_delegated'
      
      -- Self-delegator (delegate == delegator) managing their own tokens
      WHEN LOWER(cd.delegator) = LOWER(c.delegate_address) AND c.voting_power_change > 0 
        THEN 'self_tokens_received'
      WHEN LOWER(cd.delegator) = LOWER(c.delegate_address) AND c.voting_power_change < 0 
        THEN 'self_tokens_sent'
      
      -- Normal delegator tokens affecting their delegate's power
      WHEN cd.delegator IS NOT NULL AND c.voting_power_change > 0 
        THEN 'tokens_received'
      WHEN cd.delegator IS NOT NULL AND c.voting_power_change < 0 
        THEN 'tokens_sent'
      
      ELSE NULL  -- Unclassifiable - filtered out
    END AS activity_type,
    ABS(c.voting_power_change) AS amount
  FROM with_change c
  CROSS JOIN constants const
  
  -- Exclude voting power changes that have a DelegateChanged at log_index - 1
  -- (those are already captured in delegation_changes)
  LEFT JOIN events dc_check
    ON dc_check.event_type = 'DelegateChanged'
    AND dc_check.block_number = c.block_number
    AND dc_check.log_index = c.log_index - 1
    AND (dc_check.args->>'toDelegate' = c.delegate_address OR dc_check.args->>'fromDelegate' = c.delegate_address)
  
  -- Find which delegator had a transfer that caused this power change
  LEFT JOIN LATERAL (
    SELECT cd_inner.delegator, cd_inner.delegator_balance
    FROM events t
    INNER JOIN current_delegations cd_inner 
      ON cd_inner.delegate = c.delegate_address
      AND (t.args->>'to' = cd_inner.delegator OR t.args->>'from' = cd_inner.delegator)
    WHERE t.event_type = 'Transfer'
      AND t.block_number = c.block_number
      AND t.log_index BETWEEN c.log_index - 3 AND c.log_index - 1
    ORDER BY t.log_index DESC
    LIMIT 1
  ) cd ON TRUE
  
  -- Check if delegator also initiated delegation from 0x0000 in same block
  LEFT JOIN events delegator_init
    ON delegator_init.event_type = 'DelegateChanged'
    AND delegator_init.block_number = c.block_number
    AND delegator_init.args->>'delegator' = cd.delegator
    AND LOWER(delegator_init.args->>'fromDelegate') = const.zero_address
    AND delegator_init.log_index < c.log_index
  
  WHERE dc_check.event_type IS NULL
)
-- Combine both types of activities
-- Only return fields that frontend actually needs
SELECT
  block_number,
  block_timestamp,
  activity_type,
  delegator_address,
  amount,
  -- For delegation_change: from_delegate and to_delegate are populated
  -- For buy/sell: delegate_address is populated
  from_delegate,
  to_delegate,
  delegate_address
FROM (
  SELECT
    block_number,
    block_timestamp,
    log_index,
    delegator_address,
    from_delegate,
    to_delegate,
    activity_type,
    amount,
    NULL::text AS delegate_address  -- Delegation changes don't have a single delegate
  FROM delegation_changes
  
  UNION ALL
  
  SELECT
    block_number,
    block_timestamp,
    log_index,
    delegator_address,
    NULL::text AS from_delegate,  -- Buy/sell doesn't have from/to delegates
    NULL::text AS to_delegate,
    activity_type,
    amount,
    delegate_address  -- Buy/sell has a single delegate who gained/lost
  FROM other_activities
  WHERE activity_type IS NOT NULL
) combined
ORDER BY
  block_number DESC,
  log_index DESC;
  `;
    const result = await pool.query(q, [threshold]);

    const json = {
      message: "Data retrieved successfully",
      data: result.rows,
    };

    return NextResponse.json(json);
  } catch (error) {
    console.error("Database query error:", error);
    return NextResponse.json(
      { error: "An error occurred while querying the database" },
      { status: 500 }
    );
  }
}
