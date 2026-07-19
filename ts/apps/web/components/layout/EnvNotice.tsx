import type { ReactNode } from "react";
import { getConfiguredSolanaCluster } from "@/lib/solana-env";
import { clusterLabel } from "@/lib/explorer";

/**
 * Slim banner above the header. On mainnet it introduces WNDR; on any other
 * cluster it flags the deployment as an early-testing environment.
 */
export function EnvNotice() {
  const cluster = getConfiguredSolanaCluster();
  const mainnet = cluster === "mainnet-beta";

  const dot = mainnet ? "bg-mint" : "bg-warn";
  const message: ReactNode = mainnet ? (
    <>
      <span className="font-semibold text-ink">WNDR</span> is the utility token
      of the WonderCall network ·{" "}
      <a
        href="https://docs.wondercall.ai/introduction"
        target="_blank"
        rel="noopener noreferrer"
      >
        docs.wondercall.ai
      </a>
    </>
  ) : (
    <>
      <span className="font-semibold text-ink">{clusterLabel(cluster)}</span> ·
      Early testing — assets on this network hold no real-world value.
    </>
  );

  return (
    <div className="flex-none border-b border-line bg-surface">
      <div className="mx-auto flex min-h-[30px] max-w-[1320px] items-center justify-center gap-2 px-6 py-[5px] text-center max-[839px]:px-4">
        <span className={`h-1.5 w-1.5 flex-none rounded-full ${dot}`} />
        <span className="text-xs text-ink-2">{message}</span>
      </div>
    </div>
  );
}
