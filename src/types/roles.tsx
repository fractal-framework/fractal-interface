import { Tree } from '@hatsprotocol/sdk-v1-subgraph';
import { Address, Hex, PublicClient } from 'viem';
import { SendAssetsData } from '../components/ui/modals/SendAssetsModal';
import { BigIntValuePair } from './common';
import { CreateProposalMetadata } from './proposalBuilder';

export interface DecentHat {
  id: Hex;
  prettyId: string;
  name: string;
  description: string;
  smartAddress: Address;
  eligibility?: Address;
  payments?: SablierPayment[];
  canCreateProposals: boolean;
}

export interface DecentTopHat extends DecentHat {}

export interface DecentAdminHat extends DecentHat {
  wearer?: Address;
}

export type RoleTerm = {
  nominee: Address;
  termEndDate: Date;
  termNumber: number;
};

export type DecentRoleHatTerms = {
  allTerms: RoleTerm[];
  currentTerm: (RoleTerm & { termStatus: 'active' | 'inactive' }) | undefined;
  nextTerm: RoleTerm | undefined;
  expiredTerms: RoleTerm[];
};

export interface DecentRoleHat extends Omit<DecentHat, 'smartAddress'> {
  wearerAddress: Address;
  eligibility?: Address;
  smartAddress?: Address;
  roleTerms: DecentRoleHatTerms;
  isTermed: boolean;
}

export interface DecentTree {
  topHat: DecentTopHat;
  adminHat: DecentAdminHat;
  roleHats: DecentRoleHat[];
}

export interface SablierPayment {
  streamId: string;
  contractAddress: Address;
  recipient: Address;
  asset: {
    address: Address;
    name: string;
    symbol: string;
    decimals: number;
    logo: string;
  };
  amount: BigIntValuePair;
  startDate: Date;
  endDate: Date;
  cliffDate: Date | undefined;
  isStreaming: () => boolean;
  isCancellable: () => boolean;
  withdrawableAmount: bigint;
  isCancelled: boolean;
}

export interface SablierPaymentFormValues extends Partial<SablierPayment> {
  isStreaming: () => boolean;
  isCancellable: () => boolean;
  isCancelling?: boolean;
}

export interface RoleProps {
  handleRoleClick: () => void;
  name: string;
  wearerAddress?: Address;
  paymentsCount?: number;
  isTermed: boolean;
  currentRoleTermStatus?: 'active' | 'inactive';
}

export interface RoleEditProps
  extends Omit<
    RoleProps,
    'hatId' | 'handleRoleClick' | 'paymentsCount' | 'name' | 'currentRoleTermStatus' | 'isTermed'
  > {
  name?: string;
  handleRoleClick: () => void;
  editStatus?: EditBadgeStatus;
  payments?: SablierPaymentFormValues[];
}

export interface RoleDetailsDrawerRoleHatProp
  extends Omit<DecentRoleHat, 'payments' | 'smartAddress'> {
  smartAddress?: Address;
  payments?: (Omit<SablierPayment, 'contractAddress' | 'streamId'> & {
    contractAddress?: Address;
    streamId?: string;
  })[];
}

export interface RoleDetailsDrawerEditingRoleHatProp
  extends Omit<RoleDetailsDrawerRoleHatProp, 'wearerAddress'> {
  wearer: string;
}

export enum EditBadgeStatus {
  Updated,
  New,
  Removed,
  NewTermedRole,
  Inactive,
}
export const BadgeStatus: Record<EditBadgeStatus, string> = {
  [EditBadgeStatus.Updated]: 'updated',
  [EditBadgeStatus.New]: 'new',
  [EditBadgeStatus.Removed]: 'removed',
  [EditBadgeStatus.NewTermedRole]: 'newTermedRole',
  [EditBadgeStatus.Inactive]: 'Inactive',
};
export const BadgeStatusColor: Record<EditBadgeStatus, string> = {
  [EditBadgeStatus.Updated]: 'lilac-0',
  [EditBadgeStatus.New]: 'celery--2',
  [EditBadgeStatus.Removed]: 'red-1',
  [EditBadgeStatus.NewTermedRole]: 'celery--2',
  [EditBadgeStatus.Inactive]: 'neutral-6',
};

