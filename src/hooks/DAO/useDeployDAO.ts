import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Address, getContract, isHex } from 'viem';
import MultiSendCallOnlyAbi from '../../assets/abi/MultiSendCallOnly';
import { useNetworkConfigStore } from '../../providers/NetworkConfig/useNetworkConfigStore';
import { AzoriusERC20DAO, AzoriusERC721DAO, SafeMultisigDAO } from '../../types';
import { useNetworkWalletClient } from '../useNetworkWalletClient';
import { useTransaction } from '../utils/useTransaction';
import useBuildDAOTx from './useBuildDAOTx';

const useDeployDAO = () => {
  const [contractCall, pending] = useTransaction();
  const [build] = useBuildDAOTx();

  const { t } = useTranslation('transaction');

  const {
    addressPrefix,
    contracts: { multiSendCallOnly },
  } = useNetworkConfigStore();

  const { data: walletClient } = useNetworkWalletClient();

  const deployDao = useCallback(
    (
      daoData: SafeMultisigDAO | AzoriusERC20DAO | AzoriusERC721DAO,
      successCallback: (addressPrefix: string, safeAddress: Address, daoName: string) => void,
    ) => {
      const deploy = async () => {
        if (!walletClient) {
          return;
        }

        const builtSafeTx = await build(daoData);
        if (!builtSafeTx) {
          return;
        }

        const { predictedSafeAddress, safeTx } = builtSafeTx;

        if (!isHex(safeTx)) {
          throw new Error('built transaction is not a hex string');
        }

        const multiSendCallOnlyContract = getContract({
          abi: MultiSendCallOnlyAbi,
          address: multiSendCallOnly,
          client: walletClient,
        });

        contractCall({
          contractFn: () => multiSendCallOnlyContract.write.multiSend([safeTx]),
          pendingMessage: t('pendingDeploySafe'),
          failedMessage: t('failedDeploySafe'),
          successMessage: t('successDeploySafe'),
          successCallback: () =>
            successCallback(addressPrefix, predictedSafeAddress, daoData.daoName),
        });
      };

      deploy();
    },
    [addressPrefix, build, contractCall, multiSendCallOnly, t, walletClient],
  );

  return [deployDao, pending] as const;
};

export default useDeployDAO;
