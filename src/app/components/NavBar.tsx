"use client";
import React, { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

function NavBar() {
  return (
    <nav className="flex md:flex-row flex-col gap-8">
      <div className="flex">
        <Link href="/" className="flex">
          <Image
            src="/wordmark_orange.svg"
            alt="wordmark"
            className="ml-2"
            width={220}
            height={70}
          />
        </Link>
        <Image
          src="/ens_pill.svg"
          alt="ENS Logo"
          className="ml-2"
          width={70}
          height={40}
        />
      </div>

      <div className="flex-1 flex justify-end">
        <NavItems />
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
    <div className="flex text-zinc-400 gap-8">
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
