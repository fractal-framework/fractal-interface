import { Box } from '@chakra-ui/react';
import { utils } from 'ethers';
import { useEffect, useState } from 'react';
import { useLoadDAONode } from '../../../hooks/DAO/loaders/useLoadDAONode';
import { useFractal } from '../../../providers/App/AppProvider';
import { FractalNode, WithError } from '../../../types';
import { DAONodeCard } from '../../ui/cards/DAOInfoCard';
import { InfoBoxLoader } from '../../ui/loaders/InfoBoxLoader';
import { NodeLineVertical } from './NodeLines';

export function DaoNode({
  parentAddress,
  safeAddress,
  trueDepth,
  numberOfSiblings,
}: {
  parentAddress?: string | null;
  safeAddress: string | null;
  trueDepth: number;
  numberOfSiblings?: number;
}) {
  const [fractalNode, setNode] = useState<FractalNode>();
  const { loadDao } = useLoadDAONode();
  const [isChildrenExpanded, setIsChildrenExpanded] = useState(!parentAddress);
  const childrenExpansionToggle = () => {
    setIsChildrenExpanded(v => !v);
  };

  const {
    node: { daoAddress: currentDAOAddress },
  } = useFractal();

  useEffect(() => {
    if (safeAddress) {
      loadDao(utils.getAddress(safeAddress)).then(_node => {
        const errorNode = _node as WithError;
        const emptyNode: FractalNode = {
          daoName: null,
          daoAddress: null,
          safe: null,
          fractalModules: [],
          nodeHierarchy: {
            parentAddress: null,
            childNodes: [],
          },
        };

        if (!errorNode.error) {
          setNode(_node as FractalNode);
        } else if (errorNode.error === 'errorFailedSearch') {
          setNode(emptyNode);
        }
      });
    }
  }, [loadDao, safeAddress]);

  if (!fractalNode?.nodeHierarchy) {
    return (
      <Box
        h="6.25rem"
        my={8}
      >
        <InfoBoxLoader />
      </Box>
    );
  }

  return (
    <Box position="relative">
      <DAONodeCard
        fractalNode={fractalNode}
        parentAddress={parentAddress}
        safeAddress={safeAddress}
        toggleExpansion={
          !!fractalNode?.nodeHierarchy.childNodes.length ? childrenExpansionToggle : undefined
        }
        expanded={isChildrenExpanded}
        numberOfChildrenDAO={fractalNode?.nodeHierarchy.childNodes.length}
        depth={trueDepth}
      />

      <NodeLineVertical
        trueDepth={trueDepth}
        numberOfSiblings={numberOfSiblings}
        numberOfChildren={fractalNode?.nodeHierarchy.childNodes.length}
        isCurrentDAO={currentDAOAddress === utils.getAddress(safeAddress || '')}
      />

      {isChildrenExpanded &&
        fractalNode?.nodeHierarchy.childNodes.map(childNode => (
          <Box
            key={childNode.daoAddress}
            ml={24}
            position="relative"
          >
            <DaoNode
              safeAddress={childNode.daoAddress}
              parentAddress={safeAddress}
              trueDepth={trueDepth + 1}
              numberOfSiblings={childNode?.nodeHierarchy.childNodes.length}
            />
          </Box>
        ))}
    </Box>
  );
}
