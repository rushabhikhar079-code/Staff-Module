import { buildSeed } from '@/staff/data/seed';
import type { StaffDb } from '@/staff/types';

const STORAGE_KEY = 'institute-magica.staff-preview.v1';

export type StaffCollection = keyof StaffDb;
export type StaffRow<C extends StaffCollection> = StaffDb[C][number];

function writeDb(db: StaffDb): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function readDb(): StaffDb {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StaffDb;
  } catch {
    // Corrupt or unavailable storage: start again from the seed data.
  }
  const seed = buildSeed();
  writeDb(seed);
  return seed;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Local preview adapter. Each method mirrors a future API call so screens never touch storage directly.
export const repo = {
  async list<C extends StaffCollection>(collection: C): Promise<StaffRow<C>[]> {
    return structuredClone(readDb()[collection] as unknown as StaffRow<C>[]);
  },

  async insert<C extends StaffCollection>(collection: C, data: Omit<StaffRow<C>, 'id'>): Promise<StaffRow<C>> {
    const db = readDb();
    const rows = db[collection] as unknown as StaffRow<C>[];
    const row = { ...data, id: newId() } as StaffRow<C>;
    rows.push(row);
    writeDb(db);
    return row;
  },

  async update<C extends StaffCollection>(collection: C, row: StaffRow<C>): Promise<StaffRow<C>> {
    const db = readDb();
    const rows = db[collection] as unknown as StaffRow<C>[];
    const index = rows.findIndex((item) => item.id === row.id);
    if (index < 0) throw new Error('This record no longer exists. Refresh the list and try again.');
    rows[index] = row;
    writeDb(db);
    return row;
  },

  async upsert<C extends StaffCollection>(
    collection: C,
    match: (row: StaffRow<C>) => boolean,
    data: Omit<StaffRow<C>, 'id'>,
  ): Promise<StaffRow<C>> {
    const db = readDb();
    const rows = db[collection] as unknown as StaffRow<C>[];
    const index = rows.findIndex(match);
    if (index >= 0) {
      const row = { ...rows[index], ...data } as StaffRow<C>;
      rows[index] = row;
      writeDb(db);
      return row;
    }
    const row = { ...data, id: newId() } as StaffRow<C>;
    rows.push(row);
    writeDb(db);
    return row;
  },

  async remove<C extends StaffCollection>(collection: C, id: string): Promise<void> {
    const db = readDb();
    const rows = db[collection] as unknown as StaffRow<C>[];
    const next = rows.filter((item) => item.id !== id);
    if (next.length === rows.length) throw new Error('This record no longer exists. Refresh the list and try again.');
    db[collection] = next as never;
    writeDb(db);
  },

  reset(): void {
    window.localStorage.removeItem(STORAGE_KEY);
    readDb();
  },
};
