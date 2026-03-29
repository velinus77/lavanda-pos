import crypto from 'node:crypto';
import BetterSqlite3 from 'better-sqlite3';

export const SUPPORTED_EXCHANGE_CURRENCIES = ['USD', 'EUR', 'GBP', 'RUB'] as const;
export type SupportedExchangeCurrency = (typeof SUPPORTED_EXCHANGE_CURRENCIES)[number];
export type ExchangeRateSource = 'api' | 'manual';

const PRIMARY_API_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/egp.json';
const FALLBACK_API_URL = 'https://api.exchangerate-api.com/v4/latest/EGP';
export const EXCHANGE_RATE_TTL_MS = 60 * 60 * 1000;

type LoggerLike = {
  error: (payload: unknown, message?: string) => void;
};

type FetchLike = typeof fetch;
type SQLiteDatabase = InstanceType<typeof BetterSqlite3>;

interface PersistRateInput {
  currency: SupportedExchangeCurrency;
  egpPerUnit: number;
  source: ExchangeRateSource;
}

export interface ExchangeRateDetail {
  currency: SupportedExchangeCurrency;
  rate: number | null;
  egpPerUnit: number | null;
  source: ExchangeRateSource | null;
  updatedAt: string | null;
  stale: boolean;
  requiresManualInput: boolean;
}

export interface ExchangeRateSnapshot {
  base: 'EGP';
  rates: Record<SupportedExchangeCurrency, number | null>;
  inverseRates: Record<SupportedExchangeCurrency, number | null>;
  source: ExchangeRateSource;
  updatedAt: string | null;
  offlineMode: boolean;
  stale: boolean;
  rateDetails: Record<SupportedExchangeCurrency, ExchangeRateDetail>;
}

type CachedSnapshot = {
  expiresAt: number;
  snapshot: ExchangeRateSnapshot;
};

let memoryCache: CachedSnapshot | null = null;

function emptyRateMap(): Record<SupportedExchangeCurrency, number | null> {
  return {
    USD: null,
    EUR: null,
    GBP: null,
    RUB: null,
  };
}

function normalizeCurrency(currency: string): SupportedExchangeCurrency {
  return currency.trim().toUpperCase() as SupportedExchangeCurrency;
}

function makeSnapshotFromStoredRows(
  rows: Array<{ currency: string; rate: number; source: string | null; updatedAt: number | string | Date | null }>,
  now = Date.now(),
  offlineMode = false
): ExchangeRateSnapshot {
  const directRates = emptyRateMap();
  const inverseRates = emptyRateMap();
  const rateDetails = {} as Record<SupportedExchangeCurrency, ExchangeRateDetail>;

  for (const currency of SUPPORTED_EXCHANGE_CURRENCIES) {
    const row = rows.find((entry) => normalizeCurrency(entry.currency) === currency);
    const updatedAtMs = row?.updatedAt ? new Date(row.updatedAt).getTime() : null;
    const egpPerUnit = row?.rate ? Number(row.rate) : null;
    const directRate = egpPerUnit && egpPerUnit > 0 ? 1 / egpPerUnit : null;
    const stale = updatedAtMs !== null ? now - updatedAtMs > EXCHANGE_RATE_TTL_MS : true;
    const source = row?.source === 'manual' ? 'manual' : row ? 'api' : null;

    directRates[currency] = directRate;
    inverseRates[currency] = egpPerUnit;
    rateDetails[currency] = {
      currency,
      rate: directRate,
      egpPerUnit,
      source,
      updatedAt: updatedAtMs !== null ? new Date(updatedAtMs).toISOString() : null,
      stale,
      requiresManualInput: !egpPerUnit,
    };
  }

  const timestamps = Object.values(rateDetails)
    .map((detail) => (detail.updatedAt ? new Date(detail.updatedAt).getTime() : 0))
    .filter(Boolean);
  const latestUpdatedAt = timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null;
  const hasManual = Object.values(rateDetails).some((detail) => detail.source === 'manual');
  const hasApi = Object.values(rateDetails).some((detail) => detail.source === 'api');

  return {
    base: 'EGP',
    rates: directRates,
    inverseRates,
    source: hasApi ? 'api' : hasManual ? 'manual' : 'manual',
    updatedAt: latestUpdatedAt,
    offlineMode,
    stale: Object.values(rateDetails).some((detail) => detail.stale && !detail.requiresManualInput),
    rateDetails,
  };
}

