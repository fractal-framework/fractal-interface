import { useCallback } from 'react';
import { Address, http, createPublicClient } from 'viem';
import { DAOQueryDocument } from '../../../.graphclient';
import graphQLClient from '../../graphql';
import {
  supportedNetworks,
  useNetworkConfigStore,
} from '../../providers/NetworkConfig/useNetworkConfigStore';
import { createAccountSubstring } from './useGetAccountName';

export const getSafeName = async (
  subgraph: { space: number; slug: string; version: string },
  address: Address,
) => {
  const mainnet = supportedNetworks.find(network => network.chain.id === 1);
  if (!mainnet) {
    throw new Error('Mainnet not found');
  }

  const mainnetPublicClient = createPublicClient({
    chain: mainnet.chain,
    transport: http(mainnet.rpcEndpoint, { batch: true }),
  });
  const ensName = await mainnetPublicClient.getEnsName({ address });
  if (ensName) {
    return ensName;
  }

  const subgraphName = (
    await graphQLClient.query({
      query: DAOQueryDocument,
      variables: { safeAddress: address },
      context: {
        subgraphSpace: subgraph.space,
        subgraphSlug: subgraph.slug,
        subgraphVersion: subgraph.version,
      },
    })
  ).data?.daos[0]?.name;

  if (subgraphName) {
    return subgraphName;
  }

  return createAccountSubstring(address);
};

export const useGetSafeName = (chainId?: number) => {
  const { getConfigByChainId } = useNetworkConfigStore();

  return {
    getSafeName: useCallback(
      (address: Address) => {
        return getSafeName(getConfigByChainId(chainId).subgraph, address);
      },
      [chainId, getConfigByChainId],
    ),
  };
};
