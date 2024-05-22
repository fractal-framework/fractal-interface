/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../../../common";
import type {
  GuardManager,
  GuardManagerInterface,
} from "../../../../../../@gnosis.pm/safe-contracts/contracts/base/GuardManager.sol/GuardManager";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "guard",
        type: "address",
      },
    ],
    name: "ChangedGuard",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "guard",
        type: "address",
      },
    ],
    name: "setGuard",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b50610297806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063e19a9dd914610030575b600080fd5b61004a6004803603810190610045919061013f565b61004c565b005b6100546100ba565b60007f4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c860001b90508181557f1151116914515bc0891ff9047a6cb32cf902546f83066499bcf8ba33d2353fa2826040516100ae919061019e565b60405180910390a15050565b3073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610128576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161011f906101b9565b60405180910390fd5b565b6000813590506101398161024a565b92915050565b6000602082840312156101555761015461021c565b5b60006101638482850161012a565b91505092915050565b610175816101ea565b82525050565b60006101886005836101d9565b915061019382610221565b602082019050919050565b60006020820190506101b3600083018461016c565b92915050565b600060208201905081810360008301526101d28161017b565b9050919050565b600082825260208201905092915050565b60006101f5826101fc565b9050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600080fd5b7f4753303331000000000000000000000000000000000000000000000000000000600082015250565b610253816101ea565b811461025e57600080fd5b5056fea264697066735822122036882f183534afb9e4b55421bb6bd751f7f43e643b078a857bd45fadf70bd94064736f6c63430008060033";

type GuardManagerConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: GuardManagerConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class GuardManager__factory extends ContractFactory {
  constructor(...args: GuardManagerConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<GuardManager> {
    return super.deploy(overrides || {}) as Promise<GuardManager>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): GuardManager {
    return super.attach(address) as GuardManager;
  }
  override connect(signer: Signer): GuardManager__factory {
    return super.connect(signer) as GuardManager__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): GuardManagerInterface {
    return new utils.Interface(_abi) as GuardManagerInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): GuardManager {
    return new Contract(address, _abi, signerOrProvider) as GuardManager;
  }
}