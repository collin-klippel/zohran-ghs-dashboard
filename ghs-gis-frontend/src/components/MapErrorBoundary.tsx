import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** What still works without the map — the answer differs per page. */
  note?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Keeps a map failure local to the map pane.
 *
 * MapLibre throws synchronously when it can't get a WebGL context — old
 * hardware, a locked-down browser, remote desktop. Without a boundary that
 * error unmounts the whole tree and the dashboard goes blank, taking the
 * filters, ranking, and CSV export with it. Those all still work without a map.
 */
export default class MapErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Map failed to render", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="status">
          <div>
            <strong>The map could not be displayed.</strong>
            <p>
              This usually means the browser has no WebGL support.{" "}
              {this.props.note ?? "The filters, ranking, and CSV export on either side still work."}
            </p>
            <pre>{this.state.error.message}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
