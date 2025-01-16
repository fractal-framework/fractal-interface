import { Button, Flex, Icon } from '@chakra-ui/react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { FormikProps } from 'formik';
import { useTranslation } from 'react-i18next';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useCanUserCreateProposal } from '../../hooks/utils/useCanUserSubmitProposal';
import { useDaoInfoStore } from '../../store/daoInfo/useDaoInfoStore';
import { CreateProposalSteps } from '../../types';
import { CreateProposalForm, ProposalBuilderMode } from '../../types/proposalBuilder';

interface StepButtonsProps extends FormikProps<CreateProposalForm> {
  pendingTransaction: boolean;
  safeNonce?: number;
  mode: ProposalBuilderMode;
}

export default function StepButtons(props: StepButtonsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { safe } = useDaoInfoStore();
  const {
    mode,
    pendingTransaction,
    errors: {
      transactions: transactionsError,
      nonce: nonceError,
      proposalMetadata: proposalMetadataError,
    },
    values: { proposalMetadata },
  } = props;
  const { t } = useTranslation(['common', 'proposal']);
  const { canUserCreateProposal } = useCanUserCreateProposal();

  if (!safe?.address) {
    return null;
  }

  // @dev these prevStepUrl and nextStepUrl calculation is done this way to universally build URL for the next/prev steps both for proposal builder and proposal template builder
  const prevStepUrl = `${location.pathname.replace(`${mode === ProposalBuilderMode.SABLIER ? CreateProposalSteps.STREAMS : CreateProposalSteps.TRANSACTIONS}`, `${CreateProposalSteps.METADATA}`)}${location.search}`;
  const nextStepUrl = `${location.pathname.replace(`${CreateProposalSteps.METADATA}`, `${mode === ProposalBuilderMode.SABLIER ? CreateProposalSteps.STREAMS : CreateProposalSteps.TRANSACTIONS}`)}${location.search}`;

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
            mode === ProposalBuilderMode.PROPOSAL_WITH_ACTIONS ? (
              <Button
                px="2rem"
                type="submit"
                isDisabled={
                  !canUserCreateProposal ||
                  !!transactionsError ||
                  !!nonceError ||
                  pendingTransaction
                }
              >
                {t('createProposal', { ns: 'proposal' })}
              </Button>
            ) : (
              <Button
                onClick={() => navigate(nextStepUrl)}
                isDisabled={!!proposalMetadataError || !proposalMetadata.title}
                px="2rem"
              >
                {t('next', { ns: 'common' })}
                <CaretRight />
              </Button>
            )
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
                isDisabled={
                  !canUserCreateProposal ||
                  !!transactionsError ||
                  !!nonceError ||
                  pendingTransaction
                }
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
