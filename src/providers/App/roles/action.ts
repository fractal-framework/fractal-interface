import { Tree } from '@hatsprotocol/sdk-v1-subgraph';

export enum RolesAction {
  SET_HATS_TREE_ID = 'SET_HATS_TREE_ID',
  SET_HATS_TREE = 'SET_HATS_TREE',
}

export type RolesActions =
  | { type: RolesAction.SET_HATS_TREE_ID; payload: number | null | undefined }
  | { type: RolesAction.SET_HATS_TREE; payload: Tree | null | undefined };
