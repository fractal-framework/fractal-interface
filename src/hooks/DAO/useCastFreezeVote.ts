import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getContract } from 'viem';
import { useFractal } from '../../providers/App/AppProvider';
import { useDaoInfoStore } from '../../store/daoInfo/useDaoInfoStore';
import { FreezeVotingType } from '../../types';
import { useNetworkWalletClient } from '../useNetworkWalletClient';
import { useTransaction } from '../utils/useTransaction';
import useUserERC721VotingTokens from './proposal/useUserERC721VotingTokens';

export const useCastFreezeVote = () => {
  const [contractCall, pending] = useTransaction();
  const {
    guardContracts: { freezeVotingContractAddress, freezeVotingType },
  } = useFractal();
  const { subgraphInfo } = useDaoInfoStore();
  const { getUserERC721VotingTokens } = useUserERC721VotingTokens(null, null, false);

  const { t } = useTranslation('transaction');
  const { data: walletClient } = useNetworkWalletClient();

  const castFreezeVote = useCallback(() => {
    if (!freezeVotingContractAddress) return;

    if (freezeVotingType === FreezeVotingType.ERC721) {
      if (!walletClient) return;

      contractCall({
        contractFn: () => {
          const freezeERC721VotingContract = getContract({
            abi: abis.ERC721FreezeVoting,
            address: freezeVotingContractAddress,
            client: walletClient,
          });
          return getUserERC721VotingTokens(subgraphInfo?.parentAddress ?? null, null).then(
            tokensInfo => {
              return freezeERC721VotingContract.write.castFreezeVote([
                tokensInfo.totalVotingTokenAddresses,
                tokensInfo.totalVotingTokenIds.map(i => BigInt(i)),
              ]);
            },
          );
        },
        pendingMessage: t('pendingCastFreezeVote'),
        failedMessage: t('failedCastFreezeVote'),
        successMessage: t('successCastFreezeVote'),
      });
    } else if (freezeVotingType === FreezeVotingType.ERC20) {
      if (!walletClient) return;

      contractCall({
        contractFn: () => {
          const freezeERC20VotingContract = getContract({
            abi: abis.ERC20FreezeVoting,
            address: freezeVotingContractAddress,
            client: walletClient,
          });
          return freezeERC20VotingContract.write.castFreezeVote();
        },
        pendingMessage: t('pendingCastFreezeVote'),
        failedMessage: t('failedCastFreezeVote'),
        successMessage: t('successCastFreezeVote'),
      });
    } else if (freezeVotingType === FreezeVotingType.MULTISIG) {
      if (!walletClient) return;

      contractCall({
        contractFn: () => {
          const freezeMultisigVotingContract = getContract({
            abi: abis.MultisigFreezeVoting,
            address: freezeVotingContractAddress,
            client: walletClient,
          });
          return freezeMultisigVotingContract.write.castFreezeVote();
        },
        pendingMessage: t('pendingCastFreezeVote'),
        failedMessage: t('failedCastFreezeVote'),
        successMessage: t('successCastFreezeVote'),
      });
    } else {
      throw new Error('unknown freezeVotingType');
    }
  }, [
    contractCall,
    freezeVotingContractAddress,
    freezeVotingType,
    getUserERC721VotingTokens,
    subgraphInfo?.parentAddress,
    t,
    walletClient,
  ]);
  return { castFreezeVote, pending };
};
