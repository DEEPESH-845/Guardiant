import React from 'react';
import { Connect } from './wallet/Connect';
import Link from 'next/link';

export default function Navbar() {
  return (
    <div className="flex items-center justify-between px-14 py-4">
      <h1 className="text-foreground text-2xl font-semibold">SaveMe</h1>
      <div className="flex gap-8 *:text-white *:px-2 *:transition *:duration-200 *:py-0.5 *:hover:bg-foreground *:hover:text-background *:rounded-lg *:opacity-75 *:font-semibold items-center justify-center">
        <Link href="/transfer">Send</Link>
        <Link href="/transactions">Transactions</Link>
        <Link href="/tokens">Tokens</Link>
        <Link href="/create">Create</Link>
        <Link href="/graph">Chart</Link>
      </div>
      <Connect />
    </div>
  );
}
