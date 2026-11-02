import {
  type InfiniteData, useInfiniteQuery, UseInfiniteQueryResult, useMutation, UseMutationResult, useQuery,
  useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';
import {
  type HistoryPeriod, historyWindow,
} from '../history-range';
import {
  historyKey, invalidateReadings, measurementsKey,
} from './keys';

export type Measurement = Schemas['MeasurementResponseDto'];

export type MeasurementPage = Schemas['MeasurementPageDto'];

export type History = Schemas['HistoryResponseDto'];

export const MEASUREMENTS_PAGE_SIZE = 20;

/** Readings of one parameter, newest first, a page at a time. */
export function useMeasurements (tankId: number, definitionId: number):
UseInfiniteQueryResult<InfiniteData<MeasurementPage, number>> {
  return useInfiniteQuery({
    queryKey: [...measurementsKey(tankId), definitionId],
    initialPageParam: 1,
    getNextPageParam: (last: MeasurementPage) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    queryFn: async ({ pageParam }) => {
      const { data } = await api.GET('/api/tanks/{tankId}/measurements', {
        params: {
          path: { tankId },
          query: {
            parameterDefinitionId: definitionId,
            page: pageParam,
            limit: MEASUREMENTS_PAGE_SIZE,
          },
        },
      });

      if (!data) {
        throw new Error('Readings could not be loaded');
      }

      return data;
    },
  });
}

/** One parameter bucketed for the chart, with the thresholds to draw the band. */
export function useHistory (tankId: number, definitionId: number, period: HistoryPeriod): UseQueryResult<History> {
  return useQuery({
    queryKey: [...historyKey(tankId), definitionId, period],
    queryFn: async () => {
      const { data } = await api.GET('/api/tanks/{tankId}/measurements/history', {
        params: {
          path: { tankId },
          query: {
            parameterDefinitionId: definitionId,
            ...historyWindow(period, new Date()),
          },
        },
      });

      if (!data) {
        throw new Error('The history could not be loaded');
      }

      return data;
    },
  });
}

export interface NewReading {
  parameterDefinitionId: number;
  value: number;
}

export interface ReadingBatch {
  readings: NewReading[];
  /** ISO instant shared by the whole batch: one test session. */
  measuredAt: string;
  note: string | null;
}

/** Thrown when only part of a batch went through; `recorded` lists the definitions saved. */
export class PartialBatchError extends Error {
  constructor (readonly recorded: readonly number[]) {
    super('Some readings could not be recorded');
  }
}

/** Several readings from one session, sent one by one so a failure says which were kept. */
export function useRecordReadings (tankId: number): UseMutationResult<void, PartialBatchError, ReadingBatch> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ readings, measuredAt, note }) => {
      const recorded: number[] = [];

      for (const reading of readings) {
        const { response } = await api.POST('/api/tanks/{tankId}/measurements', {
          params: { path: { tankId } },
          body: {
            ...reading,
            measuredAt,
            ...(note === null ? {} : { note }),
          },
        });

        if (!response.ok) {
          throw new PartialBatchError(recorded);
        }
        recorded.push(reading.parameterDefinitionId);
      }
    },
    onSettled: () => invalidateReadings(queryClient, tankId),
  });
}

export interface ReadingChange {
  measurementId: number;
  change: Schemas['UpdateMeasurementDto'];
}

export function useUpdateReading (tankId: number): UseMutationResult<void, Error, ReadingChange> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ measurementId, change }) => {
      const { response } = await api.PATCH('/api/tanks/{tankId}/measurements/{measurementId}', {
        params: {
          path: {
            tankId,
            measurementId,
          },
        },
        body: change,
      });

      if (!response.ok) {
        throw new Error('The reading could not be corrected');
      }
    },
    onSuccess: () => invalidateReadings(queryClient, tankId),
  });
}

export function useDeleteReading (tankId: number): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (measurementId) => {
      const { response } = await api.DELETE('/api/tanks/{tankId}/measurements/{measurementId}', {
        params: {
          path: {
            tankId,
            measurementId,
          },
        },
      });

      if (!response.ok) {
        throw new Error('The reading could not be deleted');
      }
    },
    onSuccess: () => invalidateReadings(queryClient, tankId),
  });
}
