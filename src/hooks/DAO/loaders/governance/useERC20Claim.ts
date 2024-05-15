import { useEffect, useCallback, useRef } from 'react';
import { getContract, getAddress } from 'viem';
import { usePublicClient } from 'wagmi';
import ERC20ClaimAbi from '../../../../assets/abi/ERC20Claim';
import VotesERC20Abi from '../../../../assets/abi/VotesERC20';
import { useFractal } from '../../../../providers/App/AppProvider';
import { FractalGovernanceAction } from '../../../../providers/App/governance/action';
// get list of approvals; approval [0] should be token claim
// query using attach = masterTokenClaim.attach(approval[0]).queryFilter()
// check if module is tokenClaim;
// set token claim;

export function useERC20Claim() {
  const {
    node: { daoAddress },
    governanceContracts: { votesTokenContractAddress },
    action,
  } = useFractal();
  const publicClient = usePublicClient();

  const loadTokenClaimContract = useCallback(async () => {
    if (!votesTokenContractAddress || !publicClient) {
      return;
    }

    const votesTokenContract = getContract({
      abi: VotesERC20Abi,
      address: getAddress(votesTokenContractAddress),
      client: publicClient,
    });

    // TODO here be dark programming...

    const approvals = await votesTokenContract.getEvents.Approval();

    if (approvals.length === 0 || !approvals[0].args.spender) {
      return;
    }

    const possibleTokenClaimContract = getContract({
      abi: ERC20ClaimAbi,
      address: getAddress(approvals[0].args.spender),
      client: publicClient,
    });

    const tokenClaimArray = await possibleTokenClaimContract.getEvents
      .ERC20ClaimCreated()
      .catch(() => []);

    const childToken = tokenClaimArray[0].args.childToken;

    if (!tokenClaimArray.length || !childToken || childToken === votesTokenContractAddress) {
      return;
    }
    // action to governance
    action.dispatch({
      type: FractalGovernanceAction.SET_CLAIMING_CONTRACT,
      payload: getAddress(approvals[0].args.spender),
    });
  }, [action, publicClient, votesTokenContractAddress]);

  const loadKey = useRef<string>();

  useEffect(() => {
    if (
      daoAddress &&
      votesTokenContractAddress &&
      daoAddress + votesTokenContractAddress !== loadKey.current
    ) {
      loadKey.current = daoAddress + votesTokenContractAddress;
      loadTokenClaimContract();
    }
    if (!daoAddress || !votesTokenContractAddress) {
      loadKey.current = undefined;
    }
  }, [loadTokenClaimContract, daoAddress, votesTokenContractAddress]);
  return;
}
