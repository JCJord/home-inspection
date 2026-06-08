export class PdfPaginationHelper {
  private readonly A4_HEIGHT = 2518;
  private readonly TABLE_MARGIN_BOTTOM = 32;

  constructor() { }

  preventContentCut(margin: number = 32): void {
    const sourceContent = document.querySelectorAll('.snippet');

    sourceContent.forEach((snippet) => {
      // Robust selection for header and footer
      const headerElement = snippet.querySelector('header') || snippet.querySelector('#page-header') || document.getElementById('page-header');
      const footerElement = snippet.querySelector('footer') || snippet.querySelector('#report-footer') || document.getElementById('report-footer');

      if (!headerElement || !footerElement) {
        console.error('Pagination Helper: Header or footer element not found for snippet.');
        return;
      }

      // Ensure header has minimum width for layout stability
      (headerElement as HTMLElement).style.minWidth = '1750px';

      const headerHeight = this.getElementHeight(headerElement as HTMLElement);
      const footerHeight = this.getElementHeight(footerElement as HTMLElement);

      // Identify upper elements (intro content)
      const upperElements = Array.from(snippet.querySelectorAll('.upperElement'));
      const upperElementsTotalHeight = upperElements.reduce((totalHeight, element) => {
        return totalHeight + this.getElementHeight(element as HTMLElement);
      }, 0);

      const tables = Array.from(snippet.querySelectorAll('table'));
      const pages: HTMLElement[] = [];

      // Create the first page with header and upper elements
      let currentPageWrapper = this.createNewPage(headerElement as HTMLElement, upperElements, true);
      pages.push(currentPageWrapper);

      let availableSpace = this.A4_HEIGHT - (headerHeight + footerHeight + upperElementsTotalHeight + margin);
    let placedOnPreviousPages = new Set<string>();
    let currentPageBaseIds = new Set<string>();

      tables.forEach((originalTable: HTMLTableElement) => {
        const tableHeaders = Array.from(originalTable.querySelectorAll('.table-header')) as HTMLElement[];
        const dataRows = Array.from(originalTable.querySelectorAll('tr:not(.table-header)')) as HTMLElement[];
        const groupsProcessed: Set<string> = new Set();

        if (dataRows.length === 0 && tableHeaders.length === 0) {
          return;
        }

        const headerRowsHeight = tableHeaders.reduce((total, header) => total + this.getElementHeight(header), 0);

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

        // If the table fits (at least header + first row) on the current page
        if (availableSpace >= (headerRowsHeight + firstRowHeight + this.TABLE_MARGIN_BOTTOM)) {
          let currentTable = this.createTable(originalTable);
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

            if (rowHeight > availableSpace && rowIndex < dataRows.length) {
              currentPageBaseIds.forEach(id => placedOnPreviousPages.add(id));
              currentPageBaseIds = new Set<string>();
              this.addFooterToPage(currentPageWrapper, footerElement as HTMLElement);
              currentPageWrapper = this.createNewPage(headerElement as HTMLElement, [], false);
              pages.push(currentPageWrapper);

              currentTable = this.createTable(originalTable);

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

            if (rowHeight > 0) {
                const clonedRow = row.cloneNode(true) as HTMLElement;
                const group = row.dataset['group'];
                if (group) {
                  const baseId = this.getBaseFindingId(group);
                  if (placedOnPreviousPages.has(baseId) && !currentPageBaseIds.has(baseId) && row.classList.contains('content-row')) {
                    this.injectContinuedBadge(clonedRow);
                  }
                  currentPageBaseIds.add(baseId);
                }
                currentTable.appendChild(clonedRow);
                availableSpace -= rowHeight;
            }
            rowIndex++;
          }
        } else {
          // Table doesn't fit at all, start on a new page
          currentPageBaseIds.forEach(id => placedOnPreviousPages.add(id));
          currentPageBaseIds = new Set<string>();
          this.addFooterToPage(currentPageWrapper, footerElement as HTMLElement);
          currentPageWrapper = this.createNewPage(headerElement as HTMLElement, [], false);
          pages.push(currentPageWrapper);

          let currentTable = this.createTable(originalTable);

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
              currentPageBaseIds.forEach(id => placedOnPreviousPages.add(id));
              currentPageBaseIds = new Set<string>();
              this.addFooterToPage(currentPageWrapper, footerElement as HTMLElement);
              currentPageWrapper = this.createNewPage(headerElement as HTMLElement, [], false);
              pages.push(currentPageWrapper);

              currentTable = this.createTable(originalTable);

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

            if (rowHeight > 0) {
                const clonedRow = row.cloneNode(true) as HTMLElement;
                const group = row.dataset['group'];
                if (group) {
                  const baseId = this.getBaseFindingId(group);
                  if (placedOnPreviousPages.has(baseId) && !currentPageBaseIds.has(baseId) && row.classList.contains('content-row')) {
                    this.injectContinuedBadge(clonedRow);
                  }
                  currentPageBaseIds.add(baseId);
                }
                currentTable.appendChild(clonedRow);
                availableSpace -= rowHeight;
            }
            rowIndex++;
          });
        }
      });

      // Add footer to the last page
      this.addFooterToPage(currentPageWrapper, footerElement as HTMLElement);

      // Dynamically adjust borders based on actual pagination layout
      this.adjustTableBorders(pages);

      // Clear original content and replace with pages
      (snippet as HTMLElement).innerHTML = '';
      pages.forEach(page => snippet.appendChild(page));
    });
  }

  private createTable(originalTable?: HTMLTableElement): HTMLTableElement {
    const table = originalTable ? originalTable.cloneNode(false) as HTMLTableElement : document.createElement('table');
    table.innerHTML = ''; // Ensure it's empty
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

    const groupRows = allRows.filter(r => r.dataset['group'] === group);
    const groupHeight = groupRows.reduce((total, r) => total + this.getElementHeight(r), 0);

    processedGroups.add(group);

    return groupHeight;
  }

  private getElementHeight(element: HTMLElement): number {
    const style = getComputedStyle(element);
    const marginTop = parseFloat(style.marginTop) || 0;
    const marginBottom = parseFloat(style.marginBottom) || 0;
    let rectHeight = element.getBoundingClientRect().height;

    // Safety buffer for table rows containing dynamic flex/grid items and text captions
    if (element.tagName.toLowerCase() === 'tr' && element.querySelector('.photo-wrapper-container')) {
      rectHeight += 24; // Extra padding buffer to account for dynamic captions and grid layout
    }

    return rectHeight + marginTop + marginBottom;
  }

  private getBaseFindingId(dataGroup: string): string {
    return dataGroup.replace(/_chunk_\d+$/, '');
  }

  private injectContinuedBadge(clonedRow: HTMLElement): void {
    const td = clonedRow.querySelector('td.info-column') || clonedRow.querySelector('td');
    if (!td) return;
    const flexContainer = td.firstElementChild as HTMLElement;
    if (!flexContainer) return;

    const badge = document.createElement('div');
    badge.style.cssText = 'display: flex; justify-content: center; align-items: center; padding-bottom: 6px;';
    badge.innerHTML = '<span style="font-size: 22px; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 0.05em; border: 2px solid #ccc; padding: 4px 12px; border-radius: 4px; line-height: 1.2;">Continued</span>';
    flexContainer.insertBefore(badge, flexContainer.firstChild);
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
    pageWrapper.style.backgroundColor = 'white';
    pageWrapper.style.boxSizing = 'border-box';

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

  private adjustTableBorders(pages: HTMLElement[]): void {
    pages.forEach(page => {
      const tables = Array.from(page.querySelectorAll('table'));
      tables.forEach(table => {
        const contentRows = Array.from(table.querySelectorAll('tr.content-row'))
          .filter(tr => tr.querySelector('td.info-column')) as HTMLElement[];
        
        contentRows.forEach((row, index) => {
          const td = row.querySelector('td.info-column') as HTMLElement;
          if (td) {
            td.style.borderLeft = '2px solid #111';
            td.style.borderRight = '2px solid #111';
            
            if (index === 0) {
              td.style.borderTop = '2px solid #111';
            } else {
              td.style.borderTop = 'none';
            }
            
            if (index === contentRows.length - 1) {
              td.style.borderBottom = '2px solid #111';
            } else {
              td.style.borderBottom = 'none';
            }
          }
        });
      });
    });
  }
}
