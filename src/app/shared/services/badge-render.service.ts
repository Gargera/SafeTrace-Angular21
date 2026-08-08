import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

export interface BadgeConfig<T> {
  /** Base utility classes that are always applied */
  baseClasses: string[];
  /** Returns background and text classes for the given value */
  getClasses: (value: T) => { bg: string; text: string };
  /** Returns the inner HTML (or plain text) for the given value */
  getContent: (value: T) => string;
  /** When true use `innerText` instead of `innerHTML` */
  useTextOnly?: boolean;
}

/**
 * Central service that handles badge rendering for the various badge directives.
 * It encapsulates the shared DOM manipulation logic (class handling, content
 * injection) so individual directives stay thin wrappers around the specific
 * configuration they need.
 */
@Injectable({ providedIn: 'root' })
export class BadgeRenderService {
  private renderer: Renderer2;

  constructor(rendererFactory: RendererFactory2) {
    // Create a renderer that works in the current platform (browser).
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  /**
   * Apply badge styling and content to the provided element.
   * The method first removes any previously applied background or text classes
   * (matching the `bg-` and `text-` prefixes) and then adds the new classes
   * defined by the configuration.
   */
  updateBadge<T>(el: HTMLElement, value: T, config: BadgeConfig<T>): void {
    // Remove any previous bg- or text- utility classes.
    const cleanedClassName = el.className.replace(/\bbg-\S+|text-\S+/g, '').trim();
    el.className = cleanedClassName;

    // Apply the static base classes.
    config.baseClasses.forEach(cls => this.renderer.addClass(el, cls));

    // Apply dynamic background and text classes.
    const { bg, text } = config.getClasses(value);
    bg.split(' ').filter(Boolean).forEach(c => this.renderer.addClass(el, c));
    text.split(' ').filter(Boolean).forEach(c => this.renderer.addClass(el, c));

    // Insert the content.
    const content = config.getContent(value);
    if (config.useTextOnly) {
      this.renderer.setProperty(el, 'innerText', content);
    } else {
      this.renderer.setProperty(el, 'innerHTML', content);
    }
  }
}
