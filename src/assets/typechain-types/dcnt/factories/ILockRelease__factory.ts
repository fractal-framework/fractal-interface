/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { ILockRelease, ILockReleaseInterface } from "../ILockRelease";

const _abi = [
  {
    inputs: [],
    name: "getBeneficiaries",
    outputs: [
      {
        internalType: "address[]",
        name: "",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_beneficiary",
        type: "address",
      },
    ],
    name: "getPending",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export class ILockRelease__factory {
  static readonly abi = _abi;
  static createInterface(): ILockReleaseInterface {
    return new utils.Interface(_abi) as ILockReleaseInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ILockRelease {
    return new Contract(address, _abi, signerOrProvider) as ILockRelease;
  }
}
