'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX, ZoomIn, ZoomOut, Contrast, X } from 'lucide-react';
import { Button } from './ui/Button';

export default function AccessibilityFeatures() {
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const savedFontSize = localStorage.getItem('fontSize');
    const savedHighContrast = localStorage.getItem('highContrast');
    if (savedFontSize) setFontSize(parseInt(savedFontSize));
    if (savedHighContrast) setHighContrast(savedHighContrast === 'true');
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`;
    localStorage.setItem('fontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    localStorage.setItem('highContrast', highContrast.toString());
  }, [highContrast]);

  const increaseFontSize = () => {
    if (fontSize < 200) {
      setFontSize(fontSize + 10);
      speakText(`Font size increased to ${fontSize + 10} percent`);
    }
  };

  const decreaseFontSize = () => {
    if (fontSize > 80) {
      setFontSize(fontSize - 10);
      speakText(`Font size decreased to ${fontSize - 10} percent`);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window && screenReader) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 0.9;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleScreenReader = () => {
    const newState = !screenReader;
    setScreenReader(newState);
    if (newState) {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('Screen reader activated. You can now hear all interactions. Hover over any text or button to hear it read aloud.');
        utterance.lang = 'en-IN';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } else {
      window.speechSynthesis.cancel();
      speakText('Screen reader deactivated');
    }
  };

  // Add global listeners for screen reader
  useEffect(() => {
    if (!screenReader) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Get text content from various elements
      let textToSpeak = '';
      
      if (target.getAttribute('aria-label')) {
        textToSpeak = target.getAttribute('aria-label') || '';
      } else if (target.getAttribute('title')) {
        textToSpeak = target.getAttribute('title') || '';
      } else if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        textToSpeak = target.innerText || target.textContent || '';
      } else if (target.tagName === 'INPUT') {
        const input = target as HTMLInputElement;
        const label = document.querySelector(`label[for="${input.id}"]`);
        textToSpeak = label ? label.textContent || '' : input.placeholder || input.value || 'Input field';
      } else if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        textToSpeak = img.alt || 'Image';
      } else if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(target.tagName)) {
        textToSpeak = 'Heading: ' + (target.textContent || '');
      } else if (target.tagName === 'P' || target.tagName === 'SPAN' || target.tagName === 'DIV') {
        // Only read if it has direct text content and not too long
        const text = target.innerText || target.textContent || '';
        if (text.length > 0 && text.length < 200 && !target.querySelector('button, a, input')) {
          textToSpeak = text;
        }
      }

      if (textToSpeak && textToSpeak.trim().length > 0) {
        speakText(textToSpeak.trim());
      }
    };

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      let textToSpeak = '';
      
      if (target.getAttribute('aria-label')) {
        textToSpeak = target.getAttribute('aria-label') || '';
      } else if (target.tagName === 'INPUT') {
        const input = target as HTMLInputElement;
        const label = document.querySelector(`label[for="${input.id}"]`);
        textToSpeak = label ? label.textContent || '' : input.placeholder || 'Input field';
      } else if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        textToSpeak = target.innerText || target.textContent || '';
      }

      if (textToSpeak && textToSpeak.trim().length > 0) {
        speakText(textToSpeak.trim());
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        const text = target.innerText || target.textContent || target.getAttribute('aria-label') || '';
        if (text) {
          speakText('Clicked: ' + text);
        }
      }
    };

    // Add event listeners with longer debounce
    let timeoutId: NodeJS.Timeout;
    const debouncedMouseOver = (e: MouseEvent) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => handleMouseOver(e), 300);
    };

    document.addEventListener('mouseover', debouncedMouseOver);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('click', handleClick);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mouseover', debouncedMouseOver);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('click', handleClick);
    };
  }, [screenReader]);

  const toggleHighContrast = () => {
    setHighContrast(!highContrast);
    speakText(!highContrast ? 'High contrast mode enabled' : 'High contrast mode disabled');
  };

  return (
    <>
      {/* Accessibility Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-24 right-4 z-[9999] w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
        aria-label="Toggle accessibility options"
        title="Accessibility Options"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>

      {/* Accessibility Panel */}
      {isOpen && (
        <div className="fixed top-40 right-4 z-[9999] bg-white  p-6 rounded-lg shadow-2xl border-2 border-blue-500/30 w-80 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Accessibility</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              aria-label="Close accessibility panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Font Size Controls */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Font Size
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={decreaseFontSize}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white rounded border border-gray-300 dark:border-gray-600"
                aria-label="Decrease font size"
                disabled={fontSize <= 80}
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-base font-semibold min-w-[60px] text-center">{fontSize}%</span>
              <button
                onClick={increaseFontSize}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white rounded border border-gray-300 dark:border-gray-600"
                aria-label="Increase font size"
                disabled={fontSize >= 200}
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* High Contrast Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Display Mode
            </label>
            <button
              onClick={toggleHighContrast}
              className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                highContrast 
                  ? 'bg-blue-600 text-white ' 
                  : 'bg-gray-100  hover:bg-blue-300 dark:hover:bg-blue-300'
              }`}
              aria-label="Toggle high contrast mode"
              aria-pressed={highContrast}
            >
              <Contrast className="w-5 h-5" />
              <span className="text-sm font-medium">
                High Contrast {highContrast ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Screen Reader Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Audio Feedback
            </label>
            <button
              onClick={toggleScreenReader}
              className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                screenReader 
                  ? 'bg-green-600 text-white shadow-lg animate-pulse' 
                  : 'bg-gray-100  hover:bg-green-300 dark:hover:bg-green-300'
              }`}
              aria-label="Toggle screen reader"
              aria-pressed={screenReader}
            >
              {screenReader ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">
                Screen Reader {screenReader ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Use Tab key for keyboard navigation. Press Shift+? for shortcuts.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
