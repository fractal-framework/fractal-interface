import * as amplitude from '@amplitude/analytics-browser';
import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Alert,
  Box,
  Button,
  Center,
  Checkbox,
  Divider,
  Flex,
  Grid,
  GridItem,
  HStack,
  Icon,
  IconButton,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  MinusCircle,
  Plus,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react';
import groupBy from 'lodash.groupby';
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Address,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  getAddress,
  getContract,
  Hash,
  isAddress,
  zeroAddress,
} from 'viem';
import SablierV2BatchAbi from '../../../../../assets/abi/SablierV2Batch';
import { BigIntInput } from '../../../../../components/ui/forms/BigIntInput';
import ExampleLabel from '../../../../../components/ui/forms/ExampleLabel';
import {
  InputComponent,
  LabelComponent,
  TextareaComponent,
} from '../../../../../components/ui/forms/InputComponent';
import { BarLoader } from '../../../../../components/ui/loaders/BarLoader';
import PageHeader from '../../../../../components/ui/page/Header/PageHeader';
import Markdown from '../../../../../components/ui/proposal/Markdown';
import CeleryButtonWithIcon from '../../../../../components/ui/utils/CeleryButtonWithIcon';
import { useHeaderHeight } from '../../../../../constants/common';
import { BASE_ROUTES, DAO_ROUTES } from '../../../../../constants/routes';
import useSubmitProposal from '../../../../../hooks/DAO/proposal/useSubmitProposal';
import useNetworkPublicClient from '../../../../../hooks/useNetworkPublicClient';
import { useCanUserCreateProposal } from '../../../../../hooks/utils/useCanUserSubmitProposal';
import { analyticsEvents } from '../../../../../insights/analyticsEvents';
import { useFractal } from '../../../../../providers/App/AppProvider';
import { useNetworkConfigStore } from '../../../../../providers/NetworkConfig/useNetworkConfigStore';
import { useDaoInfoStore } from '../../../../../store/daoInfo/useDaoInfoStore';
import { BigIntValuePair, CreateProposalSteps } from '../../../../../types';
import { scrollToBottom } from '../../../../../utils/ui';

const SECONDS_IN_DAY = 60 * 60 * 24;

function StepButtons({
  values: { proposalMetadata },
  pendingTransaction,
  isSubmitDisabled,
}: {
  values: { proposalMetadata: { title: string; description?: string } };
  pendingTransaction: boolean;
  isSubmitDisabled: boolean;
}) {
  const { safe } = useDaoInfoStore();
  const { canUserCreateProposal } = useCanUserCreateProposal();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['common', 'proposal']);

  if (!safe?.address) {
    return null;
  }

  // @dev these prevStepUrl and nextStepUrl calculation is done this way to universally build URL for the next/prev steps both for proposal builder and proposal template builder
  const prevStepUrl = `${location.pathname.replace(`${CreateProposalSteps.TRANSACTIONS}`, `${CreateProposalSteps.METADATA}`)}${location.search}`;
  const nextStepUrl = `${location.pathname.replace(`${CreateProposalSteps.METADATA}`, `${CreateProposalSteps.TRANSACTIONS}`)}${location.search}`;

  return (
    <Flex
      mt="1.5rem"
      gap="0.75rem"
      alignItems="center"
      justifyContent="flex-end"
      width="100%"
    >
      <Routes>
        <Route
          path={CreateProposalSteps.METADATA}
          element={
            <Button
              onClick={() => navigate(nextStepUrl)}
              isDisabled={!proposalMetadata.title}
              px="2rem"
            >
              {t('next', { ns: 'common' })}
              <CaretRight />
            </Button>
          }
        />
        <Route
          path={CreateProposalSteps.TRANSACTIONS}
          element={
            <>
              <Button
                px="2rem"
                variant="text"
                color="lilac-0"
                onClick={() => navigate(prevStepUrl)}
              >
                <Icon
                  bg="transparent"
                  aria-label="Back"
                  as={CaretLeft}
                  color="lilac-0"
                />
                {t('back', { ns: 'common' })}
              </Button>
              <Button
                px="2rem"
                type="submit"
                isDisabled={!canUserCreateProposal || pendingTransaction || isSubmitDisabled}
              >
                {t('createProposal', { ns: 'proposal' })}
              </Button>
            </>
          }
        />
      </Routes>
    </Flex>
  );
}

