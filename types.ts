import { BigNumberish } from "@ethersproject/bignumber";

export interface PoolObject {
  _poolAddress: string;
  _poolReceiptToken: string;
  _rate: BigNumberish;
  _poolName: string;
}
