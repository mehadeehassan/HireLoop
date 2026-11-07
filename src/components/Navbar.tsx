"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Browse Jobs", href: "#", bold: true },
  { label: "Company", href: "#", bold: false },
  { label: "Pricing", href: "#", bold: false },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-50">
      <div className="mx-auto flex h-17 w-full max-w-7xl items-center justify-between rounded-[14px] border border-white/[0.07] bg-[#141418] pl-4 pr-2 shadow-[0_1px_2px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)] sm:pl-6">
        <Image
          src="/images/logo.png"
          alt="Hireloop"
          width={154}
          height={44}
          priority
          className="h-11 w-38.5"
        />

        {/* Desktop: links + divider + buttons — Geist 16px, #ededef, gap 20/24 */}
        <div className="hidden items-center md:flex">
          <nav className="flex items-center gap-5">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`font-sans whitespace-nowrap text-base leading-[28.8px] tracking-[-0.2px] text-[#ededef] ${
                  link.bold ? "font-bold" : "font-normal"
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Divider — 24px space before, 0 after */}
          <div className="ml-6 h-px w-6 bg-[#a8a8a8]/40" />

          {/* Buttons — gap 16 */}
          <div className="flex items-center gap-4">
            {/* Ghost button */}
            <Link
              href="/signin"
              className="font-inter flex h-9.5 items-center whitespace-nowrap rounded-lg px-4 text-lg font-semibold leading-6.5 text-[#645bff]"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="font-instrument-sans flex h-13 w-35.75 items-center justify-center whitespace-nowrap rounded-lg border border-[#090a15]/10 bg-[#5c53fe] text-lg font-medium leading-6.5 text-[#ededef] shadow-[inset_0_3px_10px_rgba(255,255,255,0.2)]"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Mobile: hamburger */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9.5 items-center rounded-lg px-2 md:hidden"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ededef"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {menuOpen ? (
              <>
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </>
            ) : (
              <>
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="fixed left-4 right-4 top-20 z-[100] rounded-[14px] border border-white/[0.07] bg-[#1a1a1f] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)] md:hidden"
        >
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`font-sans text-base leading-[28.8px] tracking-[-0.2px] text-[#ededef] ${
                  link.bold ? "font-bold" : "font-normal"
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="my-5 h-px w-6 bg-[#a8a8a8]/40" />

          <div className="flex flex-col gap-4">
            <Link
              href="/signin"
              onClick={() => setMenuOpen(false)}
              className="font-inter text-lg font-semibold leading-6.5 text-[#645bff]"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="font-instrument-sans flex h-13 items-center justify-center rounded-lg border border-[#090a15]/10 bg-[#5c53fe] text-lg font-medium leading-6.5 text-[#ededef] shadow-[inset_0_3px_10px_rgba(255,255,255,0.2)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
