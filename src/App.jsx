import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RefreshCw, Volume2, Power, Minus, Plus, Settings, BookOpen, X, PlayCircle } from 'lucide-react';

/**
 * Rhythm Cards Trainer - Field Ops Edition v2.8
 * Fixes:
 * 1. Mobile Card Sizing: Drastically increased internal padding (p-6) on mobile cards to shrink SVGs and prevent clipping.
 * 2. Mobile Library: Increased bottom padding (pb-48) to guarantee visibility of the last row.
 * 3. General Layout: Added grid padding to prevent cards from touching screen edges.
 */

// --- Audio Engine (Unchanged) ---
class MetronomeEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.nextNoteTime = 0.0;
    this.timerID = null;
    this.isPlaying = false;
    this.tempo = 60;
    this.lookahead = 25.0; 
    this.scheduleAheadTime = 0.1;
    this.volume = 0.5; 
    this.beatCount = 0; 
    this.visualQueue = [];
    
    this.activePatternTimings = null;
    this.activeSequence = null;
  }

  nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += secondsPerBeat;
    this.beatCount = (this.beatCount + 1) % 4;
  }

  scheduleMetronomeClick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square'; 
    if (this.beatCount === 0) {
        osc.frequency.value = 1200; 
    } else {
        osc.frequency.value = 800;  
    }
    const vol = Math.max(0.001, this.volume * 0.6);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.005); 
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05); 
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  schedulePatternSound(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle'; 
    osc.frequency.value = 600; 
    const vol = Math.max(0.001, this.volume);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.005); 
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1); 
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      const secondsPerBeat = 60.0 / this.tempo;
      this.scheduleMetronomeClick(this.nextNoteTime);
      
      if (this.activeSequence && this.activeSequence.length === 4) {
          const currentPatternTimings = this.activeSequence[this.beatCount];
          if (currentPatternTimings) {
              currentPatternTimings.forEach(offset => {
                  const noteTime = this.nextNoteTime + (offset * secondsPerBeat);
                  this.schedulePatternSound(noteTime);
              });
          }
      } 
      else if (this.activePatternTimings && this.activePatternTimings.length > 0) {
          this.activePatternTimings.forEach(offset => {
              const noteTime = this.nextNoteTime + (offset * secondsPerBeat);
              this.schedulePatternSound(noteTime);
          });
      }

      this.visualQueue.push({ noteTime: this.nextNoteTime, beat: this.beatCount });
      this.nextNote();
    }
    this.timerID = window.setTimeout(this.scheduler.bind(this), this.lookahead);
  }

  async start() {
    if (this.isPlaying) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.isPlaying = true;
    this.beatCount = 0; 
    this.visualQueue = []; 
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    this.visualQueue = []; 
    if (this.timerID) {
        window.clearTimeout(this.timerID);
        this.timerID = null;
    }
  }

  setTempo(bpm) { this.tempo = bpm; }
  setVolume(vol) { this.volume = vol; }
  setActivePattern(timings) { 
      this.activePatternTimings = timings; 
      this.activeSequence = null; 
  }
  setActiveSequence(sequence) {
      this.activeSequence = sequence;
      this.activePatternTimings = null; 
  }
}

// --- Visual Components ---

const RetroWaveform = ({ isPlaying, beat, activePattern, isSequencePlaying }) => {
  const [points, setPoints] = useState('');
  useEffect(() => {
    let animationFrameId;
    const renderWave = () => {
        const totalPoints = 60;
        const pts = [];
        for (let i = 0; i <= totalPoints; i++) {
            const x = (i / totalPoints) * 100;
            let y = 50; 
            let noise = (Math.random() - 0.5) * 3;
            if (isPlaying) {
                const excitement = (activePattern || isSequencePlaying) ? 2 : 1; 
                const sectionSize = totalPoints / 4;
                const activeStart = beat * sectionSize;
                const activeEnd = (beat + 1) * sectionSize;
                if (i >= activeStart && i <= activeEnd) {
                    const center = activeStart + (sectionSize / 2);
                    const distance = Math.abs(i - center);
                    if (distance < 8) {
                        const multiplier = (beat === 0 ? 30 : 15) * excitement;
                        const spike = (Math.random() * multiplier) * (1 - distance/8);
                        y += Math.random() > 0.5 ? spike : -spike;
                    }
                }
            }
            y += noise;
            pts.push(`${x},${y}`);
        }
        setPoints(pts.join(' '));
        animationFrameId = requestAnimationFrame(renderWave);
    };
    renderWave();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, beat, activePattern, isSequencePlaying]);

  return (
    <div className="absolute bottom-0 left-0 w-full h-12 pointer-events-none z-0 overflow-hidden rounded-b-lg">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full opacity-60">
            <polyline points={points} fill="none" stroke="#33ff00" strokeWidth="0.5" vectorEffect="non-scaling-stroke" className="drop-shadow-[0_0_4px_rgba(51,255,0,0.8)]" />
        </svg>
    </div>
  );
};

