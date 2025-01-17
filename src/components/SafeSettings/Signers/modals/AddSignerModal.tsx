import { Box, Button, Flex, HStack, Icon, Select, Text } from '@chakra-ui/react';
import { WarningCircle } from '@phosphor-icons/react';
import { Field, FieldAttributes, Formik } from 'formik';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Address, getAddress } from 'viem';
import * as Yup from 'yup';
import { useValidationAddress } from '../../../../hooks/schemas/common/useValidationAddress';
import useNetworkPublicClient from '../../../../hooks/useNetworkPublicClient';
import { useDaoInfoStore } from '../../../../store/daoInfo/useDaoInfoStore';
import { validateENSName } from '../../../../utils/url';
import SupportTooltip from '../../../ui/badges/SupportTooltip';
import { CustomNonceInput } from '../../../ui/forms/CustomNonceInput';
import { AddressInput } from '../../../ui/forms/EthAddressInput';
import LabelWrapper from '../../../ui/forms/LabelWrapper';
import Divider from '../../../ui/utils/Divider';
import useAddSigner from '../hooks/useAddSigner';

function AddSignerModal({
  close,
  signers,
  currentThreshold,
}: {
  close: () => void;
  signers: Address[];
  currentThreshold: number;
}) {
  const { safe } = useDaoInfoStore();
  if (!safe) {
    throw new Error('Safe not found');
  }

  const { t } = useTranslation(['modals', 'common']);
  const publicClient = useNetworkPublicClient();
  const { addressValidationTest, newSignerValidationTest } = useValidationAddress();
  const tooltipContainer = useRef<HTMLDivElement>(null);

  const addSigner = useAddSigner();

  const onSubmit = useCallback(
    async (values: { address: string; threshold: number; nonce: number }) => {
      const { address, nonce, threshold } = values;
      let validAddress = address;
      if (validateENSName(validAddress)) {
        const maybeEnsAddress = await publicClient.getEnsAddress({ name: address });
        if (maybeEnsAddress) {
          validAddress = maybeEnsAddress;
        }
      }

      await addSigner({
        newSigner: getAddress(validAddress),
        threshold: threshold,
        nonce: nonce,
        safeAddress: safe.address,
        close: close,
      });
    },
    [addSigner, close, safe, publicClient],
  );

  const addSignerValidationSchema = Yup.object().shape({
    address: Yup.string().test(addressValidationTest).test(newSignerValidationTest),
    nonce: Yup.number()
      .required()
      .moreThan((!!safe && safe.nonce - 1) || 0),
    threshold: Yup.number().required(),
    thresholdOptions: Yup.array().of(Yup.number()).required(),
  });

  return (
    <Box>
      <Formik
        initialValues={{
          address: '',
          nonce: safe?.nextNonce || 0,
          threshold: currentThreshold,
          thresholdOptions: Array.from({ length: signers.length + 1 }, (_, i) => i + 1),
        }}
        onSubmit={onSubmit}
        validationSchema={addSignerValidationSchema}
      >
        {({ handleSubmit, errors, values, setFieldValue }) => {
          return (
            <form onSubmit={handleSubmit}>
              <Text>{t('addSignerLabel', { ns: 'modals' })}</Text>
              <Field name={'address'}>
                {({ field }: FieldAttributes<any>) => (
                  <LabelWrapper
                    subLabel={t('addSignerSublabel', { ns: 'modals' })}
                    errorMessage={field.value && errors.address}
                  >
                    <AddressInput
                      {...field}
                      isInvalid={!!field.value && !!errors.address}
                    />
                  </LabelWrapper>
                )}
              </Field>
              <Divider
                mt={6}
                mb={4}
              />
              <HStack>
                <Text>{t('updateThreshold', { ns: 'modals' })}</Text>
                <Flex ref={tooltipContainer}>
                  <SupportTooltip
                    containerRef={tooltipContainer}
                    color="lilac-0"
                    label={t('updateSignersTooltip')}
                    mx="2"
                    mt="1"
                  />
                </Flex>
              </HStack>
              <HStack>
                <Select
                  onChange={e => setFieldValue('threshold', Number(e.target.value))}
                  mt={4}
                  width="8rem"
                  bgColor="neutral-1"
                  borderColor="neutral-3"
                  rounded="sm"
                  cursor="pointer"
                >
                  {values.thresholdOptions?.map(thresholdOption => (
                    <option
                      key={thresholdOption}
                      value={thresholdOption}
                    >
                      {thresholdOption}
                    </option>
                  ))}
                </Select>
                <Flex>
                  <Text
                    mt={3}
                    ml={2}
                  >{`${t('signersRequired1', { ns: 'modals' })} ${signers.length + 1} ${t(
                    'signersRequired2',
                    { ns: 'modals' },
                  )}`}</Text>
                </Flex>
              </HStack>

              <Flex
                w="fit-full"
                mt={6}
                p="1rem"
                border="1px"
                borderColor="yellow--1"
                bg="yellow--2"
                borderRadius="0.25rem"
                alignItems="center"
                gap="1rem"
              >
                <Icon
                  color="yellow-0"
                  as={WarningCircle}
                  boxSize="1.5rem"
                />
                <Text
                  color="yellow-0"
                  whiteSpace="pre-wrap"
                >
                  {t('updateSignerWarning', { ns: 'modals' })}
                </Text>
              </Flex>

              <Divider my={6} />
              <CustomNonceInput
                nonce={values.nonce}
                onChange={newNonce => setFieldValue('nonce', newNonce)}
              />
              <Button
                type="submit"
                isDisabled={!!Object.keys(errors).length || !safe}
                mt={6}
                width="100%"
              >
                {t('createProposal', { ns: 'modals' })}
              </Button>
            </form>
          );
        }}
      </Formik>
    </Box>
  );
}

export default AddSignerModal;
