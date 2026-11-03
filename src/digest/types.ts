// The digest's shared shapes. The reader, the page, the JSON route and the board link all build
// against these, so they can be worked on at the same time.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One job of the night. Times keep the offset from the log.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type NightDigest = {
  night: string;
  // Sorted by job. The page and the JSON both use this order.
  rows: DigestRow[];
  // Lines by status across the whole night, for the board link.
  counts: Record<RunStatus, number>;
  // Lines that did not parse. Counted, never thrown.
  badLines: number;
};

// Returns null when runs/<night>.jsonl does not exist.
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