// --- Patterns (Unchanged) ---
const PATTERNS = {
  quarter: { id: 'quarter', name: 'Quarter', timings: [0], render: () => (<g stroke="currentColor" fill="currentColor" strokeWidth="3"><ellipse cx="50" cy="70" rx="10" ry="8" transform="rotate(-15 50 70)" /><line x1="60" y1="70" x2="60" y2="20" strokeWidth="4" /></g>) },
  eighthPair: { id: 'eighthPair', name: 'Eighths', timings: [0, 0.5], render: () => (<g stroke="currentColor" fill="currentColor" strokeWidth="4"><ellipse cx="30" cy="70" rx="10" ry="8" transform="rotate(-15 30 70)" /><line x1="40" y1="70" x2="40" y2="20" /><ellipse cx="70" cy="70" rx="10" ry="8" transform="rotate(-15 70 70)" /><line x1="80" y1="70" x2="80" y2="20" /><line x1="40" y1="20" x2="80" y2="20" strokeWidth="8" /></g>) },
  sixteenthQuad: { id: 'sixteenthQuad', name: '16ths', timings: [0, 0.25, 0.5, 0.75], render: () => (<g stroke="currentColor" fill="currentColor" strokeWidth="3">{[20, 40, 60, 80].map(x => (<React.Fragment key={x}><ellipse cx={x} cy="70" rx="8" ry="6" transform={`rotate(-15 ${x} 70)`} /><line x1={x + 8} y1="70" x2={x + 8} y2="20" strokeWidth="3"/></React.Fragment>))}<line x1="28" y1="20" x2="88" y2="20" strokeWidth="6" /><line x1="28" y1="34" x2="88" y2="34" strokeWidth="6" /></g>) },
  front8Back16: { id: 'front8Back16', name: 'Galop', timings: [0, 0.5, 0.75], render: () => (<g stroke="currentColor" fill="currentColor" strokeWidth="3"><ellipse cx="30" cy="70" rx="9" ry="7" transform="rotate(-15 30 70)" /><line x1="39" y1="70" x2="39" y2="20" strokeWidth="3"/><ellipse cx="60" cy="70" rx="9" ry="7" transform="rotate(-15 60 70)" /><line x1="69" y1="70" x2="69" y2="20" strokeWidth="3"/><ellipse cx="80" cy="70" rx="9" ry="7" transform="rotate(-15 80 70)" /><line x1="89" y1="70" x2="89" y2="20" strokeWidth="3"/><line x1="39" y1="20" x2="89" y2="20" strokeWidth="7" /><line x1="69" y1="32" x2="89" y2="32" strokeWidth="6" /></g>) },
  front16Back8: { id: 'front16Back8', name: 'Rev.Galop', timings: [0, 0.25, 0.5], render: () => (<g stroke="currentColor" fill="currentColor" strokeWidth="3"><ellipse cx="20" cy="70" rx="9" ry="7" transform="rotate(-15 20 70)" /><line x1="29" y1="70" x2="29" y2="20" strokeWidth="3"/><ellipse cx="40" cy="70" rx="9" ry="7" transform="rotate(-15 40 70)" /><line x1="49" y1="70" x2="49" y2="20" strokeWidth="3"/><ellipse cx="70" cy="70" rx="9" ry="7" transform="rotate(-15 70 70)" /><line x1="79" y1="70" x2="79" y2="20" strokeWidth="3"/><line x1="29" y1="20" x2="79" y2="20" strokeWidth="7" /><line x1="29" y1="32" x2="49" y2="32" strokeWidth="6" /></g>) },
  triplet: { id: 'triplet', name: 'Triplet', timings: [0, 1/3, 2/3], render: () => (<g stroke="currentColor" fill="currentColor" strokeWidth="3"><ellipse cx="25" cy="70" rx="9" ry="7" transform="rotate(-15 25 70)" /><line x1="34" y1="70" x2="34" y2="20" strokeWidth="3"/><ellipse cx="50" cy="70" rx="9" ry="7" transform="rotate(-15 50 70)" /><line x1="59" y1="70" x2="59" y2="20" strokeWidth="3"/><ellipse cx="75" cy="70" rx="9" ry="7" transform="rotate(-15 75 70)" /><line x1="84" y1="70" x2="84" y2="20" strokeWidth="3"/><line x1="34" y1="20" x2="84" y2="20" strokeWidth="7" /><text x="59" y="15" textAnchor="middle" fontSize="18" fontWeight="bold" fill="currentColor">3</text></g>) },
  dotted8Sixteenth: { id: 'dotted8Sixteenth', name: 'Dot-16', timings: [0, 0.75], render: () => (<g stroke="currentColor" fill="currentColor" strokeWidth="3"><ellipse cx="30" cy="70" rx="10" ry="8" transform="rotate(-15 30 70)" /><line x1="40" y1="70" x2="40" y2="20" strokeWidth="3"/><circle cx="50" cy="65" r="5" /><ellipse cx="70" cy="70" rx="10" ry="8" transform="rotate(-15 70 70)" /><line x1="80" y1="70" x2="80" y2="20" strokeWidth="3"/><line x1="40" y1="20" x2="80" y2="20" strokeWidth="7" /><line x1="70" y1="32" x2="80" y2="32" strokeWidth="6" /></g>) },
  sixteenthDotted8: { id: 'sixteenthDotted8', name: '16-Dot', timings: [0, 0.25], render: () => (<g stroke="currentColor" fill="currentColor" strokeWidth="3"><ellipse cx="30" cy="70" rx="10" ry="8" transform="rotate(-15 30 70)" /><line x1="40" y1="70" x2="40" y2="20" strokeWidth="3"/><ellipse cx="70" cy="70" rx="10" ry="8" transform="rotate(-15 70 70)" /><line x1="80" y1="70" x2="80" y2="20" strokeWidth="3"/><circle cx="90" cy="65" r="5" /><line x1="40" y1="20" x2="80" y2="20" strokeWidth="7" /><line x1="40" y1="32" x2="55" y2="32" strokeWidth="6" /></g>) },
  syncopation16: { id: 'syncopation16', name: 'Sync', timings: [0, 0.25, 0.75], render: () => (<g stroke="currentColor" fill="currentColor" strokeWidth="3"><ellipse cx="20" cy="70" rx="8" ry="6" transform="rotate(-15 20 70)" /><line x1="28" y1="70" x2="28" y2="20" strokeWidth="3"/><ellipse cx="50" cy="70" rx="8" ry="6" transform="rotate(-15 50 70)" /><line x1="58" y1="70" x2="58" y2="20" strokeWidth="3"/><ellipse cx="80" cy="70" rx="8" ry="6" transform="rotate(-15 80 70)" /><line x1="88" y1="70" x2="88" y2="20" strokeWidth="3"/><line x1="28" y1="20" x2="88" y2="20" strokeWidth="7" /><line x1="28" y1="32" x2="38" y2="32" strokeWidth="6" /><line x1="78" y1="32" x2="88" y2="32" strokeWidth="6" /></g>) }
};

