import { Box, Button, Flex, IconButton, Show, Text, useBreakpointValue } from '@chakra-ui/react';
import { Coins, Plus } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { zeroAddress } from 'viem';
import PencilWithLineIcon from '../../../../assets/theme/custom/icons/PencilWithLineIcon';
import { SettingsContentBox } from '../../../../components/SafeSettings/SettingsContentBox';
import { Card } from '../../../../components/ui/cards/Card';
import NoDataCard from '../../../../components/ui/containers/NoDataCard';
import { BarLoader } from '../../../../components/ui/loaders/BarLoader';
import { ModalType } from '../../../../components/ui/modals/ModalProvider';
import { useDecentModal } from '../../../../components/ui/modals/useDecentModal';
import NestedPageHeader from '../../../../components/ui/page/Header/NestedPageHeader';
import { NEUTRAL_2_84 } from '../../../../constants/common';
import { DAO_ROUTES } from '../../../../constants/routes';
import { useCanUserCreateProposal } from '../../../../hooks/utils/useCanUserSubmitProposal';
import { useFractal } from '../../../../providers/App/AppProvider';
import { useNetworkConfig } from '../../../../providers/NetworkConfig/NetworkConfigProvider';
import { AzoriusGovernance } from '../../../../types';

export function SafePermissionsSettingsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const navigate = useNavigate();
  const { addressPrefix } = useNetworkConfig();
  const {
    node: { safe },
    governance,
    governanceContracts: { isLoaded, linearVotingErc20Address },
  } = useFractal();

  const { canUserCreateProposal } = useCanUserCreateProposal();
  const azoriusGovernance = governance as AzoriusGovernance;
  const { votesToken } = azoriusGovernance;

  const isMobile = useBreakpointValue({ base: true, md: false });
  const [searchParams] = useSearchParams();
  const votingStrategyAddress = searchParams.get('votingStrategy');

  const openAddPermissionModal = useDecentModal(ModalType.ADD_PERMISSION);

  if (isMobile && votingStrategyAddress) {
    return <Outlet />;
  }

  if (!safe) {
    return null;
  }

  return (
    <>
      <Show below="md">
        <NestedPageHeader
          title={t('permissionsTitle')}
          backButton={{
            text: t('settings'),
            href: DAO_ROUTES.settings.relative(addressPrefix, safe.address),
          }}
        >
          {!linearVotingErc20Address && (
            <Flex
              width="25%"
              justifyContent="flex-end"
            >
              <IconButton
                aria-label={t('add', { ns: 'common' })}
                size="icon-md"
                variant="ghost"
                color="neutral-6"
                icon={<Plus size={24} />}
                onClick={() =>
                  navigate(
                    DAO_ROUTES.settingsPermissionsCreateProposal.relative(
                      addressPrefix,
                      safe.address,
                      zeroAddress,
                    ),
                  )
                }
              />
            </Flex>
          )}
        </NestedPageHeader>
      </Show>
      <SettingsContentBox
        flexDirection="column"
        gap={{ base: 4, md: 6 }}
        display="flex"
        bg={{ base: 'transparent', md: NEUTRAL_2_84 }}
      >
        {canUserCreateProposal && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus />}
            width="max-content"
            onClick={openAddPermissionModal}
          >
            {t('addPermission')}
          </Button>
        )}
        {!isLoaded ? (
          <Card
            my="0.5rem"
            justifyContent="center"
            display="flex"
          >
            <BarLoader />
          </Card>
        ) : !votesToken || !linearVotingErc20Address ? (
          <NoDataCard
            emptyText="emptyPermissions"
            emptyTextNotProposer="emptyPermissionsNotProposer"
            translationNameSpace="settings"
          />
        ) : (
          <Card
            onClick={
              canUserCreateProposal && linearVotingErc20Address
                ? () =>
                    navigate(
                      DAO_ROUTES.settingsPermissionsCreateProposal.relative(
                        addressPrefix,
                        safe.address,
                        linearVotingErc20Address,
                      ),
                    )
                : undefined
            }
            sx={{
              _hover: {
                backgroundColor: 'neutral-3',
                button: {
                  opacity: 1,
                },
              },
            }}
          >
            <Flex justifyContent="space-between">
              <Flex
                gap={4}
                alignItems="flex-start"
              >
                <Box
                  borderRadius="50%"
                  bg="neutral-3"
                  color="lilac-0"
                  padding={1}
                >
                  <Coins fontSize="1.5rem" />
                </Box>
                <Box>
                  <Text>{t('permissionCreateProposalsTitle')}</Text>
                  <Text
                    textStyle="button-small"
                    color="neutral-7"
                  >
                    {t('permissionsCreateProposalsDescription', {
                      symbol: votesToken.symbol,
                      tokensCount: azoriusGovernance.votingStrategy?.proposerThreshold?.formatted,
                    })}
                  </Text>
                </Box>
              </Flex>
              <IconButton
                variant="secondary"
                size="icon-md"
                icon={<PencilWithLineIcon />}
                aria-label={t('edit')}
                opacity={0}
                color="neutral-6"
                border="none"
              />
            </Flex>
          </Card>
        )}
      </SettingsContentBox>
      <Outlet />
    </>
  );
}
