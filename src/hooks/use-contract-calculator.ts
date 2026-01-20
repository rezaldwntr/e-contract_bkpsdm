'use client';

import { useState, useEffect, useMemo } from 'react';
import { add, sub } from 'date-fns';
import type { ContractType } from '@/lib/types';

export function useContractCalculator(startDate: Date | null, contractType: ContractType) {
  const [endDate, setEndDate] = useState<Date | null>(null);

  const calculatedEndDate = useMemo(() => {
    if (!startDate) return null;

    let duration: Duration;
    if (contractType === 'PARUH_WAKTU') {
      duration = { years: 1 };
    } else {
      duration = { years: 5 };
    }

    const futureDate = add(startDate, duration);
    return sub(futureDate, { days: 1 });
  }, [startDate, contractType]);

  useEffect(() => {
    setEndDate(calculatedEndDate);
  }, [calculatedEndDate]);

  return { endDate };
}
