import { Box, Flex, Icon, IconButton, Text } from '@chakra-ui/react';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PencilWithLineIcon from '../../assets/theme/custom/icons/PencilWithLineIcon';
import useAddress from '../../hooks/utils/useAddress';
import { useFractal } from '../../providers/App/AppProvider';
import {
  paymentSorterByActiveStatus,
  paymentSorterByStartDate,
  paymentSorterByWithdrawAmount,
} from '../../store/roles/rolesStoreUtils';
import { useRolesStore } from '../../store/roles/useRolesStore';
import { RoleDetailsDrawerProps } from '../../types/roles';
import DraggableDrawer from '../ui/containers/DraggableDrawer';
import { AvatarAndRoleName } from './RoleCard';
import RoleDetailsTabs from './RoleDetailsTabs';
import { RoleProposalPermissionBadge } from './RolesDetailsDrawer';

export default function RolesDetailsDrawerMobile({
  roleHat,
  onClose,
  onOpen,
  isOpen = true,
  onEdit,
}: RoleDetailsDrawerProps) {
  const {
    node: { safe },
  } = useFractal();
  const { t } = useTranslation('roles');
  const { hatsTree } = useRolesStore();
  const permissionsContainerRef = useRef<HTMLDivElement>(null);

  const sortedPayments = useMemo(
    () =>
      roleHat.payments
        ? [...roleHat.payments]
            .sort(paymentSorterByWithdrawAmount)
            .sort(paymentSorterByStartDate)
            .sort(paymentSorterByActiveStatus)
        : [],
    [roleHat.payments],
  );

  const roleHatWearer = 'wearer' in roleHat ? roleHat.wearer : roleHat.wearerAddress;

  const { address: roleHatWearerAddress } = useAddress(roleHatWearer);

  if (!safe?.address || !hatsTree) return null;

  return (
    <DraggableDrawer
      onClose={onClose ?? (() => {})}
      onOpen={onOpen ?? (() => {})}
      isOpen={isOpen}
      headerContent={
        <Flex
          justifyContent="space-between"
          mx="-0.5rem"
        >
          <AvatarAndRoleName
            wearerAddress={roleHatWearerAddress}
            name={roleHat.name}
          />
          <Flex
            alignItems="center"
            gap="1rem"
          >
            <IconButton
              variant="tertiary"
              aria-label="Edit Role"
              onClick={() => onEdit(roleHat.id)}
              size="icon-sm"
              icon={
                <Icon
                  as={PencilWithLineIcon}
                  color="lilac-0"
                  aria-hidden
                />
              }
            />
          </Flex>
        </Flex>
      }
    >
      <Box
        px="1rem"
        mb="1rem"
      >
        <Text
          color="neutral-7"
          textStyle="button-small"
        >
          {t('roleDescription')}
        </Text>
        <Text textStyle="body-base">{roleHat.description}</Text>
      </Box>
      {roleHat.canCreateProposals && (
        <Box
          px="1rem"
          mb="1rem"
          zIndex={1}
          ref={permissionsContainerRef}
        >
          <Text
            color="neutral-7"
            textStyle="button-small"
          >
            {t('permissions')}
          </Text>
          <RoleProposalPermissionBadge containerRef={permissionsContainerRef} />
        </Box>
      )}
      <Box
        px="1rem"
        mb="1.5rem"
      >
        <RoleDetailsTabs
          hatId={roleHat.id}
          roleHatSmartAccountAddress={roleHat.smartAddress}
          roleTerms={roleHat.roleTerms}
          roleHatWearerAddress={roleHatWearerAddress}
          sortedPayments={sortedPayments}
        />
      </Box>
    </DraggableDrawer>
  );
}