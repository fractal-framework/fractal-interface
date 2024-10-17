import { useLazyQuery } from '@apollo/client';
import { useCallback } from 'react';
import { isAddress, Address, getAddress } from 'viem';
import { usePublicClient } from 'wagmi';
import { DAO, DAOQueryDocument, DAOQueryQuery } from '../../../../.graphclient';
import { logError } from '../../../helpers/errorLogging';
import { useSafeAPI } from '../../../providers/App/hooks/useSafeAPI';
import { useNetworkConfig } from '../../../providers/NetworkConfig/NetworkConfigProvider';
import { FractalNode, Node, WithError } from '../../../types';
import { mapChildNodes } from '../../../utils/hierarchy';
import { getSafeNameFallback, useGetAccountNameDeferred } from '../../utils/useGetAccountName';
import { loadDemoData } from './loadDemoData';
import { useFractalModules } from './useFractalModules';

export const useLoadDAONode = () => {
  const safeAPI = useSafeAPI();
  const { getAccountName } = useGetAccountNameDeferred();
  const lookupModules = useFractalModules();
  const {
    chain,
    subgraph,
    contracts: { fractalRegistry },
  } = useNetworkConfig();
  const [getDAOInfo] = useLazyQuery(DAOQueryDocument, {
    context: {
      subgraphSpace: subgraph.space,
      subgraphSlug: subgraph.slug,
      subgraphVersion: subgraph.version,
    },
  });

  const publicClient = usePublicClient();

  const formatDAOQuery = useCallback(
    (result: { data?: DAOQueryQuery }, _daoAddress: Address) => {
      const demo = loadDemoData(chain, _daoAddress, result);
      if (!demo.data) {
        return;
      }
      const { daos } = demo.data;
      const dao = daos[0];
      if (dao) {
        const { parentAddress, name, snapshotENS } = dao;

        const currentNode: Node = {
          nodeHierarchy: {
            parentAddress,
            childNodes: mapChildNodes(dao as DAO),
          },
          daoName: name as string,
          daoAddress: _daoAddress,
          daoSnapshotENS: snapshotENS as string,
        };
        return currentNode;
      }
      return;
    },
    [chain],
  );

  const loadDao = useCallback(
    async (daoAddress: string): Promise<FractalNode | WithError> => {
      if (isAddress(daoAddress) && safeAPI) {
        try {
          const graphNodeInfo = formatDAOQuery(
            await getDAOInfo({ variables: { daoAddress } }),
            daoAddress,
          );
          if (!graphNodeInfo) {
            logError('graphQL query failed');
            return { error: 'errorFailedSearch' };
          }

          // safeAPI.getSafeData expects a checksummed address here, so we gotta do getAddress,
          // even if `daoAddress` passes the isAddress check above
          const checksummedAddress = getAddress(daoAddress);
          const safeInfoWithGuard = await safeAPI.getSafeData(checksummedAddress);

          const node: FractalNode = Object.assign(graphNodeInfo, {
            daoName:
              graphNodeInfo.daoName ??
              (await getAccountName(daoAddress, () =>
                getSafeNameFallback(daoAddress, fractalRegistry, publicClient),
              )),
            safe: safeInfoWithGuard,
            fractalModules: await lookupModules(safeInfoWithGuard.modules),
          });

          // TODO we could cache node here, but should be careful not to cache
          // nodes that haven't fully loaded

          return node;
        } catch (e) {
          logError(e);
          return { error: 'errorInvalidSearch' };
        }
      } else {
        // invalid address
        return { error: 'errorFailedSearch' };
      }
    },
    [
      safeAPI,
      formatDAOQuery,
      getDAOInfo,
      getAccountName,
      lookupModules,
      fractalRegistry,
      publicClient,
    ],
  );

  return { loadDao };
};
