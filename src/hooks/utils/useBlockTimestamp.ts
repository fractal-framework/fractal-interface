import { useEffect, useState } from 'react';
import { logError } from '../../helpers/errorLogging';
import useNetworkPublicClient from '../useNetworkPublicClient';

const useBlockTimestamp = (blockNumber?: number) => {
  const publicClient = useNetworkPublicClient();
  const [timestamp, setTimestamp] = useState<number>(Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!blockNumber) {
      setTimestamp(Math.floor(Date.now() / 1000));
      return;
    }

    publicClient
      .getBlock({ blockNumber: BigInt(blockNumber) })
      .then(block => {
        if (!block) {
          return;
        }
        setTimestamp(Number(block.timestamp));
      })
      .catch(logError);
  }, [publicClient, blockNumber]);

  return timestamp;
};

export default useBlockTimestamp;
