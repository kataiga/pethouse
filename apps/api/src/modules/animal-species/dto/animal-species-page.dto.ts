import { createPaginatedDto } from '@common/dto/paginated-response.dto';
import { AnimalSpeciesResponseDto } from './animal-species-response.dto';

export const AnimalSpeciesPageDto = createPaginatedDto(AnimalSpeciesResponseDto, 'AnimalSpeciesPageDto');
