
import { useEffect, useState, useRef } from 'react';

const MIN_GRID_SIZE = 3;
const MAX_GRID_SIZE = 5;

function createRandomSequence(gridSize, length) {
  const total = gridSize * gridSize;
  const seq = [];
  for (let i = 0; i < length; i++) {
    seq.push(Math.floor(Math.random() * total));
  }
  return seq;
}

export default function Home() {
  const [gridSize, setGridSize] = useState(MIN_GRID_SIZE);
  const [sequence, setSequence] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | showing | input | gameover
  const [showIndex, setShowIndex] = useState(-1);
  const [stepIndex, setStepIndex] = useState(0);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [message, setMessage] = useState('Tap START to begin.');
  const intervalRef = useRef(null);

  const clickSoundRef = useRef(null);
  const bgSoundRef = useRef(null);

  // load sounds on client
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const click = new Audio('/click.wav');
      click.volume = 0.5;
      clickSoundRef.current = click;

      const bg = new Audio('/bg.wav');
      bg.loop = true;
      bg.volume = 0.12;
      bgSoundRef.current = bg;
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  }, []);

  // best score from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('farcmind_best');
      if (raw) setBestScore(parseInt(raw, 10) || 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('farcmind_best', String(bestScore));
    } catch {}
  }, [bestScore]);

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function stopBgSound() {
    try {
      if (bgSoundRef.current) {
        bgSoundRef.current.pause();
        bgSoundRef.current.currentTime = 0;
      }
    } catch {}
  }

  function playBgSound() {
    try {
      if (bgSoundRef.current) {
        bgSoundRef.current.currentTime = 0;
        bgSoundRef.current.play();
      }
    } catch {}
  }

  function playClickSound() {
    try {
      if (clickSoundRef.current) {
        clickSoundRef.current.currentTime = 0;
        clickSoundRef.current.play();
      }
    } catch {}
  }

  // start or restart game
  function startGame() {
    clearTimer();
    playBgSound();
    const baseGrid = MIN_GRID_SIZE;
    setGridSize(baseGrid);
    const initialSeq = createRandomSequence(baseGrid, 3);
    setSequence(initialSeq);
    setRound(1);
    setScore(0);
    setStepIndex(0);
    setPhase('showing');
    setMessage('Watch the pattern...');
    runShowSequence(initialSeq);
  }

  function runShowSequence(seq) {
    clearTimer();
    setPhase('showing');
    setMessage('Watch the pattern...');
    let i = 0;
    setShowIndex(seq[0]);
    intervalRef.current = setInterval(() => {
      i += 1;
      if (i >= seq.length) {
        clearTimer();
        setShowIndex(-1);
        setStepIndex(0);
        setPhase('input');
        setMessage('Now tap the tiles in order.');
        return;
      }
      setShowIndex(seq[i]);
    }, 600);
  }

  // handle user tile click
  function handleTileClick(index) {
    if (phase !== 'input') return;
    playClickSound();

    const expected = sequence[stepIndex];
    if (index === expected) {
      const nextStep = stepIndex + 1;
      if (nextStep >= sequence.length) {
        // round success
        const newRound = round + 1;
        const newScore = score + sequence.length * 10;
        setRound(newRound);
        setScore(newScore);
        if (newScore > bestScore) setBestScore(newScore);

        let newGridSize = gridSize;
        if (newRound % 3 === 0 && gridSize < MAX_GRID_SIZE) {
          newGridSize = gridSize + 1;
          setGridSize(newGridSize);
        }

        const nextSeq = createRandomSequence(newGridSize, Math.min(sequence.length + 1, newGridSize * newGridSize));
        setSequence(nextSeq);
        setPhase('showing');
        setMessage('Nice! Watch the next pattern...');
        runShowSequence(nextSeq);
      } else {
        setStepIndex(nextStep);
      }
    } else {
      // fail
      clearTimer();
      stopBgSound();
      setPhase('gameover');
      setShowIndex(index);
      setMessage('Game over. Tap RESTART to try again.');
    }
  }

  useEffect(() => {
    return () => {
      clearTimer();
      stopBgSound();
    };
  }, []);

  const totalTiles = gridSize * gridSize;
  const tiles = [];
  for (let i = 0; i < totalTiles; i++) {
    const isActive = i === showIndex;
    tiles.push(
      <button
        key={i}
        className={isActive ? 'tile tile-active' : 'tile'}
        onClick={() => handleTileClick(i)}
        disabled={phase !== 'input'}
      />
    );
  }

  return (
    <div className="root-bg">
      <div className="app-frame">
        <header className="app-header">
          <div className="title-row">
            <div className="brain-icon">🧠</div>
            <div>
              <div className="app-name">Farc !!! Mind</div>
              <div className="app-sub">Fast-paced Farcaster memory grid</div>
            </div>
          </div>
          <div className="metrics-row">
            <div className="metric-pill">
              <div className="metric-label">Score</div>
              <div className="metric-value">{score}</div>
            </div>
            <div className="metric-pill">
              <div className="metric-label">Best</div>
              <div className="metric-value">{bestScore}</div>
            </div>
            <div className="metric-pill">
              <div className="metric-label">Grid</div>
              <div className="metric-value">
                {gridSize}×{gridSize}
              </div>
            </div>
            <div className="metric-pill">
              <div className="metric-label">Round</div>
              <div className="metric-value">{round}</div>
            </div>
          </div>
        </header>

        <main className="app-main">
          <div className="grid-wrapper" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
            {tiles}
          </div>
          <div className="status-text">{message}</div>
          <div className="bottom-panel">
            <button
              className="start-btn"
              onClick={startGame}
            >
              {phase === 'idle' || phase === 'gameover' ? 'START' : 'RESTART'}
            </button>
            <div className="info-line">
              Grid {gridSize} × {gridSize} • Pattern {sequence.length} tiles
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
