'use client';

import { useState } from 'react';
import { Connect } from '../../components/wallet/Connect';
import TransactionList from '../../components/wallet/TransactionList';
import BlurText from '../../components/animated/BlurText';
import { FaHistory } from 'react-icons/fa';
import Link from 'next/link';

export default function TransactionsPage() {
  return (
    <main className="bg-background w-screen min-h-screen px-4 md:px-8 lg:px-32 py-16 md:py-24">
      <div className="flex flex-col lg:flex-row items-center w-full justify-between gap-12 mb-16">
        <div>
          <BlurText
            text="Transaction"
            delay={0.01}
            animateBy="letters"
            direction="top"
            className="text-4xl md:text-6xl lg:text-7xl font-semibold mb-1 text-white"
          />
          <BlurText
            text="History"
            delay={0.05}
            animateBy="letters"
            direction="top"
            className="text-4xl md:text-6xl lg:text-7xl font-semibold mb-6 text-foreground"
          />

          <p className="opacity-40 mb-8 max-w-lg text-white">
            View all your wallet transaction history in one place. Track your
            incoming and outgoing transactions.
          </p>

          <div className="flex gap-4">
            <Connect />
          </div>
        </div>
        <div className="bg-foreground/10 p-8 rounded-full">
          <FaHistory className="text-white text-6xl" />
        </div>
      </div>

      <section className="mb-16">
        <h2 className="text-2xl font-semibold text-white mb-6">
          All Transactions
        </h2>
        <TransactionList limit={10} />
      </section>

      <footer className="text-center text-foreground mt-24 pb-8">
        <p className="text-white">
          © {new Date().getFullYear()} Secure Wallet Dashboard. All rights
          reserved.
        </p>
      </footer>
    </main>
  );
}
