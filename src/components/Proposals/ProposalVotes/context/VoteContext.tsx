import { abis } from '@fractal-framework/fractal-contracts';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Address, erc721Abi, getContract } from 'viem';
import { useAccount } from 'wagmi';
import useSnapshotProposal from '../../../../hooks/DAO/loaders/snapshot/useSnapshotProposal';
import useUserERC721VotingTokens from '../../../../hooks/DAO/proposal/useUserERC721VotingTokens';
import useNetworkPublicClient from '../../../../hooks/useNetworkPublicClient';
import { useFractal } from '../../../../providers/App/AppProvider';
import { useDaoInfoStore } from '../../../../store/daoInfo/useDaoInfoStore';
import {
  AzoriusGovernance,
  AzoriusProposal,
  ExtendedSnapshotProposal,
  FractalProposal,
  GovernanceType,
  MultisigProposal,
  SnapshotProposal,
} from '../../../../types';

interface IVoteContext {
  canVote: boolean;
  canVoteLoading: boolean;
  hasVoted: boolean;
  hasVotedLoading: boolean;
  getCanVote: () => Promise<void>;
  getHasVoted: () => void;
}

const VoteContext = createContext<IVoteContext>({
  canVote: false,
  canVoteLoading: false,
  hasVoted: false,
  hasVotedLoading: false,
  getCanVote: async () => {},
  getHasVoted: () => {},
});

export const useVoteContext = () => {
  const voteContext = useContext(VoteContext);
  return voteContext;
};

export function VoteContextProvider({
  proposal,
  children,
  extendedSnapshotProposal,
}: {
  proposal: FractalProposal;
  extendedSnapshotProposal?: ExtendedSnapshotProposal;
  children: ReactNode;
}) {
  const [canVote, setCanVote] = useState(false);
  const [canVoteLoading, setCanVoteLoading] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasVotedLoading, setHasVotedLoading] = useState(false);
  const { governance } = useFractal();
  const userAccount = useAccount();
  const { safe } = useDaoInfoStore();
  const { loadVotingWeight } = useSnapshotProposal(proposal as SnapshotProposal);
  const { remainingTokenIds } = useUserERC721VotingTokens(null, proposal.proposalId, true);
  const { snapshotProposal } = useSnapshotProposal(proposal);
  const publicClient = useNetworkPublicClient();

  const getHasVoted = useCallback(() => {
    setHasVotedLoading(true);
    if (snapshotProposal) {
      setHasVoted(
        !!extendedSnapshotProposal &&
          !!extendedSnapshotProposal.votes.find(vote => vote.voter === userAccount.address),
      );
    } else if (governance.isAzorius) {
      const azoriusProposal = proposal as AzoriusProposal;
      if (azoriusProposal?.votes) {
        setHasVoted(!!azoriusProposal?.votes.find(vote => vote.voter === userAccount.address));
      }
    } else {
      const safeProposal = proposal as MultisigProposal;
      setHasVoted(
        !!safeProposal.confirmations?.find(
          confirmation => confirmation.owner === userAccount.address,
        ),
      );
    }
    setHasVotedLoading(false);
  }, [
    governance.isAzorius,
    snapshotProposal,
    proposal,
    userAccount.address,
    extendedSnapshotProposal,
  ]);

  const erc721VotingWeight = useCallback(async () => {
    const account = userAccount.address;
    const azoriusGovernance = governance as AzoriusGovernance;
    if (!account || !azoriusGovernance.erc721Tokens) {
      return 0n;
    }
    const userVotingWeight = (
      await Promise.all(
        azoriusGovernance.erc721Tokens.map(async ({ address, votingWeight }) => {
          const tokenContract = getContract({
            abi: erc721Abi,
            address: address,
            client: publicClient,
          });
          const userBalance = await tokenContract.read.balanceOf([account]);
          return userBalance * votingWeight;
        }),
      )
    ).reduce((prev, curr) => prev + curr, 0n);
    return userVotingWeight;
  }, [governance, publicClient, userAccount.address]);

  const getCanVote = useCallback(async () => {
    setCanVoteLoading(true);
    let newCanVote = false;
    if (userAccount.address) {
      if (snapshotProposal) {
        const votingWeightData = await loadVotingWeight();
        newCanVote = votingWeightData.votingWeight >= 1;
      } else if (governance.type === GovernanceType.AZORIUS_ERC20) {
        const azoriusProposal = proposal as AzoriusProposal;
        const ozLinearVotingContract = getContract({
          abi: abis.LinearERC20Voting,
          address: azoriusProposal.votingStrategy,
          client: publicClient,
        });
        newCanVote =
          (await ozLinearVotingContract.read.getVotingWeight([
            userAccount.address,
            Number(proposal.proposalId),
          ])) > 0n;
      } else if (governance.type === GovernanceType.AZORIUS_ERC721) {
        const votingWeight = await erc721VotingWeight();
        newCanVote = votingWeight > 0n && remainingTokenIds.length > 0;
      } else if (governance.type === GovernanceType.MULTISIG) {
        newCanVote = !!safe?.owners.includes(userAccount.address);
      } else {
        newCanVote = false;
      }
    }

    if (canVote !== newCanVote) {
      setCanVote(newCanVote);
    }
    setCanVoteLoading(false);
  }, [
    userAccount.address,
    publicClient,
    canVote,
    snapshotProposal,
    governance.type,
    loadVotingWeight,
    remainingTokenIds.length,
    safe?.owners,
    proposal,
    erc721VotingWeight,
  ]);

  const connectedUserRef = useRef<Address>();
  useEffect(() => {
    const isUserRefCurrent = connectedUserRef.current === userAccount.address;
    if (!isUserRefCurrent) {
      connectedUserRef.current = userAccount.address;
      getCanVote();
    }
  }, [getCanVote, userAccount.address]);

  const connectedUserVotingWeightRef = useRef<string>();
  useEffect(() => {
    const azoriusProposal = proposal as AzoriusProposal;
    const refValue = `${azoriusProposal.proposalId}-${userAccount.address}`;
    const isRefValueCurrent = connectedUserVotingWeightRef.current === refValue;
    if (!isRefValueCurrent) {
      getHasVoted();
    }
  }, [getHasVoted, proposal, userAccount.address]);

  const memoizedValue = useMemo(() => {
    return {
      canVote,
      canVoteLoading,
      hasVoted,
      hasVotedLoading,
      getCanVote,
      getHasVoted,
    };
  }, [canVote, canVoteLoading, getCanVote, getHasVoted, hasVoted, hasVotedLoading]);

  return <VoteContext.Provider value={memoizedValue}>{children}</VoteContext.Provider>;
}
