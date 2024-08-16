const SablierV2BatchAbi = [
  {
    inputs: [{ internalType: 'address', name: 'target', type: 'address' }],
    name: 'AddressEmptyCode',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'AddressInsufficientBalance',
    type: 'error',
  },
  { inputs: [], name: 'FailedInnerCall', type: 'error' },
  { inputs: [], name: 'SablierV2BatchLockup_BatchSizeZero', type: 'error' },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'SafeERC20FailedOperation',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'contract ISablierV2LockupDynamic', name: 'lockupDynamic', type: 'address' },
      { internalType: 'contract IERC20', name: 'asset', type: 'address' },
      {
        components: [
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint128', name: 'totalAmount', type: 'uint128' },
          { internalType: 'bool', name: 'cancelable', type: 'bool' },
          { internalType: 'bool', name: 'transferable', type: 'bool' },
          {
            components: [
              { internalType: 'uint128', name: 'amount', type: 'uint128' },
              { internalType: 'UD2x18', name: 'exponent', type: 'uint64' },
              { internalType: 'uint40', name: 'duration', type: 'uint40' },
            ],
            internalType: 'struct LockupDynamic.SegmentWithDuration[]',
            name: 'segments',
            type: 'tuple[]',
          },
          {
            components: [
              { internalType: 'address', name: 'account', type: 'address' },
              { internalType: 'UD60x18', name: 'fee', type: 'uint256' },
            ],
            internalType: 'struct Broker',
            name: 'broker',
            type: 'tuple',
          },
        ],
        internalType: 'struct BatchLockup.CreateWithDurationsLD[]',
        name: 'batch',
        type: 'tuple[]',
      },
    ],
    name: 'createWithDurationsLD',
    outputs: [{ internalType: 'uint256[]', name: 'streamIds', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'contract ISablierV2LockupLinear', name: 'lockupLinear', type: 'address' },
      { internalType: 'contract IERC20', name: 'asset', type: 'address' },
      {
        components: [
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint128', name: 'totalAmount', type: 'uint128' },
          { internalType: 'bool', name: 'cancelable', type: 'bool' },
          { internalType: 'bool', name: 'transferable', type: 'bool' },
          {
            components: [
              { internalType: 'uint40', name: 'cliff', type: 'uint40' },
              { internalType: 'uint40', name: 'total', type: 'uint40' },
            ],
            internalType: 'struct LockupLinear.Durations',
            name: 'durations',
            type: 'tuple',
          },
          {
            components: [
              { internalType: 'address', name: 'account', type: 'address' },
              { internalType: 'UD60x18', name: 'fee', type: 'uint256' },
            ],
            internalType: 'struct Broker',
            name: 'broker',
            type: 'tuple',
          },
        ],
        internalType: 'struct BatchLockup.CreateWithDurationsLL[]',
        name: 'batch',
        type: 'tuple[]',
      },
    ],
    name: 'createWithDurationsLL',
    outputs: [{ internalType: 'uint256[]', name: 'streamIds', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'contract ISablierV2LockupTranched',
        name: 'lockupTranched',
        type: 'address',
      },
      { internalType: 'contract IERC20', name: 'asset', type: 'address' },
      {
        components: [
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint128', name: 'totalAmount', type: 'uint128' },
          { internalType: 'bool', name: 'cancelable', type: 'bool' },
          { internalType: 'bool', name: 'transferable', type: 'bool' },
          {
            components: [
              { internalType: 'uint128', name: 'amount', type: 'uint128' },
              { internalType: 'uint40', name: 'duration', type: 'uint40' },
            ],
            internalType: 'struct LockupTranched.TrancheWithDuration[]',
            name: 'tranches',
            type: 'tuple[]',
          },
          {
            components: [
              { internalType: 'address', name: 'account', type: 'address' },
              { internalType: 'UD60x18', name: 'fee', type: 'uint256' },
            ],
            internalType: 'struct Broker',
            name: 'broker',
            type: 'tuple',
          },
        ],
        internalType: 'struct BatchLockup.CreateWithDurationsLT[]',
        name: 'batch',
        type: 'tuple[]',
      },
    ],
    name: 'createWithDurationsLT',
    outputs: [{ internalType: 'uint256[]', name: 'streamIds', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'contract ISablierV2LockupDynamic', name: 'lockupDynamic', type: 'address' },
      { internalType: 'contract IERC20', name: 'asset', type: 'address' },
      {
        components: [
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint128', name: 'totalAmount', type: 'uint128' },
          { internalType: 'bool', name: 'cancelable', type: 'bool' },
          { internalType: 'bool', name: 'transferable', type: 'bool' },
          { internalType: 'uint40', name: 'startTime', type: 'uint40' },
          {
            components: [
              { internalType: 'uint128', name: 'amount', type: 'uint128' },
              { internalType: 'UD2x18', name: 'exponent', type: 'uint64' },
              { internalType: 'uint40', name: 'timestamp', type: 'uint40' },
            ],
            internalType: 'struct LockupDynamic.Segment[]',
            name: 'segments',
            type: 'tuple[]',
          },
          {
            components: [
              { internalType: 'address', name: 'account', type: 'address' },
              { internalType: 'UD60x18', name: 'fee', type: 'uint256' },
            ],
            internalType: 'struct Broker',
            name: 'broker',
            type: 'tuple',
          },
        ],
        internalType: 'struct BatchLockup.CreateWithTimestampsLD[]',
        name: 'batch',
        type: 'tuple[]',
      },
    ],
    name: 'createWithTimestampsLD',
    outputs: [{ internalType: 'uint256[]', name: 'streamIds', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'contract ISablierV2LockupLinear', name: 'lockupLinear', type: 'address' },
      { internalType: 'contract IERC20', name: 'asset', type: 'address' },
      {
        components: [
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint128', name: 'totalAmount', type: 'uint128' },
          { internalType: 'bool', name: 'cancelable', type: 'bool' },
          { internalType: 'bool', name: 'transferable', type: 'bool' },
          {
            components: [
              { internalType: 'uint40', name: 'start', type: 'uint40' },
              { internalType: 'uint40', name: 'cliff', type: 'uint40' },
              { internalType: 'uint40', name: 'end', type: 'uint40' },
            ],
            internalType: 'struct LockupLinear.Timestamps',
            name: 'timestamps',
            type: 'tuple',
          },
          {
            components: [
              { internalType: 'address', name: 'account', type: 'address' },
              { internalType: 'UD60x18', name: 'fee', type: 'uint256' },
            ],
            internalType: 'struct Broker',
            name: 'broker',
            type: 'tuple',
          },
        ],
        internalType: 'struct BatchLockup.CreateWithTimestampsLL[]',
        name: 'batch',
        type: 'tuple[]',
      },
    ],
    name: 'createWithTimestampsLL',
    outputs: [{ internalType: 'uint256[]', name: 'streamIds', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'contract ISablierV2LockupTranched',
        name: 'lockupTranched',
        type: 'address',
      },
      { internalType: 'contract IERC20', name: 'asset', type: 'address' },
      {
        components: [
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint128', name: 'totalAmount', type: 'uint128' },
          { internalType: 'bool', name: 'cancelable', type: 'bool' },
          { internalType: 'bool', name: 'transferable', type: 'bool' },
          { internalType: 'uint40', name: 'startTime', type: 'uint40' },
          {
            components: [
              { internalType: 'uint128', name: 'amount', type: 'uint128' },
              { internalType: 'uint40', name: 'timestamp', type: 'uint40' },
            ],
            internalType: 'struct LockupTranched.Tranche[]',
            name: 'tranches',
            type: 'tuple[]',
          },
          {
            components: [
              { internalType: 'address', name: 'account', type: 'address' },
              { internalType: 'UD60x18', name: 'fee', type: 'uint256' },
            ],
            internalType: 'struct Broker',
            name: 'broker',
            type: 'tuple',
          },
        ],
        internalType: 'struct BatchLockup.CreateWithTimestampsLT[]',
        name: 'batch',
        type: 'tuple[]',
      },
    ],
    name: 'createWithTimestampsLT',
    outputs: [{ internalType: 'uint256[]', name: 'streamIds', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export default SablierV2BatchAbi;