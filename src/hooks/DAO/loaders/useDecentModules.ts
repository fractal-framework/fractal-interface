import { useCallback } from 'react';
import { getAddress } from 'viem';
import { DecentModule, FractalModuleType } from '../../../types';
import { useAddressContractType } from '../../utils/useAddressContractType';

export const useDecentModules = () => {
  const { getAddressContractType } = useAddressContractType();
  const lookupModules = useCallback(
    async (_moduleAddresses: string[]) => {
      const modules = await Promise.all(
        _moduleAddresses.map(async moduleAddressString => {
          const moduleAddress = getAddress(moduleAddressString);

          const masterCopyData = await getAddressContractType(moduleAddress);

          let safeModule: DecentModule;

          if (masterCopyData.isModuleAzorius) {
            safeModule = {
              moduleAddress: moduleAddress,
              moduleType: FractalModuleType.AZORIUS,
            };
          } else if (masterCopyData.isModuleFractal) {
            safeModule = {
              moduleAddress: moduleAddress,
              moduleType: FractalModuleType.FRACTAL,
            };
          } else {
            safeModule = {
              moduleAddress: moduleAddress,
              moduleType: FractalModuleType.UNKNOWN,
            };
          }

          return safeModule;
        }),
      );
      return modules;
    },
    [getAddressContractType],
  );
  return lookupModules;
};
