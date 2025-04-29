'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface TradingSidebarProps {
    currentPrice: number;
    onBuy: (amount: number) => void;
    onSell: (amount: number) => void;
    isRugPullInProgress?: boolean;
}

export default function TradingSidebar({
    currentPrice,
    onBuy,
    onSell,
    isRugPullInProgress = false
}: TradingSidebarProps) {
    const [amount, setAmount] = useState<string>('');
    const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
    const [priceClass, setPriceClass] = useState<string>('text-white');
    const [previousPrice, setPreviousPrice] = useState<number>(currentPrice);

    // Handle price change animation
    useEffect(() => {
        if (currentPrice > previousPrice) {
            setPriceClass('text-green-400');
        } else if (currentPrice < previousPrice) {
            setPriceClass('text-red-400');
        }

        const timer = setTimeout(() => {
            setPriceClass('text-white');
        }, 1000);

        setPreviousPrice(currentPrice);
        return () => clearTimeout(timer);
    }, [currentPrice, previousPrice]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow only numbers and decimal point
        const value = e.target.value;
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setAmount(value);
        }
    };

    const handleTransaction = () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        if (transactionType === 'buy') {
            onBuy(numAmount);
        } else {
            onSell(numAmount);
        }

        // Clear input after transaction
        setAmount('');
    };

    return (
        <div className=" p-4 w-64 h-full flex flex-col items-center justify-center shadow-lg">


            <div className="mb-6 text-center">
                <div className="text-sm text-gray-400 mb-1">Current Price</div>
                <div className={`text-3xl font-bold transition-colors duration-300 ${priceClass}`}>
                    ${currentPrice.toFixed(6)}
                </div>
            </div>

            <div className="mb-4">
                <div className="flex justify-between mt-6 mb-24">
                    <button
                        className={`flex-1 py-2 rounded-l-md flex items-center justify-center ${transactionType === 'buy' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                        onClick={() => setTransactionType('buy')}
                    >
                        <TrendingUp className="h-4 w-4 mr-1" />
                        BUY
                    </button>
                    <button
                        className={`flex-1 py-2 rounded-r-md flex items-center justify-center ${transactionType === 'sell' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                        onClick={() => setTransactionType('sell')}
                    >
                        <TrendingDown className="h-4 w-4 mr-1" />
                        SELL
                    </button>
                </div>

                <div className="relative mb-3">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="Amount"
                        className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                        disabled={isRugPullInProgress}
                    />
                </div>

                <Button
                    className={`w-full ${transactionType === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={handleTransaction}
                    disabled={!amount || parseFloat(amount) <= 0 || isRugPullInProgress}
                >
                    {transactionType === 'buy' ? 'Buy Tokens' : 'Sell Tokens'}
                </Button>
            </div>

            {isRugPullInProgress && (
                <div className="text-center text-red-400 text-sm mt-2">
                    <p>Trading suspended during cashout</p>
                </div>
            )}

            <div className="mt-6 text-xs text-gray-500">
                <p className="mb-1">Market Status: {isRugPullInProgress ? 'Unstable' : 'Normal'}</p>
                <p>Note: All trades are simulated for educational purposes only.</p>
            </div>
        </div>
    );
}