const PhosphorCard = ({ pattern, isNew, index, onClick, isActive, minimal = false, isPlayingSeq = false }) => (
  <div 
    onClick={onClick}
    className={`
    flex flex-col items-center justify-between
    relative overflow-hidden bg-[#0d120d] border rounded cursor-pointer select-none
    transition-all duration-200 w-full h-full
    ${isActive || isPlayingSeq
        ? 'border-[#33ff00] bg-[#1a2e1a] shadow-[0_0_15px_rgba(51,255,0,0.4)] z-10 scale-105' 
        : 'border-[#33ff00]/20 hover:border-[#33ff00]/60 hover:bg-[#33ff00]/10 opacity-80'}
    ${!isActive && !isPlayingSeq && !minimal && !isNew ? 'opacity-40 grayscale' : ''}
    ${isPlayingSeq ? 'scale-105' : ''}
  `}>
    <div className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.5) 50%)', backgroundSize: '100% 4px' }}></div>
    
    {/* SVG Container: Drastically increased padding 'p-6' on mobile to force SVG to shrink */}
    <div className={`flex-1 flex items-center justify-center text-[#33ff00] w-full min-h-0 ${minimal ? 'p-2' : 'p-6 md:p-4'}`}
           style={{ filter: (isActive || isPlayingSeq) ? 'drop-shadow(0 0 4px rgba(51, 255, 0, 0.8))' : 'none' }}>
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
          {pattern.render()}
        </svg>
    </div>

    {!minimal && (
      <div className="h-auto shrink-0 w-full text-center pb-1.5 md:pb-2 px-1">
        <div className={`text-[8px] md:text-[10px] font-mono font-bold tracking-widest py-0.5 md:py-1 rounded-sm truncate transition-colors ${isPlayingSeq ? 'bg-[#33ff00] text-black' : 'bg-[#33ff00]/10 text-[#33ff00]'}`}>
            {pattern.name}
        </div>
      </div>
    )}
  </div>
);

