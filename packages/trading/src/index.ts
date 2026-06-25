import { mkdir, readFile, writeFile } from "node:fs/promises";
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

export interface BrokerCredentialRefs {
  app_key_secret_ref?: string;
  app_secret_secret_ref?: string;
  account_secret_ref?: string;
}

export interface PilotRiskLimits {
  max_order_krw_equivalent?: number;
  max_daily_new_buy_krw_equivalent?: number;
  max_daily_loss_krw_equivalent?: number;
  max_position_pct?: number;
}

export interface CreateRealTradingGateStatusInput {
  realTradingRequested: boolean;
  explicitEnable: boolean;
  officialApiVerified: boolean;
  termsVerified: boolean;
  brokerCredentialRefs?: Partial<Record<BrokerId, BrokerCredentialRefs>>;
  dryRunObservedDays: number;
  dryRunMinDays: number;
  killSwitchEnabled: boolean;
  approvalRequired: boolean;
  approvalGranted: boolean;
  riskLimits?: PilotRiskLimits;
}

export interface RealTradingGateCheck {
  id: string;
  status: "pass" | "blocked";
  required: boolean;
  reason: string;
}

export interface RealTradingGateStatus {
  enabled_requested: boolean;
  status: "ready" | "blocked";
  checks: RealTradingGateCheck[];
  blocked_reasons: string[];
}

export interface RealTradingGateControls {
  approval_granted?: boolean;
  kill_switch_enabled?: boolean;
  updated_at?: string;
  updated_by?: string;
}

export interface SaveRealTradingGateControlsResult {
  path: string;
  controls: RealTradingGateControls;
}

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

export interface SaveWatchlistStoreResult {
  path: string;
  store: WatchlistStore;
}

