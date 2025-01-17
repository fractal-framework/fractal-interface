import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { abis } from '@fractal-framework/fractal-contracts';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { erc721Abi, getContract } from 'viem';
import { useAccount } from 'wagmi';
import { TOOLTIP_MAXW } from '../../constants/common';
import useNetworkPublicClient from '../../hooks/useNetworkPublicClient';
import useBlockTimestamp from '../../hooks/utils/useBlockTimestamp';
import { useFractal } from '../../providers/App/AppProvider';
import { AzoriusGovernance, AzoriusProposal, GovernanceType } from '../../types';
import { DEFAULT_DATE_TIME_FORMAT, formatCoin } from '../../utils/numberFormats';
import { DecentTooltip } from '../ui/DecentTooltip';
import ContentBox from '../ui/containers/ContentBox';
import DisplayTransaction from '../ui/links/DisplayTransaction';
import EtherscanLink from '../ui/links/EtherscanLink';
import { InfoBoxLoader } from '../ui/loaders/InfoBoxLoader';
import InfoRow from '../ui/proposal/InfoRow';
import ProposalCreatedBy from '../ui/proposal/ProposalCreatedBy';
import Divider from '../ui/utils/Divider';
import { QuorumProgressBar } from '../ui/utils/ProgressBar';
import { AzoriusOrSnapshotProposalAction } from './ProposalActions/AzoriusOrSnapshotProposalAction';
import { VoteContextProvider } from './ProposalVotes/context/VoteContext';

