import { useState, useEffect, useCallback } from 'react';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';
export type ViewportOverrideMode = 'auto' | ViewportMode;

export interface KeyboardShortcutHandlers {
  onTogglePlayPause?: () => void;
  onNextStep?: () => void;
  onPrevStep?: () => void;
  onReplay?: () => void;
  onCloseModals?: () => void;
  onOpenShortcutsModal?: () => void;
  enabled?: boolean;
}

export interface AccessibilityPreferencesOptions {
  initialReducedMotion?: boolean;
  initialHighContrastBorders?: boolean;
  initialViewportOverride?: ViewportOverrideMode;
  shortcuts?: KeyboardShortcutHandlers;
}

export interface AccessibilityPreferencesState {
  /** Whether reduced motion is active (either via OS media query or manual user toggle) */
  reducedMotion: boolean;
  /** Whether the OS itself prefers reduced motion */
  systemReducedMotion: boolean;
  /** Manually toggle or set reduced motion */
  setReducedMotion: (value: boolean) => void;
  toggleReducedMotion: () => void;
  /** High-contrast border mode for formal graph & split panes */
  highContrastBorders: boolean;
  setHighContrastBorders: (value: boolean) => void;
  toggleHighContrastBorders: () => void;
  /** Effective viewport mode ('desktop' | 'tablet' | 'mobile') */
  viewportMode: ViewportMode;
  /** Auto-detected viewport mode from window.innerWidth */
  detectedViewportMode: ViewportMode;
  /** Manual preview override ('auto' | 'desktop' | 'tablet' | 'mobile') */
  viewportOverride: ViewportOverrideMode;
  setViewportOverride: (mode: ViewportOverrideMode) => void;
  /** Convenience alias to set manual viewport mode or reset to 'auto' */
  setViewportMode: (mode: ViewportOverrideMode) => void;
  /** Current window width in pixels */
  windowWidth: number;
  /** Whether keyboard shortcuts modal is open */
  isShortcutsModalOpen: boolean;
  setIsShortcutsModalOpen: (open: boolean) => void;
  toggleShortcutsModal: () => void;
}

const STORAGE_KEY_REDUCED_MOTION = 'gam_a11y_reduced_motion';
const STORAGE_KEY_HIGH_CONTRAST = 'gam_a11y_high_contrast_borders';

/**
 * Safely detects OS `prefers-reduced-motion: reduce` via `window.matchMedia`.
 * Handles SSR, jsdom, or environments where `matchMedia` is undefined or mocked.
 */
export function detectSystemReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    return Boolean(mql && mql.matches);
  } catch {
    return false;
  }
}

/**
 * Computes viewport category from pixel width:
 * - Desktop: >= 1024px
 * - Tablet: 768px - 1023px
 * - Mobile: < 768px
 */
export function getViewportModeFromWidth(width: number): ViewportMode {
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}

function getSafeWindowWidth(): number {
  if (typeof window === 'undefined' || typeof window.innerWidth !== 'number') {
    return 1280;
  }
  return window.innerWidth || 1280;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  if (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  ) {
    return true;
  }
  return false;
}