export interface CreateTradingStatusInput {
  realTradingEnabled: boolean;
  brokers?: BrokerConfigMap;
  watchlist?: WatchlistInput[];
  dryRunJournal?: DryRunJournalSummary;
  marketDataSources?: MarketDataSourceStatus[];
  paperJournal?: TradingJournalSummary;
  realTradingGate?: RealTradingGateStatus;
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
  dry_run_journal?: DryRunJournalSummary;
  market_data_sources?: MarketDataSourceStatus[];
  paper_journal?: TradingJournalSummary;
  real_trading_gate?: RealTradingGateStatus;
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

export interface MarketDataQuoteInput {
  market: Market;
  symbol: string;
}

export interface MarketDataQuote {
  market: Market;
  symbol: string;
  price: number;
  currency: "KRW" | "USD";
  timestamp: string;
  source_refs: string[];
  conflict?: string;
}

export interface MarketDataAdapter {
  name: string;
  getQuote(input: MarketDataQuoteInput): Promise<MarketDataQuote | null>;
}

export interface CreateStaticMarketDataAdapterInput {
  name: string;
  quotes: Array<{
    market: Market;
    symbol: string;
    price: number;
    currency: "KRW" | "USD";
    timestamp: string;
    sourceRefs: string[];
  }>;
}

export interface DryRunJournalSummary {
  month: string;
  entries: number;
  passed: number;
  blocked: number;
  latest_signal_id?: string;
}

export interface MarketDataSourceStatus {
  market: Market;
  status: "ok" | "stale" | "missing" | "conflicting";
  checked_symbols: number;
  blocked_reasons: string[];
  latest_timestamp?: string;
}

export interface StrategyTemplate {
  id: "momentum_watch" | "mean_reversion_watch" | "portfolio_rebalance" | "event_watch" | "long_term_thesis";
  name: string;
  review_cadence: "daily" | "weekly" | "monthly";
  default_direction: "watch" | "hold";
}

export interface CreateStrategySignalInput {
  templateId: StrategyTemplate["id"];
  now: string;
  quote: MarketDataQuote;
  executionMode: "watch" | "dry_run" | "paper";
  marketOpen: boolean;
  policy: RiskPolicy;
}

export interface PaperJournalEntry {
  id: string;
  created_at: string;
  signal_id: string;
  market: Market;
  symbol: string;
  strategy_id: string;
  execution_mode: "paper";
  risk_check: RiskCheckResult;
  simulated_order: SimulatedOrder;
  broker_order_submitted: false;
  post_review?: string;
}

export interface AppendPaperJournalEntryResult {
  path: string;
  entry: PaperJournalEntry;
}

export interface TradingJournalSummary {
  month: string;
  dry_run_entries: number;
  paper_entries: number;
  latest_signal_id?: string;
}

export interface BrokerConnectorApprovalPolicy {
  approvalChannel?: "desktop" | "telegram" | "both";
  killSwitchOwner?: string;
}

export interface BrokerConnectorInputPacket {
  brokerName: string;
  targetMarkets: Market[];
  officialDocumentationRefs: string[];
  officialTermsRefs: string[];
  authenticationVerified: boolean;
  termsAndAccountConstraintsVerified: boolean;
  credentialRefs?: Partial<Record<BrokerId, BrokerCredentialRefs>>;
  paperOrSandboxVerified: boolean;
  paperOrSandboxExplicitlyUnavailable?: boolean;
  pilotRiskLimits?: PilotRiskLimits;
  approvalPolicy?: BrokerConnectorApprovalPolicy;
  explicitUserApprovalToStartM16: boolean;
}

export interface BrokerConnectorReadinessCheck {
  id: string;
  status: "pass" | "blocked";
  reason: string;
}

export interface BrokerConnectorReadiness {
  status: "ready" | "blocked";
  can_start_m16: boolean;
  checks: BrokerConnectorReadinessCheck[];
  blocked_reasons: string[];
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

export async function saveWatchlistStore(memoryRoot: string, store: WatchlistStore): Promise<SaveWatchlistStoreResult> {
  const path = watchlistPath(memoryRoot);
  await mkdir(dirname(path), { recursive: true });
  const normalized = createWatchlistStore(store.items);
  await writeFile(path, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return {
    path,
    store: normalized
  };
}

export async function loadWatchlistStore(memoryRoot: string): Promise<WatchlistStore> {
  try {
    const raw = JSON.parse(await readFile(watchlistPath(memoryRoot), "utf8")) as { items?: WatchlistInput[] };
    return createWatchlistStore(raw.items ?? []);
  } catch {
    return createWatchlistStore();
  }
}

export async function loadRealTradingGateControls(memoryRoot: string): Promise<RealTradingGateControls> {
  try {
    const raw = JSON.parse(await readFile(realTradingGateControlsPath(memoryRoot), "utf8")) as RealTradingGateControls;
    return normalizeRealTradingGateControls(raw);
  } catch {
    return {};
  }
}

export async function loadBrokerConnectorInputPacketFile(path: string): Promise<BrokerConnectorInputPacket> {
  const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
  return normalizeBrokerConnectorInputPacket(raw);
}

export async function saveRealTradingGateControls(
  memoryRoot: string,
  controls: RealTradingGateControls
): Promise<SaveRealTradingGateControlsResult> {
  const path = realTradingGateControlsPath(memoryRoot);
  await mkdir(dirname(path), { recursive: true });
  const normalized = normalizeRealTradingGateControls(controls);
  await writeFile(path, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return {
    path,
    controls: normalized
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
  const blockedActions = input.realTradingEnabled ? [] : ["Real trading disabled."];
  if (input.realTradingGate?.status === "blocked") {
    blockedActions.push(...input.realTradingGate.blocked_reasons);
  }

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
    blocked_actions: Array.from(new Set(blockedActions)),
    dry_run_journal: input.dryRunJournal,
    market_data_sources: input.marketDataSources,
    paper_journal: input.paperJournal,
    real_trading_gate: input.realTradingGate
  };
}

export function evaluateMarketDataSources(input: {
  now: string;
  maxAgeMs: number;
  watchlist: WatchlistStore;
  quotes: MarketDataQuote[];
}): MarketDataSourceStatus[] {
  return (["korea", "us"] as Market[]).map((market) => {
    const symbols = input.watchlist.items.filter((item) => item.market === market && item.enabled).map((item) => item.symbol);
    const reasons: string[] = [];
    const timestamps: string[] = [];
    for (const symbol of symbols) {
      const quote = input.quotes.find((candidate) => candidate.market === market && candidate.symbol === symbol);
      if (!quote) {
        reasons.push(`Missing market data for ${symbol}.`);
        continue;
      }
      timestamps.push(quote.timestamp);
      if (quote.conflict) {
        reasons.push(`Conflicting market data for ${symbol}.`);
      }
      if (isStale(input.now, quote.timestamp, input.maxAgeMs)) {
        reasons.push(`Stale market data for ${symbol}.`);
      }
    }
    return {
      market,
      status: marketDataStatus(reasons),
      checked_symbols: symbols.length,
      blocked_reasons: reasons,
      latest_timestamp: timestamps.sort().at(-1)
    };
  });
}

export function createStrategyTemplates(): StrategyTemplate[] {
  return [
    {
      id: "momentum_watch",
      name: "Momentum Watch",
      review_cadence: "daily",
      default_direction: "watch"
    },
    {
      id: "mean_reversion_watch",
      name: "Mean Reversion Watch",
      review_cadence: "daily",
      default_direction: "watch"
    },
    {
      id: "portfolio_rebalance",
      name: "Portfolio Rebalance",
      review_cadence: "weekly",
      default_direction: "hold"
    },
    {
      id: "event_watch",
      name: "Event Watch",
      review_cadence: "daily",
      default_direction: "watch"
    },
    {
      id: "long_term_thesis",
      name: "Long-Term Thesis",
      review_cadence: "monthly",
      default_direction: "hold"
    }
  ];
}

export function createStrategySignal(input: CreateStrategySignalInput): TradingSignal {
  const template = createStrategyTemplates().find((candidate) => candidate.id === input.templateId);
  if (!template) {
    throw new Error(`Unknown strategy template: ${input.templateId}`);
  }
  const riskCheck = runRiskCheck({
    now: input.now,
    dataTimestamp: input.quote.timestamp,
    executionMode: input.executionMode,
    realTradingEnabled: false,
    marketOpen: input.marketOpen,
    orderAmountKrwEquivalent: input.quote.currency === "KRW" ? input.quote.price : input.quote.price * 1400,
    dailyNewBuyKrwEquivalent: input.quote.currency === "KRW" ? input.quote.price : input.quote.price * 1400,
    policy: input.policy
  });
  return createTradingSignal({
    signalId: `signal_${input.now.slice(0, 10).replaceAll("-", "")}_${normalizeSymbol(input.quote.market, input.quote.symbol)}_${input.templateId}`,
    createdAt: input.now,
    market: input.quote.market,
    symbol: input.quote.symbol,
    strategyId: template.id,
    direction: template.default_direction,
    confidence: "low",
    reason: `${template.name} generated from ${input.quote.source_refs.join(", ") || "market data"}.`,
    dataTimestamp: input.quote.timestamp,
    sourceRefs: input.quote.source_refs,
    riskCheck,
    recommendedAction: input.executionMode === "paper" ? "Record paper candidate only." : "Record watch candidate only.",
    executionMode: input.executionMode,
    expiresAt: input.now
  });
}

export function createRealTradingGateStatus(input: CreateRealTradingGateStatusInput): RealTradingGateStatus {
  const checks: RealTradingGateCheck[] = [
    createGateCheck({
      id: "explicit_enable",
      passes: input.realTradingRequested && input.explicitEnable,
      reason: "Explicit real trading config is not enabled."
    }),
    createGateCheck({
      id: "official_api_verified",
      passes: input.officialApiVerified,
      reason: "Official broker API is not verified."
    }),
    createGateCheck({
      id: "terms_verified",
      passes: input.termsVerified,
      reason: "Broker API terms are not verified."
    }),
    createGateCheck({
      id: "broker_credentials",
      passes: hasCompleteBrokerCredentialRefs(input.brokerCredentialRefs),
      reason: "Broker credential secret references are missing."
    }),
    createGateCheck({
      id: "dry_run_history",
      passes: input.dryRunObservedDays >= input.dryRunMinDays,
      reason: "Dry-run history is shorter than the required minimum."
    }),
    createGateCheck({
      id: "kill_switch",
      passes: !input.killSwitchEnabled,
      reason: "Trading kill switch is enabled."
    }),
    createGateCheck({
      id: "approval",
      passes: !input.approvalRequired || input.approvalGranted,
      reason: "User approval is required for pilot real trading."
    }),
    createGateCheck({
      id: "risk_limits",
      passes: hasCompletePilotRiskLimits(input.riskLimits),
      reason: "Pilot risk limits are incomplete."
    })
  ];
  const blockedReasons = checks.filter((check) => check.status === "blocked").map((check) => check.reason);
  return {
    enabled_requested: input.realTradingRequested,
    status: blockedReasons.length === 0 ? "ready" : "blocked",
    checks,
    blocked_reasons: blockedReasons
  };
}

export function assessBrokerConnectorInputPacket(input: BrokerConnectorInputPacket): BrokerConnectorReadiness {
  const credentialRefsComplete = hasCompleteBrokerCredentialRefs(input.credentialRefs);
  const credentialRefsSecretOnly = hasOnlySecretRefCredentialRefs(input.credentialRefs);
  const checks: BrokerConnectorReadinessCheck[] = [
    createReadinessCheck({
      id: "broker_target",
      passes: Boolean(input.brokerName.trim()),
      reason: "Broker/API target is missing."
    }),
    createReadinessCheck({
      id: "target_market",
      passes: input.targetMarkets.length > 0,
      reason: "Target market is missing."
    }),
    createReadinessCheck({
      id: "official_documentation",
      passes: hasNonEmptyRefs(input.officialDocumentationRefs),
      reason: "Official broker/API documentation is missing."
    }),
    createReadinessCheck({
      id: "official_terms",
      passes: hasNonEmptyRefs(input.officialTermsRefs),
      reason: "Official API terms or account constraints are missing."
    }),
    createReadinessCheck({
      id: "authentication_verified",
      passes: input.authenticationVerified,
      reason: "API authentication requirements are not verified."
    }),
    createReadinessCheck({
      id: "terms_verified",
      passes: input.termsAndAccountConstraintsVerified,
      reason: "Terms and account constraints are not verified."
    }),
    createReadinessCheck({
      id: "credential_refs_present",
      passes: credentialRefsComplete,
      reason: "Broker credential secret references are missing."
    }),
    createReadinessCheck({
      id: "credential_refs_secret_only",
      passes: credentialRefsSecretOnly,
      reason: "Broker credential references must use secret_ref: values only."
    }),
    createReadinessCheck({
      id: "paper_or_sandbox",
      passes: input.paperOrSandboxVerified || input.paperOrSandboxExplicitlyUnavailable === true,
      reason: "Paper/sandbox availability is not verified or explicitly unavailable."
    }),
    createReadinessCheck({
      id: "pilot_risk_limits",
      passes: hasCompletePilotRiskLimits(input.pilotRiskLimits),
      reason: "Pilot risk limits are incomplete."
    }),
    createReadinessCheck({
      id: "approval_policy",
      passes: hasCompleteApprovalPolicy(input.approvalPolicy),
      reason: "Approval policy is incomplete."
    }),
    createReadinessCheck({
      id: "explicit_user_approval",
      passes: input.explicitUserApprovalToStartM16,
      reason: "User has not explicitly approved starting M16 connector planning."
    })
  ];
  const blockedReasons = checks.filter((check) => check.status === "blocked").map((check) => check.reason);
  return {
    status: blockedReasons.length === 0 ? "ready" : "blocked",
    can_start_m16: blockedReasons.length === 0,
    checks,
    blocked_reasons: blockedReasons
  };
}

export function normalizeBrokerConnectorInputPacket(raw: unknown): BrokerConnectorInputPacket {
  const input = isRecord(raw) ? raw : {};
  return {
    brokerName: readString(input.brokerName),
    targetMarkets: readMarketArray(input.targetMarkets),
    officialDocumentationRefs: readStringArray(input.officialDocumentationRefs),
    officialTermsRefs: readStringArray(input.officialTermsRefs),
    authenticationVerified: input.authenticationVerified === true,
    termsAndAccountConstraintsVerified: input.termsAndAccountConstraintsVerified === true,
    credentialRefs: readBrokerCredentialRefs(input.credentialRefs),
    paperOrSandboxVerified: input.paperOrSandboxVerified === true,
    paperOrSandboxExplicitlyUnavailable: input.paperOrSandboxExplicitlyUnavailable === true,
    pilotRiskLimits: readPilotRiskLimits(input.pilotRiskLimits),
    approvalPolicy: readApprovalPolicy(input.approvalPolicy),
    explicitUserApprovalToStartM16: input.explicitUserApprovalToStartM16 === true
  };
}

export function createStaticMarketDataAdapter(input: CreateStaticMarketDataAdapterInput): MarketDataAdapter {
  const quotes = new Map(
    input.quotes.map((quote) => {
      const normalized = normalizeSymbol(quote.market, quote.symbol);
      return [
        `${quote.market}:${normalized}`,
        {
          market: quote.market,
          symbol: normalized,
          price: quote.price,
          currency: quote.currency,
          timestamp: quote.timestamp,
          source_refs: quote.sourceRefs
        }
      ];
    })
  );

  return {
    name: input.name,
    async getQuote(request) {
      const symbol = normalizeSymbol(request.market, request.symbol);
      return quotes.get(`${request.market}:${symbol}`) ?? null;
    }
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

export function createPaperJournalEntry(input: {
  signal: TradingSignal;
  createdAt: string;
  simulatedOrder: SimulatedOrder;
  postReview?: string;
}): PaperJournalEntry {
  if (input.signal.execution_mode !== "paper") {
    throw new Error("Paper journal requires a paper-mode signal.");
  }
  return {
    id: `paper_${input.signal.signal_id}`,
    created_at: input.createdAt,
    signal_id: input.signal.signal_id,
    market: input.signal.market,
    symbol: input.signal.symbol,
    strategy_id: input.signal.strategy_id,
    execution_mode: "paper",
    risk_check: input.signal.risk_check,
    simulated_order: input.simulatedOrder,
    broker_order_submitted: false,
    post_review: input.postReview
  };
}

export async function appendPaperJournalEntry(
  memoryRoot: string,
  entry: PaperJournalEntry
): Promise<AppendPaperJournalEntryResult> {
  const path = join(memoryRoot, "logs", "trading", `${entry.created_at.slice(0, 7)}.jsonl`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(entry)}\n`, { flag: "a" });
  return {
    path,
    entry
  };
}

export async function summarizeTradingJournal(memoryRoot: string, month: string): Promise<TradingJournalSummary> {
  const path = join(memoryRoot, "logs", "trading", `${month}.jsonl`);
  let lines: string[];
  try {
    lines = (await readFile(path, "utf8")).split("\n").filter(Boolean);
  } catch {
    return {
      month,
      dry_run_entries: 0,
      paper_entries: 0
    };
  }
  const records = lines.map((line) => JSON.parse(line) as { execution_mode?: string; signal_id?: string });
  const latest = records.at(-1);
  return {
    month,
    dry_run_entries: records.filter((record) => record.execution_mode === "dry_run").length,
    paper_entries: records.filter((record) => record.execution_mode === "paper").length,
    latest_signal_id: latest?.signal_id
  };
}

export async function summarizeDryRunJournal(memoryRoot: string, month: string): Promise<DryRunJournalSummary> {
  const path = join(memoryRoot, "logs", "trading", `${month}.jsonl`);
  let lines: string[];
  try {
    lines = (await readFile(path, "utf8")).split("\n").filter(Boolean);
  } catch {
    return {
      month,
      entries: 0,
      passed: 0,
      blocked: 0
    };
  }

  const entries = lines.map((line) => JSON.parse(line) as DryRunJournalEntry);
  const latest = entries.at(-1);
  return {
    month,
    entries: entries.length,
    passed: entries.filter((entry) => entry.risk_check.status === "pass").length,
    blocked: entries.filter((entry) => entry.risk_check.status === "blocked").length,
    latest_signal_id: latest?.signal_id
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

function marketDataStatus(reasons: string[]): MarketDataSourceStatus["status"] {
  if (reasons.some((reason) => reason.startsWith("Conflicting"))) {
    return "conflicting";
  }
  if (reasons.some((reason) => reason.startsWith("Missing"))) {
    return "missing";
  }
  if (reasons.some((reason) => reason.startsWith("Stale"))) {
    return "stale";
  }
  return "ok";
}

function createGateCheck(input: { id: string; passes: boolean; reason: string }): RealTradingGateCheck {
  return {
    id: input.id,
    status: input.passes ? "pass" : "blocked",
    required: true,
    reason: input.reason
  };
}

function createReadinessCheck(input: { id: string; passes: boolean; reason: string }): BrokerConnectorReadinessCheck {
  return {
    id: input.id,
    status: input.passes ? "pass" : "blocked",
    reason: input.reason
  };
}

function hasCompleteBrokerCredentialRefs(refs: Partial<Record<BrokerId, BrokerCredentialRefs>> = {}): boolean {
  return BROKER_ORDER.some((broker) => {
    const ref = refs[broker];
    return Boolean(ref?.app_key_secret_ref && ref.app_secret_secret_ref && ref.account_secret_ref);
  });
}

function hasOnlySecretRefCredentialRefs(refs: Partial<Record<BrokerId, BrokerCredentialRefs>> = {}): boolean {
  const values = BROKER_ORDER.flatMap((broker) => {
    const ref = refs[broker];
    return [ref?.app_key_secret_ref, ref?.app_secret_secret_ref, ref?.account_secret_ref].filter(
      (value): value is string => typeof value === "string" && value.length > 0
    );
  });
  return values.length === 0 || values.every((value) => value.startsWith("secret_ref:"));
}

function hasCompletePilotRiskLimits(limits: PilotRiskLimits = {}): boolean {
  return Boolean(
    limits.max_order_krw_equivalent
      && limits.max_daily_new_buy_krw_equivalent
      && limits.max_daily_loss_krw_equivalent
      && limits.max_position_pct
  );
}

function hasCompleteApprovalPolicy(policy: BrokerConnectorApprovalPolicy = {}): boolean {
  return Boolean(policy.approvalChannel && policy.killSwitchOwner?.trim());
}

function hasNonEmptyRefs(refs: string[]): boolean {
  return refs.some((ref) => ref.trim().length > 0);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}

function readMarketArray(value: unknown): Market[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((market): market is Market => market === "korea" || market === "us");
}

function readBrokerCredentialRefs(value: unknown): Partial<Record<BrokerId, BrokerCredentialRefs>> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    BROKER_ORDER.map((broker) => {
      const refs = value[broker];
      if (!isRecord(refs)) {
        return [broker, {}];
      }
      return [
        broker,
        {
          app_key_secret_ref: readString(refs.app_key_secret_ref) || undefined,
          app_secret_secret_ref: readString(refs.app_secret_secret_ref) || undefined,
          account_secret_ref: readString(refs.account_secret_ref) || undefined
        }
      ];
    })
  ) as Partial<Record<BrokerId, BrokerCredentialRefs>>;
}

function readPilotRiskLimits(value: unknown): PilotRiskLimits {
  if (!isRecord(value)) {
    return {};
  }
  return {
    max_order_krw_equivalent: readPositiveNumber(value.max_order_krw_equivalent),
    max_daily_new_buy_krw_equivalent: readPositiveNumber(value.max_daily_new_buy_krw_equivalent),
    max_daily_loss_krw_equivalent: readPositiveNumber(value.max_daily_loss_krw_equivalent),
    max_position_pct: readPositiveNumber(value.max_position_pct)
  };
}

function readApprovalPolicy(value: unknown): BrokerConnectorApprovalPolicy {
  if (!isRecord(value)) {
    return {};
  }
  const approvalChannel = value.approvalChannel;
  return {
    ...(approvalChannel === "desktop" || approvalChannel === "telegram" || approvalChannel === "both"
      ? { approvalChannel }
      : {}),
    ...(readString(value.killSwitchOwner) ? { killSwitchOwner: readString(value.killSwitchOwner) } : {})
  };
}

function readPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function watchlistPath(memoryRoot: string): string {
  return join(memoryRoot, "data", "trading", "watchlist.json");
}

function realTradingGateControlsPath(memoryRoot: string): string {
  return join(memoryRoot, "data", "trading", "real-trading-gates.json");
}

function normalizeRealTradingGateControls(input: RealTradingGateControls): RealTradingGateControls {
  return {
    ...(typeof input.approval_granted === "boolean" ? { approval_granted: input.approval_granted } : {}),
    ...(typeof input.kill_switch_enabled === "boolean" ? { kill_switch_enabled: input.kill_switch_enabled } : {}),
    ...(typeof input.updated_at === "string" && input.updated_at.trim() ? { updated_at: input.updated_at.trim() } : {}),
    ...(typeof input.updated_by === "string" && input.updated_by.trim() ? { updated_by: input.updated_by.trim() } : {})
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
