'use client';

import { useGameStore } from '@/lib/store/game-store';
import GameBoard from '@/components/game/GameBoard';
import GameResult from '@/components/game/GameResult';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GamePage() {
  const { gameState, lastGameResult, settings } = useGameStore();
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    if (!gameState) {
      router.push('/');
      return;
    }
    // Countdown
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 800);
      return () => clearTimeout(timer);
    } else {
      setGameStarted(true);
    }
  }, [countdown, gameState, router]);

  if (!gameState) return null;

  // Show result
  if (gameState.isComplete && lastGameResult) {
    return <GameResult />;
  }

  return (
    <div className={`h-screen flex flex-col ${settings.darkMode ? 'dark' : ''}`}>
      <div className="h-full bg-[var(--color-bg)] text-[var(--color-text)]">
        <AnimatePresence>
          {!gameStarted && countdown > 0 && (
            <motion.div
              key="countdown"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700"
            >
              <div className="text-center text-white">
                <div className="text-sm mb-2 opacity-80">{gameState.scene.metadata.title}</div>
                <motion.div
                  key={countdown}
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="text-8xl font-black"
                >
                  {countdown}
                </motion.div>
                <div className="mt-4 text-sm opacity-60">
                  🎯 {gameState.scene.differenceCount}개의 차이점을 찾으세요!
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {gameStarted && <GameBoard />}
      </div>
    </div>
  );
}
