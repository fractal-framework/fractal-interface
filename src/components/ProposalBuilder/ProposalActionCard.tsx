import { Button, Flex, Icon, IconButton, Text } from '@chakra-ui/react';
import { ArrowsDownUp, CheckSquare, Trash } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { formatUnits, getAddress, zeroAddress } from 'viem';
import PencilWithLineIcon from '../../assets/theme/custom/icons/PencilWithLineIcon';
import { useGetAccountName } from '../../hooks/utils/useGetAccountName';
import { useFractal } from '../../providers/App/AppProvider';
import { useProposalActionsStore } from '../../store/actions/useProposalActionsStore';
import { TokenBalance } from '../../types';
import { CreateProposalAction, ProposalActionType } from '../../types/proposalBuilder';
import { Card } from '../ui/cards/Card';
import { SendAssetsData } from '../ui/modals/SendAssetsModal';

export function SendAssetsAction({
  action,
  onRemove,
}: {
  action: SendAssetsData;
  onRemove: () => void;
}) {
  const { t } = useTranslation('common');
  const { displayName } = useGetAccountName(action.destinationAddress);

  return (
    <Card my="0.5rem">
      <Flex justifyContent="space-between">
        <Flex
          alignItems="center"
          gap="0.5rem"
        >
          <Icon
            as={ArrowsDownUp}
            w="1.5rem"
            h="1.5rem"
            color="lilac-0"
          />
          <Text>{t('transfer')}</Text>
          <Text color="lilac-0">
            {formatUnits(action.transferAmount, action.asset.decimals)} {action.asset.symbol}
          </Text>
          <Text>{t('to').toLowerCase()}</Text>
          <Text color="lilac-0">{displayName}</Text>
        </Flex>
        <Button
          color="red-0"
          variant="tertiary"
          size="sm"
          onClick={onRemove}
        >
          <Icon as={Trash} />
        </Button>
      </Flex>
    </Card>
  );
}

export function AirdropAction({
  totalAmount,
  recipientsCount,
  onRemove,
  asset,
}: {
  totalAmount: bigint;
  recipientsCount: number;
  onRemove: () => void;
  asset: TokenBalance;
}) {
  const { t } = useTranslation('common');
  return (
    <Card my="0.5rem">
      <Flex justifyContent="space-between">
        <Flex
          alignItems="center"
          gap="0.5rem"
        >
          <Icon
            as={ArrowsDownUp}
            w="1.5rem"
            h="1.5rem"
            color="lilac-0"
          />
          <Text>{t('airdrop')}</Text>
          <Text color="lilac-0">
            {formatUnits(totalAmount, asset.decimals)} {asset.symbol}
          </Text>
          <Text>{t('to').toLowerCase()}</Text>
          <Text color="lilac-0">
            {recipientsCount} {t('recipients')}
          </Text>
        </Flex>
        <Button
          color="red-0"
          variant="tertiary"
          size="sm"
          onClick={onRemove}
        >
          <Icon as={Trash} />
        </Button>
      </Flex>
    </Card>
  );
}

export function ProposalActionCard({
  action,
  index,
  canBeDeleted,
}: {
  action: CreateProposalAction;
  index: number;
  canBeDeleted: boolean;
}) {
  const { removeAction } = useProposalActionsStore();
  const {
    treasury: { assetsFungible },
  } = useFractal();
  if (action.actionType === ProposalActionType.TRANSFER) {
    const destinationAddress = action.transactions[0].parameters[0].value
      ? getAddress(action.transactions[0].parameters[0].value)
      : zeroAddress;
    const transferAmount = BigInt(action.transactions[0].parameters[1].value || '0');

    if (!destinationAddress || !transferAmount) {
      return null;
    }

    // TODO: This does not work for native asset
    const actionAsset = assetsFungible.find(
      asset => getAddress(asset.tokenAddress) === getAddress(action.transactions[0].targetAddress),
    );

    if (!actionAsset) {
      return null;
    }
    return (
      <SendAssetsAction
        key={index}
        action={{
          destinationAddress,
          transferAmount,
          asset: actionAsset,
          nonceInput: undefined,
        }}
        onRemove={() => removeAction(index)}
      />
    );
  } else if (action.actionType === ProposalActionType.AIRDROP) {
    const totalAmountString = action.transactions[1].parameters[2].value?.slice(1, -1);
    const totalAmount = BigInt(
      totalAmountString?.split(',').reduce((acc, curr) => acc + BigInt(curr), 0n) || '0',
    );
    const recipientsCount = action.transactions[1].parameters[1].value?.split(',').length || 0;

    // First transaction in the airdrop proposal will be approval transaction, which is called on the token
    // Thus we can find the asset by looking at the target address of the first transaction

    const actionAsset = assetsFungible.find(
      asset => getAddress(asset.tokenAddress) === getAddress(action.transactions[0].targetAddress),
    );

    if (!actionAsset) {
      return null;
    }

    return (
      <AirdropAction
        key={index}
        asset={actionAsset}
        totalAmount={totalAmount}
        recipientsCount={recipientsCount}
        onRemove={() => removeAction(index)}
      />
    );
  }

  const isAddAction = action.actionType === ProposalActionType.ADD;
  const isEditAction = action.actionType === ProposalActionType.EDIT;
  const isDeleteAction = action.actionType === ProposalActionType.DELETE;

  return (
    <Flex
      gap={4}
      alignItems="center"
    >
      <Card
        backgroundColor={
          isAddAction || isEditAction ? 'neutral-2' : isDeleteAction ? 'red-2' : 'neutral-3'
        }
      >
        <Flex
          gap={2}
          alignItems="center"
        >
          <Icon
            as={isAddAction ? CheckSquare : isEditAction ? PencilWithLineIcon : Trash}
            color={isEditAction || isAddAction ? 'neutral-7' : 'red-1'}
          />
          {action.content}
        </Flex>
      </Card>
      {canBeDeleted && (
        <IconButton
          aria-label="Remove action"
          icon={<Trash />}
          variant="ghost"
          size="icon-sm"
          color="red-1"
          onClick={() => removeAction(index)}
        />
      )}
    </Flex>
  );
}
