import {
  EthereumTxWithTransfersResponse,
  SafeModuleTransactionWithTransfersResponse,
  SafeMultisigTransactionWithTransfersResponse,
  TokenInfoResponse,
} from '@safe-global/api-kit';
import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Address, erc20Abi, getAddress, zeroAddress } from 'viem';
import { useFractal } from '../../../providers/App/AppProvider';
import useBalancesAPI from '../../../providers/App/hooks/useBalancesAPI';
import { useSafeAPI } from '../../../providers/App/hooks/useSafeAPI';
import { TreasuryAction } from '../../../providers/App/treasury/action';
import { useNetworkConfigStore } from '../../../providers/NetworkConfig/useNetworkConfigStore';
import { useDaoInfoStore } from '../../../store/daoInfo/useDaoInfoStore';
import {
  TokenEventType,
  TransferDisplayData,
  TransferType,
  TransferWithTokenInfo,
} from '../../../types';
import { formatCoin } from '../../../utils';
import { MOCK_MORALIS_ETH_ADDRESS } from '../../../utils/address';
import useNetworkPublicClient from '../../useNetworkPublicClient';
import { CacheExpiry, CacheKeys } from '../../utils/cache/cacheDefaults';
import { setValue } from '../../utils/cache/useLocalStorage';

function getTransferEventType(transferFrom: string, safeAddress: Address | undefined) {
  if (transferFrom === zeroAddress) {
    return TokenEventType.MINT;
  }
  if (transferFrom === safeAddress) {
    return TokenEventType.WITHDRAW;
  } else {
    return TokenEventType.DEPOSIT;
  }
}
export const useDecentTreasury = () => {
  // tracks the current valid DAO address / chain; helps prevent unnecessary calls
  const loadKey = useRef<string | null>();
  const { action } = useFractal();
  const { safe } = useDaoInfoStore();
  const safeAPI = useSafeAPI();
  const { getTokenBalances, getNFTBalances, getDeFiBalances } = useBalancesAPI();

  const { chain, nativeTokenIcon } = useNetworkConfigStore();
  const safeAddress = safe?.address;

  const publicClient = useNetworkPublicClient();

  const formatTransfer = useCallback(
    ({ transfer, isLast }: { transfer: TransferWithTokenInfo; isLast: boolean }) => {
      const symbol = transfer.tokenInfo.symbol;
      const decimals = transfer.tokenInfo.decimals;

      const formattedTransfer: TransferDisplayData = {
        eventType: getTransferEventType(transfer.from, safeAddress),
        transferType: transfer.type as TransferType,
        executionDate: transfer.executionDate,
        image: transfer.tokenInfo.logoUri ?? '/images/coin-icon-default.svg',
        assetDisplay:
          transfer.type === TransferType.ERC721_TRANSFER
            ? `${transfer.tokenInfo.name} #${transfer.tokenId}`
            : formatCoin(transfer.value, true, decimals, symbol),
        fullCoinTotal:
          transfer.type === TransferType.ERC721_TRANSFER
            ? undefined
            : formatCoin(transfer.value, false, decimals, symbol),
        transferAddress: safeAddress === transfer.from ? transfer.to : transfer.from,
        transactionHash: transfer.transactionHash,
        tokenId: transfer.tokenId,
        tokenInfo: transfer.tokenInfo,
        isLast,
      };
      return formattedTransfer;
    },
    [safeAddress],
  );

  const loadTreasury = useCallback(async () => {
    if (!safeAddress || !safeAPI) {
      return;
    }

    const [
      allTransactions,
      { data: tokenBalances, error: tokenBalancesError },
      { data: nftBalances, error: nftBalancesError },
      { data: defiBalances, error: defiBalancesError },
    ] = await Promise.all([
      safeAPI.getAllTransactions(safeAddress),
      getTokenBalances(safeAddress),
      getNFTBalances(safeAddress),
      getDeFiBalances(safeAddress),
    ]);

    const groupedTransactions = allTransactions.results.reduce(
      (acc, tx) => {
        const txType = tx.txType || 'UNKNOWN';
        if (!acc[txType]) {
          acc[txType] = [];
        }
        acc[txType].push(tx);
        return acc;
      },
      {} as Record<
        string,
        Array<
          | SafeModuleTransactionWithTransfersResponse
          | SafeMultisigTransactionWithTransfersResponse
          | EthereumTxWithTransfersResponse
        >
      >,
    );

    const moduleTransactions = (groupedTransactions.MODULE_TRANSACTION ||
      []) as SafeModuleTransactionWithTransfersResponse[];
    const multisigTransactions = (groupedTransactions.MULTISIG_TRANSACTION ||
      []) as SafeMultisigTransactionWithTransfersResponse[];
    const ethereumTransactions = (groupedTransactions.ETHEREUM_TRANSACTION ||
      []) as EthereumTxWithTransfersResponse[];

    const uniqueModuleTransactions = Array.from(
      new Map(moduleTransactions.map(tx => [tx.transactionHash, tx])).values(),
    );

    const uniqueMultisigTransactions = Array.from(
      new Map(multisigTransactions.map(tx => [tx.transactionHash, tx])).values(),
    );

    const uniqueEthereumTransactions = Array.from(
      new Map(ethereumTransactions.map(tx => [tx.txHash, tx])).values(),
    );

    const flattenedTransfers = [
      ...uniqueModuleTransactions.flatMap(tx => tx.transfers || []),
      ...uniqueMultisigTransactions.flatMap(tx => tx.transfers || []),
      ...uniqueEthereumTransactions.flatMap(tx => tx.transfers || []),
    ];

    if (tokenBalancesError) {
      toast.warning(tokenBalancesError, { duration: 2000 });
    }
    if (nftBalancesError) {
      toast.warning(nftBalancesError, { duration: 2000 });
    }
    if (defiBalancesError) {
      toast.warning(defiBalancesError, { duration: 2000 });
    }
    const assetsFungible = tokenBalances || [];
    const assetsNonFungible = nftBalances || [];
    const assetsDeFi = defiBalances || [];

    const totalAssetsFungibleUsd = assetsFungible.reduce(
      (prev, curr) => prev + (curr.usdValue || 0),
      0,
    );
    const totalAssetsDeFiUsd = assetsDeFi.reduce(
      (prev, curr) => prev + (curr.position?.balanceUsd || 0),
      0,
    );

    const totalUsdValue = totalAssetsFungibleUsd + totalAssetsDeFiUsd;

    const treasuryData = {
      assetsFungible,
      assetsDeFi,
      assetsNonFungible,
      totalUsdValue,
      transfers: null, // transfers not yet loaded. these are setup below
    };

    action.dispatch({ type: TreasuryAction.UPDATE_TREASURY, payload: treasuryData });

    const tokenAddressesOfTransfers = flattenedTransfers
      // map down to just the addresses, with a type of `string | undefined`
      .map(transfer => transfer.tokenAddress)
      // no undefined or null addresses
      .filter(address => address !== undefined && address !== null)
      // make unique
      .filter((value, index, self) => self.indexOf(value) === index)
      // turn them into Address type
      .map(address => getAddress(address));

    const transfersTokenInfo = await Promise.all(
      tokenAddressesOfTransfers.map(async address => {
        let tokenInfo: TokenInfoResponse;

        try {
          tokenInfo = await safeAPI.getToken(address);
        } catch (e) {
          const fallbackTokenData = tokenBalances?.find(
            tokenBalanceData => getAddress(tokenBalanceData.tokenAddress) === address,
          );
          if (!fallbackTokenData) {
            // Fallback to blockchain call if token info not available

            const [name, symbol, decimals] = await Promise.all([
              publicClient.readContract({ address, abi: erc20Abi, functionName: 'name' }),
              publicClient.readContract({ address, abi: erc20Abi, functionName: 'symbol' }),
              publicClient.readContract({ address, abi: erc20Abi, functionName: 'decimals' }),
            ]);

            return {
              address,
              name,
              symbol,
              decimals,
            };
          }

          tokenInfo = {
            address,
            name: fallbackTokenData.name,
            symbol: fallbackTokenData.symbol,
            decimals: fallbackTokenData.decimals,
            logoUri: fallbackTokenData.logo,
          };
        }

        setValue(
          { cacheName: CacheKeys.TOKEN_INFO, tokenAddress: address },
          tokenInfo,
          CacheExpiry.NEVER,
        );
        return tokenInfo;
      }),
    );

    if (flattenedTransfers.length === 0) {
      action.dispatch({ type: TreasuryAction.SET_TRANSFERS_LOADED });
    }

    flattenedTransfers
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .forEach(async (transfer, index, _transfers) => {
        // @note assume native token if no token address
        let tokenInfo: TokenInfoResponse = {
          address: MOCK_MORALIS_ETH_ADDRESS,
          name: chain.nativeCurrency.name,
          symbol: chain.nativeCurrency.symbol,
          decimals: chain.nativeCurrency.decimals,
          logoUri: nativeTokenIcon,
        };
        const transferTokenAddress = transfer.tokenAddress;
        if (transferTokenAddress) {
          const tokenData = transfersTokenInfo.find(
            _token => _token && getAddress(_token.address) === getAddress(transferTokenAddress),
          );
          if (tokenData) {
            tokenInfo = tokenData;
          }
        }

        const formattedTransfer: TransferDisplayData = formatTransfer({
          transfer: { ...transfer, tokenInfo },
          isLast: _transfers.length - 1 === index,
        });

        action.dispatch({ type: TreasuryAction.ADD_TRANSFER, payload: formattedTransfer });

        if (_transfers.length - 1 === index) {
          action.dispatch({ type: TreasuryAction.SET_TRANSFERS_LOADED });
        }
      });
  }, [
    action,
    chain.nativeCurrency.decimals,
    chain.nativeCurrency.name,
    chain.nativeCurrency.symbol,
    safeAddress,
    formatTransfer,
    getDeFiBalances,
    getNFTBalances,
    getTokenBalances,
    nativeTokenIcon,
    publicClient,
    safeAPI,
  ]);

  useEffect(() => {
    if (!safeAddress) {
      loadKey.current = null;
      return;
    }

    const newLoadKey = `${chain.id}${safeAddress}`;
    if (newLoadKey !== loadKey.current) {
      loadKey.current = newLoadKey;
      loadTreasury();
    }
  }, [action, chain.id, safeAddress, loadTreasury]);

  return;
};
