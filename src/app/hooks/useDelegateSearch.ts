import { useEffect, useState } from "react";
import { normalize } from "viem/ens";
import publicClient from "../lib/publicClient";
import { isAddress } from "viem";
import debounce from "debounce";

function useDelegateSearch(
  searchInput: string,
  setDelegateAddress: (address: string) => void
) {
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const handleSearch = async (input: string) => {
      setIsSearching(true);
      if (isAddress(input)) {
        setDelegateAddress(input);
      } else if (input.includes(".")) {
        try {
          const normalizedName = normalize(input);
          const ensAddress = await publicClient.getEnsAddress({
            name: normalizedName,
          });
          if (ensAddress) {
            setDelegateAddress(ensAddress);
          }
        } catch (error) {
          console.error("Error resolving ENS name:", error);
        }
      }
      setIsSearching(false);
    };

    const debouncedHandleSearch = debounce(handleSearch, 500);

    if (searchInput) {
      debouncedHandleSearch(searchInput);
    }

    return () => {
      debouncedHandleSearch.clear();
    };
  }, [searchInput, setDelegateAddress]);

  return isSearching;
}

export default useDelegateSearch;
