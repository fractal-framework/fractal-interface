import { addresses } from '@fractal-framework/fractal-contracts';
import {
  getCompatibilityFallbackHandlerDeployment,
  getMultiSendCallOnlyDeployment,
  getProxyFactoryDeployment,
  getSafeL2SingletonDeployment,
} from '@safe-global/safe-deployments';
import { getAddress } from 'viem';
import { polygon } from 'wagmi/chains';
import { GovernanceType } from '../../../types';
import { NetworkConfig } from '../../../types/network';
import { getSafeContractDeploymentAddress } from './utils';

const SAFE_VERSION = '1.3.0';

const chain = polygon;
const a = addresses[chain.id];

export const polygonConfig: NetworkConfig = {
  order: 20,
  chain,
  rpcEndpoint: `https://polygon-mainnet.g.alchemy.com/v2/${import.meta.env?.VITE_APP_ALCHEMY_API_KEY}`,
  safeBaseURL: 'https://safe-transaction-polygon.safe.global',
  etherscanBaseURL: 'https://polygonscan.com',
  etherscanAPIUrl: `https://api.polygonscan.com/api?apikey=${import.meta.env?.VITE_APP_ETHERSCAN_POLYGON_API_KEY}`,
  addressPrefix: 'matic',
  nativeTokenIcon: '/images/coin-icon-pol.svg',
  subgraph: {
    space: 71032,
    slug: 'fractal-base-polygon',
    version: 'v0.1.2',
  },
  sablierSubgraph: {
    space: 57079,
    slug: 'sablier-v2-polygon',
  },
  contracts: {
    gnosisSafeL2Singleton: getSafeContractDeploymentAddress(
      getSafeL2SingletonDeployment,
      SAFE_VERSION,
      chain.id.toString(),
    ),
    gnosisSafeProxyFactory: getSafeContractDeploymentAddress(
      getProxyFactoryDeployment,
      SAFE_VERSION,
      chain.id.toString(),
    ),
    compatibilityFallbackHandler: getSafeContractDeploymentAddress(
      getCompatibilityFallbackHandlerDeployment,
      SAFE_VERSION,
      chain.id.toString(),
    ),
    multiSendCallOnly: getSafeContractDeploymentAddress(
      getMultiSendCallOnlyDeployment,
      SAFE_VERSION,
      chain.id.toString(),
    ),

    zodiacModuleProxyFactory: '0x000000000000aDdB49795b0f9bA5BC298cDda236',

    linearVotingErc20MasterCopy: getAddress(a.LinearERC20Voting),
    linearVotingErc20HatsWhitelistingMasterCopy: getAddress(
      a.LinearERC20VotingWithHatsProposalCreation,
    ),
    linearVotingErc721MasterCopy: getAddress(a.LinearERC721Voting),
    linearVotingErc721HatsWhitelistingMasterCopy: getAddress(
      a.LinearERC721VotingWithHatsProposalCreation,
    ),

    moduleAzoriusMasterCopy: getAddress(a.Azorius),
    moduleFractalMasterCopy: getAddress(a.FractalModule),

    freezeGuardAzoriusMasterCopy: getAddress(a.AzoriusFreezeGuard),
    freezeGuardMultisigMasterCopy: getAddress(a.MultisigFreezeGuard),

    freezeVotingErc20MasterCopy: getAddress(a.ERC20FreezeVoting),
    freezeVotingErc721MasterCopy: getAddress(a.ERC721FreezeVoting),
    freezeVotingMultisigMasterCopy: getAddress(a.MultisigFreezeVoting),

    votesErc20MasterCopy: getAddress(a.VotesERC20),

    claimErc20MasterCopy: getAddress(a.ERC20Claim),

    decentAutonomousAdminV1MasterCopy: getAddress(a.DecentAutonomousAdminV1),

    keyValuePairs: getAddress(a.KeyValuePairs),

    decentHatsCreationModule: getAddress(a.DecentHatsCreationModule),
    decentHatsModificationModule: getAddress(a.DecentHatsModificationModule),
    decentSablierStreamManagementModule: getAddress(a.DecentSablierStreamManagementModule),

    hatsProtocol: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137',
    erc6551Registry: '0x000000006551c19487814612e58FE06813775758',
    hatsAccount1ofNMasterCopy: '0xfEf83A660b7C10a3EdaFdCF62DEee1fD8a875D29',
    hatsElectionsEligibilityMasterCopy: '0xd3b916a8F0C4f9D1d5B6Af29c3C012dbd4f3149E',
    sablierV2Batch: '0x6cd7bB0f63aFCc9F6CeDd1Bf1E3Bd4ED078CD019',
    sablierV2LockupDynamic: '0x4994325F8D4B4A36Bd643128BEb3EC3e582192C0',
    sablierV2LockupTranched: '0xBF67f0A1E847564D0eFAD475782236D3Fa7e9Ec2',
    sablierV2LockupLinear: '0x8D4dDc187a73017a5d7Cef733841f55115B13762',
    disperse: '0xD152f549545093347A162Dce210e7293f1452150',
  },
  staking: {},
  moralis: {
    chainSupported: true,
    deFiSupported: true,
  },
  createOptions: [
    GovernanceType.MULTISIG,
    GovernanceType.AZORIUS_ERC20,
    GovernanceType.AZORIUS_ERC721,
  ],
};

export default polygonConfig;
