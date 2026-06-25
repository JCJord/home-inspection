import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  generateTags(config: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    noindex?: boolean;
  }) {
    const isBrowser = isPlatformBrowser(this.platformId);
    
    // Safely resolve the origin
    let origin = 'https://www.inspectlyhq.com';
    if (isBrowser) {
      origin = window.location.origin;
    }

    const title = config.title || 'Inspectly - Home Inspection Management';
    const description = config.description || 'Inspectly is a modern home inspection management application built for solo inspectors.';
    const image = config.image || `${origin}/og-image.png`;
    const url = config.url || origin;

    // Set Title
    this.titleService.setTitle(title);

    // Standard Meta Tags
    this.metaService.updateTag({ name: 'description', content: description });

    if (config.noindex) {
      this.metaService.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      this.metaService.updateTag({ name: 'robots', content: 'index, follow' });
    }

    // Open Graph
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:image', content: image });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:site_name', content: 'Inspectly' });

    // Twitter Card
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: image });

    // Canonical link (Uses DOCUMENT token, completely safe in SSR/Node.js environment)
    this.updateCanonicalUrl(url);
  }

  private updateCanonicalUrl(url: string) {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (link) {
      link.setAttribute('href', url);
    } else {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      this.document.head.appendChild(link);
    }
  }

  injectSchema(schema: object, className: string = 'seo-schema') {
    // Remove existing script tags with this class name to prevent duplicates in SPA routing
    const existingScripts = this.document.querySelectorAll(`script.${className}`);
    existingScripts.forEach(el => el.remove());

    // Inject the script
    const script = this.document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.classList.add(className);
    script.text = JSON.stringify(schema);
    this.document.head.appendChild(script);
  }
}
