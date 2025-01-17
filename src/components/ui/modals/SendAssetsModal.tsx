import { Box, Flex, Select, HStack, Text, Button } from '@chakra-ui/react';
import { CaretDown } from '@phosphor-icons/react';
import { Field, FieldAttributes, FieldProps, Form, Formik } from 'formik';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Address, getAddress } from 'viem';
import * as Yup from 'yup';
import { useValidationAddress } from '../../../hooks/schemas/common/useValidationAddress';
import useNetworkPublicClient from '../../../hooks/useNetworkPublicClient';
import { useFractal } from '../../../providers/App/AppProvider';
import { useDaoInfoStore } from '../../../store/daoInfo/useDaoInfoStore';
import { BigIntValuePair, TokenBalance } from '../../../types';
import { formatCoinFromAsset, formatCoinUnits } from '../../../utils/numberFormats';
import { validateENSName } from '../../../utils/url';
import { BigIntInput } from '../forms/BigIntInput';
import { CustomNonceInput } from '../forms/CustomNonceInput';
import { AddressInput } from '../forms/EthAddressInput';
import LabelWrapper from '../forms/LabelWrapper';
import Divider from '../utils/Divider';

interface SendAssetsFormValues {
  destinationAddress: string;
  selectedAsset: TokenBalance;
  inputAmount?: BigIntValuePair;
}

export interface SendAssetsData {
  destinationAddress: Address;
  transferAmount: bigint;
  asset: TokenBalance;
  nonceInput: number | undefined; // this is only releveant when the caller action results in a proposal
}