function ProposalDetails({
  values: { proposalMetadata },
}: {
  values: { proposalMetadata: { title: string; description: string } };
}) {
  const { t } = useTranslation(['proposalTemplate', 'proposal']);
  const trimmedTitle = proposalMetadata.title?.trim();
  const [descriptionCollapsed, setDescriptionCollapsed] = useState(true);

  return (
    <Box
      rounded="lg"
      border="1px solid"
      borderColor="neutral-3"
      p={6}
      maxWidth="400px"
    >
      <VStack
        spacing={3}
        align="left"
      >
        <Text textStyle="heading-small">{t('preview')}</Text>
        <Divider />
        <HStack justifyContent="space-between">
          <Text color="neutral-7">{t('previewTitle')}</Text>
          <Text
            textAlign="right"
            width="66%"
          >
            {trimmedTitle}
          </Text>
        </HStack>
        <HStack justifyContent="space-between">
          <Text color="neutral-7">{t('proposalTemplateDescription')}</Text>
          {proposalMetadata.description && (
            <CeleryButtonWithIcon
              onClick={() => setDescriptionCollapsed(prevState => !prevState)}
              text={t(descriptionCollapsed ? 'show' : 'hide', { ns: 'common' })}
            />
          )}
        </HStack>
        {!descriptionCollapsed && (
          <Markdown
            content={proposalMetadata.description}
            collapsedLines={100}
          />
        )}
        <Divider />
      </VStack>
    </Box>
  );
}

function ProposalMetadata({
  values: { proposalMetadata },
  setTitle,
  setDescription,
}: {
  values: { proposalMetadata: { title: string; description: string } };
  setTitle: Dispatch<SetStateAction<string>>;
  setDescription: Dispatch<SetStateAction<string>>;
}) {
  const { t } = useTranslation(['proposalTemplate', 'proposal', 'common']);

  return (
    <VStack
      align="left"
      spacing={8}
      p="1.5rem"
    >
      <InputComponent
        label={t('proposalTitle', { ns: 'proposal' })}
        helper={t('proposalTitleHelper', { ns: 'proposal' })}
        placeholder={t('proposalTitlePlaceholder', { ns: 'proposal' })}
        isRequired
        value={proposalMetadata.title}
        onChange={e => setTitle(e.target.value)}
        testId="metadata.title"
        maxLength={50}
      />
      <TextareaComponent
        label={t('proposalDescription', { ns: 'proposal' })}
        subLabel={t('')}
        helper={t('proposalDescriptionHelper', { ns: 'proposal' })}
        placeholder={t('proposalDescriptionPlaceholder', { ns: 'proposal' })}
        isRequired={false}
        value={proposalMetadata.description}
        onChange={e => setDescription(e.target.value)}
        rows={12}
      />
    </VStack>
  );
}

type Tranche = {
  amount: BigIntValuePair;
  duration: BigIntValuePair;
};

const DEFAULT_TRANCHE: Tranche = {
  amount: {
    value: '0',
    bigintValue: 0n,
  },
  duration: {
    value: (SECONDS_IN_DAY * 14).toString(),
    bigintValue: BigInt(SECONDS_IN_DAY * 14),
  },
};
const DEFAULT_STREAM: Stream = {
  type: 'tranched',
  tokenAddress: '',
  recipientAddress: '',
  startDate: new Date(),
  tranches: [DEFAULT_TRANCHE],
  totalAmount: {
    value: '0',
    bigintValue: 0n,
  },
  cancelable: true,
  transferable: false,
};

type Stream = {
  type: 'tranched';
  tokenAddress: string;
  recipientAddress: string;
  startDate: Date;
  tranches: Tranche[];
  totalAmount: BigIntValuePair;
  cancelable: boolean;
  transferable: boolean;
};

