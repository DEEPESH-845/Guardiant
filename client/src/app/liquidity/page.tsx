'use client'

import { useState } from 'react'
import { ethers } from 'ethers'
import { useAccount, useProvider } from 'wagmi'
import ERC20Abi from '../../abis/ERC20.json'
import LiquidityPoolAbi from '../../abis/LiquidityPool.json'

export default function LiquidityPage() {
  const { address } = useAccount()
  const provider = useProvider()
  const signer = provider.getSigner()

  const [tokenAmt, setTokenAmt] = useState('1000')
  const [ethAmt, setEthAmt] = useState('0.1')
  const [status, setStatus] = useState<string | null>(null)

  const poolAddress = process.env.NEXT_PUBLIC_LIQUIDITY_POOL_ADDRESS!
  const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_LP_ADDRESS!

  const handleAddLiquidity = async () => {
    if (!address) {
      return setStatus('🔌 Connect your wallet first.')
    }
    try {
      setStatus('⏳ Approving token…')
      const tokenContract = new ethers.Contract(tokenAddress, ERC20Abi, signer)
      const approveTx = await tokenContract.approve(
        poolAddress,
        ethers.parseUnits(tokenAmt, 18)
      )
      await approveTx.wait()

      setStatus('⏳ Adding liquidity…')
      const poolContract = new ethers.Contract(poolAddress, LiquidityPoolAbi, signer)
      const addTx = await poolContract.addLiquidity(
        ethers.parseUnits(tokenAmt, 18),
        { value: ethers.parseEther(ethAmt) }
      )
      await addTx.wait()

      setStatus('✅ Liquidity added successfully!')
    } catch (err: any) {
      console.error(err)
      setStatus('❌ Error: ' + (err.message ?? err.toString()))
    }
  }

  return (
    <main className="p-8 max-w-lg mx-auto">
      <h1 className="text-3xl font-semibold mb-6">Add Liquidity</h1>
      <label className="block mb-2">Token Amount</label>
      <input
        type="text"
        value={tokenAmt}
        onChange={(e) => setTokenAmt(e.target.value)}
        className="w-full border rounded p-2 mb-4"
      />
      <label className="block mb-2">ETH Amount</label>
      <input
        type="text"
        value={ethAmt}
        onChange={(e) => setEthAmt(e.target.value)}
        className="w-full border rounded p-2 mb-6"
      />
      <button
        onClick={handleAddLiquidity}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Add Liquidity
      </button>
      {status && <p className="mt-4">{status}</p>}
    </main>
  )
}