import React, { forwardRef, useMemo } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown, Check, Minus } from 'lucide-react';
import './Table.css';

/**
 * PetCare Design System — Table Component
 * Unified table replacing:
 * - AdminConsole data tables
 * - Dashboard data grids
 * - Appointment lists
 * - Order tables
 * - User management tables
 */

const Table = forwardRef(function Table(
  {
    columns = [],
    data = [],
    keyField = 'id',
    sortable = true,
    selectable = false,
    onSelectionChange,
    selectedRows = [],
    pagination = false,
    pageSize = 10,
    pageSizeOptions = [10, 25, 50, 100],
    loading = false,
    emptyMessage = 'No data available',
    className = '',
    striped = true,
    hoverable = true,
    bordered = false,
    compact = false,
    stickyHeader = false,
    ...props
  },
  ref
) {
  const [sortConfig, setSortConfig] = React.useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [localPageSize, setLocalPageSize] = React.useState(pageSize);

  const sortedData = useMemo(() => {
    if (!sortable || !sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, sortable]);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * localPageSize;
    return sortedData.slice(start, start + localPageSize);
  }, [sortedData, pagination, currentPage, localPageSize]);

  const totalPages = Math.ceil(sortedData.length / localPageSize) || 1;

  const handleSort = (key) => {
    if (!sortable) return;
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };

  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    if (checked) {
      onSelectionChange?.(paginatedData.map(row => row[keyField]));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (rowId, checked) => {
    const newSelection = checked
      ? [...selectedRows, rowId]
      : selectedRows.filter(id => id !== rowId);
    onSelectionChange?.(newSelection);
  };

  const isRowSelected = (rowId) => selectedRows.includes(rowId);
  const allSelected = paginatedData.length > 0 && paginatedData.every(row => isRowSelected(row[keyField]));
  const someSelected = paginatedData.some(row => isRowSelected(row[keyField]));

  const classNames = [
    'table-wrapper',
    striped ? 'table--striped' : '',
    hoverable ? 'table--hoverable' : '',
    bordered ? 'table--bordered' : '',
    compact ? 'table--compact' : '',
    stickyHeader ? 'table--sticky-header' : '',
    loading ? 'table--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={className} {...props}>
      <div className={classNames}>
        {loading && <div className="table__loading-overlay" aria-hidden="true" />}

        <div className="table__container" role="region" aria-label="Data table" tabIndex={0}>
          <table className="table" role="grid">
            <thead className="table__head">
              <tr role="row">
                {selectable && (
                  <th className="table__cell table__cell--checkbox" scope="col">
                    <input
                      type="checkbox"
                      className="table__checkbox"
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={handleSelectAll}
                      aria-label="Select all rows"
                    />
                  </th>
                )}
                {columns.map((column, index) => (
                  <th
                    key={column.key || index}
                    className={`table__cell table__cell--header ${column.className || ''} ${column.align ? `table__cell--${column.align}` : ''} ${sortable && column.sortable !== false ? 'table__cell--sortable' : ''}`}
                    scope="col"
                    style={{ width: column.width, minWidth: column.minWidth }}
                    onClick={() => column.sortable !== false && handleSort(column.key)}
                    aria-sort={sortConfig.key === column.key ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <div className="table__header-content">
                      <span>{column.header}</span>
                      {sortable && column.sortable !== false && sortConfig.key === column.key && (
                        <span className="table__sort-icon" aria-hidden="true">
                          {sortConfig.direction === 'asc' ? <ChevronUp size={14} strokeWidth={2.5} /> : <ChevronDown size={14} strokeWidth={2.5} />}
                        </span>
                      )}
                      {sortable && column.sortable !== false && sortConfig.key !== column.key && (
                        <span className="table__sort-icon table__sort-icon--inactive" aria-hidden="true">
                          <ArrowUpDown size={14} strokeWidth={2} />
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {columns.some(col => col.actions) && (
                  <th className="table__cell table__cell--actions" scope="col">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="table__body">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (columns.some(col => col.actions) ? 1 : 0)} className="table__empty">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIndex) => {
                  const rowId = row[keyField];
                  const isSelected = isRowSelected(rowId);
                  return (
                    <tr
                      key={rowId}
                      className={`table__row ${isSelected ? 'table__row--selected' : ''} ${row.className || ''}`}
                      role="row"
                      data-row-id={rowId}
                    >
                      {selectable && (
                        <td className="table__cell table__cell--checkbox">
                          <input
                            type="checkbox"
                            className="table__checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                            aria-label={`Select row ${rowIndex + 1}`}
                          />
                        </td>
                      )}
                      {columns.map((column, colIndex) => (
                        <td
                          key={column.key || colIndex}
                          className={`table__cell ${column.className || ''} ${column.align ? `table__cell--${column.align}` : ''}`}
                          style={{ width: column.width, minWidth: column.minWidth }}
                        >
                          {column.render
                            ? column.render(row[column.key], row, rowIndex)
                            : row[column.key] ?? '-'}
                        </td>
                      ))}
                      {columns.some(col => col.actions) && (
                        <td className="table__cell table__cell--actions">
                          <div className="table__actions">
                            {columns
                              .filter(col => col.actions)
                              .flatMap(col => col.actions(row, rowIndex))
                              .map((action, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className="table__action-btn"
                                  onClick={() => action.onClick?.(row)}
                                  disabled={action.disabled?.(row)}
                                  aria-label={action.label}
                                >
                                  {action.icon}
                                  {action.label && <span className="table__action-label">{action.label}</span>}
                                </button>
                              ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="table__pagination" role="navigation" aria-label="Table pagination">
            <div className="table__pagination-info">
              Showing {(currentPage - 1) * localPageSize + 1} to {Math.min(currentPage * localPageSize, sortedData.length)} of {sortedData.length} entries
            </div>
            <div className="table__pagination-controls">
              <select
                className="table__page-size"
                value={localPageSize}
                onChange={(e) => {
                  setLocalPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label="Rows per page"
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size}>{size} per page</option>
                ))}
              </select>
              <div className="table__page-buttons">
                <button
                  type="button"
                  className="table__page-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                >
                  <ChevronUp size={16} strokeWidth={2.5} />
                  <ChevronUp size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className="table__page-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronUp size={16} strokeWidth={2.5} />
                </button>
                <span className="table__page-indicator" aria-current="page">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="table__page-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronDown size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className="table__page-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                >
                  <ChevronDown size={16} strokeWidth={2.5} />
                  <ChevronDown size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

Table.displayName = 'Table';

export default Table;

export const TABLE_COLUMN_DEFAULTS = {
  sortable: true,
  align: 'left',
};