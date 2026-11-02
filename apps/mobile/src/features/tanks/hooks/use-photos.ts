import {
  useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';
import {
  type PhotoUploadError, type PickedImage, type TankPhoto, uploadTankPhoto,
} from '../api/upload-photo';
import {
  tankKey, tanksKey,
} from './use-tanks';

export type { TankPhoto } from '../api/upload-photo';

const photosKey = (tankId: number): readonly unknown[] => ['tanks', tankId, 'photos'];

/** Newest first. */
export function usePhotos (tankId: number): UseQueryResult<TankPhoto[]> {
  return useQuery({
    queryKey: photosKey(tankId),
    queryFn: async () => {
      const { data } = await api.GET('/api/tanks/{tankId}/photos', { params: { path: { tankId } } });

      if (!data) {
        throw new Error('Photos could not be loaded');
      }

      return data;
    },
  });
}

interface TankRef {
  id: number;
  householdId: number;
}

export function useUploadPhoto (tankId: number): UseMutationResult<TankPhoto, PhotoUploadError | Error, PickedImage> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (image) => uploadTankPhoto(api, tankId, image),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: photosKey(tankId) }),
  });
}

export function useUpdatePhoto (tankId: number, photoId: number):
UseMutationResult<TankPhoto, Error, Schemas['UpdatePhotoDto']> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.PATCH('/api/tanks/{tankId}/photos/{photoId}', {
        params: {
          path: {
            tankId,
            photoId,
          },
        },
        body,
      });

      if (!data) {
        throw new Error('The photo could not be updated');
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: photosKey(tankId) }),
  });
}

/** Deleting the cover clears it on the API side: the tank and the list are refreshed too. */
export function useDeletePhoto (tank: TankRef, photoId: number): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { response } = await api.DELETE('/api/tanks/{tankId}/photos/{photoId}', {
        params: {
          path: {
            tankId: tank.id,
            photoId,
          },
        },
      });

      if (!response.ok) {
        throw new Error('The photo could not be deleted');
      }
    },
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: photosKey(tank.id) }),
      queryClient.invalidateQueries({ queryKey: tankKey(tank.id) }),
      queryClient.invalidateQueries({ queryKey: tanksKey(tank.householdId) }),
    ]),
  });
}
