'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/lib/store/game-store';
import { SVGRenderer } from '@/lib/engine/svg-renderer';
import { motion, AnimatePresence } from 'framer-motion';

interface Marker {
  id: string;
  x: number;
  y: number;
  type: 'correct' | 'wrong';
  score?: number;
}

interface HintMarker {
  x: number;
  y: number;
}

export default function GameBoard() {
  const { gameState, handleClick, useHint, pauseGame, resumeGame, updateElapsedTime, settings } = useGameStore();
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [hintMarker, setHintMarker] = useState<HintMarker | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const scene = gameState?.scene;

  // Timer
  useEffect(() => {
    if (!gameState || gameState.isComplete || gameState.isPaused) return;
    const start = Date.now() - gameState.elapsedTime * 1000;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      updateElapsedTime(elapsed);

      if (scene?.timeLimit && elapsed >= scene.timeLimit) {
        clearInterval(timerRef.current);
        useGameStore.getState().completeGame();
      }
    }, 200);
    return () => clearInterval(timerRef.current);
  }, [gameState?.isPaused, gameState?.isComplete]);

  const onSvgClick = useCallback((e: React.MouseEvent<HTMLDivElement>, side: 'left' | 'right') => {
    if (!scene || gameState?.isComplete || gameState?.isPaused) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = scene.width / rect.width;
    const scaleY = scene.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const result = handleClick(x, y, side);
    const marker: Marker = {
      id: `${Date.now()}`,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      type: result.hit ? 'correct' : 'wrong',
      score: result.score,
    };
    setMarkers(prev => [...prev, marker]);
    setTimeout(() => setMarkers(prev => prev.filter(m => m.id !== marker.id)), 1200);
  }, [scene, gameState, handleClick]);

  const onHint = useCallback(() => {
    const hint = useHint();
    if (hint) {
      setHintMarker(hint);
      setTimeout(() => setHintMarker(null), 3000);
    }
  }, [useHint]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!settings.zoomEnabled) return;
    e.preventDefault();
    setZoom(prev => Math.max(1, Math.min(3, prev - e.deltaY * 0.002)));
  }, [settings.zoomEnabled]);

  if (!scene || !gameState) return null;

  const originalSvg = SVGRenderer.renderToString(scene.elements, scene.width, scene.height);
  const modifiedSvg = SVGRenderer.renderModifiedScene(scene.elements, scene.differences, scene.width, scene.height);

  const timeStr = formatTime(gameState.elapsedTime);
  const timeLimit = scene.timeLimit;
  const timeWarning = timeLimit ? gameState.elapsedTime > timeLimit - 10 : false;

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-surface)] shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => gameState.isPaused ? resumeGame() : pauseGame()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            {gameState.isPaused ? '▶️' : '⏸️'}
          </button>
          {settings.showTimer && (
            <span className={`font-mono text-lg font-bold ${timeWarning ? 'text-red-500 animate-pulse' : ''}`}>
              {timeStr}{timeLimit ? ` / ${formatTime(timeLimit)}` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span>🎯 {gameState.foundDifferences.length}/{scene.differenceCount}</span>
          <span>⭐ {gameState.score.toLocaleString()}</span>
          {gameState.combo > 1 && (
            <motion.span
              key={gameState.combo}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-orange-500 font-bold"
            >
              🔥 {gameState.combo}x
            </motion.span>
          )}
        </div>
        <button
          onClick={onHint}
          disabled={gameState.remainingHints <= 0}
          className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-medium text-sm disabled:opacity-30 hover:bg-amber-200 dark:hover:bg-amber-800 transition"
        >
          💡 {gameState.remainingHints}
        </button>
      </div>

      {/* Game area */}
      <div ref={containerRef} className="flex-1 flex flex-col md:flex-row gap-2 p-2 overflow-hidden" onWheel={handleWheel}>
        {/* Original */}
        <div className="flex-1 relative rounded-xl overflow-hidden border-2 border-[var(--color-primary)] shadow-lg cursor-crosshair"
          onClick={(e) => onSvgClick(e, 'left')}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
        >
          <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: originalSvg }} />
          <div className="absolute top-2 left-2 bg-black/40 text-white text-xs px-2 py-1 rounded-full">원본</div>
          <MarkerOverlay markers={markers} side="left" />
          {hintMarker && <HintCircle x={hintMarker.x} y={hintMarker.y} sceneW={scene.width} sceneH={scene.height} />}
          <FoundOverlay gameState={gameState} sceneW={scene.width} sceneH={scene.height} />
        </div>

        {/* Modified */}
        <div className="flex-1 relative rounded-xl overflow-hidden border-2 border-[var(--color-secondary)] shadow-lg cursor-crosshair"
          onClick={(e) => onSvgClick(e, 'right')}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
        >
          <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: modifiedSvg }} />
          <div className="absolute top-2 left-2 bg-black/40 text-white text-xs px-2 py-1 rounded-full">변형</div>
          <MarkerOverlay markers={markers} side="right" />
          {hintMarker && <HintCircle x={hintMarker.x} y={hintMarker.y} sceneW={scene.width} sceneH={scene.height} />}
          <FoundOverlay gameState={gameState} sceneW={scene.width} sceneH={scene.height} />
        </div>
      </div>

      {/* Pause overlay */}
      <AnimatePresence>
        {gameState.isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center shadow-xl">
              <h2 className="text-2xl font-bold mb-4">⏸️ 일시정지</h2>
              <button onClick={resumeGame} className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold text-lg hover:opacity-90 transition">
                계속하기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MarkerOverlay({ markers, side }: { markers: Marker[]; side: string }) {
  return (
    <>
      <AnimatePresence>
        {markers.map(m => (
          <motion.div
            key={m.id}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute pointer-events-none"
            style={{ left: m.x - 20, top: m.y - 20 }}
          >
            {m.type === 'correct' ? (
              <div className="w-10 h-10 rounded-full border-3 border-green-400 flex items-center justify-center">
                <span className="text-green-400 font-bold text-xs">+{m.score}</span>
              </div>
            ) : (
              <div className="w-10 h-10 flex items-center justify-center text-red-400 text-2xl font-bold">✕</div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}

function HintCircle({ x, y, sceneW, sceneH }: { x: number; y: number; sceneW: number; sceneH: number }) {
  const pctX = (x / sceneW) * 100;
  const pctY = (y / sceneH) * 100;
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0.4, 0.8] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="absolute w-12 h-12 rounded-full border-3 border-amber-400 pointer-events-none"
      style={{ left: `${pctX}%`, top: `${pctY}%`, transform: 'translate(-50%, -50%)' }}
    />
  );
}

function FoundOverlay({ gameState, sceneW, sceneH }: { gameState: { foundDifferences: string[]; scene: { differences: { id: string; hitArea: { x: number; y: number; width: number; height: number } }[] } }; sceneW: number; sceneH: number }) {
  return (
    <>
      {gameState.scene.differences
        .filter(d => gameState.foundDifferences.includes(d.id))
        .map(d => {
          const cx = ((d.hitArea.x + d.hitArea.width / 2) / sceneW) * 100;
          const cy = ((d.hitArea.y + d.hitArea.height / 2) / sceneH) * 100;
          return (
            <div
              key={d.id}
              className="absolute w-8 h-8 rounded-full border-2 border-green-500 bg-green-500/20 pointer-events-none"
              style={{ left: `${cx}%`, top: `${cy}%`, transform: 'translate(-50%, -50%)' }}
            />
          );
        })}
    </>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
