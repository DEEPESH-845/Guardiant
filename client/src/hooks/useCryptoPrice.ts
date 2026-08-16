import { useState, useEffect } from 'react';

interface CryptoPrice {
  id: number;
  symbol: string;
  name: string;
  price: number;
  percent_change_24h: number;
}

export const useCryptoPrice = () => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // True when /api/crypto served placeholder numbers because CoinMarketCap was
  // unreachable or unconfigured. Callers must label these as not live.
  const [isFallback, setIsFallback] = useState(false);

  const fetchPrices = async () => {
    try {
      const response = await fetch('/api/crypto');

      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }

      const data = await response.json();
      const formattedPrices = data.data.map((coin: any) => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        price: coin.quote.USD.price,
        percent_change_24h: coin.quote.USD.percent_change_24h,
      }));

      setPrices(formattedPrices);
      setIsFallback(Boolean(data.fallback));
      setLoading(false);
    } catch (err) {
      console.error('API Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  return { prices, loading, error, isFallback };
};
