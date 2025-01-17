import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback, Dispatch } from 'react';
import { getContract } from 'viem';
import {
  FractalGovernanceAction,
  FractalGovernanceActions,
} from '../../../providers/App/governance/action';
import { FractalGovernanceContracts } from '../../../types';
import { getAzoriusProposalState } from '../../../utils';
import useNetworkPublicClient from '../../useNetworkPublicClient';

interface IUseUpdateProposalState {
  governanceContracts: FractalGovernanceContracts;
  governanceDispatch: Dispatch<FractalGovernanceActions>;
}

export default function useUpdateProposalState({
  governanceContracts: { moduleAzoriusAddress },
  governanceDispatch,
}: IUseUpdateProposalState) {
  const publicClient = useNetworkPublicClient();
  const updateProposalState = useCallback(
    async (proposalId: number) => {
      if (!moduleAzoriusAddress) {
        return;
      }
      const azoriusContract = getContract({
        abi: abis.Azorius,
        address: moduleAzoriusAddress,
        client: publicClient,
      });

      const newState = await getAzoriusProposalState(azoriusContract, proposalId);
      governanceDispatch({
        type: FractalGovernanceAction.UPDATE_PROPOSAL_STATE,
        payload: { proposalId: proposalId.toString(), state: newState },
      });
    },
    [moduleAzoriusAddress, governanceDispatch, publicClient],
  );

  return updateProposalState;
}
