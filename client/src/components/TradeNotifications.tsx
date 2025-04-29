'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TradeAction {
    type: 'buy' | 'sell';
    amount: number;
    price: number;
    timestamp: number;
    agentId: string;
    agentName: string;
}

interface TradeNotificationsProps {
    trades: TradeAction[];
    maxNotifications?: number;
}

export default function TradeNotifications({
    trades,
    maxNotifications = 5
}: TradeNotificationsProps) {
    const [visibleNotifications, setVisibleNotifications] = useState<(TradeAction & { id: number })[]>([]);
    const [nextId, setNextId] = useState(1);

    useEffect(() => {
        // Only process if there are trades
        if (trades.length === 0) return;

        // Get the most recent trade
        const latestTrade = trades[trades.length - 1];

        // Add a unique ID to the notification
        const notification = { ...latestTrade, id: nextId };
        setNextId(prev => prev + 1);

        // Add to visible notifications
        setVisibleNotifications(prev => {
            const updated = [...prev, notification].slice(-maxNotifications);
            return updated;
        });

        // Auto-remove notifications after 5 seconds
        const timer = setTimeout(() => {
            setVisibleNotifications(prev =>
                prev.filter(n => n.id !== notification.id)
            );
        }, 5000);

        return () => clearTimeout(timer);
    }, [trades, maxNotifications]);

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(2)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(2)}K`;
        } else {
            return num.toFixed(2);
        }
    };

    if (visibleNotifications.length === 0) return null;

    return (
        <div className="absolute bottom-4 left-4 space-y-2 max-w-xs">
            {visibleNotifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`flex items-center p-2 rounded-lg animate-fadeIn ${notification.type === 'buy'
                        ? 'bg-green-900/80 border border-green-700'
                        : 'bg-red-900/80 border border-red-700'}`}
                    style={{
                        animation: 'fadeIn 0.3s ease-in-out',
                    }}
                >
                    <div className="p-1.5 rounded-full bg-black/30 mr-2">
                        {notification.type === 'buy' ? (
                            <TrendingUp className="h-4 w-4 text-green-400" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                    </div>
                    <div>
                        <div className="text-xs font-medium text-white">
                            {notification.agentName} {notification.type === 'buy' ? 'bought' : 'sold'} {formatNumber(notification.amount)} tokens
                        </div>
                        <div className="text-xs text-gray-300">
                            Price: ${notification.price.toFixed(6)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}