import type { Dataset } from "../data/dataset";
import { DETAIL_GROUPS } from "../data/fields";
import { isFlagged, severityOf, type Severity } from "../data/severity";
import { formatValue, NO_DATA, pluralize } from "../lib/format";
import InfoTip from "./InfoTip";

export interface SchoolFieldsProps {
  data: Dataset;
  index: number;
  /** How many groups start expanded. The sidebar opens its first three. */
  defaultOpen?: number;
  /** "wide" spreads the groups across columns on a full-width page. */
  layout?: "sidebar" | "wide";
}

/**
 * Every labelled field the join produced for one school, grouped.
 *
 * Shared by the researcher sidebar and the school page: the markup is the same
 * and only the column count differs, which is CSS. Keeping one renderer is what
 * makes adding a column to `data/fields.ts` the only edit a new column needs.
 *
 * Fields the thresholds in `data/severity.ts` grade badly are marked, and each
 * group carries the count on its header — otherwise a collapsed group looks the
 * same whether it holds nine clean rows or nine failing ones.
 */
export default function SchoolFields({
  data,
  index,
  defaultOpen = 0,
  layout = "sidebar",
}: SchoolFieldsProps) {
  return (
    <div className={`fields fields--${layout}`}>
      {DETAIL_GROUPS.map((group, groupIndex) => {
        const fields = group.fields.filter((f) => data.has(f.key));
        if (fields.length === 0) return null;
        const graded = fields.map((f) => severityOf(f.key, data.value(f.key, index)));
        const flagged = graded.filter(isFlagged).length;
        const worst: Severity | null = graded.includes("critical")
          ? "critical"
          : graded.includes("concern")
            ? "concern"
            : null;
        return (
          <details
            className="detail__group"
            key={group.title}
            open={groupIndex < defaultOpen || flagged > 0}
          >
            <summary>
              {group.title}
              {group.description && <InfoTip label={group.title} text={group.description} />}
              {flagged > 0 && (
                <span className={`detail__count detail__count--${worst}`}>
                  {pluralize(flagged, "flag")}
                </span>
              )}
            </summary>
            <div className="detail__rows">
              {fields.map((field, fieldIndex) => {
                const text = formatValue(data.value(field.key, index), field.format, field.unit);
                const level = graded[fieldIndex];
                const valueClass = isFlagged(level)
                  ? ` detail__val--${level}`
                  : text === NO_DATA
                    ? " detail__val--muted"
                    : "";
                return (
                  <div key={field.key} style={{ display: "contents" }}>
                    <span className="detail__key">
                      {field.label}
                      {field.description && (
                        <InfoTip label={field.label} text={field.description} />
                      )}
                    </span>
                    <span className={`detail__val${valueClass}`}>{text}</span>
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
