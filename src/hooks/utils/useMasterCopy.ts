import { ModuleProxyFactory } from '@fractal-framework/fractal-contracts';
import { Contract } from 'ethers';
import { useCallback } from 'react';
import { Address, zeroAddress } from 'viem';
import { getEventRPC } from '../../helpers';
import { useFractal } from '../../providers/App/AppProvider';
import { CacheExpiry, CacheKeys } from './cache/cacheDefaults';
import { useLocalStorage } from './cache/useLocalStorage';

export function useMasterCopy() {
  const { getValue, setValue } = useLocalStorage();
  const { baseContracts } = useFractal();

  const isOzLinearVoting = useCallback(
    (masterCopyAddress: Address) =>
      masterCopyAddress === baseContracts?.linearVotingMasterCopyContract.asProvider.address,
    [baseContracts],
  );
  const isOzLinearVotingERC721 = useCallback(
    (masterCopyAddress: Address) =>
      masterCopyAddress === baseContracts?.linearVotingERC721MasterCopyContract.asProvider.address,
    [baseContracts],
  );
  const isMultisigFreezeGuard = useCallback(
    (masterCopyAddress: Address) =>
      masterCopyAddress === baseContracts?.multisigFreezeGuardMasterCopyContract.asProvider.address,
    [baseContracts],
  );
  const isMultisigFreezeVoting = useCallback(
    (masterCopyAddress: Address) =>
      masterCopyAddress ===
      baseContracts?.freezeMultisigVotingMasterCopyContract.asProvider.address,
    [baseContracts],
  );
  const isERC721FreezeVoting = useCallback(
    (masterCopyAddress: Address) =>
      masterCopyAddress === baseContracts?.freezeERC721VotingMasterCopyContract.asProvider.address,
    [baseContracts],
  );
  const isAzorius = useCallback(
    (masterCopyAddress: Address) =>
      masterCopyAddress === baseContracts?.fractalAzoriusMasterCopyContract.asProvider.address,
    [baseContracts],
  );
  const isFractalModule = useCallback(
    (masterCopyAddress: Address) =>
      masterCopyAddress === baseContracts?.fractalModuleMasterCopyContract.asProvider.address,
    [baseContracts],
  );

  const getMasterCopyAddress = useCallback(
    async function (contract: Contract, proxyAddress: Address): Promise<[Address, string | null]> {
      const cachedValue = getValue(CacheKeys.MASTER_COPY_PREFIX + proxyAddress);
      if (cachedValue) return [cachedValue, null] as const;

      const filter = contract.filters.ModuleProxyCreation(proxyAddress, null);
      return contract.queryFilter(filter).then(proxiesCreated => {
        // @dev to prevent redundant queries, cache the master copy address as AddressZero if no proxies were created
        if (proxiesCreated.length === 0) {
          setValue(CacheKeys.MASTER_COPY_PREFIX + proxyAddress, zeroAddress, CacheExpiry.ONE_WEEK);
          return [zeroAddress, 'No proxies created'] as const;
        }
        const masterCopyAddress = proxiesCreated[0].args!.masterCopy;
        setValue(CacheKeys.MASTER_COPY_PREFIX + proxyAddress, masterCopyAddress);
        return [masterCopyAddress, null] as const;
      });
    },
    [getValue, setValue],
  );

  const getZodiacModuleProxyMasterCopyData = useCallback(
    async function (proxyAddress: Address) {
      let masterCopyAddress: Address = zeroAddress;
      let error;
      if (baseContracts) {
        // TODO after removing this moduleproxyfactorycontract from basecontracts, kill getEventRPC
        const contract = getEventRPC<ModuleProxyFactory>(
          baseContracts?.zodiacModuleProxyFactoryContract,
        );
        [masterCopyAddress, error] = await getMasterCopyAddress(contract, proxyAddress);
        if (error) {
          console.error(error);
        }
      }
      return {
        address: masterCopyAddress,
        isOzLinearVoting: isOzLinearVoting(masterCopyAddress),
        isOzLinearVotingERC721: isOzLinearVotingERC721(masterCopyAddress),
        isMultisigFreezeGuard: isMultisigFreezeGuard(masterCopyAddress),
        isMultisigFreezeVoting: isMultisigFreezeVoting(masterCopyAddress),
        isERC721FreezeVoting: isERC721FreezeVoting(masterCopyAddress),
        isAzorius: isAzorius(masterCopyAddress),
        isFractalModule: isFractalModule(masterCopyAddress),
      };
    },
    [
      getMasterCopyAddress,
      isAzorius,
      isFractalModule,
      isERC721FreezeVoting,
      isMultisigFreezeGuard,
      isMultisigFreezeVoting,
      isOzLinearVoting,
      isOzLinearVotingERC721,
      baseContracts,
    ],
  );

  return { getZodiacModuleProxyMasterCopyData };
}
