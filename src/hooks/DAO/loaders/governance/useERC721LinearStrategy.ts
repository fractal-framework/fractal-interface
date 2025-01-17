import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback, useMemo } from 'react';
import { getContract } from 'viem';
import { useFractal } from '../../../../providers/App/AppProvider';
import { FractalGovernanceAction } from '../../../../providers/App/governance/action';
import { VotingStrategyType } from '../../../../types';
import { blocksToSeconds } from '../../../../utils/contract';
import useNetworkPublicClient from '../../../useNetworkPublicClient';
import { useTimeHelpers } from '../../../utils/useTimeHelpers';

export const useERC721LinearStrategy = () => {
  const {
    governanceContracts: {
      linearVotingErc721Address,
      linearVotingErc721WithHatsWhitelistingAddress,
      moduleAzoriusAddress,
    },
    action,
  } = useFractal();
  const { getTimeDuration } = useTimeHelpers();
  const publicClient = useNetworkPublicClient();

  const erc721LinearVotingContract = useMemo(() => {
    const votingStrategyAddress =
      linearVotingErc721Address || linearVotingErc721WithHatsWhitelistingAddress;
    if (!votingStrategyAddress) {
      return;
    }

    return getContract({
      abi: abis.LinearERC721Voting,
      address: votingStrategyAddress,
      client: publicClient,
    });
  }, [linearVotingErc721Address, linearVotingErc721WithHatsWhitelistingAddress, publicClient]);

  const loadERC721Strategy = useCallback(async () => {
    if (!moduleAzoriusAddress || !erc721LinearVotingContract) {
      return;
    }

    const azoriusContract = getContract({
      abi: abis.Azorius,
      address: moduleAzoriusAddress,
      client: publicClient,
    });

    const [votingPeriodBlocks, quorumThreshold, proposerThreshold, timeLockPeriod] =
      await Promise.all([
        erc721LinearVotingContract.read.votingPeriod(),
        erc721LinearVotingContract.read.quorumThreshold(),
        erc721LinearVotingContract.read.proposerThreshold(),
        azoriusContract.read.timelockPeriod(),
      ]);

    const votingPeriodValue = await blocksToSeconds(votingPeriodBlocks, publicClient);
    const timeLockPeriodValue = await blocksToSeconds(timeLockPeriod, publicClient);
    const votingData = {
      proposerThreshold: {
        value: proposerThreshold,
        formatted: proposerThreshold.toString(),
      },
      votingPeriod: {
        value: BigInt(votingPeriodValue),
        formatted: getTimeDuration(votingPeriodValue),
      },
      quorumThreshold: {
        value: quorumThreshold,
        formatted: quorumThreshold.toString(),
      },
      timeLockPeriod: {
        value: BigInt(timeLockPeriodValue),
        formatted: getTimeDuration(timeLockPeriodValue),
      },
      strategyType: VotingStrategyType.LINEAR_ERC721,
    };
    action.dispatch({ type: FractalGovernanceAction.SET_STRATEGY, payload: votingData });
  }, [action, moduleAzoriusAddress, erc721LinearVotingContract, getTimeDuration, publicClient]);

  return loadERC721Strategy;
};
