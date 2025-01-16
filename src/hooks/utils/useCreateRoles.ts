import { abis } from '@fractal-framework/fractal-contracts';
import {
  checkAndEncodeArgs,
  HATS_MODULES_FACTORY_ABI,
  HATS_MODULES_FACTORY_ADDRESS,
  HatsModulesClient,
} from '@hatsprotocol/modules-sdk';
import { FormikHelpers } from 'formik';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Address,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  getAddress,
  getContract,
  getCreate2Address,
  Hex,
  keccak256,
  parseAbiParameters,
  zeroAddress,
} from 'viem';
import { usePublicClient } from 'wagmi';
import GnosisSafeL2 from '../../assets/abi/GnosisSafeL2';
import { HatsAbi } from '../../assets/abi/HatsAbi';
import HatsAccount1ofNAbi from '../../assets/abi/HatsAccount1ofN';
import { HatsElectionsEligibilityAbi } from '../../assets/abi/HatsElectionsEligibilityAbi';
import { ZodiacModuleProxyFactoryAbi } from '../../assets/abi/ZodiacModuleProxyFactoryAbi';
import { ERC6551_REGISTRY_SALT } from '../../constants/common';
import { DAO_ROUTES } from '../../constants/routes';
import { getRandomBytes } from '../../helpers';
import { generateContractByteCodeLinear } from '../../models/helpers/utils';
import { useFractal } from '../../providers/App/AppProvider';
import useIPFSClient from '../../providers/App/hooks/useIPFSClient';
import { useNetworkConfigStore } from '../../providers/NetworkConfig/useNetworkConfigStore';
import { useDaoInfoStore } from '../../store/daoInfo/useDaoInfoStore';
import { useRolesStore } from '../../store/roles/useRolesStore';
import {
  AzoriusGovernance,
  CreateProposalMetadata,
  GovernanceType,
  ProposalExecuteData,
} from '../../types';
import {
  EditBadgeStatus,
  HatStruct,
  HatStructWithPayments,
  RoleFormValues,
  RoleHatFormValueEdited,
  SablierPaymentFormValues,
} from '../../types/roles';
import { SENTINEL_MODULE } from '../../utils/address';
import { prepareSendAssetsActionData } from '../../utils/dao/prepareSendAssetsActionData';
import useSubmitProposal from '../DAO/proposal/useSubmitProposal';
import useCreateSablierStream from '../streams/useCreateSablierStream';
import {
  isElectionEligibilityModule,
  predictAccountAddress,
  predictHatId,
} from './../../store/roles/rolesStoreUtils';

function hatsDetailsBuilder(data: { name: string; description: string }) {
  return JSON.stringify({
    type: '1.0',
    data,
  });
}

async function uploadHatDescription(
  hatDescription: string,
  ipfsClient: {
    cat: (hash: string) => Promise<any>;
    add: (data: string) => Promise<any>;
  },
) {
  const response = await ipfsClient.add(hatDescription);
  return `ipfs://${response.Hash}`;
}

