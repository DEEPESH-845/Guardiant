'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowRight, FaPlus, FaCoins } from 'react-icons/fa';
import { SiEthereum } from 'react-icons/si';
import { Connect } from '../../components/wallet/Connect';
import { useWalletContext } from '../../context/WalletContext';
import { useTokenCreation } from '../../hooks/useTokenCreation';
import { toast, Toaster } from 'react-hot-toast';

export default function CreateTokenPage() {
  const [step, setStep] = useState(1);
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [initialSupply, setInitialSupply] = useState('1000000');
  const [tokenImage, setTokenImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isConnected, address } = useWalletContext();
  const {
    createToken,
    saveTokenImage,
    isLoading,
    isPending,
    isConfirming,
    isConfirmed,
    isError,
    error,
    newTokenAddress,
    creationData,
  } = useTokenCreation();

  // Combined effect to handle token creation success and database saving
  useEffect(() => {
    if (isConfirmed && newTokenAddress) {
      toast.success(`Token created successfully! Address: ${newTokenAddress}`);

      // Save token data to the database
      const saveTokenData = async () => {
        try {
          // Get base64 data if image exists
          const base64Data = tokenImage ? tokenImage.split(',')[1] : '';

          console.log('Saving token to database:', {
            tokenAddress: newTokenAddress,
            tokenName: tokenName || creationData?.name,
            tokenSymbol: tokenSymbol || creationData?.symbol,
            initialSupply:
              initialSupply || creationData?.initialSupply?.toString(),
            hasImage: !!base64Data,
          });

          const response = await fetch('/api/savecoin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageBuffer: base64Data,
              tokenAddress: newTokenAddress,
              tokenName: tokenName || creationData?.name,
              tokenSymbol: tokenSymbol || creationData?.symbol,
              initialSupply:
                initialSupply || creationData?.initialSupply?.toString(),
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Database save error:', errorData);
            throw new Error(
              `Failed to save: ${errorData.error || 'Unknown error'}`,
            );
          }

          const data = await response.json();
          console.log('Token saved to database:', data);
          toast.success(
            tokenImage
              ? 'Token image saved successfully!'
              : 'Token saved to database!',
          );
        } catch (err) {
          console.error('Failed to save token data:', err);
          toast.error(
            `Database error: ${
              err instanceof Error ? err.message : 'Unknown error'
            }`,
          );
        }
      };

      saveTokenData();
    }
  }, [
    isConfirmed,
    newTokenAddress,
    tokenImage,
    tokenName,
    tokenSymbol,
    initialSupply,
    creationData,
  ]);

  // Add debug function to test MongoDB connection directly
  const testDatabaseConnection = async () => {
    try {
      toast.loading('Testing database connection...');
      const response = await fetch('/api/savecoin/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      console.log('Database test result:', data);
      toast.dismiss();
      toast.success('Database connection successful!');
    } catch (err) {
      console.error('Database test error:', err);
      toast.dismiss();
      toast.error(
        `Database connection failed: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
      );
    }
  };

  // Function to manually save token data
  const manualSaveToken = async () => {
    if (!tokenName || !tokenSymbol) {
      toast.error('Please provide token name and symbol first');
      return;
    }

    try {
      toast.loading('Manually saving token data...');

      const mockTokenAddress = `0x${Math.random()
        .toString(16)
        .substring(2, 42)}` as `0x${string}`;
      const base64Data = tokenImage ? tokenImage.split(',')[1] : '';

      const response = await fetch('/api/savecoin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBuffer: base64Data,
          tokenAddress: mockTokenAddress,
          tokenName: tokenName,
          tokenSymbol: tokenSymbol,
          initialSupply: initialSupply,
        }),
      });

      const data = await response.json();
      console.log('Manual token save result:', data);
      toast.dismiss();
      toast.success(`Test token saved with address: ${mockTokenAddress}`);
    } catch (err) {
      console.error('Manual token save error:', err);
      toast.dismiss();
      toast.error(
        `Failed to save test token: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
      );
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setTokenImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleNextStep = () => {
    if (step === 1 && tokenName) {
      setStep(2);
    } else if (step === 2 && tokenSymbol) {
      setStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenName || !tokenSymbol) {
      toast.error('Please provide both token name and symbol');
      return;
    }

    try {
      // Create token through our hook
      createToken(tokenName, tokenSymbol, initialSupply);
      toast.success('Token creation initiated!');
    } catch (err) {
      console.error('Error creating token:', err);
      toast.error('Failed to create token');
    }
  };

  const fadeInUpVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
        ease: 'easeIn',
      },
    },
  };

  // Custom button style
  const ActionButton = ({
    onClick,
    disabled,
    children,
    fullWidth = false,
  }: {
    onClick: (e?: React.MouseEvent) => void;
    disabled?: boolean;
    children: React.ReactNode;
    fullWidth?: boolean;
  }) => {
    return (
      <motion.button
        initial={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        whileHover={{
          backgroundColor: 'var(--foreground)',
          color: 'var(--background)',
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        disabled={disabled || isLoading}
        onClick={onClick}
        className={`${
          fullWidth ? 'w-full' : 'flex-1'
        } flex items-center justify-center gap-2 bg-foreground/10 cursor-pointer text-foreground py-3 rounded-full font-medium transition-all ${
          disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? (
          <span>
            {isPending
              ? 'Waiting for approval...'
              : isConfirming
              ? 'Confirming transaction...'
              : 'Processing...'}
          </span>
        ) : (
          children
        )}
      </motion.button>
    );
  };

  const ArrowIcon = () => {
    return (
      <motion.div
        initial={{ x: 0 }}
        whileHover={{ x: 4 }}
        transition={{ type: 'spring', stiffness: 400 }}
      >
        <FaArrowRight />
      </motion.div>
    );
  };

  return (
    <main className="bg-background text-white min-h-screen flex flex-col items-center justify-center px-4">
      <Toaster />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <SiEthereum className="text-foreground" />
              Create Token
            </h2>
          </motion.div>
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className={`h-2 w-8 rounded-full ${
                  i === step ? 'bg-foreground' : 'bg-white/10'
                }`}
                animate={{
                  scale: i === step ? [1, 1.05, 1] : 1,
                }}
                transition={{
                  duration: 0.5,
                  repeat: i === step ? Infinity : 0,
                  repeatType: 'reverse',
                }}
              />
            ))}
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={fadeInUpVariant}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white/5 rounded-3xl p-6 shadow-lg"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium mb-4">Token Name</h3>
                  <input
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g. My Awesome Token"
                    className="w-full bg-white/5 rounded-xl px-4 py-3 outline-none"
                  />
                  <p className="text-xs text-foreground/60 mt-2">
                    This will be the official name of your token
                  </p>
                </div>

                <ActionButton
                  onClick={handleNextStep}
                  disabled={!tokenName}
                  fullWidth
                >
                  <span>Continue</span>
                  <ArrowIcon />
                </ActionButton>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={fadeInUpVariant}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white/5 rounded-3xl p-6 shadow-lg"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium mb-4">Token Symbol</h3>
                  <input
                    type="text"
                    value={tokenSymbol}
                    onChange={(e) =>
                      setTokenSymbol(e.target.value.toUpperCase())
                    }
                    placeholder="e.g. MAT"
                    maxLength={5}
                    className="w-full bg-white/5 rounded-xl px-4 py-3 outline-none"
                  />
                  <p className="text-xs text-foreground/60 mt-2">
                    The ticker symbol for your token (max 5 characters)
                  </p>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePreviousStep}
                    className="flex-1 bg-white/5 text-white rounded-full py-3 transition-all"
                  >
                    Back
                  </motion.button>

                  <ActionButton
                    onClick={handleNextStep}
                    disabled={!tokenSymbol}
                  >
                    <span>Continue</span>
                    <ArrowIcon />
                  </ActionButton>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              variants={fadeInUpVariant}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white/5 rounded-3xl p-6 shadow-lg"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium mb-4">Token Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-foreground/70 mb-1 block">
                        Initial Supply
                      </label>
                      <input
                        type="text"
                        value={initialSupply}
                        onChange={(e) => setInitialSupply(e.target.value)}
                        placeholder="e.g. 1000000"
                        className="w-full bg-white/5 rounded-xl px-4 py-3 outline-none"
                      />
                      <p className="text-xs text-foreground/60 mt-2">
                        Initial token supply (all tokens will be sent to your
                        wallet)
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-foreground/70 mb-1 block">
                        Token Image (Optional)
                      </label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleImageClick}
                        className="w-full h-40 flex flex-col items-center justify-center bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
                      >
                        {tokenImage ? (
                          <div className="relative">
                            <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-foreground/30 ring-offset-2 ring-offset-background">
                              <img
                                src={tokenImage}
                                alt="Token"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <p className="text-foreground text-sm mt-2 text-center">
                              Change Image
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2">
                              <FaPlus className="text-foreground text-xl" />
                            </div>
                            <p className="text-foreground text-sm">
                              Upload token icon
                            </p>
                          </>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between bg-white/5 rounded-xl px-4 py-5">
                  <h3 className="text-lg font-medium mb-3">Token Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground/70">Name</span>
                      <span className="text-white font-medium">
                        {tokenName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-foreground/70">Symbol</span>
                      <span className="text-white font-medium">
                        {tokenSymbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-foreground/70">Supply</span>
                      <span className="text-white font-medium">
                        {initialSupply}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-foreground/70">Image</span>
                      <span className="text-white font-medium">
                        {tokenImage ? '✓ Uploaded' : 'Not uploaded (optional)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePreviousStep}
                    className="flex-1 bg-white/5 text-white rounded-full py-3 transition-all"
                  >
                    Back
                  </motion.button>

                  <ActionButton onClick={handleSubmit}>
                    <FaCoins className="text-sm" />
                    <span>Create Token</span>
                  </ActionButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 p-4 bg-red-500/10 rounded-xl"
          >
            <p className="text-red-400 text-sm text-center">
              Please connect your wallet to create a token
            </p>
          </motion.div>
        )}

        {isError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-red-500/10 rounded-xl"
          >
            <p className="text-red-400 text-sm text-center">
              Error creating token: {error?.message || 'Unknown error'}
            </p>
          </motion.div>
        )}

        {isConfirmed && newTokenAddress && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-green-500/10 rounded-xl"
          >
            <p className="text-green-400 text-sm text-center">
              Token created successfully! Address: {newTokenAddress}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Database Test Button for debugging */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-6 flex justify-center gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={testDatabaseConnection}
          className="text-xs bg-white/10 hover:bg-white/20 text-foreground/60 py-2 px-4 rounded-lg transition-colors"
        >
          Test Database Connection
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={manualSaveToken}
          className="text-xs bg-white/10 hover:bg-white/20 text-foreground/60 py-2 px-4 rounded-lg transition-colors"
        >
          Save Test Token
        </motion.button>
      </motion.div>
    </main>
  );
}