export function getStoredExchangeRateSnapshot(
  sqlite: SQLiteDatabase,
  now = Date.now()
): ExchangeRateSnapshot {
  const statement = sqlite.prepare(
    `SELECT er.currency, er.rate, er.source, COALESCE(er.valid_from, er.created_at) AS updatedAt
     FROM exchange_rates er
     INNER JOIN (
       SELECT currency, MAX(COALESCE(valid_from, created_at)) AS max_updated_at
       FROM exchange_rates
       WHERE is_valid = 1
       GROUP BY currency
     ) latest
       ON latest.currency = er.currency
      AND latest.max_updated_at = COALESCE(er.valid_from, er.created_at)
     WHERE er.is_valid = 1`
  );

  const rows = statement.all() as Array<{
    currency: string;
    rate: number;
    source: string | null;
    updatedAt: number | string | Date | null;
  }>;

  return makeSnapshotFromStoredRows(rows, now, true);
}

export async function fetchLiveExchangeRates(
  fetchImpl: FetchLike = fetch,
  logger?: LoggerLike
): Promise<ExchangeRateSnapshot> {
  const now = Date.now();

  try {
    const response = await fetchImpl(PRIMARY_API_URL);
    if (!response.ok) {
      throw new Error(`Primary exchange-rate API returned ${response.status}`);
    }

    const data = (await response.json()) as { egp?: Partial<Record<string, number>> };
    const egp = data.egp ?? {};
    const rows = SUPPORTED_EXCHANGE_CURRENCIES.map((currency) => {
      const directRate = Number(egp[currency.toLowerCase()]);
      if (!Number.isFinite(directRate) || directRate <= 0) {
        throw new Error(`Primary exchange-rate API missing ${currency}`);
      }

      return {
        currency,
        rate: 1 / directRate,
        source: 'api',
        updatedAt: now,
      };
    });

    return makeSnapshotFromStoredRows(rows, now, false);
  } catch (primaryError) {
    logger?.error({ err: primaryError }, 'Primary exchange-rate fetch failed');
  }

  const fallbackResponse = await fetchImpl(FALLBACK_API_URL);
  if (!fallbackResponse.ok) {
    throw new Error(`Fallback exchange-rate API returned ${fallbackResponse.status}`);
  }

  const fallbackData = (await fallbackResponse.json()) as { rates?: Partial<Record<SupportedExchangeCurrency, number>> };
  const fallbackRates = fallbackData.rates ?? {};

  const rows = SUPPORTED_EXCHANGE_CURRENCIES.map((currency) => {
    const directRate = Number(fallbackRates[currency]);
    if (!Number.isFinite(directRate) || directRate <= 0) {
      throw new Error(`Fallback exchange-rate API missing ${currency}`);
    }

    return {
      currency,
      rate: 1 / directRate,
      source: 'api',
      updatedAt: now,
    };
  });

  return makeSnapshotFromStoredRows(rows, now, false);
}

export function persistExchangeRateRows(
  sqlite: SQLiteDatabase,
  rows: PersistRateInput[],
  userId: string | null,
  now = new Date()
): ExchangeRateSnapshot {
  const nowMs = now.getTime();
  const invalidate = sqlite.prepare(`UPDATE exchange_rates SET is_valid = 0, valid_to = ? WHERE currency = ? AND is_valid = 1`);
  const insert = sqlite.prepare(
    `INSERT INTO exchange_rates (id, currency, rate, source, is_valid, valid_from, valid_to, created_at, created_by)
     VALUES (?, ?, ?, ?, 1, ?, NULL, ?, ?)`
  );

  const tx = sqlite.transaction(() => {
    for (const row of rows) {
      invalidate.run(nowMs, row.currency);
      insert.run(crypto.randomUUID(), row.currency, row.egpPerUnit, row.source, nowMs, nowMs, userId);
    }
  });

  tx();
  memoryCache = null;
  return getStoredExchangeRateSnapshot(sqlite, nowMs);
}

