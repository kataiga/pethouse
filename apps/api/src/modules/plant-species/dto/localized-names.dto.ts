import { ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '@common/enums/language.enum';

/** Common names by language. A language may be missing for a species. */
export class LocalizedNamesDto {
  @ApiPropertyOptional({ example: 'Anubias nain' })
  readonly fr?: string;

  @ApiPropertyOptional({ example: 'Dwarf anubias' })
  readonly en?: string;

  constructor (names: Iterable<{ language: Language;
    commonName: string }>) {
    for (const name of names) {
      if (name.language === Language.FR) {
        this.fr = name.commonName;
      } else if (name.language === Language.EN) {
        this.en = name.commonName;
      }
    }
  }
}
