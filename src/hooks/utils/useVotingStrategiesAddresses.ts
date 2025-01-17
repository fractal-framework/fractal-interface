import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback } from 'react';
import { Address, getContract, zeroAddress } from 'viem';
import { SENTINEL_ADDRESS } from '../../constants/common';
import { useSafeAPI } from '../../providers/App/hooks/useSafeAPI';
import { useDaoInfoStore } from '../../store/daoInfo/useDaoInfoStore';
import { DecentModule } from '../../types';
import { getAzoriusModuleFromModules } from '../../utils';
import { useDecentModules } from '../DAO/loaders/useDecentModules';
import useNetworkPublicClient from '../useNetworkPublicClient';
import { useAddressContractType } from './useAddressContractType';

const useVotingStrategiesAddresses = () => {
  const node = useDaoInfoStore();
  const publicClient = useNetworkPublicClient();
  const safeAPI = useSafeAPI();
  const { getAddressContractType } = useAddressContractType();
  const lookupModules = useDecentModules();

  const getVotingStrategies = useCallback(
    async (safeAddress?: Address) => {
      let azoriusModule: DecentModule | undefined;

      if (safeAddress) {
        if (!safeAPI) {
          throw new Error('Safe API not ready');
        }
        const safeInfo = await safeAPI.getSafeInfo(safeAddress);
        const safeModules = await lookupModules(safeInfo.modules);
        azoriusModule = getAzoriusModuleFromModules(safeModules);
      } else {
        if (!node.modules) {
          throw new Error('DAO modules not ready');
        }
        azoriusModule = getAzoriusModuleFromModules(node.modules);
      }

      if (!azoriusModule) {
        return;
      }

      const azoriusContract = getContract({
        abi: abis.Azorius,
        address: azoriusModule.moduleAddress,
        client: publicClient,
      });

      const [strategies, nextStrategy] = await azoriusContract.read.getStrategies([
        SENTINEL_ADDRESS,
        3n,
      ]);
      const result = Promise.all(
        [...strategies, nextStrategy]
          .filter(
            strategyAddress =>
              strategyAddress !== SENTINEL_ADDRESS && strategyAddress !== zeroAddress,
          )
          .map(async strategyAddress => ({
            ...(await getAddressContractType(strategyAddress)),
            strategyAddress,
          })),
      );
      return result;
    },
    [lookupModules, getAddressContractType, node.modules, publicClient, safeAPI],
  );

  return { getVotingStrategies };
};

export default useVotingStrategiesAddresses;
