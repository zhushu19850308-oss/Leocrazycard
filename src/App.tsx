/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Hand, 
  Layers, 
  Info,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CardData, Suit, Rank, createDeck, shuffle, SUITS } from './types';

// --- Components ---

const SuitIcon = ({ suit, className = "" }: { suit: Suit; className?: string }) => {
  switch (suit) {
    case 'hearts': return <span className={`text-red-500 ${className}`}>♥</span>;
    case 'diamonds': return <span className={`text-red-500 ${className}`}>♦</span>;
    case 'clubs': return <span className={`text-slate-900 ${className}`}>♣</span>;
    case 'spades': return <span className={`text-slate-900 ${className}`}>♠</span>;
  }
};

interface CardProps {
  key?: React.Key;
  card: CardData;
  isFaceUp?: boolean;
  onClick?: () => void;
  isPlayable?: boolean;
  className?: string;
}

const Card = ({ 
  card, 
  isFaceUp = true, 
  onClick, 
  isPlayable = false,
  className = "" 
}: CardProps) => {
  return (
    <motion.div
      layoutId={card.id}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      whileHover={isPlayable ? { y: -20, scale: 1.05 } : {}}
      onClick={isPlayable ? onClick : undefined}
      className={`
        relative w-20 h-28 sm:w-24 sm:h-36 rounded-lg border-2 
        ${isFaceUp ? 'bg-white border-slate-200' : 'bg-blue-800 border-blue-600'}
        ${isPlayable ? 'cursor-pointer ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent' : 'cursor-default'}
        flex flex-col items-center justify-center select-none card-shadow
        ${className}
      `}
    >
      {isFaceUp ? (
        <>
          <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
            <span className={`text-sm sm:text-base font-bold ${['hearts', 'diamonds'].includes(card.suit) ? 'text-red-500' : 'text-slate-900'}`}>
              {card.rank}
            </span>
            <SuitIcon suit={card.suit} className="text-xs sm:text-sm" />
          </div>
          <div className="text-2xl sm:text-4xl">
            <SuitIcon suit={card.suit} />
          </div>
          <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180">
            <span className={`text-sm sm:text-base font-bold ${['hearts', 'diamonds'].includes(card.suit) ? 'text-red-500' : 'text-slate-900'}`}>
              {card.rank}
            </span>
            <SuitIcon suit={card.suit} className="text-xs sm:text-sm" />
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center p-2">
          <div className="w-full h-full border-2 border-blue-400/30 rounded-md flex items-center justify-center">
             <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-blue-400/20 rounded-full" />
          </div>
        </div>
      )}
    </motion.div>
  );
};

// --- Game Logic ---

type GameState = 'start' | 'playing' | 'choosing_suit' | 'game_over';
type Turn = 'player' | 'ai';

