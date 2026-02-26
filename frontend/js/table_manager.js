(() => {
    function ensureStyles() {
        if (document.getElementById('table-manager-styles')) return;
        const style = document.createElement('style');
        style.id = 'table-manager-styles';
        style.textContent = `
            .table-manager-controls {
                background: linear-gradient(180deg, rgba(248,249,252,0.95), rgba(255,255,255,0.95));
                border: 1px solid rgba(78,115,223,0.12);
                border-radius: 10px;
                padding: 10px 12px;
            }
            .table-manager-search {
                min-width: 220px;
                max-width: 360px;
                flex: 1 1 240px;
            }
            .table-manager-search .input-group-text {
                background: #fff;
                border-right: 0;
                color: #6c757d;
                font-weight: 600;
            }
            .table-manager-search .form-control {
                border-left: 0;
                box-shadow: none;
            }
            .table-manager-search .form-control:focus {
                box-shadow: none;
                border-color: #4e73df;
            }
            .table-manager-filters {
                flex: 1 1 auto;
                justify-content: flex-end;
            }
            .table-manager-filter select {
                min-width: 160px;
                border-radius: 8px;
                box-shadow: none;
            }
            .table-manager-filter select:focus {
                border-color: #4e73df;
                box-shadow: 0 0 0 0.1rem rgba(78,115,223,0.15);
            }
            .table-manager-pagination {
                padding: 6px 2px;
            }
            .table-manager-pagination .pagination {
                gap: 4px;
            }
            .table-manager-pagination .page-item .page-link {
                border-radius: 8px;
                border: 1px solid rgba(78,115,223,0.2);
                color: #4e73df;
                font-weight: 600;
                padding: 4px 10px;
            }
            .table-manager-pagination .page-item.active .page-link {
                background: #4e73df;
                border-color: #4e73df;
                color: #fff;
            }
            .table-manager-pagination .page-item.disabled .page-link {
                color: #adb5bd;
                border-color: #e9ecef;
            }
            @media (max-width: 768px) {
                .table-manager-controls {
                    gap: 8px;
                }
                .table-manager-search {
                    min-width: 100%;
                }
                .table-manager-filters {
                    justify-content: flex-start;
                }
                .table-manager-filter select {
                    min-width: 140px;
                }
            }
            @media print {
                .table-manager-controls,
                .table-manager-pagination {
                    display: none !important;
                }
                table[data-table-manager="true"] tbody tr {
                    display: table-row !important;
                }
                table[data-table-manager="true"] tr[data-table-manager-empty="true"] {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function normalizeText(value) {
        return String(value || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function autoPageSize(total) {
        if (total <= 0) return 1;
        if (total <= 10) return total;
        if (total <= 25) return 10;
        if (total <= 50) return 25;
        return 50;
    }

    function isPlaceholderRow(row, columnCount) {
        if (!row) return true;
        if (row.dataset.tableManagerEmpty === 'true') return true;
        const cells = row.querySelectorAll('td');
        if (cells.length !== 1) return false;
        const colSpan = parseInt(cells[0].getAttribute('colspan') || '1', 10);
        if (colSpan < Math.max(1, columnCount - 1)) return false;
        const text = normalizeText(row.innerText).toLowerCase();
        return /no .*found|no .*available|no data/i.test(text);
    }

    function getCellFilterValues(cell) {
        if (!cell) return ['n/a'];
        const dataValues = cell.getAttribute('data-filter-values');
        if (dataValues) {
            return dataValues
                .split('|')
                .map(v => normalizeText(v))
                .filter(Boolean)
                .map(v => v || 'n/a');
        }
        const dataValue = cell.getAttribute('data-filter-value');
        if (dataValue) {
            const val = normalizeText(dataValue);
            return [val || 'n/a'];
        }
        const text = normalizeText(cell.innerText);
        if (!text) return ['n/a'];
        const tokens = text.split(',').map(v => normalizeText(v)).filter(Boolean);
        return tokens.length ? tokens : [text];
    }

    class TableManager {
        constructor(table, config = {}) {
            this.table = table;
            this.tbody = table.tBodies[0];
            this.columnCount = (table.tHead && table.tHead.rows[0]) ? table.tHead.rows[0].cells.length : 0;
            this.pageSizeMode = config.pageSizeMode || 'auto';
            this.disablePagination = table.dataset.disablePagination === 'true';
            this.currentPage = 1;
            this.rows = [];
            this.filters = config.filters || [];
            this.filterSelects = [];
            this.searchInput = config.searchInput || null;
            this.searchButton = config.searchButton || null;
            this.filtersContainer = config.filtersContainer || null;
            this.paginationContainer = config.paginationContainer || null;
            this.pageInfo = config.pageInfo || null;
            this._observer = null;
            this._refreshScheduled = false;
            this._init();
        }

        _init() {
            if (!this.tbody) return;
            this.filters = this.filters.length ? this.filters : this._parseFilters();
            this._ensureControls();
            this._buildFilters();
            this._bindEvents();
            this.refresh(true);
            this._observe();
        }

        _ensureControls() {
            const baseId = this.table.id || `table-${Math.random().toString(36).slice(2, 8)}`;
            if (!this.table.id) this.table.id = baseId;

            const searchId = this.table.dataset.searchInput || `${baseId}Search`;
            const filtersId = this.table.dataset.filtersContainer || `${baseId}Filters`;
            const paginationId = this.table.dataset.paginationContainer || `${baseId}Pagination`;
            const infoId = this.table.dataset.pageInfo || `${baseId}PageInfo`;

            let searchInput = document.getElementById(searchId);
            let filtersContainer = document.getElementById(filtersId);
            let paginationContainer = document.getElementById(paginationId);
            let pageInfo = document.getElementById(infoId);

            const hasAutoFilters = this.filters.some(def => !def.controlId);
            const needsSearch = !searchInput;
            const needsFilters = !filtersContainer && hasAutoFilters;

            if (needsSearch || needsFilters) {
                const controls = document.createElement('div');
                controls.className = 'table-manager-controls d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2';
                const searchMarkup = needsSearch
                    ? `
                        <div class="input-group input-group-sm table-manager-search">
                            <span class="input-group-text"><i class="fas fa-search"></i></span>
                            <input type="text" class="form-control" id="${searchId}" placeholder="Search...">
                        </div>
                      `
                    : '';
                const filtersMarkup = needsFilters
                    ? `<div class="table-manager-filters d-flex flex-wrap gap-2" id="${filtersId}"></div>`
                    : '';
                controls.innerHTML = `${searchMarkup}${filtersMarkup}`;

                const responsiveWrap = this.table.parentElement && this.table.parentElement.classList.contains('table-responsive')
                    ? this.table.parentElement
                    : this.table;
                if (responsiveWrap && responsiveWrap.parentElement) {
                    responsiveWrap.parentElement.insertBefore(controls, responsiveWrap);
                } else if (this.table.parentElement) {
                    this.table.parentElement.insertBefore(controls, this.table);
                }

                searchInput = document.getElementById(searchId);
                filtersContainer = document.getElementById(filtersId);
            }

            if (!this.disablePagination && (!paginationContainer || !pageInfo)) {
                const paginationWrapper = document.createElement('div');
                paginationWrapper.className = 'table-manager-pagination d-flex align-items-center justify-content-between flex-wrap gap-2 mt-2';
                paginationWrapper.innerHTML = `
                    <div class="small text-muted" id="${infoId}"></div>
                    <nav aria-label="Table pagination">
                        <ul class="pagination pagination-sm mb-0" id="${paginationId}"></ul>
                    </nav>
                `;
                const responsiveWrap = this.table.parentElement && this.table.parentElement.classList.contains('table-responsive')
                    ? this.table.parentElement
                    : this.table;
                if (responsiveWrap && responsiveWrap.parentElement) {
                    responsiveWrap.parentElement.insertBefore(paginationWrapper, responsiveWrap.nextSibling);
                } else if (this.table.parentElement) {
                    this.table.parentElement.insertBefore(paginationWrapper, this.table.nextSibling);
                }

                paginationContainer = document.getElementById(paginationId);
                pageInfo = document.getElementById(infoId);
            }

            const searchButtonId = this.table.dataset.searchButton || '';
            const searchButton = searchButtonId ? document.getElementById(searchButtonId) : null;

            this.searchInput = this.searchInput || searchInput;
            this.filtersContainer = this.filtersContainer || filtersContainer;
            this.paginationContainer = this.paginationContainer || paginationContainer;
            this.pageInfo = this.pageInfo || pageInfo;
            this.searchButton = this.searchButton || searchButton;
        }

        _parseFilters() {
            const filters = [];
            const controlsAttr = this.table.dataset.filterControls || '';
            if (controlsAttr) {
                const parts = controlsAttr.split('|').map(item => item.trim()).filter(Boolean);
                parts.forEach(part => {
                    const segs = part.split(':').map(s => s.trim());
                    if (segs.length < 2) return;
                    const controlId = segs[0];
                    const idx = parseInt(segs[1], 10);
                    if (!controlId || Number.isNaN(idx)) return;
                    const label = segs[2] || segs[0];
                    filters.push({ label, index: idx, controlId });
                });
            }

            const attr = this.table.dataset.filters || '';
            if (!attr) return filters;
            const parts = attr.split('|').map(item => item.trim()).filter(Boolean);
            parts.forEach(part => {
                const segs = part.split(':').map(s => s.trim());
                if (segs.length < 2) return;
                let label = segs[0];
                let index = segs[1];
                if (/^\d+$/.test(label) && !/^\d+$/.test(index)) {
                    const tmp = label;
                    label = index;
                    index = tmp;
                }
                const idx = parseInt(index, 10);
                if (Number.isNaN(idx)) return;
                filters.push({ label, index: idx });
            });
            return filters;
        }

        _buildFilters() {
            const filterDefs = this.filters.length ? this.filters : this._parseFilters();
            this.filters = filterDefs;
            if (!filterDefs.length) return;

            if (this.filtersContainer) {
                this.filtersContainer.innerHTML = '';
            }

            this.filterSelects = filterDefs.map((def, idx) => {
                let select = null;
                if (def.controlId) {
                    select = document.getElementById(def.controlId);
                }
                if (!select) {
                    if (!this.filtersContainer) return null;
                    const wrapper = document.createElement('div');
                    wrapper.className = 'table-manager-filter';

                    select = document.createElement('select');
                    select.className = 'form-select form-select-sm';
                    select.setAttribute('data-filter-index', String(idx));
                    select.dataset.tableManagerAuto = 'true';

                    const safeLabel = String(def.label || `filter-${idx}`)
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');
                    const baseId = `${this.table.id || 'table'}-${safeLabel || `filter-${idx}`}`;
                    select.id = `${baseId}-select`;
                    select.name = `${baseId}-select`;

                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = `All ${def.label}`;
                    select.appendChild(defaultOption);

                    wrapper.appendChild(select);
                    this.filtersContainer.appendChild(wrapper);
                } else {
                    select.setAttribute('data-filter-index', String(idx));
                }

                if (!select.id) {
                    select.id = `${this.table.id || 'table'}-filter-${idx}`;
                }
                if (!select.name) {
                    select.name = select.id;
                }
                if (!select.getAttribute('aria-label')) {
                    select.setAttribute('aria-label', `${def.label || 'Filter'} filter`);
                }

                return select;
            }).filter(Boolean);
        }

        _bindEvents() {
            if (this.searchInput) {
                let debounce;
                this.searchInput.addEventListener('input', () => {
                    clearTimeout(debounce);
                    debounce = setTimeout(() => {
                        this.currentPage = 1;
                        this.apply();
                    }, 150);
                });
            }
            if (this.searchButton) {
                this.searchButton.addEventListener('click', () => {
                    this.currentPage = 1;
                    this.apply();
                });
            }
            this.filterSelects.forEach(select => {
                select.addEventListener('change', () => {
                    this.currentPage = 1;
                    this.apply();
                });
            });
        }

        _collectRows() {
            const allRows = Array.from(this.tbody.querySelectorAll('tr'));
            const rows = allRows.filter(row => !isPlaceholderRow(row, this.columnCount));
            this.rows = rows.map(row => {
                const cells = Array.from(row.cells || []);
                const searchText = normalizeText(row.innerText).toLowerCase();
                const filterValues = this.filters.map(def => {
                    const cell = cells[def.index];
                    return getCellFilterValues(cell).map(v => normalizeText(v).toLowerCase());
                });
                return { row, searchText, filterValues, cells };
            });
        }

        _updateFilterOptions() {
            if (!this.filters.length || !this.filterSelects.length) return;
            const selections = this.filterSelects.map(select => select.value);
            const optionsMaps = this.filters.map(() => new Map());

            this.rows.forEach(rowData => {
                rowData.filterValues.forEach((values, idx) => {
                    values.forEach(value => {
                        const key = value || 'n/a';
                        if (!optionsMaps[idx].has(key)) {
                            optionsMaps[idx].set(key, value || 'N/A');
                        }
                    });
                });
            });

            const autoOptions = this.table.dataset.filterAutoOptions === 'true';
            this.filterSelects.forEach((select, idx) => {
                const shouldUpdate = autoOptions || select.dataset.tableManagerAuto === 'true';
                if (!shouldUpdate) return;
                const existing = selections[idx] || '';
                const options = Array.from(optionsMaps[idx].values()).map(v => normalizeText(v)).filter(Boolean);
                const unique = Array.from(new Set(options));
                unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

                select.innerHTML = '';
                const allOption = document.createElement('option');
                allOption.value = '';
                allOption.textContent = `All ${this.filters[idx].label}`;
                select.appendChild(allOption);

                unique.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.toLowerCase();
                    option.textContent = opt;
                    select.appendChild(option);
                });
                if (existing) {
                    select.value = existing;
                }
            });
        }

        _applyFiltersAndSearch() {
            const query = this.searchInput ? normalizeText(this.searchInput.value).toLowerCase() : '';
            const selectedFilters = this.filterSelects.map(select => normalizeText(select.value).toLowerCase());

            return this.rows.filter(rowData => {
                if (query && !rowData.searchText.includes(query)) return false;
                for (let i = 0; i < selectedFilters.length; i += 1) {
                    const selected = selectedFilters[i];
                    if (!selected) continue;
                    const values = rowData.filterValues[i] || [];
                    if (!values.includes(selected)) return false;
                }
                return true;
            });
        }

        _renderPagination(totalItems, pageSize) {
            if (!this.paginationContainer) return;
            const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
            if (this.currentPage > totalPages) this.currentPage = totalPages;

            const makePageItem = (label, page, disabled, active) => {
                const li = document.createElement('li');
                li.className = `page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}`;
                const btn = document.createElement('button');
                btn.className = 'page-link';
                btn.type = 'button';
                btn.textContent = label;
                if (!disabled) {
                    btn.addEventListener('click', () => {
                        this.currentPage = page;
                        this.apply();
                    });
                }
                li.appendChild(btn);
                return li;
            };

            this.paginationContainer.innerHTML = '';
            if (totalPages <= 1) {
                this.paginationContainer.parentElement.style.display = 'none';
                return;
            }
            this.paginationContainer.parentElement.style.display = 'flex';

            this.paginationContainer.appendChild(makePageItem('Prev', Math.max(1, this.currentPage - 1), this.currentPage === 1, false));

            const windowSize = 5;
            let start = Math.max(1, this.currentPage - Math.floor(windowSize / 2));
            let end = Math.min(totalPages, start + windowSize - 1);
            if (end - start + 1 < windowSize) {
                start = Math.max(1, end - windowSize + 1);
            }

            for (let i = start; i <= end; i += 1) {
                this.paginationContainer.appendChild(makePageItem(String(i), i, false, i === this.currentPage));
            }

            this.paginationContainer.appendChild(makePageItem('Next', Math.min(totalPages, this.currentPage + 1), this.currentPage === totalPages, false));
        }

        _updateInfo(visibleCount, totalCount, pageSize) {
            if (!this.pageInfo) return;
            if (!totalCount) {
                this.pageInfo.textContent = 'Showing 0 of 0';
                return;
            }
            const start = (this.currentPage - 1) * pageSize + 1;
            const end = Math.min(this.currentPage * pageSize, totalCount);
            this.pageInfo.textContent = `Showing ${start}-${end} of ${totalCount}`;
        }

        apply() {
            this._collectRows();
            this._updateFilterOptions();

            const filteredRows = this._applyFiltersAndSearch();
            const totalItems = filteredRows.length;
            const pageSize = this.disablePagination
                ? Math.max(totalItems, 1)
                : (this.pageSizeMode === 'auto' ? autoPageSize(filteredRows.length) : this.pageSizeMode);

            const start = this.disablePagination ? 0 : (this.currentPage - 1) * pageSize;
            const end = this.disablePagination ? totalItems : start + pageSize;
            const visibleRows = filteredRows.slice(start, end);

            this.rows.forEach(rowData => {
                rowData.row.style.display = 'none';
            });
            visibleRows.forEach(rowData => {
                rowData.row.style.display = '';
            });

            let emptyRow = this.tbody.querySelector('tr[data-table-manager-empty="true"]');
            if (!emptyRow) {
                emptyRow = document.createElement('tr');
                emptyRow.setAttribute('data-table-manager-empty', 'true');
                emptyRow.innerHTML = `<td colspan="${this.columnCount || 1}" class="text-center">No results found.</td>`;
                this.tbody.appendChild(emptyRow);
            }
            emptyRow.style.display = totalItems === 0 ? '' : 'none';

            if (!this.disablePagination) {
                this._renderPagination(totalItems, pageSize);
                this._updateInfo(visibleRows.length, totalItems, pageSize);
            } else if (this.pageInfo) {
                this.pageInfo.textContent = '';
            }
        }

        refresh(force = false) {
            if (!force && this._refreshScheduled) return;
            this._refreshScheduled = true;
            requestAnimationFrame(() => {
                this._refreshScheduled = false;
                this.apply();
            });
        }

        _observe() {
            if (!this.tbody) return;
            if (this._observer) this._observer.disconnect();
            this._observer = new MutationObserver(() => {
                this.refresh();
            });
            this._observer.observe(this.tbody, { childList: true });
        }

        showAllForPrint() {
            if (!this.tbody) return;
            this._collectRows();
            const filteredRows = this._applyFiltersAndSearch();
            this.rows.forEach(rowData => {
                rowData.row.style.display = 'none';
            });
            filteredRows.forEach(rowData => {
                rowData.row.style.display = '';
            });

            const emptyRow = this.tbody.querySelector('tr[data-table-manager-empty="true"]');
            if (emptyRow) {
                emptyRow.style.display = filteredRows.length ? 'none' : '';
            }
        }
    }

    const managers = [];

    function initTableManagers() {
        ensureStyles();
        const tables = document.querySelectorAll('table[data-table-manager="true"]');
        tables.forEach(table => {
            if (table.dataset.tableManagerInitialized === 'true') return;
            table.dataset.tableManagerInitialized = 'true';
            managers.push(new TableManager(table));
        });
    }

    function exportTableToExcel(tableId, filenameBase = 'report') {
        const table = document.getElementById(tableId);
        if (!table) {
            alert('Table not found.');
            return;
        }

        const originalRows = Array.from(table.querySelectorAll('tr'));
        if (!originalRows.length) {
            alert('No data to export.');
            return;
        }

        const tableClone = table.cloneNode(true);
        const clonedRows = Array.from(tableClone.querySelectorAll('tr'));

        originalRows.forEach((row, idx) => {
            const clone = clonedRows[idx];
            if (!clone) return;
            const style = window.getComputedStyle(row);
            if (style.display === 'none') {
                clone.remove();
                return;
            }
            if (row.getAttribute('data-table-manager-empty') === 'true') {
                clone.remove();
            }
        });

        const remainingRows = tableClone.querySelectorAll('tr');
        if (!remainingRows.length) {
            alert('No data to export.');
            return;
        }

        const html = `
            <html>
                <head><meta charset="UTF-8"></head>
                <body>${tableClone.outerHTML}</body>
            </html>
        `;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        link.href = url;
        link.download = `${filenameBase}-${timestamp}.xls`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function handleBeforePrint() {
        managers.forEach(manager => manager.showAllForPrint());
    }

    function handleAfterPrint() {
        managers.forEach(manager => manager.apply());
    }

    if (typeof window !== 'undefined') {
        window.exportTableToExcel = exportTableToExcel;
        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('afterprint', handleAfterPrint);
        if (window.matchMedia) {
            const mq = window.matchMedia('print');
            if (mq && typeof mq.addEventListener === 'function') {
                mq.addEventListener('change', (event) => {
                    if (event.matches) {
                        handleBeforePrint();
                    } else {
                        handleAfterPrint();
                    }
                });
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTableManagers);
    } else {
        initTableManagers();
    }
})();
