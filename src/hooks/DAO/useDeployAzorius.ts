import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { encodeFunctionData, isHex } from 'viem';
import { usePublicClient } from 'wagmi';
import GnosisSafeL2Abi from '../../assets/abi/GnosisSafeL2';
import MultiSendCallOnlyAbi from '../../assets/abi/MultiSendCallOnly';
import { DAO_ROUTES } from '../../constants/routes';
import { TxBuilderFactory } from '../../models/TxBuilderFactory';
import { useFractal } from '../../providers/App/AppProvider';
import { useNetworkConfig } from '../../providers/NetworkConfig/NetworkConfigProvider';
import {
  BaseContracts,
  AzoriusContracts,
  ProposalExecuteData,
  AzoriusERC20DAO,
  AzoriusERC721DAO,
} from '../../types';
import { useCanUserCreateProposal } from '../utils/useCanUserSubmitProposal';
import useSignerOrProvider from '../utils/useSignerOrProvider';
import useSubmitProposal from './proposal/useSubmitProposal';

const useDeployAzorius = () => {
  const signerOrProvider = useSignerOrProvider();
  const navigate = useNavigate();
  const {
    contracts: {
      fallbackHandler,
      votesERC20WrapperMasterCopy,
      votesERC20MasterCopy,
      keyValuePairs,
      fractalRegistry,
      safeFactory,
      safe: safeSingleton,
      zodiacModuleProxyFactory,
      multisend: multiSendCallOnly,
    },
    addressPrefix,
  } = useNetworkConfig();
  const {
    node: { daoAddress, safe },
    baseContracts,
  } = useFractal();

  const { t } = useTranslation(['transaction', 'proposalMetadata']);
  const { submitProposal } = useSubmitProposal();
  const { canUserCreateProposal } = useCanUserCreateProposal();
  const publicClient = usePublicClient();

  const deployAzorius = useCallback(
    async (
      daoData: AzoriusERC20DAO | AzoriusERC721DAO,
      shouldSetName?: boolean,
      shouldSetSnapshot?: boolean,
    ) => {
      if (!daoAddress || !canUserCreateProposal || !safe || !baseContracts || !publicClient) {
        return;
      }
      const {
        linearVotingMasterCopyContract,
        linearVotingERC721MasterCopyContract,
        fractalAzoriusMasterCopyContract,
        fractalModuleMasterCopyContract,
        multisigFreezeGuardMasterCopyContract,
        azoriusFreezeGuardMasterCopyContract,
        freezeMultisigVotingMasterCopyContract,
        freezeERC20VotingMasterCopyContract,
        freezeERC721VotingMasterCopyContract,
        claimingMasterCopyContract,
      } = baseContracts;
      let azoriusContracts: AzoriusContracts;

      azoriusContracts = {
        fractalAzoriusMasterCopyContract: fractalAzoriusMasterCopyContract.asProvider,
        linearVotingMasterCopyContract: linearVotingMasterCopyContract.asProvider,
        linearVotingERC721MasterCopyContract: linearVotingERC721MasterCopyContract.asProvider,
        azoriusFreezeGuardMasterCopyContract: azoriusFreezeGuardMasterCopyContract.asProvider,
        claimingMasterCopyContract: claimingMasterCopyContract.asProvider,
      };

      const builderBaseContracts: BaseContracts = {
        fractalModuleMasterCopyContract: fractalModuleMasterCopyContract.asProvider,
        multisigFreezeGuardMasterCopyContract: multisigFreezeGuardMasterCopyContract.asProvider,
        freezeERC20VotingMasterCopyContract: freezeERC20VotingMasterCopyContract.asProvider,
        freezeERC721VotingMasterCopyContract: freezeERC721VotingMasterCopyContract.asProvider,
        freezeMultisigVotingMasterCopyContract: freezeMultisigVotingMasterCopyContract.asProvider,
      };

      const txBuilderFactory = new TxBuilderFactory(
        signerOrProvider,
        publicClient,
        builderBaseContracts,
        azoriusContracts,
        daoData,
        fallbackHandler,
        votesERC20WrapperMasterCopy,
        votesERC20MasterCopy,
        keyValuePairs,
        fractalRegistry,
        safeFactory,
        safeSingleton,
        zodiacModuleProxyFactory,
        multiSendCallOnly,
        undefined,
        undefined,
      );

      txBuilderFactory.setSafeContract(daoAddress);

      const daoTxBuilder = txBuilderFactory.createDaoTxBuilder();
      const safeTx = await daoTxBuilder.buildAzoriusTx(shouldSetName, shouldSetSnapshot, {
        owners: safe.owners,
      });

      if (!isHex(safeTx)) {
        throw new Error('Encoded safeTx is not a hex string');
      }

      const encodedAddOwnerWithThreshold = encodeFunctionData({
        abi: GnosisSafeL2Abi,
        functionName: 'addOwnerWithThreshold',
        args: [multiSendCallOnly, 1n],
      });

      const encodedMultisend = encodeFunctionData({
        abi: MultiSendCallOnlyAbi,
        functionName: 'multiSend',
        args: [safeTx],
      });

      const proposalData: ProposalExecuteData = {
        targets: [daoAddress, multiSendCallOnly],
        values: [0n, 0n],
        calldatas: [encodedAddOwnerWithThreshold, encodedMultisend],
        metaData: {
          title: '',
          description: '',
          documentationUrl: '',
        },
      };

      await submitProposal({
        proposalData,
        nonce: safe.nonce,
        pendingToastMessage: t('modifyGovernanceSetAzoriusProposalPendingMessage'),
        successToastMessage: t('proposalCreateSuccessToastMessage', { ns: 'proposal' }),
        failedToastMessage: t('proposalCreateFailureToastMessage', { ns: 'proposal' }),
        successCallback: () => navigate(DAO_ROUTES.proposals.relative(addressPrefix, daoAddress)),
      });
    },
    [
      signerOrProvider,
      publicClient,
      baseContracts,
      t,
      canUserCreateProposal,
      daoAddress,
      submitProposal,
      navigate,
      safe,
      fallbackHandler,
      addressPrefix,
      votesERC20WrapperMasterCopy,
      votesERC20MasterCopy,
      keyValuePairs,
      fractalRegistry,
      safeFactory,
      safeSingleton,
      zodiacModuleProxyFactory,
      multiSendCallOnly,
    ],
  );

  return deployAzorius;
};

export default useDeployAzorius;
