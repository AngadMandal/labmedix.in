import { useCallback, useRef } from 'react';

interface UseKeyboardFormNavigationOptions {
  containerRef?: React.RefObject<HTMLElement>;
  onLastFieldEnter?: () => void;
  selector?: string;
}

/**
 * Hook to enable keyboard-first Enter-key data entry across form inputs.
 * Pressing Enter moves focus to the next field in sequence without accidental form submission.
 */
export function useKeyboardFormNavigation(options: UseKeyboardFormNavigationOptions = {}) {
  const defaultSelector = 'input:not([type="hidden"]):not([disabled]):not([type="submit"]):not([readonly]), select:not([disabled]), textarea:not([disabled]), button[data-enter-action]';
  const selector = options.selector || defaultSelector;
  const formContainerRef = useRef<HTMLDivElement | HTMLFormElement | null>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key !== 'Enter') return;

      const target = e.target as HTMLElement;

      // Allow newline in textarea if shiftKey is pressed, or if target is a standard multiline textarea
      if (target.tagName.toLowerCase() === 'textarea' && e.shiftKey) {
        return;
      }

      // If user presses enter on a normal button (unless it's an enter-action button), let default button click happen
      if (target.tagName.toLowerCase() === 'button' && !target.hasAttribute('data-enter-action')) {
        return;
      }

      e.preventDefault();

      const container = (options.containerRef?.current || formContainerRef.current || document) as HTMLElement;
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      ).filter(el => {
        // Must be visible and interactable
        return el.offsetParent !== null && !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true';
      });

      const currentIndex = focusableElements.indexOf(target);

      if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
        const nextElement = focusableElements[currentIndex + 1];
        nextElement.focus();
        if (nextElement instanceof HTMLInputElement && (nextElement.type === 'text' || nextElement.type === 'number' || nextElement.type === 'tel' || nextElement.type === 'email')) {
          nextElement.select();
        }
      } else if (currentIndex === focusableElements.length - 1) {
        // Reached the final field in sequence
        if (options.onLastFieldEnter) {
          options.onLastFieldEnter();
        }
      }
    },
    [selector, options]
  );

  return {
    formContainerRef,
    handleKeyDown
  };
}
