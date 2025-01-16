import {
  Accordion,
  AccordionButton,
  AccordionItem,
  Alert,
  Box,
  Divider,
  Flex,
  IconButton,
  Text,
} from '@chakra-ui/react';
import { CaretDown, CaretRight, MinusCircle, Plus, WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Stream } from '../../types/proposalBuilder';
import { scrollToBottom } from '../../utils/ui';
import CeleryButtonWithIcon from '../ui/utils/CeleryButtonWithIcon';
import { ProposalStream } from './ProposalStream';
import { DEFAULT_STREAM } from './constants';

export function ProposalStreams({
  pendingTransaction,
  values: { streams },
  setFieldValue,
}: {
  pendingTransaction: boolean;
  values: { streams: Stream[] };
  setFieldValue: (field: string, value: any) => void;
}) {
  const { t } = useTranslation(['proposal', 'proposalTemplate', 'common']);
  const handleRemoveStream = (streamIndex: number) => {
    setFieldValue(
      'streams',
      streams.filter((_, index) => index !== streamIndex),
    );
  };
  const handleUpdateStream = (streamIndex: number, values: Partial<Stream>) => {
    setFieldValue(
      'streams',
      streams.map((item, index) => (streamIndex === index ? { ...item, ...values } : item)),
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
                      {t('streamTitle', { index: index + 1, type: t(`${stream.type}Stream`) })}
                    </Text>
                  </Flex>
                  {index !== 0 ||
                    (streams.length !== 1 && (
                      <IconButton
                        icon={<MinusCircle />}
                        aria-label="Remove stream"
                        variant="unstyled"
                        onClick={() => handleRemoveStream(index)}
                        minWidth="auto"
                        color="lilac-0"
                        _disabled={{ opacity: 0.4, cursor: 'default' }}
                        sx={{ '&:disabled:hover': { color: 'inherit', opacity: 0.4 } }}
                        isDisabled={pendingTransaction}
                      />
                    ))}
                </AccordionButton>
                <ProposalStream
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
                      {t('streamStartNotice')}
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
            setFieldValue('streams', [...streams, DEFAULT_STREAM]);
            scrollToBottom(100, 'smooth');
          }}
          isDisabled={pendingTransaction}
          icon={Plus}
          text={t('addStream')}
        />
      </Box>
    </Box>
  );
}
