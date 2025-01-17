import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback } from 'react';
import { Abi, Address } from 'viem';
import useNetworkPublicClient from '../useNetworkPublicClient';

// https://github.com/adamgall/fractal-contract-identification/blob/229fc398661c5d684600feeb98a4eb767f728632/src/identify-contracts.ts

type ContractType = {
  isClaimErc20: boolean;
  isFreezeGuardAzorius: boolean;
  isFreezeGuardMultisig: boolean;
  isFreezeVotingErc20: boolean;
  isFreezeVotingErc721: boolean;
  isFreezeVotingMultisig: boolean;
  isLinearVotingErc20: boolean;
  isLinearVotingErc20WithHatsProposalCreation: boolean;
  isLinearVotingErc721: boolean;
  isLinearVotingErc721WithHatsProposalCreation: boolean;
  isModuleAzorius: boolean;
  isModuleFractal: boolean;
  isVotesErc20: boolean;
};

const defaultContractType: ContractType = {
  isClaimErc20: false,
  isFreezeGuardAzorius: false,
  isFreezeGuardMultisig: false,
  isFreezeVotingErc20: false,
  isFreezeVotingErc721: false,
  isFreezeVotingMultisig: false,
  isLinearVotingErc20: false,
  isLinearVotingErc721: false,
  isModuleAzorius: false,
  isModuleFractal: false,
  isVotesErc20: false,
  isLinearVotingErc20WithHatsProposalCreation: false,
  isLinearVotingErc721WithHatsProposalCreation: false,
};

type ContractFunctionTest = {
  // The ABI of the contract to test
  abi: Abi;
  // These functions must not revert when called
  functionNames: string[];
  // These functions must revert when called
  revertFunctionNames?: string[];
  // The key in the result object to set
  resultKey: keyof ContractType;
};

function combineAbis(...abisToCombine: Abi[]): Abi {
  return abisToCombine.flat();
}

