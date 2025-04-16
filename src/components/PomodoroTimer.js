import React, { useState, useRef, useEffect } from 'react';
import './styles.css';

const POMODORO_DURATION = 25 * 60; // 25 minutes
const BREAK_DURATION = 5 * 60; // 5 minutes

const PomodoroTimer = () => {
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [completed, setCompleted] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s > 0) return s - 1;
          clearInterval(intervalRef.current);
          setIsRunning(false);
          setCompleted((c) => c + 1);
          setTimeout(() => setShowConfetti(true), 100);
          setTimeout(() => setShowConfetti(false), 1200);
          if (!onBreak) {
            setTimeout(() => {
              setOnBreak(true);
              setSecondsLeft(BREAK_DURATION);
              setIsRunning(true);
            }, 1200);
          } else {
            setTimeout(() => {
              setOnBreak(false);
              setSecondsLeft(POMODORO_DURATION);
              setIsRunning(true);
            }, 1200);
          }
          return 0;
        });
      }, 1000);
      return () => clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, onBreak]);

  const [showConfetti, setShowConfetti] = useState(false);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setOnBreak(false);
    setSecondsLeft(POMODORO_DURATION);
  };

  return (
    <div className="pomodoro-widget">
      <div className={`pomodoro-timer${onBreak ? ' break' : ''}`}>{formatTime(secondsLeft)}</div>
      <div className="pomodoro-label">{onBreak ? 'Break' : 'Focus'}</div>
      <div className="pomodoro-controls">
        {!isRunning ? (
          <button onClick={handleStart} title="Start">Start</button>
        ) : (
          <button onClick={handlePause} title="Pause">Pause</button>
        )}
        <button onClick={handleReset} title="Reset">Reset</button>
      </div>
      <div className="pomodoro-progress">
        <span role="img" aria-label="tomato">🍅</span> x {completed}
      </div>
      {showConfetti && <div className="pomodoro-confetti">🎉</div>}
    </div>
  );
};

export default PomodoroTimer;
