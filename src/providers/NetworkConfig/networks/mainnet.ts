import { addresses } from '@fractal-framework/fractal-contracts';
import {
  getCompatibilityFallbackHandlerDeployment,
  getMultiSendCallOnlyDeployment,
  getProxyFactoryDeployment,
  getSafeL2SingletonDeployment,
} from '@safe-global/safe-deployments';
import { getAddress } from 'viem';
import { mainnet } from 'wagmi/chains';
import { GovernanceType } from '../../../types';
import { NetworkConfig } from '../../../types/network';
import { getSafeContractDeploymentAddress } from './utils';

const SAFE_VERSION = '1.3.0';

const chain = mainnet;
const a = addresses[chain.id];

export const mainnetConfig: NetworkConfig = {
  order: 0,
  chain,
  rpcEndpoint: `https://eth-mainnet.g.alchemy.com/v2/${import.meta.env?.VITE_APP_ALCHEMY_API_KEY}`,
  safeBaseURL: 'https://safe-transaction-mainnet.safe.global',
  etherscanBaseURL: 'https://etherscan.io',
  etherscanAPIUrl: `https://api.etherscan.io/api?apikey=${import.meta.env?.VITE_APP_ETHERSCAN_MAINNET_API_KEY}`,
  addressPrefix: 'eth',
  nativeTokenIcon: '/images/coin-icon-eth.svg',
  subgraph: {
    space: 71032,
    slug: 'fractal-mainnet',
    version: 'v0.1.2',
  },
  sablierSubgraph: {
    space: 57079,
    slug: 'sablier-v2',
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
    sablierV2Batch: '0xB5Ec9706C3Be9d22326D208f491E5DEef7C8d9f0',
    sablierV2LockupDynamic: '0x9DeaBf7815b42Bf4E9a03EEc35a486fF74ee7459',
    sablierV2LockupTranched: '0xf86B359035208e4529686A1825F2D5BeE38c28A8',
    sablierV2LockupLinear: '0x3962f6585946823440d274aD7C719B02b49DE51E',
    disperse: '0xD152f549545093347A162Dce210e7293f1452150',
  },
  staking: {
    lido: {
      rewardsAddress: '0x8202E3cBa328CCf3eeA5bF0A11596c5297Cf7525',
      stETHContractAddress: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
      withdrawalQueueContractAddress: '0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1',
    },
  },
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

export default mainnetConfig;