const contractTests: ContractFunctionTest[] = [
  {
    abi: abis.ERC20Claim,
    functionNames: [
      'childERC20',
      'parentERC20',
      'deadlineBlock',
      'funder',
      'owner',
      'parentAllocation',
      'snapShotId',
    ],
    resultKey: 'isClaimErc20',
  },
  {
    abi: combineAbis(abis.AzoriusFreezeGuard, abis.MultisigFreezeGuard),
    functionNames: ['freezeVoting', 'owner'],
    revertFunctionNames: ['childGnosisSafe', 'timelockPeriod', 'executionPeriod'],
    resultKey: 'isFreezeGuardAzorius',
  },
  {
    abi: abis.MultisigFreezeGuard,
    functionNames: [
      'childGnosisSafe',
      'executionPeriod',
      'freezeVoting',
      'owner',
      'timelockPeriod',
    ],
    resultKey: 'isFreezeGuardMultisig',
  },
  {
    abi: abis.ERC20FreezeVoting,
    functionNames: [
      'votesERC20',
      'freezePeriod',
      'freezeProposalPeriod',
      'freezeProposalVoteCount',
      'freezeVotesThreshold',
      'isFrozen',
      'owner',
    ],
    resultKey: 'isFreezeVotingErc20',
  },
  {
    abi: abis.ERC721FreezeVoting,
    functionNames: [
      'strategy',
      'owner',
      'isFrozen',
      'freezeVotesThreshold',
      'freezePeriod',
      'freezeProposalVoteCount',
      'freezeProposalPeriod',
    ],
    resultKey: 'isFreezeVotingErc721',
  },
  {
    abi: abis.MultisigFreezeVoting,
    functionNames: [
      'parentGnosisSafe',
      'freezePeriod',
      'freezeProposalPeriod',
      'freezeProposalVoteCount',
      'isFrozen',
      'owner',
    ],
    resultKey: 'isFreezeVotingMultisig',
  },
  {
    abi: combineAbis(abis.LinearERC20Voting, abis.LinearERC20VotingWithHatsProposalCreation),
    revertFunctionNames: ['getWhitelistedHatIds'],
    functionNames: [
      'BASIS_DENOMINATOR',
      'QUORUM_DENOMINATOR',
      'azoriusModule',
      'basisNumerator',
      'governanceToken',
      'owner',
      'quorumNumerator',
      'votingPeriod',
      'requiredProposerWeight',
    ],
    resultKey: 'isLinearVotingErc20',
  },
  {
    abi: abis.LinearERC20VotingWithHatsProposalCreation,
    functionNames: [
      'BASIS_DENOMINATOR',
      'QUORUM_DENOMINATOR',
      'azoriusModule',
      'basisNumerator',
      'governanceToken',
      'owner',
      'quorumNumerator',
      'votingPeriod',
      'requiredProposerWeight',
      'getWhitelistedHatIds',
    ],
    resultKey: 'isLinearVotingErc20WithHatsProposalCreation',
  },
  {
    abi: combineAbis(abis.LinearERC721Voting, abis.LinearERC721VotingWithHatsProposalCreation),
    revertFunctionNames: ['getWhitelistedHatIds'],
    functionNames: [
      'BASIS_DENOMINATOR',
      'azoriusModule',
      'basisNumerator',
      'getAllTokenAddresses',
      'owner',
      'proposerThreshold',
      'quorumThreshold',
      'votingPeriod',
    ],
    resultKey: 'isLinearVotingErc721',
  },
  {
    abi: abis.LinearERC721VotingWithHatsProposalCreation,
    functionNames: [
      'BASIS_DENOMINATOR',
      'azoriusModule',
      'basisNumerator',
      'getAllTokenAddresses',
      'owner',
      'proposerThreshold',
      'quorumThreshold',
      'votingPeriod',
      'getWhitelistedHatIds',
    ],
    resultKey: 'isLinearVotingErc721WithHatsProposalCreation',
  },
  {
    abi: abis.Azorius,
    functionNames: [
      'avatar',
      'target',
      'guard',
      'getGuard',
      'executionPeriod',
      'totalProposalCount',
      'timelockPeriod',
      'owner',
      'DOMAIN_SEPARATOR_TYPEHASH',
      'TRANSACTION_TYPEHASH',
    ],
    resultKey: 'isModuleAzorius',
  },
  {
    abi: combineAbis(abis.FractalModule, abis.Azorius),
    functionNames: ['avatar', 'target', 'getGuard', 'guard', 'owner'],
    revertFunctionNames: [
      'timelockPeriod',
      'executionPeriod',
      'totalProposalCount',
      'DOMAIN_SEPARATOR_TYPEHASH',
      'TRANSACTION_TYPEHASH',
    ],
    resultKey: 'isModuleFractal',
  },
  {
    abi: combineAbis(abis.VotesERC20, abis.VotesERC20Wrapper),
    functionNames: ['decimals', 'name', 'owner', 'symbol', 'totalSupply'],
    revertFunctionNames: ['underlying'],
    resultKey: 'isVotesErc20',
  },
];

export function useAddressContractType() {
  const publicClient = useNetworkPublicClient();

  const getAddressContractType = useCallback(
    async (address: Address): Promise<ContractType> => {
      const result = { ...defaultContractType };

      const allCalls = contractTests.flatMap(test => [
        ...test.functionNames.map(fn => ({
          address,
          abi: test.abi,
          functionName: fn,
          args: [],
        })),
        ...(test.revertFunctionNames?.map(fn => ({
          address,
          abi: test.abi,
          functionName: fn,
          args: [],
        })) ?? []),
      ]);

      const allResults = await publicClient.multicall({
        contracts: allCalls,
      });

      let resultIndex = 0;
      let passedTestCount = 0;

      for (const test of contractTests) {
        const successResults = allResults.slice(
          resultIndex,
          resultIndex + test.functionNames.length,
        );
        const successPassed = successResults.every(r => !r.error);
        resultIndex += test.functionNames.length;

        let revertPassed = true;
        if (test.revertFunctionNames?.length) {
          const revertResults = allResults.slice(
            resultIndex,
            resultIndex + test.revertFunctionNames.length,
          );
          revertPassed = revertResults.every(r => r.error);
          resultIndex += test.revertFunctionNames.length;
        }

        const testPassed = successPassed && revertPassed;
        result[test.resultKey] = testPassed;

        if (testPassed) {
          passedTestCount++;
          if (passedTestCount > 1) {
            throw new Error(`Address ${address} matches multiple contract types`);
          }
        }
      }

      return result;
    },
    [publicClient],
  );

  return { getAddressContractType };
}
