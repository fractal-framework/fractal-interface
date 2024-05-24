import { Box, Button, Flex, SimpleGrid, Spacer, Text } from '@chakra-ui/react';
import { LabelWrapper } from '@decent-org/fractal-ui';
import { Field, FieldAttributes, Formik } from 'formik';
import { useTranslation } from 'react-i18next';
import { zeroAddress, getAddress, getContract } from 'viem';
import { useWalletClient } from 'wagmi';
import * as Yup from 'yup';
import LockReleaseAbi from '../../../assets/abi/LockRelease';
import VotesERC20Abi from '../../../assets/abi/VotesERC20';
import useSafeContracts from '../../../hooks/safe/useSafeContracts';
import { useValidationAddress } from '../../../hooks/schemas/common/useValidationAddress';
import useDisplayName from '../../../hooks/utils/useDisplayName';
import { useTransaction } from '../../../hooks/utils/useTransaction';
import { useFractal } from '../../../providers/App/AppProvider';
import { useEthersSigner } from '../../../providers/Ethers/hooks/useEthersSigner';
import { AzoriusGovernance, DecentGovernance } from '../../../types';
import { formatCoin } from '../../../utils/numberFormats';
import { validateENSName } from '../../../utils/url';
import { AddressInput } from '../forms/EthAddressInput';
import EtherscanLink from '../links/EtherscanLink';
import Divider from '../utils/Divider';

