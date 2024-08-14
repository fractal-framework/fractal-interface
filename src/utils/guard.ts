import { MultisigFreezeGuard } from '@fractal-framework/fractal-contracts';
import { keccak256, encodePacked, isHex } from 'viem';
import { buildSignatureBytes } from '../helpers/crypto';
import { Activity } from '../types';
import { Providers } from '../types/network';
import { getTimeStamp } from './contract';

export async function getTxTimelockedTimestamp(
  activity: Activity,
  freezeGuard: MultisigFreezeGuard,
  provider: Providers,
) {
  if (!activity.transaction?.confirmations) {
    throw new Error(
      'Error getting transaction timelocked timestamp - invalid format of multisig transaction',
    );
  }
  const signatures = buildSignatureBytes(
    activity.transaction.confirmations.map(confirmation => {
      if (!isHex(confirmation.signature)) {
        throw new Error('Confirmation signature is malfunctioned');
      }
      return {
        signer: confirmation.owner,
        data: confirmation.signature,
      };
    }),
  );
  const signaturesHash = keccak256(encodePacked(['bytes'], [signatures]));

  const timelockedTimestamp = await getTimeStamp(
    await freezeGuard.getTransactionTimelockedBlock(signaturesHash),
    provider,
  );
  return timelockedTimestamp;
}
