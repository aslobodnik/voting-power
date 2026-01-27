"use client";
import React, { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

function NavBar() {
  return (
    <nav className="flex items-center md:flex-row flex-col gap-8 max-w-screen-xl pt-10 px-4 mx-auto ">
      <div className="flex items-center">
        <Link href="/" className="flex">
          <Image
            src="/wordmark_orange.svg"
            alt="wordmark"
            className="mr-2"
            width={220}
            height={70}
          />
        </Link>
        <Image src="/ens_pill.svg" alt="ENS Logo" width={70} height={40} />
      </div>

      <div className="flex-1 flex justify-end items-center gap-6">
        <NavItems />
        <button
          onClick={() => {
            const searchSection = document.getElementById("search-section");
            const searchInput = searchSection?.querySelector("input");
            searchSection?.scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => searchInput?.focus(), 500);
          }}
          className="text-zinc-400 hover:text-zinc-100 transition-colors duration-200"
          aria-label="Search delegates"
        >
          <Image src="/icon_search.svg" alt="Search" width={18} height={18} />
        </button>
      </div>
    </nav>
  );
}

export default NavBar;

function NavItems() {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState("");

  const navItems = useMemo(
    () => [
      { name: "Delegates", path: "/" },
      { name: "Holders", path: "/holders" },
    ],
    []
  );

  useEffect(() => {
    const matchedItem = navItems.find((item) => item.path === pathname);
    setActiveItem(matchedItem ? matchedItem.name : "");
  }, [pathname, navItems]);

  return (
    <div className="flex text-zinc-400 gap-4">
      {navItems.map((item) => (
        <Link
          key={item.name}
          href={item.path}
          className={`cursor-pointer ${
            activeItem === item.name ? "text-zinc-100" : ""
          }`}
        >
          <div className="flex items-center">
            <div className="w-[7px] h-[7px] mr-2 ">
              {activeItem === item.name && (
                <div className="w-full h-full bg-zinc-100" />
              )}
            </div>
            {item.name}
          </div>
        </Link>
      ))}
    </div>
  );
}
