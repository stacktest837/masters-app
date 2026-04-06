'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RefreshButton() {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    setSpinning(true);
    router.refresh();
    setTimeout(() => setSpinning(false), 800);
  }

  return (
    <button
      onClick={handleRefresh}
      className="text-sm text-masters-green hover:text-masters-green-dark flex items-center gap-1 transition-colors"
    >
      <span className={spinning ? 'animate-spin inline-block' : 'inline-block'}>↻</span>
      Refresh
    </button>
  );
}
