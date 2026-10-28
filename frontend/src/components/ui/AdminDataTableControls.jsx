import { useMemo, useState } from "react";

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

function compareValues(left, right) {
    if (left == null || left === "") return right == null || right === "" ? 0 : 1;
    if (right == null || right === "") return -1;

    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (String(left).trim() !== "" && String(right).trim() !== "" &&
        Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
        return leftNumber - rightNumber;
    }

    return String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: "base",
    });
}

export function useAdminDataTable(
    rows,
    { searchText = (row) => JSON.stringify(row), sortOptions = [] } = {},
) {
    const [query, setQuery] = useState("");
    const [sortBy, setSortBy] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const filteredRows = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        const matches = normalizedQuery
            ? rows.filter((row) =>
                  String(searchText(row) || "")
                      .toLocaleLowerCase()
                      .includes(normalizedQuery),
              )
            : rows;
        const selectedSort = sortOptions.find(
            (option) => option.value === sortBy,
        );

        if (!selectedSort) return matches;
        return [...matches].sort((left, right) => {
            const result = compareValues(
                selectedSort.getValue(left),
                selectedSort.getValue(right),
            );
            return selectedSort.direction === "desc" ? -result : result;
        });
    }, [rows, query, searchText, sortBy, sortOptions]);

    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const visibleRows = filteredRows.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    return {
        rows: visibleRows,
        query,
        onQueryChange: (value) => {
            setQuery(value);
            setPage(1);
        },
        sortBy,
        onSortChange: (value) => {
            setSortBy(value);
            setPage(1);
        },
        sortOptions,
        pageSize,
        pageSizes: DEFAULT_PAGE_SIZES,
        onPageSizeChange: (value) => {
            setPageSize(Number(value));
            setPage(1);
        },
        page: currentPage,
        pageCount,
        total: filteredRows.length,
        onPageChange: setPage,
    };
}

export default function AdminDataTableControls({
    query,
    onQueryChange,
    searchPlaceholder = "Search records...",
    sortBy,
    onSortChange,
    sortOptions = [],
    pageSize,
    pageSizes = DEFAULT_PAGE_SIZES,
    onPageSizeChange,
    page,
    pageCount,
    total,
    countLabel = "records",
    onPageChange,
}) {
    return (
        <div className="admin-datatable-controls">
            {onQueryChange && (
                <label className="admin-datatable-controls__search">
                    <span className="admin-datatable-controls__label">Search</span>
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder={searchPlaceholder}
                    />
                </label>
            )}

            {onSortChange && sortOptions.length > 0 && (
                <label className="admin-datatable-controls__field">
                    <span className="admin-datatable-controls__label">Sort by</span>
                    <select
                        value={sortBy}
                        onChange={(event) => onSortChange(event.target.value)}
                    >
                        {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            {onPageSizeChange && (
                <label className="admin-datatable-controls__field">
                    <span className="admin-datatable-controls__label">Rows</span>
                    <select
                        value={pageSize}
                        onChange={(event) =>
                            onPageSizeChange(Number(event.target.value))
                        }
                    >
                        {pageSizes.map((size) => (
                            <option key={size} value={size}>
                                {size} per page
                            </option>
                        ))}
                    </select>
                </label>
            )}

            {Number.isFinite(total) && (
                <span className="admin-datatable-controls__count">
                    {total} {total === 1 ? countLabel : `${countLabel}s`}
                </span>
            )}

            {onPageChange && pageCount > 1 && (
                <div className="admin-datatable-controls__pagination">
                    <span>
                        Page <strong>{page}</strong> of{" "}
                        <strong>{pageCount}</strong>
                    </span>
                    <button
                        type="button"
                        className="admin-btn admin-btn--outline admin-btn--sm"
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                    >
                        Previous
                    </button>
                    <button
                        type="button"
                        className="admin-btn admin-btn--outline admin-btn--sm"
                        disabled={page >= pageCount}
                        onClick={() => onPageChange(page + 1)}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
