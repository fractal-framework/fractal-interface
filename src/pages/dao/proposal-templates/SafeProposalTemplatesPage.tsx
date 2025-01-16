import * as amplitude from '@amplitude/analytics-browser';
import { Box, Button, Flex, Show, Text } from '@chakra-ui/react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { AddPlus } from '../../../assets/theme/custom/icons/AddPlus';
import ExampleTemplateCard from '../../../components/ProposalTemplates/ExampleTemplateCard';
import ProposalTemplateCard from '../../../components/ProposalTemplates/ProposalTemplateCard';
import NoDataCard from '../../../components/ui/containers/NoDataCard';
import { InfoBoxLoader } from '../../../components/ui/loaders/InfoBoxLoader';
import { AirdropData } from '../../../components/ui/modals/AirdropModal';
import { ModalType } from '../../../components/ui/modals/ModalProvider';
import { useDecentModal } from '../../../components/ui/modals/useDecentModal';
import PageHeader from '../../../components/ui/page/Header/PageHeader';
import Divider from '../../../components/ui/utils/Divider';
import { DAO_ROUTES } from '../../../constants/routes';
import useSendAssetsActionModal from '../../../hooks/DAO/useSendAssetsActionModal';
import { useCanUserCreateProposal } from '../../../hooks/utils/useCanUserSubmitProposal';
import { analyticsEvents } from '../../../insights/analyticsEvents';
import { useFractal } from '../../../providers/App/AppProvider';
import { useNetworkConfigStore } from '../../../providers/NetworkConfig/useNetworkConfigStore';
import { useProposalActionsStore } from '../../../store/actions/useProposalActionsStore';
import { useDaoInfoStore } from '../../../store/daoInfo/useDaoInfoStore';
import { ProposalActionType } from '../../../types/proposalBuilder';

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
  const {
    addressPrefix,
    contracts: { disperse },
  } = useNetworkConfigStore();
  const navigate = useNavigate();
  const { addAction } = useProposalActionsStore();

  const safeAddress = safe?.address;
  const { openSendAssetsModal } = useSendAssetsActionModal();

  const handleAirdropSubmit = (data: AirdropData) => {
    if (!safeAddress) return;

    const totalAmount = data.recipients.reduce((acc, recipient) => acc + recipient.amount, 0n);
    addAction({
      actionType: ProposalActionType.AIRDROP,
      content: <></>,
      transactions: [
        {
          targetAddress: data.asset.tokenAddress,
          ethValue: {
            bigintValue: 0n,
            value: '0',
          },
          functionName: 'approve',
          parameters: [
            { signature: 'address', value: disperse },
            { signature: 'uint256', value: totalAmount.toString() },
          ],
        },
        {
          targetAddress: data.asset.tokenAddress,
          ethValue: {
            bigintValue: 0n,
            value: '0',
          },
          functionName: 'disperseToken',
          parameters: [
            { signature: 'address', value: data.asset.tokenAddress },
            {
              signature: 'address[]',
              value: `[${data.recipients.map(recipient => recipient.address).join(',')}]`,
            },
            {
              signature: 'uint256[]',
              value: `[${data.recipients.map(recipient => recipient.amount.toString()).join(',')}]`,
            },
          ],
        },
      ],
    });

    navigate(DAO_ROUTES.proposalWithActionsNew.relative(addressPrefix, safeAddress));
  };

  const openAirdropModal = useDecentModal(ModalType.AIRDROP, {
    onSubmit: handleAirdropSubmit,
    submitButtonText: t('submitProposal', { ns: 'modals' }),
    showNonceInput: false,
  });

  const EXAMPLE_TEMPLATES = useMemo(() => {
    if (!safeAddress) return [];
    return [
      {
        title: t('templateAirdropTitle', { ns: 'proposalTemplate' }),
        description: t('templateAirdropDescription', { ns: 'proposalTemplate' }),
        onProposalTemplateClick: openAirdropModal,
      },
      {
        title: t('templateSablierTitle', { ns: 'proposalTemplate' }),
        description: t('templateSablierDescription', { ns: 'proposalTemplate' }),
        onProposalTemplateClick: () =>
          navigate(DAO_ROUTES.proposalSablierNew.relative(addressPrefix, safeAddress)),
      },
      {
        title: t('templateTransferTitle', { ns: 'proposalTemplate' }),
        description: t('templateTransferDescription', { ns: 'proposalTemplate' }),
        onProposalTemplateClick: openSendAssetsModal,
      },
    ];
  }, [t, openSendAssetsModal, navigate, safeAddress, addressPrefix, openAirdropModal]);

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
      <Divider
        variant="light"
        my="2rem"
      />
      <Text
        textStyle="heading-large"
        color="white-0"
        mb="1rem"
      >
        {t('defaultTemplates', { ns: 'proposalTemplate' })}
      </Text>
      <Flex
        flexDirection="row"
        flexWrap="wrap"
        gap="1rem"
      >
        {EXAMPLE_TEMPLATES.map((exampleTemplate, i) => (
          <ExampleTemplateCard
            key={i}
            title={exampleTemplate.title}
            description={exampleTemplate.description}
            onProposalTemplateClick={exampleTemplate.onProposalTemplateClick}
          />
        ))}
      </Flex>
    </div>
  );
}
