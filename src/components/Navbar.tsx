"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";

const NAV_LINKS = [
  { label: "Browse Jobs", href: "#", bold: true },
  { label: "Company", href: "#", bold: false },
  { label: "Pricing", href: "#", bold: false },
];

function UserAvatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string | null;
  className: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials =
    name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  if (src && !imageFailed) {
    return (
      // Google profile images are external URLs, so render them directly.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || "User profile"}
        className={`${className} object-cover`}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className={`${className} flex items-center justify-center bg-[#6258ff] text-sm font-semibold text-white`}
    >
      {initials}
    </span>
  );
}

export default function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const dashboardRole =
    user?.role === "admin" || user?.role === "recruiter"
      ? user.role
      : "seeker";
  const dashboardHref = `/dashboard/${dashboardRole}`;

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          setProfileOpen(false);
          setMenuOpen(false);
          router.replace("/");
          router.refresh();
        },
      },
    });
  }

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
            {!isPending && user ? (
              <div className="relative">
                <button
                  type="button"
                  aria-label="Open user profile"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-white/5"
                >
                  <UserAvatar
                    src={user.image}
                    name={user.name}
                    className="size-9.5 rounded-lg"
                  />
                  <span className="max-w-28 truncate text-sm font-medium text-[#ededef]">
                    {user.name || user.email}
                  </span>
                  <svg className={`size-4 text-[#9899a9] transition-transform ${profileOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-3 w-64 rounded-[14px] border border-white/[0.07] bg-[#1a1a1f] p-2 shadow-[0_16px_48px_rgba(0,0,0,0.55)]">
                    <div className="mb-2 border-b border-white/[0.07] px-3 py-3">
                      <p className="truncate text-sm font-semibold text-[#ededef]">{user.name}</p>
                      <p className="mt-1 truncate text-xs text-[#9899a9]">{user.email}</p>
                    </div>
                    <Link
                      href={dashboardHref}
                      onClick={() => setProfileOpen(false)}
                      className="flex h-10 w-full items-center rounded-lg px-3 text-sm text-[#ededef] transition hover:bg-white/5"
                    >
                      Dashboard
                    </Link>
                    <button type="button" onClick={handleSignOut} className="flex h-10 w-full items-center rounded-lg px-3 text-sm text-[#ff7a7a] transition hover:bg-white/5">
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : !isPending ? (
              <>
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
              </>
            ) : null}
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
          className="fixed left-4 right-4 top-20 z-100 rounded-[14px] border border-white/[0.07] bg-[#1a1a1f] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)] md:hidden"
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
            {user ? (
              <>
                <div className="flex items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.035] p-3">
                  <UserAvatar
                    src={user.image}
                    name={user.name}
                    className="size-10 rounded-lg"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#ededef]">
                      {user.name || "User"}
                    </span>
                    <span className="block truncate text-xs text-[#9899a9]">{user.email}</span>
                  </span>
                </div>
                <Link
                  href={dashboardHref}
                  onClick={() => setMenuOpen(false)}
                  className="font-instrument-sans flex h-13 items-center justify-center rounded-lg border border-white/[0.07] text-lg font-medium leading-6.5 text-[#ededef]"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="font-instrument-sans flex h-13 items-center justify-center rounded-lg border border-[#090a15]/10 bg-[#5c53fe] text-lg font-medium leading-6.5 text-[#ededef]"
                >
                  Sign out
                </button>
              </>
            ) : !isPending ? (
              <>
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
              </>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
