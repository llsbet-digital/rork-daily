import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StreakData,
  loadStreak,
  saveStreak,
  checkOnOpen,
  recordRead,
} from '@/lib/streak';

export interface UseStreakResult {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;
  graceActive: boolean;
  readDays: string[];
  /** Call when the user reads an article. Returns updated data for backend sync. */
  onArticleRead: () => Promise<StreakData>;
  /** Dismiss the grace banner without reading an article. */
  dismissGrace: () => void;
}

export function useStreak(): UseStreakResult {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    readDays: [],
  });
  const [graceActive, setGraceActive] = useState(false);

  // Stable refs so onArticleRead doesn't need to list them as deps
  const streakDataRef = useRef(streakData);
  streakDataRef.current = streakData;
  const graceActiveRef = useRef(graceActive);
  graceActiveRef.current = graceActive;

  useEffect(() => {
    loadStreak().then(data => {
      const { data: checked, graceActive: grace } = checkOnOpen(data);
      setStreakData(checked);
      setGraceActive(grace);
      // Persist reset if streak was cleared due to missed days
      if (checked.currentStreak !== data.currentStreak) {
        saveStreak(checked);
      }
    });
  }, []);

  const onArticleRead = useCallback(async (): Promise<StreakData> => {
    const updated = recordRead(streakDataRef.current, graceActiveRef.current);
    setStreakData(updated);
    setGraceActive(false);
    await saveStreak(updated);
    return updated;
  }, []);

  const dismissGrace = useCallback(() => {
    setGraceActive(false);
  }, []);

  return {
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    lastReadDate: streakData.lastReadDate,
    graceActive,
    readDays: streakData.readDays,
    onArticleRead,
    dismissGrace,
  };
}
