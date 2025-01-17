import { Box, Flex, Input, RadioGroup } from '@chakra-ui/react';
import { useFormikContext } from 'formik';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { erc20Abi, getContract, isAddress, zeroAddress } from 'viem';
import useNetworkPublicClient from '../../../hooks/useNetworkPublicClient';
import { createAccountSubstring } from '../../../hooks/utils/useGetAccountName';
import { CreatorFormState, ICreationStepProps, TokenCreationType } from '../../../types';
import ContentBoxTitle from '../../ui/containers/ContentBox/ContentBoxTitle';
import LabelWrapper from '../../ui/forms/LabelWrapper';
import { RadioWithText } from '../../ui/forms/Radio/RadioWithText';
import { StepButtons } from '../StepButtons';
import { StepWrapper } from '../StepWrapper';
import { usePrepareFormData } from '../hooks/usePrepareFormData';
import useStepRedirect from '../hooks/useStepRedirect';
import { AzoriusTokenAllocations } from './AzoriusTokenAllocations';
import { VotesTokenImport } from './VotesTokenImport';
import { VotesTokenNew } from './VotesTokenNew';

function TokenConfigDisplay(props: ICreationStepProps) {
  switch (props.values.erc20Token.tokenCreationType) {
    case TokenCreationType.NEW:
      return <VotesTokenNew {...props} />;
    case TokenCreationType.IMPORTED:
      return <VotesTokenImport {...props} />;
    default:
      return null;
  }
}

export function AzoriusTokenDetails(props: ICreationStepProps) {
  const { transactionPending, isSubDAO, setFieldValue, errors, handleChange, isSubmitting, mode } =
    props;

  const { t } = useTranslation('daoCreate');
  const publicClient = useNetworkPublicClient();

  const { values, touched, setTouched } = useFormikContext<CreatorFormState>();

  const { checkVotesToken } = usePrepareFormData();
  const [isImportedVotesToken, setIsValidERC20VotesToken] = useState<boolean>();

  useStepRedirect({ values });
  const updateImportFields = useCallback(async () => {
    const importAddress = values.erc20Token.tokenImportAddress;
    const importError = errors?.erc20Token?.tokenImportAddress;
    if (importAddress && !importError && isAddress(importAddress)) {
      const isVotesToken = await checkVotesToken(importAddress);
      const tokenContract = getContract({
        address: importAddress,
        abi: erc20Abi,
        client: publicClient,
      });
      const [name, symbol, decimals] = await Promise.all([
        tokenContract.read.name(),
        tokenContract.read.symbol(),
        tokenContract.read.decimals(),
      ]);

      // @dev: this turns "total supply" into the human-readable form (without decimals)
      const totalSupply = Number(
        (await tokenContract.read.totalSupply()) / 10n ** BigInt(decimals),
      );

      setFieldValue(
        'erc20Token.tokenSupply',
        {
          value: totalSupply,
          bigintValue: BigInt(totalSupply),
        },
        true,
      );
      if (isVotesToken) {
        setIsValidERC20VotesToken(true);
        setFieldValue('erc20Token.tokenName', name, true);
        setFieldValue('erc20Token.tokenSymbol', symbol, true);
      }
    } else {
      setIsValidERC20VotesToken(undefined);
    }
  }, [
    checkVotesToken,
    errors?.erc20Token?.tokenImportAddress,
    setFieldValue,
    publicClient,
    values.erc20Token.tokenImportAddress,
  ]);

  useEffect(() => {
    updateImportFields();
  }, [updateImportFields]);

  let tokenErrorMsg = '';

  if (touched.erc20Token?.tokenImportAddress) {
    tokenErrorMsg =
      errors?.erc20Token?.tokenImportAddress ||
      (!isImportedVotesToken ? t('errorNotVotingToken') : '');
  }

  return (
    <>
      <StepWrapper
        mode={mode}
        isSubDAO={isSubDAO}
        isFormSubmitting={!!isSubmitting || transactionPending}
        allSteps={props.steps}
        stepNumber={2}
      >
        <Flex
          flexDirection="column"
          gap={4}
        >
          <ContentBoxTitle>{t('titleTokenContract')}</ContentBoxTitle>
          <RadioGroup
            display="flex"
            flexDirection="row"
            name="erc20Token.tokenCreationType"
            gap={8}
            ml="0.25rem"
            id="erc20Token.tokenCreationType"
            value={values.erc20Token.tokenCreationType}
            onChange={value => {
              setFieldValue('erc20Token.tokenCreationType', value);
            }}
          >
            <RadioWithText
              label={t('radioLabelExistingToken')}
              description={t('helperExistingToken')}
              testId="choose-existingToken"
              value={TokenCreationType.IMPORTED}
              onClick={() => {
                setFieldValue('erc20Token.tokenName', '');
                setFieldValue('erc20Token.tokenSymbol', '');
                setFieldValue('erc20Token.tokenSupply', '');
              }}
            />
            <RadioWithText
              label={t('radioLabelNewToken')}
              description={t('helperNewToken')}
              testId="choose-newToken"
              value={TokenCreationType.NEW}
              onClick={() => {
                setFieldValue('erc20Token.tokenImportAddress', '');
                setFieldValue('erc20Token.tokenName', '');
                setFieldValue('erc20Token.tokenSymbol', '');
                setFieldValue('erc20Token.tokenSupply', '');
              }}
            />
          </RadioGroup>
          {values.erc20Token.tokenCreationType === TokenCreationType.IMPORTED && (
            <>
              <LabelWrapper errorMessage={tokenErrorMsg}>
                <Input
                  name="erc20Token.tokenImportAddress"
                  onChange={e => {
                    setTouched({
                      erc20Token: {
                        tokenImportAddress: true,
                      },
                      ...touched,
                    });

                    handleChange(e);
                  }}
                  value={values.erc20Token.tokenImportAddress}
                  placeholder={createAccountSubstring(zeroAddress)}
                  isInvalid={!!tokenErrorMsg}
                  isRequired
                />
              </LabelWrapper>
            </>
          )}
        </Flex>
      </StepWrapper>
      <Box
        mt="1.5rem"
        padding="1.5rem"
        bg="neutral-2"
        borderRadius="0.25rem"
      >
        <TokenConfigDisplay {...props} />
      </Box>
      {values.erc20Token.tokenCreationType === TokenCreationType.NEW && (
        <Box
          mt="1.5rem"
          padding="1.5rem"
          bg="neutral-2"
          borderRadius="0.25rem"
        >
          <AzoriusTokenAllocations {...props} />
        </Box>
      )}
      <StepButtons {...props} />
    </>
  );
}
