import * as amplitude from '@amplitude/analytics-browser';
import { Center } from '@chakra-ui/react';
import { useEffect, useMemo } from 'react';
import { ProposalBuilder } from '../../../../../components/ProposalBuilder';
import { DEFAULT_PROPOSAL } from '../../../../../components/ProposalBuilder/constants';
import { BarLoader } from '../../../../../components/ui/loaders/BarLoader';
import { useHeaderHeight } from '../../../../../constants/common';
import { usePrepareProposal } from '../../../../../hooks/DAO/proposal/usePrepareProposal';
import { analyticsEvents } from '../../../../../insights/analyticsEvents';
import { useFractal } from '../../../../../providers/App/AppProvider';
import { useProposalActionsStore } from '../../../../../store/actions/useProposalActionsStore';
import { useDaoInfoStore } from '../../../../../store/daoInfo/useDaoInfoStore';
import { ProposalBuilderMode } from '../../../../../types';

export function SafeProposalWithActionsCreatePage() {
  useEffect(() => {
    amplitude.track(analyticsEvents.SafeProposalWithActionsCreatePageOpened);
  }, []);
  const {
    governance: { type },
  } = useFractal();
  const { safe } = useDaoInfoStore();

  const { prepareProposal } = usePrepareProposal();
  const { getTransactions } = useProposalActionsStore();
  const transactions = useMemo(() => getTransactions(), [getTransactions]);

  const HEADER_HEIGHT = useHeaderHeight();

  if (!type || !safe?.address || !safe) {
    return (
      <Center minH={`calc(100vh - ${HEADER_HEIGHT})`}>
        <BarLoader />
      </Center>
    );
  }

  return (
    <ProposalBuilder
      initialValues={{
        ...DEFAULT_PROPOSAL,
        transactions,
        nonce: safe.nextNonce,
      }}
      mode={ProposalBuilderMode.PROPOSAL_WITH_ACTIONS}
      prepareProposalData={prepareProposal}
    />
  );
}
