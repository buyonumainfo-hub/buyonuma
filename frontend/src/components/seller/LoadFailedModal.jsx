import { AlertTriangle, RotateCcw } from 'lucide-react';
import './LoadFailedModal.css';

/**
 * Shown when a seller dashboard page's initial data fetch fails.
 *
 * Previously these failures were completely silent — the fetch's catch
 * block only did `console.error(...)`, so a seller whose page failed to
 * load (network blip, backend hiccup, rate limit, etc.) would just see a
 * blank or stuck-loading page with zero explanation and no way to
 * recover short of manually refreshing the browser. This gives them a
 * clear message and a one-tap way to retry the same request.
 */
const LoadFailedModal = ({
  onRetry,
  retrying = false,
  title = 'Something went wrong',
  message = "We couldn't load this page. Please check your connection and try again.",
}) => (
  <div className="load-failed-overlay">
    <div className="load-failed-modal">
      <div className="load-failed-icon">
        <AlertTriangle size={26} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      <button type="button" className="btn btn-primary load-failed-retry-btn" onClick={onRetry} disabled={retrying}>
        <RotateCcw size={15} className={retrying ? 'spin' : ''} />
        {retrying ? 'Retrying…' : 'Try Again'}
      </button>
    </div>
  </div>
);

export default LoadFailedModal;
