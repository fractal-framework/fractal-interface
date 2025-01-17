import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback, useMemo } from 'react';
import { formatUnits, getContract } from 'viem';
import { usePublicClient } from 'wagmi';
import { useFractal } from '../../../../providers/App/AppProvider';
import { FractalGovernanceAction } from '../../../../providers/App/governance/action';
import { AzoriusGovernance, VotingStrategyType } from '../../../../types';
import { blocksToSeconds } from '../../../../utils/contract';
import { useTimeHelpers } from '../../../utils/useTimeHelpers';

export const useERC20LinearStrategy = () => {
  const {
    governance,
    governanceContracts: {
      linearVotingErc20Address,
      linearVotingErc20WithHatsWhitelistingAddress,
      moduleAzoriusAddress,
    },
    action,
  } = useFractal();
  const { getTimeDuration } = useTimeHelpers();
  const publicClient = usePublicClient();

  const ozLinearVotingContract = useMemo(() => {
    const votingStrategyAddress =
      linearVotingErc20Address || linearVotingErc20WithHatsWhitelistingAddress;
    if (!votingStrategyAddress || !publicClient) {
      return;
    }

    return getContract({
      abi: abis.LinearERC20Voting,
      address: votingStrategyAddress,
      client: publicClient,
    });
  }, [linearVotingErc20Address, linearVotingErc20WithHatsWhitelistingAddress, publicClient]);

  const loadERC20Strategy = useCallback(async () => {
    if (!ozLinearVotingContract || !moduleAzoriusAddress || !publicClient) {
      return {};
    }

    const azoriusContract = getContract({
      abi: abis.Azorius,
      address: moduleAzoriusAddress,
      client: publicClient,
    });
    const azoriusGovernance = governance as AzoriusGovernance;
    const { votesToken } = azoriusGovernance;
    const [
      votingPeriodBlocks,
      quorumNumerator,
      quorumDenominator,
      timeLockPeriod,
      proposerThreshold,
    ] = await Promise.all([
      ozLinearVotingContract.read.votingPeriod(),
      ozLinearVotingContract.read.quorumNumerator(),
      ozLinearVotingContract.read.QUORUM_DENOMINATOR(),
      azoriusContract.read.timelockPeriod(),
      ozLinearVotingContract.read.requiredProposerWeight(),
    ]);

    const quorumPercentage = (quorumNumerator * 100n) / quorumDenominator;
    const votingPeriodValue = await blocksToSeconds(votingPeriodBlocks, publicClient);
    const timeLockPeriodValue = await blocksToSeconds(timeLockPeriod, publicClient);
    const votingData = {
      votingPeriod: {
        value: BigInt(votingPeriodValue),
        formatted: getTimeDuration(votingPeriodValue),
      },
      proposerThreshold: {
        value: proposerThreshold,
        formatted: formatUnits(proposerThreshold, votesToken?.decimals || 18),
      },
      quorumPercentage: {
        value: quorumPercentage,
        formatted: quorumPercentage.toString() + '%',
      },
      timeLockPeriod: {
        value: BigInt(timeLockPeriodValue),
        formatted: getTimeDuration(timeLockPeriodValue),
      },
      strategyType: VotingStrategyType.LINEAR_ERC20,
    };
    action.dispatch({ type: FractalGovernanceAction.SET_STRATEGY, payload: votingData });
  }, [
    action,
    moduleAzoriusAddress,
    getTimeDuration,
    ozLinearVotingContract,
    publicClient,
    governance,
  ]);

  return loadERC20Strategy;
};
