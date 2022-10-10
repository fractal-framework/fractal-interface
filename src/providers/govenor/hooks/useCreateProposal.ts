import { GovernorModule } from './../../../assets/typechain-types/module-governor/contracts/Governor/GovernorModule';
import { useCallback } from 'react';
import { useTransaction } from '../../../contexts/web3Data/transactions';
import { useWeb3Provider } from '../../../contexts/web3Data/hooks/useWeb3Provider';
import { ProposalExecuteData } from '../../../types/proposal';
import { useTranslation } from 'react-i18next';

const useCreateProposal = (governorModuleContract: GovernorModule | undefined) => {
  const {
    state: { signerOrProvider },
  } = useWeb3Provider();

  const [contractCallCreateProposal, contractCallPending] = useTransaction();

  const { t } = useTranslation('transaction');

  const createProposal = useCallback(
    ({
      proposalData,
      successCallback,
    }: {
      proposalData: ProposalExecuteData | undefined;
      successCallback: () => void;
    }) => {
      if (!signerOrProvider || !proposalData || !governorModuleContract) {
        return;
      }

      contractCallCreateProposal({
        contractFn: () =>
          governorModuleContract.propose(
            proposalData.targets,
            proposalData.values,
            proposalData.calldatas,
            proposalData.description
          ),
        pendingMessage: t('pendingCreateProposal'),
        failedMessage: t('failedCreateProposal'),
        successMessage: t('successCreateProposal'),
        successCallback,
      });
    },
    [contractCallCreateProposal, governorModuleContract, signerOrProvider, t]
  );

  return [createProposal, contractCallPending] as const;
};

export default useCreateProposal;
