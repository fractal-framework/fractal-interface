import { ReactNode } from 'react';
import { BigIntValuePair } from './common';

export enum CreateProposalSteps {
  METADATA = 'metadata',
  TRANSACTIONS = 'transactions',
  STREAMS = 'streams',
}

export interface CreateProposalTransaction<T = BigIntValuePair> {
  targetAddress: string;
  ethValue: T;
  functionName: string;
  parameters: {
    signature: string;
    label?: string;
    value?: string;
  }[];
}

export type CreateProposalMetadata = {
  title: string;
  description: string;
  documentationUrl?: string;
};

export enum ProposalBuilderMode {
  // @dev - this is temporary mode.
  // Probably will be removed in the future and actions are will be there by default.
  // UI / UX for this globally is in flux.
  PROPOSAL_WITH_ACTIONS = 'PROPOSAL_WITH_ACTIONS',
  PROPOSAL = 'PROPOSAL',
  PROPOSAL_FROM_TEMPLATE = 'PROPOSAL_FROM_TEMPLATE',
  TEMPLATE = 'TEMPLATE',
  SABLIER = 'SABLIER',
}
export type CreateProposalForm = {
  transactions: CreateProposalTransaction[];
  proposalMetadata: CreateProposalMetadata;
  nonce?: number;
};

export type Tranche = {
  amount: BigIntValuePair;
  duration: BigIntValuePair;
};

export type Stream = {
  type: 'tranched';
  tokenAddress: string;
  recipientAddress: string;
  startDate: Date;
  tranches: Tranche[];
  totalAmount: BigIntValuePair;
  cancelable: boolean;
  transferable: boolean;
};

export type CreateSablierProposalForm = {
  streams: Stream[];
} & CreateProposalForm;

export type ProposalTemplate = {
  transactions: CreateProposalTransaction[];
} & CreateProposalMetadata;

export enum ProposalActionType {
  ADD = 'add',
  EDIT = 'edit',
  DELETE = 'delete',
  TRANSFER = 'transfer',
  AIRDROP = 'airdrop',
}

export interface ProposalActionsStoreData {
  actions: CreateProposalAction[];
}

export interface ProposalActionsStore extends ProposalActionsStoreData {
  addAction: (action: CreateProposalAction) => void;
  removeAction: (actionIndex: number) => void;
  resetActions: () => void;
  getTransactions: () => CreateProposalTransaction[];
}

export type CreateProposalAction<T = BigIntValuePair> = {
  actionType: ProposalActionType;
  content: ReactNode;
  transactions: CreateProposalTransaction<T>[];
};
