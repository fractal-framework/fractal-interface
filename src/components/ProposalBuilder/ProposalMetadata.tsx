import { VStack } from '@chakra-ui/react';
import { FormikProps } from 'formik';
import { useTranslation } from 'react-i18next';
import { CreateProposalForm, ProposalBuilderMode } from '../../types/proposalBuilder';
import { InputComponent, TextareaComponent } from '../ui/forms/InputComponent';
import { builderInProposalMode } from './constants';

export interface ProposalMetadataProps extends FormikProps<CreateProposalForm> {
  mode: ProposalBuilderMode;
}

export default function ProposalMetadata({
  values: { proposalMetadata },
  setFieldValue,
  mode,
}: ProposalMetadataProps) {
  const { t } = useTranslation(['proposalTemplate', 'proposal', 'common']);
  const isProposalMode = builderInProposalMode(mode);

  return (
    <VStack
      align="left"
      spacing={8}
      p="1.5rem"
    >
      <InputComponent
        label={isProposalMode ? t('proposalTitle', { ns: 'proposal' }) : t('proposalTemplateTitle')}
        helper={
          isProposalMode
            ? t('proposalTitleHelper', { ns: 'proposal' })
            : t('proposalTemplateTitleHelperText')
        }
        placeholder={t('proposalTitlePlaceholder', { ns: 'proposal' })}
        isRequired
        value={proposalMetadata.title}
        onChange={e => setFieldValue('proposalMetadata.title', e.target.value)}
        testId="metadata.title"
        maxLength={50}
      />
      <TextareaComponent
        label={
          isProposalMode
            ? t('proposalDescription', { ns: 'proposal' })
            : t('proposalTemplateDescription')
        }
        subLabel={t('')}
        helper={
          isProposalMode
            ? t('proposalDescriptionHelper', { ns: 'proposal' })
            : t('proposalTemplateDescriptionHelperText')
        }
        placeholder={t('proposalDescriptionPlaceholder', { ns: 'proposal' })}
        isRequired={false}
        value={proposalMetadata.description}
        onChange={e => setFieldValue('proposalMetadata.description', e.target.value)}
        rows={12}
      />
      <InputComponent
        label={t('proposalAdditionalResources', { ns: 'proposal' })}
        placeholder={t('proposalAdditionalResourcesPlaceholder', { ns: 'proposal' })}
        helper={t('proposalAdditionalResourcesHelper', { ns: 'proposal' })}
        value={proposalMetadata.documentationUrl || ''}
        onChange={e => setFieldValue('proposalMetadata.documentationUrl', e.target.value)}
        testId="metadata.documentationUrl"
        isRequired={false}
      />
    </VStack>
  );
}