// --- Styled Components ---
const TactileButton = ({ onClick, children, className, active, color = 'grey' }) => (
  <button 
    onClick={onClick}
    className={`
      relative group flex items-center justify-center select-none
      rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.4),0_6px_5px_rgba(0,0,0,0.2)] 
      active:shadow-[0_0_0_rgba(0,0,0,0.4),inset_0_2px_5px_rgba(0,0,0,0.2)] active:translate-y-[4px] transition-all
      border-t border-white/10
      ${color === 'orange' 
        ? 'bg-[#e06c28] text-white hover:bg-[#eb7d3c]' 
        : 'bg-[#4a4a4a] text-gray-200 hover:bg-[#555555]'}
      ${active ? 'ring-1 ring-white/50 brightness-110' : ''}
      ${className}
    `}
  >
    <div className="font-mono font-bold text-xs md:text-sm uppercase tracking-wider flex items-center gap-2">
      {children}
    </div>
  </button>
);

const Screw = () => (
  <div className="w-3 h-3 rounded-full bg-[#2a2a2a] border border-black shadow-[inset_0_1px_2px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
    <div className="w-full h-[1px] bg-[#111] rotate-45"></div>
    <div className="w-full h-[1px] bg-[#111] -rotate-45 absolute"></div>
  </div>
);

const Fader = ({ label, value, min, max, onChange, onIncrement, onDecrement, unit = '' }) => (
  <div className="flex flex-col gap-1 w-full bg-[#1a1a1a] p-2 md:p-3 rounded-lg border border-white/5 shadow-inner h-full justify-center">
    <div className="flex justify-between items-end mb-1">
      <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest">{label}</label>
      <span className="font-mono text-xs font-bold text-[#e06c28]">{value}{unit}</span>
    </div>
    <div className="flex items-center gap-2">
      <button onClick={onDecrement} className="w-8 h-8 rounded bg-[#333] text-gray-400 flex items-center justify-center hover:bg-[#444] active:bg-[#222] shadow transition-colors"><Minus size={14} /></button>
      <div className="relative flex-1 h-8 flex items-center">
        <div className="absolute w-full h-2 bg-[#000] rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,1)] border-b border-white/10"></div>
        <input type="range" min={min} max={max} value={value} onChange={onChange} className="w-full appearance-none bg-transparent relative z-10 cursor-pointer h-full opacity-0" />
        <div className="absolute h-6 w-8 bg-gradient-to-b from-[#555] to-[#333] rounded shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] flex justify-center items-center pointer-events-none border border-black" style={{ left: `calc(${((value - min) / (max - min)) * 100}% - 16px)` }}><div className="w-1 h-3 bg-[#e06c28] rounded-full shadow-[0_0_5px_rgba(224,108,40,0.5)]"></div></div>
      </div>
      <button onClick={onIncrement} className="w-8 h-8 rounded bg-[#333] text-gray-400 flex items-center justify-center hover:bg-[#444] active:bg-[#222] shadow transition-colors"><Plus size={14} /></button>
    </div>
  </div>
);

