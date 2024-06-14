import { Flex, Button, Icon } from '@chakra-ui/react';
import { CaretRight, CaretLeft } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useFractal } from '../../providers/App/AppProvider';
import { ICreationStepProps, CreatorSteps } from '../../types';
interface IStepButtons extends ICreationStepProps {
  nextStep?: CreatorSteps;
  prevStep?: CreatorSteps;
  isLastStep?: boolean;
  isNextDisabled?: boolean;
  isEdit?: boolean;
}

export function StepButtons({
  errors,
  transactionPending,
  isSubmitting,
  isSubDAO,
  nextStep,
  prevStep,
  isLastStep,
  isNextDisabled,
  isEdit,
}: IStepButtons) {
  const navigate = useNavigate();
  const { t } = useTranslation(['daoCreate', 'common']);
  const {
    readOnly: { user },
  } = useFractal();
  const location = useLocation();
  const paths = location.pathname.split('/');
  const step = (paths[paths.length - 1] || paths[paths.length - 2]) as CreatorSteps | undefined;
  const prevStepUrl = `${location.pathname.replace(`${step}`, `${prevStep}`)}${location.search}`;
  const nextStepUrl = `${location.pathname.replace(`${step}`, `${nextStep}`)}${location.search}`;

  const forwardButtonText =
    isLastStep && isSubDAO
      ? t('labelDeploySubDAO')
      : isLastStep && isEdit
        ? t('labelDeployAzorius')
        : t(isLastStep ? 'deploy' : 'next', { ns: 'common' });
  const buttonType = isLastStep ? 'submit' : 'button';
  return (
    <Flex
      alignItems="center"
      justifyContent="flex-end"
      width="100%"
      mt="1.5rem"
      gap="0.75rem"
    >
      {prevStep && (
        <Button
          data-testid="create-prevButton"
          variant="text"
          isDisabled={transactionPending || isSubmitting}
          onClick={() => navigate(prevStepUrl)}
          color="lilac-0"
          px="2rem"
        >
          <Icon as={CaretLeft} />
          {t('back', { ns: 'common' })}
        </Button>
      )}
      <Button
        type={buttonType}
        isDisabled={transactionPending || isSubmitting || !step || !!errors[step] || isNextDisabled}
        px="2rem"
        onClick={() => {
          if (!isLastStep && nextStep) {
            navigate(nextStepUrl);
          } else if (isLastStep && !user.address) {
            toast(t('toastDisconnected'), {
              closeOnClick: true,
            });
          }
        }}
        data-testid={!isLastStep ? 'create-skipNextButton' : 'create-deployDAO'}
      >
        {forwardButtonText}
        {!isLastStep && <Icon as={CaretRight} />}
      </Button>
    </Flex>
  );
}
