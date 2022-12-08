type ChainMetadata = {
  name: string;
  id: number;
};

/* We might use something https://github.com/ethereum-lists/chains
 * if number of supported chains would grew up, this should remain sync with SUPPORTED_CHAIN_IDS of both dev site and prod
 */
const CHAINS: ChainMetadata[] = [
  {
    name: 'Mainnet',
    id: 1,
  },
  {
    name: 'Goerli',
    id: 5,
  },
  {
    name: 'Local Dev Chain',
    id: Number(process.env.REACT_APP_LOCAL_CHAIN_ID) || 0,
  },
];

const formatChainsList = (chains: string): number[] => {
  return chains.split(',').map(chainId => parseInt(chainId));
};

export const getChainMetadataById = (id: number): ChainMetadata | undefined => {
  return CHAINS.find(chain => chain.id === id);
};

export const getChainsWithMetadata = (chainIds: number[]): ChainMetadata[] => {
  return chainIds.map(chainId => CHAINS.find(chain => chain.id === chainId) as ChainMetadata);
};

export const getSupportedChains = () => {
  const dev =
    process.env.NODE_ENV !== 'production'
      ? [parseInt(process.env.REACT_APP_LOCAL_CHAIN_ID || '0')]
      : [];
  const supported = [...dev, ...formatChainsList(process.env.REACT_APP_SUPPORTED_CHAIN_IDS || '')];
  return supported;
};
