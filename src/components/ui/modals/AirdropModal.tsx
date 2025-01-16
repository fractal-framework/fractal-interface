import { Box, Button, Flex, HStack, IconButton, Select, Text } from '@chakra-ui/react';
import { CaretDown, MinusCircle, Plus } from '@phosphor-icons/react';
import { Field, FieldAttributes, FieldProps, Form, Formik } from 'formik';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Address, getAddress, isAddress } from 'viem';
import { usePublicClient } from 'wagmi';
import * as Yup from 'yup';
import { useFractal } from '../../../providers/App/AppProvider';
import { useDaoInfoStore } from '../../../store/daoInfo/useDaoInfoStore';
import { BigIntValuePair, TokenBalance } from '../../../types';
import { formatCoinFromAsset } from '../../../utils';
import { validateENSName } from '../../../utils/url';
import { BigIntInput } from '../forms/BigIntInput';
import { CustomNonceInput } from '../forms/CustomNonceInput';
import { AddressInput } from '../forms/EthAddressInput';
import LabelWrapper from '../forms/LabelWrapper';
import Divider from '../utils/Divider';

interface AirdropFormValues {
  selectedAsset: TokenBalance;
  recipients: {
    address: string;
    amount: BigIntValuePair;
  }[];
}

export interface AirdropData {
  recipients: {
    address: Address;
    amount: bigint;
  }[];
  asset: TokenBalance;
  nonceInput: number | undefined; // this is only releveant when the caller action results in a proposal
}

