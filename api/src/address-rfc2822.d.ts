// `address-rfc2822` ships no types. Declare the small surface we use.
// This must live in its own script-context .d.ts (no top-level imports):
// a `declare module` in a module-context file is treated as an *augmentation*,
// which TypeScript refuses to apply to an untyped JS module (TS2665).
// Referenced as `addrparser.Address` in JSDoc after `require('address-rfc2822')`.
declare module 'address-rfc2822' {
  export class Address {
    constructor(phrase?: string, address?: string, comment?: string);
    phrase: string;
    address: string;
    comment: string;
    host(): string | null;
    user(): string | null;
    format(): string;
    name(): string;
  }
  export function parse(line: string, opts?: string | null): Address[];
  export function parseFrom(line: string): Address[];
  export function parseSender(line: string): Address[];
  export function parseReplyTo(line: string): Address[];
}
