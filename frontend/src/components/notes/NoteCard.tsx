import { Note } from '@/types';
import { sanitizeHtml } from '@/utils/sanitize';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Star, Flame, Trash2, Edit, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useReferenceData } from '@/hooks/useReferenceData';

interface NoteCardProps {
  note: Note;
  onToggleFavorite?: (id: number) => void;
  onToggleHotTopic?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function NoteCard({
  note,
  onToggleFavorite,
  onToggleHotTopic,
  onDelete,
}: NoteCardProps) {
  const navigate = useNavigate();
  const { getBucket, getTags, getTeamMembers } = useReferenceData();

  const handleDescriptionClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (href) {
        e.stopPropagation();
        if (href.startsWith('http://') || href.startsWith('https://')) {
          window.open(href, '_blank');
        } else if (href.startsWith('/')) {
          navigate(href);
        }
        e.preventDefault();
      }
    }
  };

  const bucket = getBucket(note.bucketId);
  const tags = getTags(note.tagIds);
  const teamMembers = getTeamMembers(note.teamMemberIds);
  const subNotes = note.subNotes || [];

  return (
    <Card hover className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3
            className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 truncate"
            onClick={() => navigate(`/notes/${note.id}`)}
          >
            {note.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>{format(new Date(note.createdAt), 'MMM d, yyyy')}</span>
            {bucket && (
              <>
                <span>•</span>
                <Badge color={bucket.color}>{bucket.name}</Badge>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(note.id)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={note.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={clsx(
                  'w-4 h-4',
                  note.favorite
                    ? 'fill-warning-400 text-warning-400 stroke-warning-600'
                    : 'text-gray-400 stroke-gray-500'
                )}
              />
            </button>
          )}
          {onToggleHotTopic && (
            <button
              onClick={() => onToggleHotTopic(note.id)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={note.hotTopic ? 'Remove from hot topics' : 'Mark as hot topic'}
            >
              <Flame
                className={clsx(
                  'w-4 h-4',
                  note.hotTopic ? 'fill-danger-400 text-danger-400 stroke-danger-600' : 'text-gray-400 stroke-gray-500'
                )}
              />
            </button>
          )}
        </div>
      </div>

      <div
        className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.details) }}
        onClick={handleDescriptionClick}
      />

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map((tag) => (
            <Badge key={tag.id}>
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {subNotes.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {subNotes.length} subnote{subNotes.length !== 1 ? 's' : ''}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {teamMembers.length > 0 && (
            <div className="flex -space-x-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-800"
                  title={member.name}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {teamMembers.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-800">
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/notes/${note.id}`)}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400 stroke-[2]" />
          </button>
          <button
            onClick={() => navigate(`/notes/${note.id}/edit`)}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400 stroke-[2]" />
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(note.id)}
              className="p-1.5 rounded hover:bg-danger-100 dark:hover:bg-danger-900/30 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-danger-600 dark:text-danger-400" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
