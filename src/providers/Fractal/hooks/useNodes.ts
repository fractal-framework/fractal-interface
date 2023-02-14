import { FractalUsul__factory } from '@fractal-framework/fractal-contracts';
import { ethers } from 'ethers';
import { Dispatch, useEffect, useCallback, useMemo } from 'react';
import { useProvider, useSigner } from 'wagmi';
import { getUsulModuleFromModules } from '../../../hooks/DAO/proposal/useUsul';
import useSafeContracts from '../../../hooks/safe/useSafeContracts';
import { GnosisAction } from '../constants';
import { IGnosis, GnosisActions, SafeInfoResponseWithGuard, ChildNode } from '../types';

export default function useNodes({
  gnosis,
  gnosisDispatch,
}: {
  gnosis: IGnosis;
  gnosisDispatch: Dispatch<GnosisActions>;
}) {
  const provider = useProvider();
  const { data: signer } = useSigner();
  const signerOrProvider = useMemo(() => signer || provider, [signer, provider]);
  const {
    fractalRegistryContract,
    gnosisVetoGuardMasterCopyContract,
    usulVetoGuardMasterCopyContract,
  } = useSafeContracts();

  const { modules, safe, safeService } = gnosis;

  const fetchSubDAOs = useCallback(
    async (parentDAOAddress: string) => {
      const filter =
        fractalRegistryContract!.asProvider.filters.FractalSubDAODeclared(parentDAOAddress);
      const events = await fractalRegistryContract!.asProvider.queryFilter(filter);
      const subDAOsAddresses = events.map(({ args }) => args.subDAOAddress);

      return subDAOsAddresses;
    },
    [fractalRegistryContract]
  );

  const getDAOOwner = useCallback(
    async (safeInfo?: Partial<SafeInfoResponseWithGuard>) => {
      if (safeInfo && safeInfo.guard && gnosisVetoGuardMasterCopyContract) {
        if (safeInfo.guard !== ethers.constants.AddressZero) {
          const guard = gnosisVetoGuardMasterCopyContract.asSigner.attach(safeInfo.guard);
          const guardOwner = await guard.owner();
          if (guardOwner !== safeInfo.address) {
            return guardOwner;
          }
        } else {
          const usulModule = getUsulModuleFromModules(modules);
          if (usulModule && usulVetoGuardMasterCopyContract) {
            const usulContract = FractalUsul__factory.connect(
              usulModule.moduleAddress,
              signerOrProvider
            );
            const guard = usulVetoGuardMasterCopyContract.asSigner.attach(
              await usulContract.getGuard()
            );
            const guardOwner = await guard.owner();
            if (guardOwner !== safeInfo.address) {
              return guardOwner;
            }
          }
        }
      }
      return undefined;
    },
    [gnosisVetoGuardMasterCopyContract, usulVetoGuardMasterCopyContract, modules, signerOrProvider]
  );

  const mapSubDAOsToOwnedSubDAOs = useCallback(
    async (subDAOsAddresses: string[], parentDAOAddress: string): Promise<ChildNode[]> => {
      const controlledNodes: ChildNode[] = [];

      for (const safeAddress of subDAOsAddresses) {
        const safeInfo = (await safeService!.getSafeInfo(safeAddress)) as SafeInfoResponseWithGuard;

        if (safeInfo.guard) {
          if (safeInfo.guard === ethers.constants.AddressZero) {
            // Guard is not attached - seems like just gap in Safe API Service indexisng.
            // Still, need to cover this case
            const node: ChildNode = {
              address: safeAddress,
              childNodes: await mapSubDAOsToOwnedSubDAOs(
                (await fetchSubDAOs(safeAddress)) || [],
                safeAddress
              ),
            };
            controlledNodes.push(node);
          } else {
            const owner = await getDAOOwner(safeInfo);
            if (owner && owner === parentDAOAddress) {
              const node: ChildNode = {
                address: safeAddress,
                childNodes: await mapSubDAOsToOwnedSubDAOs(
                  (await fetchSubDAOs(safeAddress)) || [],
                  safeAddress
                ),
              };
              controlledNodes.push(node);
            }
          }
        }
      }

      return controlledNodes;
    },
    [safeService, fetchSubDAOs, getDAOOwner]
  );

  useEffect(() => {
    const loadDaoParent = async () => {
      if (safe && safe.guard) {
        const owner = await getDAOOwner(safe);
        if (owner) {
          gnosisDispatch({ type: GnosisAction.SET_DAO_PARENT, payload: owner });
        }
      } else {
        // Clearing the state
        gnosisDispatch({ type: GnosisAction.SET_DAO_PARENT, payload: '' });
      }
    };

    const loadDaoNodes = async () => {
      if (safe.address && safeService && fractalRegistryContract) {
        const declaredSubDAOs = await fetchSubDAOs(safe.address);
        const controlledNodes = await mapSubDAOsToOwnedSubDAOs(declaredSubDAOs, safe.address);

        gnosisDispatch({ type: GnosisAction.SET_DAO_CHILDREN, payload: controlledNodes });
      }
    };

    loadDaoParent();
    loadDaoNodes();
  }, [
    safe,
    modules,
    gnosisDispatch,
    safeService,
    fetchSubDAOs,
    getDAOOwner,
    mapSubDAOsToOwnedSubDAOs,
    fractalRegistryContract,
  ]);
}
