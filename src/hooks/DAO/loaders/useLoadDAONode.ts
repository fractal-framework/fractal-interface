import { useLazyQuery } from '@apollo/client';
import { useCallback } from 'react';
import { Address } from 'viem';
import { DAO, DAOQueryDocument, DAOQueryQuery } from '../../../../.graphclient';
import { logError } from '../../../helpers/errorLogging';
import { useSafeAPI } from '../../../providers/App/hooks/useSafeAPI';
import { useNetworkConfig } from '../../../providers/NetworkConfig/NetworkConfigProvider';
import { DaoInfo, Node, WithError } from '../../../types';
import { mapChildNodes } from '../../../utils/hierarchy';
import { useGetSafeName } from '../../utils/useGetSafeName';
import { useFractalModules } from './useFractalModules';

export const useLoadDAONode = () => {
  const safeAPI = useSafeAPI();
  const { getSafeName } = useGetSafeName();
  const lookupModules = useFractalModules();
  const { subgraph } = useNetworkConfig();
  const [getDAOInfo] = useLazyQuery(DAOQueryDocument, {
    context: {
      subgraphSpace: subgraph.space,
      subgraphSlug: subgraph.slug,
      subgraphVersion: subgraph.version,
    },
  });

  const formatDAOQuery = useCallback((result: { data?: DAOQueryQuery }, safeAddress: Address) => {
    const dao = result.data?.daos[0];
    if (dao === undefined) {
      return undefined;
    }
    const { parentAddress, name, snapshotENS } = dao;

    const currentNode: Node = {
      nodeHierarchy: {
        parentAddress,
        childNodes: mapChildNodes(dao as DAO),
      },
      daoName: name as string,
      address: safeAddress,
      daoSnapshotENS: snapshotENS as string,
    };
    return currentNode;
  }, []);

  const loadDao = useCallback(
    async (safeAddress: Address): Promise<DaoInfo | WithError> => {
      if (safeAPI) {
        try {
          const graphNodeInfo = formatDAOQuery(
            await getDAOInfo({ variables: { safeAddress } }),
            safeAddress,
          );
          if (!graphNodeInfo) {
            logError('graphQL query failed');
            return { error: 'errorFailedSearch' };
          }

          const safeInfoWithGuard = await safeAPI.getSafeData(safeAddress);

          const node: DaoInfo = Object.assign(graphNodeInfo, {
            daoName: graphNodeInfo.daoName ?? (await getSafeName(safeAddress)),
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
        return { error: 'errorFailedSearch' };
      }
    },
    [formatDAOQuery, getDAOInfo, getSafeName, lookupModules, safeAPI],
  );

  return { loadDao };
};
