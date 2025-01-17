import * as amplitude from '@amplitude/analytics-browser';
import { Box, Button, Flex, Show } from '@chakra-ui/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AddPlus } from '../../../assets/theme/custom/icons/AddPlus';
import ProposalTemplateCard from '../../../components/ProposalTemplates/ProposalTemplateCard';
import NoDataCard from '../../../components/ui/containers/NoDataCard';
import { InfoBoxLoader } from '../../../components/ui/loaders/InfoBoxLoader';
import PageHeader from '../../../components/ui/page/Header/PageHeader';
import { DAO_ROUTES } from '../../../constants/routes';
import { useCanUserCreateProposal } from '../../../hooks/utils/useCanUserSubmitProposal';
import { analyticsEvents } from '../../../insights/analyticsEvents';
import { useFractal } from '../../../providers/App/AppProvider';
import { useNetworkConfigStore } from '../../../providers/NetworkConfig/useNetworkConfigStore';
import { useDaoInfoStore } from '../../../store/daoInfo/useDaoInfoStore';

export function SafeProposalTemplatesPage() {
  useEffect(() => {
    amplitude.track(analyticsEvents.ProposalTemplatesPageOpened);
  }, []);

  const { t } = useTranslation();
  const {
    governance: { proposalTemplates },
  } = useFractal();
  const { safe } = useDaoInfoStore();
  const { canUserCreateProposal } = useCanUserCreateProposal();
  const { addressPrefix } = useNetworkConfigStore();

  const safeAddress = safe?.address;

  return (
    <div>
      <PageHeader
        title={t('proposalTemplates', { ns: 'breadcrumbs' })}
        breadcrumbs={[
          {
            terminus: t('proposalTemplates', { ns: 'breadcrumbs' }),
            path: '',
          },
        ]}
      >
        {canUserCreateProposal && safeAddress && (
          <Link to={DAO_ROUTES.proposalTemplateNew.relative(addressPrefix, safeAddress)}>
            <Button minW={0}>
              <AddPlus />
              <Show above="sm">{t('create')}</Show>
            </Button>
          </Link>
        )}
      </PageHeader>
      <Flex
        flexDirection={proposalTemplates && proposalTemplates.length > 0 ? 'row' : 'column'}
        flexWrap="wrap"
        gap="1rem"
      >
        {!proposalTemplates ? (
          <Box>
            <InfoBoxLoader />
          </Box>
        ) : proposalTemplates.length > 0 ? (
          proposalTemplates.map((proposalTemplate, i) => (
            <ProposalTemplateCard
              key={i}
              proposalTemplate={proposalTemplate}
              templateIndex={i}
            />
          ))
        ) : (
          <NoDataCard
            translationNameSpace="proposalTemplate"
            emptyText="emptyProposalTemplates"
            emptyTextNotProposer="emptyProposalTemplatesNotProposer"
          />
        )}
      </Flex>
    </div>
  );
}
