'use client';

import { Context, createContext, ReactNode, useContext, useMemo, useReducer } from 'react';
import useSafeContracts from '../../hooks/safe/useSafeContracts';
import { FractalStore } from '../../types';
import { FractalGovernanceAction } from './governance/action';
import { governanceReducer, initialGovernanceState } from './governance/reducer';
import { GovernanceContractAction } from './governanceContracts/action';
import {
  governanceContractsReducer,
  initialGovernanceContractsState,
} from './governanceContracts/reducer';
import { FractalGuardAction } from './guard/action';
import { guardReducer, initialGuardState } from './guard/reducer';
import { GuardContractAction } from './guardContracts/action';
import { guardContractReducer, initialGuardContractsState } from './guardContracts/reducer';
import { useSafeService } from './hooks/useSafeService';
import { NodeAction } from './node/action';
import { initialNodeState, nodeReducer } from './node/reducer';
import { TreasuryAction } from './treasury/action';
import { initialTreasuryState, treasuryReducer } from './treasury/reducer';

export const FractalContext = createContext<FractalStore | null>(null);

export const useFractal = (): FractalStore => useContext(FractalContext as Context<FractalStore>);

// @RENAME to FractalProvider
export function AppProvider({ children }: { children: ReactNode }) {
  // handles current viewing node (DAO) state
  const [node, nodeDispatch] = useReducer(nodeReducer, initialNodeState);
  // handles current node's guard state
  const [guard, guardDispatch] = useReducer(guardReducer, initialGuardState);
  // handles current node's governance state
  const [governance, governanceDispatch] = useReducer(governanceReducer, initialGovernanceState);
  // handles current node's treasury state
  const [treasury, treasuryDispatch] = useReducer(treasuryReducer, initialTreasuryState);
  // handles current node's governance contracts state
  const [governanceContracts, governanceContractsDispatch] = useReducer(
    governanceContractsReducer,
    initialGovernanceContractsState
  );
  // handles current node's guard contracts state
  const [guardContracts, guardContractsDispatch] = useReducer(
    guardContractReducer,
    initialGuardContractsState
  );
  // loads base Fractal contracts with provider into state
  const baseContracts = useSafeContracts();
  // loads safe service into state;
  const safeService = useSafeService();

  // memoize fractal store
  const fractalStore: FractalStore = useMemo(() => {
    return {
      node,
      guard,
      governance,
      treasury,
      governanceContracts,
      guardContracts,
      dispatch: {
        node: nodeDispatch,
        guard: guardDispatch,
        governance: governanceDispatch,
        treasury: treasuryDispatch,
        governanceContracts: governanceContractsDispatch,
        guardContracts: guardContractsDispatch,
        resetDAO: async () => {
          await Promise.all([
            nodeDispatch({ type: NodeAction.RESET }),
            governanceContractsDispatch({ type: GovernanceContractAction.RESET }),
            guardContractsDispatch({ type: GuardContractAction.RESET }),
            governanceDispatch({ type: FractalGovernanceAction.RESET }),
            guardDispatch({ type: FractalGuardAction.RESET }),
            treasuryDispatch({ type: TreasuryAction.RESET }),
          ]);
        },
      },
      clients: {
        safeService,
      },
      baseContracts,
    };
  }, [
    node,
    guard,
    governance,
    treasury,
    guardContracts,
    governanceContracts,
    safeService,
    baseContracts,
  ]);

  return <FractalContext.Provider value={fractalStore}>{children}</FractalContext.Provider>;
}
