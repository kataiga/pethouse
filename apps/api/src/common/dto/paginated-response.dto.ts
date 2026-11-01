import { Type } from '@nestjs/common';
import {
  ApiProperty, getSchemaPath,
} from '@nestjs/swagger';

export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Builds a concrete `{ data, total, page, limit }` DTO class for an item type, so the spec gets a
 * named schema (`AnimalSpeciesPageDto`) instead of a generic the client generator cannot follow.
 * Register the item type with `@ApiExtraModels` on the controller.
 */
export function createPaginatedDto<T> (itemType: Type<T>, name: string): Type<Page<T>> {
  class PaginatedDto implements Page<T> {
    @ApiProperty({
      type: 'array',
      items: { $ref: getSchemaPath(itemType) },
    })
    readonly data: T[];

    @ApiProperty({
      example: 137,
      description: 'Matching items across every page.',
    })
    readonly total: number;

    @ApiProperty({ example: 1 })
    readonly page: number;

    @ApiProperty({ example: 20 })
    readonly limit: number;

    constructor (page: Page<T>) {
      this.data = page.data;
      this.total = page.total;
      this.page = page.page;
      this.limit = page.limit;
    }
  }

  Object.defineProperty(PaginatedDto, 'name', { value: name });

  return PaginatedDto;
}
