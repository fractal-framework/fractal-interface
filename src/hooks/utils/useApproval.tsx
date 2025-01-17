import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Address, getContract, maxUint256 } from 'viem';
import { useAccount } from 'wagmi';
import { useNetworkWalletClient } from '../useNetworkWalletClient';
import { useTransaction } from './useTransaction';

const useApproval = (tokenAddress?: Address, spenderAddress?: Address, userBalance?: bigint) => {
  const { address: account } = useAccount();
  const [allowance, setAllowance] = useState(0n);
  const [approved, setApproved] = useState(false);
  const [contractCall, pending] = useTransaction();
  const { t } = useTranslation('treasury');
  const { data: walletClient } = useNetworkWalletClient();

  const tokenContract = useMemo(() => {
    if (!walletClient || !tokenAddress) {
      return;
    }

    return getContract({
      abi: abis.VotesERC20,
      address: tokenAddress,
      client: walletClient,
    });
  }, [tokenAddress, walletClient]);

  const fetchAllowance = useCallback(async () => {
    if (!account || !spenderAddress || !tokenContract) return;

    const userAllowance = await tokenContract.read.allowance([account, spenderAddress]);
    setAllowance(userAllowance);
  }, [account, tokenContract, spenderAddress]);

  const approveTransaction = useCallback(async () => {
    if (!tokenContract || !account || !spenderAddress) return;

    contractCall({
      contractFn: () => tokenContract.write.approve([spenderAddress, maxUint256]),
      pendingMessage: t('approvalPendingMessage'),
      failedMessage: t('approvalFailedMessage'),
      successMessage: t('approvalSuccessMessage'),
      successCallback: () => {
        setApproved(true);
      },
    });
  }, [account, contractCall, tokenContract, spenderAddress, t]);

  useEffect(() => {
    fetchAllowance();
  }, [fetchAllowance]);

  useEffect(() => {
    setApproved(allowance !== 0n || (!!userBalance && userBalance <= allowance));
  }, [allowance, userBalance]);

  return { approved, allowance, approveTransaction, pending };
};

export default useApproval;
