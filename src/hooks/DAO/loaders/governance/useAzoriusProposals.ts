import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Address,
  GetContractEventsReturnType,
  GetContractReturnType,
  PublicClient,
  getContract,
} from 'viem';
import { logError } from '../../../../helpers/errorLogging';
import { useFractal } from '../../../../providers/App/AppProvider';
import { FractalGovernanceAction } from '../../../../providers/App/governance/action';
import {
  CreateProposalMetadata,
  DecodedTransaction,
  FractalProposalState,
  VotingStrategyType,
} from '../../../../types';
import { AzoriusProposal } from '../../../../types/daoProposal';
import { decodeTransactions, mapProposalCreatedEventToProposal } from '../../../../utils';
import useNetworkPublicClient from '../../../useNetworkPublicClient';
import { CacheExpiry, CacheKeys } from '../../../utils/cache/cacheDefaults';
import { getValue, setValue } from '../../../utils/cache/useLocalStorage';
import { useAddressContractType } from '../../../utils/useAddressContractType';
import { useSafeDecoder } from '../../../utils/useSafeDecoder';

type OnProposalLoaded = (proposal: AzoriusProposal) => void;

export const useAzoriusProposals = () => {
  const currentAzoriusAddress = useRef<string>();

  const {
    governanceContracts: {
      moduleAzoriusAddress,
      linearVotingErc20Address,
      linearVotingErc20WithHatsWhitelistingAddress,
      linearVotingErc721Address,
      linearVotingErc721WithHatsWhitelistingAddress,
    },
    action,
  } = useFractal();
  const decode = useSafeDecoder();
  const publicClient = useNetworkPublicClient();
  const { getAddressContractType } = useAddressContractType();

  const azoriusContract = useMemo(() => {
    if (!moduleAzoriusAddress) {
      return;
    }

    return getContract({
      abi: abis.Azorius,
      address: moduleAzoriusAddress,
      client: publicClient,
    });
  }, [moduleAzoriusAddress, publicClient]);

  const erc20VotedEvents = useMemo(async () => {
    let events: GetContractEventsReturnType<typeof abis.LinearERC20Voting, 'Voted'> | undefined;
    if (!linearVotingErc20Address && !linearVotingErc20WithHatsWhitelistingAddress) {
      return;
    }

    if (linearVotingErc20Address) {
      const erc20StrategyContract = getContract({
        abi: abis.LinearERC20Voting,
        address: linearVotingErc20Address,
        client: publicClient,
      });
      events = [...(await erc20StrategyContract.getEvents.Voted({ fromBlock: 0n }))];
    }

    if (linearVotingErc20WithHatsWhitelistingAddress) {
      const erc20WithHatsProposalCreationStrategyContract = getContract({
        abi: abis.LinearERC20VotingWithHatsProposalCreation,
        address: linearVotingErc20WithHatsWhitelistingAddress,
        client: publicClient,
      });
      events = [
        ...(await erc20WithHatsProposalCreationStrategyContract.getEvents.Voted({ fromBlock: 0n })),
      ];
    }

    return events;
  }, [linearVotingErc20Address, linearVotingErc20WithHatsWhitelistingAddress, publicClient]);

  const erc721VotedEvents = useMemo(async () => {
    let events: GetContractEventsReturnType<typeof abis.LinearERC721Voting, 'Voted'> | undefined;
    if (!linearVotingErc721Address && !linearVotingErc721WithHatsWhitelistingAddress) {
      return;
    }

    if (linearVotingErc721Address) {
      const erc721StrategyContract = getContract({
        abi: abis.LinearERC721Voting,
        address: linearVotingErc721Address,
        client: publicClient,
      });
      events = [...(await erc721StrategyContract.getEvents.Voted({ fromBlock: 0n }))];
    }

    if (linearVotingErc721WithHatsWhitelistingAddress) {
      const erc721WithHatsProposalCreationStrategyContract = getContract({
        abi: abis.LinearERC721VotingWithHatsProposalCreation,
        address: linearVotingErc721WithHatsWhitelistingAddress,
        client: publicClient,
      });
      events = [
        ...(await erc721WithHatsProposalCreationStrategyContract.getEvents.Voted({
          fromBlock: 0n,
        })),
      ];
    }

    return events;
  }, [linearVotingErc721Address, linearVotingErc721WithHatsWhitelistingAddress, publicClient]);

  const executedEvents = useMemo(async () => {
    if (!azoriusContract) {
      return;
    }

    const events = await azoriusContract.getEvents.ProposalExecuted({ fromBlock: 0n });
    return events;
  }, [azoriusContract]);

  useEffect(() => {
    if (!moduleAzoriusAddress) {
      currentAzoriusAddress.current = undefined;
    }

    if (moduleAzoriusAddress && currentAzoriusAddress.current !== moduleAzoriusAddress) {
      currentAzoriusAddress.current = moduleAzoriusAddress;
    }
  }, [moduleAzoriusAddress]);

  const { t } = useTranslation('proposal');

  const loadAzoriusProposals = useCallback(
    async (
      _azoriusContract: GetContractReturnType<typeof abis.Azorius, PublicClient> | undefined,
      _erc20VotedEvents:
        | GetContractEventsReturnType<typeof abis.LinearERC20Voting, 'Voted'>
        | GetContractEventsReturnType<
            typeof abis.LinearERC20VotingWithHatsProposalCreation,
            'Voted'
          >
        | undefined,
      _erc721VotedEvents:
        | GetContractEventsReturnType<typeof abis.LinearERC721Voting, 'Voted'>
        | GetContractEventsReturnType<
            typeof abis.LinearERC721VotingWithHatsProposalCreation,
            'Voted'
          >
        | undefined,
      _executedEvents:
        | GetContractEventsReturnType<typeof abis.Azorius, 'ProposalExecuted'>
        | undefined,
      _publicClient: PublicClient | undefined,
      _decode: (
        value: string,
        to: Address,
        data?: string | undefined,
      ) => Promise<DecodedTransaction[]>,
      _proposalLoaded: OnProposalLoaded,
    ) => {
      if (!_azoriusContract || !_publicClient) {
        return;
      }
      const proposalCreatedEvents = (
        await _azoriusContract.getEvents.ProposalCreated({ fromBlock: 0n })
      ).reverse();

      action.dispatch({
        type: FractalGovernanceAction.SET_ALL_PROPOSALS_LOADED,
        payload: false,
      });

      action.dispatch({
        type: FractalGovernanceAction.SET_LOADING_FIRST_PROPOSAL,
        payload: true,
      });

      const completeOneProposalLoadProcess = (proposal: AzoriusProposal) => {
        if (currentAzoriusAddress.current !== moduleAzoriusAddress) {
          // The DAO has changed, don't load the just-fetched proposal,
          // into state, and get out of this function completely.
          return;
        }

        _proposalLoaded(proposal);

        action.dispatch({
          type: FractalGovernanceAction.SET_LOADING_FIRST_PROPOSAL,
          payload: false,
        });
      };

      const parseProposalMetadata = (metadata: string): CreateProposalMetadata => {
        try {
          const createProposalMetadata: CreateProposalMetadata = JSON.parse(metadata);
          return createProposalMetadata;
        } catch {
          logError('Unable to parse proposal metadata.', 'metadata:', metadata);
          return {
            title: t('metadataFailedParsePlaceholder'),
            description: '',
          };
        }
      };

      for (const proposalCreatedEvent of proposalCreatedEvents) {
        if (proposalCreatedEvent.args.proposalId === undefined) {
          continue;
        }

        const cachedProposal = getValue({
          cacheName: CacheKeys.PROPOSAL_CACHE,
          proposalId: proposalCreatedEvent.args.proposalId.toString(),
          contractAddress: _azoriusContract.address,
        });

        if (cachedProposal) {
          completeOneProposalLoadProcess(cachedProposal);
          continue;
        }

        let proposalData;

        if (
          proposalCreatedEvent.args.proposer === undefined ||
          proposalCreatedEvent.args.strategy === undefined
        ) {
          continue;
        }

        if (proposalCreatedEvent.args.metadata && proposalCreatedEvent.args.transactions) {
          const metadataEvent = parseProposalMetadata(proposalCreatedEvent.args.metadata);

          try {
            const decodedTransactions = await decodeTransactions(
              _decode,
              proposalCreatedEvent.args.transactions.map(tx => ({
                ...tx,
                to: tx.to,
                data: tx.data,
                value: tx.value,
              })),
            );

            proposalData = {
              metaData: {
                title: metadataEvent.title,
                description: metadataEvent.description,
                documentationUrl: metadataEvent.documentationUrl,
              },
              transactions: proposalCreatedEvent.args.transactions.map(tx => ({
                ...tx,
                to: tx.to,
                value: tx.value,
                data: tx.data,
              })),
              decodedTransactions,
            };
          } catch {
            logError(
              'Unable to parse proposal metadata or transactions',
              'metadata:',
              proposalCreatedEvent.args.metadata,
              'transactions:',
              proposalCreatedEvent.args.transactions,
            );
          }
        }

        let strategyType: VotingStrategyType | undefined;
        const strategyAddress = proposalCreatedEvent.args.strategy;
        const {
          isLinearVotingErc20,
          isLinearVotingErc721,
          isLinearVotingErc20WithHatsProposalCreation,
          isLinearVotingErc721WithHatsProposalCreation,
        } = await getAddressContractType(strategyAddress);
        if (isLinearVotingErc20 || isLinearVotingErc20WithHatsProposalCreation) {
          strategyType = VotingStrategyType.LINEAR_ERC20;
        } else if (isLinearVotingErc721 || isLinearVotingErc721WithHatsProposalCreation) {
          strategyType = VotingStrategyType.LINEAR_ERC721;
        } else {
          logError('Unknown voting strategy', 'strategyAddress:', strategyAddress);
          continue;
        }

        const proposal = await mapProposalCreatedEventToProposal(
          proposalCreatedEvent.transactionHash,
          proposalCreatedEvent.args.strategy,
          strategyType,
          Number(proposalCreatedEvent.args.proposalId),
          proposalCreatedEvent.args.proposer,
          _azoriusContract,
          _publicClient,
          _erc20VotedEvents,
          _erc721VotedEvents,
          _executedEvents,
          proposalData,
        );

        completeOneProposalLoadProcess(proposal);

        const isProposalFossilized =
          proposal.state === FractalProposalState.CLOSED ||
          proposal.state === FractalProposalState.EXECUTED ||
          proposal.state === FractalProposalState.FAILED ||
          proposal.state === FractalProposalState.EXPIRED ||
          proposal.state === FractalProposalState.REJECTED;

        if (isProposalFossilized) {
          setValue(
            {
              cacheName: CacheKeys.PROPOSAL_CACHE,
              proposalId: proposalCreatedEvent.args.proposalId.toString(),
              contractAddress: _azoriusContract.address,
            },
            proposal,
            CacheExpiry.NEVER,
          );
        }
      }

      // Just in case there are no `proposalCreatedEvent`s, we still need to set the loading state to false.
      action.dispatch({
        type: FractalGovernanceAction.SET_LOADING_FIRST_PROPOSAL,
        payload: false,
      });

      action.dispatch({
        type: FractalGovernanceAction.SET_ALL_PROPOSALS_LOADED,
        payload: true,
      });
    },
    [action, moduleAzoriusAddress, t, getAddressContractType],
  );

  return async (proposalLoaded: OnProposalLoaded) =>
    loadAzoriusProposals(
      azoriusContract,
      await erc20VotedEvents,
      await erc721VotedEvents,
      await executedEvents,
      publicClient,
      decode,
      proposalLoaded,
    );
};
