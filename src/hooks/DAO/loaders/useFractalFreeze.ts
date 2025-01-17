import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback, useEffect, useRef } from 'react';
import { Address, GetContractReturnType, PublicClient, getContract, zeroAddress } from 'viem';
import { useAccount } from 'wagmi';
import GnosisSafeL2Abi from '../../../assets/abi/GnosisSafeL2';
import {
  isWithinFreezeProposalPeriod,
  isWithinFreezePeriod,
} from '../../../helpers/freezePeriodHelpers';
import { useFractal } from '../../../providers/App/AppProvider';
import { FractalGuardAction } from '../../../providers/App/guard/action';
import { FractalGuardContracts, FreezeVotingType } from '../../../types';
import { blocksToSeconds, getTimeStamp } from '../../../utils/contract';
import useNetworkPublicClient from '../../useNetworkPublicClient';
import { useAddressContractType } from '../../utils/useAddressContractType';
import useUserERC721VotingTokens from '../proposal/useUserERC721VotingTokens';
import { FreezeGuard } from './../../../types/fractal';

export const useFractalFreeze = ({
  loadOnMount = true,
  parentSafeAddress,
}: {
  loadOnMount?: boolean;
  parentSafeAddress: Address | null;
}) => {
  // load key for component; helps prevent unnecessary calls
  const loadKey = useRef<string>();
  const isFreezeSet = useRef(false);

  const { guardContracts, action } = useFractal();
  const { address: account } = useAccount();
  const { getUserERC721VotingTokens } = useUserERC721VotingTokens(
    parentSafeAddress,
    null,
    loadOnMount,
  );

  const publicClient = useNetworkPublicClient();
  const { getAddressContractType } = useAddressContractType();

  const loadFractalFreezeGuard = useCallback(
    async ({
      freezeVotingContractAddress,
      freezeVotingType: freezeVotingType,
    }: FractalGuardContracts) => {
      if (freezeVotingType == null || !freezeVotingContractAddress || !account) {
        return;
      }

      let freezeVotingContract:
        | GetContractReturnType<typeof abis.MultisigFreezeVoting, PublicClient>
        | GetContractReturnType<typeof abis.ERC20FreezeVoting, PublicClient>
        | GetContractReturnType<typeof abis.ERC721FreezeVoting, PublicClient>;

      if (freezeVotingType === FreezeVotingType.ERC20) {
        freezeVotingContract = getContract({
          abi: abis.ERC20FreezeVoting,
          address: freezeVotingContractAddress,
          client: publicClient,
        });
      } else if (freezeVotingType === FreezeVotingType.ERC721) {
        freezeVotingContract = getContract({
          abi: abis.ERC721FreezeVoting,
          address: freezeVotingContractAddress,
          client: publicClient,
        });
      } else if (freezeVotingType === FreezeVotingType.MULTISIG) {
        freezeVotingContract = getContract({
          abi: abis.MultisigFreezeVoting,
          address: freezeVotingContractAddress,
          client: publicClient,
        });
      } else {
        throw new Error('unknown freezeVotingType');
      }

      let userHasVotes: boolean = false;

      const [
        freezeCreatedBlock,
        freezeVotesThreshold,
        freezeProposalCreatedBlock,
        freezeProposalVoteCount,
        freezeProposalBlock,
        freezePeriodBlock,
        isFrozen,
      ] = await Promise.all([
        freezeVotingContract.read.freezeProposalCreatedBlock(),
        freezeVotingContract.read.freezeVotesThreshold(),
        freezeVotingContract.read.freezeProposalCreatedBlock(),
        freezeVotingContract.read.freezeProposalVoteCount(),
        freezeVotingContract.read.freezeProposalPeriod(),
        freezeVotingContract.read.freezePeriod(),
        freezeVotingContract.read.isFrozen(),
      ]);

      // timestamp when proposal was created
      const freezeProposalCreatedTime = await getTimeStamp(
        freezeProposalCreatedBlock,
        publicClient,
      );

      // length of time to vote on freeze
      const freezeProposalPeriod = await blocksToSeconds(freezeProposalBlock, publicClient);

      // length of time frozen for in seconds
      const freezePeriod = await blocksToSeconds(freezePeriodBlock, publicClient);

      const userHasFreezeVoted = await freezeVotingContract.read.userHasFreezeVoted([
        account || zeroAddress,
        BigInt(freezeCreatedBlock),
      ]);

      const freezeGuard = {
        freezeVotesThreshold,
        freezeProposalCreatedTime: BigInt(freezeProposalCreatedTime),
        freezeProposalVoteCount,
        freezeProposalPeriod: BigInt(freezeProposalPeriod),
        freezePeriod: BigInt(freezePeriod),
        userHasFreezeVoted,
        isFrozen,
      };

      if (freezeVotingType === FreezeVotingType.MULTISIG) {
        const safeFreezeVotingContract = getContract({
          abi: abis.MultisigFreezeVoting,
          address: freezeVotingContractAddress,
          client: publicClient,
        });

        const safeContract = getContract({
          abi: GnosisSafeL2Abi,
          address: await safeFreezeVotingContract.read.parentGnosisSafe(),
          client: publicClient,
        });
        const owners = await safeContract.read.getOwners();
        userHasVotes = owners.find(owner => owner === account) !== undefined;
      } else if (freezeVotingType === FreezeVotingType.ERC20) {
        const freezeERC20VotingContract = getContract({
          abi: abis.ERC20FreezeVoting,
          address: freezeVotingContractAddress,
          client: publicClient,
        });
        const votesERC20Address = await freezeERC20VotingContract.read.votesERC20();
        const { isVotesErc20 } = await getAddressContractType(votesERC20Address);
        if (!isVotesErc20) {
          throw new Error('votesERC20Address is not a valid VotesERC20 contract');
        }
        const votesTokenContract = getContract({
          abi: abis.VotesERC20,
          address: votesERC20Address,
          client: publicClient,
        });
        const currentTimestamp = await getTimeStamp('latest', publicClient);
        const isFreezeActive =
          isWithinFreezeProposalPeriod(
            freezeGuard.freezeProposalCreatedTime,
            freezeGuard.freezeProposalPeriod,
            BigInt(currentTimestamp),
          ) ||
          isWithinFreezePeriod(
            freezeGuard.freezeProposalCreatedTime,
            freezeGuard.freezePeriod,
            BigInt(currentTimestamp),
          );
        userHasVotes =
          (!isFreezeActive
            ? // freeze not active
              await votesTokenContract.read.getVotes([account || ''])
            : // freeze is active
              await votesTokenContract.read.getPastVotes([
                account || '',
                BigInt(freezeCreatedBlock),
              ])) > 0n;
      } else if (freezeVotingType === FreezeVotingType.ERC721) {
        const { totalVotingTokenAddresses } = await getUserERC721VotingTokens(
          parentSafeAddress,
          null,
        );
        userHasVotes = totalVotingTokenAddresses.length > 0;
      }

      const freeze: FreezeGuard = {
        ...freezeGuard,
        userHasVotes,
      };
      isFreezeSet.current = true;
      return freeze;
    },
    [account, publicClient, getAddressContractType, getUserERC721VotingTokens, parentSafeAddress],
  );

  const setFractalFreezeGuard = useCallback(
    async (_guardContracts: FractalGuardContracts) => {
      const freezeGuard = await loadFractalFreezeGuard(_guardContracts);
      if (freezeGuard) {
        action.dispatch({ type: FractalGuardAction.SET_FREEZE_GUARD, payload: freezeGuard });
      }
    },
    [action, loadFractalFreezeGuard],
  );

  useEffect(() => {
    if (
      guardContracts.freezeVotingType !== null &&
      !!guardContracts.freezeVotingContractAddress &&
      loadOnMount &&
      guardContracts.freezeVotingContractAddress + parentSafeAddress + account !== loadKey.current
    ) {
      setFractalFreezeGuard(guardContracts);
      loadKey.current = guardContracts.freezeVotingContractAddress + parentSafeAddress + account;
    }
    if (!parentSafeAddress) {
      loadKey.current = undefined;
    }
  }, [setFractalFreezeGuard, guardContracts, parentSafeAddress, loadOnMount, account]);

  useEffect(() => {
    const { freezeVotingContractAddress, freezeVotingType: freezeVotingType } = guardContracts;

    if (
      !loadOnMount ||
      !freezeVotingContractAddress ||
      !isFreezeSet.current ||
      freezeVotingType !== FreezeVotingType.MULTISIG
    ) {
      return;
    }

    const freezeVotingContract = getContract({
      abi: abis.MultisigFreezeVoting,
      address: freezeVotingContractAddress,
      client: publicClient,
    });

    const unwatch = freezeVotingContract.watchEvent.FreezeVoteCast(
      { voter: null },
      {
        onLogs: async logs => {
          for (const log of logs) {
            if (!log.args.voter || !log.args.votesCast) {
              continue;
            }

            const freezeProposalCreatedBlock =
              await freezeVotingContract.read.freezeProposalCreatedBlock();
            action.dispatch({
              type: FractalGuardAction.UPDATE_FREEZE_VOTE,
              payload: {
                isVoter: log.args.voter === account,
                freezeProposalCreatedTime: BigInt(
                  await getTimeStamp(freezeProposalCreatedBlock, publicClient),
                ),
                votesCast: log.args.votesCast,
              },
            });
          }
        },
      },
    );

    return () => {
      unwatch();
    };
  }, [account, action, guardContracts, loadOnMount, publicClient]);

  useEffect(() => {
    const { freezeVotingContractAddress, freezeVotingType: freezeVotingType } = guardContracts;

    if (
      !loadOnMount ||
      !freezeVotingContractAddress ||
      !isFreezeSet.current ||
      freezeVotingType !== FreezeVotingType.ERC721
    ) {
      return;
    }

    const freezeVotingContract = getContract({
      abi: abis.ERC721FreezeVoting,
      address: freezeVotingContractAddress,
      client: publicClient,
    });

    const unwatch = freezeVotingContract.watchEvent.FreezeVoteCast(
      { voter: null },
      {
        onLogs: async logs => {
          for (const log of logs) {
            if (!log.args.voter || !log.args.votesCast) {
              continue;
            }

            const freezeProposalCreatedBlock =
              await freezeVotingContract.read.freezeProposalCreatedBlock();
            action.dispatch({
              type: FractalGuardAction.UPDATE_FREEZE_VOTE,
              payload: {
                isVoter: log.args.voter === account,
                freezeProposalCreatedTime: BigInt(
                  await getTimeStamp(freezeProposalCreatedBlock, publicClient),
                ),
                votesCast: log.args.votesCast,
              },
            });
          }
        },
      },
    );

    return () => {
      unwatch();
    };
  }, [account, action, guardContracts, loadOnMount, publicClient]);

  useEffect(() => {
    const { freezeVotingContractAddress, freezeVotingType: freezeVotingType } = guardContracts;

    if (
      !loadOnMount ||
      !freezeVotingContractAddress ||
      !isFreezeSet.current ||
      freezeVotingType !== FreezeVotingType.ERC20
    ) {
      return;
    }

    const freezeVotingContract = getContract({
      abi: abis.ERC20FreezeVoting,
      address: freezeVotingContractAddress,
      client: publicClient,
    });

    const unwatch = freezeVotingContract.watchEvent.FreezeVoteCast(
      { voter: null },
      {
        onLogs: async logs => {
          for (const log of logs) {
            if (!log.args.voter || !log.args.votesCast) {
              continue;
            }

            const freezeProposalCreatedBlock =
              await freezeVotingContract.read.freezeProposalCreatedBlock();
            action.dispatch({
              type: FractalGuardAction.UPDATE_FREEZE_VOTE,
              payload: {
                isVoter: log.args.voter === account,
                freezeProposalCreatedTime: BigInt(
                  await getTimeStamp(freezeProposalCreatedBlock, publicClient),
                ),
                votesCast: log.args.votesCast,
              },
            });
          }
        },
      },
    );

    return () => {
      unwatch();
    };
  }, [account, action, guardContracts, loadOnMount, publicClient]);

  return loadFractalFreezeGuard;
};
