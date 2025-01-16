import { Box, Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { Formik, FormikProps } from 'formik';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BASE_ROUTES, DAO_ROUTES } from '../../constants/routes';
import { logError } from '../../helpers/errorLogging';
import useSubmitProposal from '../../hooks/DAO/proposal/useSubmitProposal';
import useCreateProposalSchema from '../../hooks/schemas/proposalBuilder/useCreateProposalSchema';
import { useCanUserCreateProposal } from '../../hooks/utils/useCanUserSubmitProposal';
import { useFractal } from '../../providers/App/AppProvider';
import { useNetworkConfigStore } from '../../providers/NetworkConfig/useNetworkConfigStore';
import { useProposalActionsStore } from '../../store/actions/useProposalActionsStore';
import { useDaoInfoStore } from '../../store/daoInfo/useDaoInfoStore';
import { CreateProposalSteps, ProposalExecuteData } from '../../types';
import {
  CreateProposalForm,
  CreateSablierProposalForm,
  ProposalActionType,
  ProposalBuilderMode,
} from '../../types/proposalBuilder';
import { CustomNonceInput } from '../ui/forms/CustomNonceInput';
import { AddActions } from '../ui/modals/AddActions';
import { SendAssetsData } from '../ui/modals/SendAssetsModal';
import PageHeader from '../ui/page/Header/PageHeader';
import { ProposalActionCard } from './ProposalActionCard';
import ProposalDetails from './ProposalDetails';
import ProposalMetadata from './ProposalMetadata';
import { ProposalStreams } from './ProposalStreams';
import ProposalTransactionsForm from './ProposalTransactionsForm';
import StepButtons from './StepButtons';
import { builderInProposalMode } from './constants';

interface ProposalBuilderProps {
  mode: ProposalBuilderMode;
  prepareProposalData: (
    values: CreateProposalForm | CreateSablierProposalForm,
  ) => Promise<ProposalExecuteData | undefined>;
  initialValues: CreateProposalForm;
}

