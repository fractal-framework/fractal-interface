import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Box,
  Grid,
  Text,
} from '@chakra-ui/react';
import { Plus, CaretDown, CaretRight } from '@phosphor-icons/react';
import { FieldArray, FormikErrors } from 'formik';
import { useTranslation } from 'react-i18next';
import { useFractal } from '../../../providers/App/AppProvider';
import {
  AzoriusGovernance,
  BigIntValuePair,
  ICreationStepProps,
  TokenAllocation,
} from '../../../types';
import ContentBoxTitle from '../../ui/containers/ContentBox/ContentBoxTitle';
import { BigIntInput } from '../../ui/forms/BigIntInput';
import { LabelComponent } from '../../ui/forms/InputComponent';
import LabelWrapper from '../../ui/forms/LabelWrapper';
import CeleryButtonWithIcon from '../../ui/utils/CeleryButtonWithIcon';
import { AzoriusTokenAllocation } from './AzoriusTokenAllocation';

export function AzoriusTokenAllocations(props: ICreationStepProps) {
  const { values, errors, setFieldValue, isSubDAO } = props;
  const { t } = useTranslation('daoCreate');
  const { governance } = useFractal();
  const azoriusGovernance = governance as AzoriusGovernance;
  const canReceiveParentAllocations = isSubDAO && azoriusGovernance.votesToken?.address;

  return (
    <Box>
      <ContentBoxTitle>{t('titleAllocations')}</ContentBoxTitle>
      <FieldArray name="erc20Token.tokenAllocations">
        {({ remove, push }) => (
          <Box my={4}>
            <Grid
              gridTemplateColumns="1fr 35% 2rem"
              columnGap={4}
              rowGap={2}
              data-testid="tokenVoting-tokenAllocations"
            >
              <Text>{t('titleAddress')}</Text>
              <Text>{t('titleAmount')}</Text>
              <Box>{/* EMPTY */}</Box>

              {values.erc20Token.tokenAllocations.map((tokenAllocation, index) => {
                const tokenAllocationError = (
                  errors?.erc20Token?.tokenAllocations as FormikErrors<
                    TokenAllocation<BigIntValuePair>[] | undefined
                  >
                )?.[index];

                const addressErrorMessage =
                  tokenAllocationError?.address && tokenAllocation.address.length
                    ? tokenAllocationError.address
                    : null;

                const amountErrorMessage =
                  values.erc20Token.tokenSupply.value &&
                  tokenAllocationError?.amount?.value &&
                  tokenAllocation.amount.bigintValue !== 0n
                    ? tokenAllocationError.amount.value
                    : null;

                return (
                  <AzoriusTokenAllocation
                    key={index}
                    index={index}
                    remove={remove}
                    addressErrorMessage={addressErrorMessage}
                    amountErrorMessage={amountErrorMessage}
                    amountInputValue={values.erc20Token.tokenAllocations[index].amount.bigintValue}
                    allocationLength={values.erc20Token.tokenAllocations.length}
                    {...props}
                  />
                );
              })}
            </Grid>
            <Text
              color="neutral-7"
              textStyle="helper-text-base"
            >
              {t('helperAllocations')}
            </Text>
            <CeleryButtonWithIcon
              onClick={() => push({ address: '', amount: { value: '' } })}
              data-testid="tokenVoting-addAllocation"
              icon={Plus}
              text={t('labelAddAllocation')}
            />
            {canReceiveParentAllocations && (
              <Accordion allowToggle>
                <AccordionItem
                  borderTop="none"
                  borderBottom="none"
                  my="1.5rem"
                >
                  {({ isExpanded }) => (
                    <>
                      <AccordionButton
                        p={0}
                        textStyle="display-lg"
                        color="lilac-0"
                      >
                        {isExpanded ? <CaretDown /> : <CaretRight />}
                        {t('advanced', { ns: 'common' })}
                      </AccordionButton>
                      <AccordionPanel p={0}>
                        <LabelComponent
                          label={t('labelParentAllocation')}
                          helper={t('helperParentAllocation')}
                          isRequired={false}
                        >
                          <LabelWrapper
                            errorMessage={
                              (
                                values.erc20Token.parentAllocationAmount?.bigintValue &&
                                (errors.erc20Token?.parentAllocationAmount as any)
                              )?.value
                            }
                          >
                            <BigIntInput
                              data-testid="tokenVoting-parentTokenAllocationInput"
                              value={values.erc20Token.parentAllocationAmount?.bigintValue}
                              onChange={valuePair =>
                                setFieldValue('erc20Token.parentAllocationAmount', valuePair)
                              }
                              isInvalid={false}
                            />
                          </LabelWrapper>
                        </LabelComponent>
                      </AccordionPanel>
                    </>
                  )}
                </AccordionItem>
              </Accordion>
            )}
          </Box>
        )}
      </FieldArray>
    </Box>
  );
}
