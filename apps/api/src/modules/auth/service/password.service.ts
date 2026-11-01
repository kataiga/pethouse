import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/** argon2id with the library defaults (64 MiB, 3 passes), isolated so services can mock it. */
@Injectable()
export class PasswordService {
  hash (plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  verify (hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
