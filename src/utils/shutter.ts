import { init, encrypt } from '@shutter-network/shutter-crypto';
import { toBytes, toHex, stringToBytes, stringToHex, bytesToHex } from 'viem';

const shutterEonPublicKey =
  '0x0e6493bbb4ee8b19aa9b70367685049ff01dc9382c46aed83f8bc07d2a5ba3e6030bd83b942c1fd3dff5b79bef3b40bf6b666e51e7f0be14ed62daaffad47435265f5c9403b1a801921981f7d8659a9bd91fe92fb1cf9afdb16178a532adfaf51a237103874bb03afafe9cab2118dae1be5f08a0a28bf488c1581e9db4bc23ca';

export default async function encryptWithShutter(
  choice: string,
  id: string,
): Promise<string | null> {
  const shutterPath = '/assets/scripts/shutter-crypto.wasm';
  await init(shutterPath);

  const bytesChoice = stringToBytes(choice);
  const message = toHex(bytesChoice);
  const eonPublicKey = toBytes(shutterEonPublicKey);

  const is32ByteString = id.substring(0, 2) === '0x';
  const proposalId = toBytes(is32ByteString ? id : stringToHex(id, { size: 32 }));

  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const sigma = bytesToHex(randomBytes);

  const encryptedMessage = await encrypt(message, eonPublicKey, proposalId, sigma);

  return toHex(encryptedMessage) ?? null;
}
