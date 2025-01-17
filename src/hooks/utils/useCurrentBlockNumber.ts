import { useEffect, useState, useCallback } from 'react';
import useNetworkPublicClient from '../useNetworkPublicClient';

const useCurrentBlockNumber = () => {
  const [currentBlockNumber, setCurrentBlockNumber] = useState<number>();
  const [isLoaded, setIsLoaded] = useState(false);
  const publicClient = useNetworkPublicClient();

  const updateBlockNumber = useCallback(
    (block: number) => {
      setCurrentBlockNumber(block);
      if (!isLoaded) {
        setIsLoaded(true);
      }
    },
    [isLoaded],
  );

  useEffect(() => {
    const unwatch = publicClient.watchBlockNumber({
      onBlockNumber: blockNumber => updateBlockNumber(Number(blockNumber)),
    });

    return () => {
      unwatch();
    };
  }, [publicClient, updateBlockNumber]);

  return { currentBlockNumber, isLoaded };
};

export default useCurrentBlockNumber;
