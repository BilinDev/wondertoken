"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useSetAtom } from "jotai";
import { useConnection } from "@solana/wallet-adapter-react";
import { useOptionalWallet } from "@/hooks/useOptionalWallet";
import { useToast } from "@/components/ui/ToastContext";
import { connectModalOpenAtom } from "@/lib/ui-atoms";
import { getClusterFromEndpoint } from "@/lib/constants";
import { explorerAddressUrl, clusterLabel } from "@/lib/explorer";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavActive } from "./nav";
import {
  ChevronDownIcon,
  LogoMark,
  MoonIcon,
  NavIcon,
  Spinner,
  SunIcon,
} from "@/components/design/icons";

function shortAddress(value: string, head = 4, tail = 4): string {
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/**
 * Segmented light/dark control from the WonderToken design.
 * Selected styling is driven by the `data-theme` attribute next-themes puts
 * on <html> before first paint, so there is no wrong-state hydration flash;
 * aria-pressed stays unset until the client knows the resolved theme.
 */
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isLight = mounted ? resolvedTheme === "light" : undefined;
  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex h-9 items-center rounded-[10px] border border-line bg-surface-2 p-[3px]"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label="Light theme"
        title="Light theme"
        aria-pressed={isLight}
        className="flex h-7 w-[30px] items-center justify-center rounded-[7px] text-ink-3 transition-colors hover:text-ink-2 [[data-theme=light]_&]:bg-surface [[data-theme=light]_&]:text-mint"
      >
        <SunIcon size={14} />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label="Dark theme"
        title="Dark theme"
        aria-pressed={isLight == null ? undefined : !isLight}
        className="flex h-7 w-[30px] items-center justify-center rounded-[7px] bg-surface-3 text-ink transition-colors [[data-theme=light]_&]:bg-transparent [[data-theme=light]_&]:text-ink-3 [[data-theme=light]_&]:hover:text-ink-2"
      >
        <MoonIcon size={13} />
      </button>
    </div>
  );
}

function WalletArea() {
  const wallet = useOptionalWallet();
  const { connection } = useConnection();
  const { showToast } = useToast();
  const openConnect = useSetAtom(connectModalOpenAtom);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const connecting = mounted && !!wallet?.connecting;
  const connected = mounted && !!wallet?.connected && !!wallet.publicKey;

  if (connecting) {
    return (
      <button
        type="button"
        disabled
        className="flex h-9 cursor-default items-center gap-2 whitespace-nowrap rounded-lg border border-line-2 bg-surface-2 px-3.5 text-[13px] font-medium text-ink-2"
      >
        <Spinner />
        <span>Connecting…</span>
      </button>
    );
  }

  if (!connected) {
    return (
      <button
        type="button"
        onClick={() => openConnect(true)}
        className="flex h-9 items-center whitespace-nowrap rounded-[10px] bg-mint-btn px-4 text-[13.5px] font-semibold text-mint-ink shadow-glow transition-colors hover:bg-mint-btn-h"
      >
        Connect wallet
      </button>
    );
  }

  const address = wallet!.publicKey!.toBase58();
  const cluster = getClusterFromEndpoint(connection.rpcEndpoint ?? "");
  const walletName = wallet?.wallet?.adapter.name ?? "Wallet";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Wallet menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 transition-colors hover:border-line-2"
      >
        <span className="h-1.5 w-1.5 flex-none rounded-full bg-up" />
        <span className="font-mono text-[12.5px]">{shortAddress(address)}</span>
        <ChevronDownIcon className="text-ink-3" />
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-11 z-[70] w-[236px] animate-rise rounded-xl border border-line-2 bg-surface-2 p-1.5 shadow-pop">
          <div className="flex flex-col gap-[3px] px-3 pb-2 pt-2.5">
            <span className="break-all font-mono text-xs text-ink">
              {shortAddress(address, 8, 8)}
            </span>
            <span className="text-xs text-ink-3">
              {walletName} · {clusterLabel(cluster)}
            </span>
          </div>
          <div className="mx-1.5 my-1 h-px bg-line" />
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(address);
              setMenuOpen(false);
              showToast("Address copied", "success");
            }}
            className="block w-full rounded-[7px] px-3 py-[9px] text-[13.5px] transition-colors hover:bg-surface-3"
          >
            Copy address
          </button>
          <a
            href={explorerAddressUrl(cluster, address)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="block w-full rounded-[7px] px-3 py-[9px] text-[13.5px] text-ink no-underline transition-colors hover:bg-surface-3 hover:no-underline"
          >
            View on explorer
          </a>
          <Link
            href="/wallet"
            onClick={() => setMenuOpen(false)}
            className="block w-full rounded-[7px] px-3 py-[9px] text-[13.5px] text-ink no-underline transition-colors hover:bg-surface-3 hover:no-underline"
          >
            Wallet overview
          </Link>
          <div className="mx-1.5 my-1 h-px bg-line" />
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              void wallet?.disconnect();
            }}
            className="block w-full rounded-[7px] px-3 py-[9px] text-[13.5px] text-down transition-colors hover:bg-down-soft"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto grid h-16 max-w-[1320px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 max-[839px]:flex max-[839px]:h-14 max-[839px]:justify-between max-[839px]:px-4">
        <Link
          href="/"
          aria-label="WonderToken home"
          className="flex flex-none items-center justify-self-start rounded-[10px] text-ink no-underline hover:no-underline"
        >
          <LogoMark />
        </Link>
        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 justify-self-center desk:flex"
        >
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-[7px] rounded-[10px] px-3 py-[7px] text-[13.5px] no-underline transition-colors hover:text-ink hover:no-underline",
                  active
                    ? "font-semibold text-mint"
                    : "font-medium text-ink-2",
                )}
              >
                <NavIcon icon={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-none items-center gap-2 justify-self-end">
          <ThemeToggle />
          <WalletArea />
        </div>
      </div>
    </header>
  );
}
