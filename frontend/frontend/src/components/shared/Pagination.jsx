import { ChevronLeft, ChevronRight } from 'lucide-react';
import "./pagination.css"

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.pages <= 1) return null;

  const { page, pages } = pagination;

  const getPageNumbers = () => {
    const pages_arr = [];
    const delta = 2;
    for (let i = Math.max(1, page - delta); i <= Math.min(pages, page + delta); i++) {
      pages_arr.push(i);
    }
    return pages_arr;
  };

  return (
    <div className="pagination">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Previous">
        <ChevronLeft size={16} />
      </button>

      {getPageNumbers()[0] > 1 && (
        <>
          <button onClick={() => onPageChange(1)}>1</button>
          {getPageNumbers()[0] > 2 && <span style={{ padding: '0 0.25rem', color: 'var(--ink-muted)', alignSelf: 'center' }}>…</span>}
        </>
      )}

      {getPageNumbers().map(p => (
        <button key={p} onClick={() => onPageChange(p)} className={p === page ? 'active' : ''}>
          {p}
        </button>
      ))}

      {getPageNumbers().slice(-1)[0] < pages && (
        <>
          {getPageNumbers().slice(-1)[0] < pages - 1 && <span style={{ padding: '0 0.25rem', color: 'var(--ink-muted)', alignSelf: 'center' }}>…</span>}
          <button onClick={() => onPageChange(pages)}>{pages}</button>
        </>
      )}

      <button onClick={() => onPageChange(page + 1)} disabled={page === pages} aria-label="Next">
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default Pagination;
