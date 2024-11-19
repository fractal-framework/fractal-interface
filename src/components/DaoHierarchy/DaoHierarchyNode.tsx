import { Flex, Icon } from '@chakra-ui/react';
import { ArrowElbowDownRight } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Address } from 'viem';
import { useLoadDAONode } from '../../hooks/DAO/loaders/useLoadDAONode';
import { useDaoInfoStore } from '../../store/daoInfo/useDaoInfoStore';
import { DaoInfo, WithError } from '../../types';
import { DAONodeInfoCard, NODE_HEIGHT_REM } from '../ui/cards/DAONodeInfoCard';

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
  const [fractalNode, setNode] = useState<DaoInfo>();
  const { loadDao } = useLoadDAONode();

  useEffect(() => {
    if (safeAddress) {
      loadDao(safeAddress).then(_node => {
        const errorNode = _node as WithError;
        if (!errorNode.error) {
          const fnode = _node as DaoInfo;
          setNode(fnode);
        } else if (errorNode.error === 'errorFailedSearch') {
          setNode({
            daoName: null,
            safe: null,
            fractalModules: [],
            nodeHierarchy: {
              parentAddress: null,
              childNodes: [],
            },
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Flex
      flexDirection="column"
      alignItems="stretch"
      gap="1.25rem"
      width="100%"
    >
      <DAONodeInfoCard node={fractalNode} />

      {/* CHILD NODES */}
      {fractalNode?.nodeHierarchy.childNodes.map(childNode => {
        if (!childNode.safe) {
          return null;
        }
        return (
          <Flex
            minH={`${NODE_HEIGHT_REM}rem`}
            key={childNode.safe.address}
            gap="1.25rem"
          >
            <Icon
              as={ArrowElbowDownRight}
              my={`${NODE_HEIGHT_REM / 2.5}rem`}
              ml="0.5rem"
              boxSize="32px"
              color={currentSafe?.address === childNode.safe.address ? 'celery-0' : 'neutral-6'}
            />

            <DaoHierarchyNode
              safeAddress={childNode.safe.address}
              depth={depth + 1}
            />
          </Flex>
        );
      })}
    </Flex>
  );
}
