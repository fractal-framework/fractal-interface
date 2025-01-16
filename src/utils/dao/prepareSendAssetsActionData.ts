import { Address, encodeFunctionData, erc20Abi, getAddress, Hex } from 'viem';
import { TokenBalance } from '../../types';
import { MOCK_MORALIS_ETH_ADDRESS } from '../address';

export const isNativeAsset = (asset: TokenBalance) => {
  return (
    !asset.tokenAddress ||
    asset.nativeToken ||
    asset.tokenAddress.toLowerCase() === MOCK_MORALIS_ETH_ADDRESS.toLowerCase()
  );
};

export const prepareSendAssetsActionData = ({
  transferAmount,
  asset,
  destinationAddress,
}: {
  transferAmount: bigint;
  asset: TokenBalance;
  destinationAddress: Address;
}) => {
  const isNative = isNativeAsset(asset);

  let calldata: Hex = '0x';
  let target = isNative ? destinationAddress : getAddress(asset.tokenAddress);
  if (!isNative) {
    calldata = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [destinationAddress, transferAmount],
    });
  }

  const actionData = {
    target,
    value: isNative ? transferAmount : 0n,
    calldata,
  };

  return actionData;
};
