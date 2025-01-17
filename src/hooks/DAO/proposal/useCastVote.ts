import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Address, getContract } from 'viem';
import { useFractal } from '../../../providers/App/AppProvider';
import { useNetworkWalletClient } from '../../useNetworkWalletClient';
import { useTransaction } from '../../utils/useTransaction';
import useUserERC721VotingTokens from './useUserERC721VotingTokens';

const useCastVote = (proposalId: string, strategy: Address) => {
  const {
    governanceContracts: {
      linearVotingErc20Address,
      linearVotingErc20WithHatsWhitelistingAddress,
      linearVotingErc721Address,
      linearVotingErc721WithHatsWhitelistingAddress,
    },
  } = useFractal();

  const [contractCall, pending] = useTransaction();

  const { remainingTokenIds, remainingTokenAddresses } = useUserERC721VotingTokens(
    null,
    proposalId,
  );

  const { data: walletClient } = useNetworkWalletClient();

  const { t } = useTranslation('transaction');

  const castVote = useCallback(
    async (vote: number) => {
      if (!walletClient) {
        return;
      }

      if (
        strategy === linearVotingErc20Address ||
        strategy === linearVotingErc20WithHatsWhitelistingAddress
      ) {
        const ozLinearVotingContract = getContract({
          abi: abis.LinearERC20Voting,
          address: strategy,
          client: walletClient,
        });
        contractCall({
          contractFn: () => ozLinearVotingContract.write.vote([Number(proposalId), vote]),
          pendingMessage: t('pendingCastVote'),
          failedMessage: t('failedCastVote'),
          successMessage: t('successCastVote'),
        });
      } else if (
        strategy === linearVotingErc721Address ||
        strategy === linearVotingErc721WithHatsWhitelistingAddress
      ) {
        const erc721LinearVotingContract = getContract({
          abi: abis.LinearERC721Voting,
          address: strategy,
          client: walletClient,
        });
        contractCall({
          contractFn: () =>
            erc721LinearVotingContract.write.vote([
              Number(proposalId),
              vote,
              remainingTokenAddresses,
              remainingTokenIds.map(i => BigInt(i)),
            ]),
          pendingMessage: t('pendingCastVote'),
          failedMessage: t('failedCastVote'),
          successMessage: t('successCastVote'),
        });
      }
    },
    [
      contractCall,
      linearVotingErc721Address,
      linearVotingErc721WithHatsWhitelistingAddress,
      linearVotingErc20Address,
      linearVotingErc20WithHatsWhitelistingAddress,
      proposalId,
      remainingTokenAddresses,
      remainingTokenIds,
      t,
      walletClient,
      strategy,
    ],
  );

  return {
    castVote,
    castVotePending: pending,
  };
};

export default useCastVote;