export function ProposalBuilder({
  mode,
  initialValues,
  prepareProposalData,
}: ProposalBuilderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['proposalTemplate', 'proposal']);

  const paths = location.pathname.split('/');
  const step = (paths[paths.length - 1] || paths[paths.length - 2]) as
    | CreateProposalSteps
    | undefined;
  const isProposalMode = builderInProposalMode(mode);
  const isSablierMode = mode === ProposalBuilderMode.SABLIER;

  const {
    governance: { isAzorius },
  } = useFractal();
  const { safe } = useDaoInfoStore();
  const safeAddress = safe?.address;

  const { addressPrefix } = useNetworkConfigStore();
  const { submitProposal, pendingCreateTx } = useSubmitProposal();
  const { canUserCreateProposal } = useCanUserCreateProposal();
  const { createProposalValidation } = useCreateProposalSchema();
  const { addAction, actions, resetActions } = useProposalActionsStore();

  const handleAddSendAssetsAction = (data: SendAssetsData) => {
    addAction({
      actionType: ProposalActionType.TRANSFER,
      content: <></>,
      transactions: [
        {
          targetAddress: data.asset.tokenAddress,
          ethValue: {
            bigintValue: 0n,
            value: '0',
          },
          functionName: 'transfer',
          parameters: [
            { signature: 'address', value: data.destinationAddress },
            { signature: 'uint256', value: data.transferAmount.toString() },
          ],
        },
      ],
    });
  };

  const successCallback = () => {
    if (safeAddress) {
      // Redirecting to home page so that user will see newly created Proposal
      navigate(DAO_ROUTES.dao.relative(addressPrefix, safeAddress));
    }
  };

  useEffect(() => {
    if (safeAddress && (!step || !Object.values(CreateProposalSteps).includes(step))) {
      navigate(DAO_ROUTES.proposalNew.relative(addressPrefix, safeAddress), { replace: true });
    }
  }, [safeAddress, step, navigate, addressPrefix]);

  return (
    <Formik<CreateProposalForm | CreateSablierProposalForm>
      validationSchema={createProposalValidation}
      initialValues={initialValues}
      enableReinitialize
      onSubmit={async values => {
        if (!canUserCreateProposal) {
          toast.error(t('errorNotProposer', { ns: 'common' }));
        }

        try {
          const proposalData = await prepareProposalData(values);
          if (proposalData) {
            submitProposal({
              proposalData,
              nonce: values?.nonce,
              pendingToastMessage: t('proposalCreatePendingToastMessage', { ns: 'proposal' }),
              successToastMessage: t('proposalCreateSuccessToastMessage', { ns: 'proposal' }),
              failedToastMessage: t('proposalCreateFailureToastMessage', { ns: 'proposal' }),
              successCallback,
            });
          }
        } catch (e) {
          logError(e);
          toast.error(t('encodingFailedMessage', { ns: 'proposal' }));
        }
      }}
    >
      {(formikProps: FormikProps<CreateProposalForm | CreateSablierProposalForm>) => {
        const { handleSubmit } = formikProps;

        if (!safeAddress) {
          return;
        }

        return (
          <form onSubmit={handleSubmit}>
            <Box>
              <PageHeader
                title={
                  isProposalMode
                    ? t('createProposal', { ns: 'proposal' })
                    : t('createProposalTemplate', { ns: 'proposalTemplate' })
                }
                breadcrumbs={
                  isProposalMode
                    ? [
                        {
                          terminus: t('proposals', { ns: 'breadcrumbs' }),
                          path: DAO_ROUTES.proposals.relative(addressPrefix, safeAddress),
                        },
                        {
                          terminus: t('proposalNew', { ns: 'breadcrumbs' }),
                          path: '',
                        },
                      ]
                    : [
                        {
                          terminus: t('proposalTemplates', { ns: 'breadcrumbs' }),
                          path: DAO_ROUTES.proposalTemplates.relative(addressPrefix, safeAddress),
                        },
                        {
                          terminus: t('proposalTemplateNew', { ns: 'breadcrumbs' }),
                          path: '',
                        },
                      ]
                }
                ButtonIcon={ArrowLeft}
                buttonProps={{
                  isDisabled: pendingCreateTx,
                  variant: 'secondary',
                  onClick: () => {
                    if (mode === ProposalBuilderMode.PROPOSAL_WITH_ACTIONS && actions.length > 0) {
                      resetActions();
                    }
                    navigate(
                      safeAddress
                        ? isProposalMode
                          ? DAO_ROUTES.proposals.relative(addressPrefix, safeAddress)
                          : DAO_ROUTES.proposalTemplates.relative(addressPrefix, safeAddress)
                        : BASE_ROUTES.landing,
                    );
                  },
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
                              mode={mode}
                              {...formikProps}
                            />
                          }
                        />
                        <Route
                          path={
                            isSablierMode
                              ? CreateProposalSteps.STREAMS
                              : CreateProposalSteps.TRANSACTIONS
                          }
                          element={
                            <>
                              {isSablierMode ? (
                                <ProposalStreams
                                  pendingTransaction={pendingCreateTx}
                                  {...formikProps}
                                  values={formikProps.values as CreateSablierProposalForm}
                                />
                              ) : (
                                <ProposalTransactionsForm
                                  pendingTransaction={pendingCreateTx}
                                  safeNonce={safe?.nextNonce}
                                  mode={mode}
                                  {...formikProps}
                                />
                              )}
                              {!isAzorius && (
                                <Flex
                                  alignItems="center"
                                  justifyContent="space-between"
                                  marginBottom="2rem"
                                  rounded="lg"
                                  p="1.5rem"
                                  bg="neutral-2"
                                >
                                  <CustomNonceInput
                                    nonce={formikProps.values.nonce}
                                    onChange={newNonce =>
                                      formikProps.setFieldValue('nonce', newNonce)
                                    }
                                    align="end"
                                    renderTrimmed={false}
                                  />
                                </Flex>
                              )}
                            </>
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
                    {mode === ProposalBuilderMode.PROPOSAL_WITH_ACTIONS && (
                      <Flex
                        flexDirection="column"
                        gap="1.5rem"
                      >
                        <Flex
                          flexDirection="column"
                          gap="0.5rem"
                        >
                          <Flex
                            mt={6}
                            mb={2}
                            alignItems="center"
                          >
                            <Text ml={2}>{t('actions', { ns: 'actions' })}</Text>
                          </Flex>
                          {actions.map((action, index) => {
                            return (
                              <ProposalActionCard
                                key={index}
                                action={action}
                                index={index}
                                canBeDeleted={actions.length > 1}
                              />
                            );
                          })}
                        </Flex>
                        <Flex>
                          <AddActions addSendAssetsAction={handleAddSendAssetsAction} />
                        </Flex>
                      </Flex>
                    )}
                    <StepButtons
                      {...formikProps}
                      mode={mode}
                      pendingTransaction={pendingCreateTx}
                    />
                  </Flex>
                </GridItem>
                <GridItem
                  area="details"
                  w="100%"
                >
                  <ProposalDetails
                    {...formikProps}
                    mode={mode}
                  />
                </GridItem>
              </Grid>
            </Box>
          </form>
        );
      }}
    </Formik>
  );
}
