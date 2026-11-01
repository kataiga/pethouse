import { NotFoundException } from '@nestjs/common';
import { SearchPlantSpeciesQueryDto } from '../dto/search-plant-species-query.dto';
import { PlantSpecies } from '../entity/plant-species.entity';
import { PlantSpeciesRepository } from '../repository/plant-species.repository';
import { PlantSpeciesService } from './plant-species.service';

describe('PlantSpeciesService', () => {
  const repository = {
    search: jest.fn(),
    findWithNames: jest.fn(),
  };
  let service: PlantSpeciesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlantSpeciesService(repository as unknown as PlantSpeciesRepository);
  });

  it('throws NotFoundException when the species does not exist', async () => {
    repository.findWithNames.mockResolvedValue(null);

    await expect(service.get(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the species when it exists', async () => {
    const species = Object.assign(new PlantSpecies(), { id: 12 });
    repository.findWithNames.mockResolvedValue(species);

    await expect(service.get(12)).resolves.toBe(species);
  });

  it('passes the offset and limit to the repository and wraps the page', async () => {
    const species = Object.assign(new PlantSpecies(), { id: 12 });
    repository.search.mockResolvedValue([[species], 41]);

    const page = await service.search(Object.assign(new SearchPlantSpeciesQueryDto(), {
      search: 'anubias',
      page: 3,
      limit: 20,
    }));

    expect(repository.search).toHaveBeenCalledWith({
      search: 'anubias',
      placement: undefined,
      offset: 40,
      limit: 20,
    });
    expect(page).toEqual({
      data: [species],
      total: 41,
      page: 3,
      limit: 20,
    });
  });
});
