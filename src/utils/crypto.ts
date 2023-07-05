import { utils } from 'ethers';
import { isAddress } from 'ethers/lib/utils';
import { logError } from '../helpers/errorLogging';
import { ActivityTransactionType } from '../types';

export const isSameAddress = (addr1: string, addr2: string) => {
  if (!isAddress(addr1) || !isAddress(addr2)) {
    return false;
  }
  return addr1.toLowerCase() === addr2.toLowerCase();
};

function splitIgnoreBrackets(str: string): string[] {
  const result = str
    .match(/[^,\[\]]+|\[[^\]]*\]/g)!
    .filter(match => {
      return match.trim().length > 0;
    })
    .map(match => (match = match.trim()));
  return result;
}

/**
 * Encodes a smart contract function, given the provided function name, input types, and input values.
 *
 * @param _functionName the name of the smart contact function
 * @param _functionSignature the comma delimited input types and optionally their names, e.g. `uint256 amount, string note`
 * @param _parameters the actual values for the given _functionSignature
 * @returns the encoded function data, as a string
 */
export const encodeFunction = (
  _functionName: string,
  _functionSignature?: string,
  _parameters?: string
) => {
  let functionSignature = `function ${_functionName}`;
  if (_functionSignature) {
    functionSignature = functionSignature.concat(`(${_functionSignature})`);
  } else {
    functionSignature = functionSignature.concat('()');
  }

  const parameters = !!_parameters
    ? splitIgnoreBrackets(_parameters).map(p => (p = p.trim()))
    : undefined;


  const parametersFixed: Array<string | string[]> | undefined = parameters ? [] : undefined;
  parameters?.forEach(param => {
    if (param.startsWith('[') && param.endsWith(']')) {
      parametersFixed!!.push(
        param
          .substring(1, param.length - 1)
          .split(',')
          .map(p => (p = p.trim()))
      );
    } else {
      parametersFixed!!.push(param);
    }
  });

  try {
    return new utils.Interface([functionSignature]).encodeFunctionData(
      _functionName,
      parametersFixed
    );
  } catch (e) {
    logError(e);
    return;
  }
};

export function isMultiSigTx(transaction: ActivityTransactionType): boolean {
  return transaction.txType === 'MULTISIG_TRANSACTION';
}

export function isModuleTx(transaction: ActivityTransactionType): boolean {
  return transaction.txType === 'MODULE_TRANSACTION';
}
