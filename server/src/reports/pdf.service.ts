import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';

const BROWSER_LAUNCH_OPTIONS = {
  headless: true as const,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--no-first-run',
  ],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
};

// Recycle the browser after this many PDF generations to prevent memory accumulation
export const BROWSER_RECYCLE_AFTER = 20;

export class Semaphore {
  private queue: Array<() => void> = [];
  private active = 0;

  constructor(private max: number) { }

  get pending(): number {
    return this.queue.length;
  }

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private sharedBrowser: Browser | null = null;
  private browserUseCount = 0;
  private readonly pdfSemaphore = new Semaphore(1);

  async onModuleDestroy() {
    if (this.sharedBrowser) {
      await this.sharedBrowser.close().catch(() => { });
    }
  }

  private async getOrCreateBrowser(): Promise<Browser> {
    if (this.sharedBrowser?.connected && this.browserUseCount < BROWSER_RECYCLE_AFTER) {
      this.browserUseCount++;
      return this.sharedBrowser;
    }

    if (this.sharedBrowser) {
      await this.sharedBrowser.close().catch(() => { });
      this.sharedBrowser = null;
      this.logger.log('Browser recycled after use limit');
    }

    this.browserUseCount = 1;
    this.sharedBrowser = await puppeteer.launch(BROWSER_LAUNCH_OPTIONS);
    this.logger.log('Browser launched');
    return this.sharedBrowser;
  }

  public async generateFromHtml(html: string): Promise<Buffer> {
    const htmlSizeKb = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
    this.logger.log(`generateFromHtml starting — HTML size: ${htmlSizeKb} KB`);

    const waiting = this.pdfSemaphore.pending;
    if (waiting > 0) {
      this.logger.log(`Queued — ${waiting} request(s) waiting`);
    }

    await this.pdfSemaphore.acquire();
    this.logger.log('Acquired — proceeding with PDF generation');

    let page: Page | null = null;

    try {
      const browser = await this.getOrCreateBrowser();
      page = await browser.newPage();

      await page.setViewport({ width: 1725, height: 1080 });
      await page.emulateMediaType('screen');
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 120000 });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        timeout: 120000,
        printBackground: true,
        margin: {
          top: '20px',
          bottom: '20px',
          left: '20px',
          right: '0px',
        },

        scale: 0.43,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="
            width: 100%;
            text-align: center;
            font-size: 9px;
            color: #626971;
            margin: 0;
            padding: 0;
            position: relative;
            left: 322px;
            top: 33px;
            line-height: 1;
            white-space: nowrap;
          ">
            Page
            <span class="pageNumber"></span>
            <span> of </span>
            <span class="totalPages"></span>
          </div>
        `,
        footerTemplate: '<span></span>',
      });

      const result = Buffer.from(pdfBuffer);
      const pdfSizeKb = Math.round(result.length / 1024);
      this.logger.log(`generateFromHtml done — PDF: ${pdfSizeKb} KB`);
      return result;
    } catch (error) {
      this.logger.error(`Error generating PDF: ${error.message}`, error.stack);
      throw error;
    } finally {
      if (page) {
        await page.close().catch(() => { });
      }
      this.pdfSemaphore.release();
    }
  }
}
