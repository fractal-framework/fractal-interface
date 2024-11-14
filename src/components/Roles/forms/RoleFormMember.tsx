import {
  Box,
  Button,
  Flex,
  FormControl,
  Hide,
  Icon,
  Switch,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import {
  ClockCountdown,
  HandCoins,
  ListPlus,
  ReceiptX,
  Warning,
  WarningDiamond,
} from '@phosphor-icons/react';
import { Field, FieldInputProps, FieldMetaProps, FormikProps, useFormikContext } from 'formik';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DecentHourGlass } from '../../../assets/theme/custom/icons/DecentHourGlass';
import { DETAILS_BOX_SHADOW, isFeatureEnabled } from '../../../constants/common';
import useAddress from '../../../hooks/utils/useAddress';
import { useGetAccountName } from '../../../hooks/utils/useGetAccountName';
import { RoleFormValues } from '../../../types/roles';
import DraggableDrawer from '../../ui/containers/DraggableDrawer';
import { AddressInput } from '../../ui/forms/EthAddressInput';
import LabelWrapper from '../../ui/forms/LabelWrapper';
import { ModalBase } from '../../ui/modals/ModalBase';
import RoleFormTerms from './RoleFormTerms';

function RoleMemberWearerInput() {
  const { t } = useTranslation('roles');

  const [roleWearerString, setRoleWearerString] = useState<string>('');
  const { address: resolvedWearerAddress, isValid: isValidWearerAddress } =
    useAddress(roleWearerString);

  const { setFieldValue, values } = useFormikContext<RoleFormValues>();
  useEffect(() => {
    if (isValidWearerAddress) {
      setFieldValue('roleEditing.resolvedWearer', resolvedWearerAddress);
    }
  }, [isValidWearerAddress, resolvedWearerAddress, setFieldValue]);

  const { displayName } = useGetAccountName(values.roleEditing?.resolvedWearer, false);
  return (
    <FormControl>
      <Field name="roleEditing.wearer">
        {({
          field,
          form: { setFieldTouched },
          meta,
        }: {
          field: FieldInputProps<string>;
          form: FormikProps<RoleFormValues>;
          meta: FieldMetaProps<string>;
        }) => (
          <LabelWrapper
            label={t('member')}
            errorMessage={meta.touched && meta.error ? meta.error : undefined}
            isRequired
            labelColor="neutral-7"
          >
            <AddressInput
              value={displayName ?? field.value}
              onBlur={() => {
                setFieldTouched('roleEditing.wearer', true);
              }}
              onChange={e => {
                const inputWearer = e.target.value;
                setRoleWearerString(inputWearer);
                setFieldValue('roleEditing.wearer', inputWearer);
              }}
            />
          </LabelWrapper>
        )}
      </Field>
    </FormControl>
  );
}

