import { Button, Flex, IconButton, Show, Text } from '@chakra-ui/react';
import { abis } from '@fractal-framework/fractal-contracts';
import { ArrowLeft, Trash, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  getContract,
  getCreate2Address,
  keccak256,
  parseAbiParameters,
  zeroAddress,
} from 'viem';
import { SafePermissionsStrategyAction } from '../../../../components/SafeSettings/SafePermissionsStrategyAction';
import { SettingsPermissionsStrategyForm } from '../../../../components/SafeSettings/SettingsPermissionsStrategyForm';
import { Card } from '../../../../components/ui/cards/Card';
import { ModalBase } from '../../../../components/ui/modals/ModalBase';
import { ModalType } from '../../../../components/ui/modals/ModalProvider';
import { useDecentModal } from '../../../../components/ui/modals/useDecentModal';
import NestedPageHeader from '../../../../components/ui/page/Header/NestedPageHeader';
import Divider from '../../../../components/ui/utils/Divider';
import { DAO_ROUTES } from '../../../../constants/routes';
import { getRandomBytes } from '../../../../helpers';
import useNetworkPublicClient from '../../../../hooks/useNetworkPublicClient';
import { generateContractByteCodeLinear } from '../../../../models/helpers/utils';
import { useFractal } from '../../../../providers/App/AppProvider';
import { useNetworkConfigStore } from '../../../../providers/NetworkConfig/useNetworkConfigStore';
import { useProposalActionsStore } from '../../../../store/actions/useProposalActionsStore';
import { useDaoInfoStore } from '../../../../store/daoInfo/useDaoInfoStore';
import {
  AzoriusGovernance,
  BigIntValuePair,
  CreateProposalTransaction,
  ProposalActionType,
} from '../../../../types';

