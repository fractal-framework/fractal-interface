import { useCallback } from 'react';
import { Address, getContract, zeroAddress } from 'viem';
import { usePublicClient } from 'wagmi';
import { useNetworkConfig } from '../../providers/NetworkConfig/NetworkConfigProvider';
import { CacheExpiry, CacheKeys } from './cache/cacheDefaults';
import { useLocalStorage } from './cache/useLocalStorage';

export function useMasterCopy() {
  const { getValue, setValue } = useLocalStorage();
  const {
    contracts: {
      zodiacModuleProxyFactory,
      linearVotingErc20MasterCopy,
      linearVotingErc721MasterCopy,
      moduleFractalMasterCopy,
      moduleAzoriusMasterCopy,
      freezeGuardMultisigMasterCopy,
      freezeVotingErc721MasterCopy,
      freezeVotingMultisigMasterCopy,
    },
  } = useNetworkConfig();
  const publicClient = usePublicClient();

  const isLinearVotingErc20 = useCallback(
    (masterCopyAddress: Address) => masterCopyAddress === linearVotingErc20MasterCopy,
    [linearVotingErc20MasterCopy],
  );
  const isLinearVotingErc721 = useCallback(
    (masterCopyAddress: Address) => masterCopyAddress === linearVotingErc721MasterCopy,
    [linearVotingErc721MasterCopy],
  );
  const isFreezeGuardMultisig = useCallback(
    (masterCopyAddress: Address) => masterCopyAddress === freezeGuardMultisigMasterCopy,
    [freezeGuardMultisigMasterCopy],
  );
  const isFreezeVotingMultisig = useCallback(
    (masterCopyAddress: Address) => masterCopyAddress === freezeVotingMultisigMasterCopy,
    [freezeVotingMultisigMasterCopy],
  );
  const isFreezeVotingErc721 = useCallback(
    (masterCopyAddress: Address) => masterCopyAddress === freezeVotingErc721MasterCopy,
    [freezeVotingErc721MasterCopy],
  );
  const isModuleAzorius = useCallback(
    (masterCopyAddress: Address) => masterCopyAddress === moduleAzoriusMasterCopy,
    [moduleAzoriusMasterCopy],
  );
  const isModuleFractal = useCallback(
    (masterCopyAddress: Address) => masterCopyAddress === moduleFractalMasterCopy,
    [moduleFractalMasterCopy],
  );

  const getMasterCopyAddress = useCallback(
    async function (proxyAddress: Address): Promise<readonly [Address, string | null]> {
      if (!publicClient) {
        return [zeroAddress, null] as const;
      }

      const cachedValue = getValue(CacheKeys.MASTER_COPY_PREFIX + proxyAddress);
      if (cachedValue) {
        return [cachedValue, null] as const;
      }

      const moduleProxyFactoryContract = getContract({
        abi: zodiacModuleProxyFactory.abi,
        address: zodiacModuleProxyFactory.address,
        client: publicClient,
      });

      return moduleProxyFactoryContract.getEvents
        .ModuleProxyCreation({ proxy: proxyAddress })
        .then(proxiesCreated => {
          // @dev to prevent redundant queries, cache the master copy address as AddressZero if no proxies were created
          if (proxiesCreated.length === 0) {
            setValue(
              CacheKeys.MASTER_COPY_PREFIX + proxyAddress,
              zeroAddress,
              CacheExpiry.ONE_WEEK,
            );
            return [zeroAddress, 'No proxies created'] as const;
          }

          const masterCopyAddress = proxiesCreated[0].args.masterCopy;
          if (!masterCopyAddress) {
            return [zeroAddress, 'No master copy address'] as const;
          }

          setValue(CacheKeys.MASTER_COPY_PREFIX + proxyAddress, masterCopyAddress);
          return [masterCopyAddress, null] as const;
        })
        .catch(() => {
          return [zeroAddress, 'error'] as const;
        });
    },
    [getValue, publicClient, setValue, zodiacModuleProxyFactory],
  );

  const getZodiacModuleProxyMasterCopyData = useCallback(
    async function (proxyAddress: Address) {
      let masterCopyAddress: Address = zeroAddress;
      let error;

      [masterCopyAddress, error] = await getMasterCopyAddress(proxyAddress);
      if (error) {
        console.error(error);
      }

      return {
        address: masterCopyAddress,
        isLinearVotingErc20: isLinearVotingErc20(masterCopyAddress),
        isLinearVotingErc721: isLinearVotingErc721(masterCopyAddress),
        isFreezeGuardMultisig: isFreezeGuardMultisig(masterCopyAddress),
        isFreezeVotingMultisig: isFreezeVotingMultisig(masterCopyAddress),
        isFreezeVotingErc721: isFreezeVotingErc721(masterCopyAddress),
        isModuleAzorius: isModuleAzorius(masterCopyAddress),
        isModuleFractal: isModuleFractal(masterCopyAddress),
      };
    },
    [
      getMasterCopyAddress,
      isModuleAzorius,
      isFreezeVotingErc721,
      isModuleFractal,
      isFreezeGuardMultisig,
      isFreezeVotingMultisig,
      isLinearVotingErc20,
      isLinearVotingErc721,
    ],
  );

  return { getZodiacModuleProxyMasterCopyData };
}
