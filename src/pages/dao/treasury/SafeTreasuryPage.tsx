import * as amplitude from '@amplitude/analytics-browser';
import { Box, Divider, Flex, Grid, GridItem, Show } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Assets } from '../../../components/DAOTreasury/components/Assets';
import {
  PaginationButton,
  PaginationCount,
  Transactions,
} from '../../../components/DAOTreasury/components/Transactions';
import { TitledInfoBox } from '../../../components/ui/containers/TitledInfoBox';
import PageHeader from '../../../components/ui/page/Header/PageHeader';
import useSendAssetsActionModal from '../../../hooks/DAO/useSendAssetsActionModal';
import { useCanUserCreateProposal } from '../../../hooks/utils/useCanUserSubmitProposal';
import { analyticsEvents } from '../../../insights/analyticsEvents';
import { useFractal } from '../../../providers/App/AppProvider';
import { useDaoInfoStore } from '../../../store/daoInfo/useDaoInfoStore';

export function SafeTreasuryPage() {
  useEffect(() => {
    amplitude.track(analyticsEvents.TreasuryPageOpened);
  }, []);
  const {
    treasury: { assetsFungible, transfers },
  } = useFractal();
  const { subgraphInfo } = useDaoInfoStore();
  const [shownTransactions, setShownTransactions] = useState(20);
  const { t } = useTranslation(['treasury', 'modals']);
  const { canUserCreateProposal } = useCanUserCreateProposal();

  const hasAnyBalanceOfAnyFungibleTokens =
    assetsFungible.reduce((p, c) => p + BigInt(c.balance), 0n) > 0n;

  const showSendButton = canUserCreateProposal && hasAnyBalanceOfAnyFungibleTokens;

  const totalTransfers = transfers?.length || 0;
  const showLoadMoreTransactions = totalTransfers > shownTransactions && shownTransactions < 100;
  const { openSendAssetsModal } = useSendAssetsActionModal();

  return (
    <Box>
      <PageHeader
        title={t('headerTitle', {
          ns: 'breadcrumbs',
          daoName: subgraphInfo?.daoName,
          subject: t('treasury', { ns: 'breadcrumbs' }),
        })}
        showSafeAddress
        breadcrumbs={[
          {
            terminus: t('treasury', { ns: 'breadcrumbs' }),
            path: '',
          },
        ]}
        buttonProps={
          showSendButton
            ? {
                children: t('buttonSendAssets'),
                onClick: openSendAssetsModal,
              }
            : undefined
        }
      />
      <Grid
        templateAreas={{
          base: `"assets"
          "transactions"`,
          lg: `"transactions assets"`,
        }}
        gap="1rem"
        gridTemplateColumns={{ base: `1fr`, lg: `minmax(1fr, 736px) 1fr` }}
      >
        <GridItem area="transactions">
          <TitledInfoBox
            title={t('titleTransactions')}
            titleTestId="title-transactions"
            bg="neutral-2"
            w="100%"
            subTitle={
              totalTransfers ? (
                <Show below="lg">
                  <Box px="1rem">
                    <PaginationCount shownTransactions={shownTransactions} />
                  </Box>
                </Show>
              ) : null
            }
          >
            <Flex flexDir={{ base: 'column-reverse', lg: 'column' }}>
              <Transactions shownTransactions={shownTransactions} />
              {totalTransfers ? (
                <Show above="lg">
                  <Divider
                    variant="darker"
                    my="1rem"
                  />
                  <Box px={{ base: '1rem', lg: '1.5rem' }}>
                    <PaginationCount shownTransactions={shownTransactions} />
                  </Box>
                </Show>
              ) : null}
            </Flex>
          </TitledInfoBox>
          {showLoadMoreTransactions && (
            <PaginationButton onClick={() => setShownTransactions(prevState => prevState + 20)} />
          )}
        </GridItem>
        <GridItem area="assets">
          <TitledInfoBox
            title={t('titleAssets')}
            titleTestId="title-assets"
            bg={{ base: 'neutral-2', lg: 'none' }}
          >
            <Assets />
          </TitledInfoBox>
        </GridItem>
      </Grid>
    </Box>
  );
}
