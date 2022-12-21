import { ProposalCreatedEvent } from '@fractal-framework/fractal-contracts/dist/typechain-types/contracts/FractalUsul';
import { Dispatch, useCallback, useEffect } from 'react';
import { TypedListener } from '../../../../assets/typechain-types/usul/common';
import { decodeTransactions } from '../../../../utils/crypto';
import { useWeb3Provider } from '../../../Web3Data/hooks/useWeb3Provider';
import { IGovernance, TxProposalState } from '../../types';
import { mapProposalCreatedEventToProposal } from '../../utils';
import { GovernanceActions, GovernanceAction } from '../actions';

interface IUseUsulProposals {
  governance: IGovernance;
  governanceDispatch: Dispatch<GovernanceActions>;
}

export default function useUsulProposals({
  governance: {
    txProposalsInfo,
    contracts: { usulContract },
  },
  governanceDispatch,
}: IUseUsulProposals) {
  const {
    state: { signerOrProvider, provider, chainId },
  } = useWeb3Provider();

  const proposalCreatedListener: TypedListener<ProposalCreatedEvent> = useCallback(
    async (...[strategyAddress, proposalNumber, proposer]) => {
      if (!usulContract || !signerOrProvider || !provider) {
        return;
      }
      const proposal = await mapProposalCreatedEventToProposal(
        strategyAddress,
        proposalNumber,
        proposer,
        usulContract,
        signerOrProvider,
        provider
      );

      const proposals = [...txProposalsInfo.txProposals, proposal];

      governanceDispatch({
        type: GovernanceAction.UPDATE_PROPOSALS,
        payload: {
          txProposals: proposals,
          passed: txProposalsInfo.passed,
          active: txProposalsInfo.active ? txProposalsInfo.active : 1,
        },
      });
    },
    [usulContract, signerOrProvider, provider, governanceDispatch, txProposalsInfo]
  );

  useEffect(() => {
    if (!usulContract || !signerOrProvider) {
      return;
    }
    const filter = usulContract.filters.ProposalCreated();

    usulContract.on(filter, proposalCreatedListener);

    return () => {
      usulContract.off(filter, proposalCreatedListener);
    };
  }, [usulContract, signerOrProvider, proposalCreatedListener]);

  useEffect(() => {
    if (!usulContract || !signerOrProvider || !provider) {
      return;
    }
    const loadProposals = async () => {
      const proposalCreatedFilter = usulContract.filters.ProposalCreated();
      const proposalMetaDataCreatedFilter = usulContract.filters.ProposalMetadataCreated();
      const proposalCreatedEvents = await usulContract.queryFilter(proposalCreatedFilter);
      const proposalMetaDataCreatedEvents = await usulContract.queryFilter(
        proposalMetaDataCreatedFilter
      );

      const mappedProposals = await Promise.all(
        proposalCreatedEvents.map(async ({ args }) => {
          const metaDataEvent = proposalMetaDataCreatedEvents.find(event =>
            event.args.proposalId.eq(args.proposalNumber)
          );
          let metaData;
          if (metaDataEvent) {
            metaData = {
              transactions: metaDataEvent.args.transactions,
              decodedTransactions: await decodeTransactions(
                metaDataEvent.args.transactions,
                chainId
              ),
            };
          }
          return mapProposalCreatedEventToProposal(
            args[0],
            args[1],
            args[2],
            usulContract,
            signerOrProvider,
            provider,
            metaData
          );
        })
      );
      const passedProposals = mappedProposals.reduce(
        (prev, proposal) => (proposal.state === TxProposalState.Executed ? prev + 1 : prev),
        0
      );
      // @todo no queued?
      const activeProposals = mappedProposals.reduce(
        (prev, proposal) => (proposal.state === TxProposalState.Active ? prev + 1 : prev),
        0
      );
      governanceDispatch({
        type: GovernanceAction.UPDATE_PROPOSALS,
        payload: {
          txProposals: mappedProposals,
          passed: passedProposals,
          active: activeProposals,
        },
      });
    };

    loadProposals();
  }, [usulContract, signerOrProvider, governanceDispatch, provider, chainId]);
}
