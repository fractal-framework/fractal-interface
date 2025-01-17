import { Box, Button, Flex, Image, Text, useBreakpointValue } from '@chakra-ui/react';
import { Download } from '@phosphor-icons/react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Address, encodeFunctionData, getContract } from 'viem';
import HatsAccount1ofNAbi from '../../../assets/abi/HatsAccount1ofN';
import { SablierV2LockupLinearAbi } from '../../../assets/abi/SablierV2LockupLinear';
import { convertStreamIdToBigInt } from '../../../hooks/streams/useCreateSablierStream';
import { useNetworkWalletClient } from '../../../hooks/useNetworkWalletClient';
import useAvatar from '../../../hooks/utils/useAvatar';
import { useGetAccountName } from '../../../hooks/utils/useGetAccountName';
import { useTransaction } from '../../../hooks/utils/useTransaction';
import { useNetworkConfigStore } from '../../../providers/NetworkConfig/useNetworkConfigStore';
import { formatCoin } from '../../../utils';
import { getNetworkIcon } from '../../../utils/url';
import Avatar, { AvatarSize } from '../page/Header/Avatar';

export function PaymentWithdrawModal({
  paymentAssetLogo,
  paymentAssetSymbol,
  paymentAssetDecimals,
  paymentStreamId,
  paymentContractAddress,
  withdrawInformation,
  onSuccess,
  onClose,
}: {
  paymentAssetLogo?: string;
  paymentAssetSymbol: string;
  paymentStreamId?: string;
  paymentAssetDecimals: number;
  paymentContractAddress?: Address;
  withdrawInformation: {
    roleHatSmartAccountAddress: Address | undefined;
    recipient: Address;
    withdrawableAmount: bigint;
  };
  onSuccess: () => Promise<void>;
  onClose: () => void;
}) {
  const { data: walletClient } = useNetworkWalletClient();
  const [contractCall, pendingTransaction] = useTransaction();
  const { t } = useTranslation(['roles', 'menu', 'common', 'modals']);
  const { displayName: accountDisplayName } = useGetAccountName(withdrawInformation.recipient);
  const avatarURL = useAvatar(accountDisplayName);
  const iconSize = useBreakpointValue<AvatarSize>({ base: 'sm', md: 'icon' }) || 'sm';
  const { chain, addressPrefix } = useNetworkConfigStore();

  const handleWithdraw = useCallback(async () => {
    if (
      paymentContractAddress &&
      paymentStreamId &&
      walletClient &&
      withdrawInformation.recipient
    ) {
      const sablierV2LockupLinearContract = getContract({
        abi: SablierV2LockupLinearAbi,
        address: paymentContractAddress,
        client: walletClient,
      });
      const bigIntStreamId = convertStreamIdToBigInt(paymentStreamId);

      contractCall({
        contractFn: () => {
          if (!withdrawInformation.roleHatSmartAccountAddress) {
            return sablierV2LockupLinearContract.write.withdrawMax([
              bigIntStreamId,
              withdrawInformation.recipient,
            ]);
          }
          const hatsAccountCalldata = encodeFunctionData({
            abi: SablierV2LockupLinearAbi,
            functionName: 'withdrawMax',
            args: [bigIntStreamId, withdrawInformation.recipient],
          });
          const hatsAccountContract = getContract({
            abi: HatsAccount1ofNAbi,
            address: withdrawInformation.roleHatSmartAccountAddress,
            client: walletClient,
          });
          return hatsAccountContract.write.execute([
            paymentContractAddress,
            0n,
            hatsAccountCalldata,
            0,
          ]);
        },
        pendingMessage: t('withdrawPendingMessage'),
        failedMessage: t('withdrawRevertedMessage'),
        successMessage: t('withdrawSuccessMessage'),
        failedCallback: () => {},
        successCallback: async () => {
          await onSuccess();
          onClose();
        },
        completedCallback: () => {},
      });
    }
  }, [
    paymentContractAddress,
    paymentStreamId,
    walletClient,
    withdrawInformation.roleHatSmartAccountAddress,
    withdrawInformation.recipient,
    contractCall,
    t,
    onSuccess,
    onClose,
  ]);

  return (
    <Flex
      flexDirection="column"
      gap="1.5rem"
      px={{ base: '1rem', md: 0 }}
    >
      {/* AVAILABLE */}
      <Flex alignItems="center">
        <Text
          color="neutral-7"
          flex={3}
        >
          {t('available')}
        </Text>
        <Flex
          alignItems="center"
          gap={{ base: '0.25rem', md: '0.5rem' }}
          flex={5}
        >
          <Image
            src={paymentAssetLogo}
            fallbackSrc="/images/coin-icon-default.svg"
            alt={paymentAssetSymbol}
            w="1.5rem"
            h="1.5rem"
          />
          <Flex gap="0.25rem">
            <Text w="full">
              {formatCoin(
                withdrawInformation.withdrawableAmount,
                true,
                paymentAssetDecimals,
                undefined,
                false,
              )}
            </Text>
            <Text w="full">{paymentAssetSymbol}</Text>
          </Flex>
        </Flex>
      </Flex>

      {/* RECIPIENT */}
      <Flex mt="0.25rem">
        <Text
          color="neutral-7"
          flex={3}
          mt="-0.25rem"
        >
          {t('withdrawTo')}
        </Text>

        <Flex
          gap={{ base: '0.25rem', md: '0.5rem' }}
          flex={5}
        >
          <Avatar
            address={withdrawInformation.recipient}
            url={avatarURL}
            size={iconSize}
          />
          <Text
            mt="-0.25rem"
            overflowWrap="anywhere"
            whiteSpace="normal"
            w="full"
          >
            {withdrawInformation.recipient}
          </Text>
        </Flex>
      </Flex>

      {/* NETWORK */}
      <Flex>
        <Text
          color="neutral-7"
          flex={3}
        >
          {t('network', { ns: 'menu' })}
        </Text>
        <Flex
          alignItems="center"
          gap={{ base: '0.25rem', md: '0.5rem' }}
          flex={5}
        >
          <Box flexShrink={0}>
            {/* Network Icon */}
            <Flex gap="0.5rem">
              <Image src={getNetworkIcon(addressPrefix)} />
            </Flex>
          </Box>
          <Text>{chain.name}</Text>
        </Flex>
      </Flex>

      <Flex
        flexDirection="column"
        gap="0.75rem"
        mt="1.5rem"
      >
        <Button
          isDisabled={pendingTransaction}
          onClick={handleWithdraw}
          leftIcon={<Download />}
        >
          {t('withdraw')}
        </Button>
        <Button
          isDisabled={pendingTransaction}
          variant="secondary"
          onClick={onClose}
        >
          {t('cancel', { ns: 'common' })}
        </Button>
      </Flex>
    </Flex>
  );
}
