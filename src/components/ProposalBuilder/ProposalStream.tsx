import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Box,
  Checkbox,
  Divider,
  Flex,
  HStack,
  IconButton,
  Text,
  VStack,
} from '@chakra-ui/react';
import { CaretDown, CaretRight, MinusCircle, Plus } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { erc20Abi, formatUnits, getContract, isAddress } from 'viem';
import { usePublicClient } from 'wagmi';
import { useDaoInfoStore } from '../../store/daoInfo/useDaoInfoStore';
import { BigIntValuePair } from '../../types';
import { scrollToBottom } from '../../utils/ui';
import { BigIntInput } from '../ui/forms/BigIntInput';
import ExampleLabel from '../ui/forms/ExampleLabel';
import { InputComponent, LabelComponent } from '../ui/forms/InputComponent';
import CeleryButtonWithIcon from '../ui/utils/CeleryButtonWithIcon';

export type Tranche = {
  amount: BigIntValuePair;
  duration: BigIntValuePair;
};

export type Stream = {
  type: 'tranched';
  tokenAddress: string;
  recipientAddress: string;
  startDate: Date;
  tranches: Tranche[];
  totalAmount: BigIntValuePair;
  cancelable: boolean;
  transferable: boolean;
};

const SECONDS_IN_DAY = 60 * 60 * 24;

export const DEFAULT_TRANCHE: Tranche = {
  amount: {
    value: '0',
    bigintValue: 0n,
  },
  duration: {
    value: (SECONDS_IN_DAY * 14).toString(),
    bigintValue: BigInt(SECONDS_IN_DAY * 14),
  },
};

