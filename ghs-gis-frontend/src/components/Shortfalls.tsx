import type { Dataset } from "../data/dataset";
import { SCORECARD, type ScorecardCard, type Verdict } from "../data/scorecard";
import { flaggedFields, SEVERITY_ORDER } from "../data/severity";
import { pluralize } from "../lib/format";

export interface ShortfallsProps {
  data: Dataset;
  index: number;
}

interface Graded {
  card: ScorecardCard;
  verdict: Verdict | null;
  /** True when the column behind the card is empty for this school. */
  unreported: boolean;
}

function grade(data: Dataset, index: number): Graded[] {
  return SCORECARD.map((card) => ({
    card,
    verdict: card.verdict?.(data, index) ?? null,
    unreported: card.headline(data, index) === null,
  }));
}

/**
 * The answer to "what's wrong here", above the cards that qualify it.
 *
 * The scorecard keeps a fixed card order on purpose — someone comparing two
 * schools should find crowding in the same place both times — so nothing there
 * moves to the top when it is bad. This band is where the ordering happens:
 * worst first, in fragments, with everything that is fine or unreported pushed
 * into a single line underneath.
 *
 * Unreported is its own category rather than a third kind of bad. "The DOE has
 * not published this" is a real finding on a page about neglected buildings,
 * but it is a finding about the city, not about the school.
 */
export default function Shortfalls({ data, index }: ShortfallsProps) {
  const graded = grade(data, index);
  const flagged = graded
    .flatMap(({ card, verdict }) => (verdict && verdict.level !== "ok" ? [{ card, verdict }] : []))
    .sort((a, b) => SEVERITY_ORDER[a.verdict.level] - SEVERITY_ORDER[b.verdict.level]);
  const fine = graded.filter((g) => g.verdict?.level === "ok");
  const unreported = graded.filter((g) => g.unreported);
  const extras = flaggedFields(data, index).filter(
    (f) => !flagged.some((g) => g.card.rank?.key === f.key),
  );

  return (
    <section className="shortfall" aria-label="What this building lacks">
      <h2 className="shortfall__title">
        {flagged.length > 0
          ? `What this building lacks — ${pluralize(flagged.length, "measure")} flagged`
          : "What this building lacks"}
      </h2>

      {flagged.length > 0 ? (
        <ul className="shortfall__list">
          {flagged.map(({ card, verdict }) => (
            <li key={card.id} className={`shortfall__item shortfall__item--${verdict.level}`}>
              <span className="shortfall__badge">{verdict.label}</span>
              <span className="shortfall__text">{verdict.short}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="shortfall__none">
          Nothing this page measures comes back flagged for this building
          {unreported.length > 0 ? " among the measures the city has reported" : ""}. The cards
          below give the figures behind that.
        </p>
      )}

      <p className="shortfall__aside">
        {extras.length > 0 && (
          <>
            {pluralize(extras.length, "more graded field")} in the full record below —{" "}
            {/* Labels keep their own case here: lowercasing turns "ENERGY STAR
                score" into something the reader has to re-parse. */}
            {extras
              .slice(0, 3)
              .map((f) => `${f.label} ${f.text}`)
              .join(", ")}
            {extras.length > 3 ? ", and others" : ""}.{" "}
          </>
        )}
        {fine.length > 0 && <>Meets the bar on {list(fine.map((g) => g.card.title))}. </>}
        {unreported.length > 0 && (
          <>
            The city has published nothing on {list(unreported.map((g) => g.card.title))} for this
            building.
          </>
        )}
      </p>
    </section>
  );
}

/** "A", "A and B", "A, B, and C" — lowercased, since these run mid-sentence. */
function list(items: string[]): string {
  const lower = items.map((s) => s.toLowerCase());
  if (lower.length <= 1) return lower[0] ?? "";
  if (lower.length === 2) return `${lower[0]} and ${lower[1]}`;
  return `${lower.slice(0, -1).join(", ")}, and ${lower[lower.length - 1]}`;
}
