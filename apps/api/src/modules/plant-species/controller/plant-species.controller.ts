import {
  Controller, Get, Param, ParseIntPipe, Query,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiExtraModels, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { User } from '@modules/users/entity/user.entity';
import { PlantSpeciesPageDto } from '../dto/plant-species-page.dto';
import { PlantSpeciesResponseDto } from '../dto/plant-species-response.dto';
import { SearchPlantSpeciesQueryDto } from '../dto/search-plant-species-query.dto';
import { PlantSpeciesService } from '../service/plant-species.service';

/** Read-only catalogue. Contributions and imports are post-V1 and go through an admin role. */
@ApiTags('catalogue')
@ApiBearerAuth()
@ApiExtraModels(PlantSpeciesResponseDto)
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('plant-species')
export class PlantSpeciesController {
  constructor (private readonly plantSpeciesService: PlantSpeciesService) {}

  @Get()
  @ApiOperation({ summary: 'Search the plant catalogue, paginated and sorted by scientific name.' })
  @ApiOkResponse({ type: PlantSpeciesPageDto })
  async search (
    @CurrentUser() user: User,
    @Query() query: SearchPlantSpeciesQueryDto,
  ): Promise<InstanceType<typeof PlantSpeciesPageDto>> {
    const page = await this.plantSpeciesService.search(query);

    return new PlantSpeciesPageDto({
      ...page,
      data: page.data.map((species) => PlantSpeciesResponseDto.fromEntity(species, user.preferredLanguage)),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'One plant species.' })
  @ApiOkResponse({ type: PlantSpeciesResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async get (@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<PlantSpeciesResponseDto> {
    return PlantSpeciesResponseDto.fromEntity(await this.plantSpeciesService.get(id), user.preferredLanguage);
  }
}
