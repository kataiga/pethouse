import {
  Controller, Get, Param, ParseIntPipe, Query,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiExtraModels, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { User } from '@modules/users/entity/user.entity';
import { AnimalSpeciesPageDto } from '../dto/animal-species-page.dto';
import { AnimalSpeciesResponseDto } from '../dto/animal-species-response.dto';
import { SearchAnimalSpeciesQueryDto } from '../dto/search-animal-species-query.dto';
import { AnimalSpeciesService } from '../service/animal-species.service';

/** Read-only catalogue. Contributions and imports are post-V1 and go through an admin role. */
@ApiTags('catalogue')
@ApiBearerAuth()
@ApiExtraModels(AnimalSpeciesResponseDto)
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('animal-species')
export class AnimalSpeciesController {
  constructor (private readonly animalSpeciesService: AnimalSpeciesService) {}

  @Get()
  @ApiOperation({ summary: 'Search the animal catalogue, paginated and sorted by scientific name.' })
  @ApiOkResponse({ type: AnimalSpeciesPageDto })
  async search (
    @CurrentUser() user: User,
    @Query() query: SearchAnimalSpeciesQueryDto,
  ): Promise<InstanceType<typeof AnimalSpeciesPageDto>> {
    const page = await this.animalSpeciesService.search(query);

    return new AnimalSpeciesPageDto({
      ...page,
      data: page.data.map((species) => AnimalSpeciesResponseDto.fromEntity(species, user.preferredLanguage)),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'One animal species.' })
  @ApiOkResponse({ type: AnimalSpeciesResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async get (@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<AnimalSpeciesResponseDto> {
    return AnimalSpeciesResponseDto.fromEntity(await this.animalSpeciesService.get(id), user.preferredLanguage);
  }
}
