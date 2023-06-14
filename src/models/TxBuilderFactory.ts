import { GnosisSafe, GnosisSafe__factory } from '@fractal-framework/fractal-contracts';
import { ethers } from 'ethers';
import { getRandomBytes } from '../helpers';
import {
  BaseContracts,
  SafeMultisigDAO,
  SafeTransaction,
  SubDAO,
  AzoriusGovernanceDAO,
  AzoriusContracts,
} from '../types';
import { AzoriusTxBuilder as AzoriusTxBuilder } from './AzoriusTxBuilder';
import { BaseTxBuilder } from './BaseTxBuilder';
import { DaoTxBuilder } from './DaoTxBuilder';
import { FreezeGuardTxBuilder } from './FreezeGuardTxBuilder';
import { MultisigTxBuilder } from './MultisigTxBuilder';
import { gnosisSafeData } from './helpers/gnosisSafeData';

export class TxBuilderFactory extends BaseTxBuilder {
  private readonly saltNum: string;

  // Gnosis Safe Data
  public predictedGnosisSafeAddress: string | undefined;
  public createSafeTx: SafeTransaction | undefined;
  private safeContract: GnosisSafe | undefined;

  constructor(
    signerOrProvider: ethers.Signer | any,
    baseContracts: BaseContracts,
    azoriusContracts: AzoriusContracts | undefined,
    daoData: SafeMultisigDAO | AzoriusGovernanceDAO | SubDAO,
    parentAddress?: string,
    parentTokenAddress?: string
  ) {
    super(
      signerOrProvider,
      baseContracts,
      azoriusContracts,
      daoData,
      parentAddress,
      parentTokenAddress
    );

    this.saltNum = getRandomBytes();
  }

  public setSafeContract(safeAddress: string) {
    const safeContract = GnosisSafe__factory.connect(safeAddress, this.signerOrProvider);
    this.safeContract = safeContract;
  }

  public async setupGnosisSafeData(): Promise<void> {
    const { predictedGnosisSafeAddress, createSafeTx } = await gnosisSafeData(
      this.baseContracts.multiSendContract,
      this.baseContracts.gnosisSafeFactoryContract,
      this.baseContracts.gnosisSafeSingletonContract,
      this.daoData as SafeMultisigDAO,
      this.saltNum,
      !!this.azoriusContracts
    );

    this.predictedGnosisSafeAddress = predictedGnosisSafeAddress;
    this.createSafeTx = createSafeTx;

    this.setSafeContract(predictedGnosisSafeAddress);
  }

  public createDaoTxBuilder(): DaoTxBuilder {
    return new DaoTxBuilder(
      this.signerOrProvider,
      this.baseContracts,
      this.azoriusContracts,
      this.daoData,
      this.saltNum,
      this.predictedGnosisSafeAddress!,
      this.createSafeTx!,
      this.safeContract!,
      this,
      this.parentAddress,
      this.parentTokenAddress
    );
  }

  public createFreezeGuardTxBuilder(
    azoriusAddress?: string,
    strategyAddress?: string
  ): FreezeGuardTxBuilder {
    return new FreezeGuardTxBuilder(
      this.signerOrProvider,
      this.baseContracts,
      this.daoData as SubDAO,
      this.safeContract!,
      this.saltNum,
      this.parentAddress!,
      this.parentTokenAddress,
      this.azoriusContracts,
      azoriusAddress,
      strategyAddress
    );
  }

  public createMultiSigTxBuilder(): MultisigTxBuilder {
    return new MultisigTxBuilder(
      this.baseContracts,
      this.daoData as SafeMultisigDAO,
      this.safeContract!
    );
  }

  public createAzoriusTxBuilder(): AzoriusTxBuilder {
    return new AzoriusTxBuilder(
      this.signerOrProvider,
      this.baseContracts,
      this.azoriusContracts!,
      this.daoData as AzoriusGovernanceDAO,
      this.safeContract!,
      this.predictedGnosisSafeAddress!,
      this.parentAddress,
      this.parentTokenAddress
    );
  }
}
