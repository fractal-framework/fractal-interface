import { BigNumber } from 'ethers';
import { GovernanceTypes } from '../../../../providers/Fractal/types';
import { TokenAllocation } from '../../../../types/tokenAllocation';
import { BigNumberValuePair } from '../../../ui/BigNumberInput';
import { NFTToFund, TokenToFund } from '../../SubsidiaryFunding/types/index';

export enum CreatorProviderActions {
  SET_STEP,
  UPDATE_ESSENTIALS,
  UPDATE_TREASURY_GOV_TOKEN,
  UPDATE_GOVERNANCE,
  UPDATE_GNOSIS_CONFIG,
  UPDATE_GOV_CONFIG,
  UPDATE_GUARD_CONFIG,
  UPDATE_FUNDING,
  UPDATE_STEP,
  RESET,
}

export enum CreatorSteps {
  CHOOSE_GOVERNANCE,
  ESSENTIALS,
  PURE_GNOSIS,
  GNOSIS_GOVERNANCE,
  GNOSIS_WITH_USUL,
  GOV_CONFIG,
  GUARD_CONFIG,
  FUNDING,
}

export type CreatorProviderActionTypes =
  | {
      type: CreatorProviderActions.UPDATE_ESSENTIALS;
      payload: DAOEssentials;
    }
  | { type: CreatorProviderActions.UPDATE_GOVERNANCE; payload: GovernanceTypes }
  | { type: CreatorProviderActions.UPDATE_TREASURY_GOV_TOKEN; payload: DAOGovenorToken }
  | { type: CreatorProviderActions.UPDATE_GOV_CONFIG; payload: DAOGovenorModuleConfig }
  | { type: CreatorProviderActions.UPDATE_GUARD_CONFIG; payload: DAOVetoGuardConfig }
  | { type: CreatorProviderActions.UPDATE_GNOSIS_CONFIG; payload: GnosisDAO }
  | { type: CreatorProviderActions.UPDATE_FUNDING; payload: DAOFunding }
  | {
      type: CreatorProviderActions.UPDATE_STEP;
      payload: { nextStep: CreatorSteps; prevStep: CreatorSteps | null };
    }
  | {
      type: CreatorProviderActions.SET_STEP;
      payload: CreatorSteps;
    }
  | { type: CreatorProviderActions.RESET };

type DAOEssentials = {
  daoName: string;
};

type DAOGovenorToken = {
  tokenName: string;
  tokenSymbol: string;
  tokenSupply: BigNumber | undefined;
  tokenAllocations: TokenAllocation[];
  parentAllocationAmount?: BigNumber;
};

type DAOGovenorModuleConfig = {
  quorumPercentage: BigNumber;
  timelock: BigNumber;
  votingPeriod: BigNumber;
};

type DAOVetoGuardConfig = {
  executionPeriod: BigNumber;
  timelockPeriod: BigNumber;
  vetoVotesThreshold: BigNumber;
  freezeVotesThreshold: BigNumber;
  freezeProposalPeriod: BigNumber;
  freezePeriod: BigNumber;
};

type DAOFunding = {
  tokensToFund: TokenToFund[];
  nftsToFund: NFTToFund[];
};

export interface CreatorState {
  step: CreatorSteps;
  nextStep: CreatorSteps | null;
  prevStep: CreatorSteps | null;
  governance: GovernanceTypes;
  gnosis: GnosisConfig;
  essentials: DAOEssentials;
  govToken: DAOGovenorToken;
  govModule: DAOGovenorModuleConfig;
  vetoGuard: DAOVetoGuardConfig;
  funding: DAOFunding;
}

export type ICreatorContext = {
  state: CreatorState;
  dispatch: React.Dispatch<any>;
};

export interface SubDAO extends GnosisConfig, TokenGovernanceDAO {
  timelockPeriod?: BigNumber;
  executionPeriod: BigNumber;
  vetoVotesThreshold: BigNumber;
  freezeVotesThreshold: BigNumber;
  freezeProposalPeriod: BigNumber;
  freezePeriod: BigNumber;
}

export interface TokenGovernanceDAO extends DAODetails {
  tokenName: string;
  tokenSymbol: string;
  tokenSupply: BigNumber;
  tokenAllocations: TokenAllocation[];
  quorumPercentage: BigNumber;
  timelock: BigNumber;
  votingPeriod: BigNumber;
  nftsToFund: NFTToFund[];
  tokensToFund: TokenToFund[];
  parentAllocationAmount?: BigNumber;
}

export interface GnosisConfig {
  trustedAddresses: TrustedAddress[];
  signatureThreshold: string;
}

export interface GnosisDAO extends DAODetails, GnosisConfig {}

export type DAODetails = {
  daoName: string;
  governance: GovernanceTypes;
};

export type TrustedAddress = { address: string; isValidAddress: boolean; addressError?: string };

export type DAOTrigger = (daoData: GnosisDAO) => void;
