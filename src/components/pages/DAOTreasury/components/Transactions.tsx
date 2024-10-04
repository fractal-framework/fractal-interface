import { Box, Button, Center, Flex, HStack, Icon, Image, Text, Tooltip } from '@chakra-ui/react';
import { ArrowDown, ArrowUp } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { getAddress } from 'viem';
import { useDateTimeDisplay } from '../../../../helpers/dateTime';
import { useFractal } from '../../../../providers/App/AppProvider';
import { useNetworkConfig } from '../../../../providers/NetworkConfig/NetworkConfigProvider';
import { TokenEventType, TransferDisplayData, TransferType } from '../../../../types';
import { DisplayAddress } from '../../../ui/links/DisplayAddress';
import EtherscanLink from '../../../ui/links/EtherscanLink';
import { BarLoader } from '../../../ui/loaders/BarLoader';

function TransferRow({ displayData }: { displayData: TransferDisplayData }) {
  const { t } = useTranslation(['treasury', 'common']);
  const { etherscanBaseURL } = useNetworkConfig();

  return (
    <Box
      py="0.25rem"
      px="0.75rem"
      _hover={{ cursor: 'pointer', bg: 'white-alpha-04' }}
      onClick={() => window.open(`${etherscanBaseURL}/tx/${displayData.transactionHash}`, '_blank')}
    >
      <HStack gap="1rem">
        <Flex
          minW="135px"
          alignItems="center"
          gap="0.5rem"
        >
          <Icon
            as={displayData.eventType == TokenEventType.WITHDRAW ? ArrowUp : ArrowDown}
            w="1.25rem"
            h="1.25rem"
            color="neutral-7"
          />
          <Box>
            <Text
              textStyle="label-small"
              color="neutral-7"
            >
              {t(displayData.eventType == TokenEventType.WITHDRAW ? 'labelSent' : 'labelReceived')}
            </Text>
            <Text>{useDateTimeDisplay(new Date(displayData.executionDate))}</Text>
          </Box>
        </Flex>
        <HStack
          w="30%"
          minW="15rem"
        >
          <Image
            src={displayData.image}
            fallbackSrc={
              displayData.transferType === TransferType.ERC721_TRANSFER
                ? '/images/nft-image-default.svg'
                : '/images/coin-icon-default.svg'
            }
            alt={displayData.assetDisplay}
            w="1.25rem"
            h="1.25rem"
          />
          <Tooltip
            label={
              displayData.transferType === TransferType.ERC721_TRANSFER
                ? undefined
                : displayData.fullCoinTotal
            }
            placement="top-start"
          >
            <Text
              noOfLines={1}
              data-testid={
                displayData.transferType === TransferType.ERC721_TRANSFER
                  ? 'link-token-name'
                  : 'link-token-amount'
              }
            >
              {(displayData.eventType == TokenEventType.WITHDRAW ? '- ' : '+ ') +
                displayData.assetDisplay}
            </Text>
          </Tooltip>
        </HStack>
        <HStack
          w="40%"
          justifyContent="flex-end"
        >
          <DisplayAddress
            data-testid="link-transfer-address"
            address={getAddress(displayData.transferAddress)}
            textAlign="end"
            onClick={e => e.stopPropagation()}
          />
        </HStack>
      </HStack>
    </Box>
  );
}

function EmptyTransactions() {
  const { t } = useTranslation('treasury');
  return (
    <Text
      textStyle="body-base"
      color="neutral-6"
      data-testid="text-empty-transactions"
      align="center"
      px={{ base: '1rem', lg: '1.5rem' }}
    >
      {t('textEmptyTransactions')}
    </Text>
  );
}

export function Transactions({ shownTransactions }: { shownTransactions: number }) {
  const {
    treasury: { transfers },
  } = useFractal();

  if (transfers === null) {
    return (
      <Center w="100%">
        <BarLoader />
      </Center>
    );
  }
  if (transfers.length === 0) return <EmptyTransactions />;
  return (
    <Box
      overflowX="auto"
      className="scroll-dark"
    >
      {transfers.slice(0, shownTransactions - 1).map((transfer, i) => (
        <TransferRow
          key={i}
          displayData={transfer}
        />
      ))}
    </Box>
  );
}

export function PaginationButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation('treasury');
  return (
    <Flex
      w="full"
      mt="1rem"
      justifyContent="center"
    >
      {/* @todo - this should be <Button variant="button-pill" /> from theme, same as CeleryButtonWithIcon */}
      <Button
        h="1.75rem"
        py="0.25rem"
        px="0.75rem"
        borderRadius="full"
        bg="neutral-3"
        color="lilac-0"
        onClick={onClick}
      >
        {t('textMoreTransactions')}
      </Button>
    </Flex>
  );
}

export function PaginationCount({ shownTransactions }: { shownTransactions: number }) {
  const { t } = useTranslation('treasury');
  const {
    node: { safe },
    treasury: { transfers },
  } = useFractal();
  const totalTransfers = transfers?.length;
  if (!totalTransfers || !safe?.address) {
    return null;
  }
  return (
    <Flex gap="0.25rem">
      <Text
        color="neutral-7"
        textStyle="helper-text-base"
      >
        {t('transactionsShownCount', {
          count: totalTransfers > shownTransactions ? shownTransactions : totalTransfers,
        })}
      </Text>
      <EtherscanLink
        type="address"
        value={safe.address}
        p={0}
        textStyle="helper-text-base"
        outline="unset"
        outlineOffset="unset"
        borderWidth={0}
      >
        {t('transactionsTotalCount', { count: totalTransfers })}
      </EtherscanLink>
    </Flex>
  );
}
