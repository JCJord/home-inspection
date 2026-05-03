export class PdfPaginationHelper {
  private readonly A4_HEIGHT = 2518;
  private readonly TABLE_MARGIN_BOTTOM = 32;

  constructor() { }

  preventContentCut(margin: number = 32): void {
    const sourceContent = document.querySelectorAll('.snippet');

    sourceContent.forEach((snippet) => {
      const headerElement = document.getElementById('page-header');
      const footerElement = document.getElementById('report-footer');

      if (!headerElement || !footerElement) {
        console.error('Header or footer element not found');
        return;
      }

      (headerElement as HTMLElement).style.minWidth = '1725px';

      const headerHeight = this.getElementHeight(headerElement as HTMLElement);
      const footerHeight = this.getElementHeight(footerElement as HTMLElement);

      const contentBodyElement = snippet.querySelector('.content-body') as HTMLElement;
      if (!contentBodyElement) return;

      const bodyPadding = getComputedStyle(contentBodyElement).padding || '60px';

      // Track created pages
      const pages: HTMLElement[] = [];

      let currentPage = this.createNewPage(headerElement as HTMLElement, [], true, bodyPadding);
      pages.push(currentPage);
      let currentPageWrapper = currentPage.querySelector('.content-body') as HTMLElement || currentPage;

      let availableSpace = this.A4_HEIGHT - (headerHeight + footerHeight + margin);

      const originalChildren = Array.from(contentBodyElement.children) as HTMLElement[];

      originalChildren.forEach((child) => {
        if (child.tagName.toLowerCase() === 'table') {
          this.processTable(
            child as HTMLTableElement,
            {
              currentPage,
              currentPageWrapper,
              availableSpace,
              headerElement: headerElement as HTMLElement,
              footerElement: footerElement as HTMLElement,
              headerHeight,
              footerHeight,
              bodyPadding,
              margin
            },
            (newPage, newWrapper, newSpace) => {
              currentPage = newPage;
              currentPageWrapper = newWrapper;
              availableSpace = newSpace;
              pages.push(currentPage);
            }
          );
        } else {
          const elementHeight = this.getElementHeight(child);

          // If element doesn't fit, move to new page
          if (elementHeight > availableSpace && currentPageWrapper.children.length > 0) {
            this.addFooterToPage(currentPage, footerElement as HTMLElement);
            currentPage = this.createNewPage(headerElement as HTMLElement, [], false, bodyPadding);
            pages.push(currentPage);
            currentPageWrapper = currentPage.querySelector('.content-body') as HTMLElement || currentPage;
            availableSpace = this.A4_HEIGHT - (headerHeight + footerHeight + margin);
          }

          currentPageWrapper.appendChild(child.cloneNode(true));
          availableSpace -= elementHeight;
        }
      });

      this.addFooterToPage(currentPage, footerElement as HTMLElement);

      // Clear original content
      (snippet as HTMLElement).innerHTML = '';

      // Append the new pages
      pages.forEach(page => snippet.appendChild(page));
    });
  }

  private processTable(
    originalTable: HTMLTableElement,
    state: {
      currentPage: HTMLElement,
      currentPageWrapper: HTMLElement,
      availableSpace: number,
      headerElement: HTMLElement,
      footerElement: HTMLElement,
      headerHeight: number,
      footerHeight: number,
      bodyPadding: string,
      margin: number
    },
    onNewPage: (newPage: HTMLElement, newWrapper: HTMLElement, newSpace: number) => void
  ): void {
    const tableHeaders = Array.from(originalTable.querySelectorAll('.table-header')) as HTMLElement[];
    const headerRowsHeight = tableHeaders.reduce((total, header) => total + this.getElementHeight(header), 0);
    const dataRows = Array.from(originalTable.querySelectorAll('tr:not(.table-header)')) as HTMLElement[];
    const groupsProcessed: Set<string> = new Set();

    if (tableHeaders.length === 0 || dataRows.length === 0) {
      // If table is not paginatable or empty, treat as a single block
      const tableHeight = this.getElementHeight(originalTable);
      if (tableHeight > state.availableSpace && state.currentPageWrapper.children.length > 0) {
        this.addFooterToPage(state.currentPage, state.footerElement);
        const newPage = this.createNewPage(state.headerElement, [], false, state.bodyPadding);
        const newWrapper = newPage.querySelector('.content-body') as HTMLElement || newPage;
        const newSpace = this.A4_HEIGHT - (state.headerHeight + state.footerHeight + state.margin);
        onNewPage(newPage, newWrapper, newSpace);
        state.currentPage = newPage;
        state.currentPageWrapper = newWrapper;
        state.availableSpace = newSpace;
      }
      state.currentPageWrapper.appendChild(originalTable.cloneNode(true));
      state.availableSpace -= tableHeight;
      return;
    }

    const areRemainingRowsAllBottomElements = (currentIndex: number): boolean => {
      const remainingRows = dataRows.slice(currentIndex);
      return remainingRows.length > 0 && remainingRows.every((row: HTMLElement) =>
        row.classList.contains('bottom-element') || row.querySelector('.bottom-element') !== null
      );
    };

    let currentTable = this.createTable();
    let rowIndex = 0;

    // Check if at least header + first row fit
    let firstRowHeight = this.calculateRowHeight(dataRows[0], dataRows, new Set<string>());
    if (state.availableSpace < (headerRowsHeight + firstRowHeight + this.TABLE_MARGIN_BOTTOM)) {
      this.addFooterToPage(state.currentPage, state.footerElement);
      const newPage = this.createNewPage(state.headerElement, [], false, state.bodyPadding);
      const newWrapper = newPage.querySelector('.content-body') as HTMLElement || newPage;
      const newSpace = this.A4_HEIGHT - (state.headerHeight + state.footerHeight + state.margin);
      onNewPage(newPage, newWrapper, newSpace);
      state.currentPage = newPage;
      state.currentPageWrapper = newWrapper;
      state.availableSpace = newSpace;
    }

    state.currentPageWrapper.appendChild(currentTable);
    if (!areRemainingRowsAllBottomElements(0)) {
      tableHeaders.forEach(h => currentTable.appendChild(h.cloneNode(true)));
      state.availableSpace -= (headerRowsHeight + this.TABLE_MARGIN_BOTTOM);
    } else {
      state.availableSpace -= this.TABLE_MARGIN_BOTTOM;
    }

    while (rowIndex < dataRows.length) {
      const row = dataRows[rowIndex];
      const rowHeight = this.calculateRowHeight(row, dataRows, groupsProcessed);
      const hasDataRows = currentTable.querySelectorAll('tr:not(.table-header)').length > 0;

      if (rowHeight > 0 && rowHeight > state.availableSpace && hasDataRows) {
        this.addFooterToPage(state.currentPage, state.footerElement);
        const newPage = this.createNewPage(state.headerElement, [], false, state.bodyPadding);
        const newWrapper = newPage.querySelector('.content-body') as HTMLElement || newPage;
        const newSpace = this.A4_HEIGHT - (state.headerHeight + state.footerHeight + state.margin);
        onNewPage(newPage, newWrapper, newSpace);
        state.currentPage = newPage;
        state.currentPageWrapper = newWrapper;
        state.availableSpace = newSpace;

        currentTable = this.createTable();
        if (!areRemainingRowsAllBottomElements(rowIndex)) {
          tableHeaders.forEach(h => currentTable.appendChild(h.cloneNode(true)));
          state.availableSpace -= (headerRowsHeight + this.TABLE_MARGIN_BOTTOM);
        } else {
          state.availableSpace -= this.TABLE_MARGIN_BOTTOM;
        }
        state.currentPageWrapper.appendChild(currentTable);
      }

      currentTable.appendChild(row.cloneNode(true));
      state.availableSpace -= rowHeight;
      rowIndex++;
    }
  }

  private createTable(): HTMLTableElement {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.marginBottom = `${this.TABLE_MARGIN_BOTTOM}px`;
    return table;
  }

  private calculateRowHeight(row: HTMLElement, allRows: HTMLElement[], processedGroups: Set<string>): number {
    const group = row.dataset['group'];

    if (!group) {
      return this.getElementHeight(row);
    }

    if (processedGroups.has(group)) {
      return 0;
    }

    const groupHeight = allRows
      .filter(r => r.dataset['group'] === group)
      .reduce((total, r) => total + this.getElementHeight(r), 0);

    processedGroups.add(group);

    return groupHeight;
  }

  private getElementHeight(element: HTMLElement): number {
    const style = getComputedStyle(element);
    const marginTop = parseFloat(style.marginTop) || 0;
    const marginBottom = parseFloat(style.marginBottom) || 0;
    const rectHeight = element.getBoundingClientRect().height;
    return rectHeight + marginTop + marginBottom;
  }

  private createNewPage(
    headerElement: HTMLElement,
    upperElements: Element[],
    isFirstPage: boolean,
    padding: string = '60px'
  ): HTMLElement {
    const pageWrapper = document.createElement('div');
    pageWrapper.className = `page ${isFirstPage ? 'first-page' : 'continuation-page'}`;
    pageWrapper.style.width = '1725px';
    pageWrapper.style.position = 'relative';
    pageWrapper.style.minHeight = '2518px';
    pageWrapper.style.display = 'flex';
    pageWrapper.style.flexDirection = 'column';
    pageWrapper.style.backgroundColor = 'white';

    const clonedPageHeader = headerElement.cloneNode(true) as HTMLElement;
    pageWrapper.appendChild(clonedPageHeader);

    const contentBody = document.createElement('div');
    contentBody.className = 'content-body';
    contentBody.style.flex = '1';
    contentBody.style.padding = padding;
    contentBody.style.boxSizing = 'border-box';
    pageWrapper.appendChild(contentBody);

    if (isFirstPage) {
      upperElements.forEach(element => {
        contentBody.appendChild(element.cloneNode(true));
      });
    }

    return pageWrapper;
  }

  private addFooterToPage(pageWrapper: HTMLElement, footerElement: HTMLElement): void {
    const clonedFooter = footerElement.cloneNode(true) as HTMLElement;

    clonedFooter.style.position = 'absolute';
    clonedFooter.style.bottom = '0';
    clonedFooter.style.left = '0';
    clonedFooter.style.width = '100%';
    clonedFooter.style.margin = '0';

    pageWrapper.appendChild(clonedFooter);
  }
}
