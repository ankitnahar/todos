import { useQuery } from '@tanstack/react-query';
import { notesApi } from '@/api/notes';
import { useReferenceData } from '@/hooks/useReferenceData';
import { Card } from '@/components/shared/Card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FileText, Star, Flame, Trash2, Tag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: notesApi.getStats,
  });

  const { getBucket, tags } = useReferenceData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!stats) {
    return <div>No stats available</div>;
  }

  const hotTopicsCount = (stats.hotTopicNotes || 0) + (stats.hotTopicSubNotes || 0);

  const bucketData = Object.entries(stats.notesByBucket || {}).map(([bucketId, count]) => {
    const bucket = getBucket(Number(bucketId));
    return {
      name: bucket?.name || `Bucket #${bucketId}`,
      value: count as number,
      color: bucket?.color,
    };
  });

  const tagData = Object.entries(stats.notesByTag || {}).map(([tagId, count]) => {
    const tag = tags.find((t) => t.id === Number(tagId));
    return {
      name: tag?.name || `Tag #${tagId}`,
      value: count as number,
    };
  }).sort((a, b) => b.value - a.value);

  const COLORS = ['#0ea5e9', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Overview of your notes and activities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Notes</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalNotes}
              </p>
            </div>
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Favorites</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.favoriteNotes}
              </p>
            </div>
            <div className="p-3 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
              <Star className="w-8 h-8 text-warning-600 dark:text-warning-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Priority Items</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {hotTopicsCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {stats.hotTopicNotes} notes, {stats.hotTopicSubNotes} subnotes
              </p>
            </div>
            <div className="p-3 bg-danger-100 dark:bg-danger-900/30 rounded-lg">
              <Flame className="w-8 h-8 text-danger-600 dark:text-danger-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Deleted</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.deletedNotes}
              </p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Trash2 className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Notes by Bucket
          </h2>
          {bucketData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bucketData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {bucketData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-12">
              No bucket data available
            </p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Notes by Tag
          </h2>
          {tagData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tagData.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" stroke="#9ca3af" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9ca3af"
                  width={75}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                  }}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="Notes" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-12">
              No tag data available
            </p>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Tag Distribution
        </h2>
        {tagData.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {tagData.map(({ name, value }) => (
              <div
                key={name}
                className="px-4 py-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg"
              >
                <span className="text-sm font-medium text-primary-800 dark:text-primary-300">
                  {name}
                </span>
                <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">
                  ({value})
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-6">
            No tags in use yet
          </p>
        )}
      </Card>
    </div>
  );
}
