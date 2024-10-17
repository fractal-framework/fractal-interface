import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback, useEffect, useState } from 'react';
import { Address, PublicClient, getContract } from 'viem';
import { usePublicClient } from 'wagmi';
import { demoData } from '../DAO/loaders/loadDemoData';
import { createAccountSubstring } from './useDisplayName';

export const getSafeNameFallback = async (
  address: Address,
  fractalRegistry: Address,
  publicClient: PublicClient | undefined,
) => {
  if (!publicClient || !publicClient.chain) {
    return;
  }

  const fractalRegistryContract = getContract({
    abi: abis.FractalRegistry,
    address: fractalRegistry,
    client: publicClient,
  });

  const events = await fractalRegistryContract.getEvents.FractalNameUpdated(
    { daoAddress: address },
    { fromBlock: 0n },
  );

  const latestEvent = events.pop();

  if (latestEvent?.args.daoName) {
    return latestEvent.args.daoName;
  } else if (publicClient.chain && demoData[publicClient.chain.id]) {
    const demo = demoData[publicClient.chain.id][address];
    if (demo && demo.name) {
      return demo.name;
    }
  }
};

type GetAccountNameFallback = () => Promise<string | undefined>;

const getAccountName = async ({
  address,
  publicClient,
  getAccountNameFallback,
}: {
  address: Address;
  publicClient: PublicClient | undefined;
  getAccountNameFallback?: GetAccountNameFallback;
}) => {
  if (!publicClient || !publicClient.chain) {
    throw new Error('Public client not available');
  }

  const ensName = await publicClient.getEnsName({ address }).catch((error: Error) => {
    if (error.name === 'ChainDoesNotSupportContract') {
      // Sliently fail, this is fine.
      // https://github.com/wevm/viem/discussions/781
    } else {
      throw error;
    }
  });

  if (ensName) {
    return ensName;
  }

  if (getAccountNameFallback) {
    return (await getAccountNameFallback()) ?? createAccountSubstring(address);
  }

  return createAccountSubstring(address);
};

const useGetAccountName = ({
  address,
  chainId,
  getAccountNameFallback,
}: {
  address: Address;
  getAccountNameFallback?: GetAccountNameFallback;
  chainId?: number;
}) => {
  const publicClient = usePublicClient({ chainId });

  const [accountName, setAccountName] = useState<string>();
  useEffect(() => {
    getAccountName({ address, publicClient, getAccountNameFallback }).then(setAccountName);
  }, [address, publicClient, getAccountNameFallback]);

  return { accountName };
};

const useGetAccountNameDeferred = () => {
  const publicClient = usePublicClient();

  return {
    getAccountName: useCallback(
      (address: Address, getAccountNameFallback?: GetAccountNameFallback) =>
        getAccountName({ address, publicClient, getAccountNameFallback }),
      [publicClient],
    ),
  };
};

export { useGetAccountName, useGetAccountNameDeferred };
