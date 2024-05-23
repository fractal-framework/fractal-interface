import { ethers } from 'ethers';
import { Address, PublicClient, getAddress, getContract } from 'viem';
import GnosisSafeL2Abi from '../assets/abi/GnosisSafeL2';
import GnosisSafeProxyFactoryAbi from '../assets/abi/GnosisSafeProxyFactory';
import { getRandomBytes } from '../helpers';
import {
  BaseContracts,
  SafeMultisigDAO,
  SafeTransaction,
  SubDAO,
  AzoriusERC721DAO,
  AzoriusContracts,
  AzoriusERC20DAO,
  VotingStrategyType,
} from '../types';
import { AzoriusTxBuilder } from './AzoriusTxBuilder';
import { BaseTxBuilder } from './BaseTxBuilder';
import { DaoTxBuilder } from './DaoTxBuilder';
import { FreezeGuardTxBuilder } from './FreezeGuardTxBuilder';
import { MultisigTxBuilder } from './MultisigTxBuilder';
import { safeData } from './helpers/safeData';

export class TxBuilderFactory extends BaseTxBuilder {
  private readonly saltNum: bigint;

  // Safe Data
  public predictedSafeAddress: string | undefined;
  public createSafeTx: SafeTransaction | undefined;
  private safeContractAddress: Address | undefined;
  public fallbackHandler: string;

  private votesERC20WrapperMasterCopyAddress: string;
  private votesERC20MasterCopyAddress: string;
  private keyValuePairsAddress: string;
  private fractalRegistryAddress: string;
  private gnosisSafeProxyFactoryAddress: string;
  private gnosisSafeSingletonAddress: string;
  private moduleProxyFactoryAddress: string;
  private multiSendCallOnlyAddress: string;
  private erc20ClaimMasterCopyAddress: string;
  private fractalModuleMasterCopyAddress: string;
  private linearERC20VotingMasterCopyAddress: string;
  private linearERC721VotingMasterCopyAddress: string;

  constructor(
    signerOrProvider: ethers.Signer | any,
    publicClient: PublicClient,
    baseContracts: BaseContracts,
    azoriusContracts: AzoriusContracts | undefined,
    daoData: SafeMultisigDAO | AzoriusERC20DAO | AzoriusERC721DAO | SubDAO,
    fallbackHandler: string,
    votesERC20WrapperMasterCopyAddress: string,
    votesERC20MasterCopyAddress: string,
    keyValuePairsAddress: string,
    fractalRegistryAddress: string,
    gnosisSafeProxyFactoryAddress: string,
    gnosisSafeSingletonAddress: string,
    moduleProxyFactoryAddress: string,
    multiSendCallOnlyAddress: string,
    erc20ClaimMasterCopyAddress: string,
    fractalModuleMasterCopyAddress: string,
    linearERC20VotingMasterCopyAddress: string,
    linearERC721VotingMasterCopyAddress: string,
    parentAddress?: string,
    parentTokenAddress?: string,
  ) {
    super(
      signerOrProvider,
      publicClient,
      baseContracts,
      azoriusContracts,
      daoData,
      parentAddress,
      parentTokenAddress,
    );

    this.fallbackHandler = fallbackHandler;
    this.saltNum = getRandomBytes();
    this.votesERC20WrapperMasterCopyAddress = votesERC20WrapperMasterCopyAddress;
    this.votesERC20MasterCopyAddress = votesERC20MasterCopyAddress;
    this.keyValuePairsAddress = keyValuePairsAddress;
    this.fractalRegistryAddress = fractalRegistryAddress;
    this.gnosisSafeProxyFactoryAddress = gnosisSafeProxyFactoryAddress;
    this.gnosisSafeSingletonAddress = gnosisSafeSingletonAddress;
    this.moduleProxyFactoryAddress = moduleProxyFactoryAddress;
    this.multiSendCallOnlyAddress = multiSendCallOnlyAddress;
    this.erc20ClaimMasterCopyAddress = erc20ClaimMasterCopyAddress;
    this.fractalModuleMasterCopyAddress = fractalModuleMasterCopyAddress;
    this.linearERC20VotingMasterCopyAddress = linearERC20VotingMasterCopyAddress;
    this.linearERC721VotingMasterCopyAddress = linearERC721VotingMasterCopyAddress;
  }

