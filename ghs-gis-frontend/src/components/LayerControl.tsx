import type { BoundaryLayer, ContextLayer } from "../data/layers";

export interface LayerControlProps {
  contextLayers: ContextLayer[];
  boundaryLayers: BoundaryLayer[];
  contextId: string | null;
  boundaryId: string | null;
  onContextChange: (id: string | null) => void;
  onBoundaryChange: (id: string | null) => void;
}

/**
 * Both groups are single-select. Two translucent choropleths stacked on each
 * other are unreadable, and several district outlines at once turn the map
 * into a mesh — so the control makes that structural rather than asking the
 * user to avoid it.
 */
export default function LayerControl({
  contextLayers,
  boundaryLayers,
  contextId,
  boundaryId,
  onContextChange,
  onBoundaryChange,
}: LayerControlProps) {
  if (contextLayers.length === 0 && boundaryLayers.length === 0) return null;

  const active = [contextId, boundaryId].filter(Boolean).length;

  return (
    <details className="layers">
      <summary className="layers__summary">
        Layers
        {active > 0 && <span className="badge">{active}</span>}
      </summary>

      <div className="layers__body">
        {contextLayers.length > 0 && (
          <fieldset className="layers__group">
            <legend className="layers__legend">Context</legend>
            <Radio
              name="context"
              label="None"
              checked={contextId === null}
              onChange={() => onContextChange(null)}
            />
            {contextLayers.map((layer) => (
              <Radio
                key={layer.id}
                name="context"
                label={layer.label}
                checked={contextId === layer.id}
                onChange={() => onContextChange(layer.id)}
              />
            ))}
          </fieldset>
        )}

        {boundaryLayers.length > 0 && (
          <fieldset className="layers__group">
            <legend className="layers__legend">District boundaries</legend>
            <Radio
              name="boundary"
              label="None"
              checked={boundaryId === null}
              onChange={() => onBoundaryChange(null)}
            />
            {boundaryLayers.map((layer) => (
              <Radio
                key={layer.id}
                name="boundary"
                label={layer.label}
                checked={boundaryId === layer.id}
                onChange={() => onBoundaryChange(layer.id)}
              />
            ))}
          </fieldset>
        )}
      </div>
    </details>
  );
}

function Radio({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="checkbox">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span className="checkbox__label">{label}</span>
    </label>
  );
}
