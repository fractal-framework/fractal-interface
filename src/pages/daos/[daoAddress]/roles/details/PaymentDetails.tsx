import {
  Flex,
  Text,
  Box,
  Image,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  Grid,
} from '@chakra-ui/react';
import { CaretRight, CaretDown } from '@phosphor-icons/react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SablierPayment } from '../../../../../components/pages/Roles/types';

type AccordionItemRowProps = {
  title: string;
  value?: string;
  children?: ReactNode;
};

function AccordionItemRow({ title, value, children }: AccordionItemRowProps) {
  return (
    <Grid
      gap="0.5rem"
      my="0.5rem"
    >
      <Text
        color="neutral-7"
        textStyle="button-small"
      >
        {title}
      </Text>
      {children ?? <Text textStyle="body-base">{value}</Text>}
    </Grid>
  );
}

export default function PaymentDetails({ payment }: { payment?: SablierPayment }) {
  const { t } = useTranslation('roles');

  if (!payment) {
    return null;
  }

  return (
    <Accordion
      allowToggle
      allowMultiple
    >
      {payment && (
        <AccordionItem
          borderTop="none"
          borderBottom="none"
          padding="1rem"
          bg="neutral-3"
          borderRadius="0.5rem"
          mt="0.5rem"
        >
          {({ isExpanded }) => {
            return (
              <>
                <AccordionButton
                  p={0}
                  textStyle="display-lg"
                  color="lilac-0"
                  gap="0.5rem"
                >
                  {isExpanded ? <CaretDown /> : <CaretRight />}
                  {t('payment')}
                </AccordionButton>
                <AccordionPanel>
                  <AccordionItemRow title={t('amount')}>
                    <Flex
                      gap="0.75rem"
                      alignItems="center"
                    >
                      <Image
                        src={payment.asset.logo}
                        fallbackSrc="/images/coin-icon-default.svg"
                        alt={payment.asset.symbol}
                        w="2rem"
                        h="2rem"
                      />
                      <Box>
                        <Text textStyle="body-base">
                          {payment.amount.value} {payment.asset.symbol}
                        </Text>
                        <Text
                          color="neutral-7"
                          textStyle="button-small"
                        >
                          {payment.amount.value}
                        </Text>
                      </Box>
                    </Flex>
                  </AccordionItemRow>
                  <AccordionItemRow
                    title={t('starting')}
                    value={payment.scheduleFixedDate?.startDate?.toDateString()}
                  />
                  <AccordionItemRow
                    title={t('ending')}
                    value={payment.scheduleFixedDate?.startDate?.toDateString()}
                  />
                </AccordionPanel>
              </>
            );
          }}
        </AccordionItem>
      )}
    </Accordion>
  );
}