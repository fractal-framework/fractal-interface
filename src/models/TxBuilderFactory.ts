import { ethers } from 'ethers';
import { PublicClient, getAddress } from 'viem';
import { GnosisSafeL2 } from '../assets/typechain-types/usul/@gnosis.pm/safe-contracts/contracts';
import { GnosisSafeL2__factory } from '../assets/typechain-types/usul/factories/@gnosis.pm/safe-contracts/contracts';
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
  private safeContract: GnosisSafeL2 | undefined;
  public fallbackHandler: string;

  private votesERC20WrapperMasterCopyAddress: string;
  private votesERC20MasterCopyAddress: string;
  private keyValuePairsAddress: string;

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
  }

  public setSafeContract(safeAddress: string) {
    const safeContract = GnosisSafeL2__factory.connect(safeAddress, this.signerOrProvider);
    this.safeContract = safeContract;
  }

  public async setupSafeData(): Promise<void> {
    const { predictedSafeAddress, createSafeTx } = await safeData(
      this.baseContracts.multiSendContract,
      this.baseContracts.safeFactoryContract,
      this.baseContracts.safeSingletonContract,
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
      this.safeContract!,
      this,
      this.keyValuePairsAddress,
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
      this.safeContract!,
      this.saltNum,
      getAddress(this.parentAddress!),
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
      this.baseContracts,
      this.daoData as SafeMultisigDAO,
      this.safeContract!,
    );
  }

  public async createAzoriusTxBuilder(): Promise<AzoriusTxBuilder> {
    const azoriusTxBuilder = new AzoriusTxBuilder(
      this.signerOrProvider,
      this.publicClient,
      this.baseContracts,
      this.azoriusContracts!,
      this.daoData as AzoriusERC20DAO,
      this.safeContract!,
      this.votesERC20WrapperMasterCopyAddress,
      this.votesERC20MasterCopyAddress,
      this.parentAddress ? getAddress(this.parentAddress) : undefined,
      this.parentTokenAddress ? getAddress(this.parentTokenAddress) : undefined,
    );

    await azoriusTxBuilder.init();
    return azoriusTxBuilder;
  }
}
