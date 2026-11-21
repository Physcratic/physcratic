/**
 * Sends a pending saved check again by itself. The pending check is the journal's own snapshot, with its idempotency key,
 * so a repeat is safe for the server and never depends on what is typed in the answer boxes meanwhile.
 *
 * Rules this class keeps:
 * - one attempt in flight at a time, so two triggers close together cause one save,
 * - a backoff timer with a cap, then it stops until the person or the browser gives a new signal,
 * - a save the server rejected for good is not tried on a timer at all,
 * - a new signal is the next Check press, the browser coming back online or the tab becoming visible again,
 * - nothing here reads or changes the typed answers, and a failed attempt never discards the pending check.
 */
/** rejected: the server refused this save for good (it said so), so it is not tried again until a new signal. */
export type SaveOutcome = "saved" | "failed" | "skipped" | "rejected";
export type RetryReason = "check" | "online" | "visible" | "timer" | "start";
/** idle: nothing pending. waiting: a timer is set. saving: an attempt is in flight. stalled: the cap was reached. */
export type RetryStatus = "idle" | "waiting" | "saving" | "stalled";

export type RetryPolicy = {
  /** Wait before timer attempt 1, 2, 3 and so on. The last value repeats. */
  delays: readonly number[];
  /** Timer attempts after a failure before it stops. */
  maxTimerAttempts: number;
  /** Triggers closer together than this after an attempt started are ignored. */
  minGapMs: number;
};

export const retryPolicy: RetryPolicy = { delays: [2_000, 5_000, 15_000, 30_000, 60_000], maxTimerAttempts: 5, minGapMs: 1_000 };

export type RetryHost = {
  /** True while a saved check is waiting for the server and this person can send it. */
  hasPending(): boolean;
  /** One attempt to send the pending check. "saved" only when the server confirmed it. Must not throw. */
  attempt(): Promise<SaveOutcome>;
  setTimer(run: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  now(): number;
  onStatus(status: RetryStatus): void;
};

type Listener = { addEventListener(type: string, run: () => void): void; removeEventListener(type: string, run: () => void): void };
type VisibleDocument = Listener & { visibilityState?: string };

export class PendingSaveRetrier {
  private inFlight = false;
  private failures = 0;
  private timer: unknown = null;
  private lastStart = Number.NEGATIVE_INFINITY;
  private status: RetryStatus = "idle";
  private disposed = false;

  constructor(private readonly host: RetryHost, private readonly policy: RetryPolicy = retryPolicy) {}

  /** Call whenever a check may have become pending, such as on load or after a save failed. Sets the first timer. */
  arm(): void {
    if (this.disposed) return;
    if (!this.host.hasPending()) return this.settle();
    if (this.inFlight || this.timer !== null || this.status === "stalled") return;
    this.schedule();
  }

  /** The next Check press, the browser coming back online, the tab becoming visible again, or the timer. */
  async trigger(reason: RetryReason): Promise<SaveOutcome | "ignored"> {
    if (this.disposed) return "ignored";
    if (!this.host.hasPending()) { this.settle(); return "ignored"; }
    // One save at a time. A second trigger while one is out, or right after one started, adds nothing.
    if (this.inFlight) return "ignored";
    if (this.host.now() - this.lastStart < this.policy.minGapMs) return "ignored";
    // A new signal after the cap starts a fresh, bounded series. The timer itself never restarts a stalled series.
    if (this.status === "stalled" && reason !== "timer") this.failures = 0;
    this.clear();
    this.inFlight = true;
    this.lastStart = this.host.now();
    this.set("saving");
    let outcome: SaveOutcome;
    try { outcome = await this.host.attempt(); } catch { outcome = "failed"; }
    this.inFlight = false;
    if (this.disposed) return outcome;
    if (outcome === "saved" || !this.host.hasPending()) {
      this.failures = 0;
      this.settle();
      return outcome;
    }
    if (outcome === "rejected") { this.failures = this.policy.maxTimerAttempts + 1; this.set("stalled"); return outcome; }
    this.failures++;
    if (this.failures > this.policy.maxTimerAttempts) { this.set("stalled"); return outcome; }
    this.schedule();
    return outcome;
  }

  /** Listens for the browser coming back online and the tab becoming visible. Returns a function that stops listening. */
  attach(win: Listener, doc: VisibleDocument): () => void {
    const online = () => { void this.trigger("online"); };
    const visible = () => { if (doc.visibilityState === undefined || doc.visibilityState === "visible") void this.trigger("visible"); };
    win.addEventListener("online", online);
    doc.addEventListener("visibilitychange", visible);
    return () => { win.removeEventListener("online", online); doc.removeEventListener("visibilitychange", visible); };
  }

  dispose(): void {
    this.disposed = true;
    this.clear();
  }

  private schedule(): void {
    this.clear();
    const { delays } = this.policy;
    const wait = delays[Math.min(this.failures, delays.length - 1)] ?? 60_000;
    this.timer = this.host.setTimer(() => { this.timer = null; void this.trigger("timer"); }, wait);
    this.set("waiting");
  }
  private clear(): void {
    if (this.timer !== null) this.host.clearTimer(this.timer);
    this.timer = null;
  }
  private settle(): void {
    this.clear();
    this.set("idle");
  }
  private set(status: RetryStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.host.onStatus(status);
  }
}
