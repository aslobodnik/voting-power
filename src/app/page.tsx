"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";

import { Address } from "viem";
import { getEnsName } from "viem/ens";

import {
  fetchTopDelegates,
  fetchUpdatedAt,
  fetchDelegateRank,
} from "./lib/client-api";
import { formatToken, ShortenAddress, getRelativeTime } from "./lib/helpers";
import publicClient from "./lib/publicClient";

// Hooks
import useDelegateSearch from "./hooks/useDelegateSearch";
import useDelegators from "./hooks/useDelegators";
import useVoteData from "./hooks/useVoteData";

// Components
import AddressCell from "./components/AddressCell";
import Pagination from "./components/Pagination";
import DelegatePowerChart from "./components/DelegatePowerChart";

export default function Home() {
  const [delegateAddress, setDelegateAddress] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [hideZeroBalances, setHideZeroBalances] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { delegators, votingPower, delegations, isLoading } = useDelegators(
    delegateAddress,
    hideZeroBalances
  );

  // Updates delegate address and ensures the search input is visible and focused
  const handleDelegateClick = (address: string) => {
    setDelegateAddress(address);
    setSearchInput(address);
    if (searchInputRef.current) {
      searchInputRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      searchInputRef.current.focus();
    }
  };

  useDelegateSearch(searchInput, setDelegateAddress);

  return (
    <div className="flex flex-col gap-14">
      {/* Top Delegates Table */}
      <DelegatesTable
        setDelegateAddress={setDelegateAddress}
        onDelegateClick={handleDelegateClick}
      />
      {/* Search Delegates Section */}
      <div className="flex flex-col  gap-5 justify-between ">
        <div className="flex flex-col gap-5">
          <h1 className="text-zinc-100 text-2xl">Search Delegates</h1>
          <Suspense>
            <SearchInput
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              searchInputRef={searchInputRef}
            />
          </Suspense>
        </div>
      </div>
      <hr className="border-t border-zinc-750 " />
      {/* Delegate Card */}
      <DelegateCard
        delegateAddress={delegateAddress}
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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
              <td>
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
          {Array.from(
            { length: Math.max(rowsPerPage - currentData.length, 0) },
            (_, index) => (
              <tr
                key={`placeholder-${index}`}
                className="border-b border-zinc-700"
              >
                <td className="py-3 text-left">&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td className="hidden md:table-cell">&nbsp;</td>
              </tr>
            )
          )}
        </tbody>
      </table>
      <div className="mt-4 flex justify-between items-center text-zinc-400">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}

function DelegatesTable({
  onDelegateClick,
}: {
  setDelegateAddress: (address: string) => void;
  onDelegateClick?: (address: string) => void;
}) {
  const [data, setData] = useState<Delegate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatedAt, setUpdatedAt] = useState("");

  const rowsPerPage = 10;
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const {
    voteData,
    isLoading: isLoadingVotes,
    error: voteError,
  } = useVoteData(data);

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  useEffect(() => {
    const fetchTopDelegatesData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchTopDelegates();
        setData(data);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(`There was a problem fetching top delegates: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopDelegatesData();
  }, []);

  useEffect(() => {
    const fetchUpdatedAtTimestamp = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchUpdatedAt();
        setUpdatedAt(data);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(`There was a problem fetching top delegates: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpdatedAtTimestamp();
  }, []);

  const handleClick = (address: string) => {
    if (onDelegateClick) {
      onDelegateClick(address);
    }
  };

  const enrichedDelegates = data.map((delegate) => {
    const vote = voteData.find(
      (v) => v.voter.toLowerCase() === delegate.delegate_address.toLowerCase()
    );

    if (vote) {
      return {
        ...delegate,
        latest_vote_timestamp: vote.latestTimestamp,
        on_chain_votes: vote.uniqueProposalCount,
      };
    }
    return delegate;
  });

  const currentData = enrichedDelegates.slice(startIndex, endIndex);

  return (
    <div className="bg-zinc-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4 mt-4">
        <h2 className="text-zinc-100 text-right text-2xl font-bold">
          Top 100 ENS Delegates
        </h2>
        <div className="text-xs font-mono text-zinc-600">
          {getRelativeTime(updatedAt)}
        </div>
      </div>
      <div className="flex items-center mb-4">
        <div className="w-[7px] h-[7px] bg-zinc-700 "></div>
        <hr className="border-t border-zinc-700 w-full ml-2" />
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-left text-zinc-400">
            <th className="py-2 w-24 text-center">Rank</th>
            <th className="py-2 text-left">Delegate</th>
            <th className="py-2 text-right ">Voting Power</th>
            <th className="py-2 text-right hidden md:table-cell">
              Delegations
            </th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {currentData.map((row, index) => (
            <tr
              key={index}
              className="hover:bg-zinc-700 border-b text-zinc-100 text-right border-zinc-700"
            >
              <td className="py-3 text-center">{row.rank}</td>
              <td className="text-left w-72">
                <AddressCell
                  delegateAddress={row.delegate_address}
                  onClick={() => handleClick(row.delegate_address)}
                  onChainVotes={row.on_chain_votes}
                  withVotes={true}
                />
              </td>
              <td className="w-48">{formatToken(row.voting_power)}</td>
              <td className="hidden md:table-cell">
                {" "}
                {new Intl.NumberFormat("en-US").format(
                  row.non_zero_delegations
                )}
              </td>
            </tr>
          ))}
          {Array.from(
            { length: Math.max(rowsPerPage - currentData.length, 0) },
            (_, index) => (
              <tr
                key={`placeholder-${index}`}
                className="border-b border-zinc-700"
              >
                <td className="py-3 text-left">&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td className="hidden md:table-cell">&nbsp;</td>
              </tr>
            )
          )}
        </tbody>
      </table>
      <div className="mt-4 flex justify-between items-center text-zinc-400">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
        <div className="md:flex flex-col gap-2 hidden ">
          <div className="flex justify-between items-center gap-1">
            <div className="text-xs">Voted {">"} 19</div>
            <div className="h-3 w-3 bg-ens-blue"></div>
          </div>
          <div className="flex justify-between items-center gap-1">
            <div className="text-xs">Voted {">"} 0</div>
            <div className="h-3 w-3 bg-yellow-300"></div>
          </div>
          <div className="flex justify-between gap-2 items-center">
            <div className="text-xs">Never Voted</div>
            <div className="h-3 w-3 bg-red-400"></div>
          </div>
        </div>
      </div>
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
  const [ensName, setEnsName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [github, setGithub] = useState("");
  const [email, setEmail] = useState("");
  const [x, setX] = useState("");
  const [loading, setLoading] = useState(false); // State to track loading status
  const [rank, setRank] = useState("");

  useEffect(() => {
    setX("");
    setTelegram("");
    setEmail("");
    setGithub("");
    setEnsName("");
    setRank("");

    const fetchEnsData = async () => {
      setLoading(true); // Start loading
      console.log("loading....");
      if (delegateAddress) {
        try {
          const ens = await getEnsName(publicClient, {
            address: delegateAddress as Address,
          });
          if (ens) {
            setEnsName(ens);

            const ensX = await publicClient.getEnsText({
              name: ens,
              key: "com.twitter",
            });
            const ensTelegram = await publicClient.getEnsText({
              name: ens,
              key: "org.telegram",
            });
            const ensEmail = await publicClient.getEnsText({
              name: ens,
              key: "email",
            });
            const ensGithub = await publicClient.getEnsText({
              name: ens,
              key: "com.github",
            });

            setX(ensX || "");
            setTelegram(ensTelegram || "");
            setEmail(ensEmail || "");
            setGithub(ensGithub || "");
          }
        } catch (error) {
          console.error("Error fetching ENS data:", error);
        }

        setLoading(false); // End loading
      } else {
        setLoading(false); // Ensure loading is set to false if no delegateAddress
      }
      console.log("done loading....");
    };
    const fetchRank = async () => {
      try {
        const data = await fetchDelegateRank(delegateAddress);
        setRank(data);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(`There was a problem fetching rank: ${errorMessage}`);
      }
    };
    fetchRank();
    fetchEnsData();
  }, [delegateAddress]);

  return (
    <div className="bg-zinc-800 rounded p-6 flex  justify-between flex-wrap md:flex-nowrap gap-5">
      <div className="flex relative gap-4 w-fit ">
        <RankBadge rank={Number(rank)} />

        {ensName && <Avatar ensName={ensName} loading={loading} />}
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
            {ensName || (delegateAddress && "Name not set 😭")}
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
              {x && (
                <Link
                  href={`https://x.com/${x}`}
                  target="_blank"
                  className="duration-300 hover:bg-zinc-700  transition-all  border border-zinc-700 rounded p-1"
                >
                  {" "}
                  <Image
                    src="/icon_x.svg"
                    alt="X Icon"
                    width={16}
                    height={16}
                  />
                </Link>
              )}
              {github && (
                <Link
                  href={`https://github.com/${github}`}
                  target="_blank"
                  className="duration-300 hover:bg-zinc-700  transition-all  border border-zinc-700 rounded p-1"
                >
                  <Image
                    src="/icon_github.svg"
                    alt="github Icon"
                    width={16}
                    height={16}
                  />
                </Link>
              )}
              {telegram && (
                <Link
                  href={`https://t.me/${telegram}`}
                  target="_blank"
                  className="duration-300 hover:bg-zinc-700  transition-all  border border-zinc-700 rounded p-1"
                >
                  <Image
                    src="/icon_telegram.svg"
                    alt="Telegram Icon"
                    width={16}
                    height={16}
                  />
                </Link>
              )}
              {email && (
                <Link
                  href={`mailto:${email}`}
                  target="_blank"
                  className="duration-300 hover:bg-zinc-700  transition-all  border border-zinc-700 rounded p-1"
                >
                  <Image
                    src="/icon_email.svg"
                    alt="Email Icon"
                    width={16}
                    height={16}
                  />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      {!loading && (
        <div className="hidden ml-10 lg:flex lg:-mb-8 lg:flex-col lg:justify-end w-full -mr-4 mx-auto">
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
  );
}

function Avatar({ ensName, loading }: { ensName: string; loading?: boolean }) {
  const [imgSrc, setImgSrc] = useState(
    `https://metadata.ens.domains/mainnet/avatar/${ensName}`
  );
  const [loadError, setLoadError] = useState(false);

  return (
    <div className="min-w-fit">
      {ensName &&
        (loading ? (
          <Image
            src="/loading.svg"
            alt="loading"
            width={110}
            height={110}
            className="p-8"
          />
        ) : (
          <Image
            src={loadError ? "default_avatar.svg" : imgSrc}
            onError={() => setLoadError(true)}
            alt="Avatar"
            width={110}
            height={110}
            className="rounded-full"
          />
        ))}
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
  const searchParams = useSearchParams();

  const address = searchParams.get("address") || "";

  useEffect(() => {
    if (!searchInput && address) {
      setSearchInput(address);
    }
  }, [address, searchInput, setSearchInput]);
  return (
    <div className="relative ">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <Image src="icon_search.svg" alt="Search Icon" width={20} height={20} />
      </div>
      <input
        className="bg-zinc-800 w-full  max-w-lg  min-w-80 transition-shadow duration-1000 focus:ring-2 focus:ring-zinc-400 text-zinc-100 py-2 pl-11 pr-3 rounded focus:outline-none"
        placeholder="slobo.eth or 0x5423..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        ref={searchInputRef}
        spellCheck="false"
      />
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return rank > 0 && rank <= 99 ? (
    <div className="-top-6 -left-3 absolute">
      <Image src="/badge_bg.svg" alt="badge" width={28} height={28} />
      <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-200 font-bold">
        {rank}
      </div>
    </div>
  ) : null;
}