export function ProposalStream({
  stream,
  handleUpdateStream,
  index,
  pendingTransaction,
}: {
  stream: Stream;
  handleUpdateStream: (streamIndex: number, values: Partial<Stream>) => void;
  index: number;
  pendingTransaction: boolean;
}) {
  const publicClient = usePublicClient();
  const [tokenDecimals, setTokenDecimals] = useState(0);
  const [rawTokenBalance, setRawTokenBalnace] = useState(0n);
  const [tokenBalanceFormatted, setTokenBalanceFormatted] = useState('');
  const [expandedIndecies, setExpandedIndecies] = useState<number[]>([0]);
  const { safe } = useDaoInfoStore();
  const { t } = useTranslation(['common']);

  const safeAddress = safe?.address;

  useEffect(() => {
    const fetchFormattedTokenBalance = async () => {
      if (publicClient && safeAddress && stream.tokenAddress && isAddress(stream.tokenAddress)) {
        const tokenContract = getContract({
          abi: erc20Abi,
          client: publicClient,
          address: stream.tokenAddress,
        });
        const [tokenBalance, decimals, symbol, name] = await Promise.all([
          tokenContract.read.balanceOf([safeAddress]),
          tokenContract.read.decimals(),
          tokenContract.read.symbol(),
          tokenContract.read.name(),
        ]);
        setTokenDecimals(decimals);
        setRawTokenBalnace(tokenBalance);
        if (tokenBalance > 0n) {
          const balanceFormatted = formatUnits(tokenBalance, decimals);
          setTokenBalanceFormatted(`${balanceFormatted} ${symbol} (${name})`);
        }
      }
    };

    fetchFormattedTokenBalance();
  }, [safeAddress, publicClient, stream.tokenAddress]);
  return (
    <AccordionPanel p={0}>
      <VStack
        align="left"
        px="1.5rem"
        mt={6}
      >
        <InputComponent
          label="Streamed Token Address"
          helper={`Treasury balance: ${tokenBalanceFormatted}`}
          placeholder="0x0000"
          isRequired
          disabled={pendingTransaction}
          subLabel={
            <HStack textStyle="labels-large">
              <Text>{t('example', { ns: 'common' })}:</Text>
              <ExampleLabel>0x4168592...</ExampleLabel>
            </HStack>
          }
          isInvalid={!!stream.tokenAddress && !isAddress(stream.tokenAddress)}
          value={stream.tokenAddress}
          testId="stream.tokenAddress"
          onChange={e => handleUpdateStream(index, { tokenAddress: e.target.value })}
        />
        <Divider
          variant="light"
          my="1rem"
        />
        <InputComponent
          label="Recipient Address"
          helper="Who will be recipient of this stream - only owner of this address will be able to receive tokens."
          placeholder="0x0000"
          isRequired
          disabled={pendingTransaction}
          subLabel={
            <HStack textStyle="labels-large">
              <Text>{t('example', { ns: 'common' })}:</Text>
              <ExampleLabel>0x4168592...</ExampleLabel>
            </HStack>
          }
          isInvalid={!!stream.recipientAddress && !isAddress(stream.recipientAddress)}
          value={stream.recipientAddress}
          testId="stream.recipientAddress"
          onChange={e => handleUpdateStream(index, { recipientAddress: e.target.value })}
        />
        <Divider
          variant="light"
          my="1rem"
        />
        <LabelComponent
          label="Stream Total Amount"
          helper="The total amount of token to stream. Has to be equal to the sum of tranches amount"
          subLabel={
            <HStack textStyle="labels-large">
              <Text>{t('example', { ns: 'common' })}:</Text>
              <ExampleLabel>10000</ExampleLabel>
            </HStack>
          }
          isRequired
        >
          <BigIntInput
            value={stream.totalAmount.bigintValue}
            onChange={value => handleUpdateStream(index, { totalAmount: value })}
            decimalPlaces={tokenDecimals}
            maxValue={rawTokenBalance}
          />
        </LabelComponent>
        <Divider
          variant="light"
          my="1rem"
        />
        <Box>
          <Flex gap="0.5rem">
            <Checkbox
              sx={{
                '& .chakra-checkbox__control': {
                  borderRadius: '0.25rem',
                },
              }}
              isChecked={stream.cancelable}
              onChange={() => handleUpdateStream(index, { cancelable: !stream.cancelable })}
            />
            <Text>Cancelable</Text>
          </Flex>
          <Text color="neutral-7">Can this stream be cancelled by DAO in the future?</Text>
        </Box>
        <Box>
          <Flex gap="0.5rem">
            <Checkbox
              sx={{
                '& .chakra-checkbox__control': {
                  borderRadius: '0.25rem',
                },
              }}
              checked={stream.transferable}
              onChange={() => handleUpdateStream(index, { transferable: !stream.transferable })}
            />
            <Text>Transferable</Text>
          </Flex>
          <Text color="neutral-7">
            Can this stream be transferred by the recipient to another recipient?
          </Text>
        </Box>
        <Divider
          variant="light"
          my="1rem"
        />
        <Box mt="1.5rem">
          <Accordion
            allowMultiple
            index={expandedIndecies}
          >
            {stream.tranches.map((tranche, trancheIndex) => (
              <AccordionItem
                key={trancheIndex}
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
                      {/* STREAM TRANCHE HEADER */}
                      <HStack
                        px="1.5rem"
                        justify="space-between"
                      >
                        <AccordionButton
                          onClick={() => {
                            setExpandedIndecies(indexArray => {
                              if (indexArray.includes(trancheIndex)) {
                                const newTxArr = [...indexArray];
                                newTxArr.splice(newTxArr.indexOf(trancheIndex), 1);
                                return newTxArr;
                              } else {
                                return [...indexArray, trancheIndex];
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
                              Tranche {trancheIndex + 1}
                            </Flex>
                          </Text>
                        </AccordionButton>

                        {/* Remove tranche button */}
                        {trancheIndex !== 0 || stream.tranches.length !== 1 ? (
                          <IconButton
                            icon={<MinusCircle />}
                            aria-label="Remove tranche"
                            variant="unstyled"
                            onClick={() =>
                              handleUpdateStream(index, {
                                tranches: stream.tranches.filter(
                                  (_, removedTrancheIndex) => removedTrancheIndex !== trancheIndex,
                                ),
                              })
                            }
                            minWidth="auto"
                            color="lilac-0"
                            _disabled={{ opacity: 0.4, cursor: 'default' }}
                            sx={{ '&:disabled:hover': { color: 'inherit', opacity: 0.4 } }}
                            isDisabled={pendingTransaction}
                          />
                        ) : (
                          <Box h="2.25rem" />
                        )}
                      </HStack>

                      {/* STREAM TRANCHE SECTION */}
                      <AccordionPanel p={0}>
                        <Flex mt="1rem">
                          <Box
                            px="1.5rem"
                            w="100%"
                          >
                            <Box mt={4}>
                              <LabelComponent
                                isRequired
                                label="Tranche amount"
                                subLabel={
                                  <HStack wordBreak="break-all">
                                    <Text>
                                      {t('example', { ns: 'common' })}:{' '}
                                      <ExampleLabel bg="neutral-4">1000</ExampleLabel>
                                    </Text>
                                  </HStack>
                                }
                              >
                                <BigIntInput
                                  isRequired
                                  value={tranche.amount.bigintValue}
                                  decimalPlaces={tokenDecimals}
                                  placeholder="1000"
                                  onChange={value =>
                                    handleUpdateStream(index, {
                                      tranches: stream.tranches.map((item, updatedTrancheIndex) =>
                                        updatedTrancheIndex === trancheIndex
                                          ? { ...item, amount: value }
                                          : item,
                                      ),
                                    })
                                  }
                                />
                              </LabelComponent>
                            </Box>
                            <Box mt={4}>
                              <LabelComponent
                                isRequired
                                label="Tranche duration"
                                subLabel={
                                  <VStack wordBreak="break-all">
                                    <Text>
                                      Duration in seconds
                                      {index === 0 && '. At least 1 second for the first trance.'}
                                    </Text>
                                    <Text>
                                      {t('example', { ns: 'common' })}:{' '}
                                      <ExampleLabel bg="neutral-4">
                                        {SECONDS_IN_DAY * 30} (1 month)
                                      </ExampleLabel>
                                    </Text>
                                  </VStack>
                                }
                              >
                                <BigIntInput
                                  isRequired
                                  value={tranche.duration.bigintValue}
                                  placeholder={(SECONDS_IN_DAY * 365).toString()}
                                  decimalPlaces={0}
                                  min={index === 0 ? '1' : undefined}
                                  step={1}
                                  onChange={value =>
                                    handleUpdateStream(index, {
                                      tranches: stream.tranches.map((item, updatedTrancheIndex) =>
                                        updatedTrancheIndex === trancheIndex
                                          ? { ...item, duration: value }
                                          : item,
                                      ),
                                    })
                                  }
                                />
                              </LabelComponent>
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

                    {/* ADD TRANCHE BUTTON */}
                    {trancheIndex === stream.tranches.length - 1 && (
                      <CeleryButtonWithIcon
                        onClick={() => {
                          handleUpdateStream(index, {
                            tranches: [...stream.tranches, DEFAULT_TRANCHE],
                          });
                          setExpandedIndecies([stream.tranches.length]);
                          scrollToBottom(100, 'smooth');
                        }}
                        icon={Plus}
                        text="Add tranche"
                      />
                    )}
                  </>
                )}
              </AccordionItem>
            ))}
          </Accordion>
        </Box>
      </VStack>
    </AccordionPanel>
  );
}
