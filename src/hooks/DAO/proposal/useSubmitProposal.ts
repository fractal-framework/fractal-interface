import { abis } from '@fractal-framework/fractal-contracts';
import axios from 'axios';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Address,
  encodeAbiParameters,
  encodeFunctionData,
  getContract,
  isAddress,
  isHex,
  parseAbiParameters,
} from 'viem';
import { useAccount } from 'wagmi';
import MultiSendCallOnlyAbi from '../../../assets/abi/MultiSendCallOnly';
import { ADDRESS_MULTISIG_METADATA } from '../../../constants/common';
import { buildSafeAPIPost, encodeMultiSend } from '../../../helpers';
import { logError } from '../../../helpers/errorLogging';
import { useFractal } from '../../../providers/App/AppProvider';
import { FractalGovernanceAction } from '../../../providers/App/governance/action';
import useIPFSClient from '../../../providers/App/hooks/useIPFSClient';
import { useSafeAPI } from '../../../providers/App/hooks/useSafeAPI';
import { useNetworkConfigStore } from '../../../providers/NetworkConfig/useNetworkConfigStore';
import { useDaoInfoStore } from '../../../store/daoInfo/useDaoInfoStore';
import { CreateProposalMetadata, MetaTransaction, ProposalExecuteData } from '../../../types';
import { buildSafeApiUrl, getAzoriusModuleFromModules } from '../../../utils';
import useNetworkPublicClient from '../../useNetworkPublicClient';
import { useNetworkWalletClient } from '../../useNetworkWalletClient';
import useVotingStrategiesAddresses from '../../utils/useVotingStrategiesAddresses';
import { useDecentModules } from '../loaders/useDecentModules';
import { useLoadDAOProposals } from '../loaders/useLoadDAOProposals';

export type SubmitProposalFunction = ({
  proposalData,
  nonce,
  pendingToastMessage,
  failedToastMessage,
  successToastMessage,
  successCallback,
  safeAddress,
}: ISubmitProposal) => Promise<void>;

interface ISubmitProposal {
  proposalData: ProposalExecuteData | undefined;
  nonce: number | undefined;
  pendingToastMessage: string;
  failedToastMessage: string;
  successToastMessage: string;
  successCallback?: (addressPrefix: string, safeAddress: Address) => void;
  /**
   * @param safeAddress - provided address of DAO to which proposal will be submitted
   */
  safeAddress?: Address;
}

interface ISubmitAzoriusProposal extends ISubmitProposal {
  azoriusAddress: Address;
  votingStrategyAddress: Address;
}

