'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, ChevronDown, AlertTriangle } from 'lucide-react';
import { FaEthereum } from 'react-icons/fa';
import TradingAgentsPanel from '@/src/components/TradingAgentsPanel';
import TradeNotifications from '@/src/components/TradeNotifications';
import TradingSidebar from '@/src/components/TradingSidebar';
import { useTradingAgents } from '@/src/hooks/useTradingAgents';

interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const generateRugPullData = (): CandlestickData[] => {
  const data: CandlestickData[] = [];
  const startDate = new Date('2024-09-01');
  const endDate = new Date('2025-03-31');

  const daysDiff = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  let price = 1784.57 + Math.random() * 10;
  let previousPriceChange = 0;

  for (let i = 0; i <= daysDiff; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      continue;
    }

    let priceChange = 0;
    let volatility = 0;

    priceChange = (Math.random() - 0.45) * 2;
    volatility = 3;

    previousPriceChange = priceChange;

    price = Math.max(0.0005, price + priceChange);

    const open = price;
    const close = price + priceChange;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;

    let volume = Math.random() * 100;

    data.push({
      date: currentDate.toISOString().split('T')[0],
      open,
      high,
      close,
      low,
      volume,
    });
  }

  return data;
};

export default function CryptoChart() {
  const [data, setData] = useState<CandlestickData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [timeframe, setTimeframe] = useState<string>('1Y');
  const [isLive, setIsLive] = useState<boolean>(true);
  const [showAgents, setShowAgents] = useState<boolean>(true);
  const [userBalance, setUserBalance] = useState<number>(10000);
  const [userTokens, setUserTokens] = useState<number>(0);

  const [rugPullTriggered, setRugPullTriggered] = useState<boolean>(false);
  const [rugPullInProgress, setRugPullInProgress] = useState<boolean>(false);
  const [rugPullComplete, setRugPullComplete] = useState<boolean>(false);
  const [rugPullStage, setRugPullStage] = useState<number>(0);
  const [rugPullIntensity, setRugPullIntensity] = useState<number>(4);

  const {
    agents,
    trades,
    isRugPullScheduled,
    rugPullCountdown,
    generateMarketUpdate,
    scheduleRandomRugPull,
    triggerRugPull: triggerAgentRugPull,
    resetAfterRugPull,
  } = useTradingAgents(25);

  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const randomRugPullTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleAgent = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    const updatedAgents = agents.map((a) =>
      a.id === agentId ? { ...a, active: !a.active } : a,
    );
  };

  const handleBuy = (amount: number) => {
    const cost = amount * currentPrice;
    if (cost > userBalance) return;

    setUserBalance((prev) => prev - cost);
    setUserTokens((prev) => prev + amount);

    console.log(
      `Bought ${amount} tokens at $${currentPrice} for a total of $${cost}`,
    );
  };

  const handleSell = (amount: number) => {
    if (amount > userTokens) return;

    const revenue = amount * currentPrice;
    setUserBalance((prev) => prev + revenue);
    setUserTokens((prev) => prev - amount);

    console.log(
      `Sold ${amount} tokens at $${currentPrice} for a total of $${revenue}`,
    );
  };

  const triggerRugPull = () => {
    if (rugPullTriggered || rugPullInProgress || rugPullComplete) return;

    console.log('🚨 CASH OUT TRIGGERED 🚨');
    setRugPullTriggered(true);
    setRugPullStage(0);

    triggerAgentRugPull();

    console.log('Market state before cash out:', {
      currentPrice,
      lastCandles: data.slice(-5).map((d) => ({
        date: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      })),
    });
  };

  useEffect(() => {
    const rugPullData = generateRugPullData();
    setData(rugPullData);
    setCurrentPrice(rugPullData[rugPullData.length - 1].close);

    return () => {
      if (animationIntervalRef.current)
        clearInterval(animationIntervalRef.current);
      if (randomRugPullTimeoutRef.current)
        clearTimeout(randomRugPullTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isLive) {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      return;
    }

    animationIntervalRef.current = setInterval(() => {
      setData((prevData) => {
        if (prevData.length === 0) return prevData;

        const lastPoint = prevData[prevData.length - 1];
        const newDate = new Date(lastPoint.date);
        newDate.setDate(newDate.getDate() + 1);

        if (newDate.getDay() === 0) newDate.setDate(newDate.getDate() + 1);
        if (newDate.getDay() === 6) newDate.setDate(newDate.getDate() + 2);

        let priceChange = 0;
        let volatility = 0;
        let newVolume = 0;

        const marketUpdate = generateMarketUpdate(lastPoint.close);
        priceChange = marketUpdate.priceChange;
        volatility = marketUpdate.volatility;
        newVolume = marketUpdate.newVolume;

        if (rugPullTriggered && !rugPullComplete) {
          setRugPullInProgress(true);

          switch (rugPullStage) {
            case 0:
              priceChange = 0.0005 + Math.random() * 0.0003;
              volatility = 0.0003;
              newVolume = 150 + Math.random() * 100;
              console.log('Stage 0: Initial pump', {
                priceChange,
                newPrice: lastPoint.close + priceChange,
              });
              setRugPullStage(1);
              break;

            case 1:
              priceChange = 0.0006 + Math.random() * 0.0005;
              volatility = 0.0005;
              newVolume = 200 + Math.random() * 150;
              console.log('Stage 1: Continued pump', {
                priceChange,
                newPrice: lastPoint.close + priceChange,
              });
              setRugPullStage(2);
              break;

            case 2:
              priceChange = 0.0002 + Math.random() * 0.0003;
              volatility = 0.0008;
              newVolume = 300 + Math.random() * 200;
              console.log('Stage 2: Peak', {
                priceChange,
                newPrice: lastPoint.close + priceChange,
              });
              setRugPullStage(3);
              break;

            case 3:
              priceChange =
                -1 * rugPullIntensity -
                Math.random() * (rugPullIntensity * 0.5);
              volatility = rugPullIntensity * 0.5;
              newVolume = 100 + Math.random() * 500;
              console.log('Stage 3: Initial sell-off', {
                priceChange,
                newPrice: lastPoint.close + priceChange,
                rugPullIntensity,
              });
              setRugPullStage(4);
              break;

            case 4:
              priceChange =
                -1.5 * rugPullIntensity -
                Math.random() * (rugPullIntensity * 0.8);
              volatility = rugPullIntensity * 0.8;
              newVolume = 200 + Math.random() * 1000;
              console.log('Stage 4: THE CASH OUT', {
                priceChange,
                newPrice: lastPoint.close + priceChange,
                rugPullIntensity,
              });
              setRugPullStage(5);
              break;

            case 5:
              priceChange =
                -1.2 * rugPullIntensity -
                Math.random() * (rugPullIntensity * 0.6);
              volatility = rugPullIntensity * 0.6;
              newVolume = 150 + Math.random() * 800;
              console.log('Stage 5: Continued collapse', {
                priceChange,
                newPrice: lastPoint.close + priceChange,
                rugPullIntensity,
              });
              setRugPullStage(6);
              break;

            case 6:
              priceChange = (Math.random() - 0.6) * 0.0005;
              volatility = 0.0006;
              newVolume = 100 + Math.random() * 50;
              console.log('Stage 6: Aftermath', {
                priceChange,
                newPrice: lastPoint.close + priceChange,
              });
              setRugPullComplete(true);
              resetAfterRugPull();

              console.log('🔥 CASH OUT COMPLETE 🔥');
              console.log('Market state after cash out:', {
                finalPrice: lastPoint.close + priceChange,
                priceDropPercentage:
                  ((lastPoint.close + priceChange) / currentPrice - 1) * 100,
                rugPullSequence: prevData.slice(-6).map((d) => ({
                  date: d.date,
                  open: d.open,
                  close: d.close,
                  percentChange: (d.close / d.open - 1) * 100,
                })),
              });
              break;

            default:
              priceChange = (Math.random() - 0.5) * 2;
              volatility = 2;
              newVolume = 50 + Math.random() * 50;
          }
        }

        const newClose = Math.max(0.01, lastPoint.close + priceChange);
        const newOpen = lastPoint.close;
        const newHigh =
          Math.max(100, newOpen, newClose) + Math.random() * volatility;
        const newLow = Math.max(
          0.005,
          Math.min(newOpen, newClose) - Math.random() * volatility * 0.5,
        );

        const newPoint = {
          date: newDate.toISOString().split('T')[0],
          open: newOpen,
          high: newHigh,
          low: Math.max(0.5, newLow),
          close: newClose,
          volume: newVolume || Math.random() * 100,
        };

        setCurrentPrice(newClose);

        return [...prevData.slice(1), newPoint];
      });
    }, 10000);

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  }, [isLive, rugPullTriggered, rugPullStage, rugPullComplete, currentPrice]);

  useEffect(() => {
    if (data.length === 0) return;

    const canvas = document.getElementById('chart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (rugPullInProgress && !rugPullComplete && rugPullStage >= 3) {
      const opacity = 0.05 + Math.sin(Date.now() / 200) * 0.05;
      ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.strokeStyle = '#1e2530';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
      const y = i * (canvas.height / 5);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    let minPrice = Math.min(...data.map((d) => d.low));
    let maxPrice = Math.max(...data.map((d) => d.high));

    // Adjust padding for micro price changes
    const priceRange = maxPrice - minPrice;
    const padding = priceRange > 0.001 ? priceRange * 0.1 : 0.0005;
    minPrice = Math.max(0, minPrice - padding);
    maxPrice += padding;

    ctx.fillStyle = '#8f9ba8';
    ctx.font = '12px Arial';

    ctx.textAlign = 'right';

    for (let i = 0; i <= 5; i++) {
      const price = minPrice + ((maxPrice - minPrice) * (5 - i)) / 5;
      const y = i * (canvas.height / 5);
      ctx.fillText(price.toFixed(2), canvas.width - 10, y + 15);
    }

    let filteredData = data;
    if (timeframe !== 'All') {
      const now = new Date(data[data.length - 1].date);
      const startDate = new Date(now);

      switch (timeframe) {
        case '1D':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7D':
          startDate.setDate(now.getDate() - 7);
          break;
        case '1M':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '1Y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filteredData = data.filter((d) => new Date(d.date) >= startDate);
    }

    const rightPadding = 50;
    const candleWidth = Math.max(
      2,
      (canvas.width - 80 - rightPadding) / filteredData.length,
    );
    const candleSpacing = candleWidth * 0.1;

    if (isLive && filteredData.length > 1) {
      const gradientWidth = 100;
      const gradient = ctx.createLinearGradient(
        canvas.width - gradientWidth,
        0,
        canvas.width,
        0,
      );

      if (rugPullInProgress && rugPullStage >= 3 && !rugPullComplete) {
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0.1)');
      } else {
        gradient.addColorStop(0, 'rgba(46, 213, 115, 0)');
        gradient.addColorStop(1, 'rgba(46, 213, 115, 0.05)');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(
        canvas.width - gradientWidth,
        0,
        gradientWidth,
        canvas.height,
      );
    }

    filteredData.forEach((candle, i) => {
      const x = 40 + i * (candleWidth + candleSpacing);

      // Calculate price coordinates with proper scaling
      const priceToY = (price: number) => {
        return (
          canvas.height -
          20 -
          ((price - minPrice) / (maxPrice - minPrice)) * (canvas.height - 60)
        );
      };

      const open = priceToY(candle.open);
      const close = priceToY(candle.close);
      const high = priceToY(candle.high);
      const low = priceToY(candle.low);

      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, high);
      ctx.lineTo(x + candleWidth / 2, low);
      ctx.strokeStyle = candle.open > candle.close ? '#ff4976' : '#00c853';
      ctx.stroke();

      ctx.fillStyle = candle.open > candle.close ? '#ff4976' : '#00c853';
      const bodyHeight = Math.abs(open - close);
      const bodyY = Math.min(open, close);
      ctx.fillRect(x + 1, bodyY, candleWidth - 2, bodyHeight);

      if (isLive && i === filteredData.length - 1) {
        if (rugPullInProgress && rugPullStage >= 3 && !rugPullComplete) {
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;

          // Smooth pulse animation
          const pulsePhase = (Date.now() % 1000) / 1000;
          const pulseOpacity = 0.3 + Math.sin(pulsePhase * Math.PI * 2) * 0.2;

          ctx.save();
          ctx.globalAlpha = pulseOpacity;
          ctx.beginPath();
          ctx.roundRect(x + 1, bodyY, candleWidth - 2, bodyHeight, 4);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x + 1, bodyY, candleWidth - 2, bodyHeight, 4);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
      }
    });

    const volumeHeight = canvas.height * 0.15;
    const maxVolume = Math.max(...filteredData.map((d) => d.volume));

    ctx.globalAlpha = 0.5;
    filteredData.forEach((candle, i) => {
      const x = i * candleWidth;
      const height = (candle.volume / maxVolume) * volumeHeight;
      const y = canvas.height - height;

      if (
        rugPullInProgress &&
        i === filteredData.length - 1 &&
        rugPullStage >= 3 &&
        !rugPullComplete
      ) {
        ctx.fillStyle = '#ff4976';
      } else {
        ctx.fillStyle = '#2d3748';
      }

      ctx.beginPath();
      ctx.roundRect(x + 1, y, candleWidth - 2, height, 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    const currentPriceY =
      canvas.height -
      ((currentPrice - minPrice) / (maxPrice - minPrice)) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, currentPriceY);
    ctx.lineTo(canvas.width, currentPriceY);
    ctx.strokeStyle =
      rugPullInProgress && rugPullStage >= 3 && !rugPullComplete
        ? '#ff4976'
        : '#ffffff33';
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle =
      rugPullInProgress && rugPullStage >= 3 && !rugPullComplete
        ? '#ff4976'
        : isLive
        ? '#4caf50'
        : '#2d3748';
    ctx.fillRect(canvas.width - 70, currentPriceY - 12, 60, 24);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(currentPrice.toFixed(3), canvas.width - 40, currentPriceY + 4);

    ctx.fillStyle = '#8f9ba8';
    ctx.textAlign = 'center';
    ctx.font = '12px Arial';

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    let lastMonth = -1;

    filteredData.forEach((candle, i) => {
      const date = new Date(candle.date);
      const month = date.getMonth();
      const year = date.getFullYear();

      if (
        month !== lastMonth &&
        i % Math.floor(filteredData.length / 8) === 0
      ) {
        lastMonth = month;
        const x = i * candleWidth;
        ctx.fillText(
          `${months[month]} '${year.toString().slice(2)}`,
          x,
          canvas.height - 5,
        );
      }
    });

    if (isLive) {
      const now = Date.now();
      const pulseSize = 5 + Math.sin(now / 200) * 2;

      ctx.fillStyle =
        rugPullInProgress && !rugPullComplete ? '#ff4976' : '#4caf50';
      ctx.beginPath();
      ctx.arc(canvas.width - 20, 20, pulseSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [
    data,
    currentPrice,
    timeframe,
    isLive,
    rugPullTriggered,
    rugPullInProgress,
    rugPullComplete,
    rugPullStage,
  ]);

  return (
    <div className="space-y-4 flex flex-col items-center justify-center py-24">
      <div className="flex justify-between w-full px-52 gap-32 items-center">
        <div className="flex space-x-2 items-center justify-center">
          <FaEthereum className="text-foreground text-2xl" />
          <span className="text-white mr-16 text-xl font-semibold">
            ETH/USD
          </span>
          <Button
            variant="outline"
            className="bg-[#1e2530] border-0 text-white hover:bg-[#2a3441]"
          >
            Price
          </Button>
          <Button
            variant="outline"
            className="bg-[#1e2530] border-0 text-white hover:bg-[#2a3441] ml-2"
            onClick={() => setShowAgents(!showAgents)}
          >
            {showAgents ? 'Hide Agents' : 'Show Agents'}
          </Button>
        </div>

        <div
          className="flex items-center space-x-4"
          style={{ marginRight: '3rem' }}
        >
          {/* <FaEthereum className="h-6 w-6 text-blue-400" /> */}
          <Tabs
            defaultValue="1Y"
            className="bg-[#1e2530] rounded-md"
            onValueChange={setTimeframe}
          >
            <TabsList className="bg-transparent border-0">
              <TabsTrigger
                value="1D"
                className="data-[state=active]:bg-[#2a3441] data-[state=active]:text-white text-gray-400"
              >
                1D
              </TabsTrigger>
              <TabsTrigger
                value="7D"
                className="data-[state=active]:bg-[#2a3441] data-[state=active]:text-white text-gray-400"
              >
                7D
              </TabsTrigger>
              <TabsTrigger
                value="1M"
                className="data-[state=active]:bg-[#2a3441] data-[state=active]:text-white text-gray-400"
              >
                1M
              </TabsTrigger>
              <TabsTrigger
                value="1Y"
                className="data-[state=active]:bg-[#2a3441] data-[state=active]:text-white text-gray-400"
              >
                1Y
              </TabsTrigger>
              <TabsTrigger
                value="All"
                className="data-[state=active]:bg-[#2a3441] data-[state=active]:text-white text-gray-400"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="LOG"
                className="data-[state=active]:bg-[#2a3441] data-[state=active]:text-white text-gray-400"
              >
                LOG
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            className="bg-transparent border-0 text-gray-400 hover:bg-[#2a3441]"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={`bg-${
              isLive ? '[#2a3441] text-white' : 'transparent text-gray-400'
            } border-0 hover:bg-[#2a3441]`}
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? 'Live' : 'Static'}
          </Button>
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden pr-8">
        <div className="h-[700px] w-full relative flex">
          <div className="flex-1 relative" style={{ paddingRight: '3rem' }}>
            <canvas id="chart" className="w-full h-full"></canvas>

            {/* Trading agents panel */}
            {showAgents && (
              <TradingAgentsPanel
                agents={agents}
                trades={trades}
                isRugPullScheduled={isRugPullScheduled || rugPullInProgress}
                rugPullCountdown={rugPullCountdown}
                onToggleAgent={toggleAgent}
                onTriggerRugPull={triggerRugPull}
              />
            )}

            {/* Trade notifications */}
            <TradeNotifications trades={trades} maxNotifications={5} />

            {(rugPullInProgress || isRugPullScheduled) && !rugPullComplete && (
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className={`absolute bottom-4 right-4 bg-black/70 bg-opacity-70 p-3 rounded-lg border ${
                    rugPullStage >= 3 ||
                    (isRugPullScheduled &&
                      rugPullCountdown &&
                      rugPullCountdown < 10)
                      ? 'border-red-400 animate-pulse'
                      : 'border-orange-400'
                  }`}
                >
                  <div className="flex items-center">
                    <AlertTriangle
                      className={`h-5 w-5 mr-2 ${
                        rugPullStage >= 3 ||
                        (isRugPullScheduled &&
                          rugPullCountdown &&
                          rugPullCountdown < 10)
                          ? 'text-red-400'
                          : 'text-orange-400'
                      }`}
                    />
                    <span
                      className={`font-bold ${
                        rugPullStage >= 3 ||
                        (isRugPullScheduled &&
                          rugPullCountdown &&
                          rugPullCountdown < 10)
                          ? 'text-red-400'
                          : 'text-orange-400'
                      }`}
                    >
                      {rugPullStage >= 3 ||
                      (isRugPullScheduled &&
                        rugPullCountdown &&
                        rugPullCountdown < 10)
                        ? 'MAJOR SELL-OFF IN PROGRESS'
                        : 'UNUSUAL ACTIVITY DETECTED'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300 mt-1">
                    {rugPullStage >= 3 ||
                    (isRugPullScheduled &&
                      rugPullCountdown &&
                      rugPullCountdown < 10)
                      ? 'Extreme volatility detected. High risk of further price drops.'
                      : 'Monitoring unusual price movement and volume.'}
                  </div>
                </div>
              </div>
            )}

            {rugPullComplete && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-4 right-4 bg-black/70 bg-opacity-70 p-3 rounded-xl border border-red-400">
                  <div className="flex items-center ">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
                    <span className="font-bold text-red-400">
                      CASH OUT COMPLETE
                    </span>
                  </div>
                  <div className="text-xs text-gray-300 mt-1">
                    Token value has collapsed. Liquidity has been removed.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trading Sidebar */}
          <div className="ml-4 py-4 pr-4 w-64">
            <TradingSidebar
              currentPrice={currentPrice}
              onBuy={handleBuy}
              onSell={handleSell}
              isRugPullInProgress={
                rugPullInProgress ||
                (isRugPullScheduled &&
                  rugPullCountdown !== null &&
                  rugPullCountdown < 10)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
