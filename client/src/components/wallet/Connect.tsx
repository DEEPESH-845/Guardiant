'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWalletContext } from '../../context/WalletContext';

export const Connect = () => {
  const { isConnected } = useWalletContext();

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');
        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
            className="font-sans font-medium"
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="bg-background text-foreground border border-foreground rounded-full px-6  cursor-pointer py-2 font-medium transition-all min-w-[8rem] text-center hover:bg-foreground hover:text-background hover:translate-y-[-1px] hover:shadow-md hover:shadow-foreground/15"
                  >
                    Connect Wallet
                  </button>
                );
              }
              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="bg-[rgba(235,87,87,0.1)] text-[#eb5757] border border-[#eb5757] rounded-full px-6  font-medium transition-all min-w-[8rem] text-center hover:bg-[rgba(235,87,87,0.2)]"
                  >
                    Wrong network
                  </button>
                );
              }
              return (
                <div className="flex gap-3 bg-[rgba(5,16,8,0.7)] p-1 rounded-xl ">
                  <button onClick={openChainModal} type="button">
                    <img
                      alt={chain.name ?? 'Chain icon'}
                      src={chain.iconUrl}
                      className="w-5 h-5"
                    />
                  </button>
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="bg-foreground text-background font-mono text-sm rounded-lg px-4 py-2 font-medium transition-all min-w-[8rem] text-center"
                  >
                    {account.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};
