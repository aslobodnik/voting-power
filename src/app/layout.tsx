import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import { ClientProviders } from "./components/ClientProviders";
import NavBar from "./components/NavBar";
import "./globals.css";

const roboto = Roboto({
  weight: ["500", "300", "400", "700", "900", "100"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voting Power",
  description: "Check your ENS Voting Power and see who delegates to you!",
  openGraph: {
    images: [
      {
        url: "https://voting-power.onrender.com/opengraph.png",
        alt: "Voting Power Image",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <ClientProviders>
        <body className={roboto.className}>
          <NavBar />
          <main className="max-w-screen-xl gap-14 flex flex-col pt-10 pb-20 px-4 mx-auto ">
            {children}
          </main>
          {/* Footer */}

          <div className="flex mb-4 pl-4 text-zinc-400 items-center">
            Made by&nbsp;
            <Link
              className=" text-ens-blue opacity-80 hover:opacity-100 duration-300 transition-opacity"
              target="_blank"
              href="https://app.ens.domains/slobo.eth"
            >
              slobo.eth
            </Link>
            &nbsp;|&nbsp;
            <Link
              href="https://x.com/AlexSlobodnik"
              target="_blank"
              className="flex flex-end hover:opacity-80 duration-300 transition-opacity"
            >
              <Image
                src="/icon_x.svg"
                alt="Search Icon"
                width={15}
                height={15}
              />
            </Link>
            <Link href="https://slobo.xyz" target="_blank">
              <div className="ml-4 h-4 w-4 hover:bg-green-900"></div>
            </Link>
          </div>
        </body>
      </ClientProviders>
    </html>
  );
}
