'use client';

import { memo } from 'react';
import { useBackground } from '@/lib/backgroundContext';

export const SharedBackground = memo(() => {
  const { backgroundUrl, isLoaded, setLoaded } = useBackground();

  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81]">
      {backgroundUrl && (
        <img
          src={backgroundUrl}
          alt="background"
          className={`w-full h-full object-cover transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          onLoad={setLoaded}
        />
      )}
    </div>
  );
});

SharedBackground.displayName = 'SharedBackground';