  public setSafeContract(safeAddress: Address) {
    this.safeContractAddress = safeAddress;
  }

  public async setupSafeData(): Promise<void> {
    const safeProxyFactoryContract = getContract({
      abi: GnosisSafeProxyFactoryAbi,
      address: getAddress(this.gnosisSafeProxyFactoryAddress),
      client: this.publicClient,
    });
    const safeSingletonContract = getContract({
      abi: GnosisSafeL2Abi,
      address: getAddress(this.gnosisSafeSingletonAddress),
      client: this.publicClient,
    });
    const { predictedSafeAddress, createSafeTx } = await safeData(
      getAddress(this.multiSendCallOnlyAddress),
      safeProxyFactoryContract,
      safeSingletonContract,
      this.daoData as SafeMultisigDAO,
      this.saltNum,
      this.fallbackHandler,
      !!this.azoriusContracts,
    );

    this.predictedSafeAddress = predictedSafeAddress;
    this.createSafeTx = createSafeTx;

    this.setSafeContract(predictedSafeAddress);
  }

  public createDaoTxBuilder(
    parentStrategyType?: VotingStrategyType,
    parentStrategyAddress?: string,
  ): DaoTxBuilder {
    return new DaoTxBuilder(
      this.signerOrProvider,
      this.publicClient,
      this.baseContracts,
      this.azoriusContracts,
      this.daoData,
      this.saltNum,
      this.createSafeTx!,
      this.safeContractAddress!,
      this,
      this.keyValuePairsAddress,
      this.fractalRegistryAddress,
      this.moduleProxyFactoryAddress,
      this.multiSendCallOnlyAddress,
      this.fractalModuleMasterCopyAddress,
      this.parentAddress,
      this.parentTokenAddress,
      parentStrategyType,
      parentStrategyAddress,
    );
  }

  public createFreezeGuardTxBuilder(
    azoriusAddress?: string,
    strategyAddress?: string,
    parentStrategyType?: VotingStrategyType,
    parentStrategyAddress?: string, // User only with ERC-721 parent
  ): FreezeGuardTxBuilder {
    return new FreezeGuardTxBuilder(
      this.signerOrProvider,
      this.publicClient,
      this.baseContracts,
      this.daoData as SubDAO,
      this.safeContractAddress!,
      this.saltNum,
      getAddress(this.parentAddress!),
      getAddress(this.moduleProxyFactoryAddress),
      this.parentTokenAddress ? getAddress(this.parentTokenAddress) : undefined,
      this.azoriusContracts,
      azoriusAddress ? getAddress(azoriusAddress) : undefined,
      strategyAddress ? getAddress(strategyAddress) : undefined,
      parentStrategyType,
      parentStrategyAddress ? getAddress(parentStrategyAddress) : undefined,
    );
  }

  public createMultiSigTxBuilder(): MultisigTxBuilder {
    return new MultisigTxBuilder(
      getAddress(this.multiSendCallOnlyAddress),
      this.daoData as SafeMultisigDAO,
      getAddress(this.safeContractAddress!),
    );
  }

  public async createAzoriusTxBuilder(): Promise<AzoriusTxBuilder> {
    const azoriusTxBuilder = new AzoriusTxBuilder(
      this.signerOrProvider,
      this.publicClient,
      this.baseContracts,
      this.azoriusContracts!,
      this.daoData as AzoriusERC20DAO,
      this.safeContractAddress!,
      this.votesERC20WrapperMasterCopyAddress,
      this.votesERC20MasterCopyAddress,
      getAddress(this.moduleProxyFactoryAddress),
      getAddress(this.multiSendCallOnlyAddress),
      getAddress(this.erc20ClaimMasterCopyAddress),
      getAddress(this.linearERC20VotingMasterCopyAddress),
      getAddress(this.linearERC721VotingMasterCopyAddress),
      this.parentAddress ? getAddress(this.parentAddress) : undefined,
      this.parentTokenAddress ? getAddress(this.parentTokenAddress) : undefined,
    );

    await azoriusTxBuilder.init();
    return azoriusTxBuilder;
  }
}
