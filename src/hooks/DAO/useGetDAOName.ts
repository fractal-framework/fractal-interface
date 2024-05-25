import { FractalRegistry } from '@fractal-framework/fractal-contracts';
import { useCallback, useEffect, useState } from 'react';
import { Address, PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';
import { getEventRPC } from '../../helpers';
import { useFractal } from '../../providers/App/AppProvider';
import { FractalContracts } from '../../types';
import { createAccountSubstring } from '../utils/useDisplayName';

const getDAOName = async ({
  address,
  registryName,
  publicClient,
  baseContracts,
}: {
  address: Address;
  registryName?: string | null;
  publicClient: PublicClient | undefined;
  baseContracts: FractalContracts | undefined;
}) => {
  if (!publicClient) {
    throw new Error('Public client not available');
  }

  const ensName = await publicClient.getEnsName({ address: address });
  if (ensName) {
    return ensName;
  }

  if (registryName) {
    return registryName;
  }

  if (!baseContracts) {
    throw new Error('Base contracts not set');
  }

  const rpc = getEventRPC<FractalRegistry>(baseContracts.fractalRegistryContract);
  const events = await rpc.queryFilter(rpc.filters.FractalNameUpdated(address));
  const latestEvent = events.pop();

  if (!latestEvent) {
    return createAccountSubstring(address);
  }

  return latestEvent.args.daoName;
};

const useGetDAOName = ({
  address,
  registryName,
}: {
  address: Address;
  registryName?: string | null;
}) => {
  const publicClient = usePublicClient();
  const { baseContracts } = useFractal();

  const [daoName, setDaoName] = useState<string>();
  useEffect(() => {
    getDAOName({ address, registryName, publicClient, baseContracts }).then(name => {
      setDaoName(name);
    });
  }, [address, baseContracts, publicClient, registryName]);

  return { daoName };
};

const useGetDAONameDeferred = () => {
  const publicClient = usePublicClient();
  const { baseContracts } = useFractal();
  return {
    getDAOName: useCallback(
      ({ address, registryName }: { address: Address; registryName?: string | null }) =>
        getDAOName({ address, registryName, publicClient, baseContracts }),
      [baseContracts, publicClient],
    ),
  };
};

export { useGetDAOName, useGetDAONameDeferred };