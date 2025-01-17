import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Address, encodeFunctionData, getContract, isHex } from 'viem';
import GnosisSafeL2Abi from '../../assets/abi/GnosisSafeL2';
import MultiSendCallOnlyAbi from '../../assets/abi/MultiSendCallOnly';
import { SENTINEL_ADDRESS } from '../../constants/common';
import { DAO_ROUTES } from '../../constants/routes';
import { TxBuilderFactory } from '../../models/TxBuilderFactory';
import { useSafeAPI } from '../../providers/App/hooks/useSafeAPI';
import { useNetworkConfigStore } from '../../providers/NetworkConfig/useNetworkConfigStore';
import { useDaoInfoStore } from '../../store/daoInfo/useDaoInfoStore';
import {
  AzoriusERC20DAO,
  AzoriusERC721DAO,
  FractalModuleType,
  ProposalExecuteData,
  SubDAO,
  VotingStrategyType,
} from '../../types';
import useNetworkPublicClient from '../useNetworkPublicClient';
import { useAddressContractType } from '../utils/useAddressContractType';
import { useCanUserCreateProposal } from '../utils/useCanUserSubmitProposal';
import { DecentModule } from './../../types/fractal';
import { useDecentModules } from './loaders/useDecentModules';
import useSubmitProposal from './proposal/useSubmitProposal';

