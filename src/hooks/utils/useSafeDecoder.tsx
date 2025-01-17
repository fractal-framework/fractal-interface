import axios from 'axios';
import detectProxyTarget from 'evm-proxy-detection';
import { useCallback } from 'react';
import { Address, decodeFunctionData, encodePacked, Hex, keccak256 } from 'viem';
import { useNetworkConfigStore } from '../../providers/NetworkConfig/useNetworkConfigStore';
import { DecodedTransaction, DecodedTxParam } from '../../types';
import { buildSafeApiUrl, parseMultiSendTransactions } from '../../utils';
import useNetworkPublicClient from '../useNetworkPublicClient';
import { CacheKeys } from './cache/cacheDefaults';
import { DBObjectKeys, useIndexedDB } from './cache/useLocalDB';
/**
 * Handles decoding and caching transactions via the Safe API.
 */
export const useSafeDecoder = () => {
  const client = useNetworkPublicClient();
  const { safeBaseURL, etherscanAPIUrl } = useNetworkConfigStore();
  const [setValue, getValue] = useIndexedDB(DBObjectKeys.DECODED_TRANSACTIONS);
  const decode = useCallback(
    async (value: string, to: Address, data?: string): Promise<DecodedTransaction[]> => {
      if (!data || data.length <= 2) {
        // a transaction without data is an Eth transfer
        return [
          {
            target: to,
            value,
            function: 'n/a',
            parameterTypes: ['n/a'],
            parameterValues: ['n/a'],
            decodingFailed: false,
          },
        ];
      }

      const cachedTransactions = await getValue(
        CacheKeys.DECODED_TRANSACTION_PREFIX + keccak256(encodePacked(['string'], [to + data])),
      );
      if (cachedTransactions) return cachedTransactions;

      let decoded: DecodedTransaction | DecodedTransaction[];
      try {
        try {
          const decodedData = (
            await axios.post(buildSafeApiUrl(safeBaseURL, '/data-decoder/'), {
              to,
              data,
            })
          ).data;
          if (decodedData.parameters && decodedData.method === 'multiSend') {
            const internalTransactionsMap = new Map<number, DecodedTransaction>();
            parseMultiSendTransactions(internalTransactionsMap, decodedData.parameters);
            decoded = [...internalTransactionsMap.values()].flat();
          } else {
            decoded = [
              {
                target: to,
                value,
                function: decodedData.method,
                parameterTypes: decodedData.parameters.map((param: DecodedTxParam) => param.type),
                parameterValues: decodedData.parameters.map((param: DecodedTxParam) => param.value),
                decodingFailed: false,
              },
            ];
          }
        } catch (e) {
          console.error('Error decoding transaction using Safe API. Trying to decode with ABI', e);
          const requestFunc = ({ method, params }: { method: any; params: any }) =>
            client.request({ method, params });
          const implementationAddress = await detectProxyTarget(to, requestFunc);
          const response = await axios.get(
            `${etherscanAPIUrl}&module=contract&action=getabi&address=${implementationAddress || to}`,
          );
          const responseData = response.data;
          const abi = JSON.parse(responseData.result);
          const decodedData = decodeFunctionData({
            abi,
            data: data as Hex,
          });
          const functionAbi = abi.find((abiItem: any) => abiItem.name === decodedData.functionName);
          decoded = [
            {
              target: to,
              value,
              function: decodedData.functionName,
              parameterTypes: functionAbi.inputs.map((input: any) => input.type),
              parameterValues: decodedData.args,
              decodingFailed: false,
            },
          ];
        }
      } catch (e) {
        console.error(
          'Error decoding transaction using ABI. Returning empty decoded transaction',
          e,
        );
        return [
          {
            target: to,
            value: value,
            function: 'unknown',
            parameterTypes: [],
            parameterValues: [],
            decodingFailed: true,
          },
        ];
      }

      await setValue(
        CacheKeys.DECODED_TRANSACTION_PREFIX + keccak256(encodePacked(['string'], [to + data])),
        decoded,
      );

      return decoded;
    },
    [getValue, safeBaseURL, etherscanAPIUrl, setValue, client],
  );
  return decode;
};