export function SendAssetsModal({
  submitButtonText,
  showNonceInput,
  close,
  sendAssetsData,
}: {
  submitButtonText: string;
  showNonceInput: boolean;
  close: () => void;
  sendAssetsData: (sendAssetData: SendAssetsData) => void;
}) {
  const {
    treasury: { assetsFungible },
  } = useFractal();
  const { safe } = useDaoInfoStore();

  const publicClient = useNetworkPublicClient();
  const { t } = useTranslation(['modals', 'common']);

  const fungibleAssetsWithBalance = assetsFungible.filter(asset => parseFloat(asset.balance) > 0);
  const [nonceInput, setNonceInput] = useState<number | undefined>(safe!.nextNonce);

  const { addressValidationTest, isValidating } = useValidationAddress();

  const sendAssetsValidationSchema = Yup.object().shape({
    destinationAddress: Yup.string().test(addressValidationTest),
    selectedAsset: Yup.object()
      .shape({
        tokenAddress: Yup.string().required(),
        name: Yup.string().required(),
        symbol: Yup.string().required(),
        decimals: Yup.number().required(),
        balance: Yup.string().required(),
      })
      .required(),
    inputAmount: Yup.object()
      .shape({
        value: Yup.string().required(),
      })
      .required(),
  });

  const handleSendAssetsSubmit = async (values: SendAssetsFormValues) => {
    let destAddress = values.destinationAddress;
    if (validateENSName(values.destinationAddress)) {
      const ensAddress = await publicClient.getEnsAddress({ name: values.destinationAddress });
      if (ensAddress === null) {
        throw new Error('Invalid ENS name');
      }
      destAddress = ensAddress;
    }

    sendAssetsData({
      transferAmount: values.inputAmount?.bigintValue || 0n,
      asset: values.selectedAsset,
      destinationAddress: getAddress(destAddress),
      nonceInput,
    });

    close();
  };

  return (
    <Box>
      <Formik<SendAssetsFormValues>
        initialValues={{
          destinationAddress: '',
          selectedAsset: fungibleAssetsWithBalance[0],
          inputAmount: undefined,
        }}
        onSubmit={handleSendAssetsSubmit}
        validationSchema={sendAssetsValidationSchema}
      >
        {({ errors, values, setFieldValue, handleSubmit }) => {
          const overDraft =
            Number(values.inputAmount?.value || '0') >
            formatCoinUnits(
              values.selectedAsset.balance,
              values.selectedAsset.decimals,
              values.selectedAsset.symbol,
            );

          // @dev next couple of lines are written like this, to keep typing equivalent during the conversion from BN to bigint
          const inputBigint = values.inputAmount?.bigintValue;
          const inputBigintIsZero = inputBigint ? inputBigint === 0n : undefined;
          const isSubmitDisabled = !values.inputAmount || inputBigintIsZero || overDraft;

          const selectedAssetIndex = fungibleAssetsWithBalance.findIndex(
            asset => asset.tokenAddress === values.selectedAsset.tokenAddress,
          );

          return (
            <Form onSubmit={handleSubmit}>
              <Flex>
                {/* ASSET SELECT */}
                <Field name="selectedAsset">
                  {({ field }: FieldAttributes<FieldProps<TokenBalance>>) => (
                    <Box
                      width="40%"
                      marginEnd="0.75rem"
                    >
                      <LabelWrapper label={t('selectLabel')}>
                        <Select
                          {...field}
                          bgColor="neutral-1"
                          borderColor="neutral-3"
                          rounded="sm"
                          cursor="pointer"
                          iconSize="1.5rem"
                          icon={<CaretDown />}
                          onChange={e => {
                            // New asset selected. First reset the form input amount
                            setFieldValue('inputAmount', undefined);
                            setFieldValue(
                              'selectedAsset',
                              fungibleAssetsWithBalance[Number(e.target.value)],
                            );
                          }}
                          value={selectedAssetIndex}
                        >
                          {fungibleAssetsWithBalance.map((asset, index) => (
                            <option
                              key={index}
                              value={index}
                            >
                              {asset.symbol}
                            </option>
                          ))}
                        </Select>
                      </LabelWrapper>
                    </Box>
                  )}
                </Field>

                {/* SEND AMOUNT INPUT */}
                <Field name="inputAmount">
                  {({ field }: FieldAttributes<FieldProps<BigIntValuePair | undefined>>) => (
                    <Box width="60%">
                      <LabelWrapper label={t('amountLabel')}>
                        <BigIntInput
                          {...field}
                          value={field.value?.bigintValue}
                          onChange={value => {
                            setFieldValue('inputAmount', value);
                          }}
                          parentFormikValue={values.inputAmount}
                          decimalPlaces={values.selectedAsset.decimals}
                          placeholder="0"
                          maxValue={BigInt(values.selectedAsset.balance)}
                          isInvalid={overDraft}
                          errorBorderColor="red-0"
                        />
                      </LabelWrapper>
                    </Box>
                  )}
                </Field>
              </Flex>

              {/* AVAILABLE BALANCE HINT */}
              <HStack
                justify="space-between"
                textStyle="neutral-7"
                color="white-0"
                marginTop="0.75rem"
              >
                <Text
                  color={overDraft ? 'red-0' : 'neutral-7'}
                  textStyle="labels-large"
                  as="span"
                >
                  {t('selectSublabel', {
                    balance: formatCoinFromAsset(values.selectedAsset, false),
                  })}
                </Text>
              </HStack>

              <Divider my="1.5rem" />

              {/* DESTINATION ADDRESS INPUT */}
              <Field name={'destinationAddress'}>
                {({ field }: FieldAttributes<FieldProps<string>>) => (
                  <LabelWrapper
                    label={t('destinationLabel')}
                    subLabel={t('destinationSublabel')}
                    errorMessage={field.value && errors.destinationAddress}
                  >
                    <AddressInput {...field} />
                  </LabelWrapper>
                )}
              </Field>

              <Divider my="1.5rem" />

              {showNonceInput && (
                <CustomNonceInput
                  nonce={nonceInput}
                  onChange={nonce => setNonceInput(nonce ? parseInt(nonce) : undefined)}
                />
              )}

              <Button
                marginTop="2rem"
                width="100%"
                type="submit"
                isDisabled={
                  isValidating ||
                  !!errors.destinationAddress ||
                  !!errors.selectedAsset ||
                  !!errors.inputAmount ||
                  isSubmitDisabled
                }
              >
                {submitButtonText}
              </Button>
            </Form>
          );
        }}
      </Formik>
    </Box>
  );
}
