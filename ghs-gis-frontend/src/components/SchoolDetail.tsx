import type { Dataset } from "../data/dataset";
import { NO_DATA } from "../lib/format";
import SchoolFields from "./SchoolFields";

export interface SchoolDetailProps {
  data: Dataset;
  index: number;
  onClose: () => void;
  /** Other schools sharing this building — the roster is many schools to one building. */
  colocated: number[];
  onSelect: (index: number) => void;
}

export default function SchoolDetail({
  data,
  index,
  onClose,
  colocated,
  onSelect,
}: SchoolDetailProps) {
  const name = String(data.value("Loc_Name", index) ?? "Unnamed school");
  const subtitle = [data.value("full_addr", index), data.value("Borough", index)]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="panel__header">
        <h2 className="panel__title">School detail</h2>
        <div className="header__spacer" />
        <button className="button button--ghost" onClick={onClose}>
          Back to ranking
        </button>
      </div>

      <div className="panel__body">
        <h3 className="detail__name">{name}</h3>
        <p className="detail__sub">{subtitle || NO_DATA}</p>

        {colocated.length > 0 && (
          <details className="detail__group" open>
            <summary>Shares building {String(data.value("Bldg_Code", index))}</summary>
            <div style={{ paddingBottom: 10 }}>
              {colocated.map((i) => (
                <button key={i} className="button button--ghost" onClick={() => onSelect(i)}>
                  {String(data.value("Loc_Name", i) ?? data.value("Loc_Code", i))}
                </button>
              ))}
            </div>
          </details>
        )}

        <SchoolFields data={data} index={index} defaultOpen={3} />
      </div>
    </>
  );
}
