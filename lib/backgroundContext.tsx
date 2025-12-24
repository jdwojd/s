'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface BackgroundContextType {
  backgroundUrl: string;
  isLoaded: boolean;
  setLoaded: () => void;
  refreshBackground: () => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

const BG_CACHE_KEY = 'app_background_cache';
const BG_EXPIRE_TIME = 24 * 60 * 60 * 1000; // 24小时过期

interface BackgroundCache {
  url: string;
  timestamp: number;
}

// 获取缓存的背景图片
function getCachedBackground(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(BG_CACHE_KEY);
    if (!cached) return null;

    const data: BackgroundCache = JSON.parse(cached);
    const now = Date.now();

    // 检查是否过期
    if (now - data.timestamp > BG_EXPIRE_TIME) {
      localStorage.removeItem(BG_CACHE_KEY);
      return null;
    }

    return data.url;
  } catch {
    return null;
  }
}

// 保存背景图片到缓存
function setCachedBackground(url: string): void {
  if (typeof window === 'undefined') return;

  try {
    const data: BackgroundCache = {
      url,
      timestamp: Date.now()
    };
    localStorage.setItem(BG_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to cache background:', error);
  }
}

// 获取新的随机背景图片
function fetchNewBackground(): string {
  // 使用时间戳作为查询参数，确保获取新图片
  return `https://loliapi.com/acg/?${Date.now()}`;
}

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 首次加载时获取背景图片
    const cached = getCachedBackground();

    if (cached) {
      // 使用缓存的图片
      setBackgroundUrl(cached);
    } else {
      // 获取新图片
      const newUrl = fetchNewBackground();
      setBackgroundUrl(newUrl);
      setCachedBackground(newUrl);
    }
  }, []);

  const setLoaded = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const refreshBackground = useCallback(() => {
    const newUrl = fetchNewBackground();
    setBackgroundUrl(newUrl);
    setCachedBackground(newUrl);
    setIsLoaded(false);
  }, []);

  return (
    <BackgroundContext.Provider value={{ backgroundUrl, isLoaded, setLoaded, refreshBackground }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
}
