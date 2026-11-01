export enum ReceiptStatus {
  OK = 'OK',
  ERROR = 'ERROR',
  /** No receipt within the 24 hours Expo keeps them. */
  EXPIRED = 'EXPIRED',
}
