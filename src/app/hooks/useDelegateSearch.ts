import { useEffect } from "react";
import { normalize } from "viem/ens";
import publicClient from "../lib/publicClient";
import { isAddress } from "viem";
import debounce from "debounce";

function useDelegateSearch(
  searchInput: string,
  setDelegateAddress: (address: string) => void
) {
  useEffect(() => {
    const handleSearch = async (input: string) => {
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
          } else {
            setDelegateAddress("");
          }
        } catch (error) {
          console.error("Error resolving ENS name:", error);
          setDelegateAddress("");
        }
      } else if (/^[a-zA-Z0-9]+$/.test(input)) {
        setDelegateAddress("");
      }
    };

    const debouncedHandleSearch = debounce(handleSearch, 300);

    if (searchInput) {
      debouncedHandleSearch(searchInput);
    } else {
      setDelegateAddress("");
    }

    return () => {
      debouncedHandleSearch.clear();
    };
  }, [searchInput, setDelegateAddress]);
}

export default useDelegateSearch;
