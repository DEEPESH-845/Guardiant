import { ChevronDown, Info } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#051008] text-white p-4">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#0a1e11] rounded-md flex items-center">
              <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium">
                Last 24 hours <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-[#0a1e11] rounded-md flex items-center">
              <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-[#8ddca4]">
                Trending{' '}
                <span className="bg-[#8ddca4] text-[#051008] rounded-full w-5 h-5 flex items-center justify-center text-xs ml-1">
                  4
                </span>
              </button>
              <button className="px-3 py-2 text-sm font-medium">5M</button>
              <button className="px-3 py-2 text-sm font-medium">1H</button>
              <button className="px-3 py-2 text-sm font-medium">6H</button>
              <button className="px-3 py-2 text-sm font-medium bg-[#0f2a19] rounded-md mx-1">
                24H
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="bg-[#0a1e11] px-4 py-2 rounded-md text-sm font-medium">
              Top
            </button>
            <button className="bg-[#0a1e11] px-4 py-2 rounded-md text-sm font-medium">
              Gainers
            </button>
            <button className="bg-[#0a1e11] px-4 py-2 rounded-md text-sm font-medium">
              New Pairs
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-[#0a1e11] text-sm">
              <tr>
                <th className="text-left py-3 px-4 font-medium">TOKEN</th>
                <th className="text-right py-3 px-4 font-medium">
                  <div className="flex items-center justify-end gap-1">
                    PRICE <Info className="h-4 w-4 text-gray-400" />
                  </div>
                </th>
                <th className="text-right py-3 px-4 font-medium">AGE</th>
                <th className="text-right py-3 px-4 font-medium">TXNS</th>
                <th className="text-right py-3 px-4 font-medium">VOLUME</th>
                <th className="text-right py-3 px-4 font-medium">MAKERS</th>
                <th className="text-right py-3 px-4 font-medium">5M</th>
                <th className="text-right py-3 px-4 font-medium">1H</th>
                <th className="text-right py-3 px-4 font-medium">6H</th>
                <th className="text-right py-3 px-4 font-medium">24H</th>
                <th className="text-right py-3 px-4 font-medium">LIQUIDITY</th>
                <th className="text-right py-3 px-4 font-medium">MCAP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0a1e11]">
              {cryptoData.map((crypto, index) => (
                <tr
                  key={crypto.id}
                  className="hover:bg-[#0a1e11] cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">
                        #{index + 1}
                      </span>
                      <div className="flex items-center">
                        <div className="relative w-6 h-6 mr-1">
                          <Image
                            src={`/placeholder.svg?height=24&width=24`}
                            alt={crypto.name}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        </div>
                        <div className="relative w-6 h-6 -ml-2">
                          <Image
                            src={`/placeholder.svg?height=24&width=24`}
                            alt="Chain"
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">{crypto.name}</span>
                        <span className="text-gray-400 ml-1 text-xs">/SOL</span>
                      </div>
                      {crypto.tag && (
                        <span className="text-xs bg-[#0f2a19] text-[#8ddca4] px-1.5 py-0.5 rounded">
                          {crypto.tag}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-3 px-4">${crypto.price}</td>
                  <td className="text-right py-3 px-4">{crypto.age}</td>
                  <td className="text-right py-3 px-4">
                    {crypto.txns.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4">${crypto.volume}</td>
                  <td className="text-right py-3 px-4">
                    {crypto.makers.toLocaleString()}
                  </td>
                  <td
                    className={`text-right py-3 px-4 ${getPercentageClass(
                      crypto.fiveMin,
                    )}`}
                  >
                    {formatPercentage(crypto.fiveMin)}
                  </td>
                  <td
                    className={`text-right py-3 px-4 ${getPercentageClass(
                      crypto.oneHour,
                    )}`}
                  >
                    {formatPercentage(crypto.oneHour)}
                  </td>
                  <td
                    className={`text-right py-3 px-4 ${getPercentageClass(
                      crypto.sixHours,
                    )}`}
                  >
                    {formatPercentage(crypto.sixHours)}
                  </td>
                  <td
                    className={`text-right py-3 px-4 ${getPercentageClass(
                      crypto.twentyFourHours,
                    )}`}
                  >
                    {formatPercentage(crypto.twentyFourHours)}
                  </td>
                  <td className="text-right py-3 px-4">{crypto.liquidity}</td>
                  <td className="text-right py-3 px-4">{crypto.mcap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getPercentageClass(value: number): string {
  if (value > 0) return 'text-[#8ddca4]';
  if (value < 0) return 'text-red-500';
  return 'text-gray-400';
}

function formatPercentage(value: number): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

const cryptoData = [
  {
    id: 1,
    name: 'Monkeys',
    price: '0.0006595',
    age: '7h',
    txns: 96390,
    volume: '7.8M',
    makers: 28347,
    fiveMin: -2.45,
    oneHour: -63.42,
    sixHours: 45.2,
    twentyFourHours: 1.86,
    liquidity: '$93K',
    mcap: '$659K',
  },
  {
    id: 2,
    name: 'KvK',
    price: '0.0009478',
    age: '15h',
    txns: 80148,
    volume: '8.7M',
    makers: 12100,
    fiveMin: 10.8,
    oneHour: 17.57,
    sixHours: 197,
    twentyFourHours: 1.797,
    liquidity: '$114K',
    mcap: '$947K',
  },
  {
    id: 3,
    name: 'DARK',
    price: '0.002702',
    age: '1d',
    txns: 96187,
    volume: '15.2M',
    makers: 15357,
    fiveMin: 3.07,
    oneHour: 10.34,
    sixHours: -25.53,
    twentyFourHours: 31.82,
    liquidity: '$209K',
    mcap: '$2.7M',
  },
  {
    id: 4,
    name: 'SBW',
    price: '0.0001095',
    age: '6h',
    txns: 43244,
    volume: '3.3M',
    makers: 7425,
    fiveMin: 5.79,
    oneHour: -39.43,
    sixHours: 67.33,
    twentyFourHours: 121,
    liquidity: '$35K',
    mcap: '$109K',
  },
  {
    id: 5,
    name: 'Figure',
    price: '0.005391',
    age: '4d',
    txns: 26323,
    volume: '5.0M',
    makers: 5492,
    fiveMin: 4.24,
    oneHour: 26.61,
    sixHours: 25.86,
    twentyFourHours: 44.36,
    liquidity: '$281K',
    mcap: '$5.3M',
  },
  {
    id: 6,
    name: 'titcoin',
    tag: '100',
    price: '0.02889',
    age: '29d',
    txns: 19931,
    volume: '5.2M',
    makers: 5101,
    fiveMin: -1.35,
    oneHour: 6.62,
    sixHours: -5.7,
    twentyFourHours: -17.65,
    liquidity: '$1.2M',
    mcap: '$27.8M',
  },
  {
    id: 7,
    name: 'WWE',
    tag: '300',
    price: '0.0001927',
    age: '3h',
    txns: 141344,
    volume: '1.1M',
    makers: 136108,
    fiveMin: 12.12,
    oneHour: -22.78,
    sixHours: 292,
    twentyFourHours: 292,
    liquidity: '$42K',
    mcap: '$192K',
  },
  {
    id: 8,
    name: 'BOUNCE',
    price: '0.0006022',
    age: '19h',
    txns: 35540,
    volume: '2.6M',
    makers: 5023,
    fiveMin: -5.19,
    oneHour: 1.22,
    sixHours: 117,
    twentyFourHours: 1.069,
    liquidity: '$79K',
    mcap: '$602K',
  },
];
