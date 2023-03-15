import { Button, Divider, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UsulMetadataProps } from '../../types';
import { InputComponent, TextareaComponent } from './InputComponent';

function UsulMetadata(props: UsulMetadataProps) {
  const { show, setInputtedMetadata, metadata, setMetadata } = props;
  const { t } = useTranslation(['proposal', 'common']);
  const [urlErrorMessage, setUrlErrorMessage] = useState<string>();

  const isValidUrl = (url: string) => {
    if (!url) return true;

    try {
      return Boolean(new URL(url));
    } catch (e) {
      return false;
    }
  };

  const updateTitle = (title: string) => {
    const metadataCopy = {
      ...metadata,
      title,
    };
    setMetadata(metadataCopy);
  };

  const updateDescription = (description: string) => {
    const metadataCopy = {
      ...metadata,
      description,
    };
    setMetadata(metadataCopy);
  };

  const updateDocumentationUrl = (documentationUrl: string) => {
    setUrlErrorMessage(isValidUrl(documentationUrl) ? undefined : 'Invalid URL');
    const metadataCopy = {
      ...metadata,
      documentationUrl,
    };
    setMetadata(metadataCopy);
  };

  if (!show) return null;

  return (
    <>
      <VStack
        align="left"
        spacing={4}
        mt={4}
      >
        <InputComponent
          label={t('proposalTitle')}
          helper={t('proposalTitleHelper')}
          isRequired={false}
          value={metadata.title}
          onChange={e => updateTitle(e.target.value)}
          disabled={false}
          placeholder={t('proposalTitlePlaceholder')}
          testId="metadata.title"
        />
        <TextareaComponent
          label={t('proposalDescription')}
          helper={t('proposalDescriptionHelper')}
          isRequired={false}
          value={metadata.description}
          onChange={e => updateDescription(e.target.value)}
          disabled={false}
          placeholder={t('proposalDescriptionPlaceholder')}
          rows={3}
        />
        <InputComponent
          label={t('proposalAdditionalResources')}
          helper={t('proposalAdditionalResourcesHelper')}
          isRequired={false}
          value={metadata.documentationUrl}
          onChange={e => updateDocumentationUrl(e.target.value)}
          disabled={false}
          placeholder={t('proposalAdditionalResourcesPlaceholder')}
          errorMessage={urlErrorMessage}
          testId="metadata.documentationUrl"
        />
      </VStack>
      <Divider
        color="chocolate.700"
        mt={8}
        mb={6}
      />
      <Button
        w="100%"
        onClick={() => setInputtedMetadata(true)}
        disabled={!!urlErrorMessage}
      >
        Next
      </Button>
    </>
  );
}

export default UsulMetadata;
