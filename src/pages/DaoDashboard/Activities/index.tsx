import { Box, Flex } from '@chakra-ui/react';
import { BigNumber } from 'ethers';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityModule } from '../../../components/Activity/ActivityModule';
import { ActivityTreasury } from '../../../components/Activity/ActivityTreasury';
import { Sort } from '../../../components/ui/Sort';
import { EmptyBox } from '../../../components/ui/containers/EmptyBox';
import { InfoBoxLoader } from '../../../components/ui/loaders/InfoBoxLoader';
import useBlockTimestamp from '../../../hooks/utils/useBlockTimestamp';
import { useFractal } from '../../../providers/Fractal/hooks/useFractal';
import { ActivityEventType, TreasuryActivity, TxProposal } from '../../../providers/Fractal/types';
import { SortBy } from '../../../types';
import { ActivityFreeze } from './ActivityFreeze';
import { useActivities } from './hooks/useActivities';

export function Activities() {
  const {
    gnosis: { guardContracts, freezeData },
  } = useFractal();
  const [sortBy, setSortBy] = useState<SortBy>(SortBy.Newest);

  const { sortedActivities, isActivitiesLoading } = useActivities(sortBy);
  const { t } = useTranslation('dashboard');
  const currentTime = BigNumber.from(useBlockTimestamp());
  return (
    <Box>
      <Flex
        justifyContent="flex-end"
        alignItems="center"
        my="1rem"
      >
        <Sort
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      </Flex>
      <Flex
        flexDirection="column"
        gap="1rem"
      >
        {(freezeData.isFrozen ||
          freezeData.freezeProposalCreatedTime
            .add(freezeData.freezeProposalPeriod)
            .sub(currentTime)
            .gt(0)) && (
          <ActivityFreeze
            freezeData={freezeData}
            vetoContract={guardContracts}
            currentTime={currentTime}
          />
        )}
        {isActivitiesLoading ? (
          <InfoBoxLoader />
        ) : sortedActivities.length ? (
          <Flex
            flexDirection="column"
            gap="1rem"
          >
            {sortedActivities.map((activity, i) => {
              if (activity.eventType === ActivityEventType.Governance) {
              }
              if (activity.eventType === ActivityEventType.Module) {
                return (
                  <ActivityModule
                    key={i}
                    activity={activity as TxProposal}
                  />
                );
              }
              return (
                <ActivityTreasury
                  key={i}
                  activity={activity as TreasuryActivity}
                />
              );
            })}
          </Flex>
        ) : (
          <EmptyBox emptyText={t('noActivity')} />
        )}
      </Flex>
    </Box>
  );
}
