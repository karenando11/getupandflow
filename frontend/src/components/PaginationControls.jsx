export function PaginationControls({ currentPage, isLoading, label = "items", onPageChange, totalPages }) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination-controls">
      <button
        className="calendar-nav-button"
        disabled={isLoading || currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        Previous
      </button>
      <span className="subtle-copy">
        Page {currentPage} of {totalPages} for {label}
      </span>
      <button
        className="calendar-nav-button"
        disabled={isLoading || currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Next
      </button>
    </div>
  );
}