function StreamBuilder({
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
  const publicClient = useNetworkPublicClient();
  const [tokenDecimals, setTokenDecimals] = useState(0);
  const [rawTokenBalance, setRawTokenBalnace] = useState(0n);
  const [tokenBalanceFormatted, setTokenBalanceFormatted] = useState('');
  const [expandedIndecies, setExpandedIndecies] = useState<number[]>([0]);
  const { safe } = useDaoInfoStore();
  const { t } = useTranslation(['common']);

  const safeAddress = safe?.address;

  useEffect(() => {
    const fetchFormattedTokenBalance = async () => {
      if (safeAddress && stream.tokenAddress && isAddress(stream.tokenAddress)) {
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

function StreamsBuilder({
  streams,
  setStreams,
  pendingTransaction,
}: {
  streams: Stream[];
  setStreams: Dispatch<SetStateAction<Stream[]>>;
  pendingTransaction: boolean;
}) {
  const handleUpdateStream = (streamIndex: number, values: Partial<Stream>) => {
    setStreams(prevState =>
      prevState.map((item, index) => (streamIndex === index ? { ...item, ...values } : item)),
    );
  };
  return (
    <Box>
      <Accordion
        allowMultiple
        defaultIndex={[0]}
      >
        {streams.map((stream, index) => (
          <AccordionItem
            key={index}
            borderTop="none"
            borderBottom="none"
            my="1.5rem"
          >
            {({ isExpanded }) => (
              <Box borderRadius={4}>
                <AccordionButton
                  py="0.25rem"
                  px="1.5rem"
                  textStyle="heading-small"
                  color="lilac-0"
                  justifyContent="space-between"
                >
                  <Flex
                    alignItems="center"
                    gap={2}
                  >
                    {isExpanded ? <CaretDown /> : <CaretRight />}
                    <Text
                      textStyle="heading-small"
                      textTransform="capitalize"
                    >
                      Stream {index + 1} ({stream.type})
                    </Text>
                  </Flex>
                  {index !== 0 ||
                    (streams.length !== 1 && (
                      <IconButton
                        icon={<MinusCircle />}
                        aria-label="Remove stream"
                        variant="unstyled"
                        onClick={() =>
                          setStreams(prevState =>
                            prevState.filter((_, filteredIndex) => filteredIndex !== index),
                          )
                        }
                        minWidth="auto"
                        color="lilac-0"
                        _disabled={{ opacity: 0.4, cursor: 'default' }}
                        sx={{ '&:disabled:hover': { color: 'inherit', opacity: 0.4 } }}
                        isDisabled={pendingTransaction}
                      />
                    ))}
                </AccordionButton>
                <StreamBuilder
                  stream={stream}
                  handleUpdateStream={handleUpdateStream}
                  index={index}
                  pendingTransaction={pendingTransaction}
                />
                <Box
                  mt="1.5rem"
                  px="1.5rem"
                >
                  <Alert status="info">
                    <Box
                      width="1.5rem"
                      height="1.5rem"
                    >
                      <WarningCircle size="24" />
                    </Box>
                    <Text
                      whiteSpace="pre-wrap"
                      ml="1rem"
                    >
                      Stream will be started in the moment of proposal execution. In order to
                      {` "emulate"`} delay of stream start - first tranche should have amount set to
                      0 with desired {`"delay"`} duration.
                    </Text>
                  </Alert>
                </Box>
              </Box>
            )}
          </AccordionItem>
        ))}
      </Accordion>
      <Divider my="1.5rem" />
      <Box p="1.5rem">
        <CeleryButtonWithIcon
          onClick={() => {
            setStreams(prevState => [...prevState, DEFAULT_STREAM]);
            scrollToBottom(100, 'smooth');
          }}
          isDisabled={pendingTransaction}
          icon={Plus}
          text="Add stream"
        />
      </Box>
    </Box>
  );
}

export function SafeSablierProposalCreatePage() {
  useEffect(() => {
    amplitude.track(analyticsEvents.SablierProposalCreatePageOpened);
  }, []);

  const {
    governance: { type },
  } = useFractal();
  const { safe } = useDaoInfoStore();
  const { submitProposal, pendingCreateTx } = useSubmitProposal();
  const { canUserCreateProposal } = useCanUserCreateProposal();
  const {
    addressPrefix,
    contracts: { sablierV2Batch, sablierV2LockupTranched },
  } = useNetworkConfigStore();
  const navigate = useNavigate();
  const { t } = useTranslation(['proposalTemplate', 'proposal']);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [streams, setStreams] = useState<Stream[]>([DEFAULT_STREAM]);
  const HEADER_HEIGHT = useHeaderHeight();

  const safeAddress = safe?.address;
  const successCallback = () => {
    if (safeAddress) {
      // Redirecting to proposals page so that user will see Proposal for Proposal Template creation
      navigate(DAO_ROUTES.proposals.relative(addressPrefix, safeAddress));
    }
  };

  const values = useMemo(
    () => ({ proposalMetadata: { title, description } }),
    [title, description],
  );

  const prepareProposalData = useCallback(async () => {
    if (!safeAddress) {
      throw new Error('Can not create stream without DAO address set');
    }
    const targets: Address[] = [];
    const txValues: bigint[] = [];
    const calldatas: Hash[] = [];

    const groupedStreams = groupBy(streams, 'tokenAddress');

    Object.keys(groupedStreams).forEach(token => {
      const tokenAddress = getAddress(token);
      const tokenStreams = groupedStreams[token];
      const approvedTotal = tokenStreams.reduce(
        (prev, curr) => prev + (curr.totalAmount.bigintValue || 0n),
        0n,
      );
      const approveCalldata = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [sablierV2Batch, approvedTotal],
      });

      targets.push(tokenAddress);
      txValues.push(0n);
      calldatas.push(approveCalldata);

      const createStreamsCalldata = encodeFunctionData({
        abi: SablierV2BatchAbi,
        functionName: 'createWithDurationsLT',
        args: [
          sablierV2LockupTranched,
          tokenAddress,
          tokenStreams.map(stream => ({
            sender: safeAddress,
            recipient: getAddress(stream.recipientAddress),
            totalAmount: stream.totalAmount.bigintValue!,
            broker: {
              account: zeroAddress,
              fee: 0n,
            },
            cancelable: stream.cancelable,
            transferable: stream.transferable,
            tranches: stream.tranches.map(tranche => ({
              amount: tranche.amount.bigintValue!,
              duration: Number(tranche.duration.bigintValue!),
            })),
          })),
        ],
      });

      targets.push(sablierV2Batch);
      txValues.push(0n);
      calldatas.push(createStreamsCalldata);
    });

    return {
      targets,
      values: txValues,
      calldatas,
      metaData: values.proposalMetadata,
    };
  }, [values, streams, sablierV2Batch, sablierV2LockupTranched, safeAddress]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canUserCreateProposal) {
      toast.error(t('errorNotProposer', { ns: 'common' }));
    }

    try {
      const proposalData = await prepareProposalData();
      if (proposalData) {
        submitProposal({
          proposalData,
          nonce: safe?.nextNonce,
          pendingToastMessage: t('proposalCreatePendingToastMessage', { ns: 'proposal' }),
          successToastMessage: t('proposalCreateSuccessToastMessage', { ns: 'proposal' }),
          failedToastMessage: t('proposalCreateFailureToastMessage', { ns: 'proposal' }),
          successCallback,
        });
      }
    } catch (e) {
      console.error(e);
      toast.error(t('encodingFailedMessage', { ns: 'proposal' }));
    }
  };

  const invalidStreams = useMemo(
    () =>
      streams.filter(stream => {
        if (!stream.recipientAddress || !stream.tokenAddress || !stream.totalAmount) {
          return true;
        }
        const invalidTranches = stream.tranches.filter((tranche, index) => {
          if (
            index === 0 &&
            (!tranche.duration.bigintValue || !(tranche.duration.bigintValue > 0n))
          ) {
            return true;
          }
        });
        if (invalidTranches.length > 0) {
          return true;
        }
        return false;
      }),
    [streams],
  );

  if (!type || !safeAddress || !safe) {
    return (
      <Center minH={`calc(100vh - ${HEADER_HEIGHT})`}>
        <BarLoader />
      </Center>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Box>
        <PageHeader
          title={t('createProposal', { ns: 'proposal' })}
          breadcrumbs={[
            {
              terminus: t('proposals', { ns: 'breadcrumbs' }),
              path: DAO_ROUTES.proposals.relative(addressPrefix, safeAddress),
            },
            {
              terminus: t('proposalNew', { ns: 'breadcrumbs' }),
              path: '',
            },
          ]}
          ButtonIcon={Trash}
          buttonProps={{
            variant: 'secondary',
            onClick: () =>
              navigate(
                safeAddress
                  ? DAO_ROUTES.proposals.relative(addressPrefix, safeAddress)
                  : BASE_ROUTES.landing,
              ),
            isDisabled: pendingCreateTx,
          }}
        />
        <Grid
          gap={4}
          marginTop="3rem"
          templateColumns={{ base: '1fr', lg: '2fr 1fr' }}
          templateAreas={{
            base: '"content" "details"',
            lg: '"content details"',
          }}
        >
          <GridItem area="content">
            <Flex
              flexDirection="column"
              align="left"
            >
              <Box
                marginBottom="2rem"
                rounded="lg"
                bg="neutral-2"
              >
                <Routes>
                  <Route
                    path={CreateProposalSteps.METADATA}
                    element={
                      <ProposalMetadata
                        values={values}
                        setTitle={setTitle}
                        setDescription={setDescription}
                      />
                    }
                  />
                  <Route
                    path={CreateProposalSteps.TRANSACTIONS}
                    element={
                      <StreamsBuilder
                        streams={streams}
                        setStreams={setStreams}
                        pendingTransaction={pendingCreateTx}
                      />
                    }
                  />
                  <Route
                    path="*"
                    element={
                      <Navigate
                        to={`${CreateProposalSteps.METADATA}${location.search}`}
                        replace
                      />
                    }
                  />
                </Routes>
              </Box>
              <StepButtons
                pendingTransaction={pendingCreateTx}
                values={values}
                isSubmitDisabled={invalidStreams.length > 0}
              />
            </Flex>
          </GridItem>
          <GridItem
            area="details"
            w="100%"
          >
            <ProposalDetails values={values} />
          </GridItem>
        </Grid>
      </Box>
    </form>
  );
}
