"use client";
import { useEffect, useState } from "react";
import Pagination from "../components/Pagination";
import { formatToken } from "../lib/helpers";
import AddressCell from "../components/AddressCell";

export default function Holders() {
  return <HoldersTable />;
}

function HoldersTable({}: {}) {
  const [data, setData] = useState<Holder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 20;
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
      const url = "/api/get-top-holders";

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

  const calculatePrecisePercentage = (balance: bigint) => {
    const balanceBigInt = BigInt(balance);
    const percentage = balanceBigInt / 10n ** 20n;
    return (Number(percentage) / 10000).toFixed(2);
  };

  return (
    <div className="bg-zinc-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4 mt-4">
        <h2 className="text-zinc-100 text-right text-2xl font-bold">
          Top 1,000 $ENS Holders
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
            <th className="py-2 text-left">Holder</th>
            <th className="py-2 text-right ">Balance</th>
            <th className="py-2 text-right ">%</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {currentData.map((row, index) => (
            <tr
              key={index}
              className="hover:bg-zinc-700 border-b text-zinc-100 text-right border-zinc-700"
            >
              <td className="py-3 text-center">{row.rank}</td>
              <AddressCell delegateAddress={row.address} withLink={true} />
              <td className="w-48">{formatToken(row.balance)}</td>
              <td className="py-3">
                {calculatePrecisePercentage(row.balance)}%
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
