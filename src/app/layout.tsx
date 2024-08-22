import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import Link from "next/link";
import iconX from "./img/icon_x.svg";
import Image from "next/image";
const roboto = Roboto({
  weight: ["500", "300", "400", "700", "900", "100"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voting Power",
  description: "ENS Voting Power",
  openGraph: {
    title: "Voting Power",
    description: "Check your ENS Voting Power and see who delegates to you",
    images: [
      {
        url: "/opengraph.png",
        width: 1200,
        height: 630,
        alt: "Voting Power Open Graph Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Voting Power",
    description: "Check your ENS Voting Power and see who delegates to you",
    images: ["/opengraph.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={roboto.className}>
        <main className="max-w-screen-xl gap-14 flex flex-col pt-10 pb-20 px-4 mx-auto ">
          <NavBar />
          {children}
        </main>
        {/* Footer */}

        <div className="flex mb-4 pl-4 text-zinc-400">
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
            <Image src="/icon_x.svg" alt="Search Icon" width={15} height={15} />
          </Link>
        </div>
      </body>
    </html>
  );
}
