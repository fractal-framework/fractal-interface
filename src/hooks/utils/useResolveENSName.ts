import { useState, useCallback } from 'react';
import { Address, createPublicClient, http, isAddress, getAddress, zeroAddress } from 'viem';
import { normalize } from 'viem/ens';
import { supportedNetworks } from '../../providers/NetworkConfig/useNetworkConfigStore';

type ResolveENSNameReturnType = {
  resolvedAddress: Address;
  isValid: boolean;
};
export const useResolveENSName = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const resolveENSName = useCallback(async (input: string): Promise<ResolveENSNameReturnType> => {
    setIsLoading(true);

    const returnedResult: ResolveENSNameReturnType = {
      resolvedAddress: zeroAddress,
      isValid: false,
    };

    if (input === '') {
      throw new Error('ENS name is empty');
    }

    if (isAddress(input)) {
      // @dev if its a valid address, its valid on all networks
      returnedResult.isValid = true;
      returnedResult.resolvedAddress = getAddress(input);
      setIsLoading(false);
      return returnedResult;
    }

    // @dev if its not an address, try to resolve as possible ENS name on all networks
    let normalizedName: string;
    try {
      normalizedName = normalize(input);
    } catch {
      setIsLoading(false);
      return returnedResult;
    }
    const mainnet = supportedNetworks.find(network => network.chain.id === 1);
    if (!mainnet) {
      throw new Error('Mainnet not found');
    }

    const mainnetPublicClient = createPublicClient({
      chain: mainnet.chain,
      transport: http(mainnet.rpcEndpoint, { batch: true }),
    });
    const resolvedAddress = await mainnetPublicClient.getEnsAddress({ name: normalizedName });
    if (resolvedAddress) {
      returnedResult.resolvedAddress = resolvedAddress;
      returnedResult.isValid = true;
    }

    setIsLoading(false);
    return returnedResult;
  }, []);
  return { resolveENSName, isLoading };
};
