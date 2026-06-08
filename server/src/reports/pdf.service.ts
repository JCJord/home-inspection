import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';

const BROWSER_LAUNCH_OPTIONS = {
  headless: true as const,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage', // prevents shared memory issues in containerized envs
    '--disable-gpu',           // disables GPU hardware acceleration to save RAM
    '--no-zygote',             // disables zygote process fork structure to save memory
    '--disable-extensions',    // disables browser extensions
  ],
};

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
  private readonly pdfSemaphore = new Semaphore(1);

  async onModuleDestroy() {
    // Cleanup hooks if needed
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

    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      this.logger.log('Launching browser instance');
      browser = await puppeteer.launch(BROWSER_LAUNCH_OPTIONS);
      
      // Close default blank page that is automatically opened on launch to save memory
      const pages = await browser.pages();
      if (pages.length > 0) {
        page = pages[0];
      } else {
        page = await browser.newPage();
      }

      await page.setViewport({ width: 1725, height: 1080 });
      await page.emulateMediaType('screen');
      
      // Disable caching on the page level to prevent memory caching leaks
      await page.setCacheEnabled(false);

      await page.setContent(html, { waitUntil: 'networkidle2', timeout: 300000 });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        timeout: 300000,
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
            color: #444;
            margin: 0;
            padding: 0;
            position: relative;
            left: 335px;
            top: 1060px;
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
      if (browser) {
        this.logger.log('Closing browser instance');
        await browser.close().catch(() => { });
      }
      this.pdfSemaphore.release();
    }
  }
}
