import { createPaginatedDto } from '@common/dto/paginated-response.dto';
import { OccurrenceResponseDto } from './occurrence-response.dto';

export const OccurrencePageDto = createPaginatedDto(OccurrenceResponseDto, 'OccurrencePageDto');
