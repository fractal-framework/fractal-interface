import {
  Account,
  Chain,
  Hash,
  SendTransactionParameters,
  WriteContractParameters,
  Abi,
  ContractFunctionName,
  ContractFunctionArgs,
  SendTransactionRequest,
} from 'viem';
import { useWalletClient } from 'wagmi';
import { useNetworkConfigStore } from '../providers/NetworkConfig/useNetworkConfigStore';

type WalletClientExtension = {
  sendTransaction<
    TRequest extends SendTransactionRequest<Chain, TChainOverride>,
    TChainOverride extends Chain | undefined = undefined,
  >(
    args: SendTransactionParameters<Chain, Account, TChainOverride, TRequest>,
  ): Promise<Hash>;
  writeContract<
    TAbi extends Abi | readonly unknown[],
    TFunctionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
    TArgs extends ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName>,
    TChain extends Chain | undefined = Chain,
  >(
    args: WriteContractParameters<TAbi, TFunctionName, TArgs, Chain, Account, TChain>,
  ): Promise<Hash>;
};

export const useNetworkWalletClient = (props?: { chainId?: number }) => {
  const { chain } = useNetworkConfigStore();
  const chainId = props?.chainId ?? chain.id;

  const walletClient = useWalletClient({ chainId });

  const extendedWalletClient = walletClient.data?.extend(
    (client): WalletClientExtension => ({
      async sendTransaction<
        TRequest extends SendTransactionRequest<Chain, TChainOverride>,
        TChainOverride extends Chain | undefined = undefined,
      >(args: SendTransactionParameters<Chain, Account, TChainOverride, TRequest>) {
        await client.switchChain({ id: chainId });
        return client.sendTransaction(args);
      },

      async writeContract<
        TAbi extends Abi | readonly unknown[],
        TFunctionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
        TArgs extends ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName>,
        TChain extends Chain | undefined = Chain,
      >(args: WriteContractParameters<TAbi, TFunctionName, TArgs, Chain, Account, TChain>) {
        await client.switchChain({ id: chainId });
        return client.writeContract(args);
      },
    }),
  );

  return { ...walletClient, data: extendedWalletClient };
};
