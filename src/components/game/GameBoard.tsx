'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useGameStore } from '@/lib/store/game-store';
import { SVGRenderer } from '@/lib/engine/svg-renderer';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Marker {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  type: 'correct' | 'wrong';
  score?: number;
}

export default function GameBoard() {
  const router = useRouter();
  const { gameState, handleClick, useHint, pauseGame, resumeGame, updateElapsedTime, settings } = useGameStore();
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [hintPos, setHintPos] = useState<{ x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const scene = gameState?.scene;

  // Memoize SVG strings
  const originalSvg = useMemo(() => {
    if (!scene) return '';
    return SVGRenderer.renderToString(scene.elements, scene.width, scene.height);
  }, [scene]);

  const modifiedSvg = useMemo(() => {
    if (!scene) return '';
    return SVGRenderer.renderModifiedScene(scene.elements, scene.differences, scene.width, scene.height);
  }, [scene]);

  // Timer
  useEffect(() => {
    if (!gameState || gameState.isComplete || gameState.isPaused) return;
    const startMs = Date.now() - gameState.elapsedTime * 1000;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      updateElapsedTime(elapsed);
      if (scene?.timeLimit && elapsed >= scene.timeLimit) {
        clearInterval(timerRef.current);
        useGameStore.getState().completeGame();
      }
    }, 250);
    return () => clearInterval(timerRef.current);
  }, [gameState?.isPaused, gameState?.isComplete]);

  // FIXED: Proper SVG coordinate mapping
  const onSvgClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scene || gameState?.isComplete || gameState?.isPaused) return;

    const rect = e.currentTarget.getBoundingClientRect();
    // Since SVG uses preserveAspectRatio="none" and fills 100% of container,
    // simple proportion mapping works perfectly
    const svgX = ((e.clientX - rect.left) / rect.width) * scene.width;
    const svgY = ((e.clientY - rect.top) / rect.height) * scene.height;

    const result = handleClick(svgX, svgY, 'left');

    // Show marker at click position (as percentage)
    const pctX = ((e.clientX - rect.left) / rect.width) * 100;
    const pctY = ((e.clientY - rect.top) / rect.height) * 100;
    const marker: Marker = {
      id: `${Date.now()}_${Math.random()}`,
      x: pctX,
      y: pctY,
      type: result.hit ? 'correct' : 'wrong',
      score: result.score,
    };
    setMarkers(prev => [...prev, marker]);
    setTimeout(() => setMarkers(prev => prev.filter(m => m.id !== marker.id)), 1500);
  }, [scene, gameState, handleClick]);

  const onHint = useCallback(() => {
    const hint = useHint();
    if (hint && scene) {
      setHintPos({ x: (hint.x / scene.width) * 100, y: (hint.y / scene.height) * 100 });
      setTimeout(() => setHintPos(null), 3000);
    }
  }, [useHint, scene]);

  if (!scene || !gameState) return null;

  const timeStr = formatTime(gameState.elapsedTime);
  const timeLimit = scene.timeLimit;
  const timeWarning = timeLimit ? gameState.elapsedTime > timeLimit - 10 : false;
  const progress = gameState.foundDifferences.length / scene.differenceCount;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/')} className="p-1.5 rounded-lg hover:bg-gray-700 transition text-sm">
            ←
          </button>
          <button onClick={() => gameState.isPaused ? resumeGame() : pauseGame()} className="p-1.5 rounded-lg hover:bg-gray-700 transition">
            {gameState.isPaused ? '▶' : '⏸'}
          </button>
          {settings.showTimer && (
            <span className={`font-mono text-base font-bold ${timeWarning ? 'text-red-400 animate-pulse' : 'text-gray-300'}`}>
              {timeStr}{timeLimit ? ` / ${formatTime(timeLimit)}` : ''}
            </span>
          )}
        </div>

        {/* Center: progress */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: scene.differenceCount }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i < gameState.foundDifferences.length ? 'bg-green-400 scale-110' : 'bg-gray-600'
              }`} />
            ))}
          </div>
          <span className="text-sm font-bold text-gray-400">
            {gameState.foundDifferences.length}/{scene.differenceCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {gameState.combo > 1 && (
            <motion.span
              key={gameState.combo}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-orange-400 font-black text-sm"
            >
              x{gameState.combo}
            </motion.span>
          )}
          <span className="text-sm font-bold text-amber-400">{gameState.score.toLocaleString()}</span>
          <button
            onClick={onHint}
            disabled={gameState.remainingHints <= 0}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-sm disabled:opacity-20 hover:bg-amber-500/30 transition"
          >
            💡{gameState.remainingHints}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800">
        <motion.div
          className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 200 }}
        />
      </div>

      {/* Game area - side by side */}
      <div className="flex-1 flex flex-col md:flex-row gap-1 p-1 overflow-hidden min-h-0">
        {/* Original */}
        <ImagePanel
          label="원본"
          svgHtml={originalSvg}
          onClick={onSvgClick}
          markers={markers}
          hintPos={hintPos}
          foundDiffs={gameState.foundDifferences}
          differences={scene.differences}
          sceneW={scene.width}
          sceneH={scene.height}
          borderColor="border-blue-500"
        />

        {/* Modified */}
        <ImagePanel
          label="변형"
          svgHtml={modifiedSvg}
          onClick={onSvgClick}
          markers={markers}
          hintPos={hintPos}
          foundDiffs={gameState.foundDifferences}
          differences={scene.differences}
          sceneW={scene.width}
          sceneH={scene.height}
          borderColor="border-rose-500"
        />
      </div>

      {/* Pause overlay */}
      <AnimatePresence>
        {gameState.isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-gray-800 rounded-3xl p-10 text-center shadow-2xl border border-gray-700"
            >
              <div className="text-5xl mb-4">⏸</div>
              <h2 className="text-2xl font-bold mb-6">일시정지</h2>
              <button onClick={resumeGame} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-500 transition">
                계속하기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ImagePanel({
  label, svgHtml, onClick, markers, hintPos, foundDiffs, differences, sceneW, sceneH, borderColor,
}: {
  label: string;
  svgHtml: string;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  markers: Marker[];
  hintPos: { x: number; y: number } | null;
  foundDiffs: string[];
  differences: { id: string; hitArea: { x: number; y: number; width: number; height: number } }[];
  sceneW: number;
  sceneH: number;
  borderColor: string;
}) {
  return (
    <div
      className={`flex-1 relative rounded-xl overflow-hidden border-2 ${borderColor} cursor-crosshair bg-gray-800 min-h-0`}
      onClick={onClick}
    >
      {/* SVG fills this container */}
      <div
        className="absolute inset-0"
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />

      {/* Label */}
      <div className="absolute top-2 left-2 z-10 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full font-bold backdrop-blur-sm">
        {label}
      </div>

      {/* Found difference markers */}
      {differences
        .filter(d => foundDiffs.includes(d.id))
        .map(d => {
          const cx = ((d.hitArea.x + d.hitArea.width / 2) / sceneW) * 100;
          const cy = ((d.hitArea.y + d.hitArea.height / 2) / sceneH) * 100;
          return (
            <motion.div
              key={d.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute w-10 h-10 rounded-full border-3 border-green-400 bg-green-400/15 pointer-events-none z-10"
              style={{ left: `${cx}%`, top: `${cy}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-40" />
            </motion.div>
          );
        })}

      {/* Click markers */}
      <AnimatePresence>
        {markers.map(m => (
          <motion.div
            key={m.id}
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 1.8, opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute pointer-events-none z-20"
            style={{ left: `${m.x}%`, top: `${m.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            {m.type === 'correct' ? (
              <div className="text-center">
                <div className="w-10 h-10 rounded-full border-3 border-green-400 bg-green-400/30 flex items-center justify-center">
                  <span className="text-green-300 font-black text-xs">✓</span>
                </div>
                <span className="text-green-400 font-black text-sm mt-1 block">+{m.score}</span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-500/40 border-2 border-red-400 flex items-center justify-center">
                <span className="text-red-300 text-sm font-bold">✕</span>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Hint */}
      {hintPos && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.9, 0.4, 0.9] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="absolute w-16 h-16 rounded-full border-4 border-amber-400 bg-amber-400/10 pointer-events-none z-20"
          style={{ left: `${hintPos.x}%`, top: `${hintPos.y}%`, transform: 'translate(-50%, -50%)' }}
        />
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
