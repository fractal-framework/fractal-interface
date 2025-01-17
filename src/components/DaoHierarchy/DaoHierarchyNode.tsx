import { useLazyQuery } from '@apollo/client';
import { Center, Flex, Icon, Link, Text } from '@chakra-ui/react';
import { abis } from '@fractal-framework/fractal-contracts';
import { ArrowElbowDownRight } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { Address, getContract, zeroAddress } from 'viem';
import { DAOQueryDocument } from '../../../.graphclient';
import { SENTINEL_ADDRESS } from '../../constants/common';
import { DAO_ROUTES } from '../../constants/routes';
import { useDecentModules } from '../../hooks/DAO/loaders/useDecentModules';
import useNetworkPublicClient from '../../hooks/useNetworkPublicClient';
import { CacheKeys } from '../../hooks/utils/cache/cacheDefaults';
import { setValue, getValue } from '../../hooks/utils/cache/useLocalStorage';
import { useAddressContractType } from '../../hooks/utils/useAddressContractType';
import { useSafeAPI } from '../../providers/App/hooks/useSafeAPI';
import { useNetworkConfigStore } from '../../providers/NetworkConfig/useNetworkConfigStore';
import { useDaoInfoStore } from '../../store/daoInfo/useDaoInfoStore';
import { DaoHierarchyInfo, DaoHierarchyStrategyType, DecentModule } from '../../types';
import { getAzoriusModuleFromModules } from '../../utils';
import { DAONodeInfoCard, NODE_HEIGHT_REM } from '../ui/cards/DAONodeInfoCard';
import { BarLoader } from '../ui/loaders/BarLoader';

/**
 * A recursive component that displays a "hierarchy" of DAOInfoCards.
 *
 * The initial declaration of this component should provide the info of
 * the DAO you would like to display at the top level of the hierarchy.
 *
 * From this initial DAO info, the component will get the DAO's children
 * and display another DaoNode for each child, and so on for their children.
 */
