import { addresses } from '@fractal-framework/fractal-contracts';
import {
  getCompatibilityFallbackHandlerDeployment,
  getMultiSendCallOnlyDeployment,
  getProxyFactoryDeployment,
  getSafeL2SingletonDeployment,
} from '@safe-global/safe-deployments';
import { getAddress } from 'viem';
import { sepolia } from 'wagmi/chains';
import { GovernanceType } from '../../../types';
import { NetworkConfig } from '../../../types/network';
import { getSafeContractDeploymentAddress } from './utils';

const SAFE_VERSION = '1.3.0';

const chain = sepolia;
const a = addresses[chain.id];

export const sepoliaConfig: NetworkConfig = {
  order: 30,
  chain,
  rpcEndpoint: `https://eth-sepolia.g.alchemy.com/v2/${import.meta.env?.VITE_APP_ALCHEMY_API_KEY}`,
  safeBaseURL: 'https://safe-transaction-sepolia.safe.global',
  etherscanBaseURL: 'https://sepolia.etherscan.io',
  etherscanAPIUrl: `https://api-sepolia.etherscan.io/api?apikey=${import.meta.env?.VITE_APP_ETHERSCAN_SEPOLIA_API_KEY}`,
  addressPrefix: 'sep',
  nativeTokenIcon: '/images/coin-icon-sep.svg',
  subgraph: {
    space: 71032,
    slug: 'fractal-sepolia',
    version: 'v0.1.1',
  },
  sablierSubgraph: {
    space: 57079,
    slug: 'sablier-v2-sepolia',
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
    linearVotingErc20WrappedMasterCopy: getAddress(a.LinearERC20WrappedVoting),
    linearVotingErc20HatsWhitelistingMasterCopy: '0x4F5d44477C0Da5df31c2c5Bdd291224035708C39', // @todo - change to address from @fractal-framework/fractal-contracts
    linearVotingErc721MasterCopy: getAddress(a.LinearERC721Voting),
    linearVotingErc721HatsWhitelistingMasterCopy: '0x17C592C9Ce1ED1ba0e9a593d8c38978448D21157', // @todo - change to address from @fractal-framework/fractal-contracts

    moduleAzoriusMasterCopy: getAddress(a.Azorius),
    moduleFractalMasterCopy: getAddress(a.FractalModule),

    freezeGuardAzoriusMasterCopy: getAddress(a.AzoriusFreezeGuard),
    freezeGuardMultisigMasterCopy: getAddress(a.MultisigFreezeGuard),

    freezeVotingErc20MasterCopy: getAddress(a.ERC20FreezeVoting),
    freezeVotingErc721MasterCopy: getAddress(a.ERC721FreezeVoting),
    freezeVotingMultisigMasterCopy: getAddress(a.MultisigFreezeVoting),

    votesErc20MasterCopy: getAddress(a.VotesERC20),
    votesErc20WrapperMasterCopy: getAddress(a.VotesERC20Wrapper),

    claimErc20MasterCopy: getAddress(a.ERC20Claim),

    decentAutonomousAdminV1MasterCopy: getAddress(a.DecentAutonomousAdminV1),

    fractalRegistry: getAddress(a.FractalRegistry),
    keyValuePairs: getAddress(a.KeyValuePairs),

    decentHatsCreationModule: getAddress(a.DecentHatsCreationModule),
    decentHatsModificationModule: getAddress(a.DecentHatsModificationModule),
    decentSablierStreamManagementModule: getAddress(a.DecentSablierStreamManagementModule),

    hatsProtocol: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137',
    erc6551Registry: '0x000000006551c19487814612e58FE06813775758',
    hatsAccount1ofNMasterCopy: '0xfEf83A660b7C10a3EdaFdCF62DEee1fD8a875D29',
    hatsElectionsEligibilityMasterCopy: '0xd3b916a8F0C4f9D1d5B6Af29c3C012dbd4f3149E',
    sablierV2Batch: '0x04A9c14b7a000640419aD5515Db4eF4172C00E31',
    sablierV2LockupDynamic: '0x73BB6dD3f5828d60F8b3dBc8798EB10fbA2c5636',
    sablierV2LockupTranched: '0x3a1beA13A8C24c0EA2b8fAE91E4b2762A59D7aF5',
    sablierV2LockupLinear: '0x3E435560fd0a03ddF70694b35b673C25c65aBB6C',
  },
  staking: {},
  moralis: {
    chainSupported: true,
    deFiSupported: false,
  },
  createOptions: [
    GovernanceType.MULTISIG,
    GovernanceType.AZORIUS_ERC20,
    GovernanceType.AZORIUS_ERC721,
  ],
};

export default sepoliaConfig;