export function useAccessibilityPreferences(
  options: AccessibilityPreferencesOptions = {}
): AccessibilityPreferencesState {
  const {
    initialReducedMotion,
    initialHighContrastBorders = false,
    initialViewportOverride = 'auto',
    shortcuts,
  } = options;

  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(() =>
    detectSystemReducedMotion()
  );

  const [userReducedMotion, setUserReducedMotion] = useState<boolean | null>(() => {
    if (typeof initialReducedMotion === 'boolean') {
      return initialReducedMotion;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_REDUCED_MOTION);
        if (saved === 'true') return true;
        if (saved === 'false') return false;
      } catch {
        // Ignore storage errors
      }
    }
    return null;
  });

  const [highContrastBorders, setHighContrastBordersState] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_HIGH_CONTRAST);
        if (saved === 'true') return true;
        if (saved === 'false') return false;
      } catch {
        // Ignore storage errors
      }
    }
    return initialHighContrastBorders;
  });

  const [windowWidth, setWindowWidth] = useState<number>(() => getSafeWindowWidth());
  const [viewportOverride, setViewportOverride] =
    useState<ViewportOverrideMode>(initialViewportOverride);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);

  // Listen for OS prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    let mql: MediaQueryList | null = null;
    try {
      mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    if (!mql) return;

    setSystemReducedMotion(Boolean(mql.matches));

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setSystemReducedMotion(Boolean(event.matches));
    };

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleChange);
      return () => mql?.removeEventListener('change', handleChange);
    } else if (typeof mql.addListener === 'function') {
      // Fallback for older Safari / mocked matchMedia in tests
      mql.addListener(handleChange);
      return () => mql?.removeListener(handleChange);
    }
  }, []);

  // Listen for window resize to auto-detect viewport mode
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(getSafeWindowWidth());
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const reducedMotion = userReducedMotion !== null ? userReducedMotion : systemReducedMotion;

  const setReducedMotion = useCallback((value: boolean) => {
    setUserReducedMotion(value);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_REDUCED_MOTION, String(value));
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  const toggleReducedMotion = useCallback(() => {
    setReducedMotion(!reducedMotion);
  }, [reducedMotion, setReducedMotion]);

  const setHighContrastBorders = useCallback((value: boolean) => {
    setHighContrastBordersState(value);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_HIGH_CONTRAST, String(value));
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  const toggleHighContrastBorders = useCallback(() => {
    setHighContrastBorders(!highContrastBorders);
  }, [highContrastBorders, setHighContrastBorders]);

  const toggleShortcutsModal = useCallback(() => {
    setIsShortcutsModalOpen((prev) => !prev);
  }, []);

  // Apply root data attributes for CSS / animations to inspect
  useEffect(() => {
    if (typeof document === 'undefined' || !document.documentElement) return;
    document.documentElement.setAttribute(
      'data-reduced-motion',
      reducedMotion ? 'true' : 'false'
    );
    document.documentElement.setAttribute(
      'data-high-contrast',
      highContrastBorders ? 'true' : 'false'
    );
  }, [reducedMotion, highContrastBorders]);

  // Global keyboard shortcut listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const enabled = shortcuts?.enabled ?? true;
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Always allow Escape to close modals even if focused inside an input
      if (event.key === 'Escape') {
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
        }
        if (shortcuts?.onCloseModals) {
          shortcuts.onCloseModals();
        }
        return;
      }

      // Do not intercept shortcuts when typing in an input, textarea, select, or contentEditable
      if (isEditableElement(event.target)) {
        return;
      }

      // Ignore if modifier keys (Ctrl, Meta, Alt) are held
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      switch (event.key) {
        case ' ':
        case 'Spacebar': {
          if (shortcuts?.onTogglePlayPause) {
            event.preventDefault();
            shortcuts.onTogglePlayPause();
          }
          break;
        }
        case 'ArrowRight': {
          if (shortcuts?.onNextStep) {
            event.preventDefault();
            shortcuts.onNextStep();
          }
          break;
        }
        case 'ArrowLeft': {
          if (shortcuts?.onPrevStep) {
            event.preventDefault();
            shortcuts.onPrevStep();
          }
          break;
        }
        case 'r':
        case 'R': {
          if (shortcuts?.onReplay) {
            event.preventDefault();
            shortcuts.onReplay();
          }
          break;
        }
        case '?': {
          event.preventDefault();
          if (shortcuts?.onOpenShortcutsModal) {
            shortcuts.onOpenShortcutsModal();
          } else {
            setIsShortcutsModalOpen((prev) => !prev);
          }
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, isShortcutsModalOpen]);

  const detectedViewportMode = getViewportModeFromWidth(windowWidth);
  const viewportMode: ViewportMode =
    viewportOverride === 'auto' ? detectedViewportMode : viewportOverride;

  return {
    reducedMotion,
    systemReducedMotion,
    setReducedMotion,
    toggleReducedMotion,
    highContrastBorders,
    setHighContrastBorders,
    toggleHighContrastBorders,
    viewportMode,
    detectedViewportMode,
    viewportOverride,
    setViewportOverride,
    setViewportMode: setViewportOverride,
    windowWidth,
    isShortcutsModalOpen,
    setIsShortcutsModalOpen,
    toggleShortcutsModal,
  };
}

export default useAccessibilityPreferences;