// --- Main App ---
export default function RhythmCardsApp() {
  const [screen, setScreen] = useState('training'); 
  const [difficulty, setDifficulty] = useState('basic');
  const [cards, setCards] = useState([]);
  const [bpm, setBpm] = useState(60);
  const [volume, setVolume] = useState(75);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSequencePlaying, setIsSequencePlaying] = useState(false); // New State for Sequence
  const [animateCards, setAnimateCards] = useState(false);
  const [beatIndicator, setBeatIndicator] = useState(0); 
  const [activeLibraryPattern, setActiveLibraryPattern] = useState(null);

  const metronomeRef = useRef(null);

  useEffect(() => {
    if (!metronomeRef.current) metronomeRef.current = new MetronomeEngine();
  }, []);

  const generateCards = useCallback(() => {
    setAnimateCards(false);
    setIsSequencePlaying(false); // Stop sequence on shuffle
    if (metronomeRef.current) metronomeRef.current.setActiveSequence(null);

    setTimeout(() => {
      const basic = ['quarter', 'eighthPair', 'sixteenthQuad'];
      const advanced = [...basic, 'front8Back16', 'front16Back8', 'triplet'];
      const expert = [...advanced, 'dotted8Sixteenth', 'sixteenthDotted8', 'syncopation16'];
      const pool = difficulty === 'basic' ? basic : difficulty === 'advanced' ? advanced : expert;
      
      const newCards = Array(4).fill(null).map(() => {
        const randomKey = pool[Math.floor(Math.random() * pool.length)];
        return { ...PATTERNS[randomKey], uid: Math.random() };
      });
      setCards(newCards);
      setAnimateCards(true);
    }, 100);
  }, [difficulty]);

  useEffect(() => { generateCards(); }, [generateCards]);

  useEffect(() => {
    let animationFrameId;
    const tick = () => {
      const engine = metronomeRef.current;
      if (engine && engine.ctx && engine.isPlaying) {
        const currentTime = engine.ctx.currentTime;
        while (engine.visualQueue.length > 0 && engine.visualQueue[0].noteTime <= currentTime) {
          const currentNote = engine.visualQueue.shift();
          setBeatIndicator(currentNote.beat);
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => { if (metronomeRef.current) metronomeRef.current.setVolume(volume / 100); }, [volume]);
  useEffect(() => { if (metronomeRef.current) metronomeRef.current.setTempo(bpm); }, [bpm]);

  const toggleMetronome = async () => {
    if (isPlaying) {
      metronomeRef.current.stop();
      setIsPlaying(false);
      setIsSequencePlaying(false); // Reset sequence state on stop
      setBeatIndicator(0);
    } else {
      metronomeRef.current.setTempo(bpm);
      await metronomeRef.current.start();
      setIsPlaying(true);
    }
  };

  const adjustBpm = (delta) => {
    const newBpm = Math.min(180, Math.max(40, bpm + delta));
    setBpm(newBpm);
  };

  const toggleSequence = async () => {
      if (isSequencePlaying) {
          setIsSequencePlaying(false);
          metronomeRef.current.setActiveSequence(null);
      } else {
          const sequenceTimings = cards.map(card => card.timings);
          metronomeRef.current.setActiveSequence(sequenceTimings);
          setIsSequencePlaying(true);
          if (!isPlaying) {
              metronomeRef.current.setTempo(bpm);
              await metronomeRef.current.start();
              setIsPlaying(true);
          }
      }
  };

  const handlePatternClick = (patternKey) => {
      if (activeLibraryPattern === patternKey) {
          setActiveLibraryPattern(null);
          metronomeRef.current.setActivePattern(null);
      } else {
          setActiveLibraryPattern(patternKey);
          metronomeRef.current.setActivePattern(PATTERNS[patternKey].timings);
          if (!isPlaying) toggleMetronome();
      }
  };

  const switchScreen = (newScreen) => {
      setScreen(newScreen);
      setActiveLibraryPattern(null);
      setIsSequencePlaying(false); // Stop sequence when switching
      if (metronomeRef.current) {
          metronomeRef.current.setActivePattern(null);
          metronomeRef.current.setActiveSequence(null);
      }
  };

  return (
    <div className="fixed inset-0 bg-[#111] flex items-center justify-center overflow-hidden font-sans select-none">
      <div className="fixed inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#555 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      <div className="relative w-full h-full md:w-auto md:h-auto md:max-h-[90vh] md:aspect-[3/5] md:max-w-md bg-[#2e302e] md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border-t border-white/5 md:border-b-4 border-black/40">
        
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        <div className="absolute top-3 left-3"><Screw /></div>
        <div className="absolute top-3 right-3"><Screw /></div>
        <div className="absolute bottom-3 left-3"><Screw /></div>
        <div className="absolute bottom-3 right-3"><Screw /></div>
        
        {/* HEADER */}
        <div className="shrink-0 px-6 pt-8 pb-4 flex justify-between items-end z-10">
            <div className="flex flex-col">
                <div className="text-[9px] font-bold text-[#666] uppercase tracking-[0.3em] mb-1">Made by Tmx</div>
                <div className="flex items-center gap-2">
                    <Settings className="text-[#888]" size={18} />
                    <span className="font-black text-xl text-[#ccc] tracking-tighter italic">RHYTHM<span className="text-[#e06c28]">.OS</span></span>
                </div>
            </div>
            <div className="flex bg-[#1a1a1a] p-1 rounded-lg border border-white/10 shadow-inner">
                <button onClick={() => switchScreen('training')} className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all font-mono text-[10px] font-bold uppercase tracking-wider ${screen === 'training' ? 'bg-[#e06c28] text-white shadow-[0_1px_4px_rgba(224,108,40,0.4)]' : 'text-[#666] hover:text-[#999] hover:bg-[#252525]'}`}><RefreshCw size={14} /><span>TRAIN</span></button>
                <div className="w-[1px] bg-white/5 my-1 mx-1"></div>
                <button onClick={() => switchScreen('library')} className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all font-mono text-[10px] font-bold uppercase tracking-wider ${screen === 'library' ? 'bg-[#e06c28] text-white shadow-[0_1px_4px_rgba(224,108,40,0.4)]' : 'text-[#666] hover:text-[#999] hover:bg-[#252525]'}`}><BookOpen size={14} /><span>LIB</span></button>
            </div>
        </div>

        {/* SCREEN */}
        <div className="flex-1 px-4 min-h-0 flex flex-col z-10">
            <div className="bg-[#000] rounded-lg p-1 shadow-[inset_0_2px_10px_rgba(0,0,0,1)] border-b border-white/10 h-full flex flex-col">
                <div className="bg-[#050805] rounded border border-[#222] relative overflow-hidden w-full h-full flex flex-col">
                    <div className="absolute inset-0 z-20 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-30"></div>
                    <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]"></div>

                    <div className="shrink-0 flex justify-between px-3 py-2 text-[#33ff00] font-mono text-[9px] z-30 opacity-70 border-b border-[#33ff00]/20">
                        <span>{screen === 'training' ? `MODE: ${difficulty.toUpperCase()}` : 'MODE: LIBRARY'}</span>
                        <span>CLK: {bpm}</span>
                    </div>

                    <div className="flex-1 relative z-10 p-2 md:p-4">
                        {screen === 'training' && (
                            <div className="w-full h-full grid grid-cols-2 grid-rows-2 md:grid-cols-4 md:grid-rows-1 gap-3 md:gap-4 p-4 md:p-0"> {/* Added gap-3 and p-4 */}
                                {cards.map((card, index) => (
                                    <PhosphorCard 
                                        key={card.uid || index} 
                                        pattern={card} 
                                        isNew={animateCards} 
                                        index={index}
                                        isPlayingSeq={isSequencePlaying && beatIndicator === index}
                                    />
                                ))}
                            </div>
                        )}
                        {screen === 'library' && (
                            <div className="w-full h-full overflow-y-auto custom-scrollbar pb-48"> {/* Significantly increased bottom padding */}
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.keys(PATTERNS).map((key) => (
                                        <PhosphorCard key={key} pattern={PATTERNS[key]} isActive={activeLibraryPattern === key} onClick={() => handlePatternClick(key)} minimal={true} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-12 shrink-0 relative z-0">
                         <RetroWaveform isPlaying={isPlaying} beat={beatIndicator} activePattern={activeLibraryPattern} isSequencePlaying={isSequencePlaying} />
                    </div>
                </div>
            </div>
        </div>

        {/* CONTROLS */}
        <div className="shrink-0 bg-[#222] px-6 py-6 border-t border-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] z-20">
            <div className="flex justify-between items-center mb-4">
               <div className="flex gap-1">
                 {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-6 h-1.5 rounded-sm transition-all duration-75 border border-black/30 ${isPlaying && beatIndicator === i ? (i === 0 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-[#33ff00] shadow-[0_0_10px_#33ff00]') : 'bg-[#1a1a1a]'}`}></div>
                ))}
               </div>
               
               {screen === 'training' && (
                <div className="flex gap-1 bg-[#181818] p-1 rounded shadow-inner">
                    {['basic', 'advanced', 'expert'].map((lvl) => (
                        <button key={lvl} onClick={() => setDifficulty(lvl)} className={`px-2 py-1 rounded text-[8px] md:text-[10px] font-bold uppercase transition-all ${difficulty === lvl ? 'bg-[#e06c28] text-white shadow-sm' : 'text-[#666] hover:text-[#999] hover:bg-[#252525]'}`}>
                            {lvl === 'basic' ? 'BAS' : lvl === 'advanced' ? 'ADV' : 'EXP'}
                        </button>
                    ))}
                </div>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                 <Fader label="Tempo" value={bpm} min={40} max={180} onChange={(e) => setBpm(parseInt(e.target.value))} onDecrement={() => adjustBpm(-1)} onIncrement={() => adjustBpm(1)} unit=" BPM" />
                 <Fader label="Volume" value={volume} min={0} max={100} onChange={(e) => setVolume(parseInt(e.target.value))} onDecrement={() => setVolume(Math.max(0, volume - 5))} onIncrement={() => setVolume(Math.min(100, volume + 5))} unit="%" />
            </div>

            {/* CONTROL BUTTONS: Grid adjusted for 3 buttons in Train mode */}
            {screen === 'training' ? (
                <div className="grid grid-cols-3 gap-2 h-14">
                    {/* 1. Stop/Run */}
                    <TactileButton onClick={toggleMetronome} active={isPlaying} color={isPlaying ? "orange" : "grey"} className="w-full h-full text-xs md:text-sm">
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}<span>{isPlaying ? "STOP" : "RUN"}</span>
                    </TactileButton>
                    
                    {/* 2. Play Sequence (NEW) */}
                    <TactileButton onClick={toggleSequence} active={isSequencePlaying} color="grey" className="w-full h-full text-xs md:text-sm">
                        <PlayCircle size={18} className={isSequencePlaying ? "text-[#33ff00]" : ""} />
                        <span>SEQ</span>
                    </TactileButton>

                    {/* 3. Shuffle */}
                    <TactileButton onClick={generateCards} active={!animateCards} color="orange" className="w-full h-full text-xs md:text-sm">
                        <RefreshCw size={18} className={!animateCards ? 'animate-spin' : ''} />
                        <span>SYNC</span>
                    </TactileButton>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 h-14">
                    <TactileButton onClick={toggleMetronome} active={isPlaying} color={isPlaying ? "orange" : "grey"} className="w-full h-full text-lg">
                        {isPlaying ? <Pause /> : <Play />}<span>{isPlaying ? "STOP" : "RUN"}</span>
                    </TactileButton>
                    <TactileButton onClick={() => handlePatternClick(null)} active={false} color="grey" className="w-full h-full text-lg">
                        <X /><span>MUTE</span>
                    </TactileButton>
                </div>
            )}
        </div>

      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0d120d; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #33ff00; opacity: 0.3; border-radius: 4px; }
      `}</style>
    </div>
  );
}