export function AirdropModal({
  submitButtonText,
  showNonceInput,
  close,
  airdropData,
}: {
  submitButtonText: string;
  showNonceInput: boolean;
  close: () => void;
  airdropData: (airdropData: AirdropData) => void;
}) {
  const {
    treasury: { assetsFungible },
  } = useFractal();
  const { safe } = useDaoInfoStore();

  const publicClient = usePublicClient();
  const { t } = useTranslation(['modals', 'common']);

  const fungibleAssetsWithBalance = assetsFungible.filter(asset => parseFloat(asset.balance) > 0);
  const [nonceInput, setNonceInput] = useState<number | undefined>(safe!.nextNonce);

  const airdropValidationSchema = Yup.object().shape({
    selectedAsset: Yup.object()
      .shape({
        tokenAddress: Yup.string().required(),
        name: Yup.string().required(),
        symbol: Yup.string().required(),
        decimals: Yup.number().required(),
        balance: Yup.string().required(),
      })
      .required(),
    recipients: Yup.array()
      .of(
        Yup.object()
          .shape({
            address: Yup.string().required(),
            amount: Yup.object()
              .shape({
                value: Yup.string().required(),
              })
              .required(),
          })
          .required(),
      )
      .required(),
  });

  const handleAirdropSubmit = async (values: AirdropFormValues) => {
    airdropData({
      recipients: await Promise.all(
        values.recipients.map(async recipient => {
          let destAddress = recipient.address;
          if (!isAddress(destAddress) && validateENSName(recipient.address) && publicClient) {
            const ensAddress = await publicClient.getEnsAddress({ name: recipient.address });
            if (ensAddress === null) {
              throw new Error('Invalid ENS name');
            }
            destAddress = ensAddress;
          }
          return {
            address: getAddress(destAddress),
            amount: recipient.amount.bigintValue!,
          };
        }),
      ),
      asset: values.selectedAsset,
      nonceInput,
    });

    close();
  };
  return (
    <Box>
      <Formik<AirdropFormValues>
        initialValues={{
          selectedAsset: fungibleAssetsWithBalance[0],
          recipients: [{ address: '', amount: { bigintValue: 0n, value: '0' } }],
        }}
        onSubmit={handleAirdropSubmit}
        validationSchema={airdropValidationSchema}
      >
        {({ errors, values, setFieldValue, handleSubmit }) => {
          const totalAmount = values.recipients.reduce(
            (acc, recipient) => acc + (recipient.amount.bigintValue || 0n),
            0n,
          );
          const overDraft = totalAmount > BigInt(values.selectedAsset.balance);
          const isSubmitDisabled = !values.recipients || totalAmount === 0n || overDraft;
          const selectedAssetIndex = fungibleAssetsWithBalance.findIndex(
            asset => asset.tokenAddress === values.selectedAsset.tokenAddress,
          );

          return (
            <Form onSubmit={handleSubmit}>
              <Flex>
                {/* ASSET SELECT */}
                <Field name="selectedAsset">
                  {({ field }: FieldAttributes<FieldProps<TokenBalance>>) => (
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

              {/* RECIPIENTS INPUTS */}
              <Field name="recipients">
                {({
                  field,
                }: FieldAttributes<FieldProps<{ address: string; amount: BigIntValuePair }[]>>) =>
                  field.value.map((recipient, index) => {
                    return (
                      <Box
                        key={index}
                        display="flex"
                        alignItems="center"
                        gap="1rem"
                        mb="2.5rem"
                      >
                        <LabelWrapper
                          label={t('recipientsLabel')}
                          subLabel={t('recipientsSublabel')}
                          errorMessage={
                            field.value &&
                            field.value[index].address &&
                            errors.recipients &&
                            errors.recipients[index] &&
                            (errors.recipients[index] as { address: string }).address
                          }
                        >
                          <AddressInput
                            {...field}
                            onChange={e => {
                              setFieldValue(
                                'recipients',
                                field.value.map((r, i) => {
                                  if (i === index) {
                                    return { ...r, address: e.target.value };
                                  }
                                  return r;
                                }),
                              );
                            }}
                            value={recipient.address}
                          />
                        </LabelWrapper>
                        <LabelWrapper
                          label={t('amountLabel')}
                          subLabel={t('airdropAmountSublabel')}
                        >
                          <BigIntInput
                            {...field}
                            value={recipient.amount.bigintValue}
                            onChange={value => {
                              setFieldValue(
                                'recipients',
                                field.value.map((r, i) => {
                                  if (i === index) {
                                    return { ...r, amount: value };
                                  }
                                  return r;
                                }),
                              );
                            }}
                            parentFormikValue={recipient.amount}
                            decimalPlaces={values.selectedAsset.decimals}
                            placeholder="0"
                            maxValue={
                              BigInt(values.selectedAsset.balance) -
                              BigInt(totalAmount) +
                              BigInt(recipient.amount.bigintValue || 0n)
                            }
                            isInvalid={overDraft}
                            errorBorderColor="red-0"
                          />
                        </LabelWrapper>
                        {/* Remove parameter button */}
                        {index !== 0 || values.recipients.length !== 1 ? (
                          <IconButton
                            icon={<MinusCircle />}
                            aria-label={t('removeRecipientLabel')}
                            variant="unstyled"
                            onClick={() =>
                              setFieldValue(
                                `recipients`,
                                values.recipients.filter(
                                  (_recipientToRemove, recipientToRemoveIndex) =>
                                    recipientToRemoveIndex !== index,
                                ),
                              )
                            }
                            minWidth="auto"
                            color="lilac-0"
                            _disabled={{ opacity: 0.4, cursor: 'default' }}
                            sx={{ '&:disabled:hover': { color: 'inherit', opacity: 0.4 } }}
                          />
                        ) : (
                          <Box h="2.25rem" />
                        )}
                      </Box>
                    );
                  })
                }
              </Field>

              <Box
                mt="3rem"
                w="100%"
              >
                <Button
                  onClick={() =>
                    setFieldValue('recipients', [
                      ...values.recipients,
                      { address: '', amount: { bigintValue: 0n, value: '0' } },
                    ])
                  }
                  leftIcon={<Plus size="1rem" />}
                >
                  {t('addRecipient')}
                </Button>
              </Box>

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
                isDisabled={!!errors.recipients || !!errors.selectedAsset || isSubmitDisabled}
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
