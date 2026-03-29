import test from 'node:test';
import assert from 'node:assert/strict';
import {
  __resetExchangeRateMemoryCacheForTests,
  fetchLiveExchangeRates,
  getCurrentExchangeRateSnapshot,
  saveManualExchangeRates,
  resolveCheckoutExchangeRate,
} from './exchange-rate.service.js';

type StoredRow = {
  id: string;
  currency: string;
  rate: number;
  source: string | null;
  is_valid: number;
  valid_from: number;
  valid_to: number | null;
  created_at: number;
  created_by: string | null;
};

function createFakeSqlite() {
  const rows: StoredRow[] = [];

  return {
    prepare(sql: string) {
      if (sql.includes('UPDATE exchange_rates SET is_valid = 0')) {
        return {
          run(validTo: number, currency: string) {
            for (const row of rows) {
              if (row.currency === currency && row.is_valid === 1) {
                row.is_valid = 0;
                row.valid_to = validTo;
              }
            }
          },
        };
      }

      if (sql.includes('INSERT INTO exchange_rates')) {
        return {
          run(
            id: string,
            currency: string,
            rate: number,
            source: string,
            validFrom: number,
            createdAt: number,
            createdBy: string | null
          ) {
            rows.push({
              id,
              currency,
              rate,
              source,
              is_valid: 1,
              valid_from: validFrom,
              valid_to: null,
              created_at: createdAt,
              created_by: createdBy,
            });
          },
        };
      }

      if (sql.includes('INNER JOIN')) {
        return {
          all() {
            const latest = new Map<string, StoredRow>();
            for (const row of rows) {
              if (row.is_valid !== 1) continue;
              const current = latest.get(row.currency);
              const currentUpdatedAt = current ? Math.max(current.valid_from, current.created_at) : -Infinity;
              const rowUpdatedAt = Math.max(row.valid_from, row.created_at);
              if (!current || rowUpdatedAt >= currentUpdatedAt) {
                latest.set(row.currency, row);
              }
            }

            return Array.from(latest.values()).map((row) => ({
              currency: row.currency,
              rate: row.rate,
              source: row.source,
              updatedAt: row.valid_from ?? row.created_at,
            }));
          },
        };
      }

      if (sql.includes('SELECT rate')) {
        return {
          get(currency: string) {
            const matches = rows
              .filter((row) => row.currency === currency && row.is_valid === 1)
              .sort((a, b) => Math.max(b.valid_from, b.created_at) - Math.max(a.valid_from, a.created_at));
            return matches[0] ? { rate: matches[0].rate } : undefined;
          },
        };
      }

      throw new Error(`Unhandled SQL in fake sqlite: ${sql}`);
    },
    transaction<T>(fn: () => T) {
      return () => fn();
    },
  };
}

test.afterEach(() => {
  __resetExchangeRateMemoryCacheForTests();
});

test('fetchLiveExchangeRates falls back to secondary provider when primary fails', async () => {
  let callCount = 0;
  const fetchImpl = async (input: string | URL | Request) => {
    const url = String(input);
    callCount += 1;

    if (url.includes('@fawazahmed0')) {
      throw new Error('Primary down');
    }

    return {
      ok: true,
      json: async () => ({
        rates: {
          USD: 0.0202020202,
          EUR: 0.0185873606,
          GBP: 0.016,
          RUB: 0.5405405405,
        },
      }),
    } as Response;
  };

  const snapshot = await fetchLiveExchangeRates(fetchImpl, { error: () => undefined });

  assert.equal(callCount, 2);
  assert.equal(snapshot.base, 'EGP');
  assert.equal(snapshot.source, 'api');
  assert.equal(snapshot.offlineMode, false);
  assert.equal(Number(snapshot.inverseRates.USD?.toFixed(2)), 49.5);
  assert.equal(Number(snapshot.rates.GBP?.toFixed(3)), 0.016);
});

test('manual override saving persists and is used for checkout resolution', () => {
  const sqlite = createFakeSqlite();
  const snapshot = saveManualExchangeRates(
    sqlite as never,
    {
      USD: 51.25,
      RUB: 1.92,
    },
    'user_admin',
    new Date('2026-03-29T00:00:00.000Z')
  );

  assert.equal(snapshot.rateDetails.USD.source, 'manual');
  assert.equal(snapshot.rateDetails.RUB.source, 'manual');
  assert.equal(resolveCheckoutExchangeRate(sqlite as never, 'USD'), 51.25);
  assert.equal(resolveCheckoutExchangeRate(sqlite as never, 'RUB'), 1.92);
  assert.equal(resolveCheckoutExchangeRate(sqlite as never, 'RUB', 1.85), 1.85);
});

test('getCurrentExchangeRateSnapshot uses DB cached rates in offline mode', async () => {
  const sqlite = createFakeSqlite();
  saveManualExchangeRates(
    sqlite as never,
    {
      USD: 49.5,
    },
    'user_admin',
    new Date('2026-03-29T00:00:00.000Z')
  );

  const snapshot = await getCurrentExchangeRateSnapshot({
    sqlite: sqlite as never,
    logger: { error: () => undefined },
    fetchImpl: async () => {
      throw new Error('network unavailable');
    },
    forceRefresh: true,
    now: new Date('2026-03-29T00:30:00.000Z').getTime(),
  });

  assert.equal(snapshot.offlineMode, true);
  assert.equal(snapshot.rateDetails.USD.source, 'manual');
  assert.equal(snapshot.inverseRates.USD, 49.5);
  assert.equal(snapshot.rateDetails.EUR.requiresManualInput, true);
});