export default function App() {
  const [deck, setDeck] = useState<CardData[]>([]);
  const [playerHand, setPlayerHand] = useState<CardData[]>([]);
  const [aiHand, setAiHand] = useState<CardData[]>([]);
  const [discardPile, setDiscardPile] = useState<CardData[]>([]);
  const [activeSuit, setActiveSuit] = useState<Suit | null>(null);
  const [turn, setTurn] = useState<Turn>('player');
  const [gameState, setGameState] = useState<GameState>('start');
  const [winner, setWinner] = useState<Turn | null>(null);
  const [message, setMessage] = useState<string>("Welcome to Crazy Eights!");

  const [showHelp, setShowHelp] = useState(false);

  const topDiscard = discardPile[discardPile.length - 1];

  // Initialize Game
  const initGame = useCallback(() => {
    const newDeck = shuffle(createDeck());
    const pHand = newDeck.splice(0, 8);
    const aHand = newDeck.splice(0, 8);
    
    // Ensure the first discard is not an 8
    let firstDiscardIndex = 0;
    while (newDeck[firstDiscardIndex].rank === '8') {
      firstDiscardIndex++;
    }
    const firstDiscard = newDeck.splice(firstDiscardIndex, 1)[0];

    setPlayerHand(pHand);
    setAiHand(aHand);
    setDiscardPile([firstDiscard]);
    setDeck(newDeck);
    setActiveSuit(firstDiscard.suit);
    setTurn('player');
    setGameState('playing');
    setWinner(null);
    setMessage("Your turn! Match the suit or rank.");
  }, []);

  const isPlayable = useCallback((card: CardData) => {
    if (!topDiscard) return false;
    if (card.rank === '8') return true;
    return card.suit === activeSuit || card.rank === topDiscard.rank;
  }, [topDiscard, activeSuit]);

  const checkWin = useCallback((hand: CardData[], player: Turn) => {
    if (hand.length === 0) {
      setWinner(player);
      setGameState('game_over');
      if (player === 'player') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      return true;
    }
    return false;
  }, []);

  const playCard = useCallback((card: CardData, from: Turn) => {
    if (from === 'player') {
      const newHand = playerHand.filter(c => c.id !== card.id);
      setPlayerHand(newHand);
      setDiscardPile(prev => [...prev, card]);
      
      if (card.rank === '8') {
        setGameState('choosing_suit');
        setMessage("Crazy 8! Choose a new suit.");
      } else {
        setActiveSuit(card.suit);
        if (!checkWin(newHand, 'player')) {
          setTurn('ai');
          setMessage("AI is thinking...");
        }
      }
    } else {
      const newHand = aiHand.filter(c => c.id !== card.id);
      setAiHand(newHand);
      setDiscardPile(prev => [...prev, card]);
      
      if (card.rank === '8') {
        // AI logic for choosing suit: pick the suit it has the most of
        const suitCounts = newHand.reduce((acc, c) => {
          acc[c.suit] = (acc[c.suit] || 0) + 1;
          return acc;
        }, {} as Record<Suit, number>);
        
        const bestSuit = (Object.keys(suitCounts) as Suit[]).sort((a, b) => suitCounts[b] - suitCounts[a])[0] || 'hearts';
        setActiveSuit(bestSuit);
        setMessage(`AI played an 8 and chose ${bestSuit}!`);
      } else {
        setActiveSuit(card.suit);
      }

      if (!checkWin(newHand, 'ai')) {
        setTurn('player');
        setMessage("Your turn!");
      }
    }
  }, [playerHand, aiHand, checkWin]);

  const drawCard = useCallback((from: Turn) => {
    if (deck.length === 0) {
      // If deck is empty, we could reshuffle discard pile (except top card)
      if (discardPile.length > 1) {
        const newDeck = shuffle(discardPile.slice(0, -1));
        setDeck(newDeck);
        setDiscardPile([topDiscard]);
        setMessage("Reshuffling discard pile...");
        return;
      }
      setMessage("Draw pile is empty! Turn skipped.");
      setTurn(from === 'player' ? 'ai' : 'player');
      return;
    }

    const newDeck = [...deck];
    const card = newDeck.pop()!;
    setDeck(newDeck);

    if (from === 'player') {
      setPlayerHand(prev => [...prev, card]);
      if (isPlayable(card)) {
        setMessage("You drew a playable card!");
      } else {
        setMessage("You drew a card. No match.");
        setTimeout(() => {
          setTurn('ai');
          setMessage("AI's turn.");
        }, 1500);
      }
    } else {
      setAiHand(prev => [...prev, card]);
      if (isPlayable(card)) {
        setTimeout(() => playCard(card, 'ai'), 1000);
      } else {
        setTurn('player');
        setMessage("AI drew a card and couldn't play. Your turn!");
      }
    }
  }, [deck, discardPile, topDiscard, isPlayable, playCard]);

  // AI Turn Logic
  useEffect(() => {
    if (turn === 'ai' && gameState === 'playing') {
      const timer = setTimeout(() => {
        const playableCards = aiHand.filter(isPlayable);
        if (playableCards.length > 0) {
          // AI Strategy: Play an 8 if it's the only option, or randomly pick a valid card
          const nonEight = playableCards.find(c => c.rank !== '8');
          const cardToPlay = nonEight || playableCards[0];
          playCard(cardToPlay, 'ai');
        } else {
          drawCard('ai');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, gameState, aiHand, isPlayable, playCard, drawCard]);

  const handleSuitSelection = (suit: Suit) => {
    setActiveSuit(suit);
    setGameState('playing');
    setTurn('ai');
    setMessage(`You chose ${suit}. AI is thinking...`);
  };

  return (
    <div className="felt-table min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-8">
      
      {/* AI Hand */}
      <div className="w-full flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-white/60 mb-2">
          <Layers size={16} />
          <span className="text-sm font-medium uppercase tracking-wider">AI Opponent ({aiHand.length})</span>
        </div>
        <div className="flex justify-center -space-x-8 sm:-space-x-12 overflow-visible h-32 sm:h-40">
          {aiHand.map((card, idx) => (
            <Card key={card.id} card={card} isFaceUp={false} className="z-0" />
          ))}
        </div>
      </div>

      {/* Center Area: Draw & Discard */}
      <div className="flex flex-col items-center gap-6 my-8">
        <div className="flex items-center gap-8 sm:gap-16">
          {/* Draw Pile */}
          <div className="flex flex-col items-center gap-2">
            <div 
              onClick={() => turn === 'player' && gameState === 'playing' && drawCard('player')}
              className={`
                relative w-20 h-28 sm:w-24 sm:h-36 rounded-lg border-2 border-blue-600 bg-blue-800 
                flex items-center justify-center card-shadow
                ${turn === 'player' && gameState === 'playing' ? 'cursor-pointer hover:ring-4 hover:ring-blue-400 transition-all' : 'opacity-80'}
              `}
            >
              <div className="text-white/20 font-bold text-2xl">{deck.length}</div>
              {/* Stack effect */}
              <div className="absolute -top-1 -left-1 w-full h-full rounded-lg border-2 border-blue-600 bg-blue-800 -z-10" />
              <div className="absolute -top-2 -left-2 w-full h-full rounded-lg border-2 border-blue-600 bg-blue-800 -z-20" />
            </div>
            <span className="text-xs text-white/40 uppercase font-bold tracking-widest">Draw</span>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-28 sm:w-24 sm:h-36">
              <AnimatePresence mode="popLayout">
                {topDiscard && (
                  <Card 
                    key={topDiscard.id} 
                    card={topDiscard} 
                    className="absolute inset-0 z-10" 
                  />
                )}
              </AnimatePresence>
              {/* Previous cards in pile for visual depth */}
              {discardPile.length > 1 && (
                <div className="absolute inset-0 rotate-3 translate-x-1 translate-y-1 opacity-40">
                   <Card card={discardPile[discardPile.length - 2]} className="-z-10" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
               <span className="text-xs text-white/40 uppercase font-bold tracking-widest">Discard</span>
               {activeSuit && (
                 <div className="bg-white/10 px-2 py-0.5 rounded flex items-center gap-1">
                   <span className="text-[10px] text-white/60 uppercase">Suit:</span>
                   <SuitIcon suit={activeSuit} className="text-sm" />
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Message Banner */}
        <motion.div 
          key={message}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/40 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full flex items-center gap-3"
        >
          {turn === 'ai' ? (
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          ) : (
            <div className="w-2 h-2 bg-yellow-400 rounded-full" />
          )}
          <span className="text-sm sm:text-base font-medium text-white/90">{message}</span>
        </motion.div>
      </div>

      {/* Player Hand */}
      <div className="w-full flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-white/60">
          <Hand size={16} />
          <span className="text-sm font-medium uppercase tracking-wider">Your Hand ({playerHand.length})</span>
        </div>
        <div className="flex justify-center -space-x-6 sm:-space-x-10 overflow-visible h-36 sm:h-44 px-4 max-w-full overflow-x-auto no-scrollbar pb-4">
          {playerHand.map((card) => (
            <Card 
              key={card.id} 
              card={card} 
              isPlayable={turn === 'player' && gameState === 'playing' && isPlayable(card)}
              onClick={() => playCard(card, 'player')}
            />
          ))}
        </div>
      </div>

      {/* Modals & Overlays */}
      
      {/* Start Screen */}
      {gameState === 'start' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl"
          >
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
              <span className="text-4xl font-black text-white">8</span>
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">LEO疯狂8点</h1>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Match the suit or rank. Use 8s as wild cards to change the suit. First to clear their hand wins!
            </p>
            <button 
              onClick={initGame}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group"
            >
              START GAME
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      )}

      {/* Suit Picker Modal */}
      {gameState === 'choosing_suit' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-3xl shadow-2xl max-w-xs w-full"
          >
            <h2 className="text-slate-900 text-xl font-bold text-center mb-6">Choose New Suit</h2>
            <div className="grid grid-cols-2 gap-4">
              {SUITS.map(suit => (
                <button
                  key={suit}
                  onClick={() => handleSuitSelection(suit)}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <SuitIcon suit={suit} className="text-4xl mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold uppercase text-slate-500">{suit}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'game_over' && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-white/10 p-10 rounded-3xl max-w-sm w-full text-center shadow-2xl"
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${winner === 'player' ? 'bg-yellow-500' : 'bg-slate-700'}`}>
              {winner === 'player' ? <Trophy className="text-white" size={40} /> : <AlertCircle className="text-white" size={40} />}
            </div>
            <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">
              {winner === 'player' ? 'You Won!' : 'AI Won!'}
            </h2>
            <p className="text-slate-400 mb-8">
              {winner === 'player' ? 'Incredible strategy! You cleared your hand first.' : 'Better luck next time! The AI was too fast.'}
            </p>
            <button 
              onClick={initGame}
              className="w-full bg-white text-slate-950 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={20} />
              PLAY AGAIN
            </button>
          </motion.div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full"
          >
            <h2 className="text-2xl font-black mb-4 flex items-center gap-2">
              <Info className="text-blue-400" />
              HOW TO PLAY
            </h2>
            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <p>• Match the <span className="text-white font-bold">Suit</span> or <span className="text-white font-bold">Rank</span> of the card in the discard pile.</p>
              <p>• <span className="text-yellow-400 font-bold">8s are Wild!</span> Play them anytime to change the active suit.</p>
              <p>• If you can't play, <span className="text-blue-400 font-bold">Draw</span> a card from the deck.</p>
              <p>• First player to clear their hand wins the game!</p>
            </div>
            <button 
              onClick={() => setShowHelp(false)}
              className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all"
            >
              GOT IT
            </button>
          </motion.div>
        </div>
      )}

      {/* Help Button (Bottom Right) */}
      <button 
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white/80 transition-all z-40"
      >
        <Info size={20} />
      </button>

      {/* Restart Button (Top Right) */}
      <button 
        onClick={initGame}
        className="fixed top-4 right-4 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white/80 transition-all z-40"
      >
        <RotateCcw size={20} />
      </button>

    </div>
  );
}
