import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Address } from 'viem';
import { DefiBalance, NFTBalance, TokenBalance } from '../../../types';
import { useNetworkConfigStore } from '../../NetworkConfig/useNetworkConfigStore';

type BalanceResponse = {
  tokens?: { data: TokenBalance[] };
  nfts?: { data: NFTBalance[] };
  defi?: { data: DefiBalance[] };
  error?: string;
};

export default function useBalancesAPI() {
  const {
    chain,
    moralis: { deFiSupported },
  } = useNetworkConfigStore();
  const { t } = useTranslation('treasury');

  const fetchBalances = useCallback(
    async (address: Address, flavors: string[]): Promise<BalanceResponse> => {
      try {
        const params = new URLSearchParams();
        params.append('address', address);
        params.append('network', chain.id.toString());
        flavors.forEach(flavor => params.append('flavor', flavor));

        const response = await fetch(`/api/balances?${params}`);
        return await response.json();
      } catch (e) {
        console.error('Error while fetching balances', e);
        return { error: t('errorFetchingBalances') };
      }
    },
    [chain.id, t],
  );

  const getTokenBalances = useCallback(
    async (address: Address): Promise<{ data?: TokenBalance[]; error?: string }> => {
      const response = await fetchBalances(address, ['tokens']);
      return { data: response.tokens?.data, error: response.error };
    },
    [fetchBalances],
  );

  const getNFTBalances = useCallback(
    async (address: Address): Promise<{ data?: NFTBalance[]; error?: string }> => {
      const response = await fetchBalances(address, ['nfts']);
      return { data: response.nfts?.data, error: response.error };
    },
    [fetchBalances],
  );

  const getDeFiBalances = useCallback(
    async (address: Address): Promise<{ data?: DefiBalance[]; error?: string }> => {
      if (!deFiSupported) {
        return { data: [] };
      }
      const response = await fetchBalances(address, ['defi']);
      return { data: response.defi?.data, error: response.error };
    },
    [deFiSupported, fetchBalances],
  );

  return { getTokenBalances, getNFTBalances, getDeFiBalances };
}
