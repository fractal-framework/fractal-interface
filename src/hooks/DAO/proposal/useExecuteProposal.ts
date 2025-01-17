import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Address, Hex, getContract } from 'viem';
import { useFractal } from '../../../providers/App/AppProvider';
import { MetaTransaction, FractalProposal, AzoriusProposal } from '../../../types';
import { useNetworkWalletClient } from '../../useNetworkWalletClient';
import { useTransaction } from '../../utils/useTransaction';
import useUpdateProposalState from './useUpdateProposalState';

export default function useExecuteProposal() {
  const { t } = useTranslation('transaction');

  const { governanceContracts, action } = useFractal();
  const { moduleAzoriusAddress } = governanceContracts;
  const updateProposalState = useUpdateProposalState({
    governanceContracts,
    governanceDispatch: action.dispatch,
  });
  const { data: walletClient } = useNetworkWalletClient();
  const [contractCall, pending] = useTransaction();

  const executeProposal = useCallback(
    (proposal: FractalProposal) => {
      const azoriusProposal = proposal as AzoriusProposal;
      if (
        !moduleAzoriusAddress ||
        !azoriusProposal.data ||
        !azoriusProposal.data.transactions ||
        !walletClient
      ) {
        return;
      }

      const azoriusContract = getContract({
        abi: abis.Azorius,
        address: moduleAzoriusAddress,
        client: walletClient,
      });

      const targets: Address[] = [];
      const values: MetaTransaction['value'][] = [];
      const data: Hex[] = [];
      const operations: number[] = [];

      azoriusProposal.data.transactions.forEach(tx => {
        targets.push(tx.to);
        values.push(tx.value);
        data.push(tx.data);
        operations.push(tx.operation);
      });

      contractCall({
        contractFn: () =>
          azoriusContract.write.executeProposal([
            Number(proposal.proposalId),
            targets,
            values,
            data,
            operations,
          ]),
        pendingMessage: t('pendingExecute'),
        failedMessage: t('failedExecute'),
        successMessage: t('successExecute'),
        successCallback: async () => {
          // @todo may need to re-add a loader here
          updateProposalState(Number(proposal.proposalId));
        },
      });
    },
    [moduleAzoriusAddress, contractCall, t, updateProposalState, walletClient],
  );

  return {
    pending,
    executeProposal,
  };
}
