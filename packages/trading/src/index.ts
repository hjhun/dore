import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  BrokerCapabilitySchema,
  TradingSignalSchema,
  type BrokerCapability,
  type TradingSignal
} from "../../contracts/src/index.js";

export type BrokerId = "toss" | "shinhan" | "samsung";
export type BrokerMode = "candidate" | "read_only_manual_reference" | "paper" | "real";
export type Market = "korea" | "us";
export type ExecutionMode = "watch" | "dry_run" | "paper" | "real";

export interface BrokerConfig {
  enabled: boolean;
  priority: number;
  mode: BrokerMode;
}

export type BrokerConfigMap = Partial<Record<BrokerId, BrokerConfig>>;

export interface WatchlistInput {
  market: Market;
  symbol: string;
  name?: string;
  enabled?: boolean;
}

export interface WatchlistItem {
  id: string;
  market: Market;
  symbol: string;
  name?: string;
  enabled: boolean;
}

export interface WatchlistStore {
  items: WatchlistItem[];
}

export interface CreateTradingStatusInput {
  realTradingEnabled: boolean;
  brokers?: BrokerConfigMap;
  watchlist?: WatchlistInput[];
}

export interface TradingStatus {
  enabled: boolean;
  real_trading_enabled: boolean;
  brokers: Record<BrokerId, string>;
  broker_capabilities: BrokerCapability[];
  watchlist: {
    count: number;
    items: WatchlistItem[];
  };
  blocked_actions: string[];
}

export interface RiskPolicy {
  maxOrderKrwEquivalent: number;
  maxDailyNewBuyKrwEquivalent: number;
  maxDataAgeMs: number;
  killSwitchEnabled: boolean;
}

export interface RiskCheckInput {
  now: string;
  dataTimestamp: string;
  executionMode: ExecutionMode;
  realTradingEnabled: boolean;
  marketOpen: boolean;
  orderAmountKrwEquivalent: number;
  dailyNewBuyKrwEquivalent: number;
  policy: RiskPolicy;
}

export interface RiskCheckResult {
  status: "pass" | "fail" | "blocked" | "not_applicable";
  reasons: string[];
}

export interface CreateTradingSignalInput {
  signalId: string;
  createdAt: string;
  market: Market;
  symbol: string;
  strategyId: string;
  direction: "buy" | "sell" | "hold" | "reduce" | "watch";
  confidence: "low" | "medium" | "high";
  reason: string;
  dataTimestamp: string;
  sourceRefs: string[];
  riskCheck: RiskCheckResult;
  recommendedAction: string;
  executionMode: ExecutionMode;
  expiresAt: string;
}

export interface SimulatedOrder {
  side: "buy" | "sell";
  quantity: number;
  estimatedPrice: number;
  currency: "KRW" | "USD";
}

export interface DryRunJournalEntry {
  id: string;
  created_at: string;
  signal_id: string;
  market: Market;
  symbol: string;
  strategy_id: string;
  execution_mode: "dry_run";
  risk_check: RiskCheckResult;
  simulated_order: SimulatedOrder;
}

export interface AppendDryRunJournalEntryResult {
  path: string;
  entry: DryRunJournalEntry;
}

const BROKER_ORDER: BrokerId[] = ["toss", "shinhan", "samsung"];
const DEFAULT_BROKERS: Record<BrokerId, BrokerConfig> = {
  toss: {
    enabled: true,
    priority: 1,
    mode: "candidate"
  },
  shinhan: {
    enabled: true,
    priority: 2,
    mode: "candidate"
  },
  samsung: {
    enabled: true,
    priority: 3,
    mode: "read_only_manual_reference"
  }
};

export function createWatchlistStore(inputs: WatchlistInput[] = []): WatchlistStore {
  return {
    items: inputs.map((input) => {
      const symbol = normalizeSymbol(input.market, input.symbol);
      return {
        id: `watch_${input.market}_${symbol}`,
        market: input.market,
        symbol,
        name: input.name,
        enabled: input.enabled ?? true
      };
    })
  };
}

export function createBrokerCapabilityRegistry(configs: BrokerConfigMap = DEFAULT_BROKERS): BrokerCapability[] {
  const merged = mergeBrokerConfigs(configs);
  return BROKER_ORDER.map((broker) => createBrokerCapability(broker, merged[broker]));
}

export function ensureRealTradingBlocked(input: {
  realTradingEnabled: boolean;
  requestedExecutionMode: ExecutionMode;
}): void {
  if (!input.realTradingEnabled && input.requestedExecutionMode === "real") {
    throw new Error("Real trading is disabled.");
  }
}

export function createTradingStatus(input: CreateTradingStatusInput): TradingStatus {
  const brokerCapabilities = createBrokerCapabilityRegistry(input.brokers);
  const watchlist = createWatchlistStore(input.watchlist);

  return {
    enabled: true,
    real_trading_enabled: input.realTradingEnabled,
    brokers: Object.fromEntries(brokerCapabilities.map((capability) => [capability.broker, capability.status])) as Record<
      BrokerId,
      string
    >,
    broker_capabilities: brokerCapabilities,
    watchlist: {
      count: watchlist.items.length,
      items: watchlist.items
    },
    blocked_actions: input.realTradingEnabled ? [] : ["Real trading disabled."]
  };
}