export function AzoriusProposalSummary({ proposal }: { proposal: AzoriusProposal }) {
  const {
    eventDate,
    startBlock,
    votesSummary: { yes, no, abstain },
    deadlineMs,
    proposer,
    transactionHash,
  } = proposal;
  const { governance } = useFractal();
  const { address } = useAccount();

  const azoriusGovernance = governance as AzoriusGovernance;
  const { votesToken, type, erc721Tokens, votingStrategy } = azoriusGovernance;
  const { t } = useTranslation(['proposal', 'common', 'navigation']);
  const startBlockTimeStamp = useBlockTimestamp(Number(startBlock));
  const [proposalVotingWeight, setProposalVotingWeight] = useState('0');
  const totalVotesCasted = useMemo(() => yes + no + abstain, [yes, no, abstain]);

  const totalERC721VotingWeight = useMemo(
    () =>
      erc721Tokens?.reduce(
        (prev, curr) => prev + (curr.totalSupply ? curr.totalSupply * curr.votingWeight : 0n),
        0n,
      ),
    [erc721Tokens],
  );
  const votesTokenDecimalsDenominator = useMemo(
    () => 10n ** BigInt(votesToken?.decimals || 0),
    [votesToken?.decimals],
  );
  const [showVotingPower, setShowVotingPower] = useState(false);

  const toggleShowVotingPower = () => setShowVotingPower(prevState => !prevState);

  const publicClient = useNetworkPublicClient();

  const getErc721VotingWeight = useCallback(async () => {
    if (!address || !azoriusGovernance.erc721Tokens) {
      return 0n;
    }
    const userVotingWeight = (
      await Promise.all(
        azoriusGovernance.erc721Tokens.map(async ({ address: tokenAddress, votingWeight }) => {
          const tokenContract = getContract({
            abi: erc721Abi,
            address: tokenAddress,
            client: publicClient,
          });
          // @todo We should be checking proposal state - if it's active, we should use the latest block, otherwise we should calculate the voting weight based on the startBlock and deadlineMs
          const userBalance = await tokenContract.read.balanceOf([address], {
            blockNumber: startBlock,
          });
          return userBalance * votingWeight;
        }),
      )
    ).reduce((prev, curr) => prev + curr, 0n);
    return userVotingWeight;
  }, [azoriusGovernance.erc721Tokens, publicClient, address, startBlock]);

  const isERC20 = type === GovernanceType.AZORIUS_ERC20;
  const isERC721 = type === GovernanceType.AZORIUS_ERC721;

  useEffect(() => {
    async function loadProposalVotingWeight() {
      if (address) {
        if (isERC20) {
          const strategyContract = getContract({
            abi: abis.LinearERC20Voting,
            address: proposal.votingStrategy,
            client: publicClient,
          });

          const pastVotingWeight = await strategyContract.read.getVotingWeight([
            address,
            Number(proposal.proposalId),
          ]);

          setProposalVotingWeight(
            formatCoin(pastVotingWeight, true, votesToken?.decimals, undefined, false),
          );
        } else if (isERC721) {
          const votingWeight = await getErc721VotingWeight();
          setProposalVotingWeight(votingWeight.toString());
        }
      }
    }

    loadProposalVotingWeight();
  }, [
    address,
    proposal.proposalId,
    proposal.votingStrategy,
    publicClient,
    votesToken?.decimals,
    isERC20,
    isERC721,
    getErc721VotingWeight,
    startBlock,
  ]);

  // @todo @dev (see below):
  // Caching has introduced a new "problem" edge case -- a proposal can be loaded before `votingStrategy` is loaded.
  // I previously fixed this issue in `QuoromBadge` (see lines 36 and 45), but over here it's slightly more nuanced and
  // will require a bit more thought. A quick patch instead is to add the `votingStrategy?` check in the `if` statement below,
  // BUT this (and the implications of the previous fix) contradicts the non-null (but suddenly no longer true) typing of `votingStrategy`.
  // We need to figure out a more type-safe way to handle all of this.
  if (
    (isERC20 && (!votesToken || !votesToken.totalSupply || !votingStrategy?.quorumPercentage)) ||
    (isERC721 && (!erc721Tokens || !votingStrategy?.quorumThreshold))
  ) {
    return (
      <Box mt={4}>
        <InfoBoxLoader />
      </Box>
    );
  }

  const strategyQuorum =
    isERC20 && votesToken && votingStrategy
      ? votingStrategy.quorumPercentage!.value
      : isERC721 && votingStrategy
        ? votingStrategy.quorumThreshold!.value
        : 1n;

  const reachedQuorum = isERC721
    ? totalVotesCasted - no
    : votesToken
      ? (totalVotesCasted - no) / votesTokenDecimalsDenominator
      : 0n;

  const totalQuorum = isERC721
    ? Number(strategyQuorum)
    : votesToken
      ? (Number(votesToken.totalSupply / votesTokenDecimalsDenominator) * Number(strategyQuorum)) /
        100
      : undefined;

  const ShowVotingPowerButton = (
    <Button
      px={0}
      py={0}
      height="auto"
      justifyContent="flex-end"
      alignItems="flex-start"
      variant="text"
      color="celery-0"
      _active={{ color: 'celery--2' }}
      onClick={toggleShowVotingPower}
    >
      {showVotingPower ? proposalVotingWeight : t('show')}
    </Button>
  );

  return (
    <ContentBox
      containerBoxProps={{
        bg: 'neutral-2',
        border: '1px solid',
        borderColor: 'neutral-3',
        borderRadius: '0.5rem',
        my: 0,
      }}
    >
      <Text textStyle="heading-small">{t('proposalSummaryTitle')}</Text>
      <Box marginTop={4}>
        <Divider
          variant="darker"
          width="calc(100% + 4rem)"
          mx="-2rem"
        />
        <InfoRow
          property={t('votingSystem')}
          value={t('singleSnapshotVotingSystem')}
        />
        <InfoRow
          property={t('proposalSummaryStartDate')}
          value={format(startBlockTimeStamp * 1000, DEFAULT_DATE_TIME_FORMAT)}
          tooltip={formatInTimeZone(startBlockTimeStamp * 1000, 'GMT', DEFAULT_DATE_TIME_FORMAT)}
        />
        <InfoRow
          property={t('proposalSummaryEndDate')}
          value={format(deadlineMs, DEFAULT_DATE_TIME_FORMAT)}
          tooltip={formatInTimeZone(deadlineMs, 'GMT', DEFAULT_DATE_TIME_FORMAT)}
        />
        <ProposalCreatedBy proposer={proposer} />
        <Flex
          marginTop={4}
          flexWrap="wrap"
          alignItems="center"
        >
          <Text
            color="neutral-7"
            w="full"
          >
            {t('snapshotTaken')}
          </Text>
          <EtherscanLink
            type="block"
            value={startBlock.toString()}
            pl={0}
            isTextLink
          >
            <Flex
              alignItems="center"
              justifyContent="space-between"
            >
              {format(eventDate, DEFAULT_DATE_TIME_FORMAT)}
            </Flex>
          </EtherscanLink>
        </Flex>
        <Flex
          marginTop={4}
          marginBottom={transactionHash ? 0 : 4}
          flexWrap="wrap"
          alignItems="center"
        >
          <Text
            color="neutral-7"
            w="full"
          >
            {t('votingPower')}
          </Text>
          {showVotingPower ? (
            <DecentTooltip
              label={t('votingPowerTooltip')}
              placement="left"
              maxW={TOOLTIP_MAXW}
            >
              {ShowVotingPowerButton}
            </DecentTooltip>
          ) : (
            ShowVotingPowerButton
          )}
        </Flex>
        {transactionHash && (
          <Flex
            marginTop={4}
            marginBottom={4}
            alignItems="center"
            flexWrap="wrap"
          >
            <Text
              color="neutral-7"
              w="full"
            >
              {t('transactionHash')}
            </Text>
            <DisplayTransaction txHash={transactionHash} />
          </Flex>
        )}
        <Divider
          my="0.5rem"
          variant="darker"
          width="calc(100% + 4rem)"
          mx="-2rem"
        />
      </Box>
      <Box marginTop={4}>
        <QuorumProgressBar
          helperText={t(
            isERC20
              ? 'proposalSupportERC20SummaryHelper'
              : isERC721
                ? 'proposalSupportERC721SummaryHelper'
                : '',
            {
              quorum: strategyQuorum,
              total: isERC721
                ? totalERC721VotingWeight?.toLocaleString()
                : votesToken
                  ? (votesToken.totalSupply / votesTokenDecimalsDenominator).toLocaleString()
                  : undefined,
            },
          )}
          reachedQuorum={Number(reachedQuorum)}
          totalQuorum={totalQuorum}
          unit={isERC20 ? '%' : ''}
        />
      </Box>
      {address && (
        <>
          <Divider
            my="1.5rem"
            variant="darker"
            width="calc(100% + 4rem)"
            mx="-2rem"
          />
          <VoteContextProvider proposal={proposal}>
            <AzoriusOrSnapshotProposalAction
              proposal={proposal}
              expandedView
            />
          </VoteContextProvider>
        </>
      )}
    </ContentBox>
  );
}
