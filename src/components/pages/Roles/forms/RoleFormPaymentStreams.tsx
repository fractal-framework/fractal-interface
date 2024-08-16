import { Box, Button, Flex } from '@chakra-ui/react';
import { Plus } from '@phosphor-icons/react';
import { FieldArray, useFormikContext } from 'formik';
import { useTranslation } from 'react-i18next';
import { RolePaymentDetails } from '../RolePaymentDetails';
import { RoleFormValues } from '../types';

export function RoleFormPaymentStreams() {
  const { t } = useTranslation(['roles']);
  const { values, setFieldValue, validateForm } = useFormikContext<RoleFormValues>();
  const payments = values.roleEditing?.payments;

  return (
    <FieldArray name="roleEditing.payments">
      {({ push: pushPayment }) => (
        <Box>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus />}
            onClick={async () => {
              pushPayment({});
              await validateForm();
              setFieldValue('roleEditing.roleEditingPaymentIndex', (payments ?? []).length);
            }}
          >
            {t('addPayment')}
          </Button>
          <Box mt="0.5rem">
            {payments?.map((payment, index) => (
              <Flex key={index}>
                <RolePaymentDetails
                  payment={payment}
                  onClick={() => {
                    setFieldValue('roleEditing.roleEditingPaymentIndex', index);
                  }}
                />
              </Flex>
            ))}
          </Box>
        </Box>
      )}
    </FieldArray>
  );
}