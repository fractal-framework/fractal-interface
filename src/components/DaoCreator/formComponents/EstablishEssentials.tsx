import { Box, Divider, Input, RadioGroup } from '@chakra-ui/react';
import { LabelWrapper } from '@decent-org/fractal-ui';
import { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { URL_DOCS_GOV_TYPES } from '../../../constants/url';
import { createAccountSubstring } from '../../../hooks/utils/useDisplayName';
import { useFractal } from '../../../providers/App/AppProvider';
import { ICreationStepProps, CreatorSteps, GovernanceModuleType } from '../../../types';
import { InputComponent, LabelComponent } from '../../ui/forms/InputComponent';
import { RadioWithText } from '../../ui/forms/Radio/RadioWithText';
import ExternalLink from '../../ui/links/ExternalLink';
import { StepButtons } from '../StepButtons';
import { StepWrapper } from '../StepWrapper';

export enum DAOCreateMode {
  ROOTDAO,
  SUBDAO,
  EDIT,
}

export function EstablishEssentials(props: ICreationStepProps) {
  const { t } = useTranslation(['daoCreate', 'common']);
  const { values, setFieldValue, isSubmitting, transactionPending, isSubDAO, errors, mode } = props;

  const {
    node: { daoName, daoSnapshotURL, daoAddress },
  } = useFractal();

  const isEdit = mode === DAOCreateMode.EDIT;

  useEffect(() => {
    if (isEdit) {
      setFieldValue('essentials.daoName', daoName, false);
      if (createAccountSubstring(daoAddress!) !== daoName)
        setFieldValue('essentials.snapshotURL', daoSnapshotURL || '', false);
    }
  }, [setFieldValue, mode, daoName, daoSnapshotURL, isEdit, daoAddress]);

  const daoNameDisabled =
    isEdit && !!daoName && !!daoAddress && createAccountSubstring(daoAddress) !== daoName;
  const snapshotURLDisabled = isEdit && !!daoSnapshotURL;

  return (
    <StepWrapper
      mode={mode}
      isSubDAO={isSubDAO}
      isFormSubmitting={!!isSubmitting || transactionPending}
      titleKey="titleEssentials"
    >
      <InputComponent
        label={t('labelFractalName')}
        helper={t('helperFractalName')}
        isRequired
        value={values.essentials.daoName}
        id="searchEssentials-daoName"
        onChange={cEvent => setFieldValue('essentials.daoName', cEvent.target.value, true)}
        onBlur={cEvent => setFieldValue('essentials.daoName', cEvent.target.value.trim(), true)}
        disabled={daoNameDisabled}
        placeholder={t('daoNamePlaceholder')}
        testId="essentials-daoName"
      />
      <Box my={8}>
        <LabelComponent
          label={t('labelChooseGovernance')}
          helper={t('helperChooseGovernance')}
          isRequired
        >
          <RadioGroup
            bg="black.900-semi-transparent"
            px={8}
            py={4}
            rounded="md"
            display="flex"
            flexDirection="column"
            name="governance"
            gap={4}
            id="governance"
            value={values.essentials.governance}
            onChange={value => setFieldValue('essentials.governance', value)}
          >
            <RadioWithText
              label={t('labelMultisigGov')}
              description={t('descMultisigGov')}
              testId="choose-multisig"
              value={GovernanceModuleType.MULTISIG}
              tooltip={
                <Trans
                  i18nKey="tooltipMultisig"
                  ns="daoCreate"
                >
                  placeholder
                  <ExternalLink href={URL_DOCS_GOV_TYPES}>link</ExternalLink>
                </Trans>
              }
            />
            <RadioWithText
              label={t('labelAzoriusGov')}
              description={t('descAzoriusGov')}
              testId="choose-azorius"
              value={GovernanceModuleType.AZORIUS}
              tooltip={
                <Trans
                  i18nKey="tooltipTokenVoting"
                  ns="daoCreate"
                >
                  placeholder
                  <ExternalLink href={URL_DOCS_GOV_TYPES}>link</ExternalLink>
                </Trans>
              }
            />
          </RadioGroup>
        </LabelComponent>
      </Box>
      <Divider
        color="chocolate.700"
        mb="2rem"
      />
      <LabelComponent
        label={t('snapshot')}
        helper={t('snapshotHelper')}
        isRequired={false}
      >
        <LabelWrapper errorMessage={errors?.essentials?.snapshotURL}>
          <Input
            value={values.essentials.snapshotURL}
            onChange={cEvent => setFieldValue('essentials.snapshotURL', cEvent.target.value, true)}
            isDisabled={snapshotURLDisabled}
            data-testid="essentials-snapshotURL"
            placeholder="example.eth"
            maxLength={30}
          />
        </LabelWrapper>
      </LabelComponent>
      <Divider
        color="chocolate.700"
        mt="2rem"
        mb="2rem"
      />
      <StepButtons
        {...props}
        isNextDisabled={
          values.essentials.daoName.length === 0 || // TODO formik should do this, not sure why it's enabled on first pass
          (isEdit && values.essentials.governance !== GovernanceModuleType.AZORIUS)
        }
        isEdit={isEdit}
        nextStep={
          values.essentials.governance === GovernanceModuleType.MULTISIG
            ? CreatorSteps.MULTISIG_DETAILS
            : CreatorSteps.TOKEN_DETAILS
        }
      />
    </StepWrapper>
  );
}