export default function useSubmitProposal() {
  const { t } = useTranslation('proposal');
  const [pendingCreateTx, setPendingCreateTx] = useState(false);
  const loadDAOProposals = useLoadDAOProposals();
  const { data: walletClient } = useNetworkWalletClient();
  const publicClient = useNetworkPublicClient();

  const { getVotingStrategies } = useVotingStrategiesAddresses();
  const { address: userAddress } = useAccount();

  const {
    guardContracts: { freezeVotingContractAddress },
    governanceContracts: {
      linearVotingErc20Address,
      linearVotingErc20WithHatsWhitelistingAddress,
      linearVotingErc721Address,
      linearVotingErc721WithHatsWhitelistingAddress,
    },
    action,
  } = useFractal();
  const { safe, modules } = useDaoInfoStore();
  const safeAPI = useSafeAPI();

  const globalAzoriusContract = useMemo(() => {
    if (!modules || !walletClient) {
      return;
    }
    const azoriusModule = getAzoriusModuleFromModules(modules);
    if (!azoriusModule) {
      return;
    }

    return getContract({
      abi: abis.Azorius,
      address: azoriusModule.moduleAddress,
      client: walletClient,
    });
  }, [modules, walletClient]);

  const lookupModules = useDecentModules();
  const {
    chain,
    safeBaseURL,
    addressPrefix,
    contracts: { multiSendCallOnly },
  } = useNetworkConfigStore();
  const ipfsClient = useIPFSClient();

  const pendingProposalAdd = useCallback(
    (txHash: string) => {
      action.dispatch({
        type: FractalGovernanceAction.PENDING_PROPOSAL_ADD,
        payload: txHash,
      });
    },
    [action],
  );

  const submitMultisigProposal = useCallback(
    async ({
      pendingToastMessage,
      successToastMessage,
      failedToastMessage,
      nonce,
      proposalData,
      successCallback,
      safeAddress,
    }: ISubmitProposal) => {
      if (!proposalData || !walletClient) {
        return;
      }

      if (!safeAddress || nonce === undefined) {
        return;
      }

      const toastId = toast.loading(pendingToastMessage, {
        duration: Infinity,
      });

      setPendingCreateTx(true);
      try {
        if (
          proposalData.metaData.title ||
          proposalData.metaData.description ||
          proposalData.metaData.documentationUrl
        ) {
          const metaData: CreateProposalMetadata = {
            title: proposalData.metaData.title || '',
            description: proposalData.metaData.description || '',
            documentationUrl: proposalData.metaData.documentationUrl || '',
          };
          const { Hash } = await ipfsClient.add(JSON.stringify(metaData));
          proposalData.targets.push(ADDRESS_MULTISIG_METADATA);
          proposalData.values.push(0n);
          proposalData.calldatas.push(encodeAbiParameters(parseAbiParameters(['string']), [Hash]));
        }

        let to = proposalData.targets[0];
        let value = proposalData.values[0];
        let data = proposalData.calldatas[0];
        let operation: 0 | 1 = 0;

        if (proposalData.targets.length > 1) {
          // Need to wrap it in Multisend function call
          to = multiSendCallOnly;
          value = 0n;

          const tempData = proposalData.targets.map((target, index) => {
            return {
              to: target,
              value: proposalData.values[index],
              data: proposalData.calldatas[index],
              operation: 0,
            } as MetaTransaction;
          });

          data = encodeFunctionData({
            abi: MultiSendCallOnlyAbi,
            functionName: 'multiSend',
            args: [encodeMultiSend(tempData)],
          });

          if (!isHex(data)) {
            throw new Error('Error encoding proposal data');
          }

          operation = 1;
        }

        const response = await axios.post(
          buildSafeApiUrl(safeBaseURL, `/safes/${safeAddress}/multisig-transactions/`),
          await buildSafeAPIPost(safeAddress, walletClient, chain.id, {
            to,
            value,
            data,
            operation,
            nonce,
          }),
        );

        const responseData = JSON.parse(response.config.data);
        const txHash = responseData.contractTransactionHash;
        pendingProposalAdd(txHash);

        await loadDAOProposals();

        if (successCallback) {
          successCallback(addressPrefix, safeAddress);
        }
        toast.success(successToastMessage, { id: toastId });
      } catch (e: any) {
        toast.error(failedToastMessage, { id: toastId });

        e.response?.data?.nonFieldErrors?.forEach((error: string) => {
          if (error.includes('Tx with nonce') && error.includes('already executed')) {
            toast.error(t('multisigNonceDuplicateErrorMessage'));
          }
        });
        logError(e, 'Error during Multi-sig proposal creation');
      } finally {
        setPendingCreateTx(false);
        return;
      }
    },
    [
      addressPrefix,
      chain.id,
      ipfsClient,
      loadDAOProposals,
      multiSendCallOnly,
      pendingProposalAdd,
      safeBaseURL,
      walletClient,
      t,
    ],
  );

  const submitAzoriusProposal = useCallback(
    async ({
      proposalData,
      azoriusAddress,
      votingStrategyAddress,
      pendingToastMessage,
      successToastMessage,
      successCallback,
      failedToastMessage,
      safeAddress,
    }: ISubmitAzoriusProposal) => {
      if (!proposalData || !walletClient) {
        return;
      }
      const toastId = toast.loading(pendingToastMessage, {
        duration: Infinity,
      });

      setPendingCreateTx(true);
      try {
        const transactions = proposalData.targets.map((target, index) => ({
          to: target,
          value: proposalData.values[index],
          data: proposalData.calldatas[index],
          operation: 0,
        }));

        const azoriusContract = getContract({
          abi: abis.Azorius,
          address: azoriusAddress,
          client: walletClient,
        });

        // @todo: Implement voting strategy proposal selection when/if we will support multiple strategies on single Azorius instance
        const txHash = await azoriusContract.write.submitProposal([
          votingStrategyAddress,
          '0x',
          transactions,
          JSON.stringify({
            title: proposalData.metaData.title,
            description: proposalData.metaData.description,
            documentationUrl: proposalData.metaData.documentationUrl,
          }),
        ]);

        await publicClient.waitForTransactionReceipt({ hash: txHash });
        toast.success(successToastMessage, { id: toastId });

        pendingProposalAdd(txHash);

        if (successCallback) {
          successCallback(addressPrefix, safeAddress!);
        }
      } catch (e) {
        toast.error(failedToastMessage, { id: toastId });
        logError(e, 'Error during Azorius proposal creation');
      } finally {
        setPendingCreateTx(false);
      }
    },
    [addressPrefix, pendingProposalAdd, publicClient, walletClient],
  );

  const submitProposal: SubmitProposalFunction = useCallback(
    async ({
      proposalData,
      nonce,
      pendingToastMessage,
      failedToastMessage,
      successToastMessage,
      successCallback,
      safeAddress,
    }: ISubmitProposal) => {
      if (!proposalData || !safeAPI || !userAddress) {
        return;
      }

      if (safeAddress && isAddress(safeAddress)) {
        // Submitting proposal to any DAO out of global context
        const votingStrategies = await getVotingStrategies(safeAddress);
        const safeInfo = await safeAPI.getSafeInfo(safeAddress);
        const decentModules = await lookupModules(safeInfo.modules);
        const azoriusModule = getAzoriusModuleFromModules(decentModules);
        if (!azoriusModule || !votingStrategies) {
          await submitMultisigProposal({
            proposalData,
            pendingToastMessage,
            successToastMessage,
            failedToastMessage,
            nonce,
            successCallback,
            safeAddress,
          });
        } else {
          const userProposerVotingStrategy = (
            await Promise.all(
              votingStrategies.map(async votingStrategy => {
                const votingContract = getContract({
                  abi: abis.LinearERC20Voting,
                  client: publicClient,
                  address: votingStrategy.strategyAddress,
                });
                const isProposer = await votingContract.read.isProposer([userAddress]);
                return { isProposer, votingStrategy };
              }),
            )
          ).find(votingStrategy => votingStrategy.isProposer);

          if (!userProposerVotingStrategy) {
            throw new Error('User is not a proposer!');
          }
          await submitAzoriusProposal({
            proposalData,
            pendingToastMessage,
            successToastMessage,
            failedToastMessage,
            nonce,
            successCallback,
            safeAddress,
            azoriusAddress: azoriusModule.moduleAddress,
            votingStrategyAddress: userProposerVotingStrategy.votingStrategy.strategyAddress,
          });
        }
      } else {
        const votingStrategyAddress =
          linearVotingErc20Address ||
          linearVotingErc20WithHatsWhitelistingAddress ||
          linearVotingErc721Address ||
          linearVotingErc721WithHatsWhitelistingAddress ||
          freezeVotingContractAddress;

        if (!globalAzoriusContract || !votingStrategyAddress) {
          await submitMultisigProposal({
            proposalData,
            pendingToastMessage,
            successToastMessage,
            failedToastMessage,
            nonce,
            successCallback,
            safeAddress: safe?.address,
          });
        } else {
          const userProposerVotingStrategy = (
            await Promise.all(
              [
                linearVotingErc20Address,
                linearVotingErc20WithHatsWhitelistingAddress,
                linearVotingErc721Address,
                linearVotingErc721WithHatsWhitelistingAddress,
                freezeVotingContractAddress,
              ].map(async votingStrategy => {
                if (!votingStrategy) {
                  return { isProposer: false, votingStrategy };
                }
                const votingContract = getContract({
                  abi: abis.LinearERC20Voting,
                  client: publicClient,
                  address: votingStrategy,
                });
                const isProposer = await votingContract.read.isProposer([userAddress]);
                return { isProposer, votingStrategy };
              }),
            )
          ).find(votingStrategy => votingStrategy.isProposer);

          if (!userProposerVotingStrategy || !userProposerVotingStrategy.votingStrategy) {
            throw new Error('User is not a proposer!');
          }
          await submitAzoriusProposal({
            proposalData,
            pendingToastMessage,
            successToastMessage,
            failedToastMessage,
            nonce,
            successCallback,
            votingStrategyAddress: userProposerVotingStrategy.votingStrategy,
            azoriusAddress: globalAzoriusContract.address,
            safeAddress: safe?.address,
          });
        }
      }
    },
    [
      linearVotingErc721Address,
      linearVotingErc721WithHatsWhitelistingAddress,
      freezeVotingContractAddress,
      getVotingStrategies,
      globalAzoriusContract,
      lookupModules,
      linearVotingErc20Address,
      linearVotingErc20WithHatsWhitelistingAddress,
      safe?.address,
      safeAPI,
      submitAzoriusProposal,
      submitMultisigProposal,
      publicClient,
      userAddress,
    ],
  );

  return { submitProposal, pendingCreateTx };
}