export interface TermedParams {
  termEndDateTs: bigint;
  nominatedWearers: Address[];
}

export enum RoleFormTermStatus {
  ReadyToStart,
  Current,
  Queued,
  Expired,
  Pending,
}
export interface HatStruct {
  maxSupply: 1; // No more than this number of wearers. Hardcode to 1
  details: string; // IPFS url/hash to JSON { version: '1.0', data: { name, description, ...arbitraryData } }
  imageURI: string;
  isMutable: boolean; // true
  wearer: Address;
  termEndDateTs: bigint; // 0 for non-termed roles
}

export interface HatStructWithPayments extends HatStruct {
  sablierStreamsParams: {
    sablier: Address;
    sender: Address;
    totalAmount: bigint;
    asset: Address;
    cancelable: boolean;
    transferable: boolean;
    timestamps: { start: number; cliff: number; end: number };
    broker: { account: Address; fee: bigint };
  }[];
}

export type EditedRoleFieldNames =
  | 'roleName'
  | 'roleDescription'
  | 'member'
  | 'payments'
  | 'roleType'
  | 'newTerm'
  | 'canCreateProposals';
export interface EditedRole {
  fieldNames: EditedRoleFieldNames[];
  status: EditBadgeStatus;
}

export interface RoleHatFormValue
  extends Partial<Omit<DecentRoleHat, 'id' | 'wearerAddress' | 'payments' | 'roleTerms'>> {
  id: Hex;
  wearer?: string;
  // Not a user-input field.
  // `resolvedWearer` is auto-populated from the resolved address of `wearer` in case it's an ENS name.
  resolvedWearer?: Address;
  payments?: SablierPaymentFormValues[];
  // form specific state
  editedRole?: EditedRole;
  roleEditingPaymentIndex?: number;
  isTermed?: boolean;
  roleTerms?: {
    nominee?: string;
    termEndDate?: Date;
    termNumber: number;
  }[];
  canCreateProposals: boolean;
}

export interface RoleHatFormValueEdited extends RoleHatFormValue {
  editedRole: EditedRole;
}

export type RoleFormValues = {
  proposalMetadata: CreateProposalMetadata;
  hats: RoleHatFormValue[];
  roleEditing?: RoleHatFormValue;
  customNonce?: number;
  actions: SendAssetsData[];
  newRoleTerm?: {
    nominee: string;
    termEndDate: Date;
    termNumber: number;
  };
};

export type PreparedNewStreamData = {
  recipient: Address;
  startDateTs: number;
  endDateTs: number;
  cliffDateTs: number;
  totalAmount: bigint;
  assetAddress: Address;
};

export interface RoleDetailsDrawerProps {
  roleHat: RoleDetailsDrawerRoleHatProp | RoleDetailsDrawerEditingRoleHatProp;
  onOpen?: () => void;
  onClose: () => void;
  onEdit: (hatId: Hex) => void;
  isOpen?: boolean;
}

export interface RolesStoreData {
  hatsTreeId: undefined | null | number;
  decentHatsAddress: Address | null | undefined;
  hatsTree: undefined | null | DecentTree;
  streamsFetched: boolean;
  contextChainId: number | null;
}

export interface RolesStore extends RolesStoreData {
  getHat: (hatId: Hex) => DecentRoleHat | null;
  getPayment: (hatId: Hex, streamId: string) => SablierPayment | null;
  setHatsTreeId: (args: { contextChainId: number | null; hatsTreeId?: number | null }) => void;
  setHatsTree: (params: {
    hatsTree: Tree | null | undefined;
    chainId: bigint;
    hatsProtocol: Address;
    erc6551Registry: Address;
    hatsAccountImplementation: Address;
    hatsElectionsImplementation: Address;
    publicClient: PublicClient;
    whitelistingVotingStrategy?: Address;
  }) => Promise<void>;
  refreshWithdrawableAmount: (hatId: Hex, streamId: string, publicClient: PublicClient) => void;
  updateRolesWithStreams: (updatedRolesWithStreams: DecentRoleHat[]) => void;
  updateCurrentTermStatus: (hatId: Hex, termStatus: 'active' | 'inactive') => void;
  resetHatsStore: () => void;
}