export function runRiskCheck(input: RiskCheckInput): RiskCheckResult {
  const reasons: string[] = [];

  if (input.executionMode === "real" && !input.realTradingEnabled) {
    reasons.push("Real trading is disabled.");
  }
  if (input.policy.killSwitchEnabled) {
    reasons.push("Trading kill switch is enabled.");
  }
  if (!input.marketOpen) {
    reasons.push("Market is closed.");
  }
  if (isStale(input.now, input.dataTimestamp, input.policy.maxDataAgeMs)) {
    reasons.push("Market data is stale.");
  }
  if (input.orderAmountKrwEquivalent > input.policy.maxOrderKrwEquivalent) {
    reasons.push("Order amount exceeds max order limit.");
  }
  if (input.dailyNewBuyKrwEquivalent > input.policy.maxDailyNewBuyKrwEquivalent) {
    reasons.push("Daily new buy amount exceeds max daily limit.");
  }

  return {
    status: reasons.length > 0 ? "blocked" : "pass",
    reasons
  };
}

export function createTradingSignal(input: CreateTradingSignalInput): TradingSignal {
  return TradingSignalSchema.parse({
    signal_id: input.signalId,
    created_at: input.createdAt,
    market: input.market,
    symbol: normalizeSymbol(input.market, input.symbol),
    strategy_id: input.strategyId,
    direction: input.direction,
    confidence: input.confidence,
    reason: input.reason,
    data_timestamp: input.dataTimestamp,
    source_refs: input.sourceRefs,
    risk_check: input.riskCheck,
    recommended_action: input.recommendedAction,
    execution_mode: input.executionMode,
    expires_at: input.expiresAt
  });
}

export function createDryRunJournalEntry(input: {
  signal: TradingSignal;
  createdAt: string;
  simulatedOrder: SimulatedOrder;
}): DryRunJournalEntry {
  if (input.signal.execution_mode === "real") {
    throw new Error("Dry-run journal cannot record real execution signals.");
  }

  return {
    id: `dry_run_${input.signal.signal_id}`,
    created_at: input.createdAt,
    signal_id: input.signal.signal_id,
    market: input.signal.market,
    symbol: input.signal.symbol,
    strategy_id: input.signal.strategy_id,
    execution_mode: "dry_run",
    risk_check: input.signal.risk_check,
    simulated_order: input.simulatedOrder
  };
}

export async function appendDryRunJournalEntry(
  memoryRoot: string,
  entry: DryRunJournalEntry
): Promise<AppendDryRunJournalEntryResult> {
  const path = join(memoryRoot, "logs", "trading", `${entry.created_at.slice(0, 7)}.jsonl`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(entry)}\n`, { flag: "a" });
  return {
    path,
    entry
  };
}

function mergeBrokerConfigs(configs: BrokerConfigMap): Record<BrokerId, BrokerConfig> {
  return {
    toss: {
      ...DEFAULT_BROKERS.toss,
      ...configs.toss
    },
    shinhan: {
      ...DEFAULT_BROKERS.shinhan,
      ...configs.shinhan
    },
    samsung: {
      ...DEFAULT_BROKERS.samsung,
      ...configs.samsung
    }
  };
}

function isStale(now: string, dataTimestamp: string, maxDataAgeMs: number): boolean {
  const nowMs = Date.parse(now);
  const dataMs = Date.parse(dataTimestamp);
  if (!Number.isFinite(nowMs) || !Number.isFinite(dataMs)) {
    return true;
  }
  return nowMs - dataMs > maxDataAgeMs;
}

function normalizeSymbol(market: Market, symbol: string): string {
  const normalized = symbol.trim();
  if (!normalized) {
    throw new Error("Watchlist symbol is required.");
  }
  return market === "us" ? normalized.toUpperCase() : normalized;
}

function createBrokerCapability(broker: BrokerId, config: BrokerConfig): BrokerCapability {
  return BrokerCapabilitySchema.parse({
    broker,
    status: config.enabled ? statusFromMode(config.mode) : "unavailable",
    markets: {
      korea: true,
      us: true
    },
    capabilities: capabilitiesFromMode(config.mode, config.enabled),
    source_refs: [],
    notes: notesFromMode(broker, config)
  });
}

function statusFromMode(mode: BrokerMode): BrokerCapability["status"] {
  if (mode === "read_only_manual_reference") {
    return "read_only";
  }
  if (mode === "paper") {
    return "paper_supported";
  }
  if (mode === "real") {
    return "real_supported";
  }
  return "candidate";
}

function capabilitiesFromMode(
  mode: BrokerMode,
  enabled: boolean
): BrokerCapability["capabilities"] {
  if (!enabled) {
    return {
      market_data: "unknown",
      account_read: "unknown",
      order_create: "unsupported",
      order_cancel: "unsupported",
      paper_trading: "unknown"
    };
  }
  if (mode === "read_only_manual_reference") {
    return {
      market_data: "unknown",
      account_read: "unknown",
      order_create: "unsupported",
      order_cancel: "unsupported",
      paper_trading: "unknown"
    };
  }
  if (mode === "paper") {
    return {
      market_data: "unknown",
      account_read: "unknown",
      order_create: "unsupported",
      order_cancel: "unsupported",
      paper_trading: "supported"
    };
  }
  if (mode === "real") {
    return {
      market_data: "supported",
      account_read: "supported",
      order_create: "supported",
      order_cancel: "supported",
      paper_trading: "unknown"
    };
  }
  return {
    market_data: "unknown",
    account_read: "unknown",
    order_create: "unknown",
    order_cancel: "unknown",
    paper_trading: "unknown"
  };
}

function notesFromMode(broker: BrokerId, config: BrokerConfig): string {
  if (!config.enabled) {
    return `${broker} is disabled in local configuration.`;
  }
  if (config.mode === "read_only_manual_reference") {
    return `${broker} is tracked as read-only/manual reference until an official API is verified.`;
  }
  return `${broker} is a candidate connector until official API details are supplied.`;
}
