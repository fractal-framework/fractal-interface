import { useEffect } from 'react';
import { useNetworkConfigStore } from '../../providers/NetworkConfig/useNetworkConfigStore';
import { getChainIdFromPrefix } from '../../utils/url';

export const useAutomaticSwitchChain = ({
  urlAddressPrefix,
}: {
  urlAddressPrefix: string | undefined;
}) => {
  const { setCurrentConfig, getConfigByChainId, addressPrefix } = useNetworkConfigStore();

  useEffect(() => {
    if (urlAddressPrefix === undefined) {
      return;
    }

    setCurrentConfig(getConfigByChainId(getChainIdFromPrefix(urlAddressPrefix)));
  }, [addressPrefix, setCurrentConfig, getConfigByChainId, urlAddressPrefix]);
};
