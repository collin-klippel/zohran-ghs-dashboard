import type { Dataset } from "../data/dataset";

export interface CouncilCardProps {
  data: Dataset;
  index: number;
}

const text = (data: Dataset, key: string, i: number): string | null => {
  const v = data.value(key, i);
  return typeof v === "string" && v !== "" ? v : null;
};

/**
 * Who to call about this building.
 *
 * School capital work runs through the Council, so this is the one thing on the
 * page a reader can act on directly. All four columns are complete today, but
 * the join can change, so every line is guarded.
 */
export default function CouncilCard({ data, index }: CouncilCardProps) {
  const name = text(data, "CouncName", index);
  if (!name) return null;

  const district = data.value("CounDist", index);
  const party = text(data, "CouncParty", index);
  const phone = text(data, "CouncPhone", index);
  const address = text(data, "CouncAddr", index);

  return (
    <article className="cta">
      <h3 className="cta__title">Contact your council member</h3>
      <p className="cta__lead">
        {name}
        {party && <span className="cta__muted"> · {party}</span>}
        {district !== null && <span className="cta__muted"> · District {String(district)}</span>}
      </p>
      {phone && (
        <p>
          {/* Formats are inconsistent in the source — "(212) 818-0580" and
              "212-564-7757" both occur — so the href is built from the digits
              and the original string is what the reader sees. */}
          <a className="link" href={`tel:${phone.replace(/\D/g, "")}`}>
            {phone}
          </a>
        </p>
      )}
      {address && <p className="cta__muted">{address}</p>}
    </article>
  );
}
