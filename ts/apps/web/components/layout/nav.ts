import type { NavIconKey } from "@/components/design/icons";

export type NavItem = {
  label: string;
  href: string;
  icon: NavIconKey;
  /** Additional pathnames that keep this item highlighted. */
  match: string[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: "home", match: ["/"] },
  { label: "Swap", href: "/buy", icon: "swap", match: ["/buy", "/sell"] },
  { label: "Wallet", href: "/wallet", icon: "wallet", match: ["/wallet"] },
  { label: "Token", href: "/pool", icon: "token", match: ["/pool"] },
  { label: "Learn", href: "/information", icon: "learn", match: ["/information"] },
];

export function isNavActive(item: NavItem, pathname: string | null): boolean {
  return pathname != null && item.match.includes(pathname);
}