const useDeployAzorius = () => {
  const navigate = useNavigate();
  const { getAddressContractType } = useAddressContractType();
  const {
    contracts: {
      compatibilityFallbackHandler,
      votesErc20MasterCopy,
      keyValuePairs,
      gnosisSafeProxyFactory,
      gnosisSafeL2Singleton,
      zodiacModuleProxyFactory,
      multiSendCallOnly,
      claimErc20MasterCopy,
      moduleFractalMasterCopy,
      linearVotingErc20MasterCopy,
      linearVotingErc721MasterCopy,
      moduleAzoriusMasterCopy,
      freezeGuardAzoriusMasterCopy,
      freezeGuardMultisigMasterCopy,
      freezeVotingErc20MasterCopy,
      freezeVotingErc721MasterCopy,
      freezeVotingMultisigMasterCopy,
    },
    addressPrefix,
  } = useNetworkConfigStore();
  const { safe, subgraphInfo } = useDaoInfoStore();

  const { t } = useTranslation(['transaction', 'proposalMetadata']);
  const { submitProposal } = useSubmitProposal();
  const { canUserCreateProposal } = useCanUserCreateProposal();

  const publicClient = useNetworkPublicClient();
  const safeApi = useSafeAPI();
  const lookupModules = useDecentModules();

  const getParentDAOModules = useCallback(
    async (address: Address) => {
      try {
        if (!safeApi) {
          throw new Error('Safe API not ready');
        }
        const safeInfo = await safeApi.getSafeData(address);
        const modules = await lookupModules(safeInfo.modules);
        return modules;
      } catch {
        return;
      }
    },
    [lookupModules, safeApi],
  );
  const safeAddress = safe?.address;

  const deployAzorius = useCallback(
    async (
      daoData: AzoriusERC20DAO | AzoriusERC721DAO | SubDAO,
      customNonce: number | undefined,
      opts: {
        shouldSetName: boolean;
        shouldSetSnapshot: boolean;
      },
    ) => {
      const { shouldSetName, shouldSetSnapshot } = opts;
      if (!safeAddress || !canUserCreateProposal || !safe) {
        return;
      }

      let parentStrategyAddress: Address | undefined;
      let parentStrategyType: VotingStrategyType | undefined;
      let attachFractalModule = false;
      let parentModules: DecentModule[];

      if (subgraphInfo?.parentAddress) {
        const loadedParentModule = await getParentDAOModules(subgraphInfo.parentAddress);
        if (!loadedParentModule) {
          toast.error(t('errorLoadingParentNode'));
          return;
        } else {
          parentModules = loadedParentModule;
          const parentAzoriusModule = parentModules.find(
            fractalModule => fractalModule.moduleType === FractalModuleType.AZORIUS,
          );
          if (parentAzoriusModule) {
            const azoriusContract = getContract({
              abi: abis.Azorius,
              address: parentAzoriusModule.moduleAddress,
              client: publicClient,
            });

            // @dev assumes the first strategy is the voting contract
            const strategies = await azoriusContract.read.getStrategies([SENTINEL_ADDRESS, 0n]);
            parentStrategyAddress = strategies[1];

            const masterCopyData = await getAddressContractType(parentStrategyAddress);
            if (masterCopyData.isLinearVotingErc20) {
              parentStrategyType = VotingStrategyType.LINEAR_ERC20;
            } else if (masterCopyData.isLinearVotingErc721) {
              parentStrategyType = VotingStrategyType.LINEAR_ERC721;
            }
          }

          const parentFractalModule = parentModules.find(
            fractalModule => fractalModule.moduleType === FractalModuleType.FRACTAL,
          );
          if (!parentFractalModule) {
            // If FractalModule is not attached - we'll need to attach it only if it was specified through user input
            attachFractalModule = (daoData as SubDAO).attachFractalModule;
          }
        }
      }

      const txBuilderFactory = new TxBuilderFactory(
        publicClient,
        true,
        daoData,
        compatibilityFallbackHandler,
        votesErc20MasterCopy,
        keyValuePairs,
        gnosisSafeProxyFactory,
        gnosisSafeL2Singleton,
        zodiacModuleProxyFactory,
        freezeGuardAzoriusMasterCopy,
        freezeGuardMultisigMasterCopy,
        freezeVotingErc20MasterCopy,
        freezeVotingErc721MasterCopy,
        freezeVotingMultisigMasterCopy,
        multiSendCallOnly,
        claimErc20MasterCopy,
        moduleFractalMasterCopy,
        linearVotingErc20MasterCopy,
        linearVotingErc721MasterCopy,
        moduleAzoriusMasterCopy,
        subgraphInfo?.parentAddress ?? undefined,
      );

      txBuilderFactory.setSafeContract(safeAddress);

      const daoTxBuilder = txBuilderFactory.createDaoTxBuilder({
        attachFractalModule,
        parentStrategyAddress,
        parentStrategyType,
      });
      const safeTx = await daoTxBuilder.buildAzoriusTx({
        shouldSetName,
        shouldSetSnapshot,
        existingSafeOwners: safe.owners,
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

      // @todo - If Safe has subDAOs - we'll need to also swap Guard contracts there.
      // However, it will be possible only if FractalModule is attached
      // Otherwise - we need to provide some UI / UX that will inform user about the impact of modifying governance without ability to swap Guard contracts.

      const proposalData: ProposalExecuteData = {
        targets: [safeAddress, multiSendCallOnly],
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
        nonce: customNonce || safe.nonce,
        pendingToastMessage: t('modifyGovernanceSetAzoriusProposalPendingMessage'),
        successToastMessage: t('proposalCreateSuccessToastMessage', { ns: 'proposal' }),
        failedToastMessage: t('proposalCreateFailureToastMessage', { ns: 'proposal' }),
        successCallback: () => navigate(DAO_ROUTES.proposals.relative(addressPrefix, safeAddress)),
      });
    },
    [
      safeAddress,
      canUserCreateProposal,
      safe,
      publicClient,
      subgraphInfo?.parentAddress,
      compatibilityFallbackHandler,
      votesErc20MasterCopy,
      keyValuePairs,
      gnosisSafeProxyFactory,
      gnosisSafeL2Singleton,
      zodiacModuleProxyFactory,
      freezeGuardAzoriusMasterCopy,
      freezeGuardMultisigMasterCopy,
      freezeVotingErc20MasterCopy,
      freezeVotingErc721MasterCopy,
      freezeVotingMultisigMasterCopy,
      multiSendCallOnly,
      claimErc20MasterCopy,
      moduleFractalMasterCopy,
      linearVotingErc20MasterCopy,
      linearVotingErc721MasterCopy,
      moduleAzoriusMasterCopy,
      submitProposal,
      t,
      getParentDAOModules,
      getAddressContractType,
      navigate,
      addressPrefix,
    ],
  );

  return deployAzorius;
};

export default useDeployAzorius;
