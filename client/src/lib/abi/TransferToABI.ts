// Generated from contract/artifacts/contracts/Transfer.sol/TransferTo.json
// Regenerate after changing the contract: npx hardhat compile
export const TransferToABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address'
      }
    ],
    name: 'SafeERC20FailedOperation',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'sendToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;