export function DaoHierarchyNode({
  safeAddress,
  depth,
}: {
  safeAddress: Address | null;
  depth: number;
}) {
  const { safe: currentSafe } = useDaoInfoStore();
  const { t } = useTranslation('common');
  const safeApi = useSafeAPI();
  const [hierarchyNode, setHierarchyNode] = useState<DaoHierarchyInfo>();
  const [hasErrorLoading, setErrorLoading] = useState<boolean>(false);
  const { addressPrefix, subgraph, chain } = useNetworkConfigStore();
  const publicClient = useNetworkPublicClient();

  const { getAddressContractType } = useAddressContractType();
  const lookupModules = useDecentModules();

  const [getDAOInfo] = useLazyQuery(DAOQueryDocument, {
    context: {
      subgraphSpace: subgraph.space,
      subgraphSlug: subgraph.slug,
      subgraphVersion: subgraph.version,
    },
  });

  const getVotingStrategies = useCallback(
    async (azoriusModule: DecentModule) => {
      const azoriusContract = getContract({
        abi: abis.Azorius,
        address: azoriusModule.moduleAddress,
        client: publicClient,
      });

      const [strategies, nextStrategy] = await azoriusContract.read.getStrategies([
        SENTINEL_ADDRESS,
        3n,
      ]);
      const result = Promise.all(
        [...strategies, nextStrategy]
          .filter(
            strategyAddress =>
              strategyAddress !== SENTINEL_ADDRESS && strategyAddress !== zeroAddress,
          )
          .map(async strategyAddress => ({
            ...(await getAddressContractType(strategyAddress)),
            strategyAddress,
          })),
      );

      return result;
    },
    [getAddressContractType, publicClient],
  );

  const getGovernanceTypes = useCallback(
    async (azoriusModule: DecentModule) => {
      const votingStrategies = await getVotingStrategies(azoriusModule);

      if (!votingStrategies) {
        throw new Error('No voting strategies found');
      }

      let governanceTypes: DaoHierarchyStrategyType[] = [];

      await Promise.all(
        votingStrategies.map(async votingStrategy => {
          const {
            isLinearVotingErc20,
            isLinearVotingErc721,
            isLinearVotingErc20WithHatsProposalCreation,
            isLinearVotingErc721WithHatsProposalCreation,
          } = votingStrategy;
          if (isLinearVotingErc20) {
            governanceTypes.push('ERC-20');
          } else if (isLinearVotingErc721) {
            governanceTypes.push('ERC-721');
          } else if (isLinearVotingErc20WithHatsProposalCreation) {
            governanceTypes.push('ERC-20');
          } else if (isLinearVotingErc721WithHatsProposalCreation) {
            governanceTypes.push('ERC-721');
          }
        }),
      );
      return governanceTypes.filter((value, index, self) => self.indexOf(value) === index);
    },
    [getVotingStrategies],
  );

  const loadDao = useCallback(
    async (_safeAddress: Address): Promise<DaoHierarchyInfo | undefined> => {
      if (!safeApi) {
        throw new Error('Safe API not ready');
      }
      try {
        const safe = await safeApi.getSafeInfo(_safeAddress);
        const graphRawNodeData = await getDAOInfo({ variables: { safeAddress: _safeAddress } });
        const modules = await lookupModules(safe.modules);
        const graphDAOData = graphRawNodeData.data?.daos[0];
        const azoriusModule = getAzoriusModuleFromModules(modules ?? []);
        const votingStrategies: DaoHierarchyStrategyType[] = azoriusModule
          ? await getGovernanceTypes(azoriusModule)
          : ['MULTISIG'];
        if (!graphRawNodeData || !graphDAOData) {
          throw new Error('No data found');
        }
        return {
          daoName: graphDAOData.name ?? null,
          safeAddress: _safeAddress,
          parentAddress: graphDAOData.parentAddress ?? null,
          childAddresses: graphDAOData.hierarchy.map(child => child.address),
          daoSnapshotENS: graphDAOData.snapshotENS ?? null,
          proposalTemplatesHash: graphDAOData.proposalTemplatesHash ?? null,
          modules,
          votingStrategies,
        };
      } catch (e) {
        setErrorLoading(true);
        return;
      }
    },
    [getDAOInfo, getGovernanceTypes, lookupModules, safeApi],
  );

  useEffect(() => {
    if (safeAddress) {
      const cachedNode = getValue({
        cacheName: CacheKeys.HIERARCHY_DAO_INFO,
        chainId: chain.id,
        daoAddress: safeAddress,
      });
      if (cachedNode) {
        setHierarchyNode(cachedNode);
        return;
      }
      loadDao(safeAddress).then(_node => {
        if (!_node) {
          setErrorLoading(true);
        }
        setValue(
          {
            cacheName: CacheKeys.HIERARCHY_DAO_INFO,
            chainId: chain.id,
            daoAddress: safeAddress,
          },
          _node,
        );
        setHierarchyNode(_node);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!hierarchyNode) {
    // node hasn't loaded yet
    return (
      <Flex
        w="full"
        minH="full"
      >
        <Center w="100%">
          <BarLoader />
        </Center>
      </Flex>
    );
  }

  if (hasErrorLoading) {
    return (
      <Flex
        w="full"
        bg="neutral-2"
        p="1.5rem"
        width="100%"
        borderRadius="0.75rem"
        border="1px"
        borderColor="transparent"
      >
        <Center w="100%">
          <Text
            textStyle="label-base"
            color="red-0"
          >
            {t('errorMySafesNotLoaded')}
          </Text>
        </Center>
      </Flex>
    );
  }

  const isCurrentViewingDAO =
    currentSafe?.address.toLowerCase() === hierarchyNode.safeAddress.toLocaleLowerCase();
  return (
    <Flex
      flexDirection="column"
      alignItems="stretch"
      gap="1.25rem"
      width="100%"
    >
      <Link
        as={RouterLink}
        to={DAO_ROUTES.dao.relative(addressPrefix, hierarchyNode.safeAddress)}
        _hover={{ textDecoration: 'none', cursor: isCurrentViewingDAO ? 'default' : 'pointer' }}
        onClick={event => {
          if (isCurrentViewingDAO) {
            event.preventDefault();
          }
        }}
      >
        <DAONodeInfoCard
          daoAddress={hierarchyNode.safeAddress}
          daoName={hierarchyNode?.daoName ?? hierarchyNode.safeAddress}
          daoSnapshotENS={hierarchyNode?.daoSnapshotENS}
          isCurrentViewingDAO={isCurrentViewingDAO}
          votingStrategies={hierarchyNode.votingStrategies}
        />
      </Link>

      {/* CHILD NODES */}
      {hierarchyNode?.childAddresses.map(childAddress => {
        return (
          <Flex
            minH={`${NODE_HEIGHT_REM}rem`}
            key={childAddress}
            gap="1.25rem"
          >
            <Icon
              as={ArrowElbowDownRight}
              my={`${NODE_HEIGHT_REM / 2.5}rem`}
              ml="0.5rem"
              boxSize="32px"
              color={currentSafe?.address === childAddress ? 'celery-0' : 'neutral-6'}
            />

            <DaoHierarchyNode
              safeAddress={childAddress}
              depth={depth + 1}
            />
          </Flex>
        );
      })}
    </Flex>
  );
}
