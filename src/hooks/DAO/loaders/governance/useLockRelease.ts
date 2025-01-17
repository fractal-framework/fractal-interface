import { useCallback, useEffect, useMemo, useRef } from 'react';
import { getContract } from 'viem';
import { useAccount } from 'wagmi';
import LockReleaseAbi from '../../../../assets/abi/LockRelease';
import { useFractal } from '../../../../providers/App/AppProvider';
import { DecentGovernanceAction } from '../../../../providers/App/governance/action';
import useNetworkPublicClient from '../../../useNetworkPublicClient';

/**
 * @link https://github.com/decentdao/dcnt/blob/master/contracts/LockRelease.sol
 * This hook is specifically for the LockRelease.sol contract used for the DCNT token.
 */
export const useLockRelease = ({ onMount = true }: { onMount?: boolean }) => {
  const isTokenLoaded = useRef(false);
  const tokenAccount = useRef<string>();

  const {
    governanceContracts: { lockReleaseAddress },
    action,
  } = useFractal();
  const user = useAccount();
  const publicClient = useNetworkPublicClient();

  const lockReleaseContract = useMemo(() => {
    if (!lockReleaseAddress) {
      return;
    }

    return getContract({
      abi: LockReleaseAbi,
      address: lockReleaseAddress,
      client: publicClient,
    });
  }, [lockReleaseAddress, publicClient]);

  const loadLockedVotesToken = useCallback(async () => {
    if (!lockReleaseContract || !user.address) {
      action.dispatch({ type: DecentGovernanceAction.RESET_LOCKED_TOKEN_ACCOUNT_DATA });
      return;
    }
    const account = user.address;

    const [tokenAmountTotal, tokenAmountReleased, tokenDelegatee, tokenVotingWeight] =
      await Promise.all([
        lockReleaseContract.read.getTotal([account]),
        lockReleaseContract.read.getReleased([account]),
        lockReleaseContract.read.delegates([account]),
        lockReleaseContract.read.getVotes([account]),
      ]);

    const tokenAccountData = {
      balance: tokenAmountTotal - tokenAmountReleased,
      delegatee: tokenDelegatee,
      votingWeight: tokenVotingWeight,
    };
    action.dispatch({
      type: DecentGovernanceAction.SET_LOCKED_TOKEN_ACCOUNT_DATA,
      payload: tokenAccountData,
    });
  }, [action, lockReleaseContract, user.address]);

  useEffect(() => {
    if (!user.address) {
      return;
    }

    if (
      lockReleaseAddress &&
      isTokenLoaded.current &&
      tokenAccount.current !== user.address + lockReleaseAddress &&
      onMount
    ) {
      tokenAccount.current = user.address + lockReleaseAddress;
      loadLockedVotesToken();
    }
  }, [loadLockedVotesToken, lockReleaseAddress, onMount, user.address]);

  useEffect(() => {
    if (!lockReleaseContract || !onMount || !user.address) {
      return;
    }

    const unwatch = lockReleaseContract.watchEvent.DelegateVotesChanged(
      { delegate: user.address },
      { onLogs: loadLockedVotesToken },
    );

    return () => {
      unwatch();
    };
  }, [loadLockedVotesToken, lockReleaseContract, onMount, user.address]);

  useEffect(() => {
    if (!lockReleaseContract || !onMount || !user.address) {
      return;
    }

    const account = user.address;
    const unwatchDelegator = lockReleaseContract.watchEvent.DelegateChanged(
      { delegator: account },
      { onLogs: loadLockedVotesToken },
    );
    const unwatchFromDelegate = lockReleaseContract.watchEvent.DelegateChanged(
      { fromDelegate: account },
      { onLogs: loadLockedVotesToken },
    );
    const unwatchToDelegate = lockReleaseContract.watchEvent.DelegateChanged(
      { toDelegate: account },
      { onLogs: loadLockedVotesToken },
    );

    return () => {
      unwatchDelegator();
      unwatchToDelegate();
      unwatchFromDelegate();
    };
  }, [loadLockedVotesToken, lockReleaseContract, onMount, user.address]);

  return { loadLockedVotesToken };
};
