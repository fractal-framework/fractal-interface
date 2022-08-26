import { useEffect } from 'react';

import { GnosisWrapper } from '../../../assets/typechain-types/gnosis';
import { GnosisActions, GnosisActionTypes } from '../types';

const useGnosisSafeAddress = (
  gnosisWrapper: GnosisWrapper | undefined,
  dispatch: React.Dispatch<GnosisActionTypes>
) => {
  useEffect(() => {
    if (!gnosisWrapper) {
      return;
    }

    gnosisWrapper
      .gnosisSafe()
      .then(contractAddress => {
        dispatch({ type: GnosisActions.UPDATE_GNOSIS_CONTRACT, payload: { contractAddress } });
      })
      .catch(console.error);
  }, [gnosisWrapper, dispatch]);
};

export default useGnosisSafeAddress;