function RoleMemberConfirmationScreen({
  onConfirmClick,
  onCancelClick,
}: {
  onConfirmClick: () => void;
  onCancelClick: () => void;
}) {
  const { t } = useTranslation(['roles', 'common']);
  return (
    <Flex justifyContent="center">
      <Flex
        flexDir="column"
        alignItems="center"
        gap={4}
        px={8}
        maxW="28 rem"
      >
        <DecentHourGlass
          h="4.2112rem"
          w="auto"
        />
        <Text
          textStyle="display-2xl"
          textAlign="center"
        >
          {t('addTermLengthTitle')}
        </Text>
        <Flex
          flexDir="column"
          gap={4}
          mt="1.5rem"
        >
          <Flex gap={4}>
            <Icon
              color="lilac-0"
              boxSize="1.5rem"
              as={ClockCountdown}
              weight="fill"
            />
            <Text
              textStyle="body-base"
              color="neutral-7"
            >
              {t('termedRoleConfirmation-1')}
            </Text>
          </Flex>
          <Flex gap={4}>
            <Icon
              color="lilac-0"
              boxSize="1.5rem"
              as={ListPlus}
              weight="fill"
            />

            <Text
              textStyle="body-base"
              color="neutral-7"
            >
              {t('termedRoleConfirmation-2')}
            </Text>
          </Flex>
          <Flex gap={4}>
            <Icon
              color="lilac-0"
              boxSize="1.5rem"
              as={ReceiptX}
              weight="fill"
            />
            <Text
              textStyle="body-base"
              color="neutral-7"
            >
              {t('termedRoleConfirmation-3')}
            </Text>
          </Flex>
          <Flex gap={4}>
            <Icon
              color="lilac-0"
              boxSize="1.5rem"
              as={HandCoins}
              weight="fill"
            />
            <Text
              textStyle="body-base"
              color="neutral-7"
            >
              {t('termedRoleConfirmation-4')}
            </Text>
          </Flex>
        </Flex>
        <Flex
          gap={4}
          mt={8}
          color="yellow-0"
        >
          <Icon
            boxSize="1.5rem"
            as={Warning}
            weight="fill"
          />
          <Text textStyle="helper-text-base">{t('termedRoleConfirmation-warning')}</Text>
        </Flex>
        <Flex
          gap={4}
          flexDir="column"
          w="full"
        >
          <Button
            w="full"
            onClick={onConfirmClick}
          >
            {t('confirm', { ns: 'common' })}
          </Button>
          <Button
            variant="secondary"
            w="full"
            onClick={onCancelClick}
          >
            {t('cancel', { ns: 'common' })}
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
}

function RoleMemberConfirmationPortal({
  onConfirmClick,
  onCancelClick,
  isOpen,
  onOpen,
  onClose,
}: {
  onConfirmClick: () => void;
  onCancelClick: () => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <Hide above="md">
        <DraggableDrawer
          isOpen={isOpen}
          onClose={onClose}
          onOpen={onOpen}
          headerContent={null}
          initialHeight="75%"
          closeOnOverlayClick={false}
        >
          <RoleMemberConfirmationScreen
            onConfirmClick={onConfirmClick}
            onCancelClick={onCancelClick}
          />
        </DraggableDrawer>
      </Hide>
      <Hide below="md">
        <ModalBase
          isOpen={isOpen}
          title=""
          onClose={onClose}
          isSearchInputModal={false}
        >
          <RoleMemberConfirmationScreen
            onConfirmClick={onConfirmClick}
            onCancelClick={onCancelClick}
          />
        </ModalBase>
      </Hide>
    </>
  );
}

function RoleFormMemberTermToggle() {
  const { t } = useTranslation('roles');
  const [seenConfirmation, setSeenConfirmation] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure({});
  const { setFieldValue } = useFormikContext<RoleFormValues>();
  return (
    <Box
      padding="1.5rem"
      border="1px solid"
      borderColor="neutral-3"
      borderRadius="0.25rem"
      mt="1.5rem"
    >
      <Field name="roleEditing.isTermed">
        {({ field }: { field: FieldInputProps<boolean> }) => (
          <>
            <Flex justifyContent="space-between">
              <Flex
                flexDir="column"
                w="15.625rem"
              >
                <Flex
                  alignItems="center"
                  gap={2}
                >
                  <Text textStyle="label-large">{t('addTermLengths')}</Text>
                  <Icon
                    size="1rem"
                    as={WarningDiamond}
                    weight="fill"
                  />
                </Flex>
                <Text
                  textStyle="label-small"
                  color="neutral-7"
                >
                  {t('addTermLengthSubTitle')}
                </Text>
              </Flex>
              <Box alignSelf="center">
                <Switch
                  name="roleEditing.isTermed"
                  size="md"
                  variant="secondary"
                  onChange={e => {
                    if (!seenConfirmation) {
                      setFieldValue('roleEditing.isTermed', false);
                      onOpen();
                    } else {
                      field.onChange(e);
                    }
                  }}
                  isChecked={field.value}
                />
              </Box>
            </Flex>
            <RoleMemberConfirmationPortal
              onConfirmClick={() => {
                setSeenConfirmation(true);
                setFieldValue('roleEditing.isTermed', true);
                onClose();
              }}
              onCancelClick={onClose}
              isOpen={isOpen}
              onOpen={onOpen}
              onClose={onClose}
            />
          </>
        )}
      </Field>
    </Box>
  );
}

export function RoleFormMember() {
  const { values } = useFormikContext<RoleFormValues>();

  if (!!values.roleEditing?.isTermed) {
    if (!isFeatureEnabled('TERMED_ROLES')) {
      // @prevent any sheningans on different environments
      return null;
    }
    return <RoleFormTerms />;
  }
  return (
    <Box>
      <Box
        px={{ base: '1rem', md: 0 }}
        py="1rem"
        bg="neutral-2"
        boxShadow={{
          base: DETAILS_BOX_SHADOW,
          md: 'unset',
        }}
        borderRadius="0.5rem"
        display="flex"
        flexDirection="column"
        gap="1rem"
      >
        <RoleMemberWearerInput />
      </Box>
      {isFeatureEnabled('TERMED_ROLES') && <RoleFormMemberTermToggle />}
    </Box>
  );
}