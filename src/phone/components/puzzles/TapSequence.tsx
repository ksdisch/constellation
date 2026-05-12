import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  onSolved: () => void;
  onCancel: () => void;
  totalSeconds?: number;
  sequenceLength?: number;
}

const CELL_COLORS = ['#7ad8ff', '#9a7aff', '#ffd166', '#98ffc8'];
const FLASH_ON_MS = 400;
const FLASH_GAP_MS = 200;
const FAIL_FLASH_MS = 450;
const TAP_HIGHLIGHT_MS = 200;
const DEMO_PRE_DELAY_MS = 300;

export function TapSequence({
  onSolved,
  onCancel,
  totalSeconds = 25,
  sequenceLength = 5,
}: Props) {
  const sequence = useMemo(
    () => Array.from({ length: sequenceLength }, () => Math.floor(Math.random() * CELL_COLORS.length)),
    [sequenceLength]
  );
  const [mode, setMode] = useState<'demo' | 'input' | 'fail'>('demo');
  const [demoLitIndex, setDemoLitIndex] = useState(-1);
  const [inputProgress, setInputProgress] = useState(0);
  const [tapHighlight, setTapHighlight] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const solvedRef = useRef(false);

  useEffect(() => {
    if (mode !== 'demo') return;
    let cancelled = false;
    let stepIdx = 0;
    function nextStep() {
      if (cancelled) return;
      if (stepIdx >= sequence.length) {
        setDemoLitIndex(-1);
        setMode('input');
        setInputProgress(0);
        return;
      }
      setDemoLitIndex(stepIdx);
      setTimeout(() => {
        if (cancelled) return;
        setDemoLitIndex(-1);
        stepIdx++;
        setTimeout(nextStep, FLASH_GAP_MS);
      }, FLASH_ON_MS);
    }
    const startTimer = setTimeout(nextStep, DEMO_PRE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
    };
  }, [mode, sequence]);

  useEffect(() => {
    if (mode !== 'fail') return;
    const t = setTimeout(() => setMode('demo'), FAIL_FLASH_MS);
    return () => clearTimeout(t);
  }, [mode]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  useEffect(() => {
    if (secondsLeft <= 0 && !solvedRef.current) {
      onCancel();
    }
  }, [secondsLeft, onCancel]);

  function onTap(cellIdx: number) {
    if (mode !== 'input') return;
    setTapHighlight(cellIdx);
    setTimeout(() => setTapHighlight(null), TAP_HIGHLIGHT_MS);
    if (cellIdx === sequence[inputProgress]) {
      const next = inputProgress + 1;
      if (next === sequence.length) {
        solvedRef.current = true;
        onSolved();
      } else {
        setInputProgress(next);
      }
    } else {
      setMode('fail');
    }
  }

  const timeColor = secondsLeft <= 5 ? '#ff9090' : '#a8b0d8';
  const statusLabel =
    mode === 'input' ? `${inputProgress}/${sequence.length}` : mode === 'fail' ? 'miss' : 'watch';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        alignItems: 'center',
        width: '100%',
        maxWidth: '360px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: '14px',
        }}
      >
        <span style={{ opacity: 0.6 }}>Summon Platform · {statusLabel}</span>
        <span style={{ color: timeColor }}>⏱ {secondsLeft}s</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '14px',
          width: '100%',
          aspectRatio: '1 / 1',
          maxWidth: '300px',
        }}
      >
        {CELL_COLORS.map((color, i) => {
          const lit =
            (mode === 'demo' && demoLitIndex >= 0 && sequence[demoLitIndex] === i) ||
            (mode === 'input' && tapHighlight === i);
          const failLit = mode === 'fail';
          const bg = failLit ? '#ff6b9d' : lit ? color : `${color}22`;
          const borderAlpha = failLit ? 'ff' : lit ? 'ff' : '60';
          return (
            <button
              key={i}
              disabled={mode !== 'input'}
              onClick={() => onTap(i)}
              aria-label={`cell ${i + 1}`}
              style={{
                background: bg,
                border: `2px solid ${failLit ? '#ff6b9d' : color}${failLit ? '' : borderAlpha}`,
                borderRadius: '18px',
                cursor: mode === 'input' ? 'pointer' : 'default',
                transition: 'background 80ms, border 80ms',
                outline: 'none',
                opacity: 1,
                padding: 0,
              }}
            />
          );
        })}
      </div>

      <button
        type="button"
        onClick={onCancel}
        style={{
          fontSize: '14px',
          padding: '10px',
          borderRadius: '8px',
          border: 'none',
          background: 'transparent',
          color: '#667',
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </div>
  );
}
