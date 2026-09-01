import type { Dataset } from "../data/dataset";
import { SCOPE_LABEL, SCORECARD, type ScorecardCard } from "../data/scorecard";
import { formatNumber } from "../lib/format";
import { describeRank, percentileRank, type Rank } from "../lib/percentile";

export interface ScorecardProps {
  data: Dataset;
  index: number;
}

/** Used when a percentage would describe a tie as a lead. */
function tieSentence(rank: Rank): string {
  return `Like ${formatNumber(rank.tied, "int")} of the ${formatNumber(rank.known, "int")} schools that report it.`;
}

function Card({ data, index, card }: { data: Dataset; index: number; card: ScorecardCard }) {
  const headline = card.headline(data, index);

  if (headline === null) {
    return (
      <article className="card card--missing">
        <h3 className="card__title">
          {card.title}
          <span className="card__scope">{SCOPE_LABEL[card.scope]}</span>
        </h3>
        <p className="card__headline card__headline--missing">Not reported</p>
        <p className="card__context">{card.missing}</p>
      </article>
    );
  }

  const verdict = card.verdict?.(data, index) ?? null;
  const rank = card.rank
    ? percentileRank(data.numeric(card.rank.key), index, card.rank.priority)
    : null;
  const context = rank ? (describeRank(rank) ?? tieSentence(rank)) : null;
  const detail = card.detail?.(data, index) ?? null;

  return (
    <article className={`card${verdict ? ` card--${verdict.level}` : ""}`}>
      <h3 className="card__title">
        {card.title}
        <span className="card__scope">{SCOPE_LABEL[card.scope]}</span>
      </h3>
      {verdict && <p className={`card__verdict card__verdict--${verdict.level}`}>{verdict.label}</p>}
      <p className="card__headline">{headline}</p>
      {context && <p className="card__context">{context}</p>}
      {detail && <p className="card__detail">{detail}</p>}
      <p className="card__caveat">{card.caveat}</p>
    </article>
  );
}

/**
 * The six things worth knowing first, in English.
 *
 * Every card renders, including the ones with nothing to report: with 208
 * buildings missing air conditioning records and 248 missing a capacity figure,
 * quietly dropping a card would read as "this one is fine" when it means "the
 * city has not said".
 */
export default function Scorecard({ data, index }: ScorecardProps) {
  return (
    <section className="scorecard" aria-label="Summary">
      {SCORECARD.map((card) => (
        <Card key={card.id} data={data} index={index} card={card} />
      ))}
    </section>
  );
}
