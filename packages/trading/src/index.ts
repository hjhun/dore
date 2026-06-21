import { BrokerCapabilitySchema, type BrokerCapability } from "../../contracts/src/index.js";

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
