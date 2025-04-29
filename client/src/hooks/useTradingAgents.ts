import { useState, useEffect, useRef } from 'react';

interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradeAction {
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  agentId: string;
  agentName: string;
}

interface Agent {
  id: string;
  name: string;
  type: 'whale' | 'retail' | 'bot' | 'manipulator';
  balance: number;
  tokens: number;
  strategy: 'momentum' | 'contrarian' | 'random' | 'manipulative';
  aggressiveness: number;
  active: boolean;
  color: string;
  lastAction?: TradeAction;
  initialBalance?: number;
  initialTokens?: number;
}

export function useTradingAgents(initialPrice: number = 0.004) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [trades, setTrades] = useState<TradeAction[]>([]);
  const [isRugPullScheduled, setIsRugPullScheduled] = useState<boolean>(false);
  const [rugPullCountdown, setRugPullCountdown] = useState<number | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

  const agentIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rugPullTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const defaultAgents: Agent[] = [
      {
        id: 'whale1',
        name: 'Whale Trader',
        type: 'whale',
        balance: 1000000,
        tokens: 5000,
        strategy: 'manipulative',
        aggressiveness: 8,
        active: true,
        color: '#FF6B6B',
      },
      {
        id: 'bot1',
        name: 'Momentum Bot',
        type: 'bot',
        balance: 250000,
        tokens: 2500,
        strategy: 'momentum',
        aggressiveness: 6,
        active: true,
        color: '#4ECDC4',
      },
      {
        id: 'retail1',
        name: 'Retail Trader 1',
        type: 'retail',
        balance: 50000,
        tokens: 500,
        strategy: 'random',
        aggressiveness: 4,
        active: true,
        color: '#FFD166',
      },
      {
        id: 'manipulator1',
        name: 'Market Maker',
        type: 'manipulator',
        balance: 500000,
        tokens: 3000,
        strategy: 'manipulative',
        aggressiveness: 9,
        active: true,
        color: '#6A0572',
      },
      {
        id: 'bot2',
        name: 'Arbitrage Bot',
        type: 'bot',
        balance: 300000,
        tokens: 1500,
        strategy: 'contrarian',
        aggressiveness: 7,
        active: true,
        color: '#1A535C',
      },
    ];

    setAgents(defaultAgents);
  }, []);

  const scheduleRandomRugPull = () => {
    if (rugPullTimeoutRef.current) {
      clearTimeout(rugPullTimeoutRef.current);
    }

    // Longer initial delay (1-3 minutes) before the first rug pull can occur
    // This ensures users have time to observe normal market behavior first
    setTimeout(() => {
      // Random time between 1-12 minutes for the actual rug pull
      const rugPullTime = 60000 + Math.random() * 660000;

      setIsRugPullScheduled(true);
      setRugPullCountdown(null);

      rugPullTimeoutRef.current = setTimeout(() => {
        const countdownStart = 15;
        setRugPullCountdown(countdownStart);

        const countdownInterval = setInterval(() => {
          setRugPullCountdown((prev) => {
            if (prev === null || prev <= 0) {
              clearInterval(countdownInterval);
              triggerRugPull();

              setTimeout(() => {
                resetAfterRugPull(initialPrice);

                setTimeout(() => {
                  scheduleRandomRugPull();
                }, 60000 + Math.random() * 120000);
              }, 20000);

              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }, rugPullTime - 15000);
    }, 60000 + Math.random() * 120000); // 1-3 minute initial delay
  };

  const generateTrade = (
    agent: Agent,
    currentPrice: number,
    priceChange: number,
  ): TradeAction | null => {
    if (Math.random() > agent.aggressiveness / 10) {
      return null;
    }

    let tradeType: 'buy' | 'sell' = 'buy';
    let tradeAmount = 0;

    switch (agent.strategy) {
      case 'momentum':
        tradeType = priceChange >= 0 ? 'buy' : 'sell';
        tradeAmount =
          Math.abs(priceChange) *
          agent.aggressiveness *
          (Math.random() * 10 + 5);
        break;

      case 'contrarian':
        tradeType = priceChange >= 0 ? 'sell' : 'buy';
        tradeAmount =
          Math.abs(priceChange) *
          agent.aggressiveness *
          (Math.random() * 8 + 3);
        break;

      case 'random':
        tradeType = Math.random() > 0.5 ? 'buy' : 'sell';
        tradeAmount = Math.random() * agent.aggressiveness * 10;
        break;

      case 'manipulative':
        if (isRugPullScheduled && rugPullCountdown && rugPullCountdown < 10) {
          tradeType = 'sell';
          tradeAmount = agent.tokens * 0.8 * (Math.random() * 0.2 + 0.8);
        } else if (isRugPullScheduled) {
          tradeType = 'buy';
          tradeAmount =
            (agent.balance / currentPrice) * 0.1 * (Math.random() * 0.5 + 0.5);
        } else {
          const manipulationDirection = Math.random() > 0.7;
          tradeType = manipulationDirection ? 'buy' : 'sell';
          tradeAmount = manipulationDirection
            ? (agent.balance / currentPrice) *
              0.05 *
              (Math.random() * 0.5 + 0.5)
            : agent.tokens * 0.05 * (Math.random() * 0.5 + 0.5);
        }
        break;
    }

    if (tradeType === 'buy') {
      const maxPossibleAmount = agent.balance / currentPrice;
      tradeAmount = Math.min(tradeAmount, maxPossibleAmount);
    } else {
      tradeAmount = Math.min(tradeAmount, agent.tokens);
    }

    if (tradeAmount < 0.1) {
      return null;
    }

    return {
      type: tradeType,
      amount: tradeAmount,
      price: currentPrice,
      timestamp: Date.now(),
      agentId: agent.id,
      agentName: agent.name,
    };
  };

  const updateAgentBalance = (agentId: string, trade: TradeAction) => {
    setAgents((prevAgents) => {
      return prevAgents.map((agent) => {
        if (agent.id === agentId) {
          if (trade.type === 'buy') {
            return {
              ...agent,
              balance: agent.balance - trade.amount * trade.price,
              tokens: agent.tokens + trade.amount,
              lastAction: trade,
            };
          } else {
            return {
              ...agent,
              balance: agent.balance + trade.amount * trade.price,
              tokens: agent.tokens - trade.amount,
              lastAction: trade,
            };
          }
        }
        return agent;
      });
    });
  };

  const calculatePriceImpact = (
    trades: TradeAction[],
    currentPrice: number,
  ): number => {
    if (trades.length === 0) {
      return (Math.random() - 0.5) * 0.00003;
    }

    const buyVolume = trades
      .filter((t) => t.type === 'buy')
      .reduce((sum, t) => sum + t.amount * t.price, 0);

    const sellVolume = trades
      .filter((t) => t.type === 'sell')
      .reduce((sum, t) => sum + t.amount * t.price, 0);

    const netVolume = buyVolume - sellVolume;

    const marketLiquidity = currentPrice * (isRugPullScheduled ? 10000 : 8000);

    const impact = netVolume / (marketLiquidity + Math.abs(netVolume));

    const impactMultiplier = isRugPullScheduled ? 0.0005 : 0.0002;
    const scaledImpact = impact * impactMultiplier * currentPrice * 0.1;

    const randomNoise = (Math.random() - 0.5) * 0.3 * Math.abs(scaledImpact);

    return scaledImpact + randomNoise;
  };

  const generateMarketUpdate = (
    currentPrice: number,
  ): {
    newPrice: number;
    priceChange: number;
    newTrades: TradeAction[];
    newVolume: number;
    volatility: number;
  } => {
    const now = Date.now();
    const timeDiff = now - lastUpdateTime;
    setLastUpdateTime(now);

    let volatility = 0.0001 + Math.random() * 0.0003;
    const randomMovement = (Math.random() - 0.5) * volatility * 0.6;

    const newTrades: TradeAction[] = [];

    const minActiveTraders = Math.max(1, Math.floor(agents.length * 0.3));
    let activeTraderCount = 0;

    agents.forEach((agent) => {
      if (agent.active) {
        const baseTradeChance = isRugPullScheduled ? 0.6 : 0.8;
        const tradeChance =
          Math.random() *
          (1 + (isRugPullScheduled ? 0.3 : 0.1)) *
          baseTradeChance;

        const aggressivenessThreshold = isRugPullScheduled
          ? agent.aggressiveness / 20
          : agent.aggressiveness / 15;

        if (tradeChance < aggressivenessThreshold) {
          const trade = generateTrade(agent, currentPrice, randomMovement);
          if (trade) {
            newTrades.push(trade);
            updateAgentBalance(agent.id, trade);
            activeTraderCount++;
          }
        }
      }
    });

    if (activeTraderCount < minActiveTraders && !isRugPullScheduled) {
      const inactiveAgents = agents.filter(
        (agent) =>
          agent.active &&
          !newTrades.some((trade) => trade.agentId === agent.id),
      );

      while (
        activeTraderCount < minActiveTraders &&
        inactiveAgents.length > 0
      ) {
        const randomIndex = Math.floor(Math.random() * inactiveAgents.length);
        const agent = inactiveAgents[randomIndex];

        const tradeType = Math.random() > 0.5 ? 'buy' : 'sell';
        const tradeAmount =
          tradeType === 'buy'
            ? (agent.balance / currentPrice) * 0.01 * (Math.random() + 0.5)
            : agent.tokens * 0.01 * (Math.random() + 0.5);

        if (tradeAmount > 0.1) {
          const trade: TradeAction = {
            type: tradeType,
            amount: tradeAmount,
            price: currentPrice,
            timestamp: Date.now(),
            agentId: agent.id,
            agentName: agent.name,
          };

          newTrades.push(trade);
          updateAgentBalance(agent.id, trade);
          activeTraderCount++;
        }

        inactiveAgents.splice(randomIndex, 1);
      }
    }

    const tradeImpact = calculatePriceImpact(newTrades, currentPrice);

    let priceChange = randomMovement + tradeImpact;

    if (isRugPullScheduled) {
      if (rugPullCountdown && rugPullCountdown < 10) {
        // During final countdown, make price drop dramatically
        volatility *= 3;
        // Ensure price always goes down during cashout by using a larger negative value
        priceChange =
          -Math.abs(priceChange) - (Math.random() * 0.0012 + 0.0003);
      } else {
        // Even before final countdown, price should start decreasing
        volatility *= 1.5;
        // Ensure price always goes down by making priceChange negative
        priceChange =
          -Math.abs(priceChange) * 0.5 - (Math.random() * 0.0002 + 0.00005);
      }
    }

    const newPrice = Math.max(0.0001, currentPrice + priceChange);

    const newVolume = newTrades.reduce((sum, trade) => sum + trade.amount, 0);

    setTrades((prev) => [...prev, ...newTrades].slice(-100));

    return {
      newPrice,
      priceChange,
      newTrades,
      newVolume,
      volatility,
    };
  };

  const triggerRugPull = () => {
    setIsRugPullScheduled(true);

    setAgents((prevAgents) => {
      return prevAgents.map((agent) => {
        if (agent.type === 'manipulator' || agent.type === 'whale') {
          return {
            ...agent,
            strategy: 'manipulative',
            aggressiveness: 10,
          };
        } else if (agent.type === 'bot') {
          return {
            ...agent,
            strategy: Math.random() > 0.5 ? 'manipulative' : agent.strategy,
            aggressiveness: Math.min(10, agent.aggressiveness + 2),
          };
        }
        return agent;
      });
    });

    console.log('🚨 CASHOUT INITIATED 🚨');
    return true;
  };

  const resetAfterRugPull = (currentPrice: number = initialPrice) => {
    setIsRugPullScheduled(false);
    setRugPullCountdown(null);

    setAgents((prevAgents) => {
      return prevAgents.map((agent) => {
        let newStrategy = agent.strategy;
        let newAggressiveness = 0;

        if (agent.type === 'whale') {
          newStrategy = Math.random() > 0.6 ? 'manipulative' : 'momentum';
          newAggressiveness = Math.floor(Math.random() * 3) + 6;
        } else if (agent.type === 'bot') {
          newStrategy = Math.random() > 0.4 ? 'momentum' : 'contrarian';
          newAggressiveness = Math.floor(Math.random() * 3) + 5;
        } else if (agent.type === 'retail') {
          newStrategy = Math.random() > 0.3 ? 'random' : 'momentum';
          newAggressiveness = Math.floor(Math.random() * 3) + 4;
        } else if (agent.type === 'manipulator') {
          newStrategy = Math.random() > 0.3 ? 'manipulative' : 'momentum';
          newAggressiveness = Math.floor(Math.random() * 3) + 7;
        }

        return {
          ...agent,
          strategy: newStrategy,

          aggressiveness:
            newAggressiveness || Math.max(4, agent.aggressiveness - 1),

          active: true,
        };
      });
    });

    console.log('✅ Market returning to normal trading with enhanced activity');

    setTimeout(() => {
      const activeAgents = agents.filter((agent) => agent.active);
      const randomAgentCount = Math.floor(activeAgents.length * 0.5);

      for (let i = 0; i < randomAgentCount; i++) {
        const randomIndex = Math.floor(Math.random() * activeAgents.length);
        const agent = activeAgents[randomIndex];

        if (agent) {
          const tradeType = Math.random() > 0.7 ? 'buy' : 'sell';
          const tradeAmount =
            tradeType === 'buy'
              ? (agent.balance / currentPrice) * 0.05 * (Math.random() + 0.5)
              : agent.tokens * 0.03 * (Math.random() + 0.5);

          if (tradeAmount > 0.1) {
            const trade: TradeAction = {
              type: tradeType,
              amount: tradeAmount,
              price: currentPrice || 25,
              timestamp: Date.now(),
              agentId: agent.id,
              agentName: agent.name,
            };

            setTrades((prev) => [...prev, trade].slice(-100));
            updateAgentBalance(agent.id, trade);
          }
        }

        activeAgents.splice(randomIndex, 1);
      }
    }, 1000);
  };

  useEffect(() => {
    scheduleRandomRugPull();

    return () => {
      if (rugPullTimeoutRef.current) {
        clearTimeout(rugPullTimeoutRef.current);
      }
    };
  }, []);

  return {
    agents,
    trades,
    isRugPullScheduled,
    rugPullCountdown,
    generateMarketUpdate,
    scheduleRandomRugPull,
    triggerRugPull,
    resetAfterRugPull,
  };
}