export function saveManualExchangeRates(
  sqlite: SQLiteDatabase,
  rates: Partial<Record<SupportedExchangeCurrency, number>>,
  userId: string | null,
  now = new Date()
): ExchangeRateSnapshot {
  const rows: PersistRateInput[] = Object.entries(rates)
    .filter((entry): entry is [SupportedExchangeCurrency, number] => {
      const [currency, value] = entry;
      return SUPPORTED_EXCHANGE_CURRENCIES.includes(currency as SupportedExchangeCurrency) && Number.isFinite(value) && value > 0;
    })
    .map(([currency, value]) => ({
      currency,
      egpPerUnit: value,
      source: 'manual',
    }));

  if (rows.length === 0) {
    throw new Error('No manual rates were provided');
  }

  return persistExchangeRateRows(sqlite, rows, userId, now);
}

export async function getCurrentExchangeRateSnapshot(options: {
  sqlite: SQLiteDatabase;
  logger: LoggerLike;
  fetchImpl?: FetchLike;
  forceRefresh?: boolean;
  now?: number;
}): Promise<ExchangeRateSnapshot> {
  const now = options.now ?? Date.now();

  if (!options.forceRefresh && memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.snapshot;
  }

  try {
    const liveSnapshot = await fetchLiveExchangeRates(options.fetchImpl, options.logger);
    const persisted = persistExchangeRateRows(
      options.sqlite,
      SUPPORTED_EXCHANGE_CURRENCIES
        .map((currency) => liveSnapshot.rateDetails[currency])
        .filter((detail): detail is ExchangeRateDetail & { egpPerUnit: number } => detail.egpPerUnit !== null)
        .map((detail) => ({
          currency: detail.currency,
          egpPerUnit: detail.egpPerUnit,
          source: 'api' as const,
        })),
      null,
      new Date(now)
    );

    const snapshot = {
      ...persisted,
      offlineMode: false,
      stale: false,
    };
    memoryCache = {
      expiresAt: now + EXCHANGE_RATE_TTL_MS,
      snapshot,
    };
    return snapshot;
  } catch (error) {
    options.logger.error({ err: error }, 'Exchange-rate refresh failed');
    const stored = getStoredExchangeRateSnapshot(options.sqlite, now);
    if (Object.values(stored.inverseRates).some((rate) => rate !== null)) {
      const snapshot = { ...stored, offlineMode: true };
      memoryCache = {
        expiresAt: now + EXCHANGE_RATE_TTL_MS,
        snapshot,
      };
      return snapshot;
    }

    return {
      ...stored,
      offlineMode: true,
    };
  }
}

export function resolveCheckoutExchangeRate(
  sqlite: SQLiteDatabase,
  currency: string,
  exchangeRateOverride?: number
): number {
  const normalizedCurrency = currency.trim().toUpperCase();

  if (normalizedCurrency === 'EGP') {
    return 1;
  }

  if (exchangeRateOverride && Number.isFinite(exchangeRateOverride) && exchangeRateOverride > 0) {
    return exchangeRateOverride;
  }

  const row = sqlite
    .prepare(
      `SELECT rate
       FROM exchange_rates
       WHERE currency = ?
         AND is_valid = 1
       ORDER BY COALESCE(valid_from, created_at) DESC
       LIMIT 1`
    )
    .get(normalizedCurrency) as { rate?: number } | undefined;

  if (!row?.rate) {
    throw new Error(`Exchange rate not found for currency ${normalizedCurrency}`);
  }

  return Number(row.rate);
}

export function __resetExchangeRateMemoryCacheForTests() {
  memoryCache = null;
}
