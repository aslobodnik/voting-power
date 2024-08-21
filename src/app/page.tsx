"use client";
import Image from "next/image";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatToken, ShortenAddress } from "./helpers";

import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { isAddress } from "viem";
import { getEnsName, getEnsAddress, normalize } from "viem/ens";
import { Address } from "viem";
import Pagination from "./components/Pagination";
import debounce from "debounce";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC_ENDPOINT),
  batch: {
    multicall: true,
  },
});

type Delegator = {
  delegator: string;
  delegator_tokens: bigint;
  block_delegated: bigint;
  delegated_timestamp: bigint;
};
type DelegatorsTableProps = {
  data: Delegator[];
  hideZeroBalances?: boolean;
  setHideZeroBalances?: (hideZeroBalances: boolean) => void;
};

type Delegate = {
  delegate_address: string;
  voting_power: bigint;
  rank: number;
  delegations: number;
  block_timestamp: bigint;
  non_zero_delegations: number;
};

export default function Home() {
  const [delegatorsData, setDelegatorsData] = useState<Delegator[]>([]);
  const [delegatorsFilteredData, setDelegatorsFilteredData] = useState<
    Delegator[]
  >([]);
  const [delegateAddress, setDelegateAddress] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [hideZeroBalances, setHideZeroBalances] = useState(true);
  const [searchAddress, setSearchAddress] = useState("");
  const [votingPower, setVotingPower] = useState<bigint>(0n);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleDelegateClick = (address: string) => {
    setDelegateAddress(address);
    setSearchInput(address);

    // Scroll to and focus on the search input
    if (searchInputRef.current) {
      searchInputRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      searchInputRef.current.focus();
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!delegateAddress) return;
      setIsLoading(true);
      setError(null);
      const url = `/api/get-delegators?delegate=${encodeURIComponent(
        delegateAddress
      )}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const r = await response.json();
        setDelegatorsData(r.data);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(`There was a problem fetching the data: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [delegateAddress]);

  useEffect(() => {
    if (delegatorsData.length === 0) return;

    const totalTokens = delegatorsData.reduce(
      (sum, d) => sum + BigInt(d.delegator_tokens),
      0n
    );

    const filteredData = hideZeroBalances
      ? delegatorsData.filter((d) => d.delegator_tokens >= 1000000000000000000n)
      : delegatorsData;

    // You may also want to store `totalTokens` and `filteredData` in state or context if they need to be accessed elsewhere
    setVotingPower(totalTokens); // Assuming you have a state setter for totalTokens
    setDelegatorsFilteredData(filteredData); // Assuming you have a state setter for filtered data
  }, [delegatorsData, hideZeroBalances]);

  useEffect(() => {
    const handleSearch = async (input: string) => {
      if (isAddress(input)) {
        setSearchAddress(input);
        setDelegateAddress(input);
      } else if (input.includes(".")) {
        try {
          const normalizedName = normalize(input);
          const ensAddress = await publicClient.getEnsAddress({
            name: normalizedName,
          });
          if (ensAddress) {
            setSearchAddress(ensAddress);
            setDelegateAddress(ensAddress);
          } else {
            setSearchAddress("");
            setDelegateAddress("");
          }
        } catch (error) {
          console.error("Error resolving ENS name:", error);
          setSearchAddress("");
          setDelegateAddress("");
        }
      } else if (/^[a-zA-Z0-9]+$/.test(input)) {
        setSearchAddress("");
        setDelegateAddress("");
      }
    };

    const debouncedHandleSearch = debounce(handleSearch, 300);

    if (searchInput) {
      debouncedHandleSearch(searchInput);
    } else {
      setSearchAddress("");
      setDelegateAddress("");
    }

    return () => {
      debouncedHandleSearch.clear();
    };
  }, [searchInput]);
  return (
    <div className="flex flex-col gap-14">
      {/* Top Delegates Table */}
      <DelegatesTable
        setDelegateAddress={setDelegateAddress}
        onDelegateClick={handleDelegateClick}
      />
      {/* Search Delegates Section */}
      <div className="flex flex-col md:flex-row gap-5 justify-between md:items-end">
        <div className="flex flex-col gap-5">
          <h1 className="text-zinc-100 text-2xl">Search Delegates</h1>
          <div className="text-zinc-100 font-mono">
            Delegates create and vote on proposals; keep track of a delegate’s
            delegators.
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Image
              src="icon_search.svg"
              alt="Search Icon"
              width={20}
              height={20}
            />
          </div>
          <input
            className="bg-zinc-800 w-full  min-w-80 transition-shadow duration-1000 focus:ring-2 focus:ring-zinc-400 text-zinc-100 py-2 pl-11 pr-3 rounded focus:outline-none"
            placeholder="slobo.eth or 0x5423..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            ref={searchInputRef}
            spellCheck="false"
          />
        </div>
      </div>
      <hr className="border-t border-zinc-750 " />
      {/* Delegate Card */}
      <DelegateCard
        delegateAddress={delegateAddress}
        votingPower={votingPower}
        delegations={delegatorsFilteredData.length}
      />

      {/* Delegators Table */}

      <DelegatorsTable
        data={delegatorsFilteredData}
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
}: DelegatorsTableProps) {
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
              <DelegateAddressCell delegateAddress={row.delegator} />
              <td>{formatToken(row.delegator_tokens)}</td>
              <td className="py-3">
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
        <span>Total: {data.length.toLocaleString()}</span>
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

  const rowsPerPage = 10;
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      console.log("loading....");
      setError(null);
      const url = "/api/get-top-delegates";

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const r = await response.json();
        setData(r.data);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(`There was a problem fetching the data: ${errorMessage}`);
      } finally {
        setIsLoading(false);
        console.log("loading complete");
      }
    };

    fetchData();
  }, []);

  const handleClick = (address: string) => {
    if (onDelegateClick) {
      onDelegateClick(address);
    }
  };

  return (
    <div className="bg-zinc-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4 mt-4">
        <h2 className="text-zinc-100 text-right text-2xl font-bold">
          Top 100 ENS Delegates
        </h2>
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
              <DelegateAddressCell
                delegateAddress={row.delegate_address}
                onClick={() => handleClick(row.delegate_address)}
              />
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

  useEffect(() => {
    setX("");
    setTelegram("");
    setEmail("");
    setGithub("");
    setEnsName("");

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

    fetchEnsData();
  }, [delegateAddress]);

  return (
    <div className="bg-zinc-800 rounded p-6 flex  justify-between flex-wrap md:flex-nowrap gap-5">
      <div className="flex gap-4 w-fit ">
        <div className="min-w-fit ">
          {ensName && <Avatar ensName={ensName} />}
          {!ensName && (
            <div className="bg-slate-700 h-[110px] w-[110px] rounded-full"></div>
          )}
        </div>
        <div className="flex flex-col gap-4 w-full min-w-52">
          <div className=" text-3xl h-9">{ensName}</div>
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
              {formatToken(votingPower)}
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

function DelegateAddressCell({
  delegateAddress,
  onClick,
}: {
  delegateAddress: string;
  onClick?: () => void;
}) {
  const [ensName, setEnsName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEnsName() {
      try {
        const ens = await publicClient.getEnsName({
          address: delegateAddress as Address,
        });
        setEnsName(ens);
      } catch (error) {
        console.error(`Error fetching ENS for ${delegateAddress}:`, error);
      }
    }

    fetchEnsName();
  }, [delegateAddress]);

  return (
    <td onClick={onClick} className="text-left w-72 cursor-pointer">
      {ensName || ShortenAddress(delegateAddress)}
    </td>
  );
}

function Avatar({ ensName }: { ensName: string }) {
  const [imgSrc, setImgSrc] = useState(
    `https://metadata.ens.domains/mainnet/avatar/${ensName}`
  );
  const [loadError, setLoadError] = useState(false);

  return (
    <div className="min-w-fit">
      {!loadError ? (
        <Image
          src={imgSrc}
          onError={() => setLoadError(true)}
          alt="Avatar"
          width={110}
          height={110}
          className="rounded-full"
        />
      ) : (
        <div className="bg-slate-700 h-[110px] w-[110px] rounded-full"></div>
      )}
    </div>
  );
}
