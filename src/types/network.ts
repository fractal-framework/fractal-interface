import { Address, Chain } from 'viem';
import { GovernanceType } from './fractal';

export type NetworkConfig = {
  order: number; // any arbitrary integer, used to "order" the networks in the dropdown
  chain: Chain;
  rpcEndpoint: string;
  safeBaseURL: string;
  etherscanBaseURL: string;
  etherscanAPIUrl: string;
  addressPrefix: string; // copy whatever Safe uses
  nativeTokenIcon: string;
  subgraph: {
    space: number;
    slug: string;
    version: string;
  };
  // @dev - might be not supported on some chains
  sablierSubgraph?: {
    space: number;
    slug: string;
  };
  moralis: {
    chainSupported: boolean;
    deFiSupported: boolean;
  };
  contracts: {
    gnosisSafeL2Singleton: Address;
    gnosisSafeProxyFactory: Address;
    compatibilityFallbackHandler: Address;

    multiSendCallOnly: Address;

    zodiacModuleProxyFactory: Address;

    linearVotingErc20MasterCopy: Address;
    linearVotingErc20HatsWhitelistingMasterCopy: Address;
    linearVotingErc721MasterCopy: Address;
    linearVotingErc721HatsWhitelistingMasterCopy: Address;

    moduleAzoriusMasterCopy: Address;
    moduleFractalMasterCopy: Address;

    freezeGuardAzoriusMasterCopy: Address;
    freezeGuardMultisigMasterCopy: Address;

    freezeVotingErc20MasterCopy: Address;
    freezeVotingErc721MasterCopy: Address;
    freezeVotingMultisigMasterCopy: Address;

    votesErc20MasterCopy: Address;

    claimErc20MasterCopy: Address;

    decentAutonomousAdminV1MasterCopy: Address;

    keyValuePairs: Address;

    decentHatsCreationModule: Address;
    decentHatsModificationModule: Address;
    decentSablierStreamManagementModule: Address;

    hatsProtocol: Address;
    erc6551Registry: Address;
    hatsAccount1ofNMasterCopy: Address;
    hatsElectionsEligibilityMasterCopy: Address;
    sablierV2Batch: Address;
    sablierV2LockupDynamic: Address;
    sablierV2LockupTranched: Address;
    sablierV2LockupLinear: Address;
    disperse: Address;
  };
  staking: {
    lido?: {
      stETHContractAddress: Address;
      rewardsAddress: Address;
      withdrawalQueueContractAddress: Address;
    };
  };
  createOptions: GovernanceType[];
};
