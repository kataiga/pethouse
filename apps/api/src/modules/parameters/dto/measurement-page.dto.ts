import { createPaginatedDto } from '@common/dto/paginated-response.dto';
import { MeasurementResponseDto } from './measurement-response.dto';

export const MeasurementPageDto = createPaginatedDto(MeasurementResponseDto, 'MeasurementPageDto');
