import { createPaginatedDto } from '@common/dto/paginated-response.dto';
import { PlantSpeciesResponseDto } from './plant-species-response.dto';

export const PlantSpeciesPageDto = createPaginatedDto(PlantSpeciesResponseDto, 'PlantSpeciesPageDto');
