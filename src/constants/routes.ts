import { Hex } from 'viem';

export const BASE_ROUTES = {
  landing: '/',
  create: '/create/essentials',
};

const getDaoQueryParam = (addressPrefix: string, safeAddress: string) =>
  `?dao=${addressPrefix}:${safeAddress}`;

const getRoleQueryParam = (addressPrefix: string, safeAddress: string, hatId: Hex) =>
  `${getDaoQueryParam(addressPrefix, safeAddress)}&hatId=${hatId}`;

export const DAO_ROUTES = {
  dao: {
    relative: (addressPrefix: string, safeAddress: string) =>
      `/home${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'home',
  },
  newSubDao: {
    relative: (addressPrefix: string, safeAddress: string) =>
      `/new/essentials${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'new/essentials',
  },
  modifyGovernance: {
    relative: (addressPrefix: string, safeAddress: string) =>
      `/edit/governance/essentials${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'edit/governance/essentials',
  },
  hierarchy: {
    relative: (addressPrefix: string, safeAddress: string) =>
      `/hierarchy${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'hierarchy',
  },
  roles: {
    relative: (addressPrefix: string, safeAddress: string) =>
      `/roles${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'roles',
  },
  rolesDetails: {
    relative: (addressPrefix: string, safeAddress: string, hatId: Hex) =>
      `/roles/details${getRoleQueryParam(addressPrefix, safeAddress, hatId)}`,
    path: 'roles/details',
  },
  rolesEdit: {
    relative: (addressPrefix: string, safeAddress: string) =>
      `/roles/edit${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'roles/edit',
  },
  rolesEditDetails: {
    relative: (addressPrefix: string, safeAddress: string, hatId: Hex) =>
      `/roles/edit/details${getRoleQueryParam(addressPrefix, safeAddress, hatId)}`,
    path: 'roles/edit/details',
  },
  rolesEditCreateProposalSummary: {
    relative: (addressPrefix: string, safeAddress: string) =>
      `/roles/edit/summary${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'roles/edit/summary',
  },
  treasury: {
    relative: (addressPrefix: string, safeAddress: string) =>
      `/treasury${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'treasury',
  },
  proposals: {
    relative: (addressPrefix: string, safeAddress: string) =>
      `/proposals${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'proposals',
  },
  proposal: {
    relative: (addressPrefix: string, safeAddress: string, proposalId: string) =>
      `/proposals/${proposalId}${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'proposals/:proposalId',
  },
  proposalNew: {
    relative: (addressPrefix: string, safeAddress: string) =>
      `/proposals/new/metadata${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'proposals/new/metadata',
  },
  proposalWithActionsNew: {
    relative: (addressPrefix: string, daoAddress: string) =>
      `/proposals/actions/new/metadata${getDaoQueryParam(addressPrefix, daoAddress)}`,
    path: 'proposals/actions/new/metadata',
  },
  proposalSablierNew: {
    relative: (addressPrefix: string, daoAddress: string) =>
      `/proposals/new/sablier/metadata${getDaoQueryParam(addressPrefix, daoAddress)}`,
    path: 'proposals/new/sablier/metadata',
  },
  settings: {
    relative: (addressPrefix: string, safeAddress: string) =>
      `/settings${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'settings',
  },
  settingsGeneral: {
    relative: (addressPrefix: string, daoAddress: string) =>
      `/settings/general${getDaoQueryParam(addressPrefix, daoAddress)}`,
    path: 'general',
  },
  settingsGovernance: {
    relative: (addressPrefix: string, daoAddress: string) =>
      `/settings/governance${getDaoQueryParam(addressPrefix, daoAddress)}`,
    path: 'governance',
  },
  settingsModulesAndGuard: {
    relative: (addressPrefix: string, daoAddress: string) =>
      `/settings/modules-and-guard${getDaoQueryParam(addressPrefix, daoAddress)}`,
    path: 'modules-and-guard',
  },
  settingsPermissions: {
    relative: (addressPrefix: string, daoAddress: string) =>
      `/settings/permissions${getDaoQueryParam(addressPrefix, daoAddress)}`,
    path: 'permissions',
  },
  settingsPermissionsCreateProposal: {
    relative: (addressPrefix: string, daoAddress: string, votingStrategyAddress?: string) =>
      `/settings/permissions/create-proposal${getDaoQueryParam(addressPrefix, daoAddress)}${votingStrategyAddress ? `&votingStrategy=${votingStrategyAddress}` : ''}`,
    path: 'create-proposal',
  },
  proposalTemplates: {
    relative: (addressPrefix: string, safeAddress: string) =>
      `/proposal-templates${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'proposal-templates',
  },
  proposalTemplate: {
    relative: (addressPrefix: string, safeAddress: string, proposalTemplateKey: string) =>
      `/proposal-templates/${proposalTemplateKey}${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'proposal-templates/:proposalTemplateKey',
  },
  proposalTemplateNew: {
    relative: (addressPrefix: string, safeAddress: string) =>
      `/proposal-templates/new/metadata${getDaoQueryParam(addressPrefix, safeAddress)}`,
    path: 'proposal-templates/new/metadata',
  },
};
