import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Box,
  Flex,
  HStack,
  IconButton,
  Radio,
  Text,
  VStack,
} from '@chakra-ui/react';
import { CaretDown, CaretRight, MinusCircle, Plus } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateProposalTransaction, ProposalBuilderMode } from '../../types/proposalBuilder';
import { scrollToBottom } from '../../utils/ui';
import ABISelector, { ABIElement } from '../ui/forms/ABISelector';
import ExampleLabel from '../ui/forms/ExampleLabel';
import { BigIntComponent, InputComponent } from '../ui/forms/InputComponent';
import CeleryButtonWithIcon from '../ui/utils/CeleryButtonWithIcon';
import Divider from '../ui/utils/Divider';
import { builderInProposalMode, DEFAULT_PROPOSAL_TRANSACTION } from './constants';

interface ProposalTransactionProps {
  transaction: CreateProposalTransaction;
  transactionIndex: number;
  transactionPending: boolean;
  txAddressError?: string;
  txFunctionError?: string;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean | undefined) => void;
  mode: ProposalBuilderMode;
}

export default function ProposalTransaction({
  transaction,
  transactionIndex,
  transactionPending,
  txAddressError,
  txFunctionError,
  setFieldValue,
  mode,
}: ProposalTransactionProps) {
  const isProposalMode = builderInProposalMode(mode);
  const { t } = useTranslation(['proposal', 'proposalTemplate', 'common']);
  const [expandedIndecies, setExpandedIndecies] = useState<number[]>([0]);

  const handleABISelectorChange = useCallback(
    (value: ABIElement) => {
      setFieldValue(`transactions.${transactionIndex}.functionName`, value.name);
      setFieldValue(
        `transactions.${transactionIndex}.parameters`,
        value.inputs.map(abiInput => ({
          signature: `${abiInput.type} ${abiInput.name}`,
          label: '',
          value: '',
        })),
      );
    },
    [setFieldValue, transactionIndex],
  );

  return (
    <VStack
      align="left"
      px="1.5rem"
      mt={6}
    >
      {/* TRANSACTION TARGET ADDRESS */}
      <InputComponent
        label={t('labelTargetAddress')}
        helper={t('helperTargetAddress')}
        placeholder="0x0000"
        isRequired
        disabled={transactionPending}
        subLabel={
          <HStack textStyle="labels-large">
            <Text>{t('example', { ns: 'common' })}:</Text>
            <ExampleLabel>yourdomain.eth</ExampleLabel>
            <Text>{t('or', { ns: 'common' })}</Text>
            <ExampleLabel>0x4168592...</ExampleLabel>
          </HStack>
        }
        errorMessage={transaction.targetAddress && txAddressError ? txAddressError : undefined}
        isInvalid={!!transaction.targetAddress && !!txAddressError}
        value={transaction.targetAddress}
        testId="transaction.targetAddress"
        onChange={e =>
          setFieldValue(`transactions.${transactionIndex}.targetAddress`, e.target.value)
        }
      />
      {transaction.targetAddress && (
        <Box mt="1.5rem">
          <ABISelector
            target={transaction.targetAddress}
            onChange={handleABISelectorChange}
          />
        </Box>
      )}

      <Divider my="1.5rem" />

      {/* FUNCTION SPECIFICATION */}
      <Box>
        <Text
          textStyle="heading-small"
          mb="1.5rem"
        >
          {t('functionHeader')}
        </Text>
        <InputComponent
          label={t('labelFunctionName')}
          helper={t('helperFunctionName')}
          placeholder="functionName"
          isRequired={false}
          value={transaction.functionName}
          onChange={e =>
            setFieldValue(`transactions.${transactionIndex}.functionName`, e.target.value)
          }
          disabled={transactionPending}
          subLabel={
            <HStack>
              <Text>{`${t('example', { ns: 'common' })}:`}</Text>
              <ExampleLabel>transfer</ExampleLabel>
            </HStack>
          }
          errorMessage={transaction.functionName && txFunctionError ? txFunctionError : undefined}
          isInvalid={!!transaction.functionName && !!txFunctionError}
          testId="transaction.functionName"
        />
      </Box>

      {/* TRANSACTION PARAMETERS LIST */}
      <Box mt="1.5rem">
        <Accordion
          allowMultiple
          index={expandedIndecies}
        >
          {transaction.parameters.map((parameter, i) => (
            <AccordionItem
              key={i}
              borderTop="none"
              borderBottom="none"
              padding="1rem"
              borderRadius={4}
              bg="neutral-3"
              px={0}
              py="1.5rem"
            >
              {({ isExpanded }) => (
                <>
                  <Box>
                    {/* TRANSACTION PARAMETER HEADER */}
                    <HStack
                      px="1.5rem"
                      justify="space-between"
                    >
                      <AccordionButton
                        onClick={() => {
                          setExpandedIndecies(indexArray => {
                            if (indexArray.includes(i)) {
                              const newTxArr = [...indexArray];
                              newTxArr.splice(newTxArr.indexOf(i), 1);
                              return newTxArr;
                            } else {
                              return [...indexArray, i];
                            }
                          });
                        }}
                        p={0}
                        textStyle="heading-small"
                        color="lilac-0"
                      >
                        <Text textStyle="heading-small">
                          <Flex
                            alignItems="center"
                            gap={2}
                          >
                            {isExpanded ? <CaretDown /> : <CaretRight />}
                            {t('parameter')} {i + 1}
                          </Flex>
                        </Text>
                      </AccordionButton>

                      {/* Remove parameter button */}
                      {i !== 0 || transaction.parameters.length !== 1 ? (
                        <IconButton
                          icon={<MinusCircle />}
                          aria-label={t('removetransactionlabel')}
                          variant="unstyled"
                          onClick={() =>
                            setFieldValue(
                              `transactions.${transactionIndex}.parameters`,
                              transaction.parameters.filter(
                                (_parameterToRemove, parameterToRemoveIndex) =>
                                  parameterToRemoveIndex !== i,
                              ),
                            )
                          }
                          minWidth="auto"
                          color="lilac-0"
                          _disabled={{ opacity: 0.4, cursor: 'default' }}
                          sx={{ '&:disabled:hover': { color: 'inherit', opacity: 0.4 } }}
                          isDisabled={transactionPending}
                        />
                      ) : (
                        <Box h="2.25rem" />
                      )}
                    </HStack>

                    {/* TRANSACTION PARAMETER SECTION */}
                    <AccordionPanel p={0}>
                      <Flex mt="1rem">
                        <Box px="1.5rem">
                          <InputComponent
                            label={t('labelFunctionParameter', { ns: 'proposalTemplate' })}
                            helper={t('helperFunctionParameter', { ns: 'proposalTemplate' })}
                            placeholder="parameterType parameterName"
                            isRequired={!!parameter.value || !!parameter.label}
                            value={parameter.signature}
                            onChange={e =>
                              setFieldValue(
                                `transactions.${transactionIndex}.parameters.${i}.signature`,
                                e.target.value,
                              )
                            }
                            disabled={transactionPending}
                            subLabel={
                              <HStack>
                                <Text>
                                  {t('example', { ns: 'common' })}:{' '}
                                  <ExampleLabel bg="neutral-4">address to</ExampleLabel>{' '}
                                  {t('or', { ns: 'common' })}{' '}
                                  <ExampleLabel bg="neutral-4">uint amount</ExampleLabel>
                                </Text>
                              </HStack>
                            }
                            testId={`transactions.${transactionIndex}.parameters.${i}.signature`}
                          />
                          <Box mt={4}>
                            <Text mb="1.5rem">
                              {t('labelParameterValue', { ns: 'proposalTemplate' })}
                            </Text>
                            {!isProposalMode && (
                              <Box my="1rem">
                                <InputComponent
                                  label={
                                    <Radio
                                      // TODO: Probably we wanna focus proper input
                                      onChange={event => {
                                        event.preventDefault();
                                      }}
                                      isChecked={!!parameter.label}
                                      isDisabled={!parameter.signature || !!parameter.value}
                                      bg="black-0"
                                      color="lilac--3"
                                      size="md"
                                      _disabled={{ bg: 'neutral-6', color: 'neutral-5' }}
                                      _hover={{ bg: 'black-0', color: 'lilac--4' }}
                                      _checked={{
                                        bg: 'black-0',
                                        color: 'lilac--3',
                                        borderWidth: '6px',
                                      }}
                                    >
                                      <Box ml="1rem">
                                        <Text>
                                          {t('labelParameterLabel', {
                                            ns: 'proposalTemplate',
                                          })}
                                        </Text>
                                        <Text color="neutral-7">
                                          {t('labelParameterLabelHelper', {
                                            ns: 'proposalTemplate',
                                          })}
                                        </Text>
                                      </Box>
                                    </Radio>
                                  }
                                  isRequired={!!parameter.signature && !parameter.value}
                                  value={parameter.label || ''}
                                  placeholder={t('parameterLabelPlaceholder', {
                                    ns: 'proposalTemplate',
                                  })}
                                  onChange={e =>
                                    setFieldValue(
                                      `transactions.${transactionIndex}.parameters.${i}.label`,
                                      e.target.value,
                                    )
                                  }
                                  disabled={transactionPending || !!parameter.value}
                                  testId={`transactions.${transactionIndex}.parameters.${i}.label`}
                                  subLabel={
                                    <HStack>
                                      <Text>
                                        {t('helperParameterLabel', { ns: 'proposalTemplate' })}
                                      </Text>
                                    </HStack>
                                  }
                                />
                              </Box>
                            )}
                            <InputComponent
                              label={
                                !isProposalMode ? (
                                  <Radio
                                    // TODO: Probably we wanna focus proper input
                                    onChange={event => {
                                      event.preventDefault();
                                    }}
                                    isChecked={!!parameter.value}
                                    isDisabled={!parameter.signature || !!parameter.label}
                                    bg="black-0"
                                    color="lilac--3"
                                    size="md"
                                    _disabled={{ bg: 'neutral-6', color: 'neutral-5' }}
                                    _hover={{ bg: 'black-0', color: 'lilac--4' }}
                                    _checked={{
                                      bg: 'black-0',
                                      color: 'lilac--3',
                                      borderWidth: '6px',
                                    }}
                                  >
                                    <Box ml="1rem">
                                      <Text>
                                        {t('labelParameterValueWithLabel', {
                                          ns: 'proposalTemplate',
                                        })}
                                      </Text>
                                      <Text color="neutral-7">
                                        {t('labelParameterLabelHelper', {
                                          ns: 'proposalTemplate',
                                        })}
                                      </Text>
                                    </Box>
                                  </Radio>
                                ) : undefined
                              }
                              isRequired={!!parameter.signature && !parameter.label}
                              helper={
                                isProposalMode
                                  ? t('helperFunctionParameterValue', { ns: 'proposalTemplate' })
                                  : undefined
                              }
                              value={parameter.value || ''}
                              placeholder="100"
                              onChange={e =>
                                setFieldValue(
                                  `transactions.${transactionIndex}.parameters.${i}.value`,
                                  e.target.value,
                                )
                              }
                              disabled={transactionPending || !!parameter.label}
                              subLabel={
                                <HStack wordBreak="break-all">
                                  <Text>
                                    {t('example', { ns: 'common' })}:{' '}
                                    <ExampleLabel bg="neutral-4">1.2</ExampleLabel>
                                  </Text>
                                </HStack>
                              }
                              testId={`transactions.${transactionIndex}.parameters.${i}.value`}
                            />
                          </Box>
                          <Divider
                            variant="light"
                            my="1rem"
                          />
                        </Box>
                      </Flex>
                    </AccordionPanel>
                  </Box>

                  {!isExpanded && (
                    <Divider
                      variant="light"
                      mt="0.5rem"
                    />
                  )}

                  {/* ADD PARAMETER BUTTON */}
                  {i === transaction.parameters.length - 1 && (
                    <CeleryButtonWithIcon
                      onClick={() => {
                        setFieldValue(`transactions.${transactionIndex}.parameters`, [
                          ...transaction.parameters,
                          DEFAULT_PROPOSAL_TRANSACTION,
                        ]);
                        setExpandedIndecies([transaction.parameters.length]);
                        scrollToBottom(100, 'smooth');
                      }}
                      icon={Plus}
                      text={t('addParameter')}
                    />
                  )}
                </>
              )}
            </AccordionItem>
          ))}
        </Accordion>

        {/* ETH VALUE */}
        <Box mt={6}>
          <BigIntComponent
            label={t('labelEthValue')}
            helper={t('helperEthValue')}
            isRequired={false}
            disabled={transactionPending}
            subLabel={
              <VStack
                align="start"
                spacing={0}
              >
                <HStack>
                  <Text>{`${t('example', { ns: 'common' })}:`}</Text>
                  <ExampleLabel>1.2</ExampleLabel>
                </HStack>
                {!isProposalMode && (
                  <Text>{t('ethParemeterHelper', { ns: 'proposalTemplate' })}</Text>
                )}
              </VStack>
            }
            errorMessage={undefined}
            value={transaction.ethValue.bigintValue}
            onChange={e => {
              setFieldValue(`transactions.${transactionIndex}.ethValue`, e);
            }}
            decimalPlaces={18}
          />
        </Box>
      </Box>
    </VStack>
  );
}
