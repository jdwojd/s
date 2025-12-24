'use client';

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { NavigationMenu, MenuButton } from '@/components/NavigationMenu';
import { phoneCountries, PhoneCountry } from '@/lib/phoneCountries';
import { generatePhoneNumbers, downloadPhoneNumbers } from '@/lib/phoneGenerator';

const ICON_PATHS: Record<string, React.ReactElement> = {
  search: <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>,
  close: <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>,
  chevronRight: <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>,
  download: <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>,
  phone: <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>,
  refresh: <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>,
  copy: <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>,
  check: <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
};

const Icon = memo(({ name, className = "w-6 h-6" }: { name: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">{ICON_PATHS[name]}</svg>
));
Icon.displayName = 'Icon';

const haptic = (duration: number = 15) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(duration);
  }
};

const STORAGE_KEY = 'sjh_selected_country';
const COUNTRY_PAGE_SIZE = 50;
const PHONE_PAGE_SIZE = 100;

interface CountrySelectProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (country: PhoneCountry) => void;
  selectedCode: string;
}

const CountrySelect = memo(({ isOpen, onClose, onSelect, selectedCode }: CountrySelectProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(COUNTRY_PAGE_SIZE);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setVisibleCount(COUNTRY_PAGE_SIZE);
    }, 200);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [searchQuery]);

  const filteredCountries = useMemo(() => {
    if (!debouncedQuery) return phoneCountries;
    const query = debouncedQuery.toLowerCase();
    return phoneCountries.filter(
      c => c.name.toLowerCase().includes(query) ||
           c.dialCode.includes(query) ||
           c.code.toLowerCase().includes(query)
    );
  }, [debouncedQuery]);

  const visibleCountries = useMemo(() => {
    return filteredCountries.slice(0, visibleCount);
  }, [filteredCountries, visibleCount]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredCountries.length) {
          setVisibleCount(prev => Math.min(prev + COUNTRY_PAGE_SIZE, filteredCountries.length));
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [visibleCount, filteredCountries.length]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSearchQuery('');
      setVisibleCount(COUNTRY_PAGE_SIZE);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81]">
      <div className="sticky top-0 z-10 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-white tracking-tight drop-shadow-md">
              选择国家/地区
            </h2>
            <button
              onClick={() => { haptic(20); onClose(); }}
              className="bg-white/10 p-1.5 rounded-full text-white/60 hover:bg-white/20 active:scale-95 transition-all touch-manipulation"
            >
              <Icon name="close" className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="search" className="w-4 h-4 text-white/40" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索国家或区号..."
              className="w-full pl-9 pr-8 py-2.5 bg-black/30 border border-white/20 rounded-[14px] text-[16px] text-white placeholder-white/40 focus:ring-2 focus:ring-white/30 focus:bg-black/40 transition-colors caret-[#007AFF] outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => { haptic(20); setSearchQuery(''); }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center touch-manipulation active:scale-90 transition-transform"
              >
                <div className="bg-white/20 rounded-full p-0.5">
                  <Icon name="close" className="w-3 h-3 text-white" />
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="space-y-2 pb-4">
          {visibleCountries.map((country) => (
            <button
              key={country.code}
              onClick={() => { haptic(20); onSelect(country); onClose(); }}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-[16px] transition-all duration-200 active:scale-[0.98] touch-manipulation border ${
                selectedCode === country.code
                  ? 'bg-white/10 border-white/20 shadow-lg'
                  : 'bg-black/30 border-white/10 active:bg-white/10'
              }`}
            >
              <div className="flex-1 text-left">
                <div className="text-[16px] font-semibold text-white tracking-tight drop-shadow-md">
                  {country.name}
                </div>
                <div className="text-[13px] text-white/60 mt-0.5 drop-shadow-sm">
                  {country.dialCode}
                </div>
              </div>
              {selectedCode === country.code && (
                <Icon name="check" className="w-5 h-5 text-[#34C759] shrink-0" />
              )}
            </button>
          ))}

          {visibleCount < filteredCountries.length && (
            <div ref={sentinelRef} className="py-4 text-center">
              <div className="inline-block w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
          )}

          {filteredCountries.length === 0 && debouncedQuery && (
            <div className="text-center py-16 text-white/50 text-[15px]">
              未找到匹配的国家/地区
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
CountrySelect.displayName = 'CountrySelect';

export default function PhoneGeneratorPage() {
  const [selectedCountry, setSelectedCountry] = useState<PhoneCountry>(phoneCountries[0]);
  const [showCountrySelect, setShowCountrySelect] = useState(false);
  const [quantity, setQuantity] = useState('10');
  const [generatedNumbers, setGeneratedNumbers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [visiblePhones, setVisiblePhones] = useState(PHONE_PAGE_SIZE);
  const phoneObserverRef = useRef<IntersectionObserver | null>(null);
  const phoneSentinelRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const country = phoneCountries.find(c => c.code === parsed.code);
          if (country) setSelectedCountry(country);
        } catch (e) {
          console.error('Failed to load stored country:', e);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: selectedCountry.code }));
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (phoneObserverRef.current) phoneObserverRef.current.disconnect();

    phoneObserverRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visiblePhones < generatedNumbers.length) {
          setVisiblePhones(prev => Math.min(prev + PHONE_PAGE_SIZE, generatedNumbers.length));
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (phoneSentinelRef.current && generatedNumbers.length > 0) {
      phoneObserverRef.current.observe(phoneSentinelRef.current);
    }

    return () => {
      if (phoneObserverRef.current) phoneObserverRef.current.disconnect();
    };
  }, [visiblePhones, generatedNumbers.length]);

  const handleGenerate = useCallback(() => {
    haptic(30);
    const count = parseInt(quantity) || 10;
    if (count < 1 || count > 10000) {
      alert('请输入 1-10000 之间的数量');
      return;
    }

    setIsGenerating(true);
    setVisiblePhones(PHONE_PAGE_SIZE);

    setTimeout(() => {
      const numbers = generatePhoneNumbers(selectedCountry, count);
      setGeneratedNumbers(numbers);
      setIsGenerating(false);
    }, 100);
  }, [quantity, selectedCountry]);

  const handleDownload = useCallback(() => {
    haptic(30);
    if (generatedNumbers.length === 0) {
      alert('请先生成手机号');
      return;
    }
    const filename = `${selectedCountry.name}_手机号_${generatedNumbers.length}个.txt`;
    downloadPhoneNumbers(generatedNumbers, filename);
  }, [generatedNumbers, selectedCountry]);

  const handleCopy = useCallback(async (number: string, index: number) => {
    haptic(20);
    try {
      await navigator.clipboard.writeText(number);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      setCopiedIndex(index);
      copyTimerRef.current = setTimeout(() => setCopiedIndex(null), 1500);
    } catch (error) {
      console.error('Copy failed:', error);
      haptic(50);
    }
  }, []);

  const visiblePhoneNumbers = useMemo(() => {
    return generatedNumbers.slice(0, visiblePhones);
  }, [generatedNumbers, visiblePhones]);

  return (
    <div className="min-h-screen relative font-sans text-white pb-10 selection:bg-blue-400/30 overflow-x-hidden">
      <div className="relative z-10">
        <header className="fixed top-0 left-0 right-0 h-[52px] z-40 flex items-center justify-between px-4 pt-2 transition-all duration-300">
          <h1 className="text-[17px] font-semibold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            随机手机号生成器
          </h1>
          <MenuButton onClick={() => { haptic(20); setShowMenu(true); }} />
        </header>

        <main className="max-w-[420px] mx-auto px-5 pt-20 pb-10 space-y-6">
          <section className="bg-black/30 rounded-[20px] overflow-hidden border border-white/20 shadow-xl">
            <button
              onClick={() => { haptic(20); setShowCountrySelect(true); }}
              className="w-full flex items-center justify-between py-4 pl-5 pr-4 active:bg-white/15 transition-all duration-200 touch-manipulation active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="bg-[#007AFF]/20 p-2 rounded-[12px]">
                  <Icon name="phone" className="w-5 h-5 text-[#409CFF]" />
                </div>
                <div className="text-left">
                  <div className="text-[13px] text-white/60 drop-shadow-sm">选择国家/地区</div>
                  <div className="text-[16px] font-semibold text-white tracking-tight drop-shadow-md">
                    {selectedCountry.name} ({selectedCountry.dialCode})
                  </div>
                </div>
              </div>
              <Icon name="chevronRight" className="w-4 h-4 text-white/70 transition-transform duration-300 drop-shadow-md" />
            </button>

            <div className="ml-5 h-[0.5px] bg-white/20" />

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[13px] text-white/70 mb-2 tracking-tight drop-shadow-sm">
                  生成数量 (1-10000)
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  max="10000"
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-[14px] text-[16px] text-white placeholder-white/40 focus:ring-2 focus:ring-white/30 focus:bg-black/40 transition-colors caret-[#007AFF] outline-none"
                  placeholder="输入数量"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-4 rounded-[18px] shadow-[0_0_20px_rgba(0,122,255,0.4)] border border-white/20 flex items-center justify-center gap-2.5 touch-manipulation overflow-hidden relative transition-all duration-200 bg-gradient-to-b from-[#007AFF]/90 to-[#0055b3]/90 active:scale-[0.96] disabled:opacity-50 disabled:active:scale-100"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-[17px] font-semibold tracking-tight text-white drop-shadow-md">
                      生成中...
                    </span>
                  </>
                ) : (
                  <>
                    <Icon name="refresh" className="w-5 h-5 text-white/90 drop-shadow-sm" />
                    <span className="text-[17px] font-semibold tracking-tight text-white drop-shadow-md">
                      生成手机号
                    </span>
                  </>
                )}
              </button>
            </div>
          </section>

          {generatedNumbers.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <div className="text-[15px] font-semibold text-white/90 tracking-tight drop-shadow-md">
                  已生成 {generatedNumbers.length} 个号码
                </div>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-2 bg-black/30 border border-white/20 rounded-[12px] text-[14px] font-semibold text-[#34C759] active:bg-white/10 transition-all active:scale-95 touch-manipulation"
                >
                  <Icon name="download" className="w-4 h-4" />
                  下载全部
                </button>
              </div>

              <div className="bg-black/30 rounded-[20px] overflow-hidden border border-white/20 shadow-xl">
                <div className="divide-y divide-white/10">
                  {visiblePhoneNumbers.map((number, index) => {
                    const isCopied = copiedIndex === index;
                    return (
                      <button
                        key={index}
                        onClick={() => handleCopy(number, index)}
                        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 active:bg-white/10 transition-all touch-manipulation group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-[13px] text-white/40 font-mono shrink-0 drop-shadow-sm">
                            #{(index + 1).toString().padStart(4, '0')}
                          </span>
                          <span className="text-[16px] font-semibold text-white font-mono tracking-tight drop-shadow-md truncate">
                            {number}
                          </span>
                        </div>
                        <div className="shrink-0 relative w-5 h-5">
                          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                            isCopied ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
                          }`}>
                            <Icon name="copy" className="w-4 h-4 text-white/60 group-active:text-white/80" />
                          </div>
                          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                            isCopied ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                          }`}>
                            <Icon name="check" className="w-4 h-4 text-[#34C759]" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {visiblePhones < generatedNumbers.length && (
                  <div ref={phoneSentinelRef} className="py-4 text-center">
                    <div className="inline-block w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      <CountrySelect
        isOpen={showCountrySelect}
        onClose={() => setShowCountrySelect(false)}
        onSelect={setSelectedCountry}
        selectedCode={selectedCountry.code}
      />

      <NavigationMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
    </div>
  );
}
