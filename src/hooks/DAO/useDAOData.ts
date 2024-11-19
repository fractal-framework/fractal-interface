import { useEffect, useState } from 'react';
import { Address } from 'viem';
import { initialGuardState } from '../../providers/App/guard/reducer';
import { initialGuardContractsState } from '../../providers/App/guardContracts/reducer';
import { DaoInfo } from '../../types';
import { DAOData } from '../../types/daoGeneral';
import { FractalGuardContracts } from '../../types/fractal';
import { useFractalFreeze } from './loaders/useFractalFreeze';
import { useFractalGuardContracts } from './loaders/useFractalGuardContracts';

/**
 * A hook for loading guard and freeze guard contract data for the provided
 * FractalNode.
 */
export function useLoadDAOData(parentSafeAddress: Address | null, fractalNode?: DaoInfo) {
  const [daoData, setDAOData] = useState<DAOData>();
  const loadFractalGuardContracts = useFractalGuardContracts({ loadOnMount: false });
  const loadFractalFreezeGuard = useFractalFreeze({
    loadOnMount: false,
    parentSafeAddress,
  });

  useEffect(() => {
    const loadDAOData = async () => {
      if (!fractalNode) {
        return;
      }
      const { safe, fractalModules } = fractalNode;

      if (!safe?.address) {
        return;
      }

      let freezeGuardContracts: FractalGuardContracts | undefined = await loadFractalGuardContracts(
        safe,
        fractalModules,
      );

      if (!freezeGuardContracts) {
        freezeGuardContracts = initialGuardContractsState;
      }
      let freezeGuard = await loadFractalFreezeGuard(freezeGuardContracts);

      if (!freezeGuard) {
        freezeGuard = initialGuardState;
      }

      setDAOData({
        safe,
        fractalModules,
        freezeGuardContracts: freezeGuardContracts,
        freezeGuard,
      });
    };
    loadDAOData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { daoData };
}
