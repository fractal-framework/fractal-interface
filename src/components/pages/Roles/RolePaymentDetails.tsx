import { Box, Button, Flex, Grid, GridItem, Icon, Image, Text } from '@chakra-ui/react';
import { Calendar, Download } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAddress, getContract } from 'viem';
import { usePublicClient } from 'wagmi';
import { SablierV2LockupLinearAbi } from '../../../assets/abi/SablierV2LockupLinear';
import { DETAILS_SHADOW } from '../../../constants/common';
import { convertStreamIdToBigInt } from '../../../hooks/streams/useCreateSablierStream';
import { useFractal } from '../../../providers/App/AppProvider';
import { DEFAULT_DATE_FORMAT, formatCoin, formatUSD } from '../../../utils';
import { SablierPayment } from './types';

function PaymentDate({ label, date }: { label: string; date?: Date }) {
  const { t } = useTranslation(['roles']);
  return (
    <Flex
      flexDir="column"
      gap="0.5rem"
    >
      <Text
        textStyle="label-small"
        color="neutral-7"
      >
        {t(label)}
      </Text>
      <Flex gap="0.25rem">
        <Icon
          boxSize="1rem"
          as={Calendar}
        />
        <Text
          textStyle="label-small"
          color="neutral-7"
        >
          {date ? format(date, DEFAULT_DATE_FORMAT) : '---'}
        </Text>
      </Flex>
    </Flex>
  );
}

function GreenActiveDot({ isActive }: { isActive: boolean }) {
  if (!isActive) {
    return null;
  }
  return (
    <Box
      boxSize="0.75rem"
      borderRadius="100%"
      bg="celery--2"
      border="2px solid"
      borderColor="celery--5"
    />
  );
}

interface RolePaymentDetailsProps {
  payment: SablierPayment;
  onClick?: () => void;
  showWithdraw?: boolean;
}
export function RolePaymentDetails({ payment, onClick, showWithdraw }: RolePaymentDetailsProps) {
  const { t } = useTranslation(['roles']);
  const {
    treasury: { assetsFungible },
  } = useFractal();
  const publicClient = usePublicClient();

  const [withdrawableAmount, setWithdrawableAmount] = useState(0n);

  const loadAmounts = useCallback(async () => {
    if (publicClient && payment?.streamId && payment?.contractAddress) {
      const streamContract = getContract({
        abi: SablierV2LockupLinearAbi,
        address: payment.contractAddress,
        client: publicClient,
      });

      const bigintStreamId = convertStreamIdToBigInt(payment.streamId);

      const newWithdrawableAmount = await streamContract.read.withdrawableAmountOf([
        bigintStreamId,
      ]);
      setWithdrawableAmount(newWithdrawableAmount);
    }
  }, [publicClient, payment?.streamId, payment?.contractAddress]);

  useEffect(() => {
    loadAmounts();
  }, [loadAmounts]);

  const amountPerWeek = useMemo(() => {
    if (!payment.amount.bigintValue) {
      return;
    }

    const totalAmount = payment.amount.bigintValue;
    const endDate = payment.endDate.getTime();
    const startDate = payment.startDate.getTime();

    const totalMilliseconds = endDate - startDate;
    const totalWeeks = totalMilliseconds / (1000 * 60 * 60 * 24 * 7);
    const roundedWeeks = Math.ceil(totalWeeks);

    return totalAmount / BigInt(roundedWeeks);
  }, [payment]);

  const streamAmountUSD = useMemo(() => {
    if (!payment.amount) {
      return;
    }
    const totalAmount = payment.amount.bigintValue;
    // @todo add price support for tokens not found in assetsFungible
    const foundAsset = assetsFungible.find(
      asset => getAddress(asset.tokenAddress) === payment.asset.address,
    );
    if (!foundAsset || foundAsset.usdPrice === undefined || totalAmount === undefined) {
      return;
    }
    return totalAmount * BigInt(foundAsset.usdPrice);
  }, [payment, assetsFungible]);

  const openWithdrawModal = () => {
    // @todo implement
  };

  return (
    <Box
      boxShadow={DETAILS_SHADOW}
      bg="neutral-2"
      borderRadius="0.5rem"
      pt="1rem"
      my="0.5rem"
      w="full"
      onClick={onClick}
      cursor={!!onClick ? 'pointer' : 'default'}
    >
      <Box>
        <Flex
          flexDir="column"
          mx={4}
        >
          <Flex justifyContent="space-between">
            <Text
              textStyle="display-2xl"
              color="white-0"
            >
              {payment.amount?.bigintValue
                ? formatCoin(payment.amount.bigintValue, false, payment.asset.decimals)
                : undefined}
            </Text>
            <Flex
              gap={2}
              alignItems="center"
              border="1px solid"
              borderColor="neutral-4"
              borderRadius="9999px"
              w="fit-content"
              className="payment-menu-asset"
              p="0.5rem"
            >
              <Image
                src={payment.asset?.logo}
                fallbackSrc="/images/coin-icon-default.svg"
                boxSize="1.5rem"
              />
              <Text
                textStyle="label-base"
                color="white-0"
              >
                {payment.asset?.symbol ?? t('selectLabel', { ns: 'modals' })}
              </Text>
            </Flex>
          </Flex>
          <Flex justifyContent="space-between">
            <Text
              textStyle="label-small"
              color="neutral-7"
            >
              {streamAmountUSD !== undefined ? formatUSD(streamAmountUSD.toString()) : '$ ---'}
            </Text>
            <Flex
              alignItems="center"
              gap="0.5rem"
            >
              <GreenActiveDot isActive={payment.isActive} />
              <Text
                textStyle="label-small"
                color="white-0"
              >
                {`${amountPerWeek?.toLocaleString()} ${payment.asset?.symbol} / ${t('week')}`}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Box>

      <Box
        boxShadow={DETAILS_SHADOW}
        borderBottomRadius="0.5rem"
        py="1rem"
        mt="1rem"
      >
        <Grid
          mx={4}
          templateAreas='"starting dividerOne cliff dividerTwo ending"'
          templateColumns="1fr 24px 1fr 24px 1fr"
        >
          <GridItem area="starting">
            <PaymentDate
              label="Starting"
              date={payment.startDate}
            />
          </GridItem>
          <GridItem area="dividerOne">
            <Box
              borderLeft="1px solid"
              borderColor="white-alpha-08"
              h="full"
              boxShadow={DETAILS_SHADOW}
              w="0"
            />
          </GridItem>
          <GridItem area="cliff">
            <PaymentDate
              label="Cliff"
              date={payment.cliffDate}
            />
          </GridItem>
          <GridItem area="dividerTwo">
            <Box
              borderLeft="1px solid"
              borderColor="white-alpha-08"
              h="full"
              boxShadow={DETAILS_SHADOW}
              w="0"
            />
          </GridItem>
          <GridItem area="ending">
            <PaymentDate
              label="Ending"
              date={payment.endDate}
            />
          </GridItem>
        </Grid>
        {!!showWithdraw && !!withdrawableAmount && (
          <Box
            mt={4}
            px={4}
          >
            <Button
              w="full"
              leftIcon={<Download />}
              onClick={openWithdrawModal}
            >
              {t('withdraw')}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}