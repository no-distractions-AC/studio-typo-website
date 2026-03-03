/**
 * ScrollFocusController - Shared utility for scroll-driven focus effects.
 * Manages RAF-throttled scroll listener and computes viewport-center
 * distance for each registered item.
 */

export class ScrollFocusController {
  /**
   * @param {Array<{element: HTMLElement, onUpdate: (focusProgress: number) => void}>} items
   */
  constructor(items = []) {
    this.items = items;
    this._rafId = null;
    this._attached = false;
    this._onScroll = this._handleScroll.bind(this);
  }

  attach() {
    if (this._attached) return;
    this._attached = true;
    window.addEventListener("scroll", this._onScroll, { passive: true });
    // Initial computation
    this._computeFocus();
  }

  detach() {
    if (!this._attached) return;
    this._attached = false;
    window.removeEventListener("scroll", this._onScroll);
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  addItem(item) {
    this.items.push(item);
  }

  _handleScroll() {
    if (this._rafId) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      this._computeFocus();
    });
  }

  _computeFocus() {
    const viewportCenter = window.innerHeight / 2;
    const deadzone = window.innerHeight * 0.6;

    // Plateau: items within ±15% of viewport center stay fully focused
    const plateau = window.innerHeight * 0.3;
    const adjustedDeadzone = deadzone - plateau;

    for (const item of this.items) {
      const rect = item.element.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const distance = Math.abs(elementCenter - viewportCenter);
      const adjustedDistance = Math.max(0, distance - plateau);
      const focusProgress =
        adjustedDeadzone > 0
          ? Math.max(0, 1 - adjustedDistance / adjustedDeadzone)
          : distance <= plateau
            ? 1
            : 0;
      item.onUpdate(focusProgress);
    }
  }

  dispose() {
    this.detach();
    this.items = [];
  }
}
