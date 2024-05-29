import { SafeBalanceResponse } from '@safe-global/safe-service-client';
import { isAddress, getAddress, Hex, encodeFunctionData, erc20Abi } from 'viem';
import { SubmitProposalFunction } from '../../../hooks/DAO/proposal/useSubmitProposal';
import { ProposalExecuteData } from '../../../types';
import { formatCoin } from '../../../utils/numberFormats';

export const sendAssets = async ({
  transferAmount,
  asset,
  destinationAddress,
  nonce,
  submitProposal,
  t,
}: {
  transferAmount: bigint;
  asset: SafeBalanceResponse;
  destinationAddress: string | undefined;
  nonce: number | undefined;
  submitProposal: SubmitProposalFunction;
  t: any;
}) => {
  const isEth = !asset.tokenAddress;
  const description = formatCoin(
    transferAmount,
    false,
    asset?.token?.decimals,
    asset?.token?.symbol,
  );

  let calldatas = ['0x' as Hex];
  let target =
    isEth && destinationAddress ? getAddress(destinationAddress) : getAddress(asset.tokenAddress);
  if (!isEth && destinationAddress && isAddress(destinationAddress)) {
    calldatas = [
      encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [destinationAddress, transferAmount],
      }),
    ];
  }

  const proposalData: ProposalExecuteData = {
    targets: [target],
    values: [isEth ? transferAmount : 0n],
    calldatas,
    metaData: {
      title: t(isEth ? 'sendEth' : 'sendToken', { ns: 'proposalMetadata' }),
      description: description,
      documentationUrl: '',
    },
  };

  await submitProposal({
    proposalData,
    nonce,
    pendingToastMessage: t('sendAssetsPendingToastMessage'),
    successToastMessage: t('sendAssetsSuccessToastMessage'),
    failedToastMessage: t('sendAssetsFailureToastMessage'),
  });
};