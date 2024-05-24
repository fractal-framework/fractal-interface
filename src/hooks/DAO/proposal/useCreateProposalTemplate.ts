import { useCallback } from 'react';
import { encodeFunctionData } from 'viem';
import KeyValuePairsAbi from '../../../assets/abi/KeyValuePairs';
import { useFractal } from '../../../providers/App/AppProvider';
import useIPFSClient from '../../../providers/App/hooks/useIPFSClient';
import { useNetworkConfig } from '../../../providers/NetworkConfig/NetworkConfigProvider';
import { ProposalExecuteData } from '../../../types';
import { CreateProposalForm } from '../../../types/proposalBuilder';
import { validateENSName } from '../../../utils/url';
import useSignerOrProvider from '../../utils/useSignerOrProvider';

export default function useCreateProposalTemplate() {
  const signerOrProvider = useSignerOrProvider();

  const client = useIPFSClient();
  const {
    governance: { proposalTemplates },
  } = useFractal();

  const {
    contracts: { keyValuePairs },
  } = useNetworkConfig();

  const prepareProposalTemplateProposal = useCallback(
    async (values: CreateProposalForm) => {
      if (proposalTemplates && signerOrProvider) {
        const proposalMetadata = {
          title: 'createProposalTemplateTitle',
          description: 'createProposalTemplateDescription',
          documentationUrl: '',
        };

        const proposalTemplateData = {
          title: values.proposalMetadata.title.trim(),
          description: values.proposalMetadata.description.trim(),
          transactions: await Promise.all(
            values.transactions.map(async tx => ({
              ...tx,
              targetAddress: validateENSName(tx.targetAddress)
                ? await signerOrProvider.resolveName(tx.targetAddress)
                : tx.targetAddress,
              parameters: tx.parameters
                .map(param => {
                  if (param.signature) {
                    return param;
                  } else {
                    // This allows submitting transaction function with no params
                    return undefined;
                  }
                })
                .filter(param => param),
            })),
          ),
        };

        const updatedTemplatesList = [...proposalTemplates, proposalTemplateData];

        const { Hash } = await client.add(JSON.stringify(updatedTemplatesList));

        const encodedUpdateValues = encodeFunctionData({
          abi: KeyValuePairsAbi,
          functionName: 'updateValues',
          args: [['proposalTemplates'], [Hash]],
        });

        const proposal: ProposalExecuteData = {
          metaData: proposalMetadata,
          targets: [keyValuePairs],
          values: [0n],
          calldatas: [encodedUpdateValues],
        };

        return proposal;
      }
    },
    [client, keyValuePairs, proposalTemplates, signerOrProvider],
  );

  return { prepareProposalTemplateProposal };
}
