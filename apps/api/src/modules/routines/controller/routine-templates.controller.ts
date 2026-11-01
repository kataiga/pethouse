import {
  Controller, Get, Query,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { ListRoutineTemplatesQueryDto } from '../dto/list-routine-templates-query.dto';
import { RoutineTemplateResponseDto } from '../dto/routine-template-response.dto';
import { RoutineTemplatesService } from '../service/routine-templates.service';

@ApiTags('routines')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('routine-templates')
export class RoutineTemplatesController {
  constructor (private readonly templatesService: RoutineTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Routines suggested when creating a tank, optionally for one tank type.' })
  @ApiOkResponse({ type: [RoutineTemplateResponseDto] })
  async list (@Query() query: ListRoutineTemplatesQueryDto): Promise<RoutineTemplateResponseDto[]> {
    const templates = await this.templatesService.list(query.tankType);

    return templates.map((template) => RoutineTemplateResponseDto.fromEntity(template));
  }
}
