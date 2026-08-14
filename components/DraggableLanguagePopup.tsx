'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { Globe, X, GripVertical } from 'lucide-react';
import { motion, useDragControls } from 'framer-motion';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिंदी' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳', nativeName: 'मराठी' }
];

export default function DraggableLanguagePopup() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = params.locale as string || 'en';
  const [showPopup, setShowPopup] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragControls = useDragControls();
  const previousPathname = useRef(pathname);

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  // Show popup when route changes
  useEffect(() => {
    if (previousPathname.current !== pathname && previousPathname.current !== null) {
      setShowPopup(true);
      const timer = setTimeout(() => {
        setShowPopup(false);
      }, 5000); // Auto hide after 5 seconds

      return () => clearTimeout(timer);
    }
    previousPathname.current = pathname;
  }, [pathname]);

  const changeLanguage = (newLocale: string) => {
    const newPathname = pathname.replace(/^\/(en|hi|mr)/, `/${newLocale}`);
    router.push(newPathname);
    setShowPopup(false);
  };

  if (!showPopup) {
    return (
      <button
        onClick={() => setShowPopup(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-blue-500/50 hover:scale-110 transition-all flex items-center justify-center group"
        aria-label="Change language"
        title="Change Language"
      >
        <Globe className="w-5 h-5 group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={{
        top: -window.innerHeight / 2 + 100,
        left: -window.innerWidth / 2 + 100,
        right: window.innerWidth / 2 - 100,
        bottom: window.innerHeight / 2 - 100,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed bottom-6 right-6 z-50"
      style={{ x: position.x, y: position.y }}
    >
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl border border-blue-500/30 overflow-hidden backdrop-blur-xl w-56">
        {/* Drag Handle */}
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="w-3 h-3 text-white/70" />
            <Globe className="w-4 h-4 text-white" />
            <span className="text-xs font-semibold text-white">Language</span>
          </div>
          <button
            onClick={() => setShowPopup(false)}
            className="p-0.5 hover:bg-white/20 rounded transition-colors"
            aria-label="Close language selector"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        {/* Language Options */}
        <div className="p-2 space-y-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all ${
                locale === lang.code
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md scale-105'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-200'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <div className="flex flex-col items-start flex-1">
                <span className="font-medium text-xs">{lang.name}</span>
              </div>
              {locale === lang.code && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-white text-sm"
                >
                  ✓
                </motion.span>
              )}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
