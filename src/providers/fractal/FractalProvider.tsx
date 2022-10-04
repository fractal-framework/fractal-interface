import { ReactNode, useMemo, useReducer } from 'react';

import { mvdInitialState, nodeInitialState, gnosisInitialState } from './constants';
import { GnosisAction, MVDAction, NodeAction } from './constants/enums';
import { useDAOLegacy } from './hooks/useDAOLegacy';
import { FractalContext } from './hooks/useFractal';
import {
  FractalNode,
  NodeActions,
  MVDActions,
  MVDDAO,
  IDaoLegacy,
  GnosisSafe,
  GnosisActions,
} from './types';
import { useModuleTypes } from './hooks/useModuleTypes';
import { useModuleListeners } from './hooks/useModuleListeners';

const initializeState = (_initialState: FractalNode | MVDDAO | GnosisSafe) => {
  return _initialState;
};

const mvdReducer = (state: MVDDAO, action: MVDActions): MVDDAO => {
  switch (action.type) {
    case MVDAction.SET_DAO:
      return { ...action.payload, isLoading: false };
    case MVDAction.UPDATE_MODULE:
      return { ...state, moduleAddresses: action.payload };
    case MVDAction.RESET:
      return initializeState(mvdInitialState);
    case MVDAction.INVALID:
      return { ...mvdInitialState, isLoading: false };
    default:
      return state;
  }
};

const nodeReducer = (state: FractalNode, action: NodeActions): FractalNode => {
  switch (action.type) {
    case NodeAction.SET_NODE_TYPE:
      return { ...state, nodeType: action.payload, isLoading: false };
    case NodeAction.RESET:
      return initializeState(nodeInitialState);
    case NodeAction.INVALID:
      return { ...nodeInitialState };
    default:
      return state;
  }
};

const gnosisReducer = (state: GnosisSafe, action: GnosisActions): GnosisSafe => {
  switch (action.type) {
    case GnosisAction.SET_SAFE:
      return { ...action.payload, isLoading: false };
    case GnosisAction.RESET:
      return initializeState(gnosisInitialState);
    case GnosisAction.INVALIDATE:
      return { ...gnosisInitialState };
    default:
      return state;
  }
};

/**
 * Uses Context API to provider DAO information to app
 */
export function FractalProvider({ children }: { children: ReactNode }) {
  const [dao, dispatch] = useReducer(mvdReducer, mvdInitialState, initializeState);
  const daoLegacy: IDaoLegacy = useDAOLegacy(dao.daoAddress);
  const [node, nodeDispatch] = useReducer(nodeReducer, nodeInitialState, initializeState);
  const [gnosis, gnosisDispatch] = useReducer(gnosisReducer, gnosisInitialState, initializeState);

  const {
    timelockModule,
    treasuryModule,
    tokenVotingGovernanceModule,
    claimingContractModule,
    gnosisWrapperModule,
  } = useModuleTypes(dao.moduleAddresses);

  useModuleListeners(dao, dispatch);

  const value = useMemo(
    () => ({
      node: {
        node,
        dispatch: nodeDispatch,
      },
      mvd: {
        dao,
        modules: {
          timelockModule,
          treasuryModule,
          tokenVotingGovernanceModule,
          claimingContractModule,
          gnosisWrapperModule,
        },
        dispatch,
        daoLegacy,
      },
      gnosis: {
        safe: gnosis,
        dispatch: gnosisDispatch,
      },
    }),
    [
      node,
      dao,
      timelockModule,
      treasuryModule,
      tokenVotingGovernanceModule,
      claimingContractModule,
      gnosisWrapperModule,
      daoLegacy,
      gnosis,
    ]
  );

  return <FractalContext.Provider value={value}>{children}</FractalContext.Provider>;
}
