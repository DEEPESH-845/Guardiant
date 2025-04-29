'use client';
import BlurText from '../components/animated/BlurText';
import CircularText from '../components/animated/Circular';
import { FaEthereum, FaShieldAlt, FaRocket, FaLock } from 'react-icons/fa';
import { Connect } from '../components/wallet/Connect';
import RotatingText from '../components/animated/Rotate';

export default function Home() {
  return (
    <main className="bg-background w-screen min-h-screen px-4 md:px-8 lg:px-32 py-16 md:py-32">
      <div className="flex flex-col lg:flex-row items-center w-full justify-between gap-12 mb-24">
        <div>
          <BlurText
            text="Save your funds from"
            delay={0.01}
            animateBy="letters"
            direction="top"
            className="text-4xl md:text-6xl lg:text-7xl font-semibold mb-1 text-white"
          />
          <BlurText
            text="rug-pull"
            delay={0.05}
            animateBy="letters"
            direction="top"
            className="text-4xl md:text-6xl lg:text-7xl font-semibold mb-6 text-foreground"
          />

          <p className="opacity-40 mb-8 max-w-lg text-white">
            The Self-Destructing Web3 Contract that automatically protects your
            funds from suspicious activity.
          </p>

          <Connect />
        </div>
        <div className="relative">
          <CircularText
            text="SELF*DESTRUCTING*CONTRACTS*"
            onHover="goBonkers"
            spinDuration={20}
            className="font-normal"
          />
          <FaEthereum className="text-white opacity-30 absolute text-7xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>

      <section className="mb-24 mt-48">
        <h3 className="text-3xl font-semibold text-white mb-5">
          How we{' '}
          <RotatingText
            texts={['do it?', 'find it?', 'snap it']}
            mainClassName="px-2 sm:px-2 md:px-3 bg-foreground inline-flex text-black overflow-hidden py-1 justify-center rounded-lg"
            staggerFrom={'last'}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-120%' }}
            staggerDuration={0.025}
            splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            rotationInterval={2000}
          />
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-foreground/10 group hover:bg-foreground p-3 rounded-full  transition-all duration-150">
                <FaShieldAlt className="text-white text-xl group-hover:text-background transition-all duration-150" />
              </div>
              <h3 className="text-xl font-medium text-white">
                Real-Time Anomaly Detection
              </h3>
            </div>
            <p className="text-muted-foreground text-white">
              Automatically scans the blockchain for any suspicious activity or
              anomaly.
            </p>
          </div>

          <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-foreground/10 group hover:bg-foreground p-3 rounded-full  transition-all duration-150">
                <FaRocket className="text-white text-xl group-hover:text-background transition-all duration-150" />
              </div>
              <h3 className="text-xl font-medium text-white">
                Self-Destruct Mechanism
              </h3>
            </div>
            <p className="text-muted-foreground text-white">
              If an anomaly is detected, the contract automatically "cashes out"
              and self-destructs to protect your funds.
            </p>
          </div>

          <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-foreground/10 group hover:bg-foreground p-3 rounded-full  transition-all duration-150">
                <FaLock className="text-white text-xl group-hover:text-background transition-all duration-150" />
              </div>
              <h3 className="text-xl font-medium text-white">
                Smart Contract Security
              </h3>
            </div>
            <p className="text-muted-foreground text-white">
              Enhanced protection using Web3 principles and Solidity's
              selfdestruct function.
            </p>
          </div>

          <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-foreground/10 group hover:bg-foreground p-3 rounded-full  transition-all duration-150">
                <FaEthereum className="text-white text-xl group-hover:text-background transition-all duration-150" />
              </div>
              <h3 className="text-xl font-medium text-white">
                Transparent & Trustworthy
              </h3>
            </div>
            <p className="text-muted-foreground text-white">
              Built on blockchain for transparent and tamper-proof operations.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="mb-24">
        <BlurText
          text="Why Choose Us"
          delay={0.01}
          animateBy="letters"
          direction="top"
          className="text-3xl md:text-4xl font-semibold mb-8 text-white"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
            <h3 className="text-xl font-medium text-white mb-4">
              Peace of Mind
            </h3>
            <p className="text-muted-foreground text-white">
              No need to constantly monitor; the app reacts to anomalies in
              real-time.
            </p>
          </div>

          <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
            <h3 className="text-xl font-medium text-white mb-4">
              Automated Risk Mitigation
            </h3>
            <p className="text-muted-foreground text-white">
              Protect your investments without manual intervention.
            </p>
          </div>

          <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
            <h3 className="text-xl font-medium text-white mb-4">Web3 Native</h3>
            <p className="text-muted-foreground text-white">
              Fully decentralized, secure, and transparent.
            </p>
          </div>
        </div>
      </section>

      {/* Get Started Section */}
      <section className="mb-16">
        <BlurText
          text="Get Started Today"
          delay={0.01}
          animateBy="letters"
          direction="top"
          className="text-3xl md:text-4xl font-semibold mb-8 text-white"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
            <h3 className="text-xl font-medium text-white mb-4">
              Simple Integration
            </h3>
            <p className="text-muted-foreground text-white">
              Easy to add to your decentralized applications.
            </p>
          </div>

          <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
            <h3 className="text-xl font-medium text-white mb-4">
              Secure & Scalable
            </h3>
            <p className="text-muted-foreground text-white">
              Built to handle large-scale blockchain transactions with minimal
              overhead.
            </p>
          </div>

          <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
            <h3 className="text-xl font-medium text-white mb-4">Free Trial</h3>
            <p className="text-muted-foreground text-white">
              Try our service risk-free and see the power of automated security.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Connect />
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-muted-foreground">
        <p className="text-lg font-medium text-white mb-2">
          Stay Safe. Stay Decentralized.
        </p>
        <p className="text-white">
          © {new Date().getFullYear()} Self-Destructing Contracts. All rights
          reserved.
        </p>
      </footer>
    </main>
  );
}