export function SafePermissionsCreateProposal() {
  const publicClient = useNetworkPublicClient();
  const { t } = useTranslation(['settings', 'common', 'modals']);
  const {
    addressPrefix,
    contracts: {
      linearVotingErc20MasterCopy,
      linearVotingErc721MasterCopy,
      zodiacModuleProxyFactory,
    },
  } = useNetworkConfigStore();
  const [searchParams] = useSearchParams();
  const votingStrategyAddress = searchParams.get('votingStrategy');
  const navigate = useNavigate();
  const {
    governance,
    governanceContracts: {
      linearVotingErc20Address,
      linearVotingErc721Address,
      linearVotingErc20WithHatsWhitelistingAddress,
      linearVotingErc721WithHatsWhitelistingAddress,
      moduleAzoriusAddress,
    },
  } = useFractal();
  const { safe } = useDaoInfoStore();
  const azoriusGovernance = governance as AzoriusGovernance;
  const openSelectAddPermissionModal = useDecentModal(ModalType.ADD_PERMISSION);
  const openConfirmDeleteStrategyModal = useDecentModal(ModalType.CONFIRM_DELETE_STRATEGY);
  const { addAction } = useProposalActionsStore();

  const [proposerThreshold, setProposerThreshold] = useState<BigIntValuePair>({
    bigintValue: BigInt(azoriusGovernance.votingStrategy?.proposerThreshold?.value ?? 0),
    value: azoriusGovernance.votingStrategy?.proposerThreshold?.formatted ?? '0',
  });

  useEffect(() => {
    if (azoriusGovernance.votingStrategy?.proposerThreshold) {
      setProposerThreshold({
        bigintValue: BigInt(azoriusGovernance.votingStrategy.proposerThreshold.value),
        value: azoriusGovernance.votingStrategy.proposerThreshold.formatted ?? '0',
      });
    }
  }, [azoriusGovernance.votingStrategy?.proposerThreshold]);

  if (!safe) return null;

  const settingsPermissionsPath = DAO_ROUTES.settingsPermissions.relative(
    addressPrefix,
    safe.address,
  );

  const handleClose = () => {
    navigate(settingsPermissionsPath);
  };

  const handleGoBack = () => {
    openSelectAddPermissionModal();
    handleClose();
  };

  const handleCreateProposal = async () => {
    if (proposerThreshold.bigintValue !== undefined && moduleAzoriusAddress) {
      let transactions: CreateProposalTransaction[];
      let actionType: ProposalActionType = ProposalActionType.EDIT;

      if (linearVotingErc20Address) {
        transactions = [
          {
            targetAddress: linearVotingErc20Address,
            ethValue: {
              bigintValue: 0n,
              value: '0',
            },
            functionName: 'updateRequiredProposerWeight',
            parameters: [
              {
                signature: 'uint256',
                value: proposerThreshold.bigintValue.toString(),
              },
            ],
          },
        ];
      } else if (linearVotingErc721Address) {
        transactions = [
          {
            targetAddress: linearVotingErc721Address,
            ethValue: {
              bigintValue: 0n,
              value: '0',
            },
            functionName: 'updateProposerThreshold',
            parameters: [
              {
                signature: 'uint256',
                value: proposerThreshold.bigintValue.toString(),
              },
            ],
          },
        ];
      } else if (linearVotingErc20WithHatsWhitelistingAddress) {
        // @todo - definitely could be more DRY here and with useCreateRoles
        actionType = ProposalActionType.ADD;
        const strategyNonce = getRandomBytes();
        const linearERC20VotingMasterCopyContract = getContract({
          abi: abis.LinearERC20Voting,
          address: linearVotingErc20MasterCopy,
          client: publicClient,
        });

        const { votesToken, votingStrategy } = azoriusGovernance;

        if (!votesToken || !votingStrategy?.votingPeriod || !votingStrategy.quorumPercentage) {
          throw new Error('Voting strategy or votes token not found');
        }

        const quorumDenominator =
          await linearERC20VotingMasterCopyContract.read.QUORUM_DENOMINATOR();
        const encodedStrategyInitParams = encodeAbiParameters(
          parseAbiParameters('address, address, address, uint32, uint256, uint256, uint256'),
          [
            safe.address, // owner
            votesToken.address, // governance token
            moduleAzoriusAddress, // Azorius module
            Number(votingStrategy.votingPeriod.value),
            proposerThreshold.bigintValue,
            (votingStrategy.quorumPercentage.value * quorumDenominator) / 100n,
            500000n,
          ],
        );

        const encodedStrategySetupData = encodeFunctionData({
          abi: abis.LinearERC20VotingWithHatsProposalCreation,
          functionName: 'setUp',
          args: [encodedStrategyInitParams],
        });

        const strategyByteCodeLinear = generateContractByteCodeLinear(linearVotingErc20MasterCopy);

        const strategySalt = keccak256(
          encodePacked(
            ['bytes32', 'uint256'],
            [keccak256(encodePacked(['bytes'], [encodedStrategySetupData])), strategyNonce],
          ),
        );

        const predictedStrategyAddress = getCreate2Address({
          from: zodiacModuleProxyFactory,
          salt: strategySalt,
          bytecodeHash: keccak256(encodePacked(['bytes'], [strategyByteCodeLinear])),
        });

        transactions = [
          {
            targetAddress: zodiacModuleProxyFactory,
            functionName: 'deployModule',
            ethValue: { bigintValue: 0n, value: '0' },
            parameters: [
              {
                signature: 'address',
                value: linearVotingErc20MasterCopy,
              },
              { signature: 'bytes', value: encodedStrategySetupData },
              { signature: 'uint256', value: strategyNonce.toString() },
            ],
          },
          {
            targetAddress: moduleAzoriusAddress,
            functionName: 'enableStrategy',
            ethValue: { bigintValue: 0n, value: '0' },
            parameters: [{ signature: 'address', value: predictedStrategyAddress }],
          },
        ];
      } else if (linearVotingErc721WithHatsWhitelistingAddress) {
        actionType = ProposalActionType.ADD;
        const strategyNonce = getRandomBytes();

        const { erc721Tokens, votingStrategy } = azoriusGovernance;

        if (!erc721Tokens || !votingStrategy?.votingPeriod || !votingStrategy.quorumThreshold) {
          throw new Error('Voting strategy or votes token not found');
        }

        const encodedStrategyInitParams = encodeAbiParameters(
          parseAbiParameters(
            'address, address[], uint256[], address, uint32, uint256, uint256, uint256',
          ),
          [
            safe.address, // owner
            erc721Tokens.map(token => token.address), // governance token
            erc721Tokens.map(token => token.votingWeight),
            moduleAzoriusAddress,
            Number(votingStrategy.votingPeriod.value),
            votingStrategy.quorumThreshold.value,
            proposerThreshold.bigintValue,
            500000n,
          ],
        );

        const encodedStrategySetupData = encodeFunctionData({
          abi: abis.LinearERC20VotingWithHatsProposalCreation,
          functionName: 'setUp',
          args: [encodedStrategyInitParams],
        });

        const strategyByteCodeLinear = generateContractByteCodeLinear(linearVotingErc20MasterCopy);

        const strategySalt = keccak256(
          encodePacked(
            ['bytes32', 'uint256'],
            [keccak256(encodePacked(['bytes'], [encodedStrategySetupData])), strategyNonce],
          ),
        );

        const predictedStrategyAddress = getCreate2Address({
          from: zodiacModuleProxyFactory,
          salt: strategySalt,
          bytecodeHash: keccak256(encodePacked(['bytes'], [strategyByteCodeLinear])),
        });

        transactions = [
          {
            targetAddress: zodiacModuleProxyFactory,
            functionName: 'deployModule',
            ethValue: { bigintValue: 0n, value: '0' },
            parameters: [
              {
                signature: 'address',
                value: linearVotingErc721MasterCopy,
              },
              { signature: 'bytes', value: encodedStrategySetupData },
              { signature: 'uint256', value: strategyNonce.toString() },
            ],
          },
          {
            targetAddress: moduleAzoriusAddress,
            functionName: 'enableStrategy',
            ethValue: { bigintValue: 0n, value: '0' },
            parameters: [{ signature: 'address', value: predictedStrategyAddress }],
          },
        ];
      } else {
        throw new Error('No existing voting strategy address found');
      }
      addAction({
        actionType,
        content: (
          <SafePermissionsStrategyAction
            actionType={actionType}
            proposerThreshold={proposerThreshold}
          />
        ),
        transactions,
      });
      navigate(DAO_ROUTES.proposalWithActionsNew.relative(addressPrefix, safe.address));
    }
  };

  return (
    <>
      <Show below="md">
        <NestedPageHeader
          title={t('permissionCreateProposalsTitle')}
          backButton={{
            text: t('back', { ns: 'common' }),
            ...(votingStrategyAddress
              ? { href: settingsPermissionsPath }
              : { onClick: handleGoBack }),
          }}
        >
          {votingStrategyAddress && votingStrategyAddress !== zeroAddress && (
            <Flex
              width="25%"
              justifyContent="flex-end"
            >
              <Button
                variant="ghost"
                rightIcon={<Trash size={24} />}
                padding={0}
                onClick={openConfirmDeleteStrategyModal}
                color="red-1"
              >
                {t('delete', { ns: 'common' })}
              </Button>
            </Flex>
          )}
        </NestedPageHeader>
        <Card>
          <SettingsPermissionsStrategyForm
            proposerThreshold={proposerThreshold}
            setProposerThreshold={setProposerThreshold}
          />
        </Card>
        <Flex justifyContent="flex-end">
          <Button
            variant="primary"
            onClick={handleCreateProposal}
            mt={6}
          >
            {t('createProposal', { ns: 'modals' })}
          </Button>
        </Flex>
      </Show>
      <Show above="md">
        <ModalBase
          isOpen
          onClose={handleClose}
        >
          <Flex
            height="376px" // @dev - fixed height from design
            flexDirection="column"
            justifyContent="space-between"
          >
            <Flex justifyContent="space-between">
              {!votingStrategyAddress ||
                (votingStrategyAddress === zeroAddress && (
                  <IconButton
                    size="button-md"
                    variant="ghost"
                    color="lilac-0"
                    aria-label={t('back', { ns: 'common' })}
                    onClick={handleGoBack}
                    icon={<ArrowLeft size={24} />}
                  />
                ))}
              <Text>{t('permissionCreateProposalsTitle')}</Text>
              {votingStrategyAddress && votingStrategyAddress !== zeroAddress ? (
                <IconButton
                  size="button-md"
                  variant="ghost"
                  color="red-1"
                  icon={<Trash size={24} />}
                  aria-label={t('delete', { ns: 'common' })}
                  onClick={openConfirmDeleteStrategyModal}
                />
              ) : (
                <IconButton
                  size="button-md"
                  variant="ghost"
                  color="lilac-0"
                  aria-label={t('close', { ns: 'common' })}
                  onClick={handleClose}
                  icon={<X size={24} />}
                />
              )}
            </Flex>
            <Divider
              variant="darker"
              mx="-1.5rem"
              width="calc(100% + 3rem)"
            />
            <SettingsPermissionsStrategyForm
              proposerThreshold={proposerThreshold}
              setProposerThreshold={setProposerThreshold}
            />
            <Button
              variant="primary"
              onClick={handleCreateProposal}
              width="full"
              mt={6}
            >
              {t('createProposal', { ns: 'modals' })}
            </Button>
          </Flex>
        </ModalBase>
      </Show>
    </>
  );
}
