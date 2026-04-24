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

      const upperElements = Array.from(snippet.querySelectorAll('.upperElement'));
      const upperElementsTotalHeight = upperElements.reduce((totalHeight, element) => {
        const upperElement = element as HTMLElement;
        return totalHeight + this.getElementHeight(upperElement);
      }, 0);

      const tables = Array.from(snippet.querySelectorAll('table'));

      // Track created pages
      const pages: HTMLElement[] = [];

      let currentPageWrapper = this.createNewPage(headerElement as HTMLElement, upperElements, true);
      pages.push(currentPageWrapper);

      let availableSpace = this.A4_HEIGHT - (headerHeight + footerHeight + upperElementsTotalHeight + margin);

      tables.forEach((originalTable: HTMLTableElement) => {
        const tableHeaders = Array.from(originalTable.querySelectorAll('.table-header')) as HTMLElement[];

        if (tableHeaders.length === 0) {
          return;
        }

        const headerRowsHeight = tableHeaders.reduce((total, header) => total + this.getElementHeight(header), 0);
        const dataRows = Array.from(originalTable.querySelectorAll('tr:not(.table-header)')) as HTMLElement[];
        const groupsProcessed: Set<string> = new Set();

        if (dataRows.length === 0) {
          return;
        }

        const areRemainingRowsAllBottomElements = (currentIndex: number): boolean => {
          const remainingRows = dataRows.slice(currentIndex);
          return remainingRows.length > 0 && remainingRows.every((row: HTMLElement) =>
            row.classList.contains('bottom-element') || row.querySelector('.bottom-element') !== null
          );
        };

        let firstRowHeight = 0;
        if (dataRows[0]) {
          firstRowHeight = this.calculateRowHeight(dataRows[0], dataRows, new Set<string>());
        }

        if (availableSpace >= (headerRowsHeight + firstRowHeight + this.TABLE_MARGIN_BOTTOM)) {
          let currentTable = this.createTable();
          currentPageWrapper.appendChild(currentTable);

          if (!areRemainingRowsAllBottomElements(0)) {
            tableHeaders.forEach(header => {
              currentTable.appendChild(header.cloneNode(true));
            });
            availableSpace -= (headerRowsHeight + this.TABLE_MARGIN_BOTTOM);
          } else {
            availableSpace -= this.TABLE_MARGIN_BOTTOM;
          }

          let rowIndex = 0;
          while (rowIndex < dataRows.length) {
            const row = dataRows[rowIndex];
            const rowHeight = this.calculateRowHeight(row, dataRows, groupsProcessed);

            if (rowHeight > availableSpace) {
              this.addFooterToPage(currentPageWrapper, footerElement as HTMLElement);
              currentPageWrapper = this.createNewPage(headerElement as HTMLElement, [], false);
              pages.push(currentPageWrapper);

              currentTable = this.createTable();

              if (!areRemainingRowsAllBottomElements(rowIndex)) {
                tableHeaders.forEach(header => {
                  currentTable.appendChild(header.cloneNode(true));
                });
                availableSpace = this.A4_HEIGHT - (headerHeight + footerHeight + headerRowsHeight + margin + this.TABLE_MARGIN_BOTTOM);
              } else {
                availableSpace = this.A4_HEIGHT - (headerHeight + footerHeight + margin + this.TABLE_MARGIN_BOTTOM);
              }

              currentPageWrapper.appendChild(currentTable);
            }

            currentTable.appendChild(row.cloneNode(true));
            availableSpace -= rowHeight;
            rowIndex++;
          }
        } else {
          this.addFooterToPage(currentPageWrapper, footerElement as HTMLElement);
          currentPageWrapper = this.createNewPage(headerElement as HTMLElement, [], false);
          pages.push(currentPageWrapper);

          let currentTable = this.createTable();

          if (!areRemainingRowsAllBottomElements(0)) {
            tableHeaders.forEach(header => {
              currentTable.appendChild(header.cloneNode(true));
            });
            availableSpace = this.A4_HEIGHT - (headerHeight + footerHeight + headerRowsHeight + margin + this.TABLE_MARGIN_BOTTOM);
          } else {
            availableSpace = this.A4_HEIGHT - (headerHeight + footerHeight + margin + this.TABLE_MARGIN_BOTTOM);
          }

          currentPageWrapper.appendChild(currentTable);

          let rowIndex = 0;
          dataRows.forEach((row) => {
            const rowHeight = this.calculateRowHeight(row, dataRows, groupsProcessed);

            if (rowHeight > availableSpace) {
              this.addFooterToPage(currentPageWrapper, footerElement as HTMLElement);
              currentPageWrapper = this.createNewPage(headerElement as HTMLElement, [], false);
              pages.push(currentPageWrapper);

              currentTable = this.createTable();

              if (!areRemainingRowsAllBottomElements(rowIndex)) {
                tableHeaders.forEach(header => {
                  currentTable.appendChild(header.cloneNode(true));
                });
                availableSpace = this.A4_HEIGHT - (headerHeight + footerHeight + headerRowsHeight + margin + this.TABLE_MARGIN_BOTTOM);
              } else {
                availableSpace = this.A4_HEIGHT - (headerHeight + footerHeight + margin + this.TABLE_MARGIN_BOTTOM);
              }

              currentPageWrapper.appendChild(currentTable);
            }

            currentTable.appendChild(row.cloneNode(true));
            availableSpace -= rowHeight;
            rowIndex++;
          });
        }
      });

      this.addFooterToPage(currentPageWrapper, footerElement as HTMLElement);

      // Clear original content
      (snippet as HTMLElement).innerHTML = '';

      // Append the new pages
      pages.forEach(page => snippet.appendChild(page));
    });
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
    isFirstPage: boolean
  ): HTMLElement {
    const pageWrapper = document.createElement('div');
    pageWrapper.className = `page ${isFirstPage ? 'first-page' : 'continuation-page'}`;
    pageWrapper.style.width = '100%';
    pageWrapper.style.position = 'relative';
    pageWrapper.style.minHeight = '2518px';

    const clonedPageHeader = headerElement.cloneNode(true) as HTMLElement;
    pageWrapper.appendChild(clonedPageHeader);

    if (isFirstPage) {
      upperElements.forEach(element => {
        pageWrapper.appendChild(element.cloneNode(true));
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
