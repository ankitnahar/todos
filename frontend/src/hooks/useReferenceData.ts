import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { bucketsApi } from '@/api/buckets';
import { tagsApi } from '@/api/tags';
import { teamMembersApi } from '@/api/teamMembers';
import type { Bucket, Tag, TeamMember } from '@/types';

export function useReferenceData() {
  const { data: buckets = [] } = useQuery({
    queryKey: ['buckets'],
    queryFn: bucketsApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: teamMembersApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const bucketMap = useMemo(
    () => new Map(buckets.map((b) => [b.id, b])),
    [buckets]
  );

  const tagMap = useMemo(
    () => new Map(tags.map((t) => [t.id, t])),
    [tags]
  );

  const teamMemberMap = useMemo(
    () => new Map(teamMembers.map((tm) => [tm.id, tm])),
    [teamMembers]
  );

  const getBucket = (id?: number): Bucket | undefined =>
    id ? bucketMap.get(id) : undefined;

  const getTags = (ids: number[]): Tag[] =>
    ids.map((id) => tagMap.get(id)).filter(Boolean) as Tag[];

  const getTeamMembers = (ids: number[]): TeamMember[] =>
    ids.map((id) => teamMemberMap.get(id)).filter(Boolean) as TeamMember[];

  return {
    buckets,
    tags,
    teamMembers,
    bucketMap,
    tagMap,
    teamMemberMap,
    getBucket,
    getTags,
    getTeamMembers,
  };
}
