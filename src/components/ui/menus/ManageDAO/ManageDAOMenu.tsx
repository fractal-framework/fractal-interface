import { Icon, IconButton } from '@chakra-ui/react';
import { abis } from '@fractal-framework/fractal-contracts';
import { GearFine } from '@phosphor-icons/react';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContract } from 'viem';
import { DAO_ROUTES } from '../../../../constants/routes';
import {
  isWithinFreezePeriod,
  isWithinFreezeProposalPeriod,
} from '../../../../helpers/freezePeriodHelpers';
import useUserERC721VotingTokens from '../../../../hooks/DAO/proposal/useUserERC721VotingTokens';
import useClawBack from '../../../../hooks/DAO/useClawBack';
import { useNetworkWalletClient } from '../../../../hooks/useNetworkWalletClient';
import useBlockTimestamp from '../../../../hooks/utils/useBlockTimestamp';
import { useCanUserCreateProposal } from '../../../../hooks/utils/useCanUserSubmitProposal';
import { useFractal } from '../../../../providers/App/AppProvider';
import { useNetworkConfigStore } from '../../../../providers/NetworkConfig/useNetworkConfigStore';
import { useDaoInfoStore } from '../../../../store/daoInfo/useDaoInfoStore';
import { FractalModuleType, FreezeVotingType, GovernanceType } from '../../../../types';
import { ModalType } from '../../modals/ModalProvider';
import { useDecentModal } from '../../modals/useDecentModal';
import { OptionMenu } from '../OptionMenu';

export function ManageDAOMenu() {
  const {
    governance: { type },
    guard,
    guardContracts,
  } = useFractal();
  const dao = useDaoInfoStore();
  const currentTime = BigInt(useBlockTimestamp());
  const navigate = useNavigate();
  const safeAddress = dao.safe?.address;
  const { canUserCreateProposal } = useCanUserCreateProposal();
  const { getUserERC721VotingTokens } = useUserERC721VotingTokens(safeAddress ?? null, null, false);
  const { handleClawBack } = useClawBack({
    parentAddress: dao.subgraphInfo?.parentAddress ?? null,
    childSafeInfo: {
      daoAddress: dao.safe?.address,
      modules: dao.modules,
    },
  });

  const { addressPrefix } = useNetworkConfigStore();

  const handleNavigateToSettings = useCallback(() => {
    if (safeAddress) {
      navigate(DAO_ROUTES.settings.relative(addressPrefix, safeAddress));
    }
  }, [navigate, addressPrefix, safeAddress]);

  const handleModifyGovernance = useDecentModal(ModalType.CONFIRM_MODIFY_GOVERNANCE);

  const { data: walletClient } = useNetworkWalletClient();

  const freezeOption = useMemo(
    () => ({
      optionKey: 'optionInitiateFreeze',
      onClick: () => {
        const freezeVotingType = guardContracts.freezeVotingType;

        if (freezeVotingType === FreezeVotingType.MULTISIG) {
          if (!guardContracts.freezeVotingContractAddress) {
            throw new Error('freeze voting contract address not set');
          }
          if (!walletClient) {
            throw new Error('wallet client not set');
          }

          const freezeVotingContract = getContract({
            abi: abis.MultisigFreezeVoting,
            address: guardContracts.freezeVotingContractAddress,
            client: walletClient,
          });
          return freezeVotingContract.write.castFreezeVote();
        } else if (freezeVotingType === FreezeVotingType.ERC20) {
          if (!guardContracts.freezeVotingContractAddress) {
            throw new Error('freeze voting contract address not set');
          }
          if (!walletClient) {
            throw new Error('wallet client not set');
          }
          const contract = getContract({
            abi: abis.ERC20FreezeVoting,
            address: guardContracts.freezeVotingContractAddress,
            client: walletClient,
          });
          return contract.write.castFreezeVote();
        } else if (freezeVotingType === FreezeVotingType.ERC721) {
          getUserERC721VotingTokens(dao.subgraphInfo?.parentAddress ?? null, null).then(
            tokensInfo => {
              if (!guardContracts.freezeVotingContractAddress) {
                throw new Error('freeze voting contract address not set');
              }
              if (!walletClient) {
                throw new Error('wallet client not set');
              }
              const freezeERC721VotingContract = getContract({
                abi: abis.ERC721FreezeVoting,
                address: guardContracts.freezeVotingContractAddress,
                client: walletClient,
              });
              return freezeERC721VotingContract.write.castFreezeVote([
                tokensInfo.totalVotingTokenAddresses,
                tokensInfo.totalVotingTokenIds.map(i => BigInt(i)),
              ]);
            },
          );
        }
      },
    }),
    [
      dao.subgraphInfo?.parentAddress,
      getUserERC721VotingTokens,
      guardContracts.freezeVotingContractAddress,
      guardContracts.freezeVotingType,
      walletClient,
    ],
  );

  const options = useMemo(() => {
    const clawBackOption = {
      optionKey: 'optionInitiateClawback',
      onClick: handleClawBack,
    };

    const modifyGovernanceOption = {
      optionKey: 'optionModifyGovernance',
      onClick: handleModifyGovernance,
    };

    const settingsOption = {
      optionKey: 'optionSettings',
      onClick: handleNavigateToSettings,
    };

    if (
      guard.freezeProposalCreatedTime !== null &&
      guard.freezeProposalPeriod !== null &&
      guard.freezePeriod !== null &&
      !isWithinFreezeProposalPeriod(
        guard.freezeProposalCreatedTime,
        guard.freezeProposalPeriod,
        currentTime,
      ) &&
      !isWithinFreezePeriod(guard.freezeProposalCreatedTime, guard.freezePeriod, currentTime) &&
      guard.userHasVotes
    ) {
      if (type === GovernanceType.MULTISIG) {
        return [settingsOption, freezeOption, modifyGovernanceOption];
      } else {
        return [settingsOption, freezeOption];
      }
    } else if (
      guard.freezeProposalCreatedTime !== null &&
      guard.freezePeriod !== null &&
      isWithinFreezePeriod(guard.freezeProposalCreatedTime, guard.freezePeriod, currentTime) &&
      guard.isFrozen &&
      guard.userHasVotes
    ) {
      const fractalModule = (dao.modules ?? []).find(
        module => module.moduleType === FractalModuleType.FRACTAL,
      );
      if (fractalModule) {
        return [settingsOption, clawBackOption];
      } else {
        return [settingsOption];
      }
    } else {
      return [
        settingsOption,
        ...(canUserCreateProposal && type === GovernanceType.MULTISIG
          ? [modifyGovernanceOption]
          : []),
      ];
    }
  }, [
    guard,
    currentTime,
    type,
    handleClawBack,
    handleModifyGovernance,
    handleNavigateToSettings,
    freezeOption,
    dao.modules,
    canUserCreateProposal,
  ]);

  return options.length === 1 ? (
    <IconButton
      aria-label="Manage DAO"
      icon={
        <Icon
          as={GearFine}
          boxSize="1.25rem"
        />
      }
      onClick={options[0].onClick}
      variant="tertiary"
      p="0.25rem"
      h="fit-content"
      sx={{
        span: {
          h: '1.25rem',
        },
      }}
    />
  ) : (
    <OptionMenu
      trigger={
        <Icon
          as={GearFine}
          boxSize="1.25rem"
        />
      }
      options={options}
      namespace="menu"
      buttonAs={IconButton}
      buttonProps={{
        variant: 'tertiary',
        p: '0.25rem',
        h: 'fit-content',
        sx: {
          span: {
            h: '1.25rem',
          },
        },
      }}
    />
  );
}
