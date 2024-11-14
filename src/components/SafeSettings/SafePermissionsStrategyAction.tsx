import { Flex, Icon, Text } from '@chakra-ui/react';
import { Coins } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useFractal } from '../../providers/App/AppProvider';
import { AzoriusGovernance, BigIntValuePair, ProposalActionType } from '../../types';

export function SafePermissionsStrategyAction({
  actionType,
  proposerThreshold,
}: {
  actionType: ProposalActionType;
  proposerThreshold: BigIntValuePair;
}) {
  const { governance } = useFractal();
  const azoriusGovernance = governance as AzoriusGovernance;

  const { t } = useTranslation('settings');
  const title =
    actionType === ProposalActionType.ADD
      ? t('addPermission')
      : actionType === ProposalActionType.EDIT
        ? t('editPermission')
        : t('deletePermission');

  return (
    <Flex
      width="100%"
      alignItems="center"
    >
      <Text as="span">{title}</Text>
      <Text
        color="lilac-0"
        as="span"
      >
        {t('createProposals')}{' '}
      </Text>
      <Text as="span">{t('editPermissionActionDescription')}</Text>
      <Icon
        as={Coins}
        color="lilac-0"
      />
      <Text as="span">
        {`${proposerThreshold.value} ${azoriusGovernance.votesToken?.symbol || t('votingWeightThreshold')}`}{' '}
      </Text>
      <Text as="span">{t('editPermissionActionDescription2')}</Text>
    </Flex>
  );
}