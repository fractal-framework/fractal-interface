import { ModuleProxyFactory } from '@fractal-framework/fractal-contracts';
import { constants, utils } from 'ethers';
import { useCallback } from 'react';
import { getEventRPC } from '../../../helpers';
import { useFractal } from '../../../providers/App/AppProvider';
import { FractalModuleData, FractalModuleType } from '../../../types';

export const useFractalModules = () => {
  const {
    baseContracts: {
      zodiacModuleProxyFactoryContract,
      fractalAzoriusMasterCopyContract,
      fractalModuleMasterCopyContract,
    },
  } = useFractal();

  const lookupModules = useCallback(
    async (_moduleAddresses: string[]) => {
      const rpc = getEventRPC<ModuleProxyFactory>(zodiacModuleProxyFactoryContract);
      const getMasterCopyAddress = async (proxyAddress: string): Promise<string> => {
        const filter = rpc.filters.ModuleProxyCreation(proxyAddress, null);
        return rpc.queryFilter(filter).then(proxiesCreated => {
          if (proxiesCreated.length === 0) return constants.AddressZero;
          return proxiesCreated[0].args.masterCopy;
        });
      };

      const modules = await Promise.all(
        _moduleAddresses.map(async moduleAddress => {
          const masterCopyAddress = await getMasterCopyAddress(moduleAddress);

          let safeModule: FractalModuleData;

          if (
            utils.getAddress(masterCopyAddress) ===
            fractalAzoriusMasterCopyContract.asProvider.address
          ) {
            safeModule = {
              moduleContract: fractalAzoriusMasterCopyContract.asProvider.attach(moduleAddress),
              moduleAddress: moduleAddress,
              moduleType: FractalModuleType.AZORIUS,
            };
          } else if (masterCopyAddress === fractalModuleMasterCopyContract.asProvider.address) {
            safeModule = {
              moduleContract: fractalModuleMasterCopyContract.asProvider.attach(moduleAddress),
              moduleAddress: moduleAddress,
              moduleType: FractalModuleType.FRACTAL,
            };
          } else {
            safeModule = {
              moduleContract: undefined,
              moduleAddress: moduleAddress,
              moduleType: FractalModuleType.UNKNOWN,
            };
          }

          return safeModule;
        })
      );
      return modules;
    },
    [
      zodiacModuleProxyFactoryContract,
      fractalAzoriusMasterCopyContract,
      fractalModuleMasterCopyContract,
    ]
  );
  return lookupModules;
};
