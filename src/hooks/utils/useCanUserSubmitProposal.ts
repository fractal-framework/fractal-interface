import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback, useEffect, useState } from 'react';
import { Address, getContract } from 'viem';
import { useAccount } from 'wagmi';
import { useFractal } from '../../providers/App/AppProvider';
import { useSafeAPI } from '../../providers/App/hooks/useSafeAPI';
import { useDaoInfoStore } from '../../store/daoInfo/useDaoInfoStore';
import { GovernanceType } from '../../types';
import { isDemoMode } from '../../utils/demoMode';
import useNetworkPublicClient from '../useNetworkPublicClient';
import useVotingStrategiesAddresses from './useVotingStrategiesAddresses';

export function useCanUserCreateProposal() {
  const {
    governance: { type },
    governanceContracts: {
      linearVotingErc20Address,
      linearVotingErc20WithHatsWhitelistingAddress,
      linearVotingErc721Address,
      linearVotingErc721WithHatsWhitelistingAddress,
    },
  } = useFractal();
  const user = useAccount();
  const { safe } = useDaoInfoStore();
  const safeAPI = useSafeAPI();
  const [canUserCreateProposal, setCanUserCreateProposal] = useState<boolean>();
  const publicClient = useNetworkPublicClient();

  const { getVotingStrategies } = useVotingStrategiesAddresses();

  /**
   * Performs a check whether user has access rights to create proposal for DAO
   * @param {string} safeAddress - parameter to verify that user can create proposal for this specific DAO.
   * Otherwise - it is checked for DAO from the global context.
   * @returns {Promise<boolean>} - whether or not user has rights to create proposal either in global scope either for provided `safeAddress`.
   */
  const getCanUserCreateProposal = useCallback(
    async (safeAddress?: Address): Promise<boolean | undefined> => {
      if (!user.address || !safeAPI) {
        return;
      }

      const checkIsMultisigOwner = (owners?: string[]) => {
        return !!owners?.includes(user.address || '');
      };

      if (safeAddress) {
        const votingStrategies = await getVotingStrategies(safeAddress);
        if (votingStrategies) {
          let isProposer = false;
          await Promise.all(
            votingStrategies.map(async strategy => {
              if (!isProposer && user.address) {
                const votingContract = getContract({
                  abi: abis.LinearERC20Voting,
                  address: strategy.strategyAddress,
                  client: publicClient,
                });
                isProposer = await votingContract.read.isProposer([user.address]);
              }
            }),
          );
          return isProposer;
        } else {
          const safeInfo = await safeAPI.getSafeInfo(safeAddress);
          return checkIsMultisigOwner(safeInfo.owners);
        }
      } else {
        if (type === GovernanceType.MULTISIG) {
          const { owners } = safe || {};
          return checkIsMultisigOwner(owners);
        } else if (
          type === GovernanceType.AZORIUS_ERC20 ||
          type === GovernanceType.AZORIUS_ERC721
        ) {
          const isProposerPerStrategy = await Promise.all(
            [
              linearVotingErc20Address,
              linearVotingErc20WithHatsWhitelistingAddress,
              linearVotingErc721Address,
              linearVotingErc721WithHatsWhitelistingAddress,
            ].map(async votingStrategyAddress => {
              if (votingStrategyAddress) {
                const votingContract = getContract({
                  abi: abis.LinearERC20Voting,
                  address: votingStrategyAddress,
                  client: publicClient,
                });
                if (user.address) {
                  return {
                    isProposer: await votingContract.read.isProposer([user.address]),
                    votingStrategyAddress,
                  };
                }
              }
            }),
          );
          const isProposer = isProposerPerStrategy.some(strategy => strategy?.isProposer);
          return isProposer;
        } else {
          return;
        }
      }
    },
    [
      linearVotingErc721Address,
      linearVotingErc721WithHatsWhitelistingAddress,
      getVotingStrategies,
      linearVotingErc20Address,
      linearVotingErc20WithHatsWhitelistingAddress,
      publicClient,
      safe,
      safeAPI,
      type,
      user.address,
    ],
  );

  useEffect(() => {
    const loadCanUserCreateProposal = async () => {
      const newCanCreateProposal = isDemoMode() || (await getCanUserCreateProposal());
      if (newCanCreateProposal !== canUserCreateProposal) {
        setCanUserCreateProposal(newCanCreateProposal);
      }
    };
    loadCanUserCreateProposal();
  }, [getCanUserCreateProposal, canUserCreateProposal]);

  return { canUserCreateProposal, getCanUserCreateProposal };
}
