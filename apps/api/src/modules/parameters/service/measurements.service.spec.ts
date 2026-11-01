import { BadRequestException } from '@nestjs/common';
import { Household } from '@modules/households/entity/household.entity';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { User } from '@modules/users/entity/user.entity';
import { Measurement } from '../entity/measurement.entity';
import { ParameterDefinition } from '../entity/parameter-definition.entity';
import { MeasurementRepository } from '../repository/measurement.repository';
import { MeasurementsService } from './measurements.service';
import { TankParametersService } from './tank-parameters.service';

describe('MeasurementsService', () => {
  const ph = Object.assign(new ParameterDefinition(), {
    id: 1,
    slug: 'ph',
  });
  const resolvedPh = {
    definition: ph,
    enabled: true,
    displayOrder: 30,
    minThreshold: 6.5,
    maxThreshold: 7.5,
    source: 'default' as const,
    overridden: false,
    latest: null,
  };
  const tank = Object.assign(new Tank(), {
    id: 7,
    household: Object.assign(new Household(), { id: 3 }),
  });
  const user = Object.assign(new User(), { id: 5 });
  const em = {
    persistAndFlush: jest.fn(),
    flush: jest.fn(),
    removeAndFlush: jest.fn(),
  };
  const measurements = {
    create: jest.fn((data: Partial<Measurement>) => Object.assign(new Measurement(), data)),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    history: jest.fn(),
    getEntityManager: () => em,
  };
  const tankParameters = {
    requireEnabled: jest.fn(),
    requireKnown: jest.fn(),
  };
  let service: MeasurementsService;

  beforeEach(() => {
    jest.clearAllMocks();
    tankParameters.requireEnabled.mockResolvedValue(resolvedPh);
    tankParameters.requireKnown.mockResolvedValue(resolvedPh);
    measurements.history.mockResolvedValue([]);
    service = new MeasurementsService(
      measurements as unknown as MeasurementRepository,
      tankParameters as unknown as TankParametersService,
    );
  });

  it('records a reading for a tracked parameter, timestamped now by default', async () => {
    const before = Date.now();

    const measurement = await service.record(tank, user, {
      parameterDefinitionId: 1,
      value: 7.2,
    });

    expect(tankParameters.requireEnabled).toHaveBeenCalledWith(tank, user, 1);
    expect(measurement).toMatchObject({
      tank,
      definition: ph,
      value: 7.2,
      recordedBy: user,
      note: null,
    });
    expect(measurement.measuredAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(em.persistAndFlush).toHaveBeenCalledWith(measurement);
  });

  it('lets the tank layer refuse an untracked parameter', async () => {
    tankParameters.requireEnabled.mockRejectedValue(new BadRequestException());

    await expect(service.record(tank, user, {
      parameterDefinitionId: 2,
      value: 1,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(measurements.create).not.toHaveBeenCalled();
  });

  it('defaults the history window to the last 30 days and carries the thresholds', async () => {
    const series = await service.history(tank, user, {
      parameterDefinitionId: 1,
      bucket: 'day',
    });

    expect(series.to.getTime() - series.from.getTime()).toBe(30 * 86_400_000);
    expect(series.parameter.minThreshold).toBe(6.5);
    expect(measurements.history).toHaveBeenCalledWith(7, 1, series.from, series.to, 'day');
  });

  it('rejects an inverted or oversized range', async () => {
    await expect(service.history(tank, user, {
      parameterDefinitionId: 1,
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-02-01T00:00:00.000Z',
      bucket: 'day',
    })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.history(tank, user, {
      parameterDefinitionId: 1,
      from: '2024-01-01T00:00:00.000Z',
      to: '2026-01-01T00:00:00.000Z',
      bucket: 'week',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
