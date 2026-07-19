"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { PageContainer } from "@/components/design/PageContainer";
import {
  SectionCard,
  MetricGrid,
  SegmentedTabs,
  type Metric,
} from "@/components/design/primitives";
import {
  PriceHistoryChart,
  ChartLoading,
  ChartError,
  chartGeometry,
  toChartPoints,
} from "@/components/design/PriceHistoryChart";
import { DisclaimerBanner } from "@/components/ui/DisclaimerBanner";
import { usePoolStats } from "@/hooks/usePoolStats";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useOptionalWallet } from "@/hooks/useOptionalWallet";
import { GLOSSARY } from "@/lib/glossary";

type Period = "24H" | "7D" | "30D" | "90D";
const PERIOD_DAYS: Record<Period, number> = {
  "24H": 1,
  "7D": 7,
  "30D": 30,
  "90D": 90,
};
const PERIODS = (Object.keys(PERIOD_DAYS) as Period[]).map((p) => ({
  value: p,
  label: p,
}));

function formatPercentFromBps(bps: number): string {
  const formatted = (bps / 100).toFixed(2);
  return formatted.replace(/\.?0+$/, "");
}

function ChangeChip({ change }: { change: number }) {
  const up = change >= 0;
  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-md px-2 py-[3px] font-mono text-[12.5px] font-medium tabular-nums ${
        up ? "bg-up-soft text-up" : "bg-down-soft text-down"
      }`}
    >
      {up ? "↑" : "↓"} {up ? "+" : "−"}
      {Math.abs(change).toFixed(2)}% · 24H
    </span>
  );
}

/** Hero price card from the design: avatar, live price, sparkline, tiles. */
function HeroPriceCard({
  rate,
  change24h,
  sparkValues,
  liquidity,
  circulating,
}: {
  rate: number | null;
  change24h: number | null;
  sparkValues: number[];
  liquidity: string | null;
  circulating: string | null;
}) {
  const spark =
    sparkValues.length >= 2 ? chartGeometry(sparkValues, 1000, 260) : null;
  const up = (change24h ?? 0) >= 0;

  return (
    <div className="relative min-w-0 max-w-[460px] flex-[1_1_360px]">
      {/* Halo glow behind the card */}
      <div
        aria-hidden="true"
        className="absolute -inset-x-[6%] -bottom-[20%] -top-[14%] bg-[radial-gradient(58%_55%_at_62%_32%,var(--halo),transparent_72%)]"
      />
      <div className="relative flex flex-col gap-[18px] rounded-[20px] border border-line bg-surface p-[22px] shadow-pop">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-[11px]">
            <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[linear-gradient(150deg,var(--mint),var(--mint-btn))] text-sm font-semibold text-white">
              W
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold">WonderToken</span>
              <span className="text-xs text-ink-3">WNDR / USDC</span>
            </span>
          </span>
          {change24h != null && (
            <span
              className={`inline-flex items-center gap-[5px] rounded-lg px-[9px] py-1 font-mono text-xs font-medium tabular-nums ${
                up ? "bg-up-soft text-up" : "bg-down-soft text-down"
              }`}
            >
              {up ? "↑ +" : "↓ −"}
              {Math.abs(change24h).toFixed(2)}%
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-[9px]">
          <span className="font-mono text-4xl font-semibold leading-none tracking-[-0.02em] tabular-nums">
            {rate != null ? `$${rate.toFixed(4)}` : "—"}
          </span>
          <span className="text-[13px] text-ink-2">
            {change24h != null ? "USDC · 24H" : "USDC"}
          </span>
        </div>

        {spark && (
          <svg
            viewBox="0 0 1000 260"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="block h-[92px] w-full"
          >
            <path d={spark.area} style={{ fill: "var(--mint)", opacity: 0.09 }} />
            <path
              d={spark.d}
              vectorEffect="non-scaling-stroke"
              style={{
                fill: "none",
                stroke: "var(--mint)",
                strokeWidth: 1.8,
                strokeLinejoin: "round",
              }}
            />
          </svg>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-[3px] rounded-xl bg-surface-2 px-3.5 py-3">
            <span className="text-[11.5px] text-ink-3">Liquidity</span>
            <span className="font-mono text-base font-semibold tabular-nums">
              {liquidity != null ? `$${liquidity}` : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-[3px] rounded-xl bg-surface-2 px-3.5 py-3">
            <span className="text-[11.5px] text-ink-3">Circulating</span>
            <span className="font-mono text-base font-semibold tabular-nums">
              {circulating != null ? `${circulating} WNDR` : "—"}
            </span>
          </div>
        </div>

        <Link
          href="/buy"
          className="flex h-11 items-center justify-center rounded-xl bg-mint-btn text-[14.5px] font-semibold text-mint-ink no-underline shadow-glow transition-colors hover:bg-mint-btn-h hover:no-underline"
        >
          Buy WNDR
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const { stats, refresh } = usePoolStats();
  const wallet = useOptionalWallet();
  const connected = !!wallet?.connected;

  const [period, setPeriod] = useState<Period>("7D");
  const {
    data: history,
    loading: chartLoading,
    refresh: refreshHistory,
  } = usePriceHistory(PERIOD_DAYS[period]);
  const { data: dayHistory } = usePriceHistory(1);

  const points = useMemo(() => toChartPoints(history), [history]);
  const heroSparkValues = useMemo(
    () => toChartPoints(dayHistory).map((p) => p.v),
    [dayHistory],
  );
  const change24h = useMemo(() => {
    if (heroSparkValues.length < 2) return null;
    return (
      (heroSparkValues[heroSparkValues.length - 1] / heroSparkValues[0] - 1) *
      100
    );
  }, [heroSparkValues]);

  const rate = stats.pricePerToken;
  const rateFmt = rate != null ? rate.toFixed(4) : "—";
  const purchaseFeePct =
    stats.purchaseFeeBps != null
      ? `${formatPercentFromBps(stats.purchaseFeeBps)}%`
      : "—";
  const claimFeePct =
    stats.claimFeeBps != null
      ? `${formatPercentFromBps(stats.claimFeeBps)}%`
      : "—";
  const updatedFmt = stats.lastRefreshed
    ? stats.lastRefreshed.toLocaleTimeString("en-GB")
    : "—";

  const liquidityRatio =
    stats.treasuryUsdcRaw != null &&
    stats.navUsdcRaw != null &&
    stats.navUsdcRaw > 0
      ? ((stats.treasuryUsdcRaw / stats.navUsdcRaw) * 100).toFixed(1)
      : null;

  const metrics: Metric[] = [
    {
      label: "Pool NAV",
      value: stats.navUsdc != null ? `$${stats.navUsdc}` : "—",
      tip: GLOSSARY.poolNav,
    },
    {
      label: "Liquid USDC",
      value: stats.treasuryUsdc != null ? `$${stats.treasuryUsdc}` : "—",
      tip: GLOSSARY.liquidUsdc,
    },
    {
      label: "Pending claims",
      value:
        stats.pendingClaimsUsdc != null ? `$${stats.pendingClaimsUsdc}` : "—",
      tip: GLOSSARY.pendingClaims,
    },
    {
      label: "Circulating supply",
      value: stats.circulatingSupply ?? "—",
      unit: "WNDR",
      tip: GLOSSARY.circulatingSupply,
    },
    {
      label: "Total supply",
      value: stats.totalSupply ?? "—",
      unit: "WNDR",
      tip: GLOSSARY.totalSupply,
    },
    {
      label: "Liquidity ratio",
      value: liquidityRatio ?? "—",
      unit: "%",
      tip: "Share of pool NAV held as liquid USDC in the payout vault.",
    },
  ];

  const settlesImmediately =
    stats.treasuryUsdcRaw != null &&
    stats.pendingClaimsUsdcRaw != null &&
    stats.treasuryUsdcRaw >= stats.pendingClaimsUsdcRaw;

  return (
    <Layout>
      <PageContainer>
        {/* Hero */}
        <section
          aria-label="WonderToken overview"
          className="flex flex-wrap items-center gap-x-12 gap-y-10 pb-2 pt-3"
        >
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-[22px]">
            <span className="inline-flex items-center gap-[9px] self-start rounded-full border border-line-2 bg-surface-2 py-[5px] pl-1.5 pr-[13px] text-[12.5px] text-ink-2">
              <span className="inline-flex items-center rounded-full bg-mint-soft px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em] text-mint">
                WNDR
              </span>
              <span className="whitespace-nowrap">Live on Solana</span>
            </span>
            <h1 className="max-w-[620px] text-balance text-[clamp(36px,4.4vw,58px)] font-semibold leading-[1.03] tracking-[-0.03em]">
              The token that runs every WonderCall
            </h1>
            <p className="max-w-[500px] text-pretty text-[16.5px] leading-relaxed text-ink-2">
              WNDR powers AI phone calls across the WonderCall network. Buy and
              sell it at the on-chain reference rate — non-custodial and
              settled on-chain in seconds.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/buy"
                className="flex h-[46px] items-center rounded-[11px] bg-mint-btn px-[22px] text-[15px] font-semibold text-mint-ink no-underline shadow-glow transition-colors hover:bg-mint-btn-h hover:no-underline"
              >
                Get started
              </Link>
              <Link
                href="/information"
                className="flex h-[46px] items-center gap-2 rounded-[11px] px-3.5 text-[15px] font-semibold text-ink no-underline transition-colors hover:text-mint hover:no-underline"
              >
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <HeroPriceCard
            rate={rate}
            change24h={change24h}
            sparkValues={heroSparkValues}
            liquidity={stats.treasuryUsdc}
            circulating={stats.circulatingSupply}
          />
        </section>

        {/* Overview header */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex min-w-0 flex-col gap-3.5">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-xl font-semibold tracking-[-0.01em]">
                WNDR reference price
              </h2>
              <span className="text-[13px] text-ink-3">
                Calculated from pool NAV divided by circulating supply · read
                on-chain
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-3.5">
              <span className="font-mono text-[32px] font-semibold leading-none tracking-[-0.02em] tabular-nums max-[480px]:text-[28px] desk:text-[40px]">
                {rate != null ? `$${rateFmt}` : "—"}
              </span>
              <span className="text-sm text-ink-2">USDC</span>
              {change24h != null && <ChangeChip change={change24h} />}
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2.5 desk:w-auto">
            <Link
              href="/buy"
              className="flex h-11 min-w-[130px] flex-1 items-center justify-center rounded-lg bg-mint-btn px-5 text-sm font-semibold text-mint-ink no-underline shadow-glow transition-colors hover:bg-mint-btn-h hover:no-underline desk:h-10 desk:flex-none"
            >
              Buy WNDR
            </Link>
            <Link
              href="/sell"
              className="flex h-11 min-w-[130px] flex-1 items-center justify-center rounded-lg border border-line-2 bg-surface-2 px-5 text-sm font-semibold text-ink no-underline transition-colors hover:border-sell-line hover:no-underline desk:h-10 desk:flex-none"
            >
              Sell WNDR
            </Link>
            <Link
              href="/pool"
              className="flex h-10 items-center rounded-lg px-3 text-sm font-medium text-ink-2 no-underline transition-colors hover:text-ink hover:no-underline"
            >
              Full token stats →
            </Link>
          </div>
        </div>

        {/* Price history */}
        <SectionCard label="Price history">
          <div className="flex flex-wrap items-center justify-between gap-3.5 border-b border-line px-[18px] py-3.5">
            <div className="flex flex-wrap items-center gap-3.5">
              <span className="text-sm font-semibold">Price history</span>
              <SegmentedTabs
                label="Chart period"
                items={PERIODS}
                value={period}
                onChange={setPeriod}
              />
            </div>
            <span className="text-[12.5px] tabular-nums text-ink-3">
              1 WNDR = <span className="font-mono text-ink-2">{rateFmt}</span>{" "}
              USDC · {updatedFmt}
            </span>
          </div>

          {chartLoading ? (
            <ChartLoading />
          ) : points.length < 2 ? (
            <ChartError
              onRetry={() => {
                void refreshHistory();
                void refresh();
              }}
            />
          ) : (
            <PriceHistoryChart points={points} intraday={period === "24H"} />
          )}
        </SectionCard>

        {/* Token snapshot */}
        <SectionCard label="Token snapshot">
          <div className="flex items-center justify-between gap-3 border-b border-line px-[18px] py-3.5">
            <span className="text-sm font-semibold">Token snapshot</span>
            <Link
              href="/pool"
              className="text-[13px] font-medium text-ink-2 no-underline transition-colors hover:text-ink hover:no-underline"
            >
              Full token stats →
            </Link>
          </div>
          <MetricGrid metrics={metrics} />
        </SectionCard>

        {/* Action panels */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
          <section
            aria-label="Buy WNDR"
            className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-5"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold">Buy WNDR</span>
              <span className="text-[13px] leading-relaxed text-ink-2">
                USDC converts at the live reference rate. WNDR is minted
                directly to your wallet — no order book, no counterparty.
              </span>
            </div>
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <div className="flex justify-between gap-2.5 text-[13px]">
                <span className="text-ink-3">Reference rate</span>
                <span className="font-mono tabular-nums text-ink-2">
                  1 WNDR = {rateFmt} USDC
                </span>
              </div>
              <div className="flex justify-between gap-2.5 text-[13px]">
                <span className="text-ink-3">Protocol fee</span>
                <span className="font-mono tabular-nums text-ink-2">
                  {purchaseFeePct}
                </span>
              </div>
              <div className="flex justify-between gap-2.5 text-[13px]">
                <span className="text-ink-3">100 USDC receives</span>
                <span className="font-mono tabular-nums text-ink-2">
                  {rate != null && rate > 0
                    ? `≈ ${(100 / rate).toLocaleString("en-US", { maximumFractionDigits: 2 })} WNDR`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2.5 text-[13px]">
                <span className="text-ink-3">Capacity remaining</span>
                <span className="font-mono tabular-nums text-ink-2">
                  {stats.remainingPurchaseCapacityUsdc != null
                    ? `$${stats.remainingPurchaseCapacityUsdc}`
                    : "Unlimited"}
                </span>
              </div>
            </div>
            <Link
              href="/buy"
              className="flex h-10 items-center justify-center rounded-lg bg-mint-btn text-sm font-semibold text-mint-ink no-underline shadow-glow transition-colors hover:bg-mint-btn-h hover:no-underline"
            >
              {connected ? "Buy WNDR" : "Connect wallet to buy"}
            </Link>
          </section>

          <section
            aria-label="Sell WNDR"
            className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-5"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold">Sell WNDR</span>
              <span className="text-[13px] leading-relaxed text-ink-2">
                Sell requests settle in USDC from pool liquidity. If liquidity
                is insufficient, the request enters escrow and can be cancelled
                at any time.
              </span>
            </div>
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <div className="flex justify-between gap-2.5 text-[13px]">
                <span className="text-ink-3">Liquid USDC available</span>
                <span className="font-mono tabular-nums text-ink-2">
                  {stats.treasuryUsdc != null ? `$${stats.treasuryUsdc}` : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2.5 text-[13px]">
                <span className="text-ink-3">Pending settlement queue</span>
                <span className="font-mono tabular-nums text-ink-2">
                  {stats.pendingClaimsUsdc != null
                    ? `$${stats.pendingClaimsUsdc}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2.5 text-[13px]">
                <span className="text-ink-3">Claim fee</span>
                <span className="font-mono tabular-nums text-ink-2">
                  {claimFeePct}
                </span>
              </div>
              <div className="flex justify-between gap-2.5 text-[13px]">
                <span className="text-ink-3">Minimum claim</span>
                <span className="font-mono tabular-nums text-ink-2">
                  {stats.minClaimUsdc != null ? `$${stats.minClaimUsdc}` : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2.5 text-[13px]">
                <span className="text-ink-3">Typical settlement</span>
                <span className="text-ink-2">
                  {settlesImmediately
                    ? "Immediate at current liquidity"
                    : "Queued until liquidity is replenished"}
                </span>
              </div>
            </div>
            <Link
              href="/sell"
              className="flex h-10 items-center justify-center rounded-lg border border-sell-line bg-sell-soft text-sm font-semibold text-sell no-underline transition-colors hover:border-sell hover:no-underline"
            >
              {connected ? "Sell WNDR" : "Connect wallet to sell"}
            </Link>
          </section>
        </div>

        {/* Risk note */}
        <p className="max-w-[880px] text-[12.5px] leading-relaxed text-ink-3">
          Digital tokens involve risk and may lose all value. WNDR is a
          community-based token and does not represent a deposit, equity
          interest, or claim of any kind. Settlement of sell requests depends
          on available pool liquidity.{" "}
          <Link href="/information#risks">Read risks and limitations</Link>.
        </p>

        <DisclaimerBanner />
      </PageContainer>
    </Layout>
  );
}