export default function useCreateRoles() {
  const {
    governance,
    governanceContracts: {
      linearVotingErc20Address,
      linearVotingErc20WithHatsWhitelistingAddress,
      linearVotingErc721Address,
      linearVotingErc721WithHatsWhitelistingAddress,
      moduleAzoriusAddress,
    },
  } = useFractal();
  const { safe, subgraphInfo } = useDaoInfoStore();
  const { hatsTree, hatsTreeId, getHat } = useRolesStore();
  const {
    addressPrefix,
    chain,
    contracts: {
      hatsProtocol,
      decentHatsCreationModule,
      decentHatsModificationModule,
      hatsAccount1ofNMasterCopy,
      erc6551Registry,
      keyValuePairs,
      sablierV2LockupLinear,
      linearVotingErc20HatsWhitelistingMasterCopy,
      linearVotingErc721HatsWhitelistingMasterCopy,
      zodiacModuleProxyFactory,
      decentAutonomousAdminV1MasterCopy,
      hatsElectionsEligibilityMasterCopy,
    },
  } = useNetworkConfigStore();

  const { t } = useTranslation(['roles', 'navigation', 'modals', 'common']);

  const safeAddress = safe?.address;

  const { submitProposal } = useSubmitProposal();
  const { prepareBatchLinearStreamCreation, prepareFlushStreamTxs, prepareCancelStreamTxs } =
    useCreateSablierStream();
  const ipfsClient = useIPFSClient();
  const publicClient = usePublicClient();
  const navigate = useNavigate();

  const buildDeployWhitelistingStrategy = useCallback(
    async (whitelistedHatsIds: bigint[]) => {
      if (!publicClient || !safeAddress || !moduleAzoriusAddress) {
        return;
      }
      const azoriusGovernance = governance as AzoriusGovernance;
      const { votingStrategy, votesToken, erc721Tokens } = azoriusGovernance;
      if (azoriusGovernance.type === GovernanceType.AZORIUS_ERC20) {
        if (!votesToken || !votingStrategy?.quorumPercentage || !linearVotingErc20Address) {
          return;
        }

        const strategyNonce = getRandomBytes();
        const linearERC20VotingMasterCopyContract = getContract({
          abi: abis.LinearERC20Voting,
          address: linearVotingErc20HatsWhitelistingMasterCopy,
          client: publicClient,
        });

        const quorumDenominator =
          await linearERC20VotingMasterCopyContract.read.QUORUM_DENOMINATOR();

        const votingStrategyContract = getContract({
          abi: abis.LinearERC20Voting,
          address: linearVotingErc20Address,
          client: publicClient,
        });
        const existingVotingPeriod = await votingStrategyContract.read.votingPeriod();
        const encodedStrategyInitParams = encodeAbiParameters(
          parseAbiParameters(
            'address, address, address, uint32, uint256, uint256, address, uint256[]',
          ),
          [
            safeAddress, // owner
            votesToken.address, // governance token
            moduleAzoriusAddress, // Azorius module
            existingVotingPeriod,
            (votingStrategy.quorumPercentage.value * quorumDenominator) / 100n, // quorom numerator, denominator is 1,000,000, so quorum percentage is quorumNumerator * 100 / quorumDenominator
            500000n, // basis numerator, denominator is 1,000,000, so basis percentage is 50% (simple majority)
            hatsProtocol,
            whitelistedHatsIds,
          ],
        );

        const encodedStrategySetupData = encodeFunctionData({
          abi: abis.LinearERC20VotingWithHatsProposalCreation,
          functionName: 'setUp',
          args: [encodedStrategyInitParams],
        });

        const deployWhitelistingVotingStrategyTx = {
          calldata: encodeFunctionData({
            abi: ZodiacModuleProxyFactoryAbi,
            functionName: 'deployModule',
            args: [
              linearVotingErc20HatsWhitelistingMasterCopy,
              encodedStrategySetupData,
              strategyNonce,
            ],
          }),
          targetAddress: zodiacModuleProxyFactory,
        };

        const strategyByteCodeLinear = generateContractByteCodeLinear(
          linearVotingErc20HatsWhitelistingMasterCopy,
        );

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

        const enableDeployedVotingStrategyTx = {
          targetAddress: moduleAzoriusAddress,
          calldata: encodeFunctionData({
            abi: abis.Azorius,
            functionName: 'enableStrategy',
            args: [predictedStrategyAddress],
          }),
        };

        return [deployWhitelistingVotingStrategyTx, enableDeployedVotingStrategyTx];
      } else if (azoriusGovernance.type === GovernanceType.AZORIUS_ERC721) {
        if (!erc721Tokens || !votingStrategy?.quorumThreshold || !linearVotingErc721Address) {
          return;
        }

        const strategyNonce = getRandomBytes();
        const linearERC721VotingMasterCopyContract = getContract({
          abi: abis.LinearERC20Voting,
          address: linearVotingErc721HatsWhitelistingMasterCopy,
          client: publicClient,
        });
        const votingStrategyContract = getContract({
          abi: abis.LinearERC20Voting,
          address: linearVotingErc721Address,
          client: publicClient,
        });
        const existingVotingPeriod = await votingStrategyContract.read.votingPeriod();

        const quorumDenominator =
          await linearERC721VotingMasterCopyContract.read.QUORUM_DENOMINATOR();
        const encodedStrategyInitParams = encodeAbiParameters(
          parseAbiParameters(
            'address, address[], uint256[], address, uint32, uint256, uint256, address, uint256[]',
          ),
          [
            safeAddress, // owner
            erc721Tokens.map(token => token.address), // governance tokens addresses
            erc721Tokens.map(token => token.votingWeight), // governance tokens weights
            moduleAzoriusAddress, // Azorius module
            existingVotingPeriod,
            (votingStrategy.quorumThreshold.value * quorumDenominator) / 100n, // quorom numerator, denominator is 1,000,000, so quorum percentage is quorumNumerator * 100 / quorumDenominator
            500000n, // basis numerator, denominator is 1,000,000, so basis percentage is 50% (simple majority)
            hatsProtocol,
            whitelistedHatsIds,
          ],
        );

        const encodedStrategySetupData = encodeFunctionData({
          abi: abis.LinearERC721VotingWithHatsProposalCreation,
          functionName: 'setUp',
          args: [encodedStrategyInitParams],
        });

        const deployWhitelistingVotingStrategyTx = {
          calldata: encodeFunctionData({
            abi: ZodiacModuleProxyFactoryAbi,
            functionName: 'deployModule',
            args: [
              linearVotingErc721HatsWhitelistingMasterCopy,
              encodedStrategySetupData,
              strategyNonce,
            ],
          }),
          targetAddress: zodiacModuleProxyFactory,
        };

        const strategyByteCodeLinear = generateContractByteCodeLinear(
          linearVotingErc721HatsWhitelistingMasterCopy,
        );

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

        const enableDeployedVotingStrategyTx = {
          targetAddress: moduleAzoriusAddress,
          calldata: encodeFunctionData({
            abi: abis.Azorius,
            functionName: 'enableStrategy',
            args: [predictedStrategyAddress],
          }),
        };

        return [deployWhitelistingVotingStrategyTx, enableDeployedVotingStrategyTx];
      } else {
        throw new Error(
          'Can not deploy Whitelisting Voting Strategy - unsupported governance type!',
        );
      }
    },
    [
      safeAddress,
      governance,
      hatsProtocol,
      linearVotingErc20HatsWhitelistingMasterCopy,
      linearVotingErc721HatsWhitelistingMasterCopy,
      moduleAzoriusAddress,
      publicClient,
      zodiacModuleProxyFactory,
      linearVotingErc20Address,
      linearVotingErc721Address,
    ],
  );

  const createHatStruct = useCallback(
    async (
      name: string,
      description: string,
      wearer: Address,
      isMutable: boolean,
      termEndDateTs: bigint,
    ): Promise<HatStruct> => {
      const details = await uploadHatDescription(
        hatsDetailsBuilder({
          name: name,
          description: description,
        }),
        ipfsClient,
      );

      return {
        maxSupply: 1,
        details,
        imageURI: '',
        isMutable,
        wearer,
        termEndDateTs,
      };
    },
    [ipfsClient],
  );

  const createHatStructWithPayments = useCallback(
    async (
      name: string,
      description: string,
      wearer: Address,
      payments: {
        totalAmount: bigint;
        asset: Address;
        startTimestamp: number;
        cliffTimestamp: number;
        endTimestamp: number;
      }[],
      termEndDateTs: bigint,
    ) => {
      if (safeAddress === undefined) {
        throw new Error('Can not create Hat Struct (with payments) without DAO Address');
      }
      // @dev if termEndDateTs is not 0, then the role is termed and is not mutable
      const isMutable = termEndDateTs === BigInt(0);
      const newHat = await createHatStruct(name, description, wearer, isMutable, termEndDateTs);

      const newHatWithPayments: HatStructWithPayments = {
        ...newHat,
        sablierStreamsParams: payments.map(payment => ({
          sablier: sablierV2LockupLinear,
          sender: safeAddress,
          totalAmount: payment.totalAmount,
          asset: payment.asset,
          cancelable: true,
          transferable: true,
          timestamps: {
            start: payment.startTimestamp,
            cliff: payment.cliffTimestamp,
            end: payment.endTimestamp,
          },
          broker: { account: zeroAddress, fee: 0n },
        })),
      };

      return newHatWithPayments;
    },
    [createHatStruct, safeAddress, sablierV2LockupLinear],
  );

  const parseSablierPaymentsFromFormRolePayments = useCallback(
    (payments: SablierPaymentFormValues[]) => {
      return payments.map(payment => {
        if (
          !payment.amount?.bigintValue ||
          !payment.asset ||
          !payment.startDate ||
          !payment.endDate
        ) {
          throw new Error('Missing required payment information');
        }

        return {
          totalAmount: payment.amount.bigintValue,
          asset: payment.asset.address,
          startTimestamp: Math.floor(payment.startDate.getTime() / 1000),
          cliffTimestamp: payment.cliffDate ? Math.floor(payment.cliffDate.getTime() / 1000) : 0,
          endTimestamp: Math.floor(payment.endDate.getTime() / 1000),
        };
      });
    },
    [],
  );
  const parseRoleTermsFromFormRoleTerms = useCallback(
    (formRoleTerms: { termEndDate?: Date; nominee?: string }[]) => {
      return formRoleTerms
        .map(term => {
          if (term.termEndDate === undefined) {
            throw new Error('Term end date of added Role is undefined.');
          }
          if (term.nominee === undefined) {
            throw new Error('Nominee of added Role is undefined.');
          }

          return {
            termEndDateTs: BigInt(term.termEndDate.getTime()) / 1000n,
            nominatedWearers: [getAddress(term.nominee)],
          };
        })
        .sort((a, b) => Number(b.termEndDateTs) - Number(a.termEndDateTs));
    },
    [],
  );

  const createHatStructsForNewTreeFromRolesFormValues = useCallback(
    async (modifiedRoles: RoleHatFormValueEdited[]) => {
      return Promise.all(
        modifiedRoles.map(role => {
          if (role.name === undefined || role.description === undefined) {
            throw new Error('Hat name or description of added hat is undefined.');
          }

          const sablierPayments = parseSablierPaymentsFromFormRolePayments(role.payments ?? []);

          const [firstTerm] = parseRoleTermsFromFormRoleTerms(role.roleTerms ?? []);
          if (!firstTerm && role.isTermed) {
            throw new Error('First term is undefined');
          }

          // @note for new termed roles, we set the first wearer to the first nominee
          const termEndDateTs = role.isTermed ? firstTerm.termEndDateTs : BigInt(0);
          let wearer: Address;
          if (role.isTermed) {
            wearer = firstTerm.nominatedWearers[0];
          } else if (!role.isTermed && role.wearer) {
            wearer = getAddress(role.wearer);
          } else {
            throw new Error('A wearer is required');
          }

          return createHatStructWithPayments(
            role.name,
            role.description,
            wearer,
            sablierPayments,
            termEndDateTs,
          );
        }),
      );
    },
    [
      createHatStructWithPayments,
      parseSablierPaymentsFromFormRolePayments,
      parseRoleTermsFromFormRoleTerms,
    ],
  );

  const predictSmartAccount = useCallback(
    async (hatId: bigint) => {
      if (!publicClient) {
        throw new Error('Public client is not set');
      }

      return predictAccountAddress({
        implementation: hatsAccount1ofNMasterCopy,
        chainId: BigInt(chain.id),
        tokenContract: hatsProtocol,
        tokenId: hatId,
        registryAddress: erc6551Registry,
        publicClient,
      });
    },
    [publicClient, hatsAccount1ofNMasterCopy, chain.id, hatsProtocol, erc6551Registry],
  );

  const getEnableDisableDecentHatsModuleData = useCallback((moduleAddress: Address) => {
    const enableDecentHatsModuleData = encodeFunctionData({
      abi: GnosisSafeL2,
      functionName: 'enableModule',
      args: [moduleAddress],
    });

    const disableDecentHatsModuleData = encodeFunctionData({
      abi: GnosisSafeL2,
      functionName: 'disableModule',
      args: [SENTINEL_MODULE, moduleAddress],
    });

    return { enableDecentHatsModuleData, disableDecentHatsModuleData };
  }, []);

  const prepareCreateTopHatProposalData = useCallback(
    async (proposalMetadata: CreateProposalMetadata, modifiedHats: RoleHatFormValueEdited[]) => {
      if (!safeAddress) {
        throw new Error('Can not create top hat without DAO Address');
      }

      const { enableDecentHatsModuleData, disableDecentHatsModuleData } =
        getEnableDisableDecentHatsModuleData(decentHatsCreationModule);

      const topHat = {
        details: await uploadHatDescription(
          hatsDetailsBuilder({
            name: subgraphInfo?.daoName || safeAddress,
            description: '',
          }),
          ipfsClient,
        ),
        imageURI: '',
      };

      const adminHat = {
        details: await uploadHatDescription(
          hatsDetailsBuilder({
            name: 'Admin',
            description: '',
          }),
          ipfsClient,
        ),
        imageURI: '',
        isMutable: true,
      };

      const addedHats = await createHatStructsForNewTreeFromRolesFormValues(modifiedHats);
      const createAndDeclareTreeData = encodeFunctionData({
        abi: abis.DecentHatsCreationModule,
        functionName: 'createAndDeclareTree',
        args: [
          {
            hatsProtocol,
            erc6551Registry,
            hatsModuleFactory: HATS_MODULES_FACTORY_ADDRESS,
            moduleProxyFactory: zodiacModuleProxyFactory,
            keyValuePairs,
            decentAutonomousAdminImplementation: decentAutonomousAdminV1MasterCopy,
            hatsAccountImplementation: hatsAccount1ofNMasterCopy,
            hatsElectionsEligibilityImplementation: hatsElectionsEligibilityMasterCopy,
            topHat,
            adminHat,
            hats: addedHats,
          },
        ],
      });

      return {
        targets: [safeAddress, decentHatsCreationModule, safeAddress],
        calldatas: [
          enableDecentHatsModuleData,
          createAndDeclareTreeData,
          disableDecentHatsModuleData,
        ],
        metaData: proposalMetadata,
        values: [0n, 0n, 0n],
      };
    },
    [
      safeAddress,
      getEnableDisableDecentHatsModuleData,
      decentHatsCreationModule,
      subgraphInfo?.daoName,
      ipfsClient,
      hatsElectionsEligibilityMasterCopy,
      createHatStructsForNewTreeFromRolesFormValues,
      hatsProtocol,
      erc6551Registry,
      zodiacModuleProxyFactory,
      keyValuePairs,
      decentAutonomousAdminV1MasterCopy,
      hatsAccount1ofNMasterCopy,
    ],
  );

  const prepareNewHatTxs = useCallback(
    async (formRole: RoleHatFormValueEdited) => {
      if (formRole.name === undefined || formRole.description === undefined) {
        throw new Error('Role name or description is undefined.');
      }

      if (!hatsTree) {
        throw new Error('Cannot create new hat without hats tree');
      }

      if (!safeAddress) {
        throw new Error('Cannot create new hat without Safe address');
      }

      const [firstTerm] = parseRoleTermsFromFormRoleTerms(formRole.roleTerms ?? []);
      if (!!firstTerm && !formRole.isTermed) {
        throw new Error('First term is defined, but role is not termed');
      }
      const firstWearer = !!firstTerm ? firstTerm.nominatedWearers[0] : formRole.resolvedWearer;
      const termEndDateTs = !!firstTerm ? firstTerm.termEndDateTs : BigInt(0);

      if (firstWearer === undefined) {
        throw new Error('Cannot create new hat without wearer');
      }
      const hatStruct = await createHatStructWithPayments(
        formRole.name,
        formRole.description,
        firstWearer,
        parseSablierPaymentsFromFormRolePayments(formRole.payments ?? []),
        termEndDateTs,
      );

      const { enableDecentHatsModuleData, disableDecentHatsModuleData } =
        getEnableDisableDecentHatsModuleData(decentHatsModificationModule);

      const createNewRoleData = encodeFunctionData({
        abi: abis.DecentHatsModificationModule,
        functionName: 'createRoleHats',
        args: [
          {
            hatsProtocol,
            erc6551Registry,
            hatsAccountImplementation: hatsAccount1ofNMasterCopy,
            hatsModuleFactory: HATS_MODULES_FACTORY_ADDRESS,
            hatsElectionsEligibilityImplementation: hatsElectionsEligibilityMasterCopy,
            adminHatId: BigInt(hatsTree.adminHat.id),
            hats: [hatStruct],
            topHatId: BigInt(hatsTree.topHat.id),
            topHatAccount: hatsTree.topHat.smartAddress,
            keyValuePairs,
          },
        ],
      });

      return [
        {
          targetAddress: safeAddress,
          calldata: enableDecentHatsModuleData,
        },
        {
          targetAddress: decentHatsModificationModule,
          calldata: createNewRoleData,
        },
        {
          targetAddress: safeAddress,
          calldata: disableDecentHatsModuleData,
        },
      ];
    },
    [
      hatsTree,
      safeAddress,
      parseRoleTermsFromFormRoleTerms,
      createHatStructWithPayments,
      parseSablierPaymentsFromFormRolePayments,
      getEnableDisableDecentHatsModuleData,
      decentHatsModificationModule,
      hatsProtocol,
      erc6551Registry,
      hatsAccount1ofNMasterCopy,
      hatsElectionsEligibilityMasterCopy,
      keyValuePairs,
    ],
  );

  const isDecentAutonomousAdminV1 = useCallback(
    async (address: Address) => {
      if (!publicClient) {
        throw new Error('Public client is not set');
      }
      const decentAutonomousAdminV1Contract = getContract({
        address: address,
        abi: abis.DecentAutonomousAdminV1,
        client: publicClient,
      });
      const DECENT_AUTONOMOUS_ADMIN_V1_INTERFACE_ID = '0x0ac4a8e8';
      return decentAutonomousAdminV1Contract.read.supportsInterface([
        DECENT_AUTONOMOUS_ADMIN_V1_INTERFACE_ID,
      ]);
    },
    [publicClient],
  );

  /**
   * @dev Checks if Admin Hat is already being worn by an instance of DecentAutonomousAdminV1
   * @dev if not, prepares transactions to deploy a new instance of DecentAutonomousAdminV1
   * @dev and mint a new hat
   * @returns an array of transactions to create a deploy Decent Autonomous Admin and mint a new hat
   */
  const prepareAdminHatTxs = useCallback(
    async (
      adminHatWearerAddress: Address | undefined,
      adminHatId: Hex,
      isAnyRoleTermed: boolean,
    ) => {
      if (!isAnyRoleTermed) {
        return [];
      }

      if (!!adminHatWearerAddress && (await isDecentAutonomousAdminV1(adminHatWearerAddress))) {
        return [];
      }

      // deploy new instance of DecentAutonomousAdminV1 through ModuleProxyFactory
      const salt = keccak256(
        encodePacked(
          ['bytes32', 'uint256'],
          [keccak256(encodePacked(['bytes'], [ERC6551_REGISTRY_SALT])), BigInt(adminHatId)],
        ),
      );
      const deployDecentAutonomousAdminV1Calldata = encodeFunctionData({
        abi: ZodiacModuleProxyFactoryAbi,
        functionName: 'deployModule',
        args: [
          decentAutonomousAdminV1MasterCopy,
          encodeFunctionData({
            abi: abis.DecentAutonomousAdminV1,
            functionName: 'setUp',
            args: [zeroAddress],
          }),
          BigInt(salt),
        ],
      });
      const predictedDecentAutonomousAdminV1Address = getCreate2Address({
        from: zodiacModuleProxyFactory,
        salt: salt,
        bytecodeHash: keccak256(encodePacked(['bytes'], [deployDecentAutonomousAdminV1Calldata])),
      });

      // @todo max supply check and increase if maxed
      const mintAdminHat = {
        targetAddress: hatsProtocol,
        calldata: encodeFunctionData({
          abi: HatsAbi,
          functionName: 'mintHat',
          args: [BigInt(adminHatId), predictedDecentAutonomousAdminV1Address],
        }),
      };
      const deployDecentAutonomousAdminV1Tx = {
        targetAddress: zodiacModuleProxyFactory,
        calldata: deployDecentAutonomousAdminV1Calldata,
      };

      return [deployDecentAutonomousAdminV1Tx, mintAdminHat];
    },
    [
      decentAutonomousAdminV1MasterCopy,
      hatsProtocol,
      zodiacModuleProxyFactory,
      isDecentAutonomousAdminV1,
    ],
  );

  const createBatchLinearStreamCreationTx = useCallback(
    (formStreams: (SablierPaymentFormValues & { recipient: Address })[]) => {
      const preparedStreams = formStreams.map(stream => {
        if (
          !stream.asset ||
          !stream.startDate ||
          !stream.endDate ||
          !stream.amount?.bigintValue ||
          stream.amount.bigintValue <= 0n
        ) {
          throw new Error('Form Values inValid', {
            cause: stream,
          });
        }

        return {
          recipient: stream.recipient,
          startDateTs: Math.floor(stream.startDate.getTime() / 1000),
          endDateTs: Math.ceil(stream.endDate.getTime() / 1000),
          cliffDateTs: Math.floor((stream.cliffDate?.getTime() ?? 0) / 1000),
          totalAmount: stream.amount.bigintValue,
          assetAddress: stream.asset.address,
        };
      });

      return prepareBatchLinearStreamCreation(preparedStreams);
    },
    [prepareBatchLinearStreamCreation],
  );

  const getMemberChangedStreamsWithFundsToClaim = useCallback((formHat: RoleHatFormValueEdited) => {
    return (formHat.payments ?? []).filter(
      payment => (payment?.withdrawableAmount ?? 0n) > 0n && !payment.isCancelling,
    );
  }, []);

  const getNewStreamsFromFormHat = useCallback((formHat: RoleHatFormValueEdited) => {
    return (formHat.payments ?? []).filter(payment => !payment.streamId);
  }, []);

  const getCancelledStreamsFromFormHat = useCallback((formHat: RoleHatFormValueEdited) => {
    return (formHat.payments ?? []).filter(payment => payment.isCancelling && !!payment.streamId);
  }, []);

  const getRoleRemovedStreamsWithFundsToClaim = useCallback((formHat: RoleHatFormValueEdited) => {
    return (formHat.payments ?? []).filter(payment => (payment?.withdrawableAmount ?? 0n) > 0n);
  }, []);

  const getActiveStreamsFromFormHat = useCallback((formHat: RoleHatFormValueEdited) => {
    return (formHat.payments ?? []).filter(
      payment => !payment.isCancelled && !!payment.endDate && payment.endDate > new Date(),
    );
  }, []);

  const getPaymentTermRecipients = useCallback(
    (formHat: RoleHatFormValueEdited): (SablierPaymentFormValues & { recipient: Address })[] => {
      return getNewStreamsFromFormHat(formHat).map(payment => {
        if (formHat.roleTerms === undefined || formHat.roleTerms.length === 0) {
          throw new Error('Cannot prepare transactions without role terms');
        }
        const findTerm = formHat.roleTerms.find(
          term =>
            term.termEndDate &&
            payment.endDate &&
            term.termEndDate.getTime() === payment.endDate?.getTime(),
        );
        if (!findTerm) {
          throw new Error('Cannot find term for payment');
        }
        if (!findTerm.nominee) {
          throw new Error('Nominee is undefined');
        }
        return {
          ...payment,
          recipient: getAddress(findTerm.nominee),
        };
      });
    },
    [getNewStreamsFromFormHat],
  );

  const prepareRolePaymentUpdateTxs = useCallback(
    async (formHat: RoleHatFormValueEdited) => {
      if (!safeAddress) {
        throw new Error('Cannot prepare transactions without DAO address');
      }
      if (formHat.wearer === undefined) {
        throw new Error('Cannot prepare transactions without wearer');
      }

      const paymentTxs = []; // Initialize an empty array to hold the transaction data
      const cancelledStreamsOnHat = getCancelledStreamsFromFormHat(formHat);
      if (cancelledStreamsOnHat.length) {
        // This role edit includes stream cancels. In case there are any unclaimed funds on these streams,
        // we need to flush them out to the original wearer.

        const originalHat = getHat(formHat.id);
        if (!originalHat) {
          throw new Error('Cannot find original hat');
        }

        for (const stream of cancelledStreamsOnHat) {
          if (!stream.streamId || !stream.contractAddress || !formHat.smartAddress) {
            throw new Error('Stream data is missing for cancel stream transaction');
          }

          // First transfer hat from the original wearer to the Safe
          paymentTxs.push({
            calldata: encodeFunctionData({
              abi: HatsAbi,
              functionName: 'transferHat',
              args: [BigInt(formHat.id), originalHat.wearerAddress, safeAddress],
            }),
            targetAddress: hatsProtocol,
          });

          // flush withdrawable streams to the original wearer
          if (stream.withdrawableAmount && stream.withdrawableAmount > 0n) {
            const flushStreamTxCalldata = prepareFlushStreamTxs({
              streamId: stream.streamId,
              to: originalHat.wearerAddress,
              smartAccount: formHat.smartAddress,
            });

            paymentTxs.push(...flushStreamTxCalldata);
          }

          // Cancel the stream
          paymentTxs.push(...prepareCancelStreamTxs(stream.streamId));

          // Finally, transfer the hat back to the correct wearer.
          // Because a payment cancel can occur in the same role edit as a member change, we need to ensure hat is
          // finally transferred to the correct wearer. Instead of transferring to `originalHat.wearer` here,
          // `formHat.wearer` will represent the new wearer if the role member was changed, but will otherwise remain
          // the original wearer since the member form field was untouched.
          paymentTxs.push({
            calldata: encodeFunctionData({
              abi: HatsAbi,
              functionName: 'transferHat',
              args: [BigInt(formHat.id), safeAddress, getAddress(formHat.wearer)],
            }),
            targetAddress: hatsProtocol,
          });
        }
      }

      const newStreamsOnHat = getNewStreamsFromFormHat(formHat);
      if (newStreamsOnHat.length) {
        if (!formHat.smartAddress) {
          throw new Error('Cannot prepare transactions for edited role without smart address');
        }
        const newPredictedHatSmartAccount = await predictSmartAccount(BigInt(formHat.id));
        if (!newPredictedHatSmartAccount) {
          throw new Error('Cannot predict smart account');
        }
        const newStreamTxData = createBatchLinearStreamCreationTx(
          newStreamsOnHat.map(stream => ({ ...stream, recipient: newPredictedHatSmartAccount })),
        );
        paymentTxs.push(...newStreamTxData.preparedTokenApprovalsTransactions);
        paymentTxs.push(...newStreamTxData.preparedStreamCreationTransactions);
      }
      return paymentTxs;
    },
    [
      safeAddress,
      getCancelledStreamsFromFormHat,
      getNewStreamsFromFormHat,
      getHat,
      hatsProtocol,
      prepareCancelStreamTxs,
      prepareFlushStreamTxs,
      predictSmartAccount,
      createBatchLinearStreamCreationTx,
    ],
  );

  const prepareTermedRolePaymentUpdateTxs = useCallback(
    (formHat: RoleHatFormValueEdited) => {
      if (!safeAddress) {
        throw new Error('Cannot prepare transactions without DAO address');
      }
      if (formHat.wearer === undefined) {
        throw new Error('Cannot prepare transactions without wearer');
      }
      if (formHat.roleTerms === undefined || formHat.roleTerms.length === 0) {
        throw new Error('Cannot prepare transactions without role terms');
      }
      const paymentTxs = [];
      const newStreamsOnHat = getNewStreamsFromFormHat(formHat);
      if (newStreamsOnHat.length) {
        const newStreamTxData = createBatchLinearStreamCreationTx(
          getPaymentTermRecipients(formHat),
        );
        paymentTxs.push(...newStreamTxData.preparedTokenApprovalsTransactions);
        paymentTxs.push(...newStreamTxData.preparedStreamCreationTransactions);
      }
      return paymentTxs;
    },
    [
      createBatchLinearStreamCreationTx,
      safeAddress,
      getNewStreamsFromFormHat,
      getPaymentTermRecipients,
    ],
  );

  const prepareConvertRoleToTermedTxs = useCallback(
    async (formHat: RoleHatFormValueEdited) => {
      const roleHatCurrentState = getHat(formHat.id);

      if (!roleHatCurrentState) {
        throw new Error('Cannot find role hat');
      }
      if (roleHatCurrentState.isTermed) {
        throw new Error('Cannot change role type for a termed role');
      }
      if (!hatsTree || !publicClient || !safeAddress) {
        throw new Error('App is not ready', {
          cause: {
            hatsTree,
            publicClient,
            safeAddress,
          },
        });
      }

      if (
        !formHat.roleTerms ||
        formHat.roleTerms.length === 0 ||
        !formHat.smartAddress ||
        !formHat.wearer
      ) {
        throw new Error('formhat is missing required fields', {
          cause: formHat,
        });
      }

      const hatsModulesClient = new HatsModulesClient({
        publicClient,
      });
      await hatsModulesClient.prepare();
      const module = hatsModulesClient.getModuleByImplementation(
        hatsElectionsEligibilityMasterCopy,
      );
      if (!module) {
        throw new Error('Cannot find module');
      }

      const immutableArgs = [BigInt(hatsTree.topHat.id), BigInt(0)];
      const hatId = BigInt(formHat.id);
      const saltNonce = BigInt(ERC6551_REGISTRY_SALT);
      const currentExistingHatWearer = roleHatCurrentState.wearerAddress;

      const [firstTerm] = parseRoleTermsFromFormRoleTerms(formHat.roleTerms);
      const firstTermNominee = firstTerm.nominatedWearers[0];
      const firstTermEndDateTs = firstTerm.termEndDateTs;

      const { encodedImmutableArgs, encodedMutableArgs } = checkAndEncodeArgs({
        module,
        immutableArgs: immutableArgs,
        mutableArgs: [firstTermEndDateTs],
      });

      const createElectionsModuleTx = {
        calldata: encodeFunctionData({
          abi: HATS_MODULES_FACTORY_ABI,
          functionName: 'createHatsModule',
          args: [
            hatsElectionsEligibilityMasterCopy,
            hatId,
            encodedImmutableArgs,
            encodedMutableArgs,
            saltNonce,
          ],
        }),
        targetAddress: HATS_MODULES_FACTORY_ADDRESS,
      };

      const transferHatToSafeTx = {
        calldata: encodeFunctionData({
          abi: HatsAbi,
          functionName: 'transferHat',
          args: [hatId, currentExistingHatWearer, safeAddress],
        }),
        targetAddress: hatsProtocol,
      };
      const transferHatToBackToWearer = {
        calldata: encodeFunctionData({
          abi: HatsAbi,
          functionName: 'transferHat',
          args: [hatId, safeAddress, currentExistingHatWearer],
        }),
        targetAddress: hatsProtocol,
      };

      const streamsWithFundsToClaim = getRoleRemovedStreamsWithFundsToClaim(formHat);
      const streamsWithdrawTx = [];
      if (streamsWithFundsToClaim.length) {
        for (const stream of streamsWithFundsToClaim) {
          if (!stream.streamId || !stream.contractAddress) {
            throw new Error(
              'Stream ID and Stream ContractAddress is required for flush stream transaction',
            );
          }

          const flushStreamTxCalldata = prepareFlushStreamTxs({
            streamId: stream.streamId,
            to: currentExistingHatWearer,
            smartAccount: formHat.smartAddress,
          });

          streamsWithdrawTx.push(...flushStreamTxCalldata);
        }
      }

      const activeStreams = getActiveStreamsFromFormHat(formHat);
      const cancelStreamTxs = [];
      if (activeStreams.length) {
        for (const stream of activeStreams) {
          if (!stream.streamId || !stream.contractAddress) {
            throw new Error(
              'Stream ID and Stream ContractAddress is required for cancel stream transaction',
            );
          }
          cancelStreamTxs.push(...prepareCancelStreamTxs(stream.streamId));
        }
      }

      const predictedElectionsModuleAddress = await hatsModulesClient.predictHatsModuleAddress({
        // @todo This will need to be updated when/if https://github.com/Hats-Protocol/modules-sdk/pull/27 is merged
        moduleId: module.implementationAddress,
        hatId,
        immutableArgs,
        saltNonce,
      });
      const addElectionModuleTx = {
        calldata: encodeFunctionData({
          abi: HatsAbi,
          functionName: 'changeHatEligibility',
          args: [hatId, predictedElectionsModuleAddress],
        }),
        targetAddress: hatsProtocol,
      };

      const toggleMutabilityTx = {
        calldata: encodeFunctionData({
          abi: HatsAbi,
          functionName: 'makeHatImmutable',
          args: [hatId],
        }),
        targetAddress: hatsProtocol,
      };

      const electTx = {
        calldata: encodeFunctionData({
          abi: HatsElectionsEligibilityAbi,
          functionName: 'elect',
          args: [firstTermEndDateTs, [firstTermNominee]],
        }),
        targetAddress: predictedElectionsModuleAddress,
      };

      const isStreamsClaimableOrCancelable =
        streamsWithFundsToClaim.length || streamsWithdrawTx.length;

      const checkHatWearerStatusTx = {
        calldata: encodeFunctionData({
          abi: HatsAbi,
          functionName: 'checkHatWearerStatus',
          args: [hatId, currentExistingHatWearer],
        }),
        targetAddress: hatsProtocol,
      };

      const mintTx = {
        calldata: encodeFunctionData({
          abi: HatsAbi,
          functionName: 'mintHat',
          args: [hatId, firstTermNominee],
        }),
        targetAddress: hatsProtocol,
      };

      const conversionTxs = [];
      // create the election module with the first term end date (open election)
      conversionTxs.push(createElectionsModuleTx);

      // if there are streams with funds to claim or cancel, we need to transfer the hat to the safe and flush/cancel the streams
      if (isStreamsClaimableOrCancelable) {
        conversionTxs.push(transferHatToSafeTx);
        conversionTxs.push(...streamsWithdrawTx);
        conversionTxs.push(...cancelStreamTxs);
        conversionTxs.push(transferHatToBackToWearer);
      }

      // add election module to eligibility of hat
      conversionTxs.push(addElectionModuleTx);
      // make hat immutable
      conversionTxs.push(toggleMutabilityTx);

      // elect har nominee (closes election)
      conversionTxs.push(electTx);

      // check eligibility of currently wearer and burn if ineligible
      conversionTxs.push(checkHatWearerStatusTx);

      // mint hat to first nominee if current wearer is not the first nominee
      if (currentExistingHatWearer !== firstTermNominee) {
        conversionTxs.push(mintTx);
      }
      return conversionTxs;
    },
    [
      getActiveStreamsFromFormHat,
      getHat,
      getRoleRemovedStreamsWithFundsToClaim,
      hatsElectionsEligibilityMasterCopy,
      hatsProtocol,
      hatsTree,
      parseRoleTermsFromFormRoleTerms,
      prepareCancelStreamTxs,
      prepareFlushStreamTxs,
      publicClient,
      safeAddress,
    ],
  );

  const prepareCreateRolesModificationsProposalData = useCallback(
    async (proposalMetadata: CreateProposalMetadata, modifiedHats: RoleHatFormValueEdited[]) => {
      if (!hatsTree || !safeAddress) {
        throw new Error('Cannot prepare transactions without hats tree or DAO address');
      }

      if (!publicClient) {
        throw new Error('Cannot prepare transactions without public client');
      }

      const topHatAccount = hatsTree.topHat.smartAddress;
      const adminHatWearer = hatsTree.adminHat.wearer;
      const allTxs: { calldata: Hex; targetAddress: Address }[] = [];
      const whitelistingPermissionAddedHats: bigint[] = [];
      const whitelistingPermissionRemovedHats: bigint[] = [];

      // The Algorithm
      // for each modified role
      //
      // New Role
      //   - Transfer the top hat to the DecentHats module, so it can create new hats on the safe's behalf
      //   - allTxs.push(createRoleHat). This will (in the DecentHats contract):
      //     - create hat,
      //     - mint hat,
      //     - create smart account for the hat,
      //     - create new streams on the hat if any added
      //  - createRoleHat will transfer the top hat back to the safe
      //  - does it have proposal creation permission?
      //   - does Azorius has whitelisting strategy enabled?
      //     - if no: allTxs.push(deploy new strategy with params based on existing strategy)
      // Deleted Role
      //   - for each inactive stream with funds to claim
      //     - allTxs.push(flush stream transaction data)
      //   - for each active stream
      //     - allTxs.push(flush stream transaction data)
      //     - allTxs.push(cancel stream transaction data)
      //   - allTxs.push(deactivate role transaction data)
      //   - for roles with permission to create proposals: allTxs.push(un-whitelist hat)
      // Edited Role
      //   - is the name or description changed?
      //     - allTxs.push(edit details data)
      //   - is the member changed?
      //     - for each stream with funds to claim
      //       - if stream is not set to be cancelled
      //         - allTxs.push(flush stream transaction data)
      //   - for each cancelled stream
      //     - allTxs.push(flush stream transaction data)
      //   - for each new stream
      //     - allTxs.push(create new stream transactions datas)
      //   - is canCreateProposals changed?
      //     - does Azorius has whitelisting strategy enabled?
      //       - if no: allTxs.push(deploy new strategy with params based on existing strategy)
      //     - allTxs.push(whitelist or un-whitelist)

      let newHatsCount = 0;
      allTxs.push(
        ...(await prepareAdminHatTxs(
          hatsTree.adminHat.wearer,
          hatsTree.adminHat.id,
          modifiedHats.some(hat => hat.isTermed),
        )),
      );

      for (let index = 0; index < modifiedHats.length; index++) {
        const formHat = modifiedHats[index];
        if (formHat.name === undefined || formHat.description === undefined) {
          throw new Error('Role details are missing', {
            cause: formHat,
          });
        }

        if (formHat.editedRole.status === EditBadgeStatus.New) {
          allTxs.push(...(await prepareNewHatTxs(formHat)));
          if (formHat.canCreateProposals) {
            const newHatId = predictHatId({
              adminHatId: hatsTree.adminHat.id,
              hatsCount: hatsTree.roleHats.length + newHatsCount,
            });
            whitelistingPermissionAddedHats.push(newHatId);
          }
          newHatsCount++;
        } else if (formHat.editedRole.status === EditBadgeStatus.Removed) {
          if (formHat.smartAddress === undefined) {
            throw new Error(
              'Cannot prepare transactions for removed role without smart account address',
            );
          }

          const originalHat = getHat(formHat.id);
          if (!originalHat) {
            throw new Error('Cannot find original hat');
          }

          allTxs.push({
            calldata: encodeFunctionData({
              abi: HatsAbi,
              functionName: 'transferHat',
              args: [BigInt(formHat.id), originalHat.wearerAddress, safeAddress],
            }),
            targetAddress: hatsProtocol,
          });

          const streamsWithFundsToClaim = getRoleRemovedStreamsWithFundsToClaim(formHat);

          if (streamsWithFundsToClaim.length) {
            // This role is being removed.
            // We need to flush out any unclaimed funds from streams on this role to the original wearer.
            for (const stream of streamsWithFundsToClaim) {
              if (!stream.streamId || !stream.contractAddress) {
                throw new Error(
                  'Stream ID and Stream ContractAddress is required for flush stream transaction',
                );
              }

              const flushStreamTxCalldata = prepareFlushStreamTxs({
                streamId: stream.streamId,
                to: getAddress(originalHat.wearerAddress),
                smartAccount: formHat.smartAddress,
              });

              allTxs.push(...flushStreamTxCalldata);
            }
          }

          const activeStreams = getActiveStreamsFromFormHat(formHat);

          if (activeStreams.length) {
            for (const stream of activeStreams) {
              if (!stream.streamId || !stream.contractAddress) {
                throw new Error(
                  'Stream ID and Stream ContractAddress is required for cancel stream transaction',
                );
              }
              allTxs.push(...prepareCancelStreamTxs(stream.streamId));
            }
          }

          allTxs.push({
            calldata: encodeFunctionData({
              abi: HatsAccount1ofNAbi,
              functionName: 'execute',
              args: [
                hatsProtocol,
                0n,
                encodeFunctionData({
                  abi: HatsAbi,
                  functionName: 'setHatStatus',
                  args: [BigInt(formHat.id), false],
                }),
                0,
              ],
            }),
            targetAddress: topHatAccount,
          });

          if (originalHat.canCreateProposals) {
            whitelistingPermissionRemovedHats.push(BigInt(originalHat.id));
          }
        } else if (formHat.editedRole.status === EditBadgeStatus.Updated) {
          if (
            formHat.editedRole.fieldNames.includes('roleName') ||
            formHat.editedRole.fieldNames.includes('roleDescription')
          ) {
            const details = await uploadHatDescription(
              hatsDetailsBuilder({
                name: formHat.name,
                description: formHat.description,
              }),
              ipfsClient,
            );
            allTxs.push({
              calldata: encodeFunctionData({
                abi: HatsAbi,
                functionName: 'changeHatDetails',
                args: [BigInt(formHat.id), details],
              }),
              targetAddress: hatsProtocol,
            });
          }
          if (formHat.editedRole.fieldNames.includes('member') && !formHat.isTermed) {
            if (!formHat.wearer) {
              throw new Error('Cannot prepare transactions for edited role without wearer');
            }
            const newWearer = getAddress(formHat.wearer);
            if (formHat.smartAddress === undefined) {
              throw new Error('Cannot prepare transactions for edited role without smart address');
            }

            // formHat's `wearer` is the new wearer. We grab the original wearer (before this member change attempt)
            // on the hat, because we need that address to transfer to the new wearer.
            const originalHat = getHat(formHat.id);
            if (!originalHat) {
              throw new Error('Cannot find original hat');
            }

            const streamsWithFundsToClaim = getMemberChangedStreamsWithFundsToClaim(formHat);

            if (streamsWithFundsToClaim.length) {
              // If there are unclaimed funds on any streams on the hat, we need to flush them to the original wearer.
              // First, we transfer the hat to the Safe, which will then be able to withdraw the funds on behalf of the original wearer.
              // Finally, we transfer the hat from the Safe to the new wearer.
              allTxs.push({
                calldata: encodeFunctionData({
                  abi: HatsAbi,
                  functionName: 'transferHat',
                  args: [BigInt(formHat.id), originalHat.wearerAddress, safeAddress],
                }),
                targetAddress: hatsProtocol,
              });

              for (const stream of streamsWithFundsToClaim) {
                if (!stream.streamId || !stream.contractAddress) {
                  throw new Error(
                    'Stream ID and Stream ContractAddress is required for flush stream transaction',
                  );
                }

                const flushStreamTxCalldata = prepareFlushStreamTxs({
                  streamId: stream.streamId,
                  to: originalHat.wearerAddress,
                  smartAccount: formHat.smartAddress,
                });

                allTxs.push(...flushStreamTxCalldata);
              }

              allTxs.push({
                calldata: encodeFunctionData({
                  abi: HatsAbi,
                  functionName: 'transferHat',
                  args: [BigInt(formHat.id), safeAddress, newWearer],
                }),
                targetAddress: hatsProtocol,
              });
            } else {
              // Since there are no streams with funds to claim, we can just transfer the hat directly to the new wearer.
              allTxs.push({
                calldata: encodeFunctionData({
                  abi: HatsAbi,
                  functionName: 'transferHat',
                  args: [BigInt(formHat.id), originalHat.wearerAddress, newWearer],
                }),
                targetAddress: hatsProtocol,
              });
            }
          }
          if (formHat.editedRole.fieldNames.includes('payments')) {
            if (!formHat.isTermed) {
              allTxs.push(...(await prepareRolePaymentUpdateTxs(formHat)));
            } else {
              allTxs.push(...prepareTermedRolePaymentUpdateTxs(formHat));
            }
          }
          if (formHat.editedRole.fieldNames.includes('newTerm')) {
            if (!formHat.isTermed || !formHat.roleTerms) {
              throw new Error('Cannot prepare transactions for edited role without role terms');
            }

            if (
              adminHatWearer === undefined ||
              !(await isDecentAutonomousAdminV1(adminHatWearer))
            ) {
              throw new Error(
                'Cannot prepare transactions for edited role without decent auto admin hat wearer',
              );
            }

            if (
              formHat.eligibility === undefined ||
              !(await isElectionEligibilityModule(
                formHat.eligibility,
                hatsElectionsEligibilityMasterCopy,
                publicClient,
              ))
            ) {
              throw new Error(
                'Cannot prepare transactions for edited role without eligibility module set',
              );
            }

            const terms = parseRoleTermsFromFormRoleTerms(formHat.roleTerms);
            // @dev {assupmtion}: We are only dealing with a single term here, either the next term or a new current term when there is no term set.
            // @dev {assupmtion}: There were always be more than one term in this workflow.
            const [newTerm, previousTerm] = terms;
            const electionsContract = getContract({
              address: formHat.eligibility,
              abi: HatsElectionsEligibilityAbi,
              client: publicClient,
            });

            const nextTermEndDateTs = await electionsContract.read.nextTermEnd();
            if (nextTermEndDateTs !== 0n) {
              // previous term was never triggered, and must be triggered before we can set the next term
              allTxs.push({
                calldata: encodeFunctionData({
                  abi: HatsElectionsEligibilityAbi,
                  functionName: 'startNextTerm',
                  args: [],
                }),
                targetAddress: formHat.eligibility,
              });
            }

            allTxs.push({
              calldata: encodeFunctionData({
                abi: HatsElectionsEligibilityAbi,
                functionName: 'setNextTerm',
                args: [newTerm.termEndDateTs],
              }),
              targetAddress: formHat.eligibility,
            });

            allTxs.push({
              calldata: encodeFunctionData({
                abi: HatsElectionsEligibilityAbi,
                functionName: 'elect',
                args: [newTerm.termEndDateTs, [newTerm.nominatedWearers[0]]],
              }),
              targetAddress: formHat.eligibility,
            });
            // current term has ended
            if (previousTerm.termEndDateTs < BigInt(Date.now()) / 1000n) {
              if (
                previousTerm.nominatedWearers[0].toLocaleLowerCase() !==
                newTerm.nominatedWearers[0].toLocaleLowerCase()
              ) {
                allTxs.push({
                  calldata: encodeFunctionData({
                    abi: abis.DecentAutonomousAdminV1,
                    functionName: 'triggerStartNextTerm',
                    args: [
                      {
                        // @dev formHat.wearer is not changeable for term roles. It will always be the current wearer.
                        currentWearer: getAddress(previousTerm.nominatedWearers[0]),
                        hatsProtocol: hatsProtocol,
                        hatId: BigInt(formHat.id),
                        nominatedWearer: newTerm.nominatedWearers[0],
                      },
                    ],
                  }),
                  targetAddress: adminHatWearer,
                });
              } else {
                allTxs.push({
                  calldata: encodeFunctionData({
                    abi: HatsElectionsEligibilityAbi,
                    functionName: 'startNextTerm',
                    args: [],
                  }),
                  targetAddress: formHat.eligibility,
                });
              }
            }
          }

          if (formHat.editedRole.fieldNames.includes('canCreateProposals')) {
            const originalHat = getHat(formHat.id);
            if (!originalHat) {
              throw new Error('Cannot find original hat');
            }
            const hatId = BigInt(originalHat.id);
            if (!originalHat.canCreateProposals && formHat.canCreateProposals) {
              whitelistingPermissionAddedHats.push(hatId);
            } else {
              whitelistingPermissionRemovedHats.push(hatId);
            }
          }
          if (formHat.editedRole.fieldNames.includes('roleType')) {
            allTxs.push(...(await prepareConvertRoleToTermedTxs(formHat)));
          }
        } else {
          throw new Error('Invalid Edited Status');
        }
      }

      const whitelistingVotingStrategyAddress =
        linearVotingErc20WithHatsWhitelistingAddress ||
        linearVotingErc721WithHatsWhitelistingAddress;
      if (whitelistingPermissionAddedHats.length > 0) {
        if (!whitelistingVotingStrategyAddress) {
          const deployWhitelistingVotingStrategyCalldata = await buildDeployWhitelistingStrategy(
            whitelistingPermissionAddedHats,
          );
          if (!deployWhitelistingVotingStrategyCalldata) {
            throw new Error(
              'Error encoding transaction for deploying whitelisting voting strategy',
            );
          }
          allTxs.push(...deployWhitelistingVotingStrategyCalldata);
        } else {
          whitelistingPermissionAddedHats.forEach(hatId => {
            allTxs.push({
              targetAddress: whitelistingVotingStrategyAddress,
              calldata: encodeFunctionData({
                abi: abis.LinearERC20VotingWithHatsProposalCreation,
                functionName: 'whitelistHat',
                args: [hatId],
              }),
            });
          });
        }
      }

      if (whitelistingPermissionRemovedHats.length > 0) {
        if (!whitelistingVotingStrategyAddress) {
          throw new Error('Can not un-whitelist role from proposal creation permission', {
            cause: {
              linearVotingErc20WithHatsWhitelistingAddress,
              linearVotingErc721WithHatsWhitelistingAddress,
            },
          });
        }
        whitelistingPermissionRemovedHats.forEach(hatId => {
          allTxs.push({
            targetAddress: whitelistingVotingStrategyAddress,
            calldata: encodeFunctionData({
              abi: abis.LinearERC20VotingWithHatsProposalCreation,
              functionName: 'removeHatFromWhitelist',
              args: [hatId],
            }),
          });
        });
      }
      return {
        targets: allTxs.map(({ targetAddress }) => targetAddress),
        calldatas: allTxs.map(({ calldata }) => calldata),
        values: allTxs.map(() => 0n),
        metaData: proposalMetadata,
      };
    },
    [
      hatsTree,
      safeAddress,
      publicClient,
      prepareAdminHatTxs,
      linearVotingErc20WithHatsWhitelistingAddress,
      linearVotingErc721WithHatsWhitelistingAddress,
      prepareNewHatTxs,
      getHat,
      hatsProtocol,
      getRoleRemovedStreamsWithFundsToClaim,
      getActiveStreamsFromFormHat,
      prepareFlushStreamTxs,
      prepareCancelStreamTxs,
      ipfsClient,
      getMemberChangedStreamsWithFundsToClaim,
      prepareRolePaymentUpdateTxs,
      prepareTermedRolePaymentUpdateTxs,
      isDecentAutonomousAdminV1,
      hatsElectionsEligibilityMasterCopy,
      parseRoleTermsFromFormRoleTerms,
      buildDeployWhitelistingStrategy,
      prepareConvertRoleToTermedTxs,
    ],
  );

  const createEditRolesProposal = useCallback(
    async (values: RoleFormValues, formikHelpers: FormikHelpers<RoleFormValues>) => {
      if (!publicClient) {
        throw new Error('Cannot create Roles proposal without public client');
      }

      if (!safe) {
        throw new Error('Cannot create Roles proposal without known Safe');
      }

      const { setSubmitting } = formikHelpers;
      setSubmitting(true);

      // filter to hats that have been modified, or whose payments have been modified (ie includes `editedRole` prop)
      const modifiedHats: RoleHatFormValueEdited[] = (
        await Promise.all(
          values.hats.map(async hat => {
            if (hat.editedRole === undefined) {
              return null;
            }
            return {
              ...hat,
              editedRole: hat.editedRole,
              wearer: hat.resolvedWearer,
            };
          }),
        )
      ).filter(hat => hat !== null);

      let proposalData: ProposalExecuteData;
      try {
        if (!hatsTreeId) {
          // This safe has no top hat, so we prepare a proposal to create one. This will also create an admin hat,
          // along with any other hats that are added.

          if (modifiedHats.some(hat => hat.editedRole.status !== EditBadgeStatus.New)) {
            throw new Error(
              'No Hats Tree ID exists, but some modified Roles are marked as non-New.',
            );
          }

          proposalData = await prepareCreateTopHatProposalData(
            values.proposalMetadata,
            modifiedHats,
          );
        } else {
          if (!hatsTree) {
            throw new Error('Cannot edit Roles without a HatsTree');
          }

          proposalData = await prepareCreateRolesModificationsProposalData(
            values.proposalMetadata,
            modifiedHats,
          );
        }

        // Add "send assets" actions to the proposal data
        values.actions.forEach(action => {
          const actionData = prepareSendAssetsActionData(action);
          proposalData.targets.push(actionData.target);
          proposalData.values.push(actionData.value);
          proposalData.calldatas.push(actionData.calldata);
        });

        // All done, submit the proposal!
        await submitProposal({
          proposalData,
          nonce: values.customNonce ?? safe.nextNonce,
          pendingToastMessage: t('proposalCreatePendingToastMessage', { ns: 'proposal' }),
          successToastMessage: t('proposalCreateSuccessToastMessage', { ns: 'proposal' }),
          failedToastMessage: t('proposalCreateFailureToastMessage', { ns: 'proposal' }),
          successCallback: () => {
            if (safeAddress) {
              navigate(DAO_ROUTES.proposals.relative(addressPrefix, safeAddress));
            }
          },
        });
      } catch (e) {
        console.error(e);
        toast.error(t('encodingFailedMessage', { ns: 'proposal' }));
      } finally {
        formikHelpers.setSubmitting(false);
      }
    },
    [
      addressPrefix,
      safeAddress,
      hatsTree,
      hatsTreeId,
      navigate,
      prepareCreateRolesModificationsProposalData,
      prepareCreateTopHatProposalData,
      publicClient,
      safe,
      submitProposal,
      t,
    ],
  );

  return {
    createEditRolesProposal,
  };
}
