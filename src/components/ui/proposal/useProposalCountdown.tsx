import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getContract } from 'viem';
import { logError } from '../../../helpers/errorLogging';
import useSnapshotProposal from '../../../hooks/DAO/loaders/snapshot/useSnapshotProposal';
import { useLoadDAOProposals } from '../../../hooks/DAO/loaders/useLoadDAOProposals';
import useUpdateProposalState from '../../../hooks/DAO/proposal/useUpdateProposalState';
import useNetworkPublicClient from '../../../hooks/useNetworkPublicClient';
import { useFractal } from '../../../providers/App/AppProvider';
import {
  AzoriusGovernance,
  FractalProposal,
  FractalProposalState,
  AzoriusProposal,
  FreezeGuardType,
} from '../../../types';
import { blocksToSeconds } from '../../../utils/contract';
import { getTxTimelockedTimestamp } from '../../../utils/guard';

export function useProposalCountdown(proposal: FractalProposal) {
  const {
    governance,
    guardContracts: { freezeGuardContractAddress, freezeGuardType },
    governanceContracts,
    action,
  } = useFractal();
  const publicClient = useNetworkPublicClient();

  const [secondsLeft, setSecondsLeft] = useState<number>();
  const { snapshotProposal } = useSnapshotProposal(proposal);

  const azoriusGovernance = governance as AzoriusGovernance;

  const loadDAOProposals = useLoadDAOProposals();
  const updateProposalState = useUpdateProposalState({
    governanceContracts,
    governanceDispatch: action.dispatch,
  });

  let updateStateInterval = useRef<ReturnType<typeof setInterval> | undefined>();
  let countdownInterval = useRef<ReturnType<typeof setInterval> | undefined>();
  useEffect(() => {
    // if it's not a state that requires a countdown, clear the interval and return
    if (
      !(
        proposal.state === FractalProposalState.ACTIVE ||
        proposal.state === FractalProposalState.TIMELOCKED ||
        proposal.state === FractalProposalState.EXECUTABLE
      )
    ) {
      clearInterval(updateStateInterval.current);
      return;
    }

    // if the timer has run out, update proposals on a ten second interval
    // until we need another one
    if (secondsLeft !== undefined && secondsLeft < 0 && !updateStateInterval.current) {
      updateStateInterval.current = setInterval(() => {
        // Wrap the updateProposalState call in an async IIFE
        (async () => {
          try {
            if (governance.isAzorius) {
              await updateProposalState(Number(proposal.proposalId));
            } else {
              await loadDAOProposals();
            }
          } catch (error) {
            logError('Error updating proposal state:', error);
          }
        })();
      }, 10000);
    } else if (secondsLeft && secondsLeft > 0) {
      // once we've found another countdown state, clear the
      // proposals update timer
      clearInterval(updateStateInterval.current);
      updateStateInterval.current = undefined;
    }

    return () => {
      if (!secondsLeft) {
        clearInterval(updateStateInterval.current);
      }
    };
  }, [secondsLeft, loadDAOProposals, proposal, updateProposalState, governance.isAzorius]);

  const startCountdown = useCallback((initialTimeMs: number) => {
    countdownInterval.current = setInterval(() => {
      setSecondsLeft(Math.floor((initialTimeMs - Date.now()) / 1000));
    }, 1000);
  }, []);

  const getCountdown = useCallback(async () => {
    const freezeGuard =
      freezeGuardContractAddress !== undefined && freezeGuardType === FreezeGuardType.MULTISIG
        ? getContract({
            abi: abis.MultisigFreezeGuard,
            address: freezeGuardContractAddress,
            client: publicClient,
          })
        : undefined;

    const isSafeGuard = freezeGuardType === FreezeGuardType.MULTISIG;
    const isAzoriusGuard = freezeGuardType === FreezeGuardType.AZORIUS;

    const timeLockPeriod = azoriusGovernance.votingStrategy?.timeLockPeriod;
    const votingDeadlineMs = (proposal as AzoriusProposal).deadlineMs;

    // If the proposal is active and has a deadline, start the countdown (for Azorius proposals)
    if (proposal.state === FractalProposalState.ACTIVE && votingDeadlineMs) {
      startCountdown(votingDeadlineMs);
      return;
    } else if (
      // If the proposal is timelocked and has a deadline, start the countdown (for Azorius proposals)
      proposal.state === FractalProposalState.TIMELOCKED &&
      votingDeadlineMs &&
      timeLockPeriod
    ) {
      startCountdown(votingDeadlineMs + Number(timeLockPeriod.value) * 1000);
      // If the proposal is timelocked start the countdown (for safe multisig proposals with guards)
      return;
    } else if (proposal.state === FractalProposalState.TIMELOCKED && freezeGuard && isSafeGuard) {
      const safeGuard = freezeGuard;

      const [timelockedTimestamp, timelockPeriod] = await Promise.all([
        getTxTimelockedTimestamp(proposal, safeGuard.address, publicClient),
        safeGuard.read.timelockPeriod(),
      ]);

      const guardTimeLockPeriod = await blocksToSeconds(timelockPeriod, publicClient);
      startCountdown(timelockedTimestamp * 1000 + guardTimeLockPeriod * 1000);

      // If the proposal is executable start the countdown (for safe multisig proposals with guards)
      return;
    } else if (proposal.state === FractalProposalState.EXECUTABLE && freezeGuard) {
      let guardTimelockPeriod: number = 0;
      if (isSafeGuard) {
        const safeGuard = freezeGuard;
        const timelockedTimestamp =
          (await getTxTimelockedTimestamp(proposal, safeGuard.address, publicClient)) * 1000;
        const safeGuardTimelockPeriod =
          (await blocksToSeconds(await safeGuard.read.timelockPeriod(), publicClient)) * 1000;
        const guardExecutionPeriod =
          (await blocksToSeconds(await safeGuard.read.executionPeriod(), publicClient)) * 1000;
        guardTimelockPeriod = timelockedTimestamp + safeGuardTimelockPeriod + guardExecutionPeriod;

        // If the proposal is executing start the countdown (for Azorius proposals with guards)
        return;
      } else if (isAzoriusGuard && timeLockPeriod && votingDeadlineMs) {
        guardTimelockPeriod = Number(timeLockPeriod.value) * 1000 + votingDeadlineMs;
      }
      startCountdown(guardTimelockPeriod);
      return;
    } else if (snapshotProposal !== null && proposal.state === FractalProposalState.PENDING) {
      startCountdown(snapshotProposal.startTime * 1000);
      return;
    } else if (snapshotProposal !== null) {
      startCountdown(snapshotProposal.endTime * 1000);
      return;
    }
  }, [
    azoriusGovernance.votingStrategy?.timeLockPeriod,
    freezeGuardContractAddress,
    freezeGuardType,
    proposal,
    publicClient,
    snapshotProposal,
    startCountdown,
  ]);

  useEffect(() => {
    // continually calculates the initial time (in ms) - the current time (in ms)
    // then converts it to seconds, all on a 1 second interval
    getCountdown();

    return () => {
      clearInterval(countdownInterval.current);
    };
  }, [getCountdown]);

  return secondsLeft;
}
