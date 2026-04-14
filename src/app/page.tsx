"use client";

import Image from "next/image";
import Link from "next/link";
import Papa from "papaparse";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAddress } from "viem";
import { normalize } from "viem/ens";

import AddressCell, { ProposerStats } from "./components/AddressCell";
import ChangeIndicator from "./components/ChangeIndicator";
import DelegatePowerChart from "./components/DelegatePowerChart";
import Pagination from "./components/Pagination";
import RecentActivity from "./components/RecentActivity";
import useDelegators from "./hooks/useDelegators";
import useVoteData from "./hooks/useVoteData";
import {
  fetchDelegateRank,
  fetchTopDelegates,
  fetchUpdatedAt,
  fetchVotableSupply,
  fetchVotingHistory,
} from "./lib/client-api";
import { getEnsNameCached } from "./lib/ensCache";
import { ShortenAddress, formatToken, getRelativeTime } from "./lib/helpers";
import publicClient from "./lib/publicClient";

export default function Home() {
  const [searchInput, setSearchInput] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [searchStatus, setSearchStatus] = useState<
    "idle" | "resolving" | "resolved" | "not-found" | "error"
  >("idle");
  const [hideZeroBalances, setHideZeroBalances] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced ENS/address resolution
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!searchInput) {
        setResolvedAddress("");
        setSearchStatus("idle");
        return;
      }

      setResolvedAddress("");
      setSearchStatus("resolving");

      if (isAddress(searchInput)) {
        setResolvedAddress(searchInput);
        setSearchStatus("resolved");
      } else if (searchInput.includes(".")) {
        try {
          const normalizedName = normalize(searchInput);
          const ensAddress = await publicClient.getEnsAddress({
            name: normalizedName,
          });
          if (ensAddress) {
            setResolvedAddress(ensAddress);
            setSearchStatus("resolved");
          } else {
            setSearchStatus("not-found");
          }
        } catch (e) {
          setSearchStatus("error");
        }
      } else {
        setSearchStatus("idle");
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Use resolvedAddress for all data fetching
  const { delegators, votingPower, delegations, isLoading } = useDelegators(
    resolvedAddress,
    hideZeroBalances
  );

  // Updates delegate address and ensures the search input is visible and focused
  const handleDelegateClick = (address: string) => {
    setResolvedAddress(address);
    setSearchInput(address);
    setSearchStatus("resolved");
    if (searchInputRef.current) {
      searchInputRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      searchInputRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col gap-14 overflow-x-hidden">
      {/* Top Delegates Table */}
      <div className="flex flex-col lg:flex-row w-full gap-4">
        <div className="order-1 flex-1 w-full">
          <DelegatesTable onDelegateClick={handleDelegateClick} />
        </div>
        <div className="order-2 w-full lg:max-w-xs hidden lg:block">
          <RecentActivity onDelegateClick={handleDelegateClick} />
        </div>
      </div>
      {/* Search Delegates Section */}
      <div id="search-section" className="flex flex-col  gap-5 justify-between ">
        <div className="flex flex-col gap-5">
          <h1 className="text-zinc-100 text-2xl">Search Delegates</h1>
          <Suspense>
            <SearchInput
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              searchInputRef={searchInputRef}
            />
          </Suspense>
          <p className="text-xs text-zinc-500 h-4">
            {searchStatus === "not-found" && "No address found"}
            {searchStatus === "error" && "Resolution failed"}
          </p>
        </div>
      </div>
      <hr className="border-t border-zinc-750 " />
      {/* Delegate Card */}
      <DelegateCard
        delegateAddress={resolvedAddress}
        votingPower={votingPower}
        delegations={delegations}
      />
      {/* Delegators Table */}
      <DelegatorsTable
        data={delegators}
        hideZeroBalances={hideZeroBalances}
        setHideZeroBalances={setHideZeroBalances}
      />
    </div>
  );
}

function DelegatorsTable({
  data,
  hideZeroBalances = true,
  setHideZeroBalances,
}: {
  data: Delegator[];
  hideZeroBalances?: boolean;
  setHideZeroBalances?: (hideZeroBalances: boolean) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const totalTokens = data.reduce(
    (sum, d) => sum + BigInt(d.delegator_tokens),
    0n
  );

  const totalPages = Math.ceil(data.length / rowsPerPage);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [hideZeroBalances, data]);

  return (
    <div className="bg-zinc-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4 mt-4">
        <h2 className="text-zinc-100 text-2xl font-bold">Power Breakdown</h2>
        <label className="flex items-center text-zinc-400">
          <input
            type="checkbox"
            checked={hideZeroBalances}
            onChange={(e) => {
              if (setHideZeroBalances) {
                setHideZeroBalances(e.target.checked);
              }
            }}
            className="mr-2"
          />
          Hide Zero Balance
        </label>
      </div>
      <div className="flex items-center mb-4">
        <div className="w-[7px] h-[7px] bg-zinc-700 "></div>
        <hr className="border-t border-zinc-700 w-full ml-2" />
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-left text-zinc-400">
            <th className="py-2">DELEGATOR</th>
            <th className="py-2 text-right">VOTES</th>
            <th className="py-2 pr-5 text-right"> %</th>
            <th className="py-2 text-right hidden md:table-cell">
              DATE DELEGATED
            </th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {currentData.map((row, index) => (
            <tr
              key={index}
              className="hover:bg-zinc-700 border-b text-zinc-100 text-right border-zinc-700"
            >
              <td className="text-left">
                <AddressCell delegateAddress={row.delegator} withLink={true} />
              </td>

              <td>{formatToken(row.delegator_tokens)}</td>
              <td className="py-3 pl-2 md:pl-0">
                {(
                  Number(
                    (BigInt(row.delegator_tokens) * 10000n) / totalTokens
                  ) / 100
                ).toFixed(1)}
                %
              </td>
              <td className="hidden md:table-cell">
                {" "}
                {new Date(
                  Number(row.delegated_timestamp) * 1000
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
            </tr>
          ))}
          <PlaceholderRows
            count={rowsPerPage - currentData.length}
            columns={["", "", "", "hidden md:table-cell"]}
          />
        </tbody>
      </table>
      <div className="mt-4 flex justify-between items-center text-zinc-400">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}

function DelegatesTable({
  onDelegateClick,
}: {
  onDelegateClick?: (address: string) => void;
}) {
  const [data, setData] = useState<Delegate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatedAt, setUpdatedAt] = useState("");
  const [votableSupply, setVotableSupply] = useState(0);
  const [showActivity, setShowActivity] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const rowsPerPage = 10;
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const {
    voteData,
    isLoading: isLoadingVotes,
    error: voteError,
  } = useVoteData(data);

  const [proposerStats, setProposerStats] = useState<ProposerStats[]>([]);

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [delegates, updatedAtTimestamp, supply] = await Promise.all([
          fetchTopDelegates(),
          fetchUpdatedAt(),
          fetchVotableSupply(),
        ]);
        setData(delegates);
        setUpdatedAt(updatedAtTimestamp);
        setVotableSupply(supply);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(`There was a problem fetching delegate data: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchProposerStats = async () => {
      if (data.length === 0) return;
      try {
        const addresses = data.map((d) => d.delegate_address);
        const response = await fetch("/api/get-proposer-stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addresses }),
        });
        if (response.ok) {
          const result = await response.json();
          setProposerStats(result.data || []);
        }
      } catch (e) {
        console.error("Error fetching proposer stats:", e);
      }
    };

    fetchProposerStats();
  }, [data]);

  const enrichedDelegates = useMemo(() => {
    const voteMap = new Map(
      voteData.map((v) => [v.voter.toLowerCase(), v])
    );
    return data.map((delegate) => {
      const vote = voteMap.get(delegate.delegate_address.toLowerCase());
      if (vote) {
        return {
          ...delegate,
          latest_vote_timestamp: vote.latestTimestamp,
          on_chain_votes: vote.uniqueProposalCount,
          votes_for: vote.votesFor,
          votes_against: vote.votesAgainst,
          votes_abstain: vote.votesAbstain,
        };
      }
      return delegate;
    });
  }, [data, voteData]);

  const sortedDelegates = sortField
    ? [...enrichedDelegates].sort((a, b) => {
        let aVal: number, bVal: number;
        switch (sortField) {
          case "voting_power":
            aVal = Number(a.voting_power);
            bVal = Number(b.voting_power);
            break;
          case "change":
            aVal = Number(a.voting_power - a.voting_power_30d_ago);
            bVal = Number(b.voting_power - b.voting_power_30d_ago);
            break;
          case "delegations":
            aVal = a.non_zero_delegations;
            bVal = b.non_zero_delegations;
            break;
          case "votes":
            aVal = a.on_chain_votes || 0;
            bVal = b.on_chain_votes || 0;
            break;
          default:
            aVal = a.rank;
            bVal = b.rank;
        }
        return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
      })
    : enrichedDelegates;

  const currentData = sortedDelegates.slice(startIndex, endIndex);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else {
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const [exporting, setExporting] = useState(false);

  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      // Batch resolve ENS names (reuses session cache populated by AddressCell)
      const names = await Promise.all(
        enrichedDelegates.map(async (row) => {
          try {
            return await getEnsNameCached(row.delegate_address);
          } catch {
            return null;
          }
        })
      );

      const csvData = enrichedDelegates.map((row, i) => ({
        Rank: row.rank,
        Name: names[i] || "",
        Delegate: row.delegate_address,
        "Voting Power": Math.round(Number(row.voting_power) / 1e18),
        "30 Day Change": Math.round(
          Number(row.voting_power - row.voting_power_30d_ago) / 1e18
        ),
        Delegations: row.non_zero_delegations,
        "On-chain Votes": row.on_chain_votes || 0,
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split("T")[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `ens-delegates-${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [enrichedDelegates]);

  return (
    <div className="bg-zinc-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4 mt-4">
        <div className="flex items-center gap-3">
          <h2 className="text-zinc-100 text-right text-2xl font-bold">
            {showActivity ? "Recent Activity" : "Top 100 ENS Delegates"}
          </h2>
          <button
            onClick={() => setShowActivity(!showActivity)}
            className="md:hidden p-1.5 hover:bg-zinc-700 transition-colors duration-300 rounded text-zinc-400 hover:text-zinc-100"
            title={showActivity ? "Show Top Delegates" : "Show Recent Activity"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {showActivity ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              )}
            </svg>
          </button>
        </div>
        <div className="flex  items-center gap-4">
          <div className="text-xs  hidden md:inline font-mono text-zinc-600">
            {getRelativeTime(updatedAt)}
          </div>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-3 py-1 hidden md:inline bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-wait transition-colors duration-300 rounded text-zinc-100 text-sm"
          >
            {exporting ? "Resolving names..." : "Export CSV"}
          </button>
        </div>
      </div>
      <div className="flex items-center mb-4">
        <div className="w-[7px] h-[7px] bg-zinc-700 "></div>
        <hr className="border-t border-zinc-700 w-full ml-2" />
      </div>
      <div className={showActivity ? "hidden md:block" : ""}>
        {error && data.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">{error}</div>
        ) : (
        <>
        <table className="w-full">
            <thead>
              <tr className="text-left text-zinc-400">
                <th className="py-2 w-24 text-center">Rank</th>
                <th className="py-2 text-left">Delegate</th>
                <th
                  className="py-2 text-right cursor-pointer hover:text-zinc-200 transition-colors duration-200 select-none"
                  onClick={() => handleSort("voting_power")}
                >
                  Voting Power{sortField === "voting_power" && (
                    <span className="ml-1 text-xs">{sortDirection === "desc" ? "↓" : "↑"}</span>
                  )}
                </th>
                <th
                  className="py-2 text-right md:whitespace-nowrap cursor-pointer hover:text-zinc-200 transition-colors duration-200 select-none"
                  onClick={() => handleSort("change")}
                >
                  <span className="hidden md:inline">30 Day </span>Δ
                  {sortField === "change" && (
                    <span className="ml-1 text-xs">{sortDirection === "desc" ? "↓" : "↑"}</span>
                  )}
                </th>
                <th
                  className="py-2 text-right hidden md:table-cell cursor-pointer hover:text-zinc-200 transition-colors duration-200 select-none"
                  onClick={() => handleSort("delegations")}
                >
                  Delegations{sortField === "delegations" && (
                    <span className="ml-1 text-xs">{sortDirection === "desc" ? "↓" : "↑"}</span>
                  )}
                </th>
                <th
                  className="py-2 text-right hidden lg:table-cell cursor-pointer hover:text-zinc-200 transition-colors duration-200 select-none"
                  onClick={() => handleSort("votes")}
                >
                  Voted #{sortField === "votes" && (
                    <span className="ml-1 text-xs">{sortDirection === "desc" ? "↓" : "↑"}</span>
                  )}
                </th>
              </tr>
            </thead>
        <tbody className="font-mono">
          {currentData.map((row, index) => (
            <tr
              key={index}
              className="hover:bg-zinc-700 border-b text-zinc-100 text-right border-zinc-700"
            >
              <td className="py-3 text-center">
                {new Intl.NumberFormat("en-US").format(row.rank)}
              </td>
              <td className="text-left w-72">
                <AddressCell
                  delegateAddress={row.delegate_address}
                  onClick={() => onDelegateClick?.(row.delegate_address)}
                  proposerStats={proposerStats.find(
                    (p) => p.proposer.toLowerCase() === row.delegate_address.toLowerCase()
                  )}
                />
              </td>
              <td className="w-48">{formatToken(row.voting_power)}</td>
              <td>
                {" "}
                <ChangeIndicator
                  change={row.voting_power_30d_ago - row.voting_power}
                  isNew={row.voting_power_30d_ago == 0n}
                />
              </td>

              <td className="hidden md:table-cell">
                {" "}
                {new Intl.NumberFormat("en-US").format(
                  row.non_zero_delegations
                )}
              </td>
              <td className="hidden lg:table-cell text-right">
                {row.on_chain_votes === 0 || !row.on_chain_votes ? (
                  <div className="flex justify-end">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M4 10h12a1 1 0 010 2H4a1 1 0 110-2z" />
                    </svg>
                  </div>
                ) : (
                  <span className="cursor-default group relative">
                    {row.on_chain_votes}
                    <span className="pointer-events-none absolute right-0 top-full mt-1 px-2 py-1 bg-zinc-800 text-xs rounded whitespace-nowrap z-10 border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-green-500">{row.votes_for || 0}</span>
                      {" · "}
                      <span className="text-red-500">{row.votes_against || 0}</span>
                      {" · "}
                      <span className="text-zinc-400">{row.votes_abstain || 0}</span>
                    </span>
                  </span>
                )}
              </td>
            </tr>
          ))}
          <PlaceholderRows
            count={rowsPerPage - currentData.length}
            columns={["", "", "", "hidden md:table-cell", "hidden lg:table-cell"]}
          />
        </tbody>
        </table>
        <div className="mt-4 flex justify-between items-center text-zinc-400">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
          <div className="text-sm font-mono text-zinc-400">
            Votable: {formatToken(BigInt(votableSupply))}
          </div>
        </div>
        </>
        )}
      </div>
      {showActivity && (
        <div className="md:hidden">
          <RecentActivity onDelegateClick={onDelegateClick} compact={true} />
        </div>
      )}
    </div>
  );
}

function DelegateCard({
  delegateAddress,
  votingPower,
  delegations,
}: {
  delegateAddress: string;
  votingPower: bigint;
  delegations: number;
}) {
  const [profile, setProfile] = useState({
    ensName: "",
    x: "",
    telegram: "",
    github: "",
    email: "",
    avatarUrl: null as string | null,
    rank: "",
  });
  const { ensName, x, telegram, github, email, avatarUrl, rank } = profile;
  const [loading, setLoading] = useState(false);
  const [voteStats, setVoteStats] = useState<VoteData | null>(null);
  const [totalProposals, setTotalProposals] = useState(0);
  const [voteLoading, setVoteLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    setProfile({ ensName: "", x: "", telegram: "", github: "", email: "", avatarUrl: null, rank: "" });
    setVoteStats(null);
    setTotalProposals(0);
    setVoteLoading(false);

    const fetchVoteStats = async () => {
      if (!delegateAddress) return;
      setVoteLoading(true);
      try {
        const { data, totalProposals: total } = await fetchVotingHistory([delegateAddress], signal);
        if (data.length > 0) setVoteStats(data[0]);
        setTotalProposals(total);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error("Error fetching vote stats:", e);
      } finally {
        setVoteLoading(false);
      }
    };

    const fetchEnsData = async () => {
      setLoading(true);
      if (delegateAddress) {
        try {
          const response = await fetch(
            `https://ens-api.slobo.xyz/address/${delegateAddress}`,
            { signal }
          );
          if (response.ok) {
            const data = await response.json();
            if (data.name) {
              setProfile(prev => ({
                ...prev,
                ensName: data.name,
                x: data.texts?.["com.twitter"] || "",
                telegram: data.texts?.["org.telegram"] || "",
                email: data.texts?.["email"] || "",
                github: data.texts?.["com.github"] || "",
                avatarUrl: data.avatar?.lg || null,
              }));
            }
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error("Error fetching ENS data:", error);
        }
      }
      setLoading(false);
    };

    const fetchRank = async () => {
      if (!delegateAddress) return;
      try {
        const data = await fetchDelegateRank(delegateAddress, signal);
        setProfile(prev => ({ ...prev, rank: data }));
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error("Error fetching rank:", e);
      }
    };

    fetchRank();
    fetchEnsData();
    fetchVoteStats();

    return () => controller.abort();
  }, [delegateAddress]);

  const totalVotes = voteStats ? voteStats.votesFor + voteStats.votesAgainst + voteStats.votesAbstain : 0;
  const participationPct = totalProposals > 0 && voteStats
    ? Math.round((voteStats.uniqueProposalCount / totalProposals) * 100)
    : 0;

  return (
    <div className="bg-zinc-800 rounded overflow-hidden">
    <div className="p-6 flex  justify-between flex-wrap md:flex-nowrap gap-5">
      <div className="flex relative gap-4 w-fit ">
        <RankBadge rank={Number(rank)} />

        {ensName && <Avatar avatarUrl={avatarUrl} loading={loading} />}
        {!ensName && (
          <Image
            src={"default_avatar.svg"}
            alt="Avatar"
            width={110}
            height={110}
            className="rounded-full"
          />
        )}

        <div className="flex flex-col gap-4 w-full min-w-52">
          <div
            className={`text-3xl h-9 ${
              !ensName ? "text-zinc-300 text-xl" : ""
            }`}
          >
            {loading ? (
              <div className="flex gap-2 items-center h-7">
                <div className="w-2 h-2 bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-600 bg-[length:200%_100%] animate-shimmer rounded-full"></div>
                <div className="w-2 h-2 bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-600 bg-[length:200%_100%] animate-shimmer rounded-full delay-100"></div>
                <div className="w-2 h-2 bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-600 bg-[length:200%_100%] animate-shimmer rounded-full delay-200"></div>
              </div>
            ) : ensName ? (
              <Link
                href={`https://app.ens.domains/${ensName}`}
                target="_blank"
                className="hover:text-ens-blue duration-300 transition-colors"
              >
                {ensName}
              </Link>
            ) : (
              delegateAddress && "Name not set 😭"
            )}
          </div>
          <div className="flex gap-2">
            <div className=" text-sm h-5 font-mono">
              {delegateAddress && ShortenAddress(delegateAddress)}
            </div>
            {delegateAddress && (
              <Link
                href={`https://etherscan.io/address/${delegateAddress}`}
                target="_blank"
                className="hover:opacity-80 duration-300 transition-opacity"
              >
                <Image
                  src="/icon_etherscan.svg"
                  alt="Etherscan Icon"
                  width={16}
                  height={16}
                />
              </Link>
            )}
          </div>
          {/* Social Links */}
          {!loading && (
            <div className="flex gap-2">
              {[
                { value: x, href: `https://x.com/${x}`, icon: "/icon_x.svg", alt: "X" },
                { value: github, href: `https://github.com/${github}`, icon: "/icon_github.svg", alt: "GitHub" },
                { value: telegram, href: `https://t.me/${telegram}`, icon: "/icon_telegram.svg", alt: "Telegram" },
                { value: email, href: `mailto:${email}`, icon: "/icon_email.svg", alt: "Email" },
              ]
                .filter((link) => link.value)
                .map((link) => (
                  <Link
                    key={link.alt}
                    href={link.href}
                    target="_blank"
                    className="duration-300 hover:bg-zinc-700 transition-all border border-zinc-700 rounded p-1"
                  >
                    <Image src={link.icon} alt={`${link.alt} Icon`} width={16} height={16} />
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>
      {!loading && (
        <div className="hidden ml-10 lg:flex lg:-mb-8 lg:flex-col lg:justify-end w-full mx-auto">
          <Suspense>
            <DelegatePowerChart delegateAddress={delegateAddress} />
          </Suspense>
        </div>
      )}

      {/* VP & Delegations grid */}
      <div className="grid grid-cols-2  w-full md:w-fit  min-w-fit  ">
        <div className="p-4 gap-1 justify-center flex text-center md:min-w-48 text-zinc-100 text-xl font-mono  border-r border-b border-zinc-700">
          {votingPower != 0n ? (
            <div className="flex gap-1">
              <Image
                src="/icon_fire.svg"
                alt="Fire Icon"
                width={20}
                height={20}
              />
              {formatToken(votingPower, true)}
            </div>
          ) : (
            <div className="flex gap-2 justify-center items-center h-7">
              <div className="w-2 h-2 bg-slate-100 rounded-full"></div>
              <div className="w-2 h-2 bg-slate-100 rounded-full"></div>
              <div className="w-2 h-2 bg-slate-100 rounded-full"></div>
            </div>
          )}
        </div>
        <div className="p-4  text-center md:min-w-48 text-zinc-100 font-mono  border-zinc-700 border-b text-xl">
          {delegations.toLocaleString() == "0" ? (
            <div className="flex gap-2 justify-center items-center h-7">
              <div className="w-2 h-2 bg-slate-100 rounded-full"></div>
              <div className="w-2 h-2 bg-slate-100 rounded-full"></div>
              <div className="w-2 h-2 bg-slate-100 rounded-full"></div>
            </div>
          ) : (
            delegations.toLocaleString()
          )}
        </div>
        <div className="p-4 text-center font-light  border-r border-zinc-700  text-zinc-400">
          Voting Power
        </div>
        <div className="p-4 text-center font-light text-zinc-400">
          Delegations
        </div>
      </div>
    </div>
    {/* Voting Stats Bar */}
    {delegateAddress && (
      <div className="border-t border-zinc-700 px-6 py-3">
        {voteLoading ? (
          <div className="h-5 w-48 bg-zinc-700 rounded animate-pulse" />
        ) : voteStats && totalVotes > 0 && totalProposals > 0 ? (
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <span className="text-zinc-400 text-sm whitespace-nowrap">
              Voted <span className="text-zinc-100 font-mono">{voteStats.uniqueProposalCount}</span>/<span className="font-mono">{totalProposals}</span>
              <span className="text-zinc-500 ml-1">({participationPct}%)</span>
            </span>
            <div className="flex items-center gap-3 flex-1">
              <div className="flex h-1.5 flex-1 rounded-full overflow-hidden bg-zinc-700">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(voteStats.votesFor / totalVotes) * 100}%` }}
                />
                <div
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${(voteStats.votesAgainst / totalVotes) * 100}%` }}
                />
                <div
                  className="bg-zinc-500 transition-all duration-500"
                  style={{ width: `${(voteStats.votesAbstain / totalVotes) * 100}%` }}
                />
              </div>
              <div className="flex gap-3 text-xs whitespace-nowrap">
                <span className="text-emerald-500 font-mono">{voteStats.votesFor} <span className="text-zinc-500">For</span></span>
                <span className="text-red-500 font-mono">{voteStats.votesAgainst} <span className="text-zinc-500">Against</span></span>
                <span className="text-zinc-400 font-mono">{voteStats.votesAbstain} <span className="text-zinc-500">Abstain</span></span>
              </div>
            </div>
          </div>
        ) : voteStats && totalVotes === 0 ? (
          <span className="text-zinc-500 text-sm">No on-chain votes</span>
        ) : null}
      </div>
    )}
    </div>
  );
}

function Avatar({
  avatarUrl,
  loading,
}: {
  avatarUrl: string | null;
  loading?: boolean;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    setImgSrc(null);
    setLoadError(false);
    setIsFetching(false);

    if (avatarUrl && !loading) {
      const fetchAvatar = async () => {
        setIsFetching(true);
        try {
          const response = await fetch(avatarUrl);
          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setImgSrc(url);
          } else {
            setLoadError(true);
          }
        } catch (error) {
          setLoadError(true);
        } finally {
          setIsFetching(false);
        }
      };

      fetchAvatar();
    }
  }, [avatarUrl, loading]);

  // Cleanup object URL on unmount or when image changes
  useEffect(() => {
    return () => {
      if (imgSrc) {
        URL.revokeObjectURL(imgSrc);
      }
    };
  }, [imgSrc]);

  // Show loading state while fetching ENS data or avatar
  if (loading || isFetching) {
    return (
      <div className="min-w-fit">
        <Image
          src="/loading.svg"
          alt="loading"
          width={110}
          height={110}
          className="p-8"
        />
      </div>
    );
  }

  // If we have an error or no image source, show the default avatar
  if (loadError || !imgSrc) {
    return (
      <div className="min-w-fit">
        <Image
          src="default_avatar.svg"
          alt="Avatar"
          width={110}
          height={110}
          className="rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-w-fit">
      <Image
        src={imgSrc}
        alt="Avatar"
        width={110}
        height={110}
        className="rounded-full"
      />
    </div>
  );
}

function SearchInput({
  searchInput,
  setSearchInput,
  searchInputRef,
}: {
  searchInput: string;
  setSearchInput: (searchInput: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="relative pl-2">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <Image src="icon_search.svg" alt="Search Icon" width={20} height={20} />
      </div>
      <input
        className="bg-zinc-800 w-full max-w-lg min-w-80 transition-shadow duration-1000 focus:ring-2 focus:ring-zinc-400 text-zinc-100 py-2 pl-11 pr-3 rounded focus:outline-none"
        placeholder="slobo.eth or 0x5423..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        ref={searchInputRef}
        spellCheck="false"
      />
    </div>
  );
}

function PlaceholderRows({
  count,
  columns,
}: {
  count: number;
  columns: string[];
}) {
  if (count <= 0) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <tr key={`placeholder-${i}`} className="border-b border-zinc-700">
          {columns.map((className, j) => (
            <td
              key={j}
              className={`${j === 0 ? "py-3 text-left" : ""} ${className}`.trim()}
            >
              &nbsp;
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return rank > 0 ? (
    <div className="-top-6 -left-3 absolute">
      <Image src="/badge_bg.svg" alt="badge" width={28} height={28} />
      <div
        className={`absolute inset-0 flex items-center justify-center text-zinc-200 font-bold ${
          rank > 100 ? "text-[9px]" : "text-sm"
        }`}
      >
        {new Intl.NumberFormat("en-US").format(rank)}
      </div>
    </div>
  ) : null;
}
