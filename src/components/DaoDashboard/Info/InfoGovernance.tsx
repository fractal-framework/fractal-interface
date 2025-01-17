import { Box, Flex, Text } from '@chakra-ui/react';
import { abis } from '@fractal-framework/fractal-contracts';
import { Bank } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getContract } from 'viem';

import useNetworkPublicClient from '../../../hooks/useNetworkPublicClient';
import { useTimeHelpers } from '../../../hooks/utils/useTimeHelpers';
import { useFractal } from '../../../providers/App/AppProvider';
import { useDaoInfoStore } from '../../../store/daoInfo/useDaoInfoStore';
import { AzoriusGovernance, FreezeGuardType } from '../../../types';
import { blocksToSeconds } from '../../../utils/contract';
import { BarLoader } from '../../ui/loaders/BarLoader';

export function InfoGovernance({ showTitle = true }: { showTitle?: boolean }) {
  const { t } = useTranslation(['dashboard', 'daoCreate', 'common']);
  const {
    governance,
    guardContracts: { freezeGuardType, freezeGuardContractAddress },
  } = useFractal();
  const { safe } = useDaoInfoStore();
  const publicClient = useNetworkPublicClient();
  const { getTimeDuration } = useTimeHelpers();
  const [timelockPeriod, setTimelockPeriod] = useState<string>();
  const [executionPeriod, setExecutionPeriod] = useState<string>();

  const governanceAzorius = governance.isAzorius ? (governance as AzoriusGovernance) : null;

  useEffect(() => {
    const setTimelockInfo = async () => {
      const formatBlocks = async (blocks: number): Promise<string | undefined> =>
        getTimeDuration(await blocksToSeconds(blocks, publicClient));

      if (freezeGuardType == FreezeGuardType.MULTISIG) {
        if (freezeGuardContractAddress && publicClient) {
          const freezeGuardContract = getContract({
            abi: abis.MultisigFreezeGuard,
            address: freezeGuardContractAddress,
            client: publicClient,
          });
          const [contractTimelockPeriod, contractExecutionPeriod] = await Promise.all([
            freezeGuardContract.read.timelockPeriod(),
            freezeGuardContract.read.executionPeriod(),
          ]);
          const [timelockSeconds, executionPeriodSeconds] = await Promise.all([
            formatBlocks(contractTimelockPeriod),
            formatBlocks(contractExecutionPeriod),
          ]);
          setTimelockPeriod(timelockSeconds);
          setExecutionPeriod(executionPeriodSeconds);
        }
      } else if (governanceAzorius !== null) {
        const timelock = governanceAzorius.votingStrategy?.timeLockPeriod;
        if (timelock?.formatted) {
          setTimelockPeriod(timelock.formatted);
        }
        // TODO Azorius execution period
        // We don't have room to fit a 5th row on this card currently,
        // so leaving this off until we can have a discussion with design
        // setExecutionPeriod(await freezeGuard.executionPeriod());
      }
      return () => {
        setTimelockPeriod(undefined);
        setExecutionPeriod(undefined);
      };
    };

    setTimelockInfo();
  }, [
    executionPeriod,
    getTimeDuration,
    governance,
    freezeGuardContractAddress,
    freezeGuardType,
    timelockPeriod,
    publicClient,
    governanceAzorius,
  ]);

  if (!safe?.address || !governance.type) {
    return (
      <Flex
        h="8.5rem"
        width="100%"
        alignItems="center"
        justifyContent="center"
      >
        <BarLoader />
      </Flex>
    );
  }

  return (
    <Box data-testid="dashboard-daoGovernance">
      {showTitle && (
        <Flex
          alignItems="center"
          gap="0.4rem"
          mb="0.5rem"
        >
          <Bank size="1.5rem" />
          <Text textStyle="heading-small">{t('titleGovernance')}</Text>
        </Flex>
      )}

      <Flex
        alignItems="center"
        justifyContent="space-between"
        mb="0.25rem"
        gap="0.5rem"
      >
        <Text color="neutral-7">{t('titleType')}</Text>
        <Text textAlign="right">
          {governance.type
            ? t(governance.type.toString(), { ns: 'daoCreate' })
            : t('loading', { ns: 'common' })}
        </Text>
      </Flex>

      {governanceAzorius?.votingStrategy?.votingPeriod && (
        <Flex
          alignItems="center"
          justifyContent="space-between"
          mb="0.25rem"
          gap="0.5rem"
        >
          <Text color="neutral-7">{t('titleVotingPeriod')}</Text>
          <Text textAlign="right">{governanceAzorius.votingStrategy.votingPeriod.formatted}</Text>
        </Flex>
      )}
      {governanceAzorius?.votingStrategy?.quorumPercentage && (
        <Flex
          alignItems="center"
          justifyContent="space-between"
          mb="0.25rem"
          gap="0.5rem"
        >
          <Text color="neutral-7">{t('titleQuorum')}</Text>
          <Text textAlign="right">
            {governanceAzorius.votingStrategy.quorumPercentage.formatted}
          </Text>
        </Flex>
      )}
      {governanceAzorius?.votingStrategy?.quorumThreshold && (
        <Flex
          alignItems="center"
          justifyContent="space-between"
          mb="0.25rem"
          gap="0.5rem"
        >
          <Text color="neutral-7">{t('titleQuorum')}</Text>
          <Text textAlign="right">
            {governanceAzorius.votingStrategy.quorumThreshold.formatted}
          </Text>
        </Flex>
      )}
      {timelockPeriod && (
        <Flex
          alignItems="center"
          justifyContent="space-between"
          mb="0.25rem"
          gap="0.5rem"
        >
          <Text color="neutral-7">{t('timelock', { ns: 'common' })}</Text>
          <Text textAlign="right">{timelockPeriod}</Text>
        </Flex>
      )}
      {executionPeriod && (
        <Flex
          alignItems="center"
          justifyContent="space-between"
          mb="0.25rem"
          gap="0.5rem"
        >
          <Text color="neutral-7">{t('execution', { ns: 'common' })}</Text>
          <Text textAlign="right">{executionPeriod}</Text>
        </Flex>
      )}
    </Box>
  );
}
