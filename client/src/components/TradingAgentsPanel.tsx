'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, TrendingDown, BarChart3, Users } from 'lucide-react';

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
}

interface TradingAgentsPanelProps {
    agents: Agent[];
    trades: TradeAction[];
    isRugPullScheduled: boolean;
    rugPullCountdown: number | null;
    onToggleAgent: (agentId: string) => void;
    onTriggerRugPull: () => void;
}

export default function TradingAgentsPanel({
    agents,
    trades,
    isRugPullScheduled,
    rugPullCountdown,
    onToggleAgent,
    onTriggerRugPull,
}: TradingAgentsPanelProps) {
    const [showTrades, setShowTrades] = useState(false);

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(2)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(2)}K`;
        } else {
            return num.toFixed(2);
        }
    };

    return (
        <div className="absolute top-4 left-4 w-80 bg-black/80 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-3 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-200">Trading Agents</h3>
                </div>
                <div className="flex space-x-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setShowTrades(!showTrades)}
                    >
                        {showTrades ? 'Show Agents' : 'Show Trades'}
                    </Button>
                </div>
            </div>

            {isRugPullScheduled && (
                <div className="p-2 bg-red-900/30 border-b border-red-800 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-red-400" />
                    <div className="text-xs text-red-300">
                        {rugPullCountdown !== null
                            ? `Cash out imminent: ${rugPullCountdown}s remaining`
                            : 'Cash out in progress'}
                    </div>
                </div>
            )}

            {!showTrades ? (
                <div className="max-h-96 overflow-y-auto">
                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            className={`p-3 border-b border-gray-700 ${agent.active ? '' : 'opacity-50'}`}
                            style={{ borderLeftWidth: '4px', borderLeftColor: agent.color }}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="flex items-center">
                                        <span className="text-sm font-medium text-gray-200">{agent.name}</span>
                                        <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-gray-700 text-gray-300">
                                            {agent.type}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Strategy: {agent.strategy} (Aggressiveness: {agent.aggressiveness}/10)
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-6 px-2 text-xs ${agent.active ? 'text-green-400' : 'text-gray-500'}`}
                                    onClick={() => onToggleAgent(agent.id)}
                                >
                                    {agent.active ? 'Active' : 'Inactive'}
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                <div className="bg-gray-800/50 rounded p-1.5">
                                    <div className="text-gray-400">Balance</div>
                                    <div className="text-gray-200 font-medium">${formatNumber(agent.balance)}</div>
                                </div>
                                <div className="bg-gray-800/50 rounded p-1.5">
                                    <div className="text-gray-400">Tokens</div>
                                    <div className="text-gray-200 font-medium">{formatNumber(agent.tokens)}</div>
                                </div>
                            </div>

                            {agent.lastAction && (
                                <div className="mt-2 text-xs bg-gray-800/30 rounded p-1.5">
                                    <div className="flex items-center">
                                        <span className="text-gray-400">Last action:</span>
                                        <span
                                            className={`ml-1 flex items-center ${agent.lastAction.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}
                                        >
                                            {agent.lastAction.type === 'buy' ? (
                                                <>
                                                    <TrendingUp className="h-3 w-3 mr-1" />
                                                    Buy
                                                </>
                                            ) : (
                                                <>
                                                    <TrendingDown className="h-3 w-3 mr-1" />
                                                    Sell
                                                </>
                                            )}
                                        </span>
                                        <span className="ml-auto text-gray-400">
                                            {formatTimestamp(agent.lastAction.timestamp)}
                                        </span>
                                    </div>
                                    <div className="mt-1">
                                        <span className="text-gray-300">
                                            {formatNumber(agent.lastAction.amount)} tokens at ${agent.lastAction.price.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="max-h-96 overflow-y-auto">
                    {trades.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm">No trades yet</div>
                    ) : (
                        trades.slice().reverse().map((trade, index) => (
                            <div
                                key={index}
                                className="p-2 border-b border-gray-700 flex items-center"
                            >
                                <div
                                    className={`mr-2 p-1 rounded ${trade.type === 'buy' ? 'bg-green-900/30' : 'bg-red-900/30'}`}
                                >
                                    {trade.type === 'buy' ? (
                                        <TrendingUp className="h-3 w-3 text-green-400" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3 text-red-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <span className="text-xs font-medium text-gray-300">{trade.agentName}</span>
                                        <span className="text-xs text-gray-400">{formatTimestamp(trade.timestamp)}</span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {trade.type === 'buy' ? 'Bought' : 'Sold'} {formatNumber(trade.amount)} @ ${trade.price.toFixed(6)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <div className="p-3 bg-gray-800/50 border-t border-gray-700">
                <Button
                    variant="destructive"
                    size="sm"
                    className="w-full text-xs"
                    onClick={onTriggerRugPull}
                    disabled={isRugPullScheduled}
                >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {isRugPullScheduled ? 'Cash out in progress' : 'Trigger Cash out'}
                </Button>
            </div>
        </div>
    );
}