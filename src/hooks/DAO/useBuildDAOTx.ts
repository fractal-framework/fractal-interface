import { useCallback } from 'react';
import { Address } from 'viem';
import { useAccount } from 'wagmi';
import { TxBuilderFactory } from '../../models/TxBuilderFactory';
import { useFractal } from '../../providers/App/AppProvider';
import { useNetworkConfigStore } from '../../providers/NetworkConfig/useNetworkConfigStore';
import {
  AzoriusERC20DAO,
  AzoriusERC721DAO,
  AzoriusGovernance,
  GovernanceType,
  SafeMultisigDAO,
  SubDAO,
  VotingStrategyType,
} from '../../types';
import useNetworkPublicClient from '../useNetworkPublicClient';

const useBuildDAOTx = () => {
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
  } = useNetworkConfigStore();

  const {
    governance,
    governanceContracts: { linearVotingErc721Address },
  } = useFractal();
  const user = useAccount();

  const publicClient = useNetworkPublicClient();

  const buildDao = useCallback(
    async (
      daoData: AzoriusERC20DAO | AzoriusERC721DAO | SafeMultisigDAO | SubDAO,
      parentAddress?: Address,
      parentTokenAddress?: Address,
    ) => {
      let isAzorius = false;

      if (!user.address) {
        return;
      }

      if (
        daoData.governance === GovernanceType.AZORIUS_ERC20 ||
        daoData.governance === GovernanceType.AZORIUS_ERC721
      ) {
        isAzorius = true;
      }

      const txBuilderFactory = new TxBuilderFactory(
        publicClient,
        isAzorius,
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
        parentAddress,
        parentTokenAddress,
      );

      await txBuilderFactory.setupSafeData();
      let parentStrategyType: VotingStrategyType | undefined;
      let parentStrategyAddress: Address | undefined;

      const azoriusGovernance = governance as AzoriusGovernance;
      if (governance.isAzorius && azoriusGovernance.votingStrategy) {
        parentStrategyType = azoriusGovernance.votingStrategy.strategyType;
        if (parentStrategyType === VotingStrategyType.LINEAR_ERC721 && linearVotingErc721Address) {
          parentStrategyAddress = linearVotingErc721Address;
        }
      }

      const daoTxBuilder = txBuilderFactory.createDaoTxBuilder({
        attachFractalModule: (daoData as SubDAO).attachFractalModule,
        parentStrategyType,
        parentStrategyAddress,
      });

      const buildSafeTxParams = {
        shouldSetName: true, // We KNOW this will always be true because the Decent UI doesn't allow creating a safe without a name
        shouldSetSnapshot: daoData.snapshotENS !== '',
      };

      // Build Tx bundle based on governance type (Azorius or Multisig)
      const safeTx = isAzorius
        ? await daoTxBuilder.buildAzoriusTx(buildSafeTxParams)
        : await daoTxBuilder.buildMultisigTx(buildSafeTxParams);

      return {
        predictedSafeAddress: txBuilderFactory.predictedSafeAddress!,
        createSafeTx: txBuilderFactory.createSafeTx!,
        safeTx,
      };
    },
    [
      user.address,
      publicClient,
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
      governance,
      linearVotingErc721Address,
    ],
  );

  return [buildDao] as const;
};

export default useBuildDAOTx;