export function DelegateModal({ close }: { close: Function }) {
  const { t } = useTranslation(['modals', 'common']);

  const {
    governance,
    governanceContracts: { votesTokenContractAddress, lockReleaseContractAddress },
    readOnly: { user },
    action: { loadReadOnlyValues },
  } = useFractal();

  const baseContracts = useSafeContracts();

  const signer = useEthersSigner();
  const azoriusGovernance = governance as AzoriusGovernance;
  const decentGovernance = azoriusGovernance as DecentGovernance;
  const delegateeDisplayName = useDisplayName(azoriusGovernance?.votesToken?.delegatee);
  const lockedDelegateeDisplayName = useDisplayName(decentGovernance?.lockedVotesToken?.delegatee);
  const [, contractCallPendingViem, contractCallViem] = useTransaction();
  const { addressValidationTest } = useValidationAddress();
  const { data: walletClient } = useWalletClient();

  const submitDelegation = async (values: { address: string }) => {
    if (!votesTokenContractAddress || !baseContracts || !walletClient) return;
    let validAddress = getAddress(values.address);
    if (validateENSName(validAddress) && signer) {
      validAddress = getAddress(await signer.resolveName(values.address));
    }

    const votingTokenContract = getContract({
      abi: VotesERC20Abi,
      address: getAddress(votesTokenContractAddress),
      client: walletClient,
    });

    contractCallViem({
      contractFn: () => votingTokenContract.write.delegate([validAddress]),
      pendingMessage: t('pendingDelegateVote'),
      failedMessage: t('failedDelegateVote'),
      successMessage: t('successDelegateVote'),
      successCallback: () => {
        close();
      },
    });
  };
  const submitLockedDelegation = async (values: { address: string }) => {
    if (!lockReleaseContractAddress || !baseContracts || !signer || !walletClient) return;
    let validAddress = values.address;
    if (validateENSName(validAddress)) {
      validAddress = await signer.resolveName(values.address);
    }

    const lockReleaseContract = getContract({
      abi: LockReleaseAbi,
      address: getAddress(lockReleaseContractAddress),
      client: walletClient,
    });

    contractCallViem({
      contractFn: () => lockReleaseContract.write.delegate([getAddress(validAddress)]),
      pendingMessage: t('pendingDelegateVote'),
      failedMessage: t('failedDelegateVote'),
      successMessage: t('successDelegateVote'),
      successCallback: async () => {
        await loadReadOnlyValues();
        close();
      },
    });
  };

  const delegationValidationSchema = Yup.object().shape({
    address: Yup.string().test(addressValidationTest),
  });

  if (!azoriusGovernance.votesToken) return null;

  return (
    <Box>
      <SimpleGrid
        columns={2}
        color="neutral-7"
      >
        <Text
          align="start"
          marginBottom="0.5rem"
        >
          {t('titleBalance')}
        </Text>
        <Text
          align="end"
          color="neutral-7"
        >
          {formatCoin(
            azoriusGovernance.votesToken.balance || 0n,
            false,
            azoriusGovernance.votesToken.decimals,
            azoriusGovernance.votesToken.symbol,
          )}
        </Text>
        <Text
          align="start"
          marginBottom="1rem"
        >
          {t('titleDelegatedTo')}
        </Text>
        <Text
          align="end"
          color="neutral-7"
        >
          {azoriusGovernance.votesToken.delegatee === zeroAddress ? (
            '--'
          ) : (
            <EtherscanLink
              type="address"
              value={azoriusGovernance.votesToken.delegatee}
            >
              {delegateeDisplayName.displayName}
            </EtherscanLink>
          )}
        </Text>
      </SimpleGrid>
      {decentGovernance.lockedVotesToken?.balance !== null &&
        decentGovernance.lockedVotesToken?.balance !== undefined && (
          <SimpleGrid
            columns={2}
            color="neutral-6"
          >
            <Text
              align="start"
              marginBottom="0.5rem"
            >
              {t('titleLockedBalance')}
            </Text>
            <Text
              align="end"
              color="neutral-7"
            >
              {formatCoin(
                decentGovernance.lockedVotesToken.balance || 0n,
                false,
                azoriusGovernance.votesToken.decimals,
                azoriusGovernance.votesToken.symbol,
              )}
            </Text>
            <Text
              align="start"
              marginBottom="1rem"
            >
              {t('titleDelegatedTo')}
            </Text>
            <Text
              align="end"
              color="neutral-7"
            >
              {decentGovernance.lockedVotesToken.delegatee === zeroAddress ? (
                '--'
              ) : (
                <EtherscanLink
                  type="address"
                  value={decentGovernance.lockedVotesToken.delegatee}
                >
                  {lockedDelegateeDisplayName.displayName}
                </EtherscanLink>
              )}
            </Text>
          </SimpleGrid>
        )}
      <Divider marginBottom="1rem" />
      <Formik
        initialValues={{
          address: '',
        }}
        onSubmit={submitDelegation}
        validationSchema={delegationValidationSchema}
      >
        {({ handleSubmit, setFieldValue, values, errors }) => (
          <form onSubmit={handleSubmit}>
            <Flex alignItems="center">
              <Text color="neutral-7">{t('labelDelegateInput')}</Text>
              <Spacer />
              <Button
                pr={0}
                variant="text"
                color="lilac--3"
                onClick={() => (user.address ? setFieldValue('address', user.address) : null)}
              >
                {t('linkSelfDelegate')}
              </Button>
            </Flex>
            <Field name={'address'}>
              {({ field }: FieldAttributes<any>) => (
                <LabelWrapper
                  subLabel={t('sublabelDelegateInput')}
                  errorMessage={errors.address}
                >
                  <AddressInput
                    data-testid="delegate-addressInput"
                    {...field}
                  />
                </LabelWrapper>
              )}
            </Field>
            <Button
              type="submit"
              marginTop="2rem"
              width="100%"
              isDisabled={
                !!errors.address ||
                contractCallPendingViem ||
                !values.address ||
                values.address === azoriusGovernance.votesToken?.delegatee
              }
            >
              {t('buttonDelegate')}
            </Button>
            {decentGovernance.lockedVotesToken?.balance !== null &&
              decentGovernance.lockedVotesToken?.balance !== undefined && (
                <Button
                  marginTop="2rem"
                  width="100%"
                  onClick={() => submitLockedDelegation({ address: values.address })}
                  isDisabled={
                    !!errors.address ||
                    contractCallPendingViem ||
                    !values.address ||
                    values.address === decentGovernance.lockedVotesToken.delegatee
                  }
                >
                  {t('buttonLockedDelegate')}
                </Button>
              )}
          </form>
        )}
      </Formik>
    </Box>
  );